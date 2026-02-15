import { useState } from 'react';
import { Button } from '@hobbit/ui/8bit/button';
import { Spinner } from '@hobbit/ui/8bit/spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function StatusDot({ status }: { status: 'ready' | 'active' }) {
  const colors: Record<string, string> = {
    ready: 'bg-muted-foreground',
    active: 'bg-yellow-500 animate-pulse',
  };
  const labels: Record<string, string> = {
    ready: 'Ready',
    active: 'Saving...',
  };

  return (
    <span className="flex items-center gap-1.5 text-[10px] sm:text-xs retro text-muted-foreground">
      <span className={`inline-block size-2 rounded-full ${colors[status]}`} />
      {labels[status]}
    </span>
  );
}

function Slot({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative border-y-4 border-x-4 -mx-0.5 px-3 py-2.5 border-foreground dark:border-ring">
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

  const handleConfirm = () => {
    setConfirmOpen(false);
    onReboot();
  };

  const isRebooting = loading === 'reboot';

  return (
    <div className="py-4 mx-2 space-y-2">
      <h4 className="text-[10px] sm:text-xs font-semibold retro tracking-widest uppercase text-muted-foreground mb-3">
        Save Slots
      </h4>

      {/* SLOT 01 — System Reboot */}
      <Slot>
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs retro text-muted-foreground tracking-wider">
            SLOT 01
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
