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
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs sm:text-sm font-semibold retro">Network</h4>
      <div className="flex gap-4">
        <Badge variant="outline" className="flex-1 justify-center py-2 text-xs">
          <span className="text-green-500 mr-1">{'<'}</span>
          {received ?? 0} KB/s
        </Badge>
        <Badge variant="outline" className="flex-1 justify-center py-2 text-xs">
          {sent ?? 0} KB/s
          <span className="text-blue-500 ml-1">{'>'}</span>
        </Badge>
      </div>
    </div>
  );
}
