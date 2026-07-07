import { useState, type CSSProperties, type MouseEvent, type ReactNode, type Ref } from "react";
import type { Audiobook, PlayerSettings } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookCover, HeroPlaceholder } from "@/shared/components/BookCover";
import { BookmarkIcon, InfoIcon, PauseIcon, PlayIcon, TimerIcon } from "@/shared/components/icons";
import { clamp, formatCountdown, formatTime } from "@/shared/lib/format";

const speedOptions = [0.75, 1, 1.15, 1.25, 1.5, 1.75, 2, 2.5];

interface NowPlayingPanelProps {
  book?: Audiobook;
  audioRef: Ref<HTMLAudioElement>;
  mediaUrl: string;
  settings: PlayerSettings;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  loadError: string | null;
  progressPercent: number;
  markerCount: number;
  sleepRemaining: number | null;
  onOpenMarkers: () => void;
  onOpenSleep: () => void;
  onOpenDetails: () => void;
  onSeek: (value: number) => void | Promise<void>;
  onSkip: (delta: number) => void | Promise<void>;
  onTogglePlayback: () => void | Promise<void>;
  onChangePlaybackRate: (rate: number) => void | Promise<void>;
  onLoadedMetadata: () => void;
  onTimeUpdate: () => void;
  onAudioPlay: () => void;
  onAudioPause: () => void;
  onAudioEnded: () => void;
}

export function NowPlayingPanel({
  book,
  audioRef,
  mediaUrl,
  settings,
  currentTime,
  duration,
  isPlaying,
  loadError,
  progressPercent,
  markerCount,
  sleepRemaining,
  onOpenMarkers,
  onOpenSleep,
  onOpenDetails,
  onSeek,
  onSkip,
  onTogglePlayback,
  onChangePlaybackRate,
  onLoadedMetadata,
  onTimeUpdate,
  onAudioPlay,
  onAudioPause,
  onAudioEnded
}: NowPlayingPanelProps) {
  const remaining = Math.max((duration || book?.duration || 0) - currentTime, 0);

  return (
    <section className="relative flex h-full min-h-0 overflow-hidden rounded-spotlight bg-apple-black p-1.5 text-white shadow-lift">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(41,151,255,0.2),transparent_28%),radial-gradient(circle_at_18%_82%,rgba(255,255,255,0.12),transparent_30%)]" />
      <div className="relative flex min-h-0 flex-1 flex-col rounded-[calc(2.25rem-0.375rem)] bg-apple-black/[0.92] p-5 shadow-innerHighlight lg:p-7">
        <header className="flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <Badge tone="dark">Now Playing</Badge>
            <p className="mt-2 truncate text-control text-white/[0.58]">{book?.author ?? "Import an audiobook to begin"}</p>
          </div>

          <nav className="flex shrink-0 items-center gap-2" aria-label="Player tools">
            <ToolbarIconButton label={sleepRemaining === null ? "Sleep" : formatCountdown(sleepRemaining)} active={sleepRemaining !== null} onClick={onOpenSleep}>
              <TimerIcon />
            </ToolbarIconButton>
            <ToolbarIconButton label={markerCount ? String(markerCount) : "Mark"} onClick={onOpenMarkers} disabled={!book}>
              <BookmarkIcon />
            </ToolbarIconButton>
            <ToolbarIconButton label="Info" onClick={onOpenDetails}>
              <InfoIcon />
            </ToolbarIconButton>
          </nav>
        </header>

        <div className="grid min-h-0 flex-1 items-center gap-7 py-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1fr)] xl:gap-9">
          <div className="flex min-h-0 items-center justify-center">
            <div className="relative">
              {book ? <BookCover book={book} size="player" /> : <HeroPlaceholder size="player" />}
              <Button
                variant="player"
                size="player"
                className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 bg-white/95 text-apple-ink shadow-lift hover:bg-white"
                onClick={() => void onTogglePlayback()}
                disabled={!book || !mediaUrl}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <PauseIcon className="h-8 w-8" /> : <PlayIcon className="h-9 w-9 translate-x-0.5" />}
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col justify-center">
            <div>
              <h2 className="line-clamp-3 max-w-4xl font-display text-[clamp(2.7rem,5.2vw,6.4rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-white">
                {book?.title ?? "Build your listening shelf"}
              </h2>
              <p className="mt-4 max-w-2xl text-body text-white/[0.62]">
                {book ? book.fileName : "Add .mp3, .m4a, or .m4b files, then keep every position, marker, speed setting, and sleep timer close to the player."}
              </p>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-2 text-center">
              <Metric label="Read" value={formatTime(currentTime)} />
              <Metric label="Progress" value={`${Math.round(progressPercent)}%`} />
              <Metric label="Left" value={formatTime(remaining)} />
            </div>

            <div className="mt-6">
              <SeekRange
                disabled={!book}
                currentTime={currentTime}
                duration={duration}
                progressPercent={progressPercent}
                onSeek={onSeek}
              />
              <div className="mt-2 flex justify-between text-control text-white/[0.55]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <SkipButton label="-1m" onClick={() => void onSkip(-60)} disabled={!book} ariaLabel="Skip back one minute" />
              <SkipButton label={`-${settings.skipSeconds}s`} onClick={() => void onSkip(-settings.skipSeconds)} disabled={!book} ariaLabel={`Skip back ${settings.skipSeconds} seconds`} />
              <Button variant="player" size="player" className="h-16 w-16" onClick={() => void onTogglePlayback()} disabled={!book || !mediaUrl} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </Button>
              <SkipButton label={`+${settings.skipSeconds}s`} onClick={() => void onSkip(settings.skipSeconds)} disabled={!book} ariaLabel={`Skip forward ${settings.skipSeconds} seconds`} />
              <SkipButton label="+1m" onClick={() => void onSkip(60)} disabled={!book} ariaLabel="Skip forward one minute" />
            </div>

            <div className="scroll-quiet mt-5 flex max-w-full gap-1.5 overflow-x-auto pb-1">
              {speedOptions.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => void onChangePlaybackRate(rate)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-2 text-control font-semibold text-white/[0.66] transition-[background-color,color,transform] duration-500 ease-apple hover:bg-white/10 hover:text-white active:scale-[0.98]",
                    settings.playbackRate === rate && "bg-white text-apple-ink hover:bg-white hover:text-apple-ink"
                  )}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {loadError ? <p className="mt-4 text-control text-apple-bright">{loadError}</p> : null}
            <audio ref={audioRef} src={mediaUrl} onLoadedMetadata={onLoadedMetadata} onTimeUpdate={onTimeUpdate} onPlay={onAudioPlay} onPause={onAudioPause} onEnded={onAudioEnded} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SkipButton({
  label,
  disabled,
  ariaLabel,
  onClick
}: {
  label: string;
  disabled: boolean;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        "group flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.13] text-white outline-none transition-[background-color,color,transform] duration-500 ease-apple hover:bg-white/[0.18] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-apple-bright focus-visible:ring-offset-2 focus-visible:ring-offset-apple-black"
      )}
    >
      <span className="font-text text-[13px] font-semibold tabular-nums tracking-[-0.01em]">{label}</span>
    </button>
  );
}

function SeekRange({
  disabled,
  currentTime,
  duration,
  progressPercent,
  onSeek
}: {
  disabled: boolean;
  currentTime: number;
  duration: number;
  progressPercent: number;
  onSeek: (value: number) => void | Promise<void>;
}) {
  const [hoverPreview, setHoverPreview] = useState<{ percent: number; time: number } | null>(null);
  const maxDuration = Math.max(duration, 1);

  function updateHoverPreview(event: MouseEvent<HTMLInputElement>): void {
    if (disabled || duration <= 0) {
      setHoverPreview(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    setHoverPreview({
      percent: ratio * 100,
      time: ratio * duration
    });
  }

  return (
    <div className="relative pt-8">
      {hoverPreview ? (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-full bg-white px-3 py-1.5 font-text text-micro font-semibold tabular-nums text-apple-ink shadow-soft"
          style={{ left: `${hoverPreview.percent}%` }}
        >
          {formatTime(hoverPreview.time)}
        </div>
      ) : null}
      <input
        className="range-apple"
        type="range"
        min={0}
        max={maxDuration}
        step={1}
        value={Math.min(currentTime, maxDuration)}
        onChange={(event) => void onSeek(Number(event.target.value))}
        onMouseEnter={updateHoverPreview}
        onMouseMove={updateHoverPreview}
        onMouseLeave={() => setHoverPreview(null)}
        style={{ "--range-progress": `${progressPercent}%` } as CSSProperties}
        disabled={disabled}
        aria-label="Playback progress"
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel bg-white/[0.08] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <p className="font-text text-[10px] font-semibold uppercase tracking-[0.2em] text-white/[0.42]">{label}</p>
      <p className="mt-1 font-text text-[15px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function ToolbarIconButton({ children, label, active = false, disabled = false, onClick }: { children: ReactNode; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        "group flex min-w-16 flex-col items-center gap-1 rounded-panel px-2 py-2 text-white/[0.6] transition-[background-color,color,transform] duration-500 ease-apple hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35",
        active && "bg-white text-apple-ink hover:bg-white hover:text-apple-ink"
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
      <span className="max-w-16 truncate text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span>
    </button>
  );
}
