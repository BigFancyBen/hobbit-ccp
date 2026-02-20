import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { Switch } from '@hobbit/ui/8bit/switch';
import { LightGroupCard } from '@/components/LightGroupCard';
import { ColorPaletteModal, miredsToApproxColor } from '@/components/ColorPickerModal';
import { TimerModal } from '@/components/TimerModal';
import { useLights } from '@/hooks/useLights';

type ColorTarget =
  | { type: 'group'; groupName: string; supports: { color: boolean; color_temp: boolean } }
  | { type: 'device'; id: string; name: string; supports: { color: boolean; color_temp: boolean } };

function TimerCountdown({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt - Date.now()));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(Math.max(0, endsAt - Date.now()));
    intervalRef.current = setInterval(() => {
      const r = Math.max(0, endsAt - Date.now());
      setRemaining(r);
      if (r <= 0 && intervalRef.current) clearInterval(intervalRef.current);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [endsAt]);

  if (remaining <= 0) return null;

  const totalSec = Math.ceil(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const display = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;

  return <span className="text-[9px] text-muted-foreground tabular-nums retro">{display}</span>;
}

// Capitalize group names for display (e.g. "livingroom" → "Living Room")
const GROUP_LABELS: Record<string, string> = {
  livingroom: 'Living Room',
  kitchen: 'Kitchen',
  office: 'Office',
};

function groupLabel(name: string) {
  return GROUP_LABELS[name] || name.charAt(0).toUpperCase() + name.slice(1);
}

export function LightControls() {
  const {
    reconnecting,
    groups,
    ungrouped,
    loading,
    acting,
    toggleGroup,
    toggleLight,
    setGroupBrightness,
    setGroupColor,
    setGroupColorTemp,
    setLightColor,
    setLightColorTemp,
    setTimer,
    cancelTimer,
  } = useLights();

  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [timerTarget, setTimerTarget] = useState<{ id: string; name: string } | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  // Find device for color picker modal across all groups + ungrouped
  const allDevices = [...groups.flatMap(g => g.devices), ...ungrouped];

  const modalTitle = colorTarget?.type === 'group'
    ? groupLabel(colorTarget.groupName)
    : colorTarget?.type === 'device' ? colorTarget.name : '';
  const modalColorHex = colorTarget?.type === 'group'
    ? (groups.find(g => g.name === colorTarget.groupName)?.color_hex ?? null)
    : colorTarget?.type === 'device'
      ? (allDevices.find(d => d.id === colorTarget.id)?.color_hex ?? null)
      : null;
  const modalColorTemp = colorTarget?.type === 'group'
    ? (groups.find(g => g.name === colorTarget.groupName)?.color_temp ?? null)
    : colorTarget?.type === 'device'
      ? (allDevices.find(d => d.id === colorTarget.id)?.color_temp ?? null)
      : null;

  // Find timer target device
  const timerDevice = timerTarget ? allDevices.find(d => d.id === timerTarget.id) : null;

  return (
    <div className="overflow-y-auto space-y-3">
      {groups.map(group => {
        const hasColorControls = group.capabilities.color || group.capabilities.color_temp;
        const groupOn = group.state === 'ON';

        return (
          <LightGroupCard
            key={group.name}
            name={groupLabel(group.name)}
            on={groupOn}
            brightnessPercent={group.brightnessPercent}
            reconnecting={reconnecting}
            acting={acting}
            onToggle={() => toggleGroup(group.name)}
            onBrightness={(pct) => setGroupBrightness(group.name, pct)}
            onColorClick={hasColorControls ? () => setColorTarget({ type: 'group', groupName: group.name, supports: group.capabilities }) : undefined}
          >
            {group.devices.length > 0 && (
              <div>
                {group.devices.map(device => {
                  const hasDeviceColor = device.supports.color || device.supports.color_temp;
                  return (
                    <div key={device.id} className="flex items-center gap-2 py-2 border-b border-dashed border-muted-foreground/20 last:border-b-0">
                      <span
                        className={`inline-block size-2 shrink-0 ${device.state !== 'ON' ? 'bg-muted-foreground/40' : ''}`}
                        style={device.state === 'ON' ? {
                          backgroundColor: device.color_hex ?? (device.color_temp ? miredsToApproxColor(device.color_temp) : '#FFC58F'),
                        } : undefined}
                      />
                      {hasDeviceColor ? (
                        <button
                          onClick={() => setColorTarget({ type: 'device', id: device.id, name: device.name, supports: device.supports })}
                          className="text-xs retro touch-manipulation active:scale-95 transition-transform text-left"
                        >
                          {device.name}
                        </button>
                      ) : (
                        <button
                          onClick={() => setTimerTarget({ id: device.id, name: device.name })}
                          className="text-xs retro touch-manipulation active:scale-95 transition-transform text-left"
                        >
                          {device.name}
                        </button>
                      )}
                      {device.timer && <TimerCountdown endsAt={device.timer.endsAt} />}
                      <Switch
                        className="ml-auto"
                        checked={device.state === 'ON'}
                        onCheckedChange={() => toggleLight(device.id)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </LightGroupCard>
        );
      })}

      {/* Ungrouped lights */}
      {ungrouped.length > 0 && (
        <div className="mx-2">
          {ungrouped.map(device => (
            <div key={device.id} className="flex items-center gap-2 py-2 border-b border-dashed border-muted-foreground/20 last:border-b-0">
              <span
                className={`inline-block size-2 shrink-0 ${device.state !== 'ON' ? 'bg-muted-foreground/40' : ''}`}
                style={device.state === 'ON' ? {
                  backgroundColor: device.color_hex ?? (device.color_temp ? miredsToApproxColor(device.color_temp) : '#FFC58F'),
                } : undefined}
              />
              <button
                onClick={() => {
                  const hasColor = device.supports.color || device.supports.color_temp;
                  if (hasColor) {
                    setColorTarget({ type: 'device', id: device.id, name: device.name, supports: device.supports });
                  } else {
                    setTimerTarget({ id: device.id, name: device.name });
                  }
                }}
                className="text-xs retro touch-manipulation active:scale-95 transition-transform text-left"
              >
                {device.name}
              </button>
              {device.timer && <TimerCountdown endsAt={device.timer.endsAt} />}
              <Switch
                className="ml-auto"
                checked={device.state === 'ON'}
                onCheckedChange={() => toggleLight(device.id)}
              />
            </div>
          ))}
        </div>
      )}

      <ColorPaletteModal
        open={colorTarget !== null}
        onClose={() => setColorTarget(null)}
        title={modalTitle}
        supports={colorTarget?.supports ?? { color: false, color_temp: false }}
        currentColorHex={modalColorHex}
        currentColorTemp={modalColorTemp}
        onColorChange={(hex) => {
          if (!colorTarget) return;
          if (colorTarget.type === 'group') setGroupColor(colorTarget.groupName, hex);
          else setLightColor(colorTarget.id, hex);
        }}
        onColorTempChange={(mireds) => {
          if (!colorTarget) return;
          if (colorTarget.type === 'group') setGroupColorTemp(colorTarget.groupName, mireds);
          else setLightColorTemp(colorTarget.id, mireds);
        }}
      />

      <TimerModal
        open={timerTarget !== null}
        onClose={() => setTimerTarget(null)}
        deviceName={timerTarget?.name ?? ''}
        activeTimer={timerDevice?.timer ?? null}
        onSetTimer={(minutes) => { if (timerTarget) setTimer(timerTarget.id, minutes); }}
        onCancelTimer={() => { if (timerTarget) cancelTimer(timerTarget.id); }}
      />
    </div>
  );
}
