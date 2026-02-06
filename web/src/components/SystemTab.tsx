import { useState } from 'react';
import { useBluetooth } from '@/hooks/useBluetooth';
import { Button } from '@/components/ui/8bit/button';
import { Spinner } from '@/components/ui/8bit/spinner';
import { Skeleton } from '@/components/ui/8bit/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function StatusDot({ status }: { status: 'ready' | 'active' | 'synced' | 'offline' | 'scanning' }) {
  const colors: Record<string, string> = {
    ready: 'bg-muted-foreground',
    active: 'bg-yellow-500 animate-pulse',
    synced: 'bg-green-500',
    offline: 'bg-muted-foreground',
    scanning: 'bg-yellow-500 animate-pulse',
  };
  const labels: Record<string, string> = {
    ready: 'Ready',
    active: 'Saving...',
    synced: 'Synced',
    offline: 'Offline',
    scanning: 'Scanning...',
  };

  return (
    <span className="flex items-center gap-1.5 text-[10px] sm:text-xs retro text-muted-foreground">
      <span className={`inline-block size-2 rounded-full ${colors[status]}`} />
      {labels[status]}
    </span>
  );
}

function Slot({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div
      className={`relative border-y-4 border-x-4 -mx-0.5 px-3 py-2.5 ${
        empty
          ? 'border-dashed border-muted-foreground/30'
          : 'border-foreground dark:border-ring'
      }`}
    >
      {children}
    </div>
  );
}

function GhostSlot({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative border-y-4 border-x-4 -mx-0.5 px-3 py-2.5 border-dashed border-primary/40 bg-primary/5">
      {children}
    </div>
  );
}

interface SystemTabProps {
  onReboot: () => void;
  loading: string | null;
}

export function SystemTab({ onReboot, loading }: SystemTabProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const {
    devices, discovered, scanning, loading: btLoading,
    startScan, stopScan, pair, connect, disconnect, remove,
  } = useBluetooth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const handleAction = async (mac: string, action: () => Promise<void>) => {
    setActionLoading(mac);
    try { await action(); } finally { setActionLoading(null); }
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onReboot();
  };

  const newDevices = discovered.filter(d => !devices.some(p => p.mac === d.mac));
  const isRebooting = loading === 'reboot';
  let slotNum = 1;

  return (
    <div className="py-4 mx-2 space-y-2">
      <h4 className="text-[10px] sm:text-xs font-semibold retro tracking-widest uppercase text-muted-foreground mb-3">
        Save Slots
      </h4>

      {/* SLOT 01 — System Reboot */}
      <Slot>
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs retro text-muted-foreground tracking-wider">
            SLOT {String(slotNum++).padStart(2, '0')}
          </span>
          <StatusDot status={isRebooting ? 'active' : 'ready'} />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs sm:text-sm retro font-semibold">System Reboot</span>
          <Button
            variant="destructive"
            className="h-7 text-[10px] px-2 touch-manipulation"
            onClick={() => setConfirmOpen(true)}
            disabled={isRebooting}
          >
            {isRebooting ? <Spinner className="size-3" /> : 'Reboot'}
          </Button>
        </div>
      </Slot>

      {/* Device slots (loading skeleton) */}
      {btLoading && (
        <>
          <Slot>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center justify-between mt-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-12" />
            </div>
          </Slot>
        </>
      )}

      {/* SLOT 02+ — Paired bluetooth devices */}
      {!btLoading && devices.map(device => {
        const num = slotNum++;
        return (
          <Slot key={device.mac}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs retro text-muted-foreground tracking-wider">
                SLOT {String(num).padStart(2, '0')}
              </span>
              <StatusDot status={device.connected ? 'synced' : 'offline'} />
            </div>
            <div className="flex items-center justify-between mt-1 gap-2">
              <span className="text-xs sm:text-sm retro font-semibold truncate">
                {device.name}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="secondary"
                  className="h-7 text-[10px] px-2 touch-manipulation"
                  disabled={actionLoading === device.mac}
                  onClick={() => handleAction(device.mac, () =>
                    device.connected ? disconnect(device.mac) : connect(device.mac)
                  )}
                >
                  {actionLoading === device.mac ? (
                    <Spinner className="size-3" />
                  ) : device.connected ? 'Off' : 'On'}
                </Button>
                <Button
                  variant="destructive"
                  className="h-7 text-[10px] px-2 touch-manipulation"
                  onClick={() => setRemoveTarget(device.mac)}
                >
                  X
                </Button>
              </div>
            </div>
          </Slot>
        );
      })}

      {/* Empty slot — Scan for new devices */}
      {!btLoading && (
        scanning ? (
          <Slot>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs retro text-muted-foreground tracking-wider">
                SLOT {String(slotNum).padStart(2, '0')}
              </span>
              <StatusDot status="scanning" />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs sm:text-sm retro text-muted-foreground">
                <Spinner className="size-3 inline mr-1.5" />
                Searching...
              </span>
              <Button
                variant="secondary"
                className="h-7 text-[10px] px-2 touch-manipulation"
                onClick={() => stopScan()}
              >
                Stop
              </Button>
            </div>
          </Slot>
        ) : (
          <Slot empty>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs retro text-muted-foreground/50 tracking-wider">
                SLOT {String(slotNum).padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs sm:text-sm retro text-muted-foreground/50">
                - EMPTY -
              </span>
              <Button
                variant="outline"
                className="h-7 text-[10px] px-2 touch-manipulation"
                onClick={() => startScan()}
              >
                Scan
              </Button>
            </div>
          </Slot>
        )
      )}

      {/* Discovered devices — ghost slots */}
      {scanning && newDevices.map(device => (
        <GhostSlot key={device.mac}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs retro text-primary/60 tracking-wider">
              NEW
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 gap-2">
            <span className="text-xs sm:text-sm retro truncate text-primary/80">
              {device.name}
            </span>
            <Button
              className="h-7 text-[10px] px-2 touch-manipulation shrink-0"
              disabled={actionLoading === device.mac}
              onClick={() => handleAction(device.mac, () => pair(device.mac))}
            >
              {actionLoading === device.mac ? <Spinner className="size-3" /> : 'Pair'}
            </Button>
          </div>
        </GhostSlot>
      ))}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        title="Reboot?"
        description="This will restart the system."
        confirmText="Reboot"
        cancelText="Cancel"
        variant="destructive"
      />

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
