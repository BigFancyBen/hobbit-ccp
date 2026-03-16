import { Alert, AlertDescription } from '@hobbit/ui/8bit/alert';
import { StatusBadge } from './StatusBadge';
import { AppList } from './AppList';
import { ExitButton } from './ExitButton';
import { VirtualInput } from './VirtualInput';
import { KodiRemote } from './KodiRemote';
import { KodiLaunchCard } from './KodiLaunchCard';
import { useGaming } from '@/hooks/useGaming';

export function GamesPage() {
  const { status, apps, loading, error, initialLoading, launchApp, exitGaming, launchKodi, exitKodi, kodiRpc } = useGaming();

  if (status.mode === 'kodi') {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {error && (
          <Alert variant="destructive" className="mb-2 shrink-0">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-2 shrink-0">
          <span className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground retro">
            Media Center
          </span>
          <div className="flex items-center gap-2">
            <StatusBadge mode="kodi" loading={initialLoading} />
            <ExitButton onExit={exitKodi} loading={loading === 'exit'} />
          </div>
        </div>

        <KodiRemote kodiRpc={kodiRpc} />
      </div>
    );
  }

  if (status.mode === 'gaming') {
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
          <div className="flex items-center gap-2">
            <StatusBadge mode="gaming" offline={!status.sunshineOnline} loading={initialLoading} />
            <ExitButton onExit={exitGaming} loading={loading === 'exit'} />
          </div>
        </div>

        <VirtualInput />
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
        <StatusBadge mode="idle" offline={!status.sunshineOnline} loading={initialLoading} />
      </div>

      <KodiLaunchCard
        onLaunch={launchKodi}
        loading={loading === 'kodi'}
        disabled={status.mode !== 'idle'}
      />

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
