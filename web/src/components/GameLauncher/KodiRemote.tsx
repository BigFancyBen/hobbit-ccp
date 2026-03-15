import { useState } from 'react';
import { Button } from '@hobbit/ui/8bit/button';

interface KodiRemoteProps {
  kodiRpc: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
}

export function KodiRemote({ kodiRpc }: KodiRemoteProps) {
  const [typing, setTyping] = useState(false);

  const nav = (method: string) => () => kodiRpc(`Input.${method}`);

  const playerCmd = (action: string, params?: Record<string, unknown>) => () => {
    // Most player commands need the active player ID
    if (action === 'PlayPause' || action === 'Stop') {
      kodiRpc('Player.GetActivePlayers').then((result: any) => {
        const players = result?.result;
        if (players?.length > 0) {
          kodiRpc(`Player.${action}`, { playerid: players[0].playerid });
        }
      });
    } else if (action === 'Seek') {
      kodiRpc('Player.GetActivePlayers').then((result: any) => {
        const players = result?.result;
        if (players?.length > 0) {
          kodiRpc('Player.Seek', { playerid: players[0].playerid, ...params });
        }
      });
    }
  };

  const handleKeyboard = () => {
    const text = prompt('Type text to send to Kodi:');
    if (text) {
      kodiRpc('Input.SendText', { text, done: true });
    }
  };

  const btn = "min-h-[48px] min-w-[48px] touch-manipulation active:scale-95 transition-transform";

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0 mx-2">
      {/* D-Pad */}
      <div className="flex flex-col items-center gap-1">
        <Button variant="default" className={btn} onClick={nav('Up')}>
          <span className="text-lg">&#9650;</span>
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="default" className={btn} onClick={nav('Left')}>
            <span className="text-lg">&#9664;</span>
          </Button>
          <Button variant="default" className={`${btn} px-6`} onClick={nav('Select')}>
            <span className="retro text-xs">OK</span>
          </Button>
          <Button variant="default" className={btn} onClick={nav('Right')}>
            <span className="text-lg">&#9654;</span>
          </Button>
        </div>
        <Button variant="default" className={btn} onClick={nav('Down')}>
          <span className="text-lg">&#9660;</span>
        </Button>
        <Button variant="outline" className={`${btn} mt-1 px-6`} onClick={nav('Back')}>
          <span className="retro text-xs">Back</span>
        </Button>
      </div>

      {/* Media Transport */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" className={btn} onClick={playerCmd('Seek', { value: 'smallbackward' })}>
          <span className="text-base">&#9194;</span>
        </Button>
        <Button variant="outline" className={btn} onClick={playerCmd('PlayPause')}>
          <span className="text-base">&#9199;</span>
        </Button>
        <Button variant="outline" className={btn} onClick={playerCmd('Stop')}>
          <span className="text-base">&#9209;</span>
        </Button>
        <Button variant="outline" className={btn} onClick={playerCmd('Seek', { value: 'smallforward' })}>
          <span className="text-base">&#9193;</span>
        </Button>
      </div>

      {/* Utility Row */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" className={btn} onClick={() => kodiRpc('Application.SetVolume', { volume: 'decrement' })}>
          <span className="retro text-[10px]">Vol-</span>
        </Button>
        <Button variant="outline" className={btn} onClick={() => kodiRpc('Application.SetVolume', { volume: 'increment' })}>
          <span className="retro text-[10px]">Vol+</span>
        </Button>
        <Button variant="outline" className={btn} onClick={nav('Info')}>
          <span className="retro text-[10px]">Info</span>
        </Button>
        <Button variant="outline" className={btn} onClick={nav('Home')}>
          <span className="retro text-[10px]">Home</span>
        </Button>
      </div>

      {/* Keyboard */}
      <Button variant="outline" className={`${btn} w-full`} onClick={handleKeyboard}>
        <span className="retro text-xs">Keyboard</span>
      </Button>
    </div>
  );
}
