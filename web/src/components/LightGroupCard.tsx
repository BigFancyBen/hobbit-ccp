import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Switch } from '@hobbit/ui/8bit/switch';
import { Slider } from '@hobbit/ui/8bit/slider';
import { PaletteIcon } from '@/components/icons';

interface LightGroupCardProps {
  name: string;
  on: boolean;
  brightnessPercent: number;
  acting?: boolean;
  onToggle: () => void;
  onBrightness: (percent: number) => void;
  onColorClick?: () => void;
  children?: ReactNode;
}

export function LightGroupCard({
  name,
  on,
  brightnessPercent,
  acting,
  onToggle,
  onBrightness,
  onColorClick,
  children,
}: LightGroupCardProps) {
  // Local slider state so it moves during drag (controlled Radix slider
  // needs onValueChange to update visually). Syncs from server state
  // when not actively dragging.
  const [sliderValue, setSliderValue] = useState(brightnessPercent);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) {
      setSliderValue(brightnessPercent);
    }
  }, [brightnessPercent]);

  return (
    <div>
      <div className={`bg-muted/50 rounded-md px-3 py-3 ${acting ? 'animate-shimmer' : ''}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold retro">{name}</span>
          <div className="flex items-center gap-2">
            {onColorClick && (
              <button
                onClick={onColorClick}
                aria-label="Change light color"
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors touch-manipulation active:scale-95"
              >
                <PaletteIcon />
              </button>
            )}
            <Switch
              checked={on}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
        <div className="mt-3">
          <Slider
            value={[sliderValue]}
            min={0}
            max={100}
            step={1}
            trackBg={on ? 'bg-yellow-400' : 'bg-muted-foreground/40'}
            onValueChange={(val: number[]) => {
              dragging.current = true;
              setSliderValue(val[0]);
            }}
            onValueCommit={(val: number[]) => {
              dragging.current = false;
              onBrightness(val[0]);
            }}
          />
        </div>
      </div>
      {children && (
        <div className={`mx-2 mt-3 ${acting ? 'animate-shimmer' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}
