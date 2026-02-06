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

interface GpuStats {
  usage: number;
}

interface Stats {
  cpu: CpuStats | null;
  ram: RamStats | null;
  disk: DiskStats | null;
  network: NetworkStats | null;
  gpu: GpuStats | null;
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
    gpu: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [cpuRes, ramRes, diskRes, gpuRes, netRes] = await Promise.all([
          fetch(`${NETDATA_BASE}/data?chart=system.cpu&after=-1&points=1&format=json`),
          fetch(`${NETDATA_BASE}/data?chart=system.ram&after=-1&points=1&format=json`),
          fetch(`${NETDATA_BASE}/data?chart=disk_space.%2F&after=-1&points=1&format=json`),
          fetch('/api/control/gpu-stats'),
          fetch('/api/control/net-stats')
        ]);

        const [cpuData, ramData, diskData, gpuData, netData] = await Promise.all([
          cpuRes.ok ? cpuRes.json() : null,
          ramRes.ok ? ramRes.json() : null,
          diskRes.ok ? diskRes.json() : null,
          gpuRes.ok ? gpuRes.json() : null,
          netRes.ok ? netRes.json() : null
        ]);

        setStats({
          cpu: cpuData ? parseCpuData(cpuData) : null,
          ram: ramData ? parseRamData(ramData) : null,
          disk: diskData ? parseDiskData(diskData) : null,
          network: netData ? parseNetData(netData) : null,
          gpu: gpuData ? parseGpuData(gpuData) : null,
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

  // Netdata system.ram values are in MiB
  const used = values[usedIdx] || 0;
  const free = values[freeIdx] || 0;
  const cached = values[cachedIdx] || 0;
  const buffers = values[buffersIdx] || 0;
  const total = used + free + cached + buffers;

  return {
    used: used / 1024,  // MiB to GiB
    total: total / 1024,  // MiB to GiB
    percentage: Math.round((used / total) * 100)
  };
}

function parseDiskData(data: NetdataResponse): DiskStats | null {
  if (!data.data || !data.data[0]) return null;
  const labels = data.labels;
  const values = data.data[0];
  const usedIdx = labels.indexOf('used');
  const availIdx = labels.indexOf('avail');

  // Netdata disk_space values are in GiB
  const used = values[usedIdx] || 0;
  const avail = values[availIdx] || 0;
  const total = used + avail;

  return {
    used: used,  // Already in GiB
    total: total,  // Already in GiB
    percentage: Math.round((used / total) * 100)
  };
}

interface NetBridgeResponse {
  received_kbps: number;
  sent_kbps: number;
}

function parseNetData(data: NetBridgeResponse): NetworkStats | null {
  if (data.received_kbps === undefined) return null;
  return {
    received: data.received_kbps,
    sent: data.sent_kbps
  };
}

interface GpuBridgeResponse {
  usage_percent: number;
  current_freq_mhz: number;
  max_freq_mhz: number;
}

function parseGpuData(data: GpuBridgeResponse): GpuStats | null {
  if (data.usage_percent === undefined) return null;
  return { usage: data.usage_percent };
}
