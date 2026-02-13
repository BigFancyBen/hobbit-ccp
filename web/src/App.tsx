import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@hobbit/ui/8bit/alert';
import { SettingsModal } from '@/components/SettingsModal';
import { GameLauncher } from '@/components/GameLauncher';
import { LightControls } from '@/components/LightControls';
import { toast } from '@hobbit/ui/8bit/toast';

function App() {
  const [status, setStatus] = useState({ mode: 'idle', sunshineOnline: false });
  const [apps, setApps] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const API = '/api/control';

  useEffect(() => {
    const init = async () => {
      await Promise.all([checkStatus(), fetchApps()]);
      setInitialLoading(false);
    };
    init();

    // Only poll when tab is visible
    let interval: ReturnType<typeof setInterval> | null = setInterval(checkStatus, 5000);

    const handleVisibility = () => {
      if (document.hidden) {
        if (interval) { clearInterval(interval); interval = null; }
      } else {
        checkStatus(); // Immediate check on refocus
        if (!interval) interval = setInterval(checkStatus, 5000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API}/status`);
      if (res.ok) {
        setStatus(await res.json());
        setError(null);
      }
    } catch {
      setError('Cannot connect to server');
    }
  };

  const fetchApps = async () => {
    try {
      const res = await fetch(`${API}/apps`);
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps || ['Desktop']);
      }
    } catch {
      setApps(['Desktop']);
    }
  };

  const launchApp = async (appName: string) => {
    setLoading(appName);
    try {
      const res = await fetch(`${API}/launch-moonlight?app=${encodeURIComponent(appName)}`, {
        method: 'POST'
      });
      if (res.ok) {
        toast(`${appName} launched!`);
      } else {
        const data = await res.json();
        const errorMsg = data.error || 'Failed to launch';
        setError(errorMsg);
        toast(errorMsg);
      }
    } catch {
      setError('Failed to connect');
      toast('Failed to connect');
    }
    setLoading(null);
    setTimeout(checkStatus, 2000);
  };

  const exitGaming = async () => {
    setLoading('exit');
    try {
      await fetch(`${API}/exit-gaming`, { method: 'POST' });
      toast('Gaming mode stopped');
    } catch {
      setError('Failed to exit');
      toast('Failed to exit');
    }
    setLoading(null);
    setTimeout(checkStatus, 1000);
  };

  const handleReboot = async () => {
    setLoading('reboot');
    toast('Rebooting system...');
    try {
      await fetch(`${API}/reboot`, { method: 'POST' });
    } catch {
      // Expected for reboot
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-lg mx-auto">
        {/* Header with settings */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-bold retro">Hobbit</h1>
          <SettingsModal onReboot={handleReboot} loading={loading} />
        </header>

        {/* Error display */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Light Controls */}
        <LightControls />

        {/* Game Launcher */}
        <div className="mt-4">
          <GameLauncher
            status={status}
            apps={apps}
            loading={loading}
            initialLoading={initialLoading}
            offline={!status.sunshineOnline}
            onLaunchApp={launchApp}
            onExitGaming={exitGaming}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
