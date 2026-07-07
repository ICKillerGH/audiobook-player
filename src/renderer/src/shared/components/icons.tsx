import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M9 7.4v9.2c0 .8.9 1.2 1.5.7l7-4.6c.5-.4.5-1 0-1.4l-7-4.6c-.6-.5-1.5-.1-1.5.7Z" fill="currentColor" />
    </IconBase>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M8.2 6.5h2.2v11H8.2v-11Zm5.4 0h2.2v11h-2.2v-11Z" fill="currentColor" />
    </IconBase>
  );
}

export function BackIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M11 8 7 12l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8 13 12l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export function ForwardIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="m13 8 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m7 8 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <circle cx="10.8" cy="10.8" r="5.7" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15.2 15.2 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </IconBase>
  );
}

export function FolderIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M3.7 8.2c0-1 .8-1.8 1.8-1.8h4l1.8 1.9h7.2c1 0 1.8.8 1.8 1.8v6.4c0 1-.8 1.8-1.8 1.8h-13c-1 0-1.8-.8-1.8-1.8V8.2Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
    </IconBase>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M7 4.5h6.2L17 8.3v11.2H7V4.5Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M13 4.8v3.8h3.8" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
    </IconBase>
  );
}

export function BookmarkIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M7.2 5.2c0-.8.6-1.4 1.4-1.4h6.8c.8 0 1.4.6 1.4 1.4v14.2L12 16.5l-4.8 2.9V5.2Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
    </IconBase>
  );
}

export function TimerIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.55" />
      <path d="M12 13V9m0 4 3 2M9.5 3.8h5" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}
