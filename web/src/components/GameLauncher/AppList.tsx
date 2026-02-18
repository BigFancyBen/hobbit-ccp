import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { Empty, EmptyTitle, EmptyDescription } from '@hobbit/ui/8bit/empty';
import { AppRow } from './AppRow';

interface AppListProps {
  apps: string[];
  loading?: boolean;
  launchingApp: string | null;
  onLaunchApp: (app: string) => void;
  offline?: boolean;
}

export function AppList({ apps, loading, launchingApp, onLaunchApp, offline }: AppListProps) {
  if (loading) {
    return (
      <div className="divide-y divide-dashed divide-muted-foreground/30">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-4">
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (offline || apps.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyTitle>{offline ? 'Server Offline' : "Couldn't Load Apps"}</EmptyTitle>
        <EmptyDescription>
          {offline
            ? 'Turn on the gaming PC to start streaming.'
            : 'Make sure Sunshine is running on the gaming PC.'}
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div>
      {apps.map(app => (
        <AppRow
          key={app}
          appName={app}
          launching={launchingApp === app}
          disabled={launchingApp !== null}
          onClick={() => onLaunchApp(app)}
        />
      ))}
    </div>
  );
}
