# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hobbit Mini PC Setup — transforms a Peladn mini PC into a hybrid LAN gaming device and silent smart home server. A React SPA communicates through Nginx to a Node.js bridge service running on the host, which manages system stats, Moonlight game streaming, and monitor power.

## Architecture

```
Phone/Browser → Nginx (Docker, port 80/443) → React SPA (static files)
               HTTP (guests) / HTTPS (CA)    → /api/control/* → Bridge (host, port 3001)
                                               → /zigbee/*      → Zigbee2MQTT (Docker, 8080)
                                               → /sb/*          → SilverBullet (Docker, 3000)

Also running: Mosquitto MQTT (Docker, 127.0.0.1:1883), dnsmasq (host), Tailscale (host)
```

LAN serves on both HTTP (port 80, no cert warnings for guests) and HTTPS (port 443, local CA-signed cert). Tailscale uses a valid Let's Encrypt cert. DNS (`resolv.conf`) is protected with `chattr +i` so dnsmasq stays authoritative; Tailscale DNS override is disabled (`--accept-dns=false`).

The bridge runs on the host (not in Docker) because it needs direct access to `/proc`, X11, HDMI control, and other system-level operations.

## Commands

### Web Frontend (from `web/`)
```bash
npm install          # Install dependencies
npm run dev          # Vite dev server on :5173, proxies /api to 192.168.0.67
npm run build        # Production build → web/dist/
```

### Deployment (from project root, Git Bash on Windows)
```bash
./deploy.sh          # Full deploy (default) — deps, build, everything
./deploy.sh web      # Build web UI + copy to remote + reload nginx (~25-35s)
./deploy.sh bridge   # Copy bridge files + npm install + restart bridge (~20-30s)
./deploy.sh docker   # Sync docker/nginx/mqtt configs + recreate containers (~15-25s)
```

### Manual Ansible (from WSL)
```bash
ansible-playbook playbooks/setup.yml -i inventory.ini   # First-time full setup
ansible-playbook playbooks/deploy.yml -i inventory.ini   # Config updates + restart
```

There are no tests or linting configured.

## Key Directories

- `packages/ui/` — `@hobbit/ui` shared design system (source-level, no build step)
  - `src/8bit/` — 16 pixel-art 8bitcn components (incl. slider, switch)
  - `src/base/` — 11 shadcn base components (incl. slider, switch)
  - `src/lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
  - `src/styles/` — `theme.css` (oklch Atari color vars), `retro.css` (Press Start 2P font)
- `web/src/` — React 18 + TypeScript + Vite + Tailwind v4 frontend
- `files/bridge.js` — Express backend (single file, ~1560 lines), deployed to mini PC
- `files/silverbullet/` — SilverBullet theme (STYLES.md deployed to space/)
- `files/` — All config files deployed by Ansible (docker-compose, nginx, systemd, etc.)
- `roles/` — Ansible roles (base, security, tailscale, dns, moonlight, zigbee, webserver)
- `playbooks/` — Ansible playbooks (setup.yml for first-time, deploy.yml for updates)
- `docs/` — Detailed docs on bridge API, DNS, security, troubleshooting

## Frontend Conventions

**Component library**: 8bitcn (pixel-art themed, shadcn-based) in `@hobbit/ui`. Import from `@hobbit/ui/8bit/` (e.g., `import { Button } from '@hobbit/ui/8bit/button'`). Base shadcn components are at `@hobbit/ui/base/`. These components extend ~6px outside their bounds — use `mx-2` on content containers and `overflow-x-hidden` on scroll containers to prevent clipping.

**Styling**: Tailwind v4 with a custom Atari oklch color theme in `packages/ui/src/styles/theme.css` (imported by `web/src/index.css`). Mobile-first responsive design. Use `font="retro"` prop for Press Start 2P pixel font on 8bitcn components.

**Animations**: react-spring. Use `useTransition` for enter/leave (modals, tabs), not imperative `useSpring`. Track `prevTabIndexRef` for directional tab slides. Reserve `api.set()`/`api.start()` for values computed dynamically at event time.

**Module-level caching** (`web/src/lib/cache.ts`): Simple Map-based cache outside React lifecycle. Initialize `useState` from cache to prevent skeleton flash on remount. Update cache on successful fetch.

**Data fetching**: Custom hooks (`useSystemStats`, `useLights`, `useControllers`) poll the bridge API at intervals. All polling hooks gate on tab visibility (`document.visibilitychange`) — polling stops when the tab is hidden and resumes on return. The SSE connection (`useTunes`) also disconnects on hidden and reconnects with retry on visible. The bridge uses a "lazy monitoring" pattern — expensive background work (stats collection, Sunshine reachability checks, MQTT connections) only runs when recently requested and auto-stops after 30s idle. Bridge POST endpoints that need MQTT use `ensureMqttConnected()` to wait up to 5s for a sleeping connection to establish, so the first command after idle works transparently.

**Optimistic updates with cooldown**: Hooks that mutate server state (e.g., `useLights`) use optimistic updates paired with an `ignoreUntil` ref that suppresses poll overwrites for 3 seconds after user actions. This prevents stale server state from snapping the UI back before MQTT/Zigbee confirms the change. On fetch error (non-`ok` response or network failure), the optimistic state is reverted to `prevData`, `ignoreUntil` is cleared so the next poll can resync, and a toast ("Zigbee unavailable — try again") is shown via `@hobbit/ui/8bit/toast`.

**Reusable components**: `LightGroupCard` (`web/src/components/LightGroupCard.tsx`) — a card with a toggle switch, dimmer slider, optional palette button, and optional children for individual device controls. Used for Zigbee light groups. The slider uses local state during drag (`onValueChange`) and commits on release (`onValueCommit`). Brightness uses a quadratic curve (`percent² × 254`) so the slider spends more range on dim values where perceived brightness changes the most. Optional `onColorClick` prop renders a pixel-art palette icon for color control. When Zigbee is reconnecting, `LightControls` renders a full-screen "Tap to connect" overlay (calls `refetch()` on tap) instead of per-card labels.

**Color picker**: `ColorPickerModal` (`web/src/components/ColorPickerModal.tsx`) — portal modal with curated color swatches and warmth presets. The bridge stores `color_hex` (the hex we *sent*) on each device so the modal can highlight the active swatch on reopen — MQTT only echoes CIE xy which can't round-trip to hex. Setting `color_temp` clears `color_hex` and vice versa, both server-side and via optimistic updates. Color selections also force brightness (254 for hex colors, 3 for warmth presets) so the effect is immediately visible. Selected swatches get a yellow outline (`border-yellow-400 ring-2`). Uses `useTransition` + backdrop + pixel border pattern.

**Auto-off timer**: `TimerModal` (`web/src/components/TimerModal.tsx`) — portal modal for switched outlets (non-color devices like smart plugs). Tap the device name to open; 6 duration presets (15m–8hr) in a 2-column grid. Selecting a preset turns the device ON and sets a bridge-side `setTimeout` that publishes `{ state: 'OFF' }` via MQTT when it expires. The bridge tracks timers in a `deviceTimers` Map and exposes `timer: { endsAt }` in `GET /lights`. The frontend shows a live countdown (`TimerCountdown` component in `LightControls.tsx`) using a client-side `setInterval(1000)` — no extra polling. Timers auto-cancel when the device turns OFF (manual toggle, group toggle, or timer expiry echo).

## Bridge API

All endpoints are under `/api/control/` in production (Nginx proxy strips the prefix). In the bridge code, routes are registered at root (`/health`, `/status`, `/cpu-stats`, etc.).

Key endpoints: `/health`, `/status` (mode + sunshineOnline), `/apps` (cached game list), `/apps/refresh`, `/launch-moonlight?app=X`, `/exit-gaming`, `/cpu-stats`, `/gpu-stats`, `/ram-stats`, `/disk-stats`, `/net-stats`, `/monitor-on`, `/monitor-off`, `/reboot`, `/shutdown`, `/lights` (Zigbee group state + capabilities + per-device `color_hex`/`color_temp` + `timer`), `/lights/group/set` (accepts `state`, `brightness`, `color`, `color_temp`), `/lights/:id/set`, `/lights/:id/timer` (set/cancel auto-off timer `{ duration: <minutes> }`), `/controllers` (Xbox controller dongle + connected controllers).

## Deployment Flow

`deploy.sh` accepts an optional target argument (`web`, `bridge`, `docker`, or no argument for full). All builds happen on the server — `deploy.sh web` syncs source files (root workspace, `packages/ui/`, `web/`) to `{{ hobbit_dir }}/webapp/` via rsync, runs `npm install` + `npm run build` remotely, then reloads nginx. The server maintains its own `package-lock.json` (the Windows-generated one is not synced, since platform-specific optional deps like rollup binaries differ). Targeted deploys use Ansible `--tags` to run only the relevant subset.

The dev proxy in `web/vite.config.js` points to the real mini PC at `192.168.0.67`, so `npm run dev` talks to the live bridge.

## Infrastructure Config

- `inventory.ini` — Target host: hobbit at 192.168.0.67
- `group_vars/all.yml` — Gaming PC IP (192.168.0.69), timezone, paths, LAN subnet, `tailscale_fqdn`
- `docker-compose.yml` (in `files/`) — Nginx, Mosquitto, Zigbee2MQTT, SilverBullet containers
- `nginx.conf` — Jinja2 template: SPA routing, API proxy, DNS rebinding protection, Tailscale HTTPS server block
- `hobbit-bridge.service` — Systemd unit for the bridge (auto-restart, runs as hobbit user)
