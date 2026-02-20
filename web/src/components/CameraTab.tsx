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

export function CameraTab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { gotoPreset } = useCamera();

  // Connect MSE stream when this tab mounts, disconnect on unmount
  useEffect(() => {
    if (!videoRef.current) return;
    return connectMSE(videoRef.current, WS_URL);
  }, []);

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
    </div>
  );
}
