import { Alert, AlertDescription } from '@hobbit/ui/8bit/alert';
import { StatusBadge } from './StatusBadge';
import { AppList } from './AppList';
import { ExitButton } from './ExitButton';
import { VirtualInput } from './VirtualInput';
import { useGaming } from '@/hooks/useGaming';

export function GamesPage() {
  const { status, apps, loading, error, initialLoading, launchApp, exitGaming } = useGaming();
  const isGaming = status.mode === 'gaming';

  if (isGaming) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {error && (
          <Alert variant="destructive" className="mb-2 shrink-0">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-2 shrink-0">
          <span className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground retro">
            Radiance
          </span>
          <StatusBadge isGaming={isGaming} offline={!status.sunshineOnline} loading={initialLoading} />
        </div>

        <VirtualInput />

        <ExitButton
          onExit={exitGaming}
          loading={loading === 'exit'}
        />
      </div>
    );
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground retro">
          Radiance
        </span>
        <StatusBadge isGaming={isGaming} offline={!status.sunshineOnline} loading={initialLoading} />
      </div>

      <AppList
        apps={apps}
        loading={initialLoading}
        launchingApp={loading}
        onLaunchApp={launchApp}
        offline={!status.sunshineOnline}
      />
    </>
  );
}
