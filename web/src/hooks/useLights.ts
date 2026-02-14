import { useState, useEffect, useCallback, useRef } from 'react';
import { getCache, setCache } from '@/lib/cache';

const CACHE_KEY = 'lights';
const API = '/api/control';

interface DeviceSupports {
  color: boolean;
  color_temp: boolean;
  color_temp_min: number;
  color_temp_max: number;
}

export interface GroupCapabilities {
  color: boolean;
  color_temp: boolean;
  color_temp_min: number;
  color_temp_max: number;
}

interface LightDevice {
  id: string;
  name: string;
  state: string;
  brightness: number;
  color: { x: number; y: number } | null;
  color_temp: number | null;
  supports: DeviceSupports;
}

interface LightsData {
  connected: boolean;
  capabilities: GroupCapabilities;
  group: { name: string; state: string; brightness: number; color: { x: number; y: number } | null; color_temp: number | null };
  devices: LightDevice[];
}

// Quadratic curve so the slider spends more range on dim values
// where perceived brightness changes the most.
function toPercent(zigbee: number) {
  return Math.round(Math.sqrt(zigbee / 254) * 100);
}

function toZigbee(percent: number) {
  return Math.round((percent / 100) ** 2 * 254);
}

export function useLights(refreshInterval = 5000) {
  const cached = getCache<LightsData>(CACHE_KEY);
  const [data, setData] = useState<LightsData | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // After a user action, ignore poll results briefly so optimistic state isn't overwritten
  const ignoreUntil = useRef(0);
  const [acting, setActing] = useState(false);
  const inflight = useRef(0);

  const fetchLights = useCallback(async () => {
    try {
      const res = await fetch(`${API}/lights`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result: LightsData = await res.json();
      if (Date.now() < ignoreUntil.current) return;
      setData(result);
      setCache(CACHE_KEY, result);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLights();
    intervalRef.current = setInterval(fetchLights, refreshInterval);

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchLights();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(fetchLights, refreshInterval);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchLights, refreshInterval]);

  const toggleGroup = useCallback(async () => {
    if (!data) return;
    const prevData = data;
    const newState = data.group.state === 'ON' ? 'OFF' : 'ON';
    ignoreUntil.current = Date.now() + 3000;
    // Optimistic update — also flip every individual device
    setData(prev => prev ? {
      ...prev,
      group: { ...prev.group, state: newState },
      devices: prev.devices.map(d => ({ ...d, state: newState })),
    } : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/group/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); }
    } catch {
      ignoreUntil.current = 0; setData(prevData);
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const toggleLight = useCallback(async (id: string) => {
    if (!data) return;
    const prevData = data;
    const device = data.devices.find(d => d.id === id);
    if (!device) return;
    const newState = device.state === 'ON' ? 'OFF' : 'ON';
    ignoreUntil.current = Date.now() + 3000;
    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        devices: prev.devices.map(d =>
          d.id === id ? { ...d, state: newState } : d
        ),
      };
    });
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/${encodeURIComponent(id)}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); }
    } catch {
      ignoreUntil.current = 0; setData(prevData);
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setGroupBrightness = useCallback(async (percent: number) => {
    const prevData = data;
    const zigbee = toZigbee(percent);
    ignoreUntil.current = Date.now() + 3000;
    // Optimistic update — brightness only, don't toggle state
    setData(prev => prev ? {
      ...prev,
      group: { ...prev.group, brightness: zigbee },
      devices: prev.devices.map(d => ({ ...d, brightness: zigbee })),
    } : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/group/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brightness: zigbee }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); }
    } catch {
      ignoreUntil.current = 0; setData(prevData);
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setGroupColor = useCallback(async (hex: string) => {
    ignoreUntil.current = Date.now() + 3000;
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/group/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: { hex } }),
      });
      if (!res.ok) ignoreUntil.current = 0;
    } catch {
      ignoreUntil.current = 0;
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, []);

  const setGroupColorTemp = useCallback(async (mireds: number) => {
    ignoreUntil.current = Date.now() + 3000;
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/group/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color_temp: mireds }),
      });
      if (!res.ok) ignoreUntil.current = 0;
    } catch {
      ignoreUntil.current = 0;
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, []);

  return {
    connected: data?.connected ?? false,
    reconnecting: !loading && data !== null && !data.connected,
    capabilities: data?.capabilities ?? { color: false, color_temp: false, color_temp_min: 150, color_temp_max: 500 },
    group: data?.group ? {
      ...data.group,
      brightnessPercent: toPercent(data.group.brightness),
    } : null,
    devices: (data?.devices ?? []).map(d => ({
      ...d,
      brightnessPercent: toPercent(d.brightness),
    })),
    loading,
    acting,
    toggleGroup,
    toggleLight,
    setGroupBrightness,
    setGroupColor,
    setGroupColorTemp,
  };
}
