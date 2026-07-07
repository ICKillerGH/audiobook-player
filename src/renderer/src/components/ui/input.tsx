import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "no-drag h-11 w-full rounded-field border border-apple-soft bg-white px-4 font-text text-control text-apple-ink outline-none transition-[border-color,box-shadow,background-color] duration-500 ease-apple placeholder:text-apple-neutral/70 focus:border-apple-blue focus:shadow-[0_0_0_3px_rgba(0,113,227,0.13)]",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";
