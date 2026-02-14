import { useState, useEffect, useRef, useCallback } from 'react';
import { lockScroll, unlockScroll } from '@/lib/scroll-lock';
import { createPortal } from 'react-dom';
import { useTransition, animated, to } from '@react-spring/web';
import { HexColorPicker } from 'react-colorful';
import { Slider } from '@hobbit/ui/8bit/slider';
import { Button } from '@hobbit/ui/8bit/button';
import type { GroupCapabilities } from '@/hooks/useLights';

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

interface ColorPickerModalProps {
  open: boolean;
  onClose: () => void;
  capabilities: GroupCapabilities;
  currentColorTemp: number | null;
  onColorChange: (hex: string) => void;
  onColorTempChange: (mireds: number) => void;
}

export function ColorPickerModal({
  open,
  onClose,
  capabilities,
  currentColorTemp,
  onColorChange,
  onColorTempChange,
}: ColorPickerModalProps) {
  const [hex, setHex] = useState('#ffffff');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Color temp slider — local drag state
  const [ctSlider, setCtSlider] = useState(currentColorTemp ?? 350);
  const ctDragging = useRef(false);

  useEffect(() => {
    if (!ctDragging.current && currentColorTemp !== null) {
      setCtSlider(currentColorTemp);
    }
  }, [currentColorTemp]);

  // Debounced color change
  const handleColorChange = useCallback((newHex: string) => {
    setHex(newHex);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onColorChange(newHex);
    }, 300);
  }, [onColorChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
                <h2 className="text-sm font-semibold retro">Light Color</h2>
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
                {/* Color picker */}
                {capabilities.color && (
                  <div className="space-y-2">
                    <HexColorPicker
                      color={hex}
                      onChange={handleColorChange}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                {/* Color temperature */}
                {capabilities.color_temp && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground retro">
                      <span>Cool</span>
                      <span>Warm</span>
                    </div>
                    <Slider
                      value={[ctSlider]}
                      min={capabilities.color_temp_min}
                      max={capabilities.color_temp_max}
                      step={1}
                      trackBg="bg-amber-300"
                      onValueChange={(val: number[]) => {
                        ctDragging.current = true;
                        setCtSlider(val[0]);
                      }}
                      onValueCommit={(val: number[]) => {
                        ctDragging.current = false;
                        onColorTempChange(val[0]);
                      }}
                    />
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
