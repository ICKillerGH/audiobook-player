import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "light" | "dark" | "blue";
}

export function Badge({ className, tone = "light", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 font-text text-[10px] font-semibold uppercase tracking-[0.2em]",
        tone === "light" && "bg-black/5 text-apple-neutral",
        tone === "dark" && "bg-white/10 text-white/[0.72]",
        tone === "blue" && "bg-apple-blue/10 text-apple-link",
        className
      )}
      {...props}
    />
  );
}
