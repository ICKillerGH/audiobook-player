import { useEffect, useRef, useState } from "react";
import type { Audiobook, AudiobookMarker, ImportResult, PlayerSettings } from "@shared/types";
import { AppHeader } from "@/app/AppHeader";
import { BookDetailsDialog } from "@/features/book-details/BookDetailsDialog";
import { filterBooks } from "@/features/library/library-utils";
import { LibraryPanel } from "@/features/library/LibraryPanel";
import { MarkersDialog } from "@/features/markers/MarkersDialog";
import { NowPlayingPanel } from "@/features/player/NowPlayingPanel";
import { useOsMediaControls } from "@/features/player/useOsMediaControls";
import { SleepTimerDialog } from "@/features/sleep/SleepTimerDialog";
import { clamp, formatTime } from "@/shared/lib/format";

type ActiveModal = "markers" | "sleep" | "details" | null;

const defaultSettings: PlayerSettings = {
  playbackRate: 1,
  skipSeconds: 30,
  autoSaveSeconds: 5
};

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBookIdRef = useRef<string | null>(null);
  const lastSavedAtRef = useRef(0);
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [settings, setSettings] = useState<PlayerSettings>(defaultSettings);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [markerLabel, setMarkerLabel] = useState("");
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
  const [customSleepMinutes, setCustomSleepMinutes] = useState("25");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [statusMessage, setStatusMessage] = useState("Add a folder or a few audiobook files to begin.");
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0];
  const visibleBooks = filterBooks(books, search);
  const progressPercent = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;

  useOsMediaControls({
    book: selectedBook,
    mediaUrl,
    isPlaying,
    currentTime,
    duration,
    playbackRate: settings.playbackRate,
    skipSeconds: settings.skipSeconds,
    onPlay: playSelectedBook,
    onPause: pausePlayback,
    onSeek: seekTo,
    onSkip: skipBy
  });

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedBook && books[0]) {
      setSelectedBookId(books[0].id);
    }
  }, [books, selectedBook]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = settings.playbackRate;
  }, [settings.playbackRate, mediaUrl]);

  useEffect(() => {
    if (!selectedBook) {
      activeBookIdRef.current = null;
      setMediaUrl("");
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    let cancelled = false;
    setLoadError(null);
    setIsPlaying(false);
    audioRef.current?.pause();

    window.audiobook
      .getMediaUrl(selectedBook.id)
      .then((url) => {
        if (cancelled) return;
        activeBookIdRef.current = selectedBook.id;
        setMediaUrl(url);
        setCurrentTime(selectedBook.progressPosition);
        setDuration(selectedBook.duration);
        lastSavedAtRef.current = Date.now();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMediaUrl("");
        setLoadError(error instanceof Error ? error.message : "Could not load this audiobook.");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBook?.id]);

  useEffect(() => {
    if (sleepRemaining === null) return;

    if (sleepRemaining <= 0) {
      const audio = audioRef.current;
      audio?.pause();
      setIsPlaying(false);
      void persistProgress();
      setSleepRemaining(null);
      setStatusMessage("Sleep timer ended. Playback paused.");
      return;
    }

    const timer = window.setTimeout(() => {
      setSleepRemaining((value) => (value === null ? null : value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [sleepRemaining]);

  async function bootstrap(): Promise<void> {
    try {
      const [library, storedSettings] = await Promise.all([window.audiobook.getLibrary(), window.audiobook.getSettings()]);
      setBooks(library);
      setSettings(storedSettings);
      setSelectedBookId(library[0]?.id ?? null);
      setStatusMessage(library.length ? "Library ready. Pick up where you left off." : "Add a folder or a few audiobook files to begin.");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not initialize the app.");
    }
  }

  async function importFiles(): Promise<void> {
    await runImport(() => window.audiobook.importFiles());
  }

  async function importFolder(): Promise<void> {
    await runImport(() => window.audiobook.importFolder());
  }

  async function runImport(importer: () => Promise<ImportResult>): Promise<void> {
    setIsImporting(true);
    setStatusMessage("Reading audiobook metadata...");

    try {
      const result = await importer();
      setBooks(result.books);
      setSelectedBookId((current) => current ?? result.books[0]?.id ?? null);

      const imported = result.importedCount;
      const updated = result.updatedCount;
      const failed = result.errors.length;
      setStatusMessage(imported || updated || failed ? `${imported} added, ${updated} refreshed${failed ? `, ${failed} failed` : ""}.` : "No new audiobooks were selected.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  async function removeSelectedBook(): Promise<void> {
    if (!selectedBook) return;

    const nextBooks = await window.audiobook.removeBook(selectedBook.id);
    setBooks(nextBooks);
    setSelectedBookId(nextBooks[0]?.id ?? null);
    setStatusMessage("Removed from library. The audio file was left untouched.");
  }

  async function playSelectedBook(): Promise<void> {
    const audio = audioRef.current;
    if (!audio || !selectedBook || !mediaUrl) return;

    if (!audio.paused) return;

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Playback could not start.");
    }
  }

  async function pausePlayback(): Promise<void> {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;

    audio.pause();
    setIsPlaying(false);
    await persistProgress(audio.currentTime, audio.duration);
  }

  async function togglePlayback(): Promise<void> {
    const audio = audioRef.current;
    if (!audio || !selectedBook || !mediaUrl) return;

    if (audio.paused) {
      await playSelectedBook();
      return;
    }

    await pausePlayback();
  }

  function onLoadedMetadata(): void {
    const audio = audioRef.current;
    if (!audio || !selectedBook) return;

    const resolvedDuration = Number.isFinite(audio.duration) ? audio.duration : selectedBook.duration;
    const resumeAt = Math.min(selectedBook.progressPosition, Math.max(resolvedDuration - 3, 0));
    audio.currentTime = resumeAt;
    audio.playbackRate = settings.playbackRate;
    setDuration(resolvedDuration);
    setCurrentTime(resumeAt);
    void persistProgress(resumeAt, resolvedDuration, selectedBook.id);
  }

  function onTimeUpdate(): void {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(audio.currentTime);
    setDuration(Number.isFinite(audio.duration) ? audio.duration : duration);

    const now = Date.now();
    if (now - lastSavedAtRef.current > settings.autoSaveSeconds * 1000) {
      void persistProgress(audio.currentTime, audio.duration, activeBookIdRef.current ?? selectedBook?.id);
    }
  }

  async function persistProgress(position = currentTime, nextDuration = duration, bookId = selectedBook?.id): Promise<void> {
    if (!bookId) return;
    lastSavedAtRef.current = Date.now();

    try {
      const updatedBook = await window.audiobook.saveProgress({
        bookId,
        position,
        duration: Number.isFinite(nextDuration) ? nextDuration : books.find((book) => book.id === bookId)?.duration
      });
      replaceBook(updatedBook);
    } catch {
      setStatusMessage("Progress could not be saved.");
    }
  }

  function replaceBook(updatedBook: Audiobook): void {
    setBooks((current) => current.map((book) => (book.id === updatedBook.id ? updatedBook : book)));
  }

  async function seekTo(value: number): Promise<void> {
    const audio = audioRef.current;
    if (!audio || !selectedBook) return;

    const next = clamp(value, 0, duration || selectedBook.duration || value);
    audio.currentTime = next;
    setCurrentTime(next);
    await persistProgress(next, duration);
  }

  async function skipBy(delta: number): Promise<void> {
    const audio = audioRef.current;
    if (!audio) return;
    await seekTo(audio.currentTime + delta);
  }

  async function changePlaybackRate(rate: number): Promise<void> {
    setSettings((current) => ({ ...current, playbackRate: rate }));
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
    setSettings(await window.audiobook.updateSettings({ playbackRate: rate }));
  }

  async function addMarker(): Promise<void> {
    if (!selectedBook) return;

    const timestamp = audioRef.current?.currentTime ?? currentTime;
    const marker = await window.audiobook.addMarker({
      bookId: selectedBook.id,
      timestamp,
      label: markerLabel
    });

    setMarkerLabel("");
    setBooks((current) =>
      current.map((book) =>
        book.id === selectedBook.id
          ? { ...book, markers: [...book.markers, marker].sort((a, b) => a.timestamp - b.timestamp) }
          : book
      )
    );
    setStatusMessage(`Marker saved at ${formatTime(timestamp)}.`);
  }

  async function removeMarker(marker: AudiobookMarker): Promise<void> {
    replaceBook(await window.audiobook.removeMarker(marker.bookId, marker.id));
  }

  async function jumpToMarker(marker: AudiobookMarker): Promise<void> {
    await seekTo(marker.timestamp);
  }

  function startSleepTimer(minutes: number): void {
    const seconds = Math.max(1, Math.round(minutes * 60));
    setSleepRemaining(seconds);
    setStatusMessage(`Sleep timer set for ${minutes} minutes.`);
  }

  function startCustomSleepTimer(): void {
    const minutes = Number(customSleepMinutes);
    if (Number.isFinite(minutes) && minutes > 0) {
      startSleepTimer(minutes);
    }
  }

  return (
    <div className="h-full overflow-hidden bg-apple-gray font-text text-apple-ink">
      <div className="drag-region flex h-full min-h-[760px] flex-col px-5 pb-5 pt-10 lg:px-8">
        <AppHeader isImporting={isImporting} onImportFiles={importFiles} onImportFolder={importFolder} />

        <main className="no-drag grid min-h-0 flex-1 gap-5 xl:grid-cols-[370px_minmax(0,1fr)]">
          <LibraryPanel
            books={books}
            visibleBooks={visibleBooks}
            selectedBook={selectedBook}
            isImporting={isImporting}
            search={search}
            onSearchChange={setSearch}
            onSelectBook={setSelectedBookId}
          />

          <NowPlayingPanel
            book={selectedBook}
            audioRef={audioRef}
            mediaUrl={mediaUrl}
            settings={settings}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            loadError={loadError}
            progressPercent={progressPercent}
            markerCount={selectedBook?.markers.length ?? 0}
            sleepRemaining={sleepRemaining}
            onOpenMarkers={() => setActiveModal("markers")}
            onOpenSleep={() => setActiveModal("sleep")}
            onOpenDetails={() => setActiveModal("details")}
            onSeek={seekTo}
            onSkip={skipBy}
            onTogglePlayback={togglePlayback}
            onChangePlaybackRate={changePlaybackRate}
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onAudioPlay={() => setIsPlaying(true)}
            onAudioPause={() => {
              setIsPlaying(false);
              void persistProgress();
            }}
            onAudioEnded={() => {
              setIsPlaying(false);
              void persistProgress(duration, duration);
            }}
          />
        </main>

        <MarkersDialog
          open={activeModal === "markers"}
          selectedBook={selectedBook}
          markerLabel={markerLabel}
          currentTime={currentTime}
          onOpenChange={(open) => setActiveModal(open ? "markers" : null)}
          onMarkerLabelChange={setMarkerLabel}
          onAddMarker={addMarker}
          onJumpToMarker={jumpToMarker}
          onRemoveMarker={removeMarker}
        />

        <SleepTimerDialog
          open={activeModal === "sleep"}
          sleepRemaining={sleepRemaining}
          customSleepMinutes={customSleepMinutes}
          onOpenChange={(open) => setActiveModal(open ? "sleep" : null)}
          onCustomSleepMinutesChange={setCustomSleepMinutes}
          onStartPreset={startSleepTimer}
          onStartCustom={startCustomSleepTimer}
          onCancel={() => setSleepRemaining(null)}
        />

        <BookDetailsDialog
          open={activeModal === "details"}
          selectedBook={selectedBook}
          statusMessage={statusMessage}
          onOpenChange={(open) => setActiveModal(open ? "details" : null)}
          onRevealInFolder={(bookId) => window.audiobook.revealInFolder(bookId)}
          onRemoveBook={removeSelectedBook}
          onJumpToMarker={jumpToMarker}
          onRemoveMarker={removeMarker}
        />
      </div>
    </div>
  );
}

export default App;
