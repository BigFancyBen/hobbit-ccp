import { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState({ mode: 'idle', moonlightRunning: false, xRunning: false });
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

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
    } catch (e) {
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
    } catch (e) {
      setApps(['Desktop']);
    }
  };

  const launchApp = async (appName) => {
    setLoading(appName);
    try {
      const res = await fetch(`${API}/launch-moonlight?app=${encodeURIComponent(appName)}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to launch');
      }
    } catch (e) {
      setError('Failed to connect');
    }
    setLoading(null);
    setTimeout(checkStatus, 2000);
  };

  const exitGaming = async () => {
    setLoading('exit');
    try {
      await fetch(`${API}/exit-gaming`, { method: 'POST' });
    } catch (e) {
      setError('Failed to exit');
    }
    setLoading(null);
    setTimeout(checkStatus, 1000);
  };

  const systemCommand = async (cmd) => {
    if (cmd === 'shutdown' || cmd === 'reboot') {
      if (!confirm(`Really ${cmd}?`)) return;
    }
    setLoading(cmd);
    try {
      await fetch(`${API}/${cmd}`, { method: 'POST' });
    } catch (e) {
      // Expected for shutdown/reboot
    }
    setLoading(null);
  };

  return (
    <div className="app">
      <header>
        <h1>Hobbit</h1>
        {error && <div className="error">{error}</div>}
      </header>

      <section className="card gaming">
        <h2>Gaming</h2>
        <div className={`status ${status.mode}`}>
          {status.mode === 'gaming' ? 'Playing' : 'Idle'}
        </div>

        {status.mode === 'idle' ? (
          <div className="app-grid">
            {apps.map(app => (
              <button
                key={app}
                onClick={() => launchApp(app)}
                disabled={loading !== null}
                className={loading === app ? 'loading' : ''}
              >
                {app}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={exitGaming}
            className="exit"
            disabled={loading !== null}
          >
            {loading === 'exit' ? 'Stopping...' : 'Exit Gaming Mode'}
          </button>
        )}
      </section>

      <section className="card system">
        <h2>System</h2>
        <button
          onClick={() => systemCommand('reboot')}
          disabled={loading !== null}
        >
          Reboot
        </button>
      </section>
    </div>
  );
}

export default App;
