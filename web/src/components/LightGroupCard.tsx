import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@hobbit/ui/8bit/card';
import { Switch } from '@hobbit/ui/8bit/switch';
import { Slider } from '@hobbit/ui/8bit/slider';

function PaletteIcon() {
  // Pixel-art style: 16x16 grid, 4 color swatches in a 2x2 block
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="currentColor"
      shapeRendering="crispEdges"
    >
      <rect x="1" y="1" width="6" height="6" fill="#ef4444" />
      <rect x="9" y="1" width="6" height="6" fill="#3b82f6" />
      <rect x="1" y="9" width="6" height="6" fill="#22c55e" />
      <rect x="9" y="9" width="6" height="6" fill="#eab308" />
    </svg>
  );
}

interface LightGroupCardProps {
  name: string;
  on: boolean;
  brightnessPercent: number;
  reconnecting?: boolean;
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
  reconnecting,
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
    <Card>
      <CardHeader className={children ? 'pb-3 border-b-6 border-foreground dark:border-ring' : ''}>
        <div className={`bg-muted/50 rounded-md px-3 py-3 ${acting ? 'animate-shimmer' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <CardTitle className="text-sm">{name}</CardTitle>
              {reconnecting && (
                <span className="text-[10px] text-muted-foreground animate-pulse mt-1">
                  Connecting...
                </span>
              )}
            </div>
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
      </CardHeader>
      {children && (
        <CardContent>
          <div className={`mx-2 ${acting ? 'animate-shimmer' : ''}`}>
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
