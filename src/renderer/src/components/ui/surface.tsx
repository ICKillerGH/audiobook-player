import * as React from "react";
import { cn } from "@/lib/utils";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  innerClassName?: string;
}

export function Surface({ className, innerClassName, children, ...props }: SurfaceProps) {
  return (
    <div className={cn("rounded-spotlight bg-black/[0.035] p-1.5 shadow-hairline", className)} {...props}>
      <div className={cn("h-full rounded-[calc(2.25rem-0.375rem)] bg-white shadow-innerHighlight", innerClassName)}>
        {children}
      </div>
    </div>
  );
}
