# Web UI Development Guide

The Hobbit web UI is a React TypeScript application using the 8bitcn component library for a retro gaming aesthetic.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS
- **8bitcn/ui** - Retro 8-bit styled component library (shadcn-based)
- **react-spring** - Physics-based animations
- **Sonner** - Toast notifications
- **Atari Theme** - Custom oklch color scheme

## Project Structure

```
packages/ui/                     # @hobbit/ui shared design system (workspace package)
├── src/
│   ├── 8bit/                    # 16 pixel-art 8bitcn components
│   │   ├── button.tsx, card.tsx, dialog.tsx, tabs.tsx, badge.tsx,
│   │   │   alert.tsx, skeleton.tsx, spinner.tsx, progress.tsx,
│   │   │   health-bar.tsx, mana-bar.tsx, empty.tsx, toast.tsx, tooltip.tsx,
│   │   │   slider.tsx, switch.tsx
│   │   └── styles/retro.css     # Press Start 2P pixel font
│   ├── base/                    # 11 shadcn base components
│   ├── lib/utils.ts             # cn() utility (clsx + tailwind-merge)
│   └── styles/
│       ├── theme.css            # oklch Atari color variables
│       └── retro.css            # Press Start 2P font face
└── package.json

web/
├── src/
│   ├── components/
│   │   ├── GameLauncher/        # Game launcher components
│   │   │   ├── index.tsx        # Main launcher container
│   │   │   ├── StatusBadge.tsx  # Animated status indicator
│   │   │   ├── AppButton.tsx    # Game launch button with skeleton
│   │   │   ├── AppGrid.tsx      # Grid with skeleton loading
│   │   │   └── ExitButton.tsx   # Exit gaming button
│   │   ├── ui/
│   │   │   └── ConfirmDialog.tsx # Animated confirmation modal
│   │   ├── LightControls.tsx    # Living room lights (uses LightGroupCard)
│   │   ├── LightGroupCard.tsx   # Reusable: toggle + dimmer slider + optional children
│   │   ├── SettingsModal.tsx    # Settings dialog (Stats + System tabs)
│   │   ├── StatsTab.tsx         # System stats (CPU, GPU, RAM, disk, network)
│   │   └── SystemTab.tsx        # Reboot + Controllers (RPG "save slots" UI)
│   ├── hooks/
│   │   ├── useSystemStats.ts   # Custom hook for bridge stats API
│   │   ├── useControllers.ts    # Custom hook for Xbox Wireless Adapter controllers
│   │   └── useLights.ts         # Custom hook for Zigbee light control
│   ├── lib/
│   │   ├── cache.ts             # Module-level cache for persistent data
│   │   └── scroll-lock.ts       # Ref-counted body scroll lock for modals
│   ├── App.tsx                  # Main application (LightControls → GameLauncher)
│   ├── main.tsx                 # Entry point with Toaster
│   └── index.css                # Tailwind imports + app styles
├── tsconfig.json                # TypeScript config
├── vite.config.js               # Vite configuration
└── package.json
```

## 8bitcn Component Library (`@hobbit/ui`)

Components live in a shared workspace package at `packages/ui/`, imported as `@hobbit/ui`. This is a source-level package (no build step) — the web app consumes TypeScript directly.

### Installed Components

| Component | Purpose |
|-----------|---------|
| Button | Pixel-bordered buttons |
| Card | Content containers |
| Dialog | Modal dialogs |
| Tabs | Tabbed interfaces |
| Badge | Status indicators |
| Alert | Error/warning messages |
| Skeleton | Loading placeholders |
| Spinner | Loading spinners |
| Progress | Progress bars |
| Health Bar | Red health-style bar (CPU) |
| Mana Bar | Blue mana-style bar (RAM) |
| Empty | Empty state placeholders |
| Toast | Toast notifications |
| Tooltip | Hover tooltips |
| Slider | Brightness/range input with pixel borders |
| Switch | Toggle switches |

### Using Components

Import 8bit components from `@hobbit/ui/8bit/` and base shadcn components from `@hobbit/ui/base/`:

```tsx
// 8-bit styled versions
import { Button } from '@hobbit/ui/8bit/button';
import { Badge } from '@hobbit/ui/8bit/badge';
import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { Spinner } from '@hobbit/ui/8bit/spinner';
import HealthBar from '@hobbit/ui/8bit/health-bar';
import ManaBar from '@hobbit/ui/8bit/mana-bar';

// Base shadcn components
import { DialogContent } from '@hobbit/ui/base/dialog';

// Utility
import { cn } from '@hobbit/ui/lib/utils';
```

### Font Styling

8bitcn components use the `font="retro"` prop for the Press Start 2P pixel font. For raw HTML elements, use `className="retro"`:

```tsx
// 8bitcn components — use the font prop
<Badge font="retro">Pixel Text</Badge>
<Button font="retro">Click Me</Button>

// Raw HTML elements — use className
<h1 className="retro">Pixel Text</h1>
```

## Skeleton Loading Pattern

Components support a `loading` prop for skeleton states:

```tsx
interface MyComponentProps {
  data?: string;
  loading?: boolean;
}

function MyComponent({ data, loading }: MyComponentProps) {
  if (loading) {
    return <Skeleton className="h-10 w-full" />;
  }
  return <div>{data}</div>;
}
```

### Example: AppButton

```tsx
import { Skeleton } from '@hobbit/ui/8bit/skeleton';
import { Spinner } from '@hobbit/ui/8bit/spinner';
import { Button } from '@hobbit/ui/8bit/button';

interface AppButtonProps {
  appName: string;
  loading?: boolean;      // Shows skeleton
  launching?: boolean;    // Shows spinner
  onClick: () => void;
}

function AppButton({ appName, loading, launching, onClick }: AppButtonProps) {
  if (loading) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <Button onClick={onClick} disabled={launching}>
      {launching ? <Spinner className="size-4" /> : appName}
    </Button>
  );
}
```

## Game-Style Stats Bars

Use 8bitcn gaming bars for system stats:

```tsx
import HealthBar from '@hobbit/ui/8bit/health-bar';
import ManaBar from '@hobbit/ui/8bit/mana-bar';
import { Progress } from '@hobbit/ui/8bit/progress';

// CPU as health (red) - inverted: 100 - usage = remaining "health"
<HealthBar value={100 - cpuUsage} className="h-4" />

// RAM as mana (blue) - inverted: shows free memory
<ManaBar value={freeMemoryPercentage} className="h-4" />

// Disk as progress (purple)
<Progress value={diskUsagePercentage} className="h-4" progressBg="bg-purple-500" />
```

## Toast Notifications

Toast notifications use sonner with 8bitcn styling:

```tsx
import { toast } from '@hobbit/ui/8bit/toast';

// Show a toast
toast('Game launched!');
toast('Error: Failed to connect');
```

## Atari Theme

The UI uses a custom Atari-inspired color scheme with oklch colors.

### CSS Variables (Dark Mode)

```css
.dark {
  --radius: 0rem;                        /* Sharp corners */
  --primary: oklch(0.4 0.2 60);          /* Orange/brown */
  --primary-foreground: oklch(0.9 0 0);
  --background: oklch(0.2 0 0);          /* Dark gray */
  --foreground: oklch(0.9 0 0);          /* Light text */
  --card: oklch(0.4 0 0);
  --destructive: oklch(0.4 0.3 20);      /* Red */
  --accent: oklch(0.4 0.2 60);
  --muted-foreground: oklch(0.7 0 0);
}
```

### Theme Location

Theme variables are defined in `packages/ui/src/styles/theme.css` with both light and dark variants. The web app imports this via `web/src/index.css`.

## Mobile-First Design

### Touch Optimizations

```css
/* In index.css */
button, [role="button"] {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
```

### Large Touch Targets

All interactive elements use minimum h-14 or h-16 for touch:

```tsx
<Button className="w-full h-16 touch-manipulation active:scale-95">
  Launch Game
</Button>
```

### Responsive Breakpoints

```tsx
// Mobile-first: single column, then 2 columns on sm+
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

// Smaller text on mobile
<span className="text-xs sm:text-sm">

// Responsive padding
<div className="p-4 sm:p-6">
```

### Modal Sizing

For mobile-friendly modals:

```tsx
<DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-y-auto">
```

## API Integration

### Vite Proxy Configuration

The dev server proxies API calls to the mini PC:

```js
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://192.168.0.67',
      changeOrigin: true
    }
  }
}
```

### Nginx Production Proxy

In production, nginx handles the proxying:

```nginx
# Bridge API
location /api/control/ {
    proxy_pass http://host.docker.internal:3001/;
}
```

## Bridge API Endpoints

The bridge service (`/api/control/`) provides these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Mode (gaming/idle) + sunshineOnline |
| `/apps` | GET | List available Sunshine apps (cached) |
| `/apps/refresh` | POST | Force refresh of app list cache |
| `/launch-moonlight?app=<name>` | POST | Launch Moonlight streaming an app |
| `/exit-gaming` | POST | Stop gaming mode, turn off monitor (DPMS/HDMI) |
| `/monitor-on` | POST | Turn monitor on (DPMS/HDMI) |
| `/monitor-off` | POST | Turn monitor off (DPMS/HDMI) |
| `/reboot` | POST | Reboot the mini PC |
| `/shutdown` | POST | Shutdown the mini PC |
| `/health` | GET | Health check |
| `/controllers` | GET | Connected Xbox controllers + pairing state |
| `/controllers/pair` | POST | Toggle adapter pairing mode |
| `/lights` | GET | Zigbee light group + individual states + capabilities |
| `/lights/group/set` | POST | Set group state/brightness/color `{ state?, brightness?, color?, color_temp? }` |
| `/lights/:id/set` | POST | Set individual light state/brightness/color `{ state?, brightness?, color?, color_temp? }` |

### App List Caching

The `/apps` endpoint returns a cached list of apps from Sunshine. The cache:
- Lazy-loads on first request
- Auto-refreshes every 5 minutes when stale
- Can be manually refreshed via `/apps/refresh`

This avoids slow API responses since `moonlight list` requires spawning a virtual X display (xvfb).

## Custom Hooks

### useLights

Manages Zigbee light group state with optimistic updates:

```tsx
import { useLights } from '@/hooks/useLights';

function Lights() {
  const {
    connected,     // MQTT connected to Zigbee2MQTT
    reconnecting,  // MQTT reconnecting after idle
    group,         // { state, brightness, brightnessPercent }
    devices,       // [{ id, name, state, brightness, brightnessPercent }]
    capabilities,  // { color: boolean, color_temp: boolean, color_temp_range?: [min, max] }
    loading,       // Initial fetch in progress
    acting,        // API call in flight (show spinner/shimmer)
    toggleGroup,   // Toggle all lights ON/OFF
    toggleLight,   // Toggle individual light by id
    setGroupBrightness, // Set group brightness (0-100 percent)
    setGroupColor,      // Set group color `{ hex: string }`
    setGroupColorTemp,  // Set group color temp (mireds)
  } = useLights();
}
```

**Key patterns:**
- **Quadratic brightness curve**: `toZigbee(percent) = (percent/100)² × 254` — lower slider values map to fine-grained dim control where perception is most sensitive
- **Optimistic updates with cooldown**: All mutations optimistically update local state and set `ignoreUntil = Date.now() + 3000` to suppress poll overwrites while MQTT propagates
- **Acting state**: Tracks in-flight API calls via a ref counter, exposed as `acting` boolean for shimmer/spinner UI feedback

### useSystemStats

Fetches system metrics from the bridge API:

```tsx
import { useSystemStats } from '@/hooks/useSystemStats';

function Stats() {
  const { cpu, gpu, ram, disk, network, loading, error } = useSystemStats(3000);

  if (loading) return <Skeleton className="h-20" />;

  return (
    <div>
      <StatBar label="CPU" value={cpu?.usage ?? 0} />
      <StatBar label="GPU" value={gpu?.usage ?? 0} />
      <StatBar label="RAM" value={ram ? (ram.used / ram.total) * 100 : 0} />
    </div>
  );
}
```

## Development

### Local Development

```bash
cd web
npm install
npm run dev
```

Opens http://localhost:5173 with hot reload.

### Building

```bash
npm run build
```

Output goes to `web/dist/`.

### Deployment

Use the deploy script from the project root:

```bash
./deploy.sh          # Full deploy (everything)
./deploy.sh web      # Web-only: build + copy dist + reload nginx (~25-35s)
```

For a CSS or JS change, `./deploy.sh web` skips bridge restart and docker recreation.

## Animations with react-spring

Use react-spring for smooth, physics-based animations on modals and transitions.

### ConfirmDialog Example

```tsx
import { useTransition, animated, config } from '@react-spring/web';

function ConfirmDialog({ open, onConfirm, onCancel, title }) {
  const transitions = useTransition(open, {
    from: { opacity: 0, scale: 0.9, y: 20 },
    enter: { opacity: 1, scale: 1, y: 0 },
    leave: { opacity: 0, scale: 0.95, y: 10 },
    config: config.stiff,
  });

  return transitions((style, show) =>
    show && (
      <animated.div
        style={{
          opacity: style.opacity,
          transform: style.scale.to(s => `scale(${s}) translateY(${style.y.get()}px)`),
        }}
      >
        {/* Dialog content */}
      </animated.div>
    )
  );
}
```

### Animation Configs

Use appropriate spring configs for different interactions:

```tsx
import { config } from '@react-spring/web';

config.stiff    // Quick, snappy (modals, confirmations)
config.gentle   // Soft, slow (backdrops, fades)
config.wobbly   // Playful bounce (success states)
config.default  // Balanced (general use)
```

### Reusable Components

- `ConfirmDialog` - Animated confirmation modal at `@/components/ui/ConfirmDialog`
- `LightGroupCard` - Toggle + dimmer card for Zigbee light groups at `@/components/LightGroupCard`

### LightGroupCard

A reusable card for any dimmable light group. Header section has a muted background with the group name, toggle switch, and brightness slider, separated from children by a 6px pixel-art border matching the card's outer style.

```tsx
import { LightGroupCard } from '@/components/LightGroupCard';

// Standalone (no children) — just a dimmer card
<LightGroupCard
  name="Bedroom"
  on={bedroomOn}
  brightnessPercent={bedroomBrightness}
  acting={acting}
  onToggle={toggleBedroom}
  onBrightness={setBedroomBrightness}
/>

// With color picker + reconnecting state + individual device switches
<LightGroupCard
  name="Living Room"
  on={groupOn}
  brightnessPercent={group.brightnessPercent}
  acting={acting}
  reconnecting={reconnecting}
  onToggle={toggleGroup}
  onBrightness={setGroupBrightness}
  onColorClick={() => setColorPickerOpen(true)}
>
  {devices.map(d => (
    <div key={d.id} className="flex items-center justify-between">
      <span className="text-xs">{d.name}</span>
      <Switch checked={d.state === 'ON'} onCheckedChange={() => toggle(d.id)} />
    </div>
  ))}
</LightGroupCard>
```

**Props**: `name`, `on`, `brightnessPercent` (0-100), `acting` (shimmer), `reconnecting` (pulsing label), `onToggle`, `onBrightness(percent)`, `onColorClick?` (renders palette icon), `children?`

The slider manages its own local drag state internally — consumers just provide `brightnessPercent` and `onBrightness`.

## Adding New Features

### New Component

1. Check if 8bitcn has the component: https://www.8bitcn.com/docs/components
2. Add the component to `packages/ui/src/8bit/` (or `packages/ui/src/base/` for base shadcn)
3. Import from `@hobbit/ui/8bit/component-name`
4. Add `loading?: boolean` prop for skeleton support if needed

### New Page/Section

1. Create component in `src/components/`
2. Use 8bit components for consistent styling
3. Add `retro` class for pixel font where appropriate
4. Use responsive classes (`sm:`, `md:`) for mobile support
5. Add skeleton loading states with `loading` prop

### New API Integration

1. Add proxy route to `vite.config.js` for development
2. Add nginx location to `files/nginx.conf` for production
3. Create custom hook in `src/hooks/` if data needs polling
