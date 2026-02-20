import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTransition, animated, to } from '@react-spring/web';
import { Button } from '@hobbit/ui/8bit/button';
import { Input } from '@hobbit/ui/8bit/input';
import { Pagination } from '@hobbit/ui/8bit/pagination';
import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { lockScroll, unlockScroll } from '@/lib/scroll-lock';
import { useSearch, useQueue, useSpotifyQueue, useSpotifyHistory, useNowPlaying } from '@/hooks/useTunes';

const SEARCH_PER_PAGE = 5;
const MODAL_PER_PAGE = 8;
const ROW_HEIGHT = 56; // px — TrackRow height (h-10 art + p-2 padding)
const ROW_GAP = 4;     // px — space-y-1

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

interface TrackRowProps {
  name: string;
  artist: string;
  albumArt?: string;
  right?: React.ReactNode;
  highlight?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

function TrackRow({ name, artist, albumArt, right, highlight, onClick, disabled }: TrackRowProps) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-2 text-left transition-colors ${
        onClick ? 'hover:bg-accent/50 active:bg-accent touch-manipulation' : ''
      } ${highlight ? 'bg-accent/30' : ''}`}
    >
      {albumArt && (
        <img
          src={albumArt}
          alt=""
          className="w-10 h-10 flex-shrink-0"
          style={{ imageRendering: 'auto' }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate retro">{name}</p>
        <p className="text-xs text-muted-foreground truncate retro">{artist}</p>
      </div>
      {right}
    </Comp>
  );
}

function TrackRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="w-10 h-10 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}

/* ── Modal shell ── */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [open]);

  const backdrop = useTransition(open, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    config: { tension: 300, friction: 26 },
  });

  const panel = useTransition(open, {
    from: { opacity: 0, scale: 0.85, y: -10 },
    enter: { opacity: 1, scale: 1, y: 0 },
    leave: { opacity: 0, scale: 0.95, y: 5 },
    config: { tension: 400, friction: 20 },
  });

  return createPortal(
    <>
      {backdrop((style, show) =>
        show && (
          <animated.div
            style={style}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
        )
      )}
      {panel((style, show) =>
        show && (
          <animated.div
            style={{
              opacity: style.opacity,
              transform: to([style.y, style.scale], (y, s) => `translateY(${y}px) scale(${s})`),
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative bg-card border-y-6 border-foreground dark:border-ring w-full max-w-sm max-h-[80vh] flex flex-col pointer-events-auto">
              <div
                className="absolute inset-0 border-x-6 -mx-1.5 border-foreground dark:border-ring pointer-events-none"
                aria-hidden="true"
              />

              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
                <h2 className="text-sm font-semibold retro">{title}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 touch-manipulation active:scale-95"
                  onClick={onClose}
                >
                  <CloseIcon />
                </Button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto overflow-x-hidden flex-1 px-4 pb-4">
                {children}
              </div>
            </div>
          </animated.div>
        )
      )}
    </>,
    document.body,
  );
}

function HistoryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

/* ── History Modal ── */

function HistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, loading, refetch } = useSpotifyHistory();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) {
      refetch();
      setPage(1);
    }
  }, [open, refetch]);

  const tracks = data?.tracks || [];
  const totalPages = Math.max(1, Math.ceil(tracks.length / MODAL_PER_PAGE));
  const pageItems = tracks.slice((page - 1) * MODAL_PER_PAGE, page * MODAL_PER_PAGE);

  return (
    <Modal open={open} onClose={onClose} title="History">
      {loading && !data ? (
        <div className="space-y-1">
          {[...Array(4)].map((_, i) => <TrackRowSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-1">
          {pageItems.map((track, i) => (
            <TrackRow
              key={`${page}-${i}`}
              name={track.name}
              artist={track.artist}
              albumArt={track.albumArt}
              right={
                <span className="text-[10px] text-muted-foreground retro flex-shrink-0">
                  {relativeTime(track.playedAt)}
                </span>
              }
            />
          ))}
          {tracks.length === 0 && (
            <p className="text-xs text-muted-foreground retro py-4 text-center">No history yet</p>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="pt-2" />
        </div>
      )}
    </Modal>
  );
}

/* ── Now Playing ── */

function NowPlaying() {
  const { track } = useNowPlaying();
  if (!track) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded bg-accent/20 shrink-0">
      {track.albumArt && (
        <img
          src={track.albumArt}
          alt=""
          className="w-14 h-14 flex-shrink-0"
          style={{ imageRendering: 'auto' }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate retro">{track.name}</p>
        <p className="text-xs text-muted-foreground truncate retro">{track.artist}</p>
      </div>
    </div>
  );
}

/* ── Main Page ── */

export function TunesPage() {
  const { queueTrack, queueLink, queueing } = useQueue();
  const { query, setQuery, results, setResults, searching } = useSearch((url) => queueLink(url));
  const { data: queueData, loading: queueLoading } = useSpotifyQueue();
  const [searchPage, setSearchPage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(6);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLDivElement>(null);
  const trackListRef = useRef<HTMLDivElement>(null);

  // Measure available height for queue tracks
  useEffect(() => {
    const el = trackListRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      const count = Math.max(1, Math.floor((h + ROW_GAP) / (ROW_HEIGHT + ROW_GAP)));
      setVisibleCount(count);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset search page when results change
  useEffect(() => {
    setSearchPage(1);
  }, [results]);

  // Show dropdown when there are results or searching
  useEffect(() => {
    if (results.length > 0 || searching) {
      setDropdownOpen(true);
    }
  }, [results, searching]);

  // Reset queue page when visible count changes
  useEffect(() => {
    setQueuePage(1);
  }, [visibleCount]);

  const searchTotalPages = Math.ceil(results.length / SEARCH_PER_PAGE);
  const searchPageItems = results.slice(
    (searchPage - 1) * SEARCH_PER_PAGE,
    searchPage * SEARCH_PER_PAGE,
  );

  const queue = queueData?.queue || [];
  const queueTotalPages = Math.max(1, Math.ceil(queue.length / visibleCount));
  const queuePageItems = queue.slice((queuePage - 1) * visibleCount, queuePage * visibleCount);

  const handleTrackClick = (uri: string, name: string) => {
    queueTrack(uri, name);
    setDropdownOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setDropdownOpen(false), 200);
  };

  const handleFocus = () => {
    clearTimeout(blurTimeout.current);
    if (results.length > 0) setDropdownOpen(true);
  };

  return (
    <div className="h-[calc(100dvh-6.5rem)] flex flex-col gap-4 mx-2 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg retro">Tunes</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 touch-manipulation active:scale-95"
          onClick={() => setHistoryOpen(true)}
        >
          <HistoryIcon />
        </Button>
      </div>

      {/* Search combo box */}
      <div className="relative shrink-0" ref={inputRef} onBlur={handleBlur} onFocus={handleFocus}>
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or paste Spotify link..."
        />

        {/* Dropdown */}
        {dropdownOpen && (query.trim() !== '') && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1" onMouseDown={(e) => e.preventDefault()}>
            <div className="relative bg-card border-y-6 border-foreground dark:border-ring">
              <div
                className="absolute inset-0 border-x-6 -mx-1.5 border-foreground dark:border-ring pointer-events-none"
                aria-hidden="true"
              />

              <div className="max-h-[50vh] overflow-y-auto">
                {searching && results.length === 0 && (
                  <p className="text-xs text-muted-foreground retro p-3 text-center">
                    Searching...
                  </p>
                )}
                {searchPageItems.map((track) => (
                  <TrackRow
                    key={track.id}
                    name={track.name}
                    artist={track.artist}
                    albumArt={track.albumArt}
                    onClick={() => handleTrackClick(track.uri, track.name)}
                    disabled={queueing}
                  />
                ))}
                {!searching && results.length === 0 && query.trim() && (
                  <p className="text-xs text-muted-foreground retro p-3 text-center">
                    No results
                  </p>
                )}
              </div>

              {searchTotalPages > 1 && (
                <div className="border-t border-border px-2 py-1">
                  <Pagination
                    page={searchPage}
                    totalPages={searchTotalPages}
                    onPageChange={setSearchPage}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <NowPlaying />

      {/* Inline queue */}
      <div className="flex-1 min-h-0 flex flex-col">
        <p className="text-xs text-muted-foreground retro mb-2 shrink-0">Up Next</p>
        {queueLoading && !queueData ? (
          <div className="space-y-1">
            {[...Array(4)].map((_, i) => <TrackRowSkeleton key={i} />)}
          </div>
        ) : queue.length === 0 ? (
          <p className="text-xs text-muted-foreground retro py-4 text-center">Queue is empty</p>
        ) : (
          <>
            <div ref={trackListRef} className="flex-1 min-h-0 overflow-hidden">
              <div className="space-y-1">
                {queuePageItems.map((track, i) => (
                  <TrackRow
                    key={`${queuePage}-${i}`}
                    name={track.name}
                    artist={track.artist}
                    albumArt={track.albumArt}
                  />
                ))}
              </div>
            </div>
            <Pagination page={queuePage} totalPages={queueTotalPages} onPageChange={setQueuePage} className="pt-2 shrink-0" />
          </>
        )}
      </div>

      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
