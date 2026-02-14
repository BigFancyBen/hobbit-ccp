import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@hobbit/ui/8bit/card';
import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { Switch } from '@hobbit/ui/8bit/switch';
import { LightGroupCard } from '@/components/LightGroupCard';
import { ColorPickerModal } from '@/components/ColorPickerModal';
import { useLights } from '@/hooks/useLights';

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
  } = useLights();

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
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
        onColorClick={hasColorControls ? () => setColorPickerOpen(true) : undefined}
      >
        {devices.length > 0 && (
          <div className="space-y-3">
            {devices.map(device => (
              <div key={device.id} className="flex items-center justify-between">
                <span className="text-xs">{device.name}</span>
                <Switch
                  checked={device.state === 'ON'}
                  onCheckedChange={() => toggleLight(device.id)}
                />
              </div>
            ))}
          </div>
        )}
      </LightGroupCard>

      <ColorPickerModal
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        capabilities={capabilities}
        currentColorTemp={group?.color_temp ?? null}
        onColorChange={setGroupColor}
        onColorTempChange={setGroupColorTemp}
      />
    </>
  );
}
