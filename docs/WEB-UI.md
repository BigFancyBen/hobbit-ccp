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
web/
├── src/
│   ├── components/
│   │   ├── GameLauncher/       # Game launcher components
│   │   │   ├── index.tsx       # Main launcher container
│   │   │   ├── StatusBadge.tsx # Animated status indicator
│   │   │   ├── AppButton.tsx   # Game launch button with skeleton
│   │   │   ├── AppGrid.tsx     # Grid with skeleton loading
│   │   │   └── ExitButton.tsx  # Exit gaming button
│   │   ├── Stats/              # System stats components
│   │   │   ├── index.tsx       # Exports all stats components
│   │   │   ├── CpuBar.tsx      # HealthBar wrapper for CPU
│   │   │   ├── RamBar.tsx      # ManaBar wrapper for RAM
│   │   │   ├── DiskBar.tsx     # Progress bar for disk
│   │   │   └── NetworkBadges.tsx # Network up/down badges
│   │   ├── ui/
│   │   │   ├── 8bit/           # 8bitcn components (from registry)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── alert.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── spinner.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── health-bar.tsx
│   │   │   │   ├── mana-bar.tsx
│   │   │   │   ├── empty.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   └── styles/
│   │   │   │       └── retro.css
│   │   │   └── *.tsx           # Base shadcn components
│   │   ├── SettingsModal.tsx   # Settings dialog with tabs
│   │   ├── StatsTab.tsx        # Netdata system stats
│   │   └── SystemTab.tsx       # Reboot controls
│   ├── hooks/
│   │   └── useNetdataStats.ts  # Custom hook for Netdata API
│   ├── lib/
│   │   └── utils.ts            # shadcn utility functions
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # Entry point with Toaster
│   └── index.css               # Tailwind + Atari theme
├── components.json             # shadcn/8bitcn configuration
├── tsconfig.json               # TypeScript config
├── vite.config.js              # Vite configuration
└── package.json
```

## 8bitcn Component Library

We use the official 8bitcn registry for retro-styled components.

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

### Adding Components

```bash
# Add a single component
npx shadcn@latest add @8bitcn/button

# Add multiple components
npx shadcn@latest add @8bitcn/dialog @8bitcn/tabs @8bitcn/card
```

### Registry Configuration

The `components.json` configures the 8bitcn registry:

```json
{
  "tsx": true,
  "registries": {
    "@8bitcn": "https://www.8bitcn.com/r/{name}.json"
  }
}
```

### Using Components

Always import from the 8bit subdirectory for retro styling:

```tsx
// 8-bit styled versions
import { Button } from '@/components/ui/8bit/button';
import { Badge } from '@/components/ui/8bit/badge';
import { Skeleton } from '@/components/ui/8bit/skeleton';
import { Spinner } from '@/components/ui/8bit/spinner';
import HealthBar from '@/components/ui/8bit/health-bar';
import ManaBar from '@/components/ui/8bit/mana-bar';
```

### Font Styling

The `retro` class applies the Press Start 2P pixel font:

```tsx
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
import { Skeleton } from '@/components/ui/8bit/skeleton';
import { Spinner } from '@/components/ui/8bit/spinner';
import { Button } from '@/components/ui/8bit/button';

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
import HealthBar from '@/components/ui/8bit/health-bar';
import ManaBar from '@/components/ui/8bit/mana-bar';
import { Progress } from '@/components/ui/8bit/progress';

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
import { toast } from '@/components/ui/8bit/toast';

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

Theme variables are defined in `src/index.css` with both light and dark variants.

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
    },
    '/netdata': {
      target: 'http://192.168.0.67:19999',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/netdata/, '/api/v1')
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

# Netdata stats
location /netdata/ {
    proxy_pass http://netdata:19999/api/v1/;
}
```

## Bridge API Endpoints

The bridge service (`/api/control/`) provides these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Gaming mode status (idle/gaming) |
| `/apps` | GET | List available Sunshine apps (cached) |
| `/apps/refresh` | POST | Force refresh of app list cache |
| `/launch-moonlight?app=<name>` | POST | Launch Moonlight streaming an app |
| `/exit-gaming` | POST | Stop gaming mode, turn off monitor |
| `/monitor-on` | POST | Turn monitor on |
| `/monitor-off` | POST | Turn monitor off |
| `/reboot` | POST | Reboot the mini PC |
| `/shutdown` | POST | Shutdown the mini PC |
| `/health` | GET | Health check |

### App List Caching

The `/apps` endpoint returns a cached list of apps from Sunshine. The cache:
- Refreshes on bridge startup
- Auto-refreshes every 5 minutes
- Can be manually refreshed via `/apps/refresh`

This avoids slow API responses since `moonlight list` requires spawning a virtual X display (xvfb).

## Custom Hooks

### useNetdataStats

Fetches system metrics from Netdata:

```tsx
import { useNetdataStats } from '@/hooks/useNetdataStats';

function Stats() {
  const { cpu, ram, disk, network, loading, error } = useNetdataStats(3000);

  if (loading) return <Skeleton className="h-20" />;

  return (
    <div>
      <CpuBar usage={cpu?.usage} />
      <RamBar used={ram?.used} total={ram?.total} />
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

Use the unified deploy script from the project root:

```bash
./deploy.sh
```

This builds the web UI and deploys via Ansible.

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

## Adding New Features

### New Component

1. Check if 8bitcn has the component: https://www.8bitcn.com/docs/components
2. Install via registry: `npx shadcn@latest add @8bitcn/component-name`
3. Import from `@/components/ui/8bit/component-name`
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
