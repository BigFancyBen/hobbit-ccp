import { useState } from 'react';
import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { Switch } from '@hobbit/ui/8bit/switch';
import { LightGroupCard } from '@/components/LightGroupCard';
import { ColorPaletteModal, miredsToApproxColor } from '@/components/ColorPickerModal';
import { useLights } from '@/hooks/useLights';

type ColorTarget =
  | { type: 'group'; supports: { color: boolean; color_temp: boolean } }
  | { type: 'device'; id: string; name: string; supports: { color: boolean; color_temp: boolean } };

export function LightControls() {
  const {
    reconnecting,
    capabilities,
    group,
    devices,
    loading,
    acting,
    toggleGroup,
    toggleLight,
    setGroupBrightness,
    setGroupColor,
    setGroupColorTemp,
    setLightColor,
    setLightColorTemp,
  } = useLights();

  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const hasColorControls = capabilities.color || capabilities.color_temp;

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

  const groupOn = group?.state === 'ON';

  const modalTitle = colorTarget?.type === 'group' ? 'Living Room' : colorTarget?.type === 'device' ? colorTarget.name : '';
  const modalColorHex = colorTarget?.type === 'group'
    ? (group?.color_hex ?? null)
    : colorTarget?.type === 'device'
      ? (devices.find(d => d.id === colorTarget.id)?.color_hex ?? null)
      : null;
  const modalColorTemp = colorTarget?.type === 'group'
    ? (group?.color_temp ?? null)
    : colorTarget?.type === 'device'
      ? (devices.find(d => d.id === colorTarget.id)?.color_temp ?? null)
      : null;

  return (
    <div className="overflow-y-auto">
      <LightGroupCard
        name="Living Room"
        on={groupOn}
        brightnessPercent={group?.brightnessPercent ?? 0}
        reconnecting={reconnecting}
        acting={acting}
        onToggle={toggleGroup}
        onBrightness={setGroupBrightness}
        onColorClick={hasColorControls ? () => setColorTarget({ type: 'group', supports: capabilities }) : undefined}
      >
        {devices.length > 0 && (
          <div>
            {devices.map(device => {
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
                    <span className="text-xs retro">{device.name}</span>
                  )}
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

      <ColorPaletteModal
        open={colorTarget !== null}
        onClose={() => setColorTarget(null)}
        title={modalTitle}
        supports={colorTarget?.supports ?? { color: false, color_temp: false }}
        currentColorHex={modalColorHex}
        currentColorTemp={modalColorTemp}
        onColorChange={(hex) => {
          if (!colorTarget) return;
          if (colorTarget.type === 'group') setGroupColor(hex);
          else setLightColor(colorTarget.id, hex);
        }}
        onColorTempChange={(mireds) => {
          if (!colorTarget) return;
          if (colorTarget.type === 'group') setGroupColorTemp(mireds);
          else setLightColorTemp(colorTarget.id, mireds);
        }}
      />
    </div>
  );
}
