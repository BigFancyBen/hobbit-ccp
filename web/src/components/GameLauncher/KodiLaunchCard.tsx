import { Button } from '@hobbit/ui/8bit/button';
import { Spinner } from '@hobbit/ui/8bit/spinner';

interface KodiLaunchCardProps {
  onLaunch: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function KodiLaunchCard({ onLaunch, loading, disabled }: KodiLaunchCardProps) {
  return (
    <div className="mb-4">
      <Button
        variant="default"
        className="w-full h-14 text-base active:scale-95 transition-transform touch-manipulation bg-purple-600 hover:bg-purple-700 border-purple-800 text-white"
        onClick={onLaunch}
        disabled={disabled || loading}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner className="size-4" />
            <span className="retro">Launching...</span>
          </span>
        ) : (
          <span className="retro">Media Center</span>
        )}
      </Button>
    </div>
  );
}
