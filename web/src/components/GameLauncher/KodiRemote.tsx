import { useRef, useCallback } from 'react';
import { Button } from '@hobbit/ui/8bit/button';
import { setVolume } from '@/lib/volume';

interface KodiRemoteProps {
  kodiRpc: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
}

export function KodiRemote({ kodiRpc }: KodiRemoteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardOpen = useRef(false);

  const nav = (method: string) => () => kodiRpc(`Input.${method}`);

  const withPlayer = (cb: (playerid: number) => void) => {
    kodiRpc('Player.GetActivePlayers').then((result: any) => {
      const players = result?.result;
      if (players?.length > 0) cb(players[0].playerid);
    });
  };

  const playerCmd = (action: string, params?: Record<string, unknown>) => () => {
    withPlayer((playerid) => kodiRpc(`Player.${action}`, { playerid, ...params }));
  };

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
      kodiRpc('Input.Back');
    } else if (nativeEvent.data) {
      kodiRpc('Input.SendText', { text: nativeEvent.data, done: false });
    }

    input.value = '';
  }, [kodiRpc]);

  const btn = "min-h-[48px] landscape:min-h-[36px] w-full touch-manipulation active:scale-95 transition-transform";
  const btnSm = "min-h-[40px] landscape:min-h-[32px] w-full touch-manipulation active:scale-95 transition-transform";

  return (
    <div className="flex-1 min-h-0 flex flex-col ml-2 mr-4">
      <div className="flex flex-col landscape:flex-row flex-1 min-h-0 gap-4 landscape:gap-2 justify-center items-center">
        {/* D-Pad Section */}
        <div className="flex flex-col items-center gap-1 landscape:flex-1">
          <div className="grid grid-cols-3 gap-1 place-items-center">
            <div />
            <Button variant="default" font="retro" className={`${btn} text-sm`} onClick={nav('Up')}>
              &#9650;
            </Button>
            <div />
            <Button variant="default" font="retro" className={`${btn} text-sm`} onClick={nav('Left')}>
              &#9664;
            </Button>
            <Button variant="default" font="retro" className={`${btn} px-6 text-xs`} onClick={nav('Select')}>
              OK
            </Button>
            <Button variant="default" font="retro" className={`${btn} text-sm`} onClick={nav('Right')}>
              &#9654;
            </Button>
            <div />
            <Button variant="default" font="retro" className={`${btn} text-sm`} onClick={nav('Down')}>
              &#9660;
            </Button>
            <div />
          </div>
          <div className="grid grid-cols-2 gap-1 w-full mt-1">
            <Button variant="outline" font="retro" className={`${btn} text-xs`} onClick={nav('Back')}>
              Back
            </Button>
            <Button variant="outline" font="retro" className={`${btn} text-xs`} onClick={nav('ContextMenu')}>
              Menu
            </Button>
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col gap-2 landscape:gap-1 w-full landscape:flex-1">
          {/* Media Transport */}
          <div className="grid grid-cols-5 gap-1">
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={playerCmd('GoTo', { to: 'previous' })}>
              Prev
            </Button>
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={playerCmd('Seek', { value: 'smallbackward' })}>
              {"<<"}
            </Button>
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={playerCmd('PlayPause')}>
              Play
            </Button>
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={playerCmd('Seek', { value: 'smallforward' })}>
              {">>"}
            </Button>
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={playerCmd('GoTo', { to: 'next' })}>
              Next
            </Button>
          </div>

          {/* Volume Row */}
          <div className="grid grid-cols-3 gap-1">
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={() => setVolume({ delta: -10 })}>
              Vol-
            </Button>
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={() => setVolume({ muted: 'toggle' })}>
              Mute
            </Button>
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={() => setVolume({ delta: 10 })}>
              Vol+
            </Button>
          </div>

          {/* Utility Row */}
          <div className="grid grid-cols-3 gap-1">
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={() => kodiRpc('Input.ExecuteAction', { action: 'showsubtitles' })}>
              Sub
            </Button>
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={nav('ShowOSD')}>
              OSD
            </Button>
            <Button variant="outline" font="retro" className={`${btnSm} text-[10px]`} onClick={nav('Home')}>
              Home
            </Button>
          </div>

          {/* Bottom bar — keyboard */}
          <div className="mt-auto pt-2 landscape:pt-1">
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
            <Button variant="outline" font="retro" className={`${btnSm} text-xs`} onClick={toggleKeyboard}>
              Keyboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
