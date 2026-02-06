import { useState } from 'react';
import { Button } from '@/components/ui/8bit/button';
import { Spinner } from '@/components/ui/8bit/spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BluetoothSection } from './BluetoothSection';

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

  return (
    <div className="py-4 space-y-6 mx-2">
      {/* Bluetooth Controllers */}
      <BluetoothSection />

      {/* System Controls - divider */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold retro mb-3">System</h4>
        <Button
          variant="destructive"
          className="w-full h-14 text-sm touch-manipulation active:scale-95 transition-transform"
          onClick={() => setConfirmOpen(true)}
          disabled={loading === 'reboot'}
        >
          {loading === 'reboot' ? (
            <span className="flex items-center gap-2">
              <Spinner className="size-4" />
              Rebooting...
            </span>
          ) : (
            'Reboot System'
          )}
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
