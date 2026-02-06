import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/8bit/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card';
import { SettingsModal } from '@/components/SettingsModal';

function App() {
  const [status, setStatus] = useState({ mode: 'idle', moonlightRunning: false, xRunning: false });
  const [apps, setApps] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API = '/api/control';

  useEffect(() => {
    checkStatus();
    fetchApps();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
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
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to launch');
      }
    } catch {
      setError('Failed to connect');
    }
    setLoading(null);
    setTimeout(checkStatus, 2000);
  };

  const exitGaming = async () => {
    setLoading('exit');
    try {
      await fetch(`${API}/exit-gaming`, { method: 'POST' });
    } catch {
      setError('Failed to exit');
    }
    setLoading(null);
    setTimeout(checkStatus, 1000);
  };

  const handleReboot = async () => {
    setLoading('reboot');
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
          <div className="mb-4 p-3 bg-destructive text-white text-sm retro">
            {error}
          </div>
        )}

        {/* Gaming Card */}
        <Card className="mx-2">
          <CardHeader>
            <CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">
              Gaming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Badge */}
            <div className={`inline-block px-3 py-1.5 text-xs sm:text-sm font-medium retro ${
              status.mode === 'gaming'
                ? 'bg-green-500 text-black'
                : 'bg-secondary text-muted-foreground'
            }`}>
              {status.mode === 'gaming' ? 'Playing' : 'Idle'}
            </div>

            {/* App Grid or Exit Button */}
            {status.mode === 'idle' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {apps.map(app => (
                  <Button
                    key={app}
                    onClick={() => launchApp(app)}
                    disabled={loading !== null}
                    className={`w-full text-xs sm:text-sm ${loading === app ? 'animate-pulse' : ''}`}
                  >
                    {app}
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                variant="destructive"
                className="w-full text-xs sm:text-sm"
                onClick={exitGaming}
                disabled={loading !== null}
              >
                {loading === 'exit' ? 'Stopping...' : 'Exit Gaming Mode'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
