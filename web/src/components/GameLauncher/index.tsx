import { Card, CardContent, CardHeader, CardTitle } from '@hobbit/ui/8bit/card';
import { StatusBadge } from './StatusBadge';
import { AppGrid } from './AppGrid';
import { ExitButton } from './ExitButton';

interface GameLauncherProps {
  status: { mode: string; sunshineOnline: boolean };
  apps: string[];
  loading: string | null;
  initialLoading?: boolean;
  offline?: boolean;
  onLaunchApp: (app: string) => void;
  onExitGaming: () => void;
}

export function GameLauncher({
  status,
  apps,
  loading,
  initialLoading,
  offline,
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
          <StatusBadge isGaming={isGaming} offline={offline} loading={initialLoading} />
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
