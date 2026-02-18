import { Spinner } from '@hobbit/ui/8bit/spinner';

function PixelChevron() {
  // 5x7 pixel-art right chevron (>) using 1px blocks
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="14"
      viewBox="0 0 5 7"
      fill="currentColor"
      shapeRendering="crispEdges"
    >
      <rect x="0" y="0" width="2" height="1" />
      <rect x="1" y="1" width="2" height="1" />
      <rect x="2" y="2" width="2" height="1" />
      <rect x="3" y="3" width="2" height="1" />
      <rect x="2" y="4" width="2" height="1" />
      <rect x="1" y="5" width="2" height="1" />
      <rect x="0" y="6" width="2" height="1" />
    </svg>
  );
}

interface AppRowProps {
  appName: string;
  launching?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function AppRow({ appName, launching, disabled, onClick }: AppRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || launching}
      className={`w-full flex items-center justify-between px-4 py-4 text-sm text-left
        touch-manipulation active:scale-[0.98] transition-all
        border-b border-dashed border-muted-foreground/30 last:border-b-0
        disabled:opacity-50
        ${launching ? 'bg-accent/30' : 'hover:bg-muted/50 active:bg-muted/50'}`}
    >
      <span className="retro">{appName}</span>
      {launching ? (
        <Spinner className="size-4" />
      ) : (
        <PixelChevron />
      )}
    </button>
  );
}
