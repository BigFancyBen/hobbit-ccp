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
│  - /netdata/*     → netdata:19999                       │
│  - /*             → static files                        │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│  Bridge Service         │   │  Netdata (Docker)       │
│  (host, port 3001)      │   │  CPU, RAM, Disk         │
│  - GPU stats            │   └─────────────────────────┘
│  - Network stats        │
│  - System control       │
│  - Moonlight launch     │
└─────────────────────────┘
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

In `web/src/hooks/useNetdataStats.ts` (or create a new hook):

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

### Periodic Polling (sysfs/procfs)

For values that can be read directly from files:

```javascript
let cachedValue = null;
let lastRead = 0;

function updateValue() {
  try {
    const data = fs.readFileSync('/path/to/file', 'utf8');
    cachedValue = parseData(data);
    lastRead = Date.now();
  } catch (e) {
    console.error('Read failed:', e.message);
  }
}

setInterval(updateValue, 1000);
updateValue();

app.get('/endpoint', (req, res) => {
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
| `/status` | GET | Gaming mode status |
| `/gpu-stats` | GET | Intel GPU utilization |
| `/net-stats` | GET | Network throughput (KB/s) |
| `/apps` | GET | Available Sunshine apps |
| `/apps/refresh` | POST | Refresh app list |
| `/launch-moonlight` | POST | Start game streaming |
| `/exit-gaming` | POST | Stop game streaming |
| `/monitor-on` | POST | Turn on display |
| `/monitor-off` | POST | Turn off display |
| `/shutdown` | POST | Shutdown system |
| `/reboot` | POST | Reboot system |

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
