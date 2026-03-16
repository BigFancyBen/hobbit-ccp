import { toast } from '@hobbit/ui/8bit/toast';

const API = '/api/control';

export function setVolume(params: { volume?: number; muted?: boolean | 'toggle'; delta?: number }) {
  fetch(`${API}/volume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(({ volume, muted }) => {
      toast(muted ? 'Muted' : `Volume: ${volume}%`);
    })
    .catch(() => toast('Volume unavailable'));
}
