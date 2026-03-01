import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@hobbit/ui/8bit/toast';
import { getCache, setCache } from '@/lib/cache';

const API = '/api/control';

const SPOTIFY_URL_RE = /open\.spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]+/;

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  uri: string;
}

export function useSearch(onLink?: (url: string) => void) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Detect Spotify URL — queue immediately instead of searching
    if (SPOTIFY_URL_RE.test(query.trim())) {
      onLink?.(query.trim());
      setQuery('');
      setResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);

      fetch(`${API}/spotify/search?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          if (!controller.signal.aborted) {
            setResults(data.tracks || []);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [query]);

  return { query, setQuery, results, setResults, searching };
}

export function useQueue() {
  const [queueing, setQueueing] = useState(false);

  const queueTrack = useCallback(
    async (uri: string, name: string) => {
      setQueueing(true);
      try {
        const res = await fetch(`${API}/spotify/queue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uri }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = /not authenticated/i.test(data.error || '')
            ? 'Jukebox not set up yet'
            : data.error || 'Failed to queue';
          toast(msg);
        } else {
          toast(`Added "${name}"`);
        }
      } catch {
        toast('Network error');
      } finally {
        setQueueing(false);
      }
    },
    [],
  );

  const queueLink = useCallback(
    async (url: string) => {
      setQueueing(true);
      try {
        const res = await fetch(`${API}/spotify/queue-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = /not authenticated/i.test(data.error || '')
            ? 'Jukebox not set up yet'
            : data.error || 'Failed to queue';
          toast(msg);
        } else if (data.queued !== undefined) {
          toast(`Queued ${data.queued} of ${data.total} tracks`);
        } else {
          toast('Added to queue');
        }
      } catch {
        toast('Network error');
      } finally {
        setQueueing(false);
      }
    },
    [],
  );

  return { queueTrack, queueLink, queueing };
}

interface QueueTrack {
  name: string;
  artist: string;
  albumArt: string;
}

interface QueueData {
  currentlyPlaying: QueueTrack | null;
  queue: QueueTrack[];
}

export function useSpotifyQueue() {
  const [data, setData] = useState<QueueData | null>(() => getCache('spotify-queue'));
  const cached = data !== null;
  const [loading, setLoading] = useState(!cached);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`${API}/spotify/queue`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json);
      setCache('spotify-queue', json);
    } catch {
      // keep previous data — don't wipe on transient errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    function start() {
      refetch();
      interval = setInterval(refetch, 15000);
    }

    function stop() {
      if (interval) { clearInterval(interval); interval = null; }
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
  }, [refetch]);

  useEffect(() => {
    const es = new EventSource(`${API}/spotify/events`);
    es.addEventListener('queue-updated', () => refetch());
    return () => es.close();
  }, [refetch]);

  return { data, loading, refetch };
}

interface HistoryTrack {
  name: string;
  artist: string;
  albumArt: string;
  playedAt: string;
}

interface HistoryData {
  tracks: HistoryTrack[];
}

export function useSpotifyHistory() {
  const [data, setData] = useState<HistoryData | null>(() => getCache('spotify-history'));
  const cached = data !== null;
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!cached) setLoading(true);
    try {
      const res = await fetch(`${API}/spotify/history`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json);
      setCache('spotify-history', json);
    } catch {
      if (!cached) toast('Could not load history');
      // keep previous data — don't wipe on transient errors
    } finally {
      setLoading(false);
    }
  }, [cached]);

  return { data, loading, refetch };
}

interface NowPlayingTrack {
  name: string;
  artist: string;
  albumArt: string;
  isPlaying: boolean;
  progress_ms: number;
  duration_ms: number;
  timestamp: number;
}

export function useNowPlaying() {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const res = await fetch(`${API}/spotify/now-playing`);
        if (!res.ok) { if (active) setTrack(null); return; }
        const data = await res.json();
        if (active) setTrack(data);
      } catch {
        if (active) setTrack(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    function start() {
      poll();
      interval = setInterval(poll, 10000);
    }

    function stop() {
      if (interval) { clearInterval(interval); interval = null; }
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
      active = false;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return { track, loading };
}
