import { useState } from 'react';
import { Button } from '@hobbit/ui/8bit/button';
import { Spinner } from '@hobbit/ui/8bit/spinner';
import { Card, CardContent } from '@hobbit/ui/8bit/card';
import { Badge } from '@hobbit/ui/8bit/badge';
import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useControllers, type Controller } from '@/hooks/useControllers';

function ControllerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      {/* D-pad left */}
      <rect x="2" y="6" width="2" height="4" />
      {/* D-pad center/body */}
      <rect x="4" y="4" width="8" height="8" />
      {/* D-pad right */}
      <rect x="12" y="6" width="2" height="4" />
      {/* Bumpers */}
      <rect x="3" y="3" width="4" height="1" />
      <rect x="9" y="3" width="4" height="1" />
      {/* Grips */}
      <rect x="3" y="12" width="3" height="2" />
      <rect x="10" y="12" width="3" height="2" />
      {/* Buttons (right side) */}
      <rect x="10" y="6" width="2" height="2" className="fill-primary/30" />
      {/* Stick (left side) */}
      <rect x="5" y="6" width="2" height="2" className="fill-primary/30" />
    </svg>
  );
}

function EmptySlot({ index }: { index: number }) {
  return (
    <div className="flex items-center gap-2 rounded border-2 border-muted bg-muted/30 px-3 py-2">
      <ControllerIcon />
      <p className="text-[10px] retro font-semibold text-muted-foreground">EMPTY</p>
    </div>
  );
}

function ControllerSlot({ controller }: { controller: Controller }) {
  const { color, connected, playerIndex } = controller;
  const label = `P${(playerIndex ?? 0) + 1}`;

  if (connected && color) {
    return (
      <div
        className="flex items-center gap-2 rounded border-2 px-3 py-2"
        style={{ borderColor: color, backgroundColor: `${color}1a` }}
      >
        <span className="inline-block size-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
        <p className="text-[10px] retro font-semibold text-foreground">{label}</p>
      </div>
    );
  }

  // Connected + unknown color
  return (
    <div className="flex items-center gap-2 rounded border-2 border-primary bg-primary/10 px-3 py-2">
      <ControllerIcon />
      <p className="text-[10px] retro font-semibold text-foreground">{label}</p>
    </div>
  );
}

function ControllersSection() {
  const { dongleConnected, controllers, pairing, loading } = useControllers();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dongleConnected) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-1">
            <ControllerIcon />
            <span className="text-xs sm:text-sm retro font-semibold">Controllers</span>
          </div>
          <p className="text-[10px] retro text-muted-foreground">No dongle detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ControllerIcon />
            <span className="text-xs sm:text-sm retro font-semibold">Controllers</span>
          </div>
          {pairing && (
            <Badge variant="default" className="text-[9px] animate-pulse">
              PAIRING
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map(i => {
            const c = controllers.find(c => c.connected && c.playerIndex === i);
            return c
              ? <ControllerSlot key={c.serial} controller={c} />
              : <EmptySlot key={i} index={i} />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface SystemTabProps {
  onReboot: () => void;
  loading: string | null;
}

export function SystemTab({ onReboot, loading }: SystemTabProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = () => {
    setConfirmOpen(false);
    onReboot();
  };

  const isRebooting = loading === 'reboot';

  return (
    <div className="py-4 mx-2 space-y-4">
      <ControllersSection />

      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm retro font-semibold">System Reboot</span>
        <Button
          variant="destructive"
          className="h-7 text-[10px] px-2 touch-manipulation"
          onClick={() => setConfirmOpen(true)}
          disabled={isRebooting}
        >
          {isRebooting ? <Spinner className="size-3" /> : 'Reboot'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        title="Reboot?"
        description="This will restart the system."
        confirmText="Reboot"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
