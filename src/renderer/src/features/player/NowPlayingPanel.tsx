import type { CSSProperties, Ref } from "react";
import type { Audiobook, PlayerSettings } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookCover, HeroPlaceholder } from "@/shared/components/BookCover";
import { BackIcon, ForwardIcon, PauseIcon, PlayIcon } from "@/shared/components/icons";
import { formatTime } from "@/shared/lib/format";

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
  return (
    <section className="relative overflow-hidden rounded-spotlight bg-apple-black p-1.5 text-white shadow-lift">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_18%,rgba(41,151,255,0.2),transparent_34%),radial-gradient(circle_at_20%_90%,rgba(255,255,255,0.13),transparent_28%)]" />
      <div className="relative grid h-full min-h-0 gap-5 rounded-[calc(2.25rem-0.375rem)] bg-apple-black/[0.92] p-5 shadow-innerHighlight lg:grid-cols-[minmax(220px,0.52fr)_minmax(0,1fr)] lg:p-6">
        <div className="flex min-h-0 items-center justify-center">
          {book ? <BookCover book={book} size="large" /> : <HeroPlaceholder />}
        </div>

        <div className="flex min-h-0 min-w-0 flex-col justify-center gap-5">
          <div>
            <Badge tone="dark">Now Playing</Badge>
            <h2 className="mt-3 line-clamp-2 font-display text-[clamp(2.4rem,4.2vw,4.4rem)] font-semibold leading-[1.03] tracking-[-0.045em] text-white">{book?.title ?? "Build your listening shelf"}</h2>
            <p className="mt-2 max-w-2xl text-body text-white/[0.62]">
              {book ? book.author : "Import .mp3, .m4a, and .m4b audiobooks, then resume exactly where you stopped."}
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
                onChange={(event) => void onSeek(Number(event.target.value))}
                style={{ "--range-progress": `${progressPercent}%` } as CSSProperties}
                disabled={!book}
                aria-label="Playback progress"
              />
              <div className="mt-2 flex justify-between text-control text-white/[0.55]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="scroll-quiet flex items-center gap-2.5 overflow-x-auto pb-1">
              <Button variant="ghost" size="icon" className="bg-white/[0.08] text-white hover:bg-white/[0.14] hover:text-white" onClick={() => void onSkip(-settings.skipSeconds)} disabled={!book}>
                <BackIcon />
              </Button>
              <Button variant="player" size="player" onClick={() => void onTogglePlayback()} disabled={!book || !mediaUrl} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </Button>
              <Button variant="ghost" size="icon" className="bg-white/[0.08] text-white hover:bg-white/[0.14] hover:text-white" onClick={() => void onSkip(settings.skipSeconds)} disabled={!book}>
                <ForwardIcon />
              </Button>

              <div className="ml-0 flex shrink-0 flex-nowrap gap-1.5 lg:ml-2">
                {speedOptions.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => void onChangePlaybackRate(rate)}
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
            <audio ref={audioRef} src={mediaUrl} onLoadedMetadata={onLoadedMetadata} onTimeUpdate={onTimeUpdate} onPlay={onAudioPlay} onPause={onAudioPause} onEnded={onAudioEnded} />
          </div>
        </div>
      </div>
    </section>
  );
}
