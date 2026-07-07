import { useEffect, useRef } from "react";
import type { Audiobook, OsMediaCommand } from "@shared/types";
import { clamp } from "@/shared/lib/format";

interface UseOsMediaControlsOptions {
  book?: Audiobook;
  mediaUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  skipSeconds: number;
  onPlay: () => void | Promise<void>;
  onPause: () => void | Promise<void>;
  onSeek: (position: number) => void | Promise<void>;
  onSkip: (delta: number) => void | Promise<void>;
}

interface CommandHandlers {
  play: () => void | Promise<void>;
  pause: () => void | Promise<void>;
  seek: (position: number) => void | Promise<void>;
  skip: (delta: number) => void | Promise<void>;
  skipSeconds: number;
}

export function useOsMediaControls({
  book,
  mediaUrl,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  skipSeconds,
  onPlay,
  onPause,
  onSeek,
  onSkip
}: UseOsMediaControlsOptions): void {
  const commandHandlersRef = useRef<CommandHandlers>({
    play: onPlay,
    pause: onPause,
    seek: onSeek,
    skip: onSkip,
    skipSeconds
  });

  commandHandlersRef.current = {
    play: onPlay,
    pause: onPause,
    seek: onSeek,
    skip: onSkip,
    skipSeconds
  };

  useEffect(() => {
    return window.audiobook.onOsMediaCommand((command) => {
      handleOsMediaCommand(command, commandHandlersRef.current);
    });
  }, []);

  useEffect(() => {
    window.audiobook.setOsMediaState({
      canPlay: Boolean(book && mediaUrl),
      isPlaying,
      title: book?.title,
      author: book?.author
    });
  }, [book?.author, book?.id, book?.title, isPlaying, mediaUrl]);

  useEffect(() => {
    if (!hasMediaSession()) return;

    navigator.mediaSession.playbackState = book && mediaUrl ? (isPlaying ? "playing" : "paused") : "none";
  }, [book?.id, isPlaying, mediaUrl]);

  useEffect(() => {
    if (!hasMediaSession() || typeof MediaMetadata === "undefined") return;

    if (!book) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: book.title,
      artist: book.author,
      album: book.album,
      artwork: artworkForBook(book)
    });
  }, [book?.album, book?.author, book?.coverDataUrl, book?.id, book?.title]);

  useEffect(() => {
    if (!hasMediaSession()) return;

    trySetMediaSessionHandler("play", () => {
      void commandHandlersRef.current.play();
    });
    trySetMediaSessionHandler("pause", () => {
      void commandHandlersRef.current.pause();
    });
    trySetMediaSessionHandler("stop", () => {
      void commandHandlersRef.current.pause();
    });
    trySetMediaSessionHandler("seekbackward", (details) => {
      const offset = offsetFromMediaSessionDetails(details, commandHandlersRef.current.skipSeconds);
      void commandHandlersRef.current.skip(-offset);
    });
    trySetMediaSessionHandler("seekforward", (details) => {
      const offset = offsetFromMediaSessionDetails(details, commandHandlersRef.current.skipSeconds);
      void commandHandlersRef.current.skip(offset);
    });
    trySetMediaSessionHandler("seekto", (details) => {
      if (typeof details.seekTime !== "number") return;
      void commandHandlersRef.current.seek(details.seekTime);
    });

    return () => {
      trySetMediaSessionHandler("play", null);
      trySetMediaSessionHandler("pause", null);
      trySetMediaSessionHandler("stop", null);
      trySetMediaSessionHandler("seekbackward", null);
      trySetMediaSessionHandler("seekforward", null);
      trySetMediaSessionHandler("seekto", null);
    };
  }, []);

  useEffect(() => {
    if (!hasMediaSession() || !book || duration <= 0 || !Number.isFinite(duration)) return;

    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
        position: clamp(currentTime, 0, duration)
      });
    } catch {
      // Some OS media surfaces reject partial or rapidly changing position state.
    }
  }, [book?.id, currentTime, duration, playbackRate]);
}

function handleOsMediaCommand(command: OsMediaCommand, handlers: CommandHandlers): void {
  switch (command) {
    case "play":
      void handlers.play();
      break;
    case "pause":
      void handlers.pause();
      break;
    case "seek-backward":
      void handlers.skip(-handlers.skipSeconds);
      break;
    case "seek-forward":
      void handlers.skip(handlers.skipSeconds);
      break;
  }
}

function hasMediaSession(): boolean {
  return "mediaSession" in navigator;
}

function trySetMediaSessionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null): void {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // Unsupported actions vary by Chromium/OS version.
  }
}

function offsetFromMediaSessionDetails(details: MediaSessionActionDetails, fallback: number): number {
  return typeof details.seekOffset === "number" && Number.isFinite(details.seekOffset) && details.seekOffset > 0 ? details.seekOffset : fallback;
}

function artworkForBook(book: Audiobook): MediaImage[] {
  if (!book.coverDataUrl) return [];

  const type = /^data:([^;,]+)/.exec(book.coverDataUrl)?.[1] ?? "image/png";
  return [96, 128, 192, 256, 384, 512].map((size) => ({
    src: book.coverDataUrl ?? "",
    sizes: `${size}x${size}`,
    type
  }));
}
