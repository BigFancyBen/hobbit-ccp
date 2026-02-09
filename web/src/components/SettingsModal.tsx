import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTransition, animated } from '@react-spring/web';
import { Button } from '@hobbit/ui/8bit/button';
import { StatsTab } from './StatsTab';
import { SystemTab } from './SystemTab';

function CogIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

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

interface SettingsModalProps {
  onReboot: () => void;
  loading: string | null;
}

const TABS = ['system', 'stats'] as const;
type TabKey = (typeof TABS)[number];

export function SettingsModal({ onReboot, loading }: SettingsModalProps) {
  const [tab, setTab] = useState<TabKey>('system');
  const [isOpen, setIsOpen] = useState(false);
  const prevTabIndexRef = useRef(0);

  const handleClose = () => setIsOpen(false);

  // Calculate animation direction based on tab change
  const currentIndex = TABS.indexOf(tab);
  const direction = currentIndex > prevTabIndexRef.current ? 1 : -1;

  useEffect(() => {
    prevTabIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Tab content transition
  const tabTransition = useTransition(tab, {
    from: { opacity: 0, x: direction * 50 },
    enter: { opacity: 1, x: 0 },
    leave: { opacity: 0, x: -direction * 50, position: 'absolute' as const },
    config: { tension: 300, friction: 26 },
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Modal transition - scales from top-right corner
  const modalTransition = useTransition(isOpen, {
    from: { opacity: 0, scale: 0.3 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0.3 },
    config: { tension: 320, friction: 22 },
  });

  const backdropTransition = useTransition(isOpen, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    config: { tension: 200, friction: 26 },
  });

  const modal = (
    <>
      {backdropTransition((style, show) =>
        show && (
          <animated.div
            style={style}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
        )
      )}

      {modalTransition((style, show) =>
        show && (
          <animated.div
            style={{
              opacity: style.opacity,
              transform: style.scale.to(s => `scale(${s})`),
              transformOrigin: 'top right',
            }}
            className="fixed top-4 right-4 z-50"
          >
            <div className="relative bg-card w-[calc(100vw-2rem)] max-w-sm max-h-[80vh] overflow-hidden border-y-6 border-foreground dark:border-ring flex flex-col">
              {/* Pixel borders */}
              <div
                className="absolute inset-0 border-x-6 -mx-1.5 border-foreground dark:border-ring pointer-events-none"
                aria-hidden="true"
              />

              {/* Content */}
              <div className="p-4 flex flex-col min-h-0 flex-1">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <h2 className="text-lg font-semibold retro">Settings</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 touch-manipulation active:scale-95"
                    onClick={handleClose}
                  >
                    <CloseIcon />
                  </Button>
                </div>

                {/* Simple Tab Buttons */}
                <div className="flex gap-2 mb-3 shrink-0">
                  <button
                    onClick={() => setTab('system')}
                    className={`flex-1 h-12 text-sm retro touch-manipulation transition-colors ${
                      tab === 'system'
                        ? 'bg-accent text-foreground'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    System
                  </button>
                  <button
                    onClick={() => setTab('stats')}
                    className={`flex-1 h-12 text-sm retro touch-manipulation transition-colors ${
                      tab === 'stats'
                        ? 'bg-accent text-foreground'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    Stats
                  </button>
                </div>

                {/* Tab Content */}
                <div className="h-128 overflow-y-auto overflow-x-hidden px-1 relative">
                  {tabTransition((style, currentTab) => (
                    <animated.div
                      style={{
                        ...style,
                        width: '100%',
                        top: 0,
                        left: 0,
                      }}
                    >
                      {currentTab === 'system' && <SystemTab onReboot={onReboot} loading={loading} />}
                      {currentTab === 'stats' && <StatsTab />}
                    </animated.div>
                  ))}
                </div>
              </div>
            </div>
          </animated.div>
        )
      )}
    </>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 touch-manipulation"
        onClick={() => setIsOpen(true)}
      >
        <CogIcon />
      </Button>
      {createPortal(modal, document.body)}
    </>
  );
}
