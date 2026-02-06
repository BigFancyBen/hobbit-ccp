import { Progress } from '@/components/ui/8bit/progress';
import { Badge } from '@/components/ui/8bit/badge';
import { Skeleton } from '@/components/ui/8bit/skeleton';

interface GpuBarProps {
  usage?: number;
  loading?: boolean;
}

export function GpuBar({ usage, loading }: GpuBarProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  // If no GPU data available, show N/A
  if (usage === undefined) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h4 className="text-xs sm:text-sm font-semibold retro">GPU</h4>
          <Badge variant="outline" className="text-xs">N/A</Badge>
        </div>
        <Progress value={0} className="h-4" progressBg="bg-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-xs sm:text-sm font-semibold retro">GPU</h4>
        <Badge variant={usage > 80 ? 'destructive' : 'secondary'} className="text-xs">
          {usage.toFixed(0)}%
        </Badge>
      </div>
      <Progress value={usage} className="h-4" progressBg="bg-yellow-500" />
    </div>
  );
}
