import { Badge } from '@/components/ui/8bit/badge';
import { Skeleton } from '@/components/ui/8bit/skeleton';

interface NetworkBadgesProps {
  received?: number;
  sent?: number;
  loading?: boolean;
}

export function NetworkBadges({ received, sent, loading }: NetworkBadgesProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs sm:text-sm font-semibold retro">Network</h4>
      <Badge variant="outline" className="w-full justify-center py-2 text-xs gap-4">
        <span className="flex items-center gap-1">
          <span className="text-green-500">↓</span>
          {received ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-blue-500">↑</span>
          {sent ?? 0}
        </span>
      </Badge>
    </div>
  );
}
