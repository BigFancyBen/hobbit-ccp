import { useState } from 'react';
import { Button } from '@/components/ui/8bit/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/8bit/alert';
import { Spinner } from '@/components/ui/8bit/spinner';
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

  return (
    <div className="py-4 space-y-6 mx-2">
      <Alert>
        <AlertTitle>System Controls</AlertTitle>
        <AlertDescription>
          System controls for the Hobbit Mini PC. Use with caution!
        </AlertDescription>
      </Alert>

      <Button
        variant="destructive"
        className="w-full h-14 text-sm touch-manipulation active:scale-95 transition-transform mt-12"
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
