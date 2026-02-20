import { useCallback } from 'react';

const API = '/api/control';

export function useCamera() {
  const gotoPreset = useCallback((token: string) => {
    fetch(`${API}/camera/preset/${token}`, { method: 'POST' }).catch(() => {});
  }, []);

  return { gotoPreset };
}
