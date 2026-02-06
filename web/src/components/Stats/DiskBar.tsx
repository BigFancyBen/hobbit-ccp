import { Progress } from '@/components/ui/8bit/progress';
import { Badge } from '@/components/ui/8bit/badge';
import { Skeleton } from '@/components/ui/8bit/skeleton';

interface DiskBarProps {
  used?: number;
  total?: number;
  loading?: boolean;
}

export function DiskBar({ used, total, loading }: DiskBarProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const usedVal = used ?? 0;
  const totalVal = total ?? 1;
  const percentage = (usedVal / totalVal) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-xs sm:text-sm font-semibold retro">Disk</h4>
        <Badge variant={percentage > 90 ? 'destructive' : 'secondary'} className="text-xs">
          {usedVal.toFixed(0)} / {totalVal.toFixed(0)} GB
        </Badge>
      </div>
      <Progress value={percentage} className="h-4" progressBg="bg-purple-500" />
    </div>
  );
}
