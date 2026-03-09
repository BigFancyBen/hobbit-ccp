import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@hobbit/ui/8bit/toast';
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

export interface LightDevice {
  id: string;
  name: string;
  state: string;
  brightness: number;
  color_hex: string | null;
  color_temp: number | null;
  supports: DeviceSupports;
  timer: { endsAt: number } | null;
}

export interface LightGroup {
  name: string;
  capabilities: GroupCapabilities;
  state: string;
  brightness: number;
  color_hex: string | null;
  color_temp: number | null;
  devices: LightDevice[];
}

interface LightsData {
  connected: boolean;
  groups: LightGroup[];
  ungrouped: LightDevice[];
}

// Quadratic curve so the slider spends more range on dim values
// where perceived brightness changes the most.
function toPercent(zigbee: number) {
  return Math.round(Math.sqrt(zigbee / 254) * 100);
}

function toZigbee(percent: number) {
  return Math.round((percent / 100) ** 2 * 254);
}

// Helper to update a specific group within data
function updateGroup(prev: LightsData, groupName: string, fn: (g: LightGroup) => LightGroup): LightsData {
  return {
    ...prev,
    groups: prev.groups.map(g => g.name === groupName ? fn(g) : g),
  };
}

// Helper to update a device across all groups and ungrouped
function updateDevice(prev: LightsData, id: string, fn: (d: LightDevice) => LightDevice): LightsData {
  return {
    ...prev,
    groups: prev.groups.map(g => ({
      ...g,
      devices: g.devices.map(d => d.id === id ? fn(d) : d),
    })),
    ungrouped: prev.ungrouped.map(d => d.id === id ? fn(d) : d),
  };
}

export function useLights(refreshInterval = 5000) {
  const cached = getCache<LightsData>(CACHE_KEY);
  const [data, setData] = useState<LightsData | null>(
    cached ?? null
  );
  const [loading, setLoading] = useState(!cached);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
        ignoreUntil.current = 0;
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

  const toggleGroup = useCallback(async (groupName: string) => {
    if (!data) return;
    const prevData = data;
    const group = data.groups.find(g => g.name === groupName);
    if (!group) return;
    const newState = group.state === 'ON' ? 'OFF' : 'ON';
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => prev ? updateGroup(prev, groupName, g => ({
      ...g,
      state: newState,
      devices: g.devices.map(d => ({
        ...d,
        state: newState,
        ...(newState === 'OFF' ? { timer: null } : {}),
      })),
    })) : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/group/${encodeURIComponent(groupName)}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again'); }
    } catch {
      ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again');
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const toggleLight = useCallback(async (id: string) => {
    if (!data) return;
    const prevData = data;
    // Search across all groups and ungrouped
    const allDevices = [...data.groups.flatMap(g => g.devices), ...data.ungrouped];
    const device = allDevices.find(d => d.id === id);
    if (!device) return;
    const newState = device.state === 'ON' ? 'OFF' : 'ON';
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => {
      if (!prev) return prev;
      return updateDevice(prev, id, d => ({
        ...d,
        state: newState,
        ...(newState === 'OFF' ? { timer: null } : {}),
      }));
    });
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/${encodeURIComponent(id)}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again'); }
    } catch {
      ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again');
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setGroupBrightness = useCallback(async (groupName: string, percent: number) => {
    const prevData = data;
    const zigbee = toZigbee(percent);
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => prev ? updateGroup(prev, groupName, g => ({
      ...g,
      brightness: zigbee,
      devices: g.devices.map(d =>
        d.state === 'ON' ? { ...d, brightness: zigbee } : d
      ),
    })) : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/group/${encodeURIComponent(groupName)}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brightness: zigbee }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again'); }
    } catch {
      ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again');
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setGroupColor = useCallback(async (groupName: string, hex: string) => {
    const prevData = data;
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => prev ? updateGroup(prev, groupName, g => ({
      ...g,
      color_hex: hex,
      color_temp: null,
      brightness: 254,
      devices: g.devices.map(d => ({ ...d, color_hex: hex, color_temp: null, brightness: 254 })),
    })) : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/group/${encodeURIComponent(groupName)}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: { hex }, brightness: 254 }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again'); }
    } catch {
      ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again');
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setGroupColorTemp = useCallback(async (groupName: string, mireds: number) => {
    const prevData = data;
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => prev ? updateGroup(prev, groupName, g => ({
      ...g,
      color_hex: null,
      color_temp: mireds,
      brightness: 3,
      devices: g.devices.map(d => ({ ...d, color_hex: null, color_temp: mireds, brightness: 3 })),
    })) : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/group/${encodeURIComponent(groupName)}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color_temp: mireds, brightness: 3 }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again'); }
    } catch {
      ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again');
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setLightColor = useCallback(async (id: string, hex: string) => {
    const prevData = data;
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => prev ? updateDevice(prev, id, d => ({
      ...d, color_hex: hex, color_temp: null, brightness: 254,
    })) : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/${encodeURIComponent(id)}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: { hex }, brightness: 254 }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again'); }
    } catch {
      ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again');
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setLightColorTemp = useCallback(async (id: string, mireds: number) => {
    const prevData = data;
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => prev ? updateDevice(prev, id, d => ({
      ...d, color_hex: null, color_temp: mireds, brightness: 3,
    })) : prev);
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/${encodeURIComponent(id)}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color_temp: mireds, brightness: 3 }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again'); }
    } catch {
      ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again');
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const setTimer = useCallback(async (id: string, minutes: number) => {
    const prevData = data;
    ignoreUntil.current = Date.now() + 3000;
    setData(prev => {
      if (!prev) return prev;
      return updateDevice(prev, id, d => ({
        ...d,
        ...(minutes > 0
          ? { state: 'ON', timer: { endsAt: Date.now() + minutes * 60000 } }
          : { timer: null }),
      }));
    });
    inflight.current++; setActing(true);
    try {
      const res = await fetch(`${API}/lights/${encodeURIComponent(id)}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: minutes }),
      });
      if (!res.ok) { ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again'); }
    } catch {
      ignoreUntil.current = 0; setData(prevData); toast('Zigbee unavailable — try again');
    } finally {
      if (--inflight.current === 0) setActing(false);
    }
  }, [data]);

  const cancelTimer = useCallback(async (id: string) => {
    return setTimer(id, 0);
  }, [setTimer]);

  // Compute brightnessPercent for all groups and devices
  const groups = (data?.groups ?? []).map(g => ({
    ...g,
    brightnessPercent: toPercent(g.brightness),
    devices: g.devices.map(d => ({
      ...d,
      brightnessPercent: toPercent(d.brightness),
    })),
  }));

  const ungrouped = (data?.ungrouped ?? []).map(d => ({
    ...d,
    brightnessPercent: toPercent(d.brightness),
  }));

  return {
    connected: data?.connected ?? false,
    reconnecting: !loading && data !== null && !data.connected,
    groups,
    ungrouped,
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
    refetch: fetchLights,
  };
}
