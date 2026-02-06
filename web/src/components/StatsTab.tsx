import { useState } from 'react';
import { useSystemStats } from '@/hooks/useSystemStats';
import { Alert, AlertDescription } from '@/components/ui/8bit/alert';
import { Button } from '@/components/ui/8bit/button';
import { Card, CardHeader, CardContent } from '@/components/ui/8bit/card';
import { Badge } from '@/components/ui/8bit/badge';
import { Progress } from '@/components/ui/8bit/progress';
import { Skeleton } from '@/components/ui/8bit/skeleton';

function MonitorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      {/* Screen body */}
      <rect x="2" y="2" width="12" height="8" />
      {/* Screen inner (cut out for "screen" look) */}
      <rect x="3" y="3" width="10" height="6" className="fill-primary/20" />
      {/* Stand */}
      <rect x="6" y="11" width="4" height="2" />
      {/* Base */}
      <rect x="4" y="13" width="8" height="1" />
    </svg>
  );
}

function StatBar({
  label,
  value,
  detail,
  color,
  loading,
  unavailable,
}: {
  label: string;
  value: number;
  detail: string;
  color: string;
  loading: boolean;
  unavailable?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] sm:text-xs font-semibold retro tracking-wider uppercase text-muted-foreground">
          {label}
        </span>
        <span className="text-[10px] sm:text-xs retro text-muted-foreground">
          {unavailable ? 'N/A' : detail}
        </span>
      </div>
      <Progress
        value={unavailable ? 0 : value}
        className="h-3"
        progressBg={unavailable ? 'bg-muted' : color}
      />
    </div>
  );
}

export function StatsTab() {
  const [enabled, setEnabled] = useState(false);
  const { cpu, gpu, ram, disk, network, loading, error } = useSystemStats(enabled ? 3000 : null);

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Detect cold start: monitors just started, waiting for first real data
  const isWarmingUp = enabled && !loading &&
    cpu?.usage === 0 &&
    gpu?.usage === 0 &&
    (ram?.used === 0 || !ram) &&
    (disk?.used === 0 || !disk);

  const showLoading = (loading || isWarmingUp) && enabled;

  const ramPercent = ram ? (ram.used / ram.total) * 100 : 0;
  const diskPercent = disk ? (disk.used / disk.total) * 100 : 0;
  const gpuUnavailable = !gpu && !showLoading && enabled;

  return (
    <div className="py-4 mx-2">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <MonitorIcon />
              <h3 className="text-sm sm:text-base font-bold retro tracking-wider">HOBBIT</h3>
            </div>
            {enabled && (
              <Button
                variant="outline"
                className="h-7 text-[10px] px-2 touch-manipulation"
                onClick={() => setEnabled(false)}
              >
                Stop
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {!enabled ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-xs text-muted-foreground retro">~ Monitoring Paused ~</p>
              <Button
                onClick={() => setEnabled(true)}
                className="touch-manipulation text-xs"
              >
                Start Monitoring
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {isWarmingUp && (
                <p className="text-[10px] text-muted-foreground text-center animate-pulse retro">
                  Starting monitors...
                </p>
              )}

              <StatBar
                label="CPU"
                value={cpu?.usage ?? 0}
                detail={`${(cpu?.usage ?? 0).toFixed(0)}%`}
                color="bg-red-500"
                loading={showLoading}
              />

              <StatBar
                label="GPU"
                value={gpu?.usage ?? 0}
                detail={`${(gpu?.usage ?? 0).toFixed(0)}%`}
                color="bg-yellow-500"
                loading={showLoading}
                unavailable={gpuUnavailable}
              />

              <StatBar
                label="RAM"
                value={ramPercent}
                detail={ram ? `${ram.used.toFixed(1)} / ${ram.total.toFixed(1)} GB` : '0 GB'}
                color="bg-green-500"
                loading={showLoading}
              />

              <StatBar
                label="DISK"
                value={diskPercent}
                detail={disk ? `${disk.used.toFixed(0)} / ${disk.total.toFixed(0)} GB` : '0 GB'}
                color="bg-purple-500"
                loading={showLoading}
              />

              {/* Network section */}
              <div className="border-t border-border pt-3">
                {showLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-[10px] sm:text-xs font-semibold retro tracking-wider uppercase text-muted-foreground">
                      NETWORK
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Badge variant="outline" className="justify-center py-1.5 text-[10px] sm:text-xs">
                        <span className="text-green-500 mr-1">↓</span>
                        {network?.received ?? 0} kbps
                      </Badge>
                      <Badge variant="outline" className="justify-center py-1.5 text-[10px] sm:text-xs">
                        <span className="text-blue-500 mr-1">↑</span>
                        {network?.sent ?? 0} kbps
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
