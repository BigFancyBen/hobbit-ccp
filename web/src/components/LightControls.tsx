import { Card, CardContent, CardHeader } from '@hobbit/ui/8bit/card';
import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { Switch } from '@hobbit/ui/8bit/switch';
import { LightGroupCard } from '@/components/LightGroupCard';
import { useLights } from '@/hooks/useLights';

export function LightControls() {
  const {
    connected,
    group,
    devices,
    loading,
    acting,
    toggleGroup,
    toggleLight,
    setGroupBrightness,
  } = useLights();

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
    <LightGroupCard
      name="Living Room"
      on={groupOn}
      brightnessPercent={group?.brightnessPercent ?? 0}
      disabled={!connected}
      acting={acting}
      onToggle={toggleGroup}
      onBrightness={setGroupBrightness}
    >
      {devices.length > 0 && (
        <div className="space-y-3">
          {devices.map(device => (
            <div key={device.id} className="flex items-center justify-between">
              <span className="text-xs">{device.name}</span>
              <Switch
                checked={device.state === 'ON'}
                onCheckedChange={() => toggleLight(device.id)}
                disabled={!connected}
              />
            </div>
          ))}
        </div>
      )}
    </LightGroupCard>
  );
}
