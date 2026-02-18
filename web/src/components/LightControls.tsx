import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@hobbit/ui/8bit/card';
import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { Switch } from '@hobbit/ui/8bit/switch';
import { LightGroupCard } from '@/components/LightGroupCard';
import { ColorPaletteModal } from '@/components/ColorPickerModal';
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
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mx-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </CardContent>
      </Card>
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
    <>
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
          <div className="space-y-3">
            {devices.map(device => {
              const hasDeviceColor = device.supports.color || device.supports.color_temp;
              return (
                <div key={device.id} className="flex items-center justify-between">
                  {hasDeviceColor ? (
                    <button
                      onClick={() => setColorTarget({ type: 'device', id: device.id, name: device.name, supports: device.supports })}
                      className="text-xs touch-manipulation active:scale-95 transition-transform text-left"
                    >
                      {device.name}
                    </button>
                  ) : (
                    <span className="text-xs">{device.name}</span>
                  )}
                  <Switch
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
    </>
  );
}
