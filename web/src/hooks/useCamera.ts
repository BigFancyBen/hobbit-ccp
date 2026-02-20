import { useCallback } from 'react';

const API = '/api/control';

export function useCamera() {
  const ptzMove = useCallback((pan: number, tilt: number, zoom: number) => {
    fetch(`${API}/camera/ptz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pan, tilt, zoom }),
    }).catch(() => {});
  }, []);

  const ptzStop = useCallback(() => {
    fetch(`${API}/camera/ptz/stop`, { method: 'POST' }).catch(() => {});
  }, []);

  const gotoPreset = useCallback((token: string) => {
    fetch(`${API}/camera/preset/${token}`, { method: 'POST' }).catch(() => {});
  }, []);

  return { ptzMove, ptzStop, gotoPreset };
}
