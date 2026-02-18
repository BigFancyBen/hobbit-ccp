import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { Empty, EmptyTitle, EmptyDescription } from '@hobbit/ui/8bit/empty';
import { AppRow } from './AppRow';

interface AppListProps {
  apps: string[];
  loading?: boolean;
  launchingApp: string | null;
  onLaunchApp: (app: string) => void;
}

export function AppList({ apps, loading, launchingApp, onLaunchApp }: AppListProps) {
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

  if (apps.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyTitle>Couldn't Load Apps</EmptyTitle>
        <EmptyDescription>
          Make sure Sunshine is running on the gaming PC.
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
