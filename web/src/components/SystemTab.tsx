import { useState } from 'react';
import { useControllers } from '@/hooks/useControllers';
import { Button } from '@hobbit/ui/8bit/button';
import { Spinner } from '@hobbit/ui/8bit/spinner';
import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function StatusDot({ status }: { status: 'ready' | 'active' | 'synced' | 'pairing' }) {
  const colors: Record<string, string> = {
    ready: 'bg-muted-foreground',
    active: 'bg-yellow-500 animate-pulse',
    synced: 'bg-green-500',
    pairing: 'bg-yellow-500 animate-pulse',
  };
  const labels: Record<string, string> = {
    ready: 'Ready',
    active: 'Saving...',
    synced: 'Connected',
    pairing: 'Pairing...',
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

interface SystemTabProps {
  onReboot: () => void;
  loading: string | null;
}

export function SystemTab({ onReboot, loading }: SystemTabProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const { controllers, pairing, loading: controllersLoading, startPairing, stopPairing } = useControllers();

  const handleConfirm = () => {
    setConfirmOpen(false);
    onReboot();
  };

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

      {/* Controller slots (loading skeleton) */}
      {controllersLoading && (
        <Slot>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center justify-between mt-1">
            <Skeleton className="h-4 w-28" />
          </div>
        </Slot>
      )}

      {/* SLOT 02+ — Connected controllers (read-only) */}
      {!controllersLoading && controllers.map(controller => {
        const num = slotNum++;
        return (
          <Slot key={controller.name}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs retro text-muted-foreground tracking-wider">
                SLOT {String(num).padStart(2, '0')}
              </span>
              <StatusDot status="synced" />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs sm:text-sm retro font-semibold truncate">
                {controller.name}
              </span>
            </div>
          </Slot>
        );
      })}

      {/* Empty slot — pair new controller */}
      {!controllersLoading && (
        pairing ? (
          <Slot>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs retro text-muted-foreground tracking-wider">
                SLOT {String(slotNum).padStart(2, '0')}
              </span>
              <StatusDot status="pairing" />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs sm:text-sm retro text-muted-foreground">
                <Spinner className="size-3 inline mr-1.5" />
                Press sync on controller
              </span>
              <Button
                variant="secondary"
                className="h-7 text-[10px] px-2 touch-manipulation"
                onClick={() => stopPairing()}
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
              <span className={`text-xs sm:text-sm retro ${pairError ? 'text-destructive' : 'text-muted-foreground/50'}`}>
                {pairError || '- EMPTY -'}
              </span>
              <Button
                variant="outline"
                className="h-7 text-[10px] px-2 touch-manipulation"
                onClick={async () => {
                  setPairError(null);
                  const err = await startPairing();
                  if (err) {
                    setPairError(err);
                    setTimeout(() => setPairError(null), 5000);
                  }
                }}
              >
                Pair
              </Button>
            </div>
          </Slot>
        )
      )}

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
    </div>
  );
}
