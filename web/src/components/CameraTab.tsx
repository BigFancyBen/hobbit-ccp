import { useEffect, useRef } from 'react';
import { Button } from '@hobbit/ui/8bit/button';
import { connectMSE } from '@/lib/mse-player';
import { useCamera } from '@/hooks/useCamera';

const WS_URL =
  (location.protocol === 'https:' ? 'wss://' : 'ws://') +
  location.host +
  '/api/camera/ws?src=lorex';

const PRESETS = [
  { label: 'Approach', token: '1' },
  { label: 'Knocking', token: '2' },
] as const;

const DPAD: { label: string; pan: number; tilt: number; pos: string }[] = [
  { label: '\u25B2', pan: 0, tilt: 0.5, pos: 'col-start-2 row-start-1' },
  { label: '\u25C0', pan: -0.5, tilt: 0, pos: 'col-start-1 row-start-2' },
  { label: '\u25A0', pan: 0, tilt: 0, pos: 'col-start-2 row-start-2' },
  { label: '\u25B6', pan: 0.5, tilt: 0, pos: 'col-start-3 row-start-2' },
  { label: '\u25BC', pan: 0, tilt: -0.5, pos: 'col-start-2 row-start-3' },
];

export function CameraTab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ptzMove, ptzStop, gotoPreset } = useCamera();

  // Connect MSE stream when this tab mounts, disconnect on unmount
  useEffect(() => {
    if (!videoRef.current) return;
    return connectMSE(videoRef.current, WS_URL);
  }, []);

  const handlePointerDown = (pan: number, tilt: number) => {
    if (pan === 0 && tilt === 0) return;
    ptzMove(pan, tilt, 0);
  };

  const handlePointerUp = () => {
    ptzStop();
  };

  return (
    <div className="py-4 mx-2 space-y-3">
      {/* Live video feed */}
      <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          autoPlay
          muted
          playsInline
        />
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRESETS.map(({ label, token }) => (
          <Button
            key={token}
            variant="outline"
            font="retro"
            className="flex-1 h-10 text-xs"
            onClick={() => gotoPreset(token)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* D-pad + Zoom controls */}
      <div className="flex items-center justify-center gap-6">
        {/* D-pad */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-36 h-36">
          {DPAD.map(({ label, pan, tilt, pos }) => (
            <button
              key={pos}
              className={`${pos} flex items-center justify-center rounded bg-secondary text-foreground text-lg font-bold touch-manipulation select-none active:bg-accent transition-colors`}
              onPointerDown={() => handlePointerDown(pan, tilt)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Zoom buttons */}
        <div className="flex flex-col gap-2">
          <button
            className="w-14 h-14 rounded bg-secondary text-foreground text-xl font-bold touch-manipulation select-none active:bg-accent transition-colors"
            onPointerDown={() => ptzMove(0, 0, 0.5)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            +
          </button>
          <button
            className="w-14 h-14 rounded bg-secondary text-foreground text-xl font-bold touch-manipulation select-none active:bg-accent transition-colors"
            onPointerDown={() => ptzMove(0, 0, -0.5)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            &minus;
          </button>
        </div>
      </div>
    </div>
  );
}
