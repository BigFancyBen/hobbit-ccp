import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "../lib/utils";
import { Input as BaseInput } from "../base/input";

import "../styles/retro.css";

export const inputVariants = cva("", {
  variants: {
    font: {
      normal: "",
      retro: "retro",
    },
  },
  defaultVariants: {
    font: "retro",
  },
});

export interface BitInputProps
  extends React.ComponentProps<"input">,
    VariantProps<typeof inputVariants> {}

function Input({ className, font, ...props }: BitInputProps) {
  return (
    <div className="relative">
      <BaseInput
        {...props}
        className={cn(
          "rounded-none border-y-6 border-foreground dark:border-ring border-x-0 bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground/50 outline-none focus-visible:ring-0 focus-visible:shadow-none",
          font !== "normal" && "retro",
          className
        )}
      />
      <div
        className="absolute inset-0 border-x-6 -mx-1.5 border-foreground dark:border-ring pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

export { Input };
