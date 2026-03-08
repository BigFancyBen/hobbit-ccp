import { useState, useEffect, useRef } from 'react';
import { getCache, setCache } from '@/lib/cache';

const API_BASE = '/api/control';
const CACHE_KEY = 'controllers';

export interface Controller {
  serial: string;
  color: string | null;
  label: string | null;
  connected: boolean;
  playerIndex: number | null;
}

interface ControllerState {
  dongleConnected: boolean;
  controllers: Controller[];
  pairing: boolean;
}

interface UseControllersResult extends ControllerState {
  loading: boolean;
}

const DEFAULT: ControllerState = { dongleConnected: false, controllers: [], pairing: false };

export function useControllers(): UseControllersResult {
  const [data, setData] = useState<ControllerState>(() => getCache<ControllerState>(CACHE_KEY) ?? DEFAULT);
  const [loading, setLoading] = useState(() => !getCache(CACHE_KEY));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchControllers = async () => {
      try {
        const res = await fetch(`${API_BASE}/controllers`);
        if (res.ok) {
          const json: ControllerState = await res.json();
          setData(json);
          setCache(CACHE_KEY, json);
          setLoading(false);
        }
      } catch {
        // keep stale data on error
      }
    };

    function start() {
      fetchControllers();
      intervalRef.current = setInterval(fetchControllers, 5000);
    }

    function stop() {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }

    function onVisibility() {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    }

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return { ...data, loading };
}
