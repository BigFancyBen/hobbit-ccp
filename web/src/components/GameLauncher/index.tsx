import { Alert, AlertDescription } from '@hobbit/ui/8bit/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@hobbit/ui/8bit/card';
import { StatusBadge } from './StatusBadge';
import { AppList } from './AppList';
import { ExitButton } from './ExitButton';
import { useGaming } from '@/hooks/useGaming';

export function GamesPage() {
  const { status, apps, loading, error, initialLoading, launchApp, exitGaming } = useGaming();
  const isGaming = status.mode === 'gaming';

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">
              Radiance
            </CardTitle>
            <StatusBadge isGaming={isGaming} offline={!status.sunshineOnline} loading={initialLoading} />
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-2">
          {isGaming ? (
            <div className="px-4">
              <ExitButton
                onExit={exitGaming}
                loading={loading === 'exit'}
              />
            </div>
          ) : (
            <AppList
              apps={apps}
              loading={initialLoading}
              launchingApp={loading}
              onLaunchApp={launchApp}
              offline={!status.sunshineOnline}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
