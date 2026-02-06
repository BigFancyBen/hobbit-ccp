import { Button } from '@/components/ui/8bit/button';
import { Skeleton } from '@/components/ui/8bit/skeleton';
import { Spinner } from '@/components/ui/8bit/spinner';

interface AppButtonProps {
  appName: string;
  loading?: boolean;
  launching?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function AppButton({ appName, loading, launching, disabled, onClick }: AppButtonProps) {
  if (loading) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled || launching}
      className={`
        w-full h-16 text-sm
        touch-manipulation
        active:scale-95 transition-transform
        ${launching ? 'bg-accent' : 'hover:bg-primary/90'}
      `}
    >
      {launching ? (
        <span className="flex items-center gap-2">
          <Spinner className="size-4" />
          Launching...
        </span>
      ) : (
        appName
      )}
    </Button>
  );
}
