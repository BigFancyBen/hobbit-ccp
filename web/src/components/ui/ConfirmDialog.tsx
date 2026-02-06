import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTransition, animated, to } from '@react-spring/web';
import { Button } from '@/components/ui/8bit/button';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
}: ConfirmDialogProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
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
            onClick={onCancel}
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
            <div className="relative bg-card p-6 border-y-6 border-foreground dark:border-ring w-full max-w-sm pointer-events-auto">
              {/* Pixel borders */}
              <div
                className="absolute inset-0 border-x-6 -mx-1.5 border-foreground dark:border-ring pointer-events-none"
                aria-hidden="true"
              />

              {/* Content */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold retro">{title}</h2>
                  {description && (
                    <p className="text-sm text-muted-foreground retro">
                      {description}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1 h-14 touch-manipulation active:scale-95 transition-transform"
                    onClick={onCancel}
                  >
                    {cancelText}
                  </Button>
                  <Button
                    variant={variant}
                    className="flex-1 h-14 touch-manipulation active:scale-95 transition-transform"
                    onClick={onConfirm}
                  >
                    {confirmText}
                  </Button>
                </div>
              </div>
            </div>
          </animated.div>
        )
      )}
    </>
  );

  // Render in portal to avoid layout interference
  return createPortal(content, document.body);
}
