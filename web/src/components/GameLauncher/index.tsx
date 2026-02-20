import { Alert, AlertDescription } from '@hobbit/ui/8bit/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@hobbit/ui/8bit/card';
import { StatusBadge } from './StatusBadge';
import { AppList } from './AppList';
import { ExitButton } from './ExitButton';
import { VirtualInput } from './VirtualInput';
import { useGaming } from '@/hooks/useGaming';

export function GamesPage() {
  const { status, apps, loading, error, initialLoading, launchApp, exitGaming } = useGaming();
  const isGaming = status.mode === 'gaming';

  const content = (
    <>
      {error && (
        <Alert variant="destructive" className={isGaming ? 'mb-2 shrink-0' : 'mb-4'}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className={isGaming ? 'flex-1 flex flex-col min-h-0' : undefined}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">
              Radiance
            </CardTitle>
            <StatusBadge isGaming={isGaming} offline={!status.sunshineOnline} loading={initialLoading} />
          </div>
        </CardHeader>
        <CardContent className={isGaming ? 'px-0 pt-2 flex-1 min-h-0 flex flex-col' : 'px-0 pt-2'}>
          {isGaming ? (
            <div className="px-4 flex flex-col gap-3 flex-1 min-h-0">
              <VirtualInput />
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

  if (isGaming) {
    return <div className="h-[calc(100dvh-6.5rem)] flex flex-col">{content}</div>;
  }

  return content;
}
