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
  color_hex: string | null;
  color_temp: number | null;
  supports: DeviceSupports;
  timer: { endsAt: number } | null;
}

interface LightsData {
  connected: boolean;
  capabilities: GroupCapabilities;
  group: { name: string; state: string; brightness: number; color_hex: string | null; color_temp: number | null };
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
  const [data, setData] = useState<LightsData | null>(
    cached ? { ...cached, connected: true } : null
  );
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
    } catch (err) {
      console.error('Failed to fetch lights:', err);
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
      devices: prev.devices.map(d => ({
        ...d,
        state: newState,
        ...(newState === 'OFF' ? { timer: null } : {}),
      })),
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
          d.id === id ? { ...d, state: newState, ...(newState === 'OFF' ? { timer: null } : {}) } : d
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
    // Optimistic update — only update brightness for devices that are ON
    setData(prev => prev ? {
      ...prev,
      group: { ...prev.group, brightness: zigbee },
      devices: prev.devices.map(d =>
        d.state === 'ON' ? { ...d, brightness: zigbee } : d
      ),
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
    const prevData = data;
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => prev ? {
      ...prev,
      group: { ...prev.group, color_hex: hex, color_temp: null },
      devices: prev.devices.map(d => ({ ...d, color_hex: hex, color_temp: null })),
    } : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/group/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: { hex } }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); }
    } catch {
      ignoreUntil.current = 0; setData(prevData);
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setGroupColorTemp = useCallback(async (mireds: number) => {
    const prevData = data;
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => prev ? {
      ...prev,
      group: { ...prev.group, color_hex: null, color_temp: mireds },
      devices: prev.devices.map(d => ({ ...d, color_hex: null, color_temp: mireds })),
    } : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/group/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color_temp: mireds }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); }
    } catch {
      ignoreUntil.current = 0; setData(prevData);
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setLightColor = useCallback(async (id: string, hex: string) => {
    const prevData = data;
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => prev ? {
      ...prev,
      devices: prev.devices.map(d =>
        d.id === id ? { ...d, color_hex: hex, color_temp: null } : d
      ),
    } : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/${encodeURIComponent(id)}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: { hex } }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); }
    } catch {
      ignoreUntil.current = 0; setData(prevData);
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setLightColorTemp = useCallback(async (id: string, mireds: number) => {
    const prevData = data;
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => prev ? {
      ...prev,
      devices: prev.devices.map(d =>
        d.id === id ? { ...d, color_hex: null, color_temp: mireds } : d
      ),
    } : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/${encodeURIComponent(id)}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color_temp: mireds }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); }
    } catch {
      ignoreUntil.current = 0; setData(prevData);
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setTimer = useCallback(async (id: string, minutes: number) => {
    const prevData = data;
    ignoreUntil.current = Date.now() + 3000;
    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        devices: prev.devices.map(d =>
          d.id === id ? {
            ...d,
            ...(minutes > 0
              ? { state: 'ON', timer: { endsAt: Date.now() + minutes * 60000 } }
              : { timer: null }),
          } : d
        ),
      };
    });
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/${encodeURIComponent(id)}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: minutes }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); }
    } catch {
      ignoreUntil.current = 0; setData(prevData);
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const cancelTimer = useCallback(async (id: string) => {
    return setTimer(id, 0);
  }, [setTimer]);

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
    setLightColor,
    setLightColorTemp,
    setTimer,
    cancelTimer,
  };
}
