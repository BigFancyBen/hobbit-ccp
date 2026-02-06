import { useState } from 'react';
import { useSystemStats } from '@/hooks/useNetdataStats';
import { Alert, AlertDescription } from '@/components/ui/8bit/alert';
import { Button } from '@/components/ui/8bit/button';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/8bit/empty';
import { CpuBar, GpuBar, RamBar, DiskBar, NetworkBadges } from '@/components/Stats';

function ChartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

export function StatsTab() {
  const [enabled, setEnabled] = useState(false);
  const { cpu, gpu, ram, disk, network, loading, error } = useSystemStats(enabled ? 3000 : null);

  if (!enabled) {
    return (
      <Empty className="py-8 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartIcon />
          </EmptyMedia>
          <EmptyTitle>Monitoring Paused</EmptyTitle>
          <EmptyDescription>
            System monitoring is disabled to save resources
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            onClick={() => setEnabled(true)}
            className="touch-manipulation"
          >
            Start Monitoring
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

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
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <NetworkBadges received={network?.received} sent={network?.sent} loading={showLoading} />
        </div>
        <Button
          onClick={() => setEnabled(false)}
          className="flex-1 h-10 touch-manipulation text-xs"
        >
          Stop
        </Button>
      </div>
    </div>
  );
}
