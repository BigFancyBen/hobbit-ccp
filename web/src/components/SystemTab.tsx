import { Button } from '@/components/ui/8bit/button';

interface SystemTabProps {
  onReboot: () => void;
  loading: string | null;
}

export function SystemTab({ onReboot, loading }: SystemTabProps) {
  const handleReboot = () => {
    if (confirm('Really reboot?')) {
      onReboot();
    }
  };

  return (
    <div className="py-4 space-y-4">
      <div className="text-xs sm:text-sm text-muted-foreground retro">
        System controls for the Hobbit Mini PC
      </div>

      <Button
        variant="destructive"
        className="w-full text-xs sm:text-sm"
        onClick={handleReboot}
        disabled={loading === 'reboot'}
      >
        {loading === 'reboot' ? 'Rebooting...' : 'Reboot System'}
      </Button>
    </div>
  );
}
