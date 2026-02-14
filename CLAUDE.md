# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hobbit Mini PC Setup — transforms a Peladn mini PC into a hybrid LAN gaming device and silent smart home server. A React SPA communicates through Nginx to a Node.js bridge service running on the host, which manages system stats, Moonlight game streaming, Xbox Wireless Adapter controllers, and monitor power.

## Architecture

```
Phone/Browser → Nginx (Docker, port 80/443) → React SPA (static files)
                                             → /api/control/* → Bridge (host, port 3001)
                                             → /zigbee/*      → Zigbee2MQTT (Docker, 8080)
                                             → /sb/*          → SilverBullet (Docker, 3000)

Also running: Mosquitto MQTT (Docker, 127.0.0.1:1883), dnsmasq (host), Tailscale (host)
```

The bridge runs on the host (not in Docker) because it needs direct access to `/proc`, X11, Xbox Wireless Adapter (xone driver), HDMI control, and other system-level operations.

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
- `files/bridge.js` — Express backend (single file, ~1000 lines), deployed to mini PC
- `files/silverbullet/` — SilverBullet theme (STYLES.md deployed to space/)
- `files/` — All config files deployed by Ansible (docker-compose, nginx, systemd, etc.)
- `roles/` — Ansible roles (base, security, tailscale, dns, moonlight, zigbee, webserver)
- `playbooks/` — Ansible playbooks (setup.yml for first-time, deploy.yml for updates)
- `docs/` — Detailed docs on bridge API, controllers, DNS, security, troubleshooting

## Frontend Conventions

**Component library**: 8bitcn (pixel-art themed, shadcn-based) in `@hobbit/ui`. Import from `@hobbit/ui/8bit/` (e.g., `import { Button } from '@hobbit/ui/8bit/button'`). Base shadcn components are at `@hobbit/ui/base/`. These components extend ~6px outside their bounds — use `mx-2` on content containers and `overflow-x-hidden` on scroll containers to prevent clipping.

**Styling**: Tailwind v4 with a custom Atari oklch color theme in `packages/ui/src/styles/theme.css` (imported by `web/src/index.css`). Mobile-first responsive design. Use `font="retro"` prop for Press Start 2P pixel font on 8bitcn components.

**Animations**: react-spring. Use `useTransition` for enter/leave (modals, tabs), not imperative `useSpring`. Track `prevTabIndexRef` for directional tab slides. Reserve `api.set()`/`api.start()` for values computed dynamically at event time.

**Module-level caching** (`web/src/lib/cache.ts`): Simple Map-based cache outside React lifecycle. Initialize `useState` from cache to prevent skeleton flash on remount. Update cache on successful fetch.

**Data fetching**: Custom hooks (`useSystemStats`, `useControllers`, `useLights`) poll the bridge API at intervals. Only `useLights` gates polling on tab visibility (`document.visibilitychange`). The bridge uses a "lazy monitoring" pattern — expensive background work (stats collection, Sunshine reachability checks, MQTT connections) only runs when recently requested and auto-stops after 30s idle. Bridge POST endpoints that need MQTT use `ensureMqttConnected()` to wait up to 5s for a sleeping connection to establish, so the first command after idle works transparently.

**Optimistic updates with cooldown**: Hooks that mutate server state (e.g., `useLights`) use optimistic updates paired with an `ignoreUntil` ref that suppresses poll overwrites for 3 seconds after user actions. This prevents stale server state from snapping the UI back before MQTT/Zigbee confirms the change. On fetch error (non-`ok` response or network failure), the optimistic state is reverted to `prevData` and `ignoreUntil` is cleared so the next poll can resync.

**Reusable components**: `LightGroupCard` (`web/src/components/LightGroupCard.tsx`) — a card with a toggle switch, dimmer slider, optional palette button, and optional children for individual device controls. Used for Zigbee light groups. The slider uses local state during drag (`onValueChange`) and commits on release (`onValueCommit`). Brightness uses a quadratic curve (`percent² × 254`) so the slider spends more range on dim values where perceived brightness changes the most. Optional `onColorClick` prop renders a pixel-art palette icon for color control. Optional `reconnecting` prop shows a pulsing "Connecting..." label next to the title.

**Color picker**: `ColorPickerModal` (`web/src/components/ColorPickerModal.tsx`) — portal modal with `react-colorful` hex picker (300ms debounce) and/or color temp slider (mired range from device capabilities). Only shown when the light group has color-capable devices. Uses same `useTransition` + backdrop + pixel border pattern as `ConfirmDialog`. CSS in `index.css` removes border-radius from react-colorful for 8-bit consistency.

## Bridge API

All endpoints are under `/api/control/` in production (Nginx proxy strips the prefix). In the bridge code, routes are registered at root (`/health`, `/status`, `/cpu-stats`, etc.).

Key endpoints: `/health`, `/status` (mode + sunshineOnline), `/apps` (cached game list), `/apps/refresh`, `/launch-moonlight?app=X`, `/exit-gaming`, `/cpu-stats`, `/gpu-stats`, `/ram-stats`, `/disk-stats`, `/net-stats`, `/monitor-on`, `/monitor-off`, `/reboot`, `/shutdown`, `/lights` (Zigbee group state + capabilities + per-device color support), `/lights/group/set` (accepts `state`, `brightness`, `color`, `color_temp`), `/lights/:id/set`, `/controllers`, `/controllers/pair`.

## Deployment Flow

`deploy.sh` accepts an optional target argument (`web`, `bridge`, `docker`, or no argument for full). A full deploy installs workspace dependencies, builds the web UI, then runs `ansible-playbook playbooks/deploy.yml` which copies files to the mini PC at 192.168.0.67 (`hobbit_dir: /home/hobbit/hobbit`), runs `npm install` for the bridge, restarts Docker services and the bridge systemd unit, then verifies health. Targeted deploys use Ansible `--tags` to run only the relevant subset of tasks (e.g., `./deploy.sh web` only copies web dist and reloads nginx).

The dev proxy in `web/vite.config.js` points to the real mini PC at `192.168.0.67`, so `npm run dev` talks to the live bridge.

## Infrastructure Config

- `inventory.ini` — Target host: hobbit at 192.168.0.67
- `group_vars/all.yml` — Gaming PC IP (192.168.0.69), timezone, paths, LAN subnet, `tailscale_fqdn`
- `docker-compose.yml` (in `files/`) — Nginx, Mosquitto, Zigbee2MQTT, SilverBullet containers
- `nginx.conf` — Jinja2 template: SPA routing, API proxy, DNS rebinding protection, Tailscale HTTPS server block
- `hobbit-bridge.service` — Systemd unit for the bridge (auto-restart, runs as hobbit user)
