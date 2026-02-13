import { Switch as SwitchPrimitive } from "radix-ui";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "../lib/utils";

import "../styles/retro.css";

export const switchVariants = cva("", {
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

export interface BitSwitchProps
  extends React.ComponentProps<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {}

function Switch({ className, font, ...props }: BitSwitchProps) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <SwitchPrimitive.Root
        data-slot="switch"
        className={cn(
          "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted inline-flex h-6 w-11 shrink-0 items-center border-2 border-foreground dark:border-ring transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          font !== "normal" && "retro"
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className="bg-foreground dark:bg-ring pointer-events-none block h-4 w-4 shadow-none ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5"
        />
      </SwitchPrimitive.Root>

      {/* Top pixel bar */}
      <div
        className="absolute -top-1 left-1 right-1 h-1 bg-foreground dark:bg-ring pointer-events-none"
        aria-hidden="true"
      />
      {/* Bottom pixel bar */}
      <div
        className="absolute -bottom-1 left-1 right-1 h-1 bg-foreground dark:bg-ring pointer-events-none"
        aria-hidden="true"
      />
      {/* Left pixel bar */}
      <div
        className="absolute top-1 -left-1 bottom-1 w-1 bg-foreground dark:bg-ring pointer-events-none"
        aria-hidden="true"
      />
      {/* Right pixel bar */}
      <div
        className="absolute top-1 -right-1 bottom-1 w-1 bg-foreground dark:bg-ring pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

export { Switch };
