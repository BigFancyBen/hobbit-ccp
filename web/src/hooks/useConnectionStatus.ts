import { useState, useEffect, useRef } from 'react';

const HEALTH_URL = '/api/control/health';
const CHECK_INTERVAL = 10_000;
const FAILURE_THRESHOLD = 3;

export function useConnectionStatus() {
  const [connected, setConnected] = useState(true);
  const failCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(HEALTH_URL, { cache: 'no-store' });
        if (res.ok) {
          failCountRef.current = 0;
          setConnected(true);
        } else {
          throw new Error('not ok');
        }
      } catch {
        failCountRef.current++;
        if (failCountRef.current >= FAILURE_THRESHOLD) {
          setConnected(false);
        }
      }
    }

    function start() {
      check();
      if (!intervalRef.current) {
        intervalRef.current = setInterval(check, CHECK_INTERVAL);
      }
    }

    function stop() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function onVisibility() {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    }

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return connected;
}
