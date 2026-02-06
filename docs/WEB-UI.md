# Web UI Development Guide

The Hobbit web UI is a React TypeScript application using the 8bitcn component library for a retro gaming aesthetic.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS
- **8bitcn/ui** - Retro 8-bit styled component library (shadcn-based)
- **Atari Theme** - Custom oklch color scheme

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── 8bit/           # 8bitcn components (from registry)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   └── styles/
│   │   │   │       └── retro.css
│   │   │   ├── button.tsx      # Base shadcn components
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── tabs.tsx
│   │   ├── SettingsModal.tsx   # Settings dialog with tabs
│   │   ├── StatsTab.tsx        # Netdata system stats
│   │   └── SystemTab.tsx       # Reboot controls
│   ├── hooks/
│   │   └── useNetdataStats.ts  # Custom hook for Netdata API
│   ├── lib/
│   │   └── utils.ts            # shadcn utility functions
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind + Atari theme
├── components.json             # shadcn/8bitcn configuration
├── tsconfig.json               # TypeScript config
├── vite.config.js              # Vite configuration
└── package.json
```

## 8bitcn Component Library

We use the official 8bitcn registry for retro-styled components.

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
// Correct - uses 8-bit styled version
import { Button } from '@/components/ui/8bit/button';
import { Card, CardContent } from '@/components/ui/8bit/card';
import { Dialog, DialogContent } from '@/components/ui/8bit/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/8bit/tabs';

// Base shadcn (no 8-bit styling)
import { Button } from '@/components/ui/button';
```

### Font Styling

The `retro` class applies the Press Start 2P pixel font:

```tsx
<h1 className="retro">Pixel Text</h1>
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

## Responsive Design

### Breakpoints

Use Tailwind's responsive prefixes:

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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p>CPU: {cpu?.usage}%</p>
      <p>RAM: {ram?.used} / {ram?.total} GB</p>
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

## Adding New Features

### New Component

1. Check if 8bitcn has the component: https://www.8bitcn.com/docs/components
2. Install via registry: `npx shadcn@latest add @8bitcn/component-name`
3. Import from `@/components/ui/8bit/component-name`

### New Page/Section

1. Create component in `src/components/`
2. Use 8bit components for consistent styling
3. Add `retro` class for pixel font where appropriate
4. Use responsive classes (`sm:`, `md:`) for mobile support

### New API Integration

1. Add proxy route to `vite.config.js` for development
2. Add nginx location to `files/nginx.conf` for production
3. Create custom hook in `src/hooks/` if data needs polling
