import { useNetdataStats } from '@/hooks/useNetdataStats';
import { Alert, AlertDescription } from '@/components/ui/8bit/alert';
import { CpuBar, GpuBar, RamBar, DiskBar, NetworkBadges } from '@/components/Stats';

export function StatsTab() {
  const { cpu, gpu, ram, disk, network, loading, error } = useNetdataStats(3000);

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Detect cold start: monitors just started, waiting for first real data
  const isWarmingUp = !loading &&
    cpu?.usage === 0 &&
    gpu?.usage === 0 &&
    (ram?.used === 0 || !ram) &&
    (disk?.used === 0 || !disk);

  const showLoading = loading || isWarmingUp;

  return (
    <div className="space-y-6 py-4 mx-2">
      {isWarmingUp && (
        <p className="text-xs text-muted-foreground text-center animate-pulse">
          Starting monitors...
        </p>
      )}
      <CpuBar usage={cpu?.usage} loading={showLoading} />
      <GpuBar usage={gpu?.usage} loading={showLoading} />
      <RamBar used={ram?.used} total={ram?.total} loading={showLoading} />
      <DiskBar used={disk?.used} total={disk?.total} loading={showLoading} />
      <NetworkBadges received={network?.received} sent={network?.sent} loading={showLoading} />
    </div>
  );
}
