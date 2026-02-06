import { useState } from 'react';
import { useBluetooth } from '@/hooks/useBluetooth';
import { Button } from '@/components/ui/8bit/button';
import { Badge } from '@/components/ui/8bit/badge';
import { Spinner } from '@/components/ui/8bit/spinner';
import { Skeleton } from '@/components/ui/8bit/skeleton';
import { Alert, AlertDescription } from '@/components/ui/8bit/alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function BluetoothSection() {
  const { devices, discovered, scanning, loading, error, startScan, stopScan, pair, connect, disconnect, remove } = useBluetooth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const handleAction = async (mac: string, action: () => Promise<void>) => {
    setActionLoading(mac);
    try { await action(); } finally { setActionLoading(null); }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Filter discovered to exclude already-paired devices
  const newDevices = discovered.filter(d => !devices.some(p => p.mac === d.mac));

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      {/* Header row - matches Stats component pattern */}
      <div className="flex justify-between items-center">
        <h4 className="text-xs sm:text-sm font-semibold retro">Controllers</h4>
        <Button
          variant={scanning ? 'secondary' : 'default'}
          className="h-8 text-xs px-3"
          onClick={() => scanning ? stopScan() : startScan()}
        >
          {scanning ? <><Spinner className="size-3 mr-1" /> Stop</> : 'Scan'}
        </Button>
      </div>

      {/* Paired Devices */}
      {devices.length === 0 && !scanning && (
        <Badge variant="outline" className="w-full justify-center py-3 text-xs">
          No controllers paired
        </Badge>
      )}

      {devices.map(device => (
        <div key={device.mac} className="flex items-center gap-2">
          <Badge
            variant={device.connected ? 'default' : 'secondary'}
            className="flex-1 justify-between py-2 text-xs"
          >
            <span className="truncate">{device.name}</span>
            <span className="shrink-0 ml-2 opacity-70">{device.connected ? 'ON' : 'OFF'}</span>
          </Badge>
          <Button
            variant="secondary"
            className="h-8 text-xs px-2 shrink-0"
            disabled={actionLoading === device.mac}
            onClick={() => handleAction(device.mac, () =>
              device.connected ? disconnect(device.mac) : connect(device.mac)
            )}
          >
            {actionLoading === device.mac ? (
              <Spinner className="size-3" />
            ) : device.connected ? (
              'Off'
            ) : (
              'On'
            )}
          </Button>
          <Button
            variant="destructive"
            className="h-8 text-xs px-2 shrink-0"
            onClick={() => setRemoveTarget(device.mac)}
          >
            X
          </Button>
        </div>
      ))}

      {/* Scanning indicator */}
      {scanning && newDevices.length === 0 && (
        <Badge variant="outline" className="w-full justify-center py-3 text-xs">
          <Spinner className="size-3 mr-2" />
          Searching...
        </Badge>
      )}

      {/* Discovered Devices */}
      {scanning && newDevices.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground retro">Found</span>
          {newDevices.map(device => (
            <div key={device.mac} className="flex items-center gap-2">
              <Badge variant="outline" className="flex-1 py-2 text-xs">
                <span className="truncate">{device.name}</span>
              </Badge>
              <Button
                className="h-8 text-xs px-3 shrink-0"
                disabled={actionLoading === device.mac}
                onClick={() => handleAction(device.mac, () => pair(device.mac))}
              >
                {actionLoading === device.mac ? <Spinner className="size-3" /> : 'Pair'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        onConfirm={async () => {
          if (removeTarget) await remove(removeTarget);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
        title="Remove Controller"
        description="Unpair this controller?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
