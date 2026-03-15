import { Badge } from '@hobbit/ui/8bit/badge';
import { Skeleton } from '@hobbit/ui/8bit/skeleton';

interface StatusBadgeProps {
  mode: 'idle' | 'gaming' | 'kodi';
  offline?: boolean;
  loading?: boolean;
}

export function StatusBadge({ mode, offline, loading }: StatusBadgeProps) {
  if (loading) {
    return <Skeleton className="h-6 w-20" />;
  }

  if (mode === 'kodi') {
    return (
      <Badge
        variant="default"
        font="retro"
        className="bg-purple-500 border-purple-700 text-white animate-pulse"
      >
        <span className="inline-block w-2 h-2 bg-purple-900 mr-2 animate-ping" />
        KODI
      </Badge>
    );
  }

  if (offline) {
    return (
      <Badge variant="destructive" font="retro">
        OFFLINE
      </Badge>
    );
  }

  if (mode === 'gaming') {
    return (
      <Badge
        variant="default"
        font="retro"
        className="bg-green-500 border-green-700 text-black animate-pulse"
      >
        <span className="inline-block w-2 h-2 bg-green-900 mr-2 animate-ping" />
        PLAYING
      </Badge>
    );
  }

  return (
    <Badge variant="default" font="retro" className="bg-green-500 border-green-700 text-black">
      ONLINE
    </Badge>
  );
}
