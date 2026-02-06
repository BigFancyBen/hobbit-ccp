import { Progress } from '@/components/ui/8bit/progress';
import { Badge } from '@/components/ui/8bit/badge';
import { Skeleton } from '@/components/ui/8bit/skeleton';

interface CpuBarProps {
  usage?: number;
  loading?: boolean;
}

export function CpuBar({ usage, loading }: CpuBarProps) {
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

  const value = usage ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-xs sm:text-sm font-semibold retro">CPU</h4>
        <Badge variant={value > 80 ? 'destructive' : 'secondary'} className="text-xs">
          {value.toFixed(0)}%
        </Badge>
      </div>
      <Progress value={value} className="h-4" progressBg="bg-red-500" />
    </div>
  );
}
