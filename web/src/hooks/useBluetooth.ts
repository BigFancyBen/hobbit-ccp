import { useState, useEffect, useCallback } from 'react';
import { getCache, setCache } from '@/lib/cache';

const CACHE_KEY = 'bluetooth-devices';

interface BluetoothDevice {
  mac: string;
  name: string;
  connected: boolean;
  trusted: boolean;
}

interface DiscoveredDevice {
  mac: string;
  name: string;
}

export function useBluetooth(refreshInterval = 3000) {
  const cachedDevices = getCache<BluetoothDevice[]>(CACHE_KEY);
  const [devices, setDevices] = useState<BluetoothDevice[]>(cachedDevices ?? []);
  const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(!cachedDevices);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/control/bluetooth/status');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDevices(data.devices);
      setCache(CACHE_KEY, data.devices);
      setScanning(data.scanning);
      setLoading(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setLoading(false);
    }
  }, []);

  const fetchDiscovered = useCallback(async () => {
    const res = await fetch('/api/control/bluetooth/discovered');
    if (res.ok) {
      const data = await res.json();
      setDiscovered(data.devices);
      setScanning(data.scanning);
    }
  }, []);

  const startScan = useCallback(async () => {
    setScanning(true);
    setDiscovered([]);
    await fetch('/api/control/bluetooth/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true })
    });
  }, []);

  const stopScan = useCallback(async () => {
    await fetch('/api/control/bluetooth/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false })
    });
    setScanning(false);
  }, []);

  const pair = useCallback(async (mac: string) => {
    const res = await fetch('/api/control/bluetooth/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac })
    });
    if (!res.ok) throw new Error('Pairing failed');
    await fetchStatus();
  }, [fetchStatus]);

  const connect = useCallback(async (mac: string) => {
    const res = await fetch('/api/control/bluetooth/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac })
    });
    if (!res.ok) throw new Error('Connection failed');
    await fetchStatus();
  }, [fetchStatus]);

  const disconnect = useCallback(async (mac: string) => {
    await fetch('/api/control/bluetooth/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac })
    });
    await fetchStatus();
  }, [fetchStatus]);

  const remove = useCallback(async (mac: string) => {
    await fetch(`/api/control/bluetooth/device/${encodeURIComponent(mac)}`, {
      method: 'DELETE'
    });
    await fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, refreshInterval]);

  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(fetchDiscovered, 1000);
    return () => clearInterval(interval);
  }, [scanning, fetchDiscovered]);

  return { devices, discovered, scanning, loading, error, startScan, stopScan, pair, connect, disconnect, remove, refresh: fetchStatus };
}
