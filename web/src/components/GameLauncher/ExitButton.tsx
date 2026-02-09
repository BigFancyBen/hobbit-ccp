import { useState } from 'react';
import { Button } from '@hobbit/ui/8bit/button';
import { Spinner } from '@hobbit/ui/8bit/spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ExitButtonProps {
  onExit: () => void;
  loading?: boolean;
}

export function ExitButton({ onExit, loading }: ExitButtonProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    onExit();
  };

  return (
    <>
      <Button
        variant="destructive"
        className="w-full h-16 text-base active:scale-95 transition-transform touch-manipulation"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner className="size-4" />
            Stopping...
          </span>
        ) : (
          'Exit'
        )}
      </Button>

      <ConfirmDialog
        open={open}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
        title="Exit?"
        description="This will end the current session."
        confirmText="Exit"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
}
