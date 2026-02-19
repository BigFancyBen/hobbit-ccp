import { useRef, useCallback, useEffect } from 'react';
import { Button } from '@hobbit/ui/8bit/button';

const API = '/api/control';
const SENSITIVITY = 2.0;
const MOVE_INTERVAL = 30;
const TAP_MAX_TIME = 200;
const TAP_MAX_DIST = 10;
const DRAG_TAP_WINDOW = 300; // ms after tap to start a drag

const QUICK_KEYS = [
  { label: 'Esc', key: 'Escape' },
  { label: 'Tab', key: 'Tab' },
  { label: 'Enter', key: 'Return' },
  { label: 'Space', key: 'space' },
  { label: 'Bksp', key: 'BackSpace' },
  { label: '\u2190', key: 'Left' },
  { label: '\u2191', key: 'Up' },
  { label: '\u2193', key: 'Down' },
  { label: '\u2192', key: 'Right' },
  { label: 'End', key: 'End' },
  { label: 'Alt+Tab', key: 'alt+Tab' },
  { label: 'Win', key: 'super' },
];

function post(path: string, body: Record<string, unknown>) {
  fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function VirtualInput() {
  const accDx = useRef(0);
  const accDy = useRef(0);
  const moveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStart = useRef<{ x: number; y: number; time: number; count: number } | null>(null);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const scrollLastY = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardOpen = useRef(false);
  const lastTapTime = useRef(0);
  const isDragging = useRef(false);

  // Flush accumulated deltas
  const flushMove = useCallback(() => {
    const dx = Math.round(accDx.current);
    const dy = Math.round(accDy.current);
    if (dx === 0 && dy === 0) return;
    accDx.current = 0;
    accDy.current = 0;
    post('/input/move', { dx, dy });
  }, []);

  const startMoveTimer = useCallback(() => {
    if (moveTimer.current) return;
    moveTimer.current = setInterval(flushMove, MOVE_INTERVAL);
  }, [flushMove]);

  const stopMoveTimer = useCallback(() => {
    if (!moveTimer.current) return;
    clearInterval(moveTimer.current);
    moveTimer.current = null;
    flushMove();
  }, [flushMove]);

  useEffect(() => {
    return () => {
      if (moveTimer.current) clearInterval(moveTimer.current);
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now(), count: e.touches.length };
    lastTouch.current = { x: t.clientX, y: t.clientY };

    if (e.touches.length === 2) {
      scrollLastY.current = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else {
      scrollLastY.current = null;
    }

    // Tap-then-drag: if this touch starts shortly after a tap, hold mouse button
    if (e.touches.length === 1 && Date.now() - lastTapTime.current < DRAG_TAP_WINDOW) {
      isDragging.current = true;
      lastTapTime.current = 0; // consume the tap
      post('/input/mousedown', { button: 1 });
    }

    startMoveTimer();
  }, [startMoveTimer]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && scrollLastY.current !== null) {
      // Two-finger scroll
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const delta = midY - scrollLastY.current;
      if (Math.abs(delta) > 10) {
        post('/input/scroll', { dy: delta > 0 ? 1 : -1 });
        scrollLastY.current = midY;
      }
      return;
    }

    if (e.touches.length !== 1 || !lastTouch.current) return;
    const t = e.touches[0];
    const dx = (t.clientX - lastTouch.current.x) * SENSITIVITY;
    const dy = (t.clientY - lastTouch.current.y) * SENSITIVITY;
    accDx.current += dx;
    accDy.current += dy;
    lastTouch.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    stopMoveTimer();

    // End drag if active
    if (isDragging.current) {
      isDragging.current = false;
      post('/input/mouseup', { button: 1 });
      touchStart.current = null;
      lastTouch.current = null;
      scrollLastY.current = null;
      return;
    }

    if (!touchStart.current) return;
    const elapsed = Date.now() - touchStart.current.time;
    const t = e.changedTouches[0];
    const dist = Math.hypot(t.clientX - touchStart.current.x, t.clientY - touchStart.current.y);

    if (elapsed < TAP_MAX_TIME && dist < TAP_MAX_DIST) {
      if (touchStart.current.count >= 2) {
        post('/input/click', { button: 3 }); // right click
      } else {
        post('/input/click', { button: 1 }); // left click
        lastTapTime.current = Date.now(); // record for potential drag
      }
    }

    touchStart.current = null;
    lastTouch.current = null;
    scrollLastY.current = null;
  }, [stopMoveTimer]);

  const handleKeyPress = useCallback((key: string) => {
    post('/input/key', { key });
  }, []);

  const toggleKeyboard = useCallback(() => {
    if (keyboardOpen.current) {
      inputRef.current?.blur();
      keyboardOpen.current = false;
    } else {
      inputRef.current?.focus();
      keyboardOpen.current = true;
    }
  }, []);

  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const nativeEvent = e.nativeEvent as InputEvent;

    if (nativeEvent.inputType === 'deleteContentBackward') {
      post('/input/key', { key: 'BackSpace' });
    } else if (nativeEvent.data) {
      post('/input/type', { text: nativeEvent.data });
    }

    // Keep input empty
    input.value = '';
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Touchpad */}
      <div
        className="relative border-2 border-border rounded bg-muted/30 select-none"
        style={{ height: '55vh', touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-sm pointer-events-none select-none">
          Touchpad
        </span>
      </div>

      {/* Quick keys */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {QUICK_KEYS.map(({ label, key }) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            font="retro"
            className="shrink-0 text-[10px] px-2 h-8 active:scale-95 transition-transform touch-manipulation"
            onClick={() => handleKeyPress(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Keyboard input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className="sr-only"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onInput={handleInput}
          onBlur={() => { keyboardOpen.current = false; }}
        />
        <Button
          variant="outline"
          font="retro"
          className="flex-1 h-10 text-xs active:scale-95 transition-transform touch-manipulation"
          onClick={toggleKeyboard}
        >
          Keyboard
        </Button>
      </div>
    </div>
  );
}
