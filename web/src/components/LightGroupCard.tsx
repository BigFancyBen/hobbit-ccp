import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@hobbit/ui/8bit/card';
import { Switch } from '@hobbit/ui/8bit/switch';
import { Slider } from '@hobbit/ui/8bit/slider';

interface LightGroupCardProps {
  name: string;
  on: boolean;
  brightnessPercent: number;
  disabled?: boolean;
  acting?: boolean;
  onToggle: () => void;
  onBrightness: (percent: number) => void;
  children?: ReactNode;
}

export function LightGroupCard({
  name,
  on,
  brightnessPercent,
  disabled,
  acting,
  onToggle,
  onBrightness,
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
            <CardTitle className="text-sm">{name}</CardTitle>
            <Switch
              checked={on}
              onCheckedChange={onToggle}
              disabled={disabled}
            />
          </div>
          <div className="mt-3">
            <Slider
              value={[sliderValue]}
              min={0}
              max={100}
              step={1}
              trackBg={on ? 'bg-yellow-400' : 'bg-muted-foreground/40'}
              disabled={disabled}
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
