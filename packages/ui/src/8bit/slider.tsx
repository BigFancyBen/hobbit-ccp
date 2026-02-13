import { Slider as SliderPrimitive } from "radix-ui";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "../lib/utils";

import "../styles/retro.css";

export const sliderVariants = cva("", {
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

export interface BitSliderProps
  extends React.ComponentProps<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants> {
  trackBg?: string;
}

function Slider({
  className,
  font,
  trackBg,
  defaultValue,
  value,
  onValueChange,
  ...props
}: BitSliderProps) {
  const _values = value ?? defaultValue ?? [0];

  return (
    <div className={cn("relative w-full", className)}>
      <SliderPrimitive.Root
        data-slot="slider"
        defaultValue={defaultValue}
        value={value}
        onValueChange={onValueChange}
        className={cn(
          "relative flex w-full touch-none items-center select-none",
          font !== "normal" && "retro"
        )}
        {...props}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="bg-primary/20 relative h-3 w-full grow overflow-hidden"
        >
          <SliderPrimitive.Range
            data-slot="slider-range"
            className={cn("absolute h-full", trackBg || "bg-primary")}
          />
        </SliderPrimitive.Track>
        {_values.map((_, i) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={i}
            className="block h-5 w-4 bg-foreground dark:bg-ring border-none shadow-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Root>

      {/* Top pixel border */}
      <div
        className="absolute inset-x-0 -top-1 h-1 border-x-2 border-x-transparent bg-foreground dark:bg-ring pointer-events-none mx-1"
        aria-hidden="true"
      />
      {/* Bottom pixel border */}
      <div
        className="absolute inset-x-0 -bottom-1 h-1 border-x-2 border-x-transparent bg-foreground dark:bg-ring pointer-events-none mx-1"
        aria-hidden="true"
      />
      {/* Left pixel border */}
      <div
        className="absolute inset-y-0 -left-1 w-1 border-y-2 border-y-transparent bg-foreground dark:bg-ring pointer-events-none my-1"
        aria-hidden="true"
      />
      {/* Right pixel border */}
      <div
        className="absolute inset-y-0 -right-1 w-1 border-y-2 border-y-transparent bg-foreground dark:bg-ring pointer-events-none my-1"
        aria-hidden="true"
      />
    </div>
  );
}

export { Slider };
