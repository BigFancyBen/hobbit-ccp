import { useState } from 'react';
import { Button } from '@hobbit/ui/8bit/button';
import { Spinner } from '@hobbit/ui/8bit/spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
      <div className="flex items-center justify-between">
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
