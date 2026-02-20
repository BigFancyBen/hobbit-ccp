import { Spinner } from '@hobbit/ui/8bit/spinner';
import { PixelChevron } from '@/components/icons';

interface AppRowProps {
  appName: string;
  launching?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function AppRow({ appName, launching, disabled, onClick }: AppRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || launching}
      className={`w-full flex items-center justify-between px-4 py-4 text-sm text-left
        touch-manipulation active:scale-[0.98] transition-all
        border-b border-dashed border-muted-foreground/30 last:border-b-0
        disabled:opacity-50
        ${launching ? 'bg-accent/30' : 'hover:bg-muted/50 active:bg-muted/50'}`}
    >
      <span className="retro">{appName}</span>
      {launching ? (
        <Spinner className="size-4" />
      ) : (
        <PixelChevron />
      )}
    </button>
  );
}
