import type { Audiobook } from "@shared/types";
import { cn } from "@/lib/utils";
import { PlayIcon } from "./icons";

interface BookCoverProps {
  book: Audiobook;
  size: "small" | "large";
}

export function BookCover({ book, size }: BookCoverProps) {
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

export function HeroPlaceholder() {
  return (
    <div className="flex aspect-[3/4] h-[clamp(220px,30vh,310px)] items-center justify-center rounded-[2.15rem] bg-white/[0.08] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
      <div className="flex h-full w-full items-center justify-center rounded-[calc(2.15rem-0.5rem)] bg-[radial-gradient(circle_at_50%_30%,rgba(41,151,255,0.28),transparent_34%),linear-gradient(160deg,#28282b,#000000)]">
        <PlayIcon className="h-16 w-16 text-white/[0.72]" />
      </div>
    </div>
  );
}
