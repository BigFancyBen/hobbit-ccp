import { Badge } from '@/components/ui/8bit/badge';
import { Skeleton } from '@/components/ui/8bit/skeleton';

interface StatusBadgeProps {
  isGaming: boolean;
  loading?: boolean;
}

export function StatusBadge({ isGaming, loading }: StatusBadgeProps) {
  if (loading) {
    return <Skeleton className="h-6 w-20" />;
  }

  if (isGaming) {
    return (
      <Badge
        variant="default"
        className="bg-green-500 border-green-700 text-black animate-pulse"
      >
        <span className="inline-block w-2 h-2 bg-green-900 mr-2 animate-ping" />
        PLAYING
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-muted-foreground">
      IDLE
    </Badge>
  );
}
