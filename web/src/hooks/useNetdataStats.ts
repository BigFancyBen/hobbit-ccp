import { useState, useEffect } from 'react';

const NETDATA_BASE = '/netdata';

interface CpuStats {
  usage: number;
}

interface RamStats {
  used: number;
  total: number;
  percentage: number;
}

interface DiskStats {
  used: number;
  total: number;
  percentage: number;
}

interface NetworkStats {
  received: number;
  sent: number;
}

interface Stats {
  cpu: CpuStats | null;
  ram: RamStats | null;
  disk: DiskStats | null;
  network: NetworkStats | null;
  loading: boolean;
  error: string | null;
}

interface NetdataResponse {
  labels: string[];
  data: number[][];
}

export function useNetdataStats(refreshInterval = 3000): Stats {
  const [stats, setStats] = useState<Stats>({
    cpu: null,
    ram: null,
    disk: null,
    network: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [cpuRes, ramRes, diskRes, netRes] = await Promise.all([
          fetch(`${NETDATA_BASE}/data?chart=system.cpu&after=-1&points=1&format=json`),
          fetch(`${NETDATA_BASE}/data?chart=system.ram&after=-1&points=1&format=json`),
          fetch(`${NETDATA_BASE}/data?chart=disk_space._&after=-1&points=1&format=json`),
          fetch(`${NETDATA_BASE}/data?chart=system.net&after=-1&points=1&format=json`)
        ]);

        const [cpuData, ramData, diskData, netData] = await Promise.all([
          cpuRes.ok ? cpuRes.json() : null,
          ramRes.ok ? ramRes.json() : null,
          diskRes.ok ? diskRes.json() : null,
          netRes.ok ? netRes.json() : null
        ]);

        setStats({
          cpu: cpuData ? parseCpuData(cpuData) : null,
          ram: ramData ? parseRamData(ramData) : null,
          disk: diskData ? parseDiskData(diskData) : null,
          network: netData ? parseNetworkData(netData) : null,
          loading: false,
          error: null
        });
      } catch {
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch stats'
        }));
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return stats;
}

function parseCpuData(data: NetdataResponse): CpuStats | null {
  if (!data.data || !data.data[0]) return null;
  const values = data.data[0].slice(1);
  const total = values.reduce((sum, val) => sum + (val || 0), 0);
  return { usage: Math.round(total) };
}

function parseRamData(data: NetdataResponse): RamStats | null {
  if (!data.data || !data.data[0]) return null;
  const labels = data.labels;
  const values = data.data[0];
  const usedIdx = labels.indexOf('used');
  const freeIdx = labels.indexOf('free');
  const cachedIdx = labels.indexOf('cached');
  const buffersIdx = labels.indexOf('buffers');

  const used = values[usedIdx] || 0;
  const free = values[freeIdx] || 0;
  const cached = values[cachedIdx] || 0;
  const buffers = values[buffersIdx] || 0;
  const total = used + free + cached + buffers;

  return {
    used: Math.round(used / 1024 / 1024),
    total: Math.round(total / 1024 / 1024),
    percentage: Math.round((used / total) * 100)
  };
}

function parseDiskData(data: NetdataResponse): DiskStats | null {
  if (!data.data || !data.data[0]) return null;
  const labels = data.labels;
  const values = data.data[0];
  const usedIdx = labels.indexOf('used');
  const availIdx = labels.indexOf('avail');

  const used = values[usedIdx] || 0;
  const avail = values[availIdx] || 0;
  const total = used + avail;

  return {
    used: Math.round(used / 1024),
    total: Math.round(total / 1024),
    percentage: Math.round((used / total) * 100)
  };
}

function parseNetworkData(data: NetdataResponse): NetworkStats | null {
  if (!data.data || !data.data[0]) return null;
  const labels = data.labels;
  const values = data.data[0];
  const receivedIdx = labels.indexOf('received');
  const sentIdx = labels.indexOf('sent');

  return {
    received: Math.round(Math.abs(values[receivedIdx] || 0) / 1024),
    sent: Math.round(Math.abs(values[sentIdx] || 0) / 1024)
  };
}
