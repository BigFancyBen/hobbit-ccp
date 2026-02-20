import { useState, useEffect, useRef } from 'react';
import { useLocation, Redirect } from 'wouter';
import { useTransition, animated } from '@react-spring/web';
import { SettingsModal } from '@/components/SettingsModal';
import { NavBar } from '@/components/NavBar';
import { LightControls } from '@/components/LightControls';
import { GamesPage } from '@/components/GameLauncher';
import { TunesPage } from '@/components/TunesPage';

const API = '/api/control';

const ROUTES = ['/', '/games', '/tunes'] as const;

function routeIndex(location: string): number {
  if (location === '/games') return 1;
  if (location === '/tunes') return 2;
  return 0; // '/' and '/lights' both map to index 0
}

function App() {
  const [location] = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  const prevRouteIndexRef = useRef(routeIndex(location));

  const currentIndex = routeIndex(location);
  const direction = currentIndex > prevRouteIndexRef.current ? 1 : -1;

  useEffect(() => {
    prevRouteIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Determine which page key to use (normalize / and /lights to same key)
  const pageKey = currentIndex === 0 ? 'lights' : currentIndex === 1 ? 'games' : 'tunes';

  const pageTransition = useTransition(pageKey, {
    from: { opacity: 0, x: direction * 60, position: 'relative' as const },
    enter: { opacity: 1, x: 0, position: 'relative' as const },
    leave: { opacity: 0, x: -direction * 60, position: 'absolute' as const },
    config: { tension: 300, friction: 26 },
    expires: 0,
  });

  const handleReboot = async () => {
    setLoading('reboot');
    try {
      await fetch(`${API}/reboot`, { method: 'POST' });
    } catch {
      // Expected for reboot
    }
    setLoading(null);
  };

  // Redirect unknown paths to /
  if (location !== '/' && location !== '/lights' && location !== '/games' && location !== '/tunes') {
    return <Redirect to="/" />;
  }

  return (
    <div className="h-[100dvh] flex flex-col p-2 sm:p-3 overflow-hidden">
      <div className="max-w-lg mx-auto w-full flex flex-col flex-1 min-h-0">
        {/* Header with nav and settings */}
        <header className="flex items-center gap-2 mb-3">
          <NavBar />
          <div className="ml-auto">
            <SettingsModal onReboot={handleReboot} loading={loading} />
          </div>
        </header>

        {/* Page content with slide transitions */}
        <div className="relative flex-1 min-h-0">
          {pageTransition((style, key) => (
            <animated.div
              style={{
                ...style,
                width: '100%',
                top: 0,
                left: 0,
              }}
              className={key === pageKey ? 'flex flex-col h-full' : ''}
            >
              {key === 'lights' && <LightControls />}
              {key === 'games' && <GamesPage />}
              {key === 'tunes' && <TunesPage />}
            </animated.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
