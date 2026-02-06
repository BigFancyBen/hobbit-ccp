import { useNetdataStats } from '@/hooks/useNetdataStats';

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  unit: string;
}

function StatBar({ label, value, max, unit }: StatBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs sm:text-sm retro">
        <span className="text-muted-foreground">{label}</span>
        <span>{value}{unit} / {max}{unit}</span>
      </div>
      <div className="h-3 bg-secondary border-2 border-foreground dark:border-ring">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function StatsTab() {
  const { cpu, ram, disk, network, loading, error } = useNetdataStats(3000);

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground text-xs sm:text-sm retro">Loading stats...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-destructive text-xs sm:text-sm retro">{error}</div>;
  }

  return (
    <div className="space-y-4 py-2">
      {/* CPU */}
      <div className="space-y-2">
        <h4 className="text-xs sm:text-sm font-semibold retro">CPU</h4>
        {cpu ? (
          <StatBar label="Usage" value={cpu.usage} max={100} unit="%" />
        ) : (
          <span className="text-muted-foreground text-xs retro">N/A</span>
        )}
      </div>

      {/* Memory */}
      <div className="space-y-2">
        <h4 className="text-xs sm:text-sm font-semibold retro">Memory</h4>
        {ram ? (
          <StatBar label="Used" value={ram.used} max={ram.total} unit=" GB" />
        ) : (
          <span className="text-muted-foreground text-xs retro">N/A</span>
        )}
      </div>

      {/* Disk */}
      <div className="space-y-2">
        <h4 className="text-xs sm:text-sm font-semibold retro">Disk</h4>
        {disk ? (
          <StatBar label="Used" value={disk.used} max={disk.total} unit=" GB" />
        ) : (
          <span className="text-muted-foreground text-xs retro">N/A</span>
        )}
      </div>

      {/* Network */}
      <div className="space-y-2">
        <h4 className="text-xs sm:text-sm font-semibold retro">Network</h4>
        {network ? (
          <div className="flex justify-between text-xs sm:text-sm retro p-2 bg-secondary border-2 border-foreground dark:border-ring">
            <span>↓ {network.received} KB/s</span>
            <span>↑ {network.sent} KB/s</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs retro">N/A</span>
        )}
      </div>
    </div>
  );
}
