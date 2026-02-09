# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hobbit Mini PC Setup — transforms a Peladn mini PC into a hybrid LAN gaming device and silent smart home server. A React SPA communicates through Nginx to a Node.js bridge service running on the host, which manages system stats, Moonlight game streaming, Bluetooth controllers, and monitor power.

## Architecture

```
Phone/Browser → Nginx (Docker, port 80) → React SPA (static files)
                                        → /api/control/* → Bridge (host, port 3001)
                                        → /zigbee/*      → Zigbee2MQTT (Docker, 8080)

Also running: Mosquitto MQTT (Docker, 1883), dnsmasq (host)
```

The bridge runs on the host (not in Docker) because it needs direct access to `/proc`, X11, `bluetoothctl`, HDMI control, and other system-level operations.

## Commands

### Web Frontend (from `web/`)
```bash
npm install          # Install dependencies
npm run dev          # Vite dev server on :5173, proxies /api to 192.168.0.67
npm run build        # Production build → web/dist/
```

### Deployment (from project root, Git Bash on Windows)
```bash
./deploy.sh          # Builds web UI + runs Ansible deploy playbook
```

### Manual Ansible (from WSL)
```bash
ansible-playbook playbooks/setup.yml -i inventory.ini   # First-time full setup
ansible-playbook playbooks/deploy.yml -i inventory.ini   # Config updates + restart
```

There are no tests or linting configured.

## Key Directories

- `web/src/` — React 18 + TypeScript + Vite + Tailwind v4 frontend
- `files/bridge.js` — Express backend (single file, ~700 lines), deployed to mini PC
- `files/` — All config files deployed by Ansible (docker-compose, nginx, systemd, etc.)
- `roles/` — Ansible roles (base, security, dns, moonlight, zigbee, webserver)
- `playbooks/` — Ansible playbooks (setup.yml for first-time, deploy.yml for updates)
- `docs/` — Detailed docs on bridge API, Bluetooth, DNS, security, troubleshooting

## Frontend Conventions

**Component library**: 8bitcn (pixel-art themed, shadcn-based). Always import from `@/components/ui/8bit/`. These components extend ~6px outside their bounds — use `mx-2` on content containers and `overflow-x-hidden` on scroll containers to prevent clipping.

**Styling**: Tailwind v4 with a custom Atari oklch color theme defined in `web/src/index.css`. Mobile-first responsive design. Use `font="retro"` prop for Press Start 2P pixel font on 8bitcn components.

**Animations**: react-spring. Use `useTransition` for enter/leave (modals, tabs), not imperative `useSpring`. Track `prevTabIndexRef` for directional tab slides. Reserve `api.set()`/`api.start()` for values computed dynamically at event time.

**Module-level caching** (`web/src/lib/cache.ts`): Simple Map-based cache outside React lifecycle. Initialize `useState` from cache to prevent skeleton flash on remount. Update cache on successful fetch.

**Data fetching**: Custom hooks (`useSystemStats`, `useBluetooth`) poll the bridge API at intervals. Frontend only polls when the browser tab is visible (`document.visibilitychange`). The bridge uses a "lazy monitoring" pattern — expensive background work (stats collection, Sunshine reachability checks) only runs when recently requested and auto-stops after 30s idle.

## Bridge API

All endpoints are under `/api/control/` in production (Nginx proxy strips the prefix). In the bridge code, routes are registered at root (`/health`, `/status`, `/cpu-stats`, etc.).

Key endpoints: `/health`, `/status` (mode + sunshineOnline), `/apps` (cached game list), `/launch-moonlight?app=X`, `/exit-gaming`, `/cpu-stats`, `/gpu-stats`, `/ram-stats`, `/disk-stats`, `/net-stats`, `/monitor-on`, `/monitor-off`, `/reboot`, `/bluetooth/*`.

## Deployment Flow

`deploy.sh` builds the web UI then runs `ansible-playbook playbooks/deploy.yml` which copies files to the mini PC at 192.168.0.67 (`hobbit_dir: /home/hobbit/hobbit`), runs `npm install` for the bridge, restarts Docker services and the bridge systemd unit, then verifies health.

The dev proxy in `web/vite.config.js` points to the real mini PC at `192.168.0.67`, so `npm run dev` talks to the live bridge.

## Infrastructure Config

- `inventory.ini` — Target host: hobbit at 192.168.0.67
- `group_vars/all.yml` — Gaming PC IP (192.168.0.69), timezone, paths, LAN subnet
- `docker-compose.yml` (in `files/`) — Nginx, Mosquitto, Zigbee2MQTT containers
- `nginx.conf` — SPA routing + API proxy + DNS rebinding protection
- `hobbit-bridge.service` — Systemd unit for the bridge (auto-restart, runs as hobbit user)
