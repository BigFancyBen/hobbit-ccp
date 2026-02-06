import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card';
import { StatusBadge } from './StatusBadge';
import { AppGrid } from './AppGrid';
import { ExitButton } from './ExitButton';

interface GameLauncherProps {
  status: { mode: string; moonlightRunning: boolean; xRunning: boolean };
  apps: string[];
  loading: string | null;
  initialLoading?: boolean;
  onLaunchApp: (app: string) => void;
  onExitGaming: () => void;
}

export function GameLauncher({
  status,
  apps,
  loading,
  initialLoading,
  onLaunchApp,
  onExitGaming
}: GameLauncherProps) {
  const isGaming = status.mode === 'gaming';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">
            Radiance
          </CardTitle>
          <StatusBadge isGaming={isGaming} loading={initialLoading} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {isGaming ? (
          <ExitButton
            onExit={onExitGaming}
            loading={loading === 'exit'}
          />
        ) : (
          <AppGrid
            apps={apps}
            loading={initialLoading}
            launchingApp={loading}
            onLaunchApp={onLaunchApp}
          />
        )}
      </CardContent>
    </Card>
  );
}
