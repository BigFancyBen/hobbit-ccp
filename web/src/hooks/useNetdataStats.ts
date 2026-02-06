import { useState, useEffect } from 'react';
import { getCache, setCache } from '@/lib/cache';

const API_BASE = '/api/control';
const CACHE_KEY = 'system-stats';

interface CpuStats {
  usage: number;
}

interface RamStats {
  used: number;
  total: number;
}

interface DiskStats {
  used: number;
  total: number;
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

const DEFAULT_STATS: Stats = {
  cpu: null,
  ram: null,
  disk: null,
  network: null,
  gpu: null,
  loading: false,
  error: null
};

export function useSystemStats(refreshInterval: number | null = 3000): Stats {
  const [stats, setStats] = useState<Stats>(() => {
    if (!refreshInterval) return DEFAULT_STATS;
    const cached = getCache<Stats>(CACHE_KEY);
    if (cached) {
      return { ...cached, loading: false, error: null };
    }
    return { ...DEFAULT_STATS, loading: true };
  });

  useEffect(() => {
    if (!refreshInterval) {
      setStats(DEFAULT_STATS);
      return;
    }

    const fetchStats = async () => {
      try {
        const [cpuRes, ramRes, diskRes, gpuRes, netRes] = await Promise.all([
          fetch(`${API_BASE}/cpu-stats`),
          fetch(`${API_BASE}/ram-stats`),
          fetch(`${API_BASE}/disk-stats`),
          fetch(`${API_BASE}/gpu-stats`),
          fetch(`${API_BASE}/net-stats`)
        ]);

        const [cpuData, ramData, diskData, gpuData, netData] = await Promise.all([
          cpuRes.ok ? cpuRes.json() : null,
          ramRes.ok ? ramRes.json() : null,
          diskRes.ok ? diskRes.json() : null,
          gpuRes.ok ? gpuRes.json() : null,
          netRes.ok ? netRes.json() : null
        ]);

        const newStats: Stats = {
          cpu: cpuData ? { usage: cpuData.usage_percent } : null,
          ram: ramData ? { used: ramData.used_gb, total: ramData.total_gb } : null,
          disk: diskData ? { used: diskData.used_gb, total: diskData.total_gb } : null,
          network: netData ? { received: netData.received_kbps, sent: netData.sent_kbps } : null,
          gpu: gpuData ? { usage: gpuData.usage_percent } : null,
          loading: false,
          error: null
        };
        setStats(newStats);
        setCache(CACHE_KEY, newStats);
      } catch {
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch stats'
        }));
      }
    };

    setStats(prev => ({ ...prev, loading: true }));
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return stats;
}

// Alias for backwards compatibility
export const useNetdataStats = useSystemStats;
