import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Audiobook, AudiobookMarker, ImportResult, PlayerSettings } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

const speedOptions = [0.75, 1, 1.15, 1.25, 1.5, 1.75, 2, 2.5];
const sleepPresets = [15, 30, 45, 60];

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
  const [statusMessage, setStatusMessage] = useState("Add a folder or a few audiobook files to begin.");
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0];
  const query = search.trim().toLowerCase();
  const visibleBooks = query
    ? books.filter((book) => `${book.title} ${book.author} ${book.album ?? ""} ${book.fileName}`.toLowerCase().includes(query))
    : books;

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
      if (imported || updated || failed) {
        setStatusMessage(`${imported} added, ${updated} refreshed${failed ? `, ${failed} failed` : ""}.`);
      } else {
        setStatusMessage("No new audiobooks were selected.");
      }
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

  async function togglePlayback(): Promise<void> {
    const audio = audioRef.current;
    if (!audio || !selectedBook || !mediaUrl) return;

    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Playback could not start.");
      }
    } else {
      audio.pause();
      setIsPlaying(false);
      await persistProgress(audio.currentTime, audio.duration);
    }
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
    const updated = await window.audiobook.updateSettings({ playbackRate: rate });
    setSettings(updated);
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
    const updated = await window.audiobook.removeMarker(marker.bookId, marker.id);
    replaceBook(updated);
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

  const progressPercent = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;
  const libraryMinutes = Math.round(books.reduce((total, book) => total + book.duration, 0) / 60);

  return (
    <div className="h-full overflow-hidden bg-apple-gray font-text text-apple-ink">
      <div className="drag-region flex h-full min-h-[760px] flex-col px-5 pb-5 pt-10 lg:px-8">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <Badge>Windows library player</Badge>
            <h1 className="mt-3 font-display text-[clamp(2rem,3.4vw,3.75rem)] font-semibold leading-[1.04] tracking-[-0.045em]">Audiobook Player</h1>
          </div>
          <div className="no-drag flex items-center gap-3">
            <Button variant="secondary" onClick={importFiles} disabled={isImporting}>
              <FileIcon /> Files
            </Button>
            <Button variant="primary" onClick={importFolder} disabled={isImporting}>
              <FolderIcon /> Add Folder
            </Button>
          </div>
        </header>

        <main className="no-drag grid min-h-0 flex-1 gap-5 xl:grid-cols-[370px_minmax(0,1fr)]">
          <Surface className="min-h-0" innerClassName="flex min-h-0 flex-col p-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="font-text text-micro font-semibold uppercase tracking-[0.2em] text-apple-neutral">Library</p>
                <p className="mt-1 text-control text-apple-neutral">{books.length} books · {formatLibraryMinutes(libraryMinutes)}</p>
              </div>
              {isImporting ? <Badge tone="blue">Scanning</Badge> : null}
            </div>

            <div className="relative mb-4">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-apple-neutral" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search books, authors, files" className="pl-11" />
            </div>

            <div className="scroll-quiet min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {visibleBooks.length ? (
                visibleBooks.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => setSelectedBookId(book.id)}
                    className={cn(
                      "group flex w-full gap-3 rounded-panel p-3 text-left transition-[background-color,transform,box-shadow] duration-500 ease-apple hover:bg-black/[0.035] active:scale-[0.99]",
                      selectedBook?.id === book.id && "bg-black/[0.055] shadow-hairline"
                    )}
                  >
                    <BookCover book={book} size="small" />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-text text-[15px] font-semibold leading-tight text-apple-ink">{book.title}</p>
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-apple-neutral shadow-hairline">
                          {book.extension.slice(1)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-control text-apple-neutral">{book.author}</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10">
                        <div className="h-full rounded-full bg-apple-blue" style={{ width: `${bookProgress(book)}%` }} />
                      </div>
                      <p className="mt-2 text-micro text-apple-neutral">{bookProgress(book)}% · {formatDuration(book.duration)}</p>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyLibrary search={search} />
              )}
            </div>
          </Surface>

          <section className="grid min-h-0 gap-5 lg:grid-rows-[minmax(390px,0.96fr)_minmax(260px,0.58fr)]">
            <section className="relative overflow-hidden rounded-spotlight bg-apple-black p-1.5 text-white shadow-lift">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_18%,rgba(41,151,255,0.2),transparent_34%),radial-gradient(circle_at_20%_90%,rgba(255,255,255,0.13),transparent_28%)]" />
              <div className="relative grid h-full min-h-0 gap-5 rounded-[calc(2.25rem-0.375rem)] bg-apple-black/[0.92] p-5 shadow-innerHighlight lg:grid-cols-[minmax(220px,0.52fr)_minmax(0,1fr)] lg:p-6">
                <div className="flex min-h-0 items-center justify-center">
                  {selectedBook ? <BookCover book={selectedBook} size="large" /> : <HeroPlaceholder />}
                </div>

                <div className="flex min-h-0 min-w-0 flex-col justify-center gap-5">
                  <div>
                    <Badge tone="dark">Now Playing</Badge>
                    <h2 className="mt-3 line-clamp-2 font-display text-[clamp(2.4rem,4.2vw,4.4rem)] font-semibold leading-[1.03] tracking-[-0.045em] text-white">{selectedBook?.title ?? "Build your listening shelf"}</h2>
                    <p className="mt-2 max-w-2xl text-body text-white/[0.62]">
                      {selectedBook ? selectedBook.author : "Import .mp3, .m4a, and .m4b audiobooks, then resume exactly where you stopped."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <input
                        className="range-apple"
                        type="range"
                        min={0}
                        max={Math.max(duration, 1)}
                        step={1}
                        value={Math.min(currentTime, Math.max(duration, 1))}
                        onChange={(event) => void seekTo(Number(event.target.value))}
                        style={{ "--range-progress": `${progressPercent}%` } as CSSProperties}
                        disabled={!selectedBook}
                        aria-label="Playback progress"
                      />
                      <div className="mt-2 flex justify-between text-control text-white/[0.55]">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    <div className="scroll-quiet flex items-center gap-2.5 overflow-x-auto pb-1">
                      <Button variant="ghost" size="icon" className="bg-white/[0.08] text-white hover:bg-white/[0.14] hover:text-white" onClick={() => void skipBy(-settings.skipSeconds)} disabled={!selectedBook}>
                        <BackIcon />
                      </Button>
                      <Button variant="player" size="player" onClick={() => void togglePlayback()} disabled={!selectedBook || !mediaUrl} aria-label={isPlaying ? "Pause" : "Play"}>
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                      </Button>
                      <Button variant="ghost" size="icon" className="bg-white/[0.08] text-white hover:bg-white/[0.14] hover:text-white" onClick={() => void skipBy(settings.skipSeconds)} disabled={!selectedBook}>
                        <ForwardIcon />
                      </Button>

                      <div className="ml-0 flex shrink-0 flex-nowrap gap-1.5 lg:ml-2">
                        {speedOptions.map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => void changePlaybackRate(rate)}
                            className={cn(
                              "rounded-full px-3 py-2 text-control font-semibold text-white/[0.66] transition-[background-color,color,transform] duration-500 ease-apple hover:bg-white/10 hover:text-white active:scale-[0.98]",
                              settings.playbackRate === rate && "bg-white text-apple-ink hover:bg-white hover:text-apple-ink"
                            )}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {loadError ? <p className="text-control text-apple-bright">{loadError}</p> : null}
                    <audio
                      ref={audioRef}
                      src={mediaUrl}
                      onLoadedMetadata={onLoadedMetadata}
                      onTimeUpdate={onTimeUpdate}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => {
                        setIsPlaying(false);
                        void persistProgress();
                      }}
                      onEnded={() => {
                        setIsPlaying(false);
                        void persistProgress(duration, duration);
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Surface className="min-h-0" innerClassName="grid min-h-0 gap-4 overflow-hidden p-4 md:grid-cols-2">
                <div className="scroll-quiet flex min-h-0 flex-col overflow-y-auto rounded-module bg-apple-gray p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone="blue">Markers</Badge>
                      <h3 className="mt-3 font-display text-utility">Save a moment</h3>
                    </div>
                    <BookmarkIcon className="text-apple-link" />
                  </div>
                  <p className="mt-2 text-control text-apple-neutral">Drop a marker at the current timestamp. Add a short note if the scene needs context.</p>
                  <div className="mt-auto space-y-3 pt-4">
                    <Input value={markerLabel} onChange={(event) => setMarkerLabel(event.target.value)} placeholder="Optional marker note" disabled={!selectedBook} />
                    <Button variant="dark" className="w-full" onClick={() => void addMarker()} disabled={!selectedBook}>
                      Save Marker at {formatTime(currentTime)}
                    </Button>
                  </div>
                </div>

                <div className="scroll-quiet flex min-h-0 flex-col overflow-y-auto rounded-module bg-white p-4 shadow-hairline">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge>Sleep</Badge>
                      <h3 className="mt-3 font-display text-utility">Auto off</h3>
                    </div>
                    <TimerIcon className="text-apple-neutral" />
                  </div>
                  <p className="mt-2 text-control text-apple-neutral">When the timer ends, playback pauses. Your progress is saved before stopping.</p>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {sleepPresets.map((minutes) => (
                      <Button key={minutes} variant="quiet" size="sm" onClick={() => startSleepTimer(minutes)}>
                        {minutes}m
                      </Button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input value={customSleepMinutes} onChange={(event) => setCustomSleepMinutes(event.target.value)} inputMode="numeric" className="h-10" />
                    <Button variant="secondary" onClick={startCustomSleepTimer}>Set</Button>
                  </div>
                  <div className="mt-auto pt-4">
                    {sleepRemaining === null ? (
                      <p className="text-control text-apple-neutral">Timer inactive</p>
                    ) : (
                      <div className="flex items-center justify-between rounded-full bg-apple-ink px-4 py-3 text-white">
                        <span className="text-control font-semibold">{formatCountdown(sleepRemaining)}</span>
                        <button type="button" className="text-control text-white/[0.66] hover:text-white" onClick={() => setSleepRemaining(null)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Surface>

              <Surface className="min-h-0" innerClassName="flex min-h-0 flex-col p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <Badge>Book Details</Badge>
                    <h3 className="mt-3 font-display text-utility">Markers</h3>
                  </div>
                  {selectedBook ? (
                    <Button variant="ghost" size="sm" onClick={() => void window.audiobook.revealInFolder(selectedBook.id)}>
                      Reveal
                    </Button>
                  ) : null}
                </div>

                <div className="scroll-quiet min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {selectedBook?.markers.length ? (
                    selectedBook.markers.map((marker) => (
                      <div key={marker.id} className="rounded-panel bg-apple-gray p-3">
                        <button type="button" className="w-full text-left" onClick={() => void jumpToMarker(marker)}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-text text-[15px] font-semibold text-apple-ink">{marker.label}</p>
                            <span className="rounded-full bg-white px-2 py-1 text-micro font-semibold text-apple-link shadow-hairline">
                              {formatTime(marker.timestamp)}
                            </span>
                          </div>
                          <p className="mt-2 text-micro text-apple-neutral">Created {formatDate(marker.createdAt)}</p>
                        </button>
                        <button type="button" className="mt-3 text-micro font-semibold text-apple-neutral hover:text-apple-ink" onClick={() => void removeMarker(marker)}>
                          Remove marker
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-module bg-apple-gray p-4 text-control text-apple-neutral">
                      {selectedBook ? "No markers yet. Save one from the current playback position." : "Select a book to see markers."}
                    </div>
                  )}
                </div>

                <div className="mt-3 border-t border-apple-soft pt-3 text-control text-apple-neutral">
                  <p className="truncate">{selectedBook?.fileName ?? "No file selected"}</p>
                  <p className="mt-1">{selectedBook ? `${formatFileSize(selectedBook.size)} · ${bookProgress(selectedBook)}% complete` : statusMessage}</p>
                  {selectedBook ? (
                    <Button variant="ghost" size="sm" className="mt-3 text-apple-neutral" onClick={() => void removeSelectedBook()}>
                      Remove from library
                    </Button>
                  ) : null}
                </div>
              </Surface>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

function BookCover({ book, size }: { book: Audiobook; size: "small" | "large" }) {
  const isLarge = size === "large";
  const initials = book.title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "shrink-0 rounded-[1.35rem] bg-white/10 p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
        isLarge ? "aspect-[3/4] h-[clamp(220px,30vh,310px)] rounded-[2.15rem] p-2" : "h-20 w-16"
      )}
    >
      <div className="relative h-full overflow-hidden rounded-[calc(1.35rem-0.25rem)] bg-apple-ink shadow-innerHighlight">
        {book.coverDataUrl ? (
          <img src={book.coverDataUrl} alt="" className={cn("h-full w-full", isLarge ? "object-contain" : "object-cover")} />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-[radial-gradient(circle_at_50%_15%,rgba(41,151,255,0.34),transparent_30%),linear-gradient(160deg,#272729,#000000)] p-3 text-white">
            <span className={cn("font-display font-semibold", isLarge ? "text-[64px] tracking-[-0.06em]" : "text-xl")}>{initials || "AB"}</span>
            <span className={cn("line-clamp-3 font-text font-semibold", isLarge ? "text-[22px] leading-tight" : "text-[10px] leading-tight")}>{book.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroPlaceholder() {
  return (
    <div className="flex aspect-[3/4] h-[clamp(220px,30vh,310px)] items-center justify-center rounded-[2.15rem] bg-white/[0.08] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
      <div className="flex h-full w-full items-center justify-center rounded-[calc(2.15rem-0.5rem)] bg-[radial-gradient(circle_at_50%_30%,rgba(41,151,255,0.28),transparent_34%),linear-gradient(160deg,#28282b,#000000)]">
        <PlayIcon className="h-16 w-16 text-white/[0.72]" />
      </div>
    </div>
  );
}

function EmptyLibrary({ search }: { search: string }) {
  return (
    <div className="rounded-module bg-apple-gray p-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-hairline">
        <FolderIcon className="text-apple-neutral" />
      </div>
      <h2 className="mt-4 font-display text-[22px] font-semibold">{search ? "No matches" : "No audiobooks yet"}</h2>
      <p className="mt-2 text-control text-apple-neutral">
        {search ? "Try a different title, author, or file name." : "Add individual files or scan a folder for .mp3, .m4a, and .m4b files."}
      </p>
    </div>
  );
}

function bookProgress(book: Audiobook): number {
  if (!book.duration) return 0;
  return Math.round(clamp((book.progressPosition / book.duration) * 100, 0, 100));
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "Unknown length";
  const minutes = Math.round(value / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatLibraryMinutes(minutes: number): string {
  if (!minutes) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatFileSize(value: number): string {
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  if (value < 1024 * 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M9 7.4v9.2c0 .8.9 1.2 1.5.7l7-4.6c.5-.4.5-1 0-1.4l-7-4.6c-.6-.5-1.5-.1-1.5.7Z" fill="currentColor" />
    </IconBase>
  );
}

function PauseIcon() {
  return (
    <IconBase>
      <path d="M8.2 6.5h2.2v11H8.2v-11Zm5.4 0h2.2v11h-2.2v-11Z" fill="currentColor" />
    </IconBase>
  );
}

function BackIcon() {
  return (
    <IconBase>
      <path d="M11 8 7 12l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8 13 12l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function ForwardIcon() {
  return (
    <IconBase>
      <path d="m13 8 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m7 8 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="10.8" cy="10.8" r="5.7" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15.2 15.2 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </IconBase>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3.7 8.2c0-1 .8-1.8 1.8-1.8h4l1.8 1.9h7.2c1 0 1.8.8 1.8 1.8v6.4c0 1-.8 1.8-1.8 1.8h-13c-1 0-1.8-.8-1.8-1.8V8.2Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
    </IconBase>
  );
}

function FileIcon() {
  return (
    <IconBase>
      <path d="M7 4.5h6.2L17 8.3v11.2H7V4.5Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M13 4.8v3.8h3.8" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
    </IconBase>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7.2 5.2c0-.8.6-1.4 1.4-1.4h6.8c.8 0 1.4.6 1.4 1.4v14.2L12 16.5l-4.8 2.9V5.2Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
    </IconBase>
  );
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.55" />
      <path d="M12 13V9m0 4 3 2M9.5 3.8h5" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export default App;
