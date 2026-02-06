import { useNetdataStats } from '@/hooks/useNetdataStats';
import { Alert, AlertDescription } from '@/components/ui/8bit/alert';
import { CpuBar, RamBar, DiskBar, NetworkBadges } from '@/components/Stats';

export function StatsTab() {
  const { cpu, ram, disk, network, loading, error } = useNetdataStats(3000);

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 py-4 mx-2">
      <CpuBar usage={cpu?.usage} loading={loading} />
      <RamBar used={ram?.used} total={ram?.total} loading={loading} />
      <DiskBar used={disk?.used} total={disk?.total} loading={loading} />
      <NetworkBadges received={network?.received} sent={network?.sent} loading={loading} />
    </div>
  );
}
