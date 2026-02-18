import { useState, useEffect } from 'react';
import { getCache, setCache } from '@/lib/cache';

const API_BASE = '/api/control';
const CACHE_KEY = 'controllers';

export interface Controller {
  serial: string;
  color: string | null;
  label: string | null;
  connected: boolean;
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

    fetchControllers();
    const interval = setInterval(fetchControllers, 5000);
    return () => clearInterval(interval);
  }, []);

  return { ...data, loading };
}
