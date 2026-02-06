---
name: bridge
description: Add a new endpoint to the host bridge service. Use when you need host-level access for metrics, system control, or hardware that Docker containers can't reach.
---

# Bridge Endpoint Creation

The bridge service runs on the host (not Docker) and provides APIs for functionality requiring direct host access. See `docs/bridge.md` for full architecture documentation.

## When to Use the Bridge

Use the bridge for:
- Hardware monitoring (GPU, sensors, fans)
- System metrics from `/proc` or `/sys`
- Commands requiring sudo
- X11/display operations
- Anything Docker containers can't access

Do NOT use for:
- Static configuration
- Operations that work fine in containers

## Adding a New Endpoint

### Step 1: Add endpoint to bridge.js

Location: `files/bridge.js`

Choose the appropriate pattern:

#### Pattern A: Simple file read (sysfs/procfs)
```javascript
app.get('/my-endpoint', (req, res) => {
  const fs = require('fs');
  try {
    const data = fs.readFileSync('/path/to/file', 'utf8');
    res.json({ value: parseFloat(data.trim()) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

#### Pattern B: Cached polling (updated periodically)
```javascript
let myCache = { value: 0 };

function updateMyCache() {
  try {
    const data = fs.readFileSync('/path/to/file', 'utf8');
    myCache = { value: parseFloat(data.trim()) };
  } catch (e) {
    console.error('Failed to read:', e.message);
  }
}

setInterval(updateMyCache, 1000);
updateMyCache();

app.get('/my-endpoint', (req, res) => {
  res.json(myCache);
});
```

#### Pattern C: Rate calculation (delta over time)
```javascript
let lastValue = null;
let lastTime = 0;
let rate = { per_second: 0 };

function updateRate() {
  const now = Date.now();
  const current = readCurrentValue(); // implement this

  if (lastValue !== null && lastTime) {
    const elapsed = (now - lastTime) / 1000;
    if (elapsed > 0) {
      rate = { per_second: (current - lastValue) / elapsed };
    }
  }

  lastValue = current;
  lastTime = now;
}

setInterval(updateRate, 1000);
updateRate();

app.get('/my-endpoint', (req, res) => {
  res.json(rate);
});
```

#### Pattern D: Background process (continuous command)
```javascript
let processData = { value: 0 };
let monitorProcess = null;

function startMonitor() {
  if (monitorProcess) return;

  monitorProcess = spawn('sh', ['-c', 'sudo /path/to/command args'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  monitorProcess.stdout.on('data', (data) => {
    // Parse output and update processData
    try {
      const parsed = JSON.parse(data.toString());
      processData = { value: parsed.whatever };
    } catch (e) {}
  });

  monitorProcess.on('close', () => {
    monitorProcess = null;
    setTimeout(startMonitor, 5000); // Restart on failure
  });

  monitorProcess.on('error', (err) => {
    console.error('Monitor error:', err.message);
    monitorProcess = null;
  });
}

startMonitor();

app.get('/my-endpoint', (req, res) => {
  res.json(processData);
});
```

### Step 2: Add sudoers entry (if needed)

If your endpoint requires sudo, add to `playbooks/deploy.yml`:

```yaml
- name: Allow hobbit to run my-command without password
  lineinfile:
    path: /etc/sudoers.d/hobbit-custom
    line: 'hobbit ALL=(ALL) NOPASSWD: /path/to/command'
    create: yes
    mode: '0440'
    validate: 'visudo -cf %s'
```

### Step 3: Wire to web UI

In `web/src/hooks/useSystemStats.ts` (or create a new hook):

```typescript
// Add interface for response
interface MyEndpointResponse {
  value: number;
}

// Add to fetch calls
const myRes = await fetch('/api/control/my-endpoint');
const myData: MyEndpointResponse | null = myRes.ok ? await myRes.json() : null;

// Add to stats interface and state
myValue: myData?.value ?? null,
```

### Step 4: Add to StatsTab

Stats are rendered directly in `web/src/components/StatsTab.tsx` using the `StatBar` component. Add your new stat there:

```typescript
// In StatsTab.tsx, add to the useSystemStats destructure:
const { cpu, gpu, ram, disk, network, myValue, loading, error } = useSystemStats(enabled ? 3000 : null);

// Add a new StatBar in the render:
<StatBar
  label="MY METRIC"
  value={myValue ?? 0}
  detail={`${(myValue ?? 0).toFixed(1)} units`}
  color="bg-blue-500"
  loading={showLoading}
/>
```

### Step 6: Deploy

```bash
./deploy.sh
```

## Debugging

```bash
# Check bridge logs
ssh hobbit "journalctl -u hobbit-bridge -f"

# Test endpoint directly
curl http://hobbit.local/api/control/my-endpoint

# Check if command works manually
ssh hobbit "sudo /path/to/command args"
```

## Checklist

- [ ] Endpoint added to `files/bridge.js`
- [ ] Uses appropriate pattern (simple/cached/rate/background)
- [ ] Sudoers entry added if using sudo
- [ ] TypeScript interface defined in hook
- [ ] Fetch call added to hook
- [ ] StatBar added to StatsTab.tsx
- [ ] Deployed and tested

## Common Data Sources

| Data | Source | Pattern |
|------|--------|---------|
| CPU temp | `/sys/class/thermal/thermal_zone0/temp` | Cached polling |
| Fan speed | `/sys/class/hwmon/hwmon*/fan*_input` | Cached polling |
| GPU usage | `intel_gpu_top -J` | Background process |
| Network rate | `/proc/net/dev` | Rate calculation |
| Disk I/O | `/proc/diskstats` | Rate calculation |
| Memory detailed | `/proc/meminfo` | Simple read |
| Battery | `/sys/class/power_supply/BAT*/` | Cached polling |
