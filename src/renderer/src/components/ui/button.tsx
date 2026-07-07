import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "no-drag inline-flex items-center justify-center gap-2 whitespace-nowrap font-text text-control font-semibold outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-500 ease-apple active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-apple-blue focus-visible:ring-offset-2 focus-visible:ring-offset-apple-gray",
  {
    variants: {
      variant: {
        primary: "rounded-full bg-apple-blue text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#0077ed]",
        dark: "rounded-full bg-apple-ink text-white hover:bg-black",
        secondary: "rounded-full bg-white text-apple-ink shadow-hairline hover:bg-[#fafafc]",
        quiet: "rounded-full bg-black/5 text-apple-ink hover:bg-black/10",
        ghost: "rounded-full text-apple-neutral hover:bg-black/5 hover:text-apple-ink",
        player: "rounded-full bg-white text-apple-ink shadow-soft hover:scale-[1.02] hover:bg-[#fbfbfd]"
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10 p-0",
        player: "h-14 w-14 p-0"
      }
    },
    defaultVariants: {
      variant: "secondary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);

Button.displayName = "Button";
