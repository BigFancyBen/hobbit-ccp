import { Empty, EmptyTitle, EmptyDescription } from '@hobbit/ui/8bit/empty';
import { AppButton } from './AppButton';

interface AppGridProps {
  apps: string[];
  loading?: boolean;
  launchingApp: string | null;
  onLaunchApp: (app: string) => void;
}

export function AppGrid({ apps, loading, launchingApp, onLaunchApp }: AppGridProps) {
  // Show skeleton grid during initial load
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <AppButton
            key={i}
            appName=""
            loading={true}
            onClick={() => {}}
          />
        ))}
      </div>
    );
  }

  // Show empty state if no apps found
  if (apps.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyTitle>No Games Found</EmptyTitle>
        <EmptyDescription>
          No Sunshine apps detected. Make sure Sunshine is running.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {apps.map(app => (
        <AppButton
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
