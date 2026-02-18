import { useState, useEffect, useRef } from 'react';
import { useLocation, Redirect } from 'wouter';
import { useTransition, animated } from '@react-spring/web';
import { SettingsModal } from '@/components/SettingsModal';
import { NavBar } from '@/components/NavBar';
import { LightControls } from '@/components/LightControls';
import { GamesPage } from '@/components/GameLauncher';

const API = '/api/control';

const ROUTES = ['/', '/games'] as const;

function routeIndex(location: string): number {
  if (location === '/games') return 1;
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
  const pageKey = currentIndex === 0 ? 'lights' : 'games';

  const pageTransition = useTransition(pageKey, {
    from: { opacity: 0, x: direction * 60 },
    enter: { opacity: 1, x: 0 },
    leave: { opacity: 0, x: -direction * 60, position: 'absolute' as const },
    config: { tension: 300, friction: 26 },
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
  if (location !== '/' && location !== '/lights' && location !== '/games') {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-lg mx-auto">
        {/* Header with nav and settings */}
        <header className="flex items-center gap-2 mb-6">
          <NavBar />
          <SettingsModal onReboot={handleReboot} loading={loading} />
        </header>

        {/* Page content with slide transitions */}
        <div className="relative overflow-x-hidden">
          {pageTransition((style, key) => (
            <animated.div
              style={{
                ...style,
                width: '100%',
                top: 0,
                left: 0,
              }}
            >
              {key === 'lights' && <LightControls />}
              {key === 'games' && <GamesPage />}
            </animated.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
