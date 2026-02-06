import ManaBar from '@/components/ui/8bit/mana-bar';
import { Badge } from '@/components/ui/8bit/badge';
import { Skeleton } from '@/components/ui/8bit/skeleton';

interface RamBarProps {
  used?: number;
  total?: number;
  loading?: boolean;
}

export function RamBar({ used, total, loading }: RamBarProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const usedVal = used ?? 0;
  const totalVal = total ?? 1;
  // Mana bar shows "mana remaining" so we show free RAM percentage
  const freePercentage = ((totalVal - usedVal) / totalVal) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-xs sm:text-sm font-semibold retro">Memory</h4>
        <Badge variant="secondary" className="text-xs">
          {usedVal.toFixed(1)} / {totalVal.toFixed(1)} GB
        </Badge>
      </div>
      <ManaBar value={freePercentage} className="h-4" />
    </div>
  );
}
