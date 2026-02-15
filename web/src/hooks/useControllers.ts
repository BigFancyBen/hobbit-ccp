import { useState, useEffect, useCallback } from 'react';
import { getCache, setCache } from '@/lib/cache';

const CACHE_KEY = 'controllers';

interface Controller {
  name: string;
}

export function useControllers(refreshInterval = 3000) {
  const cached = getCache<Controller[]>(CACHE_KEY);
  const [controllers, setControllers] = useState<Controller[]>(cached ?? []);
  const [pairing, setPairing] = useState(false);
  const [loading, setLoading] = useState(!cached);

  const fetchControllers = useCallback(async () => {
    try {
      const res = await fetch('/api/control/controllers');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setControllers(data.controllers);
      setCache(CACHE_KEY, data.controllers);
      setPairing(data.pairing);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch controllers:', err);
      setLoading(false);
    }
  }, []);

  const startPairing = useCallback(async (): Promise<string | null> => {
    setPairing(true);
    try {
      const res = await fetch('/api/control/controllers/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      const data = await res.json();
      if (data.status === 'error') {
        setPairing(false);
        return data.error || 'Pairing failed';
      }
      return null;
    } catch {
      setPairing(false);
      return 'Network error';
    }
  }, []);

  const stopPairing = useCallback(async () => {
    await fetch('/api/control/controllers/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    setPairing(false);
  }, []);

  useEffect(() => {
    fetchControllers();
    const interval = setInterval(fetchControllers, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchControllers, refreshInterval]);

  return { controllers, pairing, loading, startPairing, stopPairing };
}
