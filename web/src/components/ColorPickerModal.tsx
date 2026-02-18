import { useState, useEffect } from 'react';
import { lockScroll, unlockScroll } from '@/lib/scroll-lock';
import { createPortal } from 'react-dom';
import { useTransition, animated, to } from '@react-spring/web';
import { Button } from '@hobbit/ui/8bit/button';

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

const COLOR_SWATCHES = [
  { hex: '#FF0000', label: 'Red' },
  { hex: '#FF4500', label: 'Coral' },
  { hex: '#FF8C00', label: 'Orange' },
  { hex: '#FFD700', label: 'Gold' },
  { hex: '#00FF00', label: 'Green' },
  { hex: '#00CED1', label: 'Teal' },
  { hex: '#0000FF', label: 'Blue' },
  { hex: '#8000FF', label: 'Purple' },
  { hex: '#FF00FF', label: 'Magenta' },
  { hex: '#FF69B4', label: 'Pink' },
] as const;

const WHITE_PRESETS = [
  { label: 'Candle', mireds: 500 },
  { label: 'Warm', mireds: 370 },
  { label: 'Neutral', mireds: 250 },
  { label: 'Cool', mireds: 200 },
  { label: 'Daylight', mireds: 154 },
] as const;

/** Find the closest warmth preset to a given mired value */
function closestPresetMireds(mireds: number): number {
  let best = WHITE_PRESETS[0].mireds;
  let bestDist = Math.abs(mireds - best);
  for (const p of WHITE_PRESETS) {
    const dist = Math.abs(mireds - p.mireds);
    if (dist < bestDist) { best = p.mireds; bestDist = dist; }
  }
  return best;
}

interface DeviceSupports {
  color: boolean;
  color_temp: boolean;
}

interface ColorPaletteModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  supports: DeviceSupports;
  currentColorHex: string | null;
  currentColorTemp: number | null;
  onColorChange: (hex: string) => void;
  onColorTempChange: (mireds: number) => void;
}

export function ColorPaletteModal({
  open,
  onClose,
  title,
  supports,
  currentColorHex,
  currentColorTemp,
  onColorChange,
  onColorTempChange,
}: ColorPaletteModalProps) {
  // Track which swatch is selected — "color" or "temp" mode
  const [selected, setSelected] = useState<
    { type: 'color'; hex: string } | { type: 'temp'; mireds: number } | null
  >(null);

  // Reset selection when modal opens for a new target
  useEffect(() => {
    if (open) {
      if (currentColorHex && COLOR_SWATCHES.some(s => s.hex === currentColorHex)) {
        setSelected({ type: 'color', hex: currentColorHex });
      } else if (currentColorTemp !== null) {
        setSelected({ type: 'temp', mireds: closestPresetMireds(currentColorTemp) });
      } else {
        setSelected(null);
      }
    }
  }, [open, title]); // title changes = different target

  // Lock body scroll
  useEffect(() => {
    if (open) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [open]);

  const transitions = useTransition(open, {
    from: { opacity: 0, scale: 0.85, y: -10 },
    enter: { opacity: 1, scale: 1, y: 0 },
    leave: { opacity: 0, scale: 0.95, y: 5 },
    config: { tension: 400, friction: 20 },
  });

  const backdropTransition = useTransition(open, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    config: { tension: 300, friction: 26 },
  });

  function handleColorClick(hex: string) {
    setSelected({ type: 'color', hex });
    onColorChange(hex);
  }

  function handleTempClick(mireds: number) {
    setSelected({ type: 'temp', mireds });
    onColorTempChange(mireds);
  }

  const selectedColor = selected?.type === 'color' ? selected.hex : null;
  const selectedTemp = selected?.type === 'temp' ? selected.mireds : null;

  const content = (
    <>
      {backdropTransition((style, show) =>
        show && (
          <animated.div
            style={style}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
        )
      )}

      {transitions((style, show) =>
        show && (
          <animated.div
            style={{
              opacity: style.opacity,
              transform: to([style.y, style.scale], (y, s) => `translateY(${y}px) scale(${s})`),
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative bg-card p-5 border-y-6 border-foreground dark:border-ring w-full max-w-xs pointer-events-auto">
              {/* Pixel borders */}
              <div
                className="absolute inset-0 border-x-6 -mx-1.5 border-foreground dark:border-ring pointer-events-none"
                aria-hidden="true"
              />

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold retro">{title}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 touch-manipulation active:scale-95"
                  onClick={onClose}
                >
                  <CloseIcon />
                </Button>
              </div>

              <div className="space-y-5 mx-1">
                {/* Color swatches */}
                {supports.color && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground retro">Color</span>
                    <div className="grid grid-cols-5 gap-3 justify-items-center">
                      {COLOR_SWATCHES.map(({ hex, label }) => (
                        <button
                          key={hex}
                          aria-label={label}
                          onClick={() => handleColorClick(hex)}
                          className={`w-10 h-10 touch-manipulation active:scale-90 transition-transform ${
                            selectedColor === hex
                              ? 'border-3 border-yellow-400 ring-2 ring-yellow-400'
                              : 'border-3 border-foreground dark:border-ring'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Warmth temperature presets */}
                {supports.color_temp && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground retro">Warmth</span>
                    <div className="grid grid-cols-5 gap-3 justify-items-center">
                      {WHITE_PRESETS.map(({ label, mireds }) => (
                        <button
                          key={mireds}
                          aria-label={`${label} (${Math.round(1000000 / mireds)}K)`}
                          onClick={() => handleTempClick(mireds)}
                          className="flex flex-col items-center gap-1.5 touch-manipulation active:scale-90 transition-transform"
                        >
                          <div
                            className={`w-10 h-10 ${
                              selectedTemp === mireds
                                ? 'border-3 border-yellow-400 ring-2 ring-yellow-400'
                                : 'border-3 border-foreground dark:border-ring'
                            }`}
                            style={{ backgroundColor: miredsToApproxColor(mireds) }}
                          />
                          <span className="text-[9px] text-muted-foreground">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </animated.div>
        )
      )}
    </>
  );

  return createPortal(content, document.body);
}

/** Approximate mireds → display color for the swatch preview */
function miredsToApproxColor(mireds: number): string {
  if (mireds >= 450) return '#FF9329'; // Candle / very warm
  if (mireds >= 330) return '#FFC58F'; // Warm white
  if (mireds >= 230) return '#FFF1E0'; // Neutral
  if (mireds >= 180) return '#F5F3FF'; // Cool
  return '#CAE2FF';                     // Daylight / blue-white
}
