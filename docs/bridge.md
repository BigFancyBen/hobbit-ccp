# Host Bridge Service

The bridge is a Node.js Express service running directly on the host (not in Docker) that provides APIs for functionality that requires direct host access.

## Why the Bridge Exists

Some operations can't be done from Docker containers:
- **System control**: Reboot, shutdown, monitor power management
- **Hardware access**: GPU monitoring via `intel_gpu_top`, direct `/proc` access
- **X11/Display**: Launching Moonlight with proper display configuration
- **Accurate metrics**: Network stats from `/proc/net/dev`, GPU from hardware counters

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Web Browser                                            │
│  (hobbit.local)                                         │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Nginx (Docker)                                         │
│  - /api/control/* → bridge:3001                         │
│  - /*             → static files                        │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Bridge Service (host, port 3001 — nginx proxy only)    │
│  - System stats (CPU, RAM, GPU, disk, network)          │
│  - Gaming PC / Sunshine reachability                    │
│  - Moonlight launch / exit                              │
│  - Monitor control (HDMI/DPMS)                          │
│  - Zigbee light control (MQTT)                            │
└─────────────────────────────────────────────────────────┘
```

## Adding a New Endpoint

### 1. Add the endpoint to bridge.js

```javascript
// Example: Add a temperature reading endpoint
app.get('/temperature', (req, res) => {
  const fs = require('fs');
  try {
    // Read from sysfs thermal zone
    const temp = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8');
    res.json({ celsius: parseInt(temp, 10) / 1000 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

### 2. Wire it to the web UI

In `web/src/hooks/useSystemStats.ts` (or create a new hook):

```typescript
// Add to the fetch calls
const tempRes = await fetch('/api/control/temperature');
const tempData = tempRes.ok ? await tempRes.json() : null;

// Add to the state
temperature: tempData?.celsius ?? null,
```

### 3. Create a component to display it

```typescript
// web/src/components/Stats/TempBar.tsx
export function TempBar({ celsius, loading }: { celsius?: number; loading?: boolean }) {
  if (loading) return <Skeleton />;
  return (
    <div>
      <h4>Temperature</h4>
      <Badge>{celsius?.toFixed(1)}°C</Badge>
    </div>
  );
}
```

### 4. Deploy

```bash
./deploy.sh
```

## Common Patterns

### Background Monitoring (continuous process)

For metrics that need continuous sampling (like GPU):

```javascript
let cachedValue = { /* initial state */ };
let monitorProcess = null;

function startMonitor() {
  if (monitorProcess) return;

  monitorProcess = spawn('command', ['args'], { stdio: ['ignore', 'pipe', 'pipe'] });

  monitorProcess.stdout.on('data', (data) => {
    // Parse and update cachedValue
  });

  monitorProcess.on('close', () => {
    monitorProcess = null;
    setTimeout(startMonitor, 5000); // Restart on failure
  });
}

startMonitor();

app.get('/endpoint', (req, res) => {
  res.json(cachedValue);
});
```

### Lazy Polling (touch pattern)

For values that should only be sampled while the frontend is active. The bridge uses this for stats and Sunshine reachability:

```javascript
let cachedValue = null;
let interval = null;
let lastRequest = 0;
const IDLE_TIMEOUT = 30000;

function updateValue() { /* read from /proc, sysfs, etc */ }

function startMonitor() {
  if (interval) return;
  updateValue(); // immediate first read
  interval = setInterval(updateValue, 5000);
}

function stopMonitor() {
  if (!interval) return;
  clearInterval(interval);
  interval = null;
}

function touch() {
  lastRequest = Date.now();
  startMonitor();
}

// Auto-stop after 30s idle
setInterval(() => {
  if (interval && Date.now() - lastRequest > IDLE_TIMEOUT) stopMonitor();
}, 10000);

app.get('/endpoint', (req, res) => {
  touch();
  res.json(cachedValue);
});
```

### Rate Calculation (network, disk I/O)

For values that need delta calculation:

```javascript
let lastValue = null;
let lastTime = 0;
let rate = 0;

function updateRate() {
  const now = Date.now();
  const current = readCurrentValue();

  if (lastValue !== null && lastTime) {
    const elapsed = (now - lastTime) / 1000;
    rate = (current - lastValue) / elapsed;
  }

  lastValue = current;
  lastTime = now;
}

setInterval(updateRate, 1000);
```

## Sudoers Configuration

Commands requiring root access need sudoers entries. Add to `roles/webserver/tasks/main.yml`:

```yaml
- name: Allow hobbit to run command without password
  lineinfile:
    path: /etc/sudoers.d/hobbit-custom
    line: 'hobbit ALL=(ALL) NOPASSWD: /path/to/command'
    create: yes
    mode: '0440'
    validate: 'visudo -cf %s'
```

## Current Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/status` | GET | Mode (gaming/idle) + sunshineOnline |
| `/cpu-stats` | GET | CPU utilization percentage |
| `/ram-stats` | GET | RAM usage (used/total GB) |
| `/gpu-stats` | GET | Intel GPU utilization |
| `/disk-stats` | GET | Disk usage (used/total GB) |
| `/net-stats` | GET | Network throughput (KB/s) |
| `/apps` | GET | Available Sunshine apps |
| `/apps/refresh` | POST | Refresh app list |
| `/launch-moonlight` | POST | Start game streaming |
| `/exit-gaming` | POST | Stop game streaming |
| `/monitor-on` | POST | Turn on display |
| `/monitor-off` | POST | Turn off display |
| `/shutdown` | POST | Shutdown system |
| `/reboot` | POST | Reboot system |
| `/lights` | GET | Zigbee light group + individual states |
| `/lights/group/set` | POST | Set group state/brightness/color `{ state?, brightness?, color?, color_temp? }` |
| `/lights/:id/set` | POST | Set individual light state/brightness/color `{ state?, brightness?, color?, color_temp? }` |
| `/controllers` | GET | Xbox controller dongle + connected controllers |

## MQTT Integration

The bridge connects to the local Mosquitto MQTT broker (`mqtt://127.0.0.1:1883`) to control Zigbee lights via Zigbee2MQTT.

**Lazy connection**: MQTT only connects when the `/lights` endpoint is first requested, and auto-disconnects after 60 seconds of no requests. This follows the same touch/idle pattern used for stats and Sunshine monitoring.

**Auto-discovery**: On connect, the bridge subscribes to `zigbee2mqtt/bridge/groups` and `zigbee2mqtt/bridge/devices`. It cross-references the `livingroom` group's IEEE addresses with device friendly names to discover group members, then subscribes to each individual device topic.

**State caching**: Group and individual device states (on/off, brightness 0-254) are cached from MQTT messages and returned via `GET /lights`.

**Control flow**: `POST /lights/group/set` and `POST /lights/:id/set` publish JSON payloads to the appropriate `zigbee2mqtt/<target>/set` topics. Individual light IDs are validated against discovered group members.

## Security

- **Port 3001 is not directly exposed** — no UFW rule exists. All access goes through nginx's `/api/control/` proxy (Docker network). This prevents Tailscale peers or LAN devices from bypassing nginx.
- **Input validation**: All endpoints that pass user input to shell commands validate the input:
  - `/launch-moonlight?app=`: Validated against `cachedApps` allowlist

## Debugging

Check bridge logs:
```bash
ssh hobbit "journalctl -u hobbit-bridge -f"
```

Test endpoints directly:
```bash
curl http://hobbit.local/api/control/gpu-stats
curl http://hobbit.local/api/control/net-stats
```
