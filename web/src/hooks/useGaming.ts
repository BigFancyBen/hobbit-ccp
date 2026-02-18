import { useState, useEffect, useCallback, useRef } from 'react';
import { getCache, setCache } from '@/lib/cache';
import { toast } from '@hobbit/ui/8bit/toast';

const STATUS_CACHE_KEY = 'gaming-status';
const APPS_CACHE_KEY = 'gaming-apps';
const API = '/api/control';

interface GamingStatus {
  mode: string;
  sunshineOnline: boolean;
}

export function useGaming() {
  const cachedStatus = getCache<GamingStatus>(STATUS_CACHE_KEY);
  const cachedApps = getCache<string[]>(APPS_CACHE_KEY);

  const [status, setStatus] = useState<GamingStatus>(
    cachedStatus ?? { mode: 'idle', sunshineOnline: false }
  );
  const [apps, setApps] = useState<string[]>(cachedApps ?? []);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(!cachedStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/status`);
      if (res.ok) {
        const data: GamingStatus = await res.json();
        setStatus(data);
        setCache(STATUS_CACHE_KEY, data);
        setError(null);
      }
    } catch (err) {
      console.error('Status check failed:', err);
      setError('Cannot connect to server');
    }
  }, []);

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch(`${API}/apps`);
      if (res.ok) {
        const data = await res.json();
        const appList = data.apps || [];
        setApps(appList);
        setCache(APPS_CACHE_KEY, appList);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
      setApps([]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([checkStatus(), fetchApps()]);
      setInitialLoading(false);
    };
    init();

    intervalRef.current = setInterval(checkStatus, 5000);

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        checkStatus();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(checkStatus, 5000);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkStatus, fetchApps]);

  const launchApp = useCallback(async (appName: string) => {
    setLoading(appName);
    try {
      const res = await fetch(`${API}/launch-moonlight?app=${encodeURIComponent(appName)}`, {
        method: 'POST',
      });
      if (res.ok) {
        toast(`${appName} launched!`);
      } else {
        const data = await res.json();
        const errorMsg = data.error || 'Failed to launch';
        setError(errorMsg);
        toast(errorMsg);
      }
    } catch (err) {
      console.error('Failed to launch app:', err);
      setError('Failed to connect');
      toast('Failed to connect');
    }
    setLoading(null);
    setTimeout(checkStatus, 2000);
  }, [checkStatus]);

  const exitGaming = useCallback(async () => {
    setLoading('exit');
    try {
      await fetch(`${API}/exit-gaming`, { method: 'POST' });
      toast('Gaming mode stopped');
    } catch (err) {
      console.error('Failed to exit gaming:', err);
      setError('Failed to exit');
      toast('Failed to exit');
    }
    setLoading(null);
    setTimeout(checkStatus, 1000);
  }, [checkStatus]);

  return { status, apps, loading, error, initialLoading, launchApp, exitGaming };
}
