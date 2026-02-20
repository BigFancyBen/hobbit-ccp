import { useEffect } from 'react';
import { lockScroll, unlockScroll } from '@/lib/scroll-lock';
import { createPortal } from 'react-dom';
import { useTransition, animated, to } from '@react-spring/web';
import { Button } from '@hobbit/ui/8bit/button';
import { CloseIcon } from '@/components/icons';

const TIMER_PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hour', minutes: 120 },
  { label: '4 hour', minutes: 240 },
  { label: '8 hour', minutes: 480 },
] as const;

interface TimerModalProps {
  open: boolean;
  onClose: () => void;
  deviceName: string;
  activeTimer: { endsAt: number } | null;
  onSetTimer: (minutes: number) => void;
  onCancelTimer: () => void;
}

export function TimerModal({
  open,
  onClose,
  deviceName,
  activeTimer,
  onSetTimer,
  onCancelTimer,
}: TimerModalProps) {
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

  function handlePresetClick(minutes: number) {
    onSetTimer(minutes);
    onClose();
  }

  function handleCancel() {
    onCancelTimer();
    onClose();
  }

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
                <h2 className="text-sm font-semibold retro">{deviceName}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 touch-manipulation active:scale-95"
                  onClick={onClose}
                >
                  <CloseIcon />
                </Button>
              </div>

              <div className="space-y-4 mx-1">
                <span className="text-xs text-muted-foreground retro">Auto-off timer</span>
                <div className="grid grid-cols-2 gap-3">
                  {TIMER_PRESETS.map(({ label, minutes }) => (
                    <Button
                      key={minutes}
                      variant="outline"
                      font="retro"
                      className="touch-manipulation active:scale-95 transition-transform text-[10px] py-3"
                      onClick={() => handlePresetClick(minutes)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                {activeTimer && (
                  <Button
                    variant="destructive"
                    font="retro"
                    className="w-full touch-manipulation active:scale-95 transition-transform text-xs"
                    onClick={handleCancel}
                  >
                    Cancel Timer
                  </Button>
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
