const express = require('express');
const cors = require('cors');
const { exec, execFile, spawn } = require('child_process');
const app = express();

app.use(cors());
app.use(express.json());

// Gaming PC with Sunshine server
const GAMING_PC_IP = '192.168.0.69';
const GAMING_PC_PORT = 21675;
const GAMING_PC = `${GAMING_PC_IP}:${GAMING_PC_PORT}`;

// Cached app list - refreshed on-demand when stale
let cachedApps = [];
let lastAppRefresh = 0;
let appRefreshInProgress = false;
const APP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function refreshAppList() {
  if (appRefreshInProgress) return;
  appRefreshInProgress = true;

  const env = { ...process.env, HOME: '/home/hobbit', XDG_RUNTIME_DIR: '/run/user/1000' };
  exec(`xvfb-run -a moonlight list "${GAMING_PC}"`, { timeout: 15000, env }, (err, stdout) => {
    appRefreshInProgress = false;
    if (err) {
      console.error('Failed to refresh app list:', err.message);
      return;
    }
    // Filter out warning messages and empty lines, keep only app names
    const apps = stdout.trim().split('\n')
      .map(a => a.trim())
      .filter(a => a && !a.includes('XDG_RUNTIME_DIR') && !a.includes('Qt') && !a.startsWith('00:'));
    if (apps.length > 0) {
      cachedApps = apps;
      lastAppRefresh = Date.now();
      console.log('App list refreshed:', cachedApps);
    }
  });
}

function refreshAppListIfStale() {
  if (Date.now() - lastAppRefresh > APP_CACHE_TTL) {
    refreshAppList();
  }
}

// No startup refresh - lazy load on first request

// Ensure HDMI is off on startup (default idle state)
exec('sudo /usr/local/bin/hdmi-control.sh off', (err) => {
  if (err) console.error('Failed to turn off HDMI on startup:', err.message);
  else console.log('HDMI turned off (idle state)');
});

// Session generation counter — prevents stale cleanups from racing with new launches
let sessionGen = 0;

// Cleanup when gaming session ends (only if no new session has started)
function cleanupGamingSession(gen) {
  if (gen !== sessionGen) return;
  sessionGen++;  // invalidate this gen so a second call (close + timeout) is a no-op
  console.log('Gaming session ended, cleaning up...');
  exec('sudo /usr/local/bin/hdmi-control.sh off');
}

// Launch Moonlight streaming a specific app
// POST /launch-moonlight?app=Desktop  (use actual app name from Sunshine)
app.post('/launch-moonlight', (req, res) => {
  const appName = req.query.app || 'Desktop';
  if (!cachedApps.includes(appName)) {
    return res.status(400).json({ error: 'Unknown app' });
  }

  // Check if already running (look for X server which indicates gaming mode)
  exec('pgrep -x Xorg', (err) => {
    if (!err) {
      return res.status(400).json({ error: 'Already running. Exit first.' });
    }

    // Increment session generation so any pending cleanup from a previous session becomes a no-op
    const gen = ++sessionGen;

    // Turn on HDMI, then launch X
    exec('sudo /usr/local/bin/hdmi-control.sh on', () => {
      // Launch X with openbox window manager for proper fullscreen handling
      // Stream at 1080p to match monitor, openbox handles window maximization
      const cmd = `sudo xinit /bin/sh -c 'xhost +local: && xrandr --output HDMI-2 --mode 1920x1080 && openbox --sm-disable --config-file /home/hobbit/openbox-rc.xml &
sleep 1 && su hobbit -c "DISPLAY=:0 moonlight stream ${GAMING_PC} \\"${appName}\\" --1080 --fps 60 --display-mode fullscreen"' -- :0 vt7`;

      const child = spawn('sh', ['-c', cmd], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      // Cleanup when the gaming session exits on its own
      child.on('close', () => {
        cleanupGamingSession(gen);
      });

      res.json({ status: 'launching', app: appName });
    });
  });
});

// List available apps from Sunshine on gaming PC (returns cached list)
// These names can be passed directly to /launch-moonlight?app=
app.get('/apps', (req, res) => {
  refreshAppListIfStale();
  res.json({ apps: cachedApps });
});

// Force refresh of app list
app.post('/apps/refresh', (req, res) => {
  refreshAppList();
  res.json({ status: 'refreshing' });
});

// Kill Moonlight and X, then cleanup
app.post('/exit-gaming', (req, res) => {
  const gen = sessionGen;
  // Turn off monitor FIRST while Xorg is still running (DPMS works reliably)
  exec('DISPLAY=:0 xset dpms force off', () => {
    // Small delay to let DPMS take effect before killing X
    setTimeout(() => {
      exec('sudo pkill -9 Xorg; sudo pkill -9 xinit; sudo pkill -9 moonlight', () => {
        setTimeout(() => cleanupGamingSession(gen), 500);
      });
    }, 200);
  });
  res.json({ status: 'stopped' });
});

// Monitor power control - uses DPMS when X running, hdmi-control.sh otherwise
app.post('/monitor-on', (req, res) => {
  exec('pgrep -x Xorg', (err) => {
    if (!err) {
      exec('DISPLAY=:0 xset dpms force on');
    } else {
      exec('sudo /usr/local/bin/hdmi-control.sh on');
    }
    res.json({ status: 'monitor on' });
  });
});

app.post('/monitor-off', (req, res) => {
  exec('pgrep -x Xorg', (err) => {
    if (!err) {
      exec('DISPLAY=:0 xset dpms force off');
    } else {
      exec('sudo /usr/local/bin/hdmi-control.sh off');
    }
    res.json({ status: 'monitor off' });
  });
});

// System power control
app.post('/shutdown', (req, res) => {
  res.json({ status: 'shutting down' });
  setTimeout(() => exec('sudo shutdown now'), 500);
});

app.post('/reboot', (req, res) => {
  res.json({ status: 'rebooting' });
  setTimeout(() => exec('sudo reboot'), 500);
});

// Lazy Sunshine reachability monitor - only polls when frontend is active
let sunshineOnline = false;
let sunshineInterval = null;
let lastStatusRequest = 0;
const STATUS_IDLE_TIMEOUT = 30000; // Stop checking after 30s of no requests

function checkSunshine() {
  exec(`nc -z -w 1 ${GAMING_PC_IP} ${GAMING_PC_PORT}`, { timeout: 2000 }, (err) => {
    sunshineOnline = !err;
  });
}

function startSunshineMonitor() {
  if (sunshineInterval) return;
  console.log('Sunshine monitor starting...');
  checkSunshine(); // Immediate first check
  sunshineInterval = setInterval(checkSunshine, 5000);
}

function stopSunshineMonitor() {
  if (!sunshineInterval) return;
  console.log('Sunshine monitor stopping (idle)...');
  clearInterval(sunshineInterval);
  sunshineInterval = null;
}

function touchStatus() {
  lastStatusRequest = Date.now();
  startSunshineMonitor();
}

// Check for idle timeout every 10 seconds
setInterval(() => {
  if (sunshineInterval && Date.now() - lastStatusRequest > STATUS_IDLE_TIMEOUT) {
    stopSunshineMonitor();
  }
}, 10000);

// Status check - uses cached Sunshine reachability
app.get('/status', (req, res) => {
  touchStatus();
  // Check for X server (reliable indicator of gaming mode)
  exec('pgrep -x Xorg', (xorgErr) => {
    res.json({
      gaming: !xorgErr,
      mode: !xorgErr ? 'gaming' : 'idle',
      sunshineOnline
    });
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GPU stats - uses intel_gpu_top for accurate utilization (requires intel-gpu-tools)
let gpuStats = { usage_percent: 0, render: 0, video: 0, frequency_mhz: 0 };
let gpuStatsProcess = null;

function startGpuMonitor() {
  if (gpuStatsProcess) return;

  console.log('Starting GPU monitor...');
  gpuStatsProcess = spawn('sh', ['-c', 'sudo /usr/bin/intel_gpu_top -J -s 2000 2>/dev/null'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let buffer = '';
  let braceCount = 0;
  let objectStart = -1;

  gpuStatsProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    buffer += chunk;

    // Parse complete JSON objects using brace counting
    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i];
      if (char === '{') {
        if (braceCount === 0) objectStart = i;
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && objectStart !== -1) {
          const jsonStr = buffer.substring(objectStart, i + 1);
          try {
            const sample = JSON.parse(jsonStr);
            const engines = sample.engines || {};
            let render = 0, video = 0;

            for (const key of Object.keys(engines)) {
              const engine = engines[key];
              const busy = engine && typeof engine.busy === 'number' ? engine.busy : 0;
              if (key.includes('Render') || key.includes('3D')) {
                render = Math.max(render, busy);
              }
              if (key.includes('Video')) {
                video = Math.max(video, busy);
              }
            }

            gpuStats = {
              usage_percent: Math.round(render),
              render: Math.round(render),
              video: Math.round(video),
              frequency_mhz: sample.frequency?.actual || 0
            };
          } catch (e) {
            console.error('GPU JSON parse error:', e.message);
          }
          objectStart = -1;
        }
      }
    }

    // Keep only unprocessed part of buffer
    if (objectStart === -1) {
      buffer = '';
      braceCount = 0;
    } else if (objectStart > 0) {
      buffer = buffer.substring(objectStart);
      objectStart = 0;
    }
  });

  gpuStatsProcess.stderr.on('data', (data) => {
    console.error('GPU monitor stderr:', data.toString().trim());
  });

  gpuStatsProcess.on('close', (code) => {
    console.log('GPU monitor exited with code', code);
    gpuStatsProcess = null;
    // Only auto-restart if stats monitor is still active (not intentionally stopped)
    if (statsMonitorActive) {
      setTimeout(startGpuMonitor, 5000);
    }
  });

  gpuStatsProcess.on('error', (err) => {
    console.error('GPU monitor error:', err.message);
    gpuStatsProcess = null;
  });
}

// GPU monitor is started on-demand by stats monitor

app.get('/gpu-stats', (req, res) => {
  touchStats();
  res.json(gpuStats);
});

// System stats - reads from /proc
const fs = require('fs');
const path = require('path');

// CPU stats - reads /proc/stat and calculates usage percentage
let lastCpuStats = null;
let cpuUsage = { usage_percent: 0 };

function parseCpuStats() {
  try {
    const data = fs.readFileSync('/proc/stat', 'utf8');
    const line = data.split('\n')[0]; // First line is aggregate CPU
    const parts = line.split(/\s+/).slice(1).map(Number);
    // user, nice, system, idle, iowait, irq, softirq, steal
    const idle = parts[3] + (parts[4] || 0); // idle + iowait
    const total = parts.reduce((sum, val) => sum + val, 0);
    return { idle, total };
  } catch (e) {
    return null;
  }
}

function updateCpuUsage() {
  const current = parseCpuStats();
  if (!current) return;

  if (lastCpuStats) {
    const idleDiff = current.idle - lastCpuStats.idle;
    const totalDiff = current.total - lastCpuStats.total;
    if (totalDiff > 0) {
      cpuUsage = { usage_percent: Math.round(100 * (1 - idleDiff / totalDiff)) };
    }
  }

  lastCpuStats = current;
}

// CPU polling is started on-demand by stats monitor

// RAM stats - reads /proc/meminfo
function getRamStats() {
  try {
    const data = fs.readFileSync('/proc/meminfo', 'utf8');
    const getValue = (key) => {
      const match = data.match(new RegExp(`${key}:\\s+(\\d+)`));
      return match ? parseInt(match[1], 10) : 0;
    };
    const total = getValue('MemTotal');
    const free = getValue('MemFree');
    const buffers = getValue('Buffers');
    const cached = getValue('Cached');
    const available = getValue('MemAvailable');
    // Used = Total - Available (more accurate than Total - Free)
    const used = total - available;
    return {
      used_gb: Math.round((used / 1024 / 1024) * 10) / 10,
      total_gb: Math.round((total / 1024 / 1024) * 10) / 10,
      usage_percent: Math.round((used / total) * 100)
    };
  } catch (e) {
    return null;
  }
}

// Disk stats - uses df for root partition
let diskStats = null;

function updateDiskStats() {
  exec('df -B1 / | tail -1', (err, stdout) => {
    if (err) return;
    const parts = stdout.trim().split(/\s+/);
    if (parts.length >= 4) {
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      diskStats = {
        used_gb: Math.round((used / 1024 / 1024 / 1024) * 10) / 10,
        total_gb: Math.round((total / 1024 / 1024 / 1024) * 10) / 10,
        usage_percent: Math.round((used / total) * 100)
      };
    }
  });
}

// Disk polling is started on-demand by stats monitor

// Network stats - reads /proc/net/dev and calculates rate
let lastNetStats = null;
let lastNetTime = 0;
let netRate = { received_kbps: 0, sent_kbps: 0 };

function parseNetDev() {
  try {
    const data = fs.readFileSync('/proc/net/dev', 'utf8');
    const lines = data.split('\n');
    let totalRx = 0, totalTx = 0;

    for (const line of lines) {
      // Skip header lines and loopback
      if (line.includes('|') || line.includes('lo:')) continue;
      const match = line.match(/^\s*(\w+):\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/);
      if (match) {
        totalRx += parseInt(match[2], 10);
        totalTx += parseInt(match[3], 10);
      }
    }
    return { rx: totalRx, tx: totalTx };
  } catch (e) {
    return null;
  }
}

function updateNetRate() {
  const now = Date.now();
  const current = parseNetDev();
  if (!current) return;

  if (lastNetStats && lastNetTime) {
    const elapsed = (now - lastNetTime) / 1000; // seconds
    if (elapsed > 0) {
      const rxDiff = current.rx - lastNetStats.rx;
      const txDiff = current.tx - lastNetStats.tx;
      // Convert bytes/sec to KB/s
      netRate = {
        received_kbps: Math.round((rxDiff / elapsed) / 1024),
        sent_kbps: Math.round((txDiff / elapsed) / 1024)
      };
    }
  }

  lastNetStats = current;
  lastNetTime = now;
}

// Network polling is started on-demand by stats monitor

// Lazy stats monitoring - only runs when someone is viewing stats
let statsMonitorActive = false;
let lastStatsRequest = 0;
let cpuInterval = null;
let netInterval = null;
let diskInterval = null;
const STATS_IDLE_TIMEOUT = 30000; // Stop after 30s of no requests

function startStatsMonitor() {
  if (statsMonitorActive) return;
  statsMonitorActive = true;
  console.log('Stats monitor starting...');

  // Start GPU monitor (subprocess)
  startGpuMonitor();

  // Start polling intervals
  updateCpuUsage();
  cpuInterval = setInterval(updateCpuUsage, 1000);

  updateNetRate();
  netInterval = setInterval(updateNetRate, 1000);

  updateDiskStats();
  diskInterval = setInterval(updateDiskStats, 30000);
}

function stopStatsMonitor() {
  if (!statsMonitorActive) return;
  statsMonitorActive = false;
  console.log('Stats monitor stopping (idle)...');

  // Stop GPU monitor - use pkill since sudo runs outside process group
  if (gpuStatsProcess) {
    exec('sudo pkill -f intel_gpu_top');
    gpuStatsProcess = null;
  }

  // Clear intervals
  if (cpuInterval) { clearInterval(cpuInterval); cpuInterval = null; }
  if (netInterval) { clearInterval(netInterval); netInterval = null; }
  if (diskInterval) { clearInterval(diskInterval); diskInterval = null; }
}

function touchStats() {
  lastStatsRequest = Date.now();
  startStatsMonitor();
}

// Check for idle timeout every 10 seconds
setInterval(() => {
  if (statsMonitorActive && Date.now() - lastStatsRequest > STATS_IDLE_TIMEOUT) {
    stopStatsMonitor();
  }
}, 10000);

app.get('/net-stats', (req, res) => {
  touchStats();
  res.json(netRate);
});

app.get('/cpu-stats', (req, res) => {
  touchStats();
  res.json(cpuUsage);
});

app.get('/ram-stats', (req, res) => {
  touchStats();
  const stats = getRamStats();
  res.json(stats || { used_gb: 0, total_gb: 0, usage_percent: 0 });
});

app.get('/disk-stats', (req, res) => {
  touchStats();
  res.json(diskStats || { used_gb: 0, total_gb: 0, usage_percent: 0 });
});

// Xbox controller dongle status — reads sysfs (instant, no lazy monitor needed)
const KNOWN_CONTROLLERS = {
  '0MGT0097602541': { color: '#22c55e', label: 'Green' },
  '0MFG0029213548': { color: '#ec4899', label: 'Pink' },
};

function getControllerStatus() {
  const driverPath = '/sys/bus/usb/drivers/xone-dongle';
  if (!fs.existsSync(driverPath)) return { dongleConnected: false, controllers: [], pairing: false };
  const usbDirs = fs.readdirSync(driverPath).filter(e => /^\d+-\d+/.test(e));
  if (!usbDirs.length) return { dongleConnected: false, controllers: [], pairing: false };
  const p = `${driverPath}/${usbDirs[0]}`;
  let pairing = false;
  try { pairing = fs.readFileSync(`${p}/pairing`, 'utf8').trim() === '1'; } catch {}

  // Parse /proc/bus/input/devices for connected Xbox controller serials + js index
  const connectedSerials = new Map(); // serial → jsIndex
  try {
    const raw = fs.readFileSync('/proc/bus/input/devices', 'utf8');
    const blocks = raw.split('\n\n');
    for (const block of blocks) {
      if (!block.includes('Name="Microsoft Xbox Controller"')) continue;
      const uniqMatch = block.match(/Uniq=(\S+)/);
      const jsMatch = block.match(/Handlers=.*\bjs(\d+)\b/);
      if (uniqMatch?.[1] && jsMatch) {
        connectedSerials.set(uniqMatch[1], parseInt(jsMatch[1], 10));
      }
    }
  } catch {}

  // Build list: known controllers (connected or not) + unknown-but-connected
  const controllers = [];
  for (const [serial, info] of Object.entries(KNOWN_CONTROLLERS)) {
    const jsIndex = connectedSerials.get(serial);
    const connected = jsIndex !== undefined;
    controllers.push({ serial, color: info.color, label: info.label, connected, playerIndex: jsIndex ?? null });
    connectedSerials.delete(serial);
  }
  for (const [serial, jsIndex] of connectedSerials) {
    controllers.push({ serial, color: null, label: null, connected: true, playerIndex: jsIndex });
  }
  // Sort by playerIndex (connected first by js order, then disconnected)
  controllers.sort((a, b) => {
    if (a.connected !== b.connected) return a.connected ? -1 : 1;
    if (a.connected) return (a.playerIndex ?? 99) - (b.playerIndex ?? 99);
    return 0;
  });

  return { dongleConnected: true, controllers, pairing };
}

app.get('/controllers', (req, res) => res.json(getControllerStatus()));

// ============================================================
// Virtual Input — xdotool injection for gaming mode
// ============================================================
const XDOTOOL_ENV = { DISPLAY: ':0' };

function requireGaming(req, res, next) {
  exec('pgrep -x Xorg', (err) => {
    if (err) return res.status(400).json({ error: 'Not in gaming mode' });
    next();
  });
}

// Relative mouse move
app.post('/input/move', requireGaming, (req, res) => {
  let { dx, dy } = req.body;
  if (typeof dx !== 'number' || typeof dy !== 'number') {
    return res.status(400).json({ error: 'dx and dy must be numbers' });
  }
  dx = Math.round(Math.max(-2000, Math.min(2000, dx)));
  dy = Math.round(Math.max(-2000, Math.min(2000, dy)));
  execFile('xdotool', ['mousemove_relative', '--', String(dx), String(dy)], { env: XDOTOOL_ENV }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'ok' });
  });
});

// Mouse click
app.post('/input/click', requireGaming, (req, res) => {
  const { button } = req.body;
  if (![1, 2, 3].includes(button)) {
    return res.status(400).json({ error: 'button must be 1, 2, or 3' });
  }
  execFile('xdotool', ['click', String(button)], { env: XDOTOOL_ENV }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'ok' });
  });
});

// Mouse button down/up (for click-and-drag)
app.post('/input/mousedown', requireGaming, (req, res) => {
  const { button } = req.body;
  if (![1, 2, 3].includes(button)) {
    return res.status(400).json({ error: 'button must be 1, 2, or 3' });
  }
  execFile('xdotool', ['mousedown', String(button)], { env: XDOTOOL_ENV }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'ok' });
  });
});

app.post('/input/mouseup', requireGaming, (req, res) => {
  const { button } = req.body;
  if (![1, 2, 3].includes(button)) {
    return res.status(400).json({ error: 'button must be 1, 2, or 3' });
  }
  execFile('xdotool', ['mouseup', String(button)], { env: XDOTOOL_ENV }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'ok' });
  });
});

// Scroll (positive=down, negative=up)
app.post('/input/scroll', requireGaming, (req, res) => {
  let { dy } = req.body;
  if (typeof dy !== 'number') return res.status(400).json({ error: 'dy must be a number' });
  dy = Math.round(Math.max(-20, Math.min(20, dy)));
  if (dy === 0) return res.json({ status: 'ok' });
  const btn = dy > 0 ? '5' : '4';
  const clicks = Math.abs(dy);
  const args = ['click', '--repeat', String(clicks), btn];
  execFile('xdotool', args, { env: XDOTOOL_ENV }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'ok' });
  });
});

// Key press (whitelisted keys only)
const ALLOWED_KEYS = new Set([
  'Escape', 'Return', 'Tab', 'space', 'BackSpace',
  'Up', 'Down', 'Left', 'Right', 'End',
  'alt+Tab', 'super',
]);

app.post('/input/key', requireGaming, (req, res) => {
  const { key } = req.body;
  if (!ALLOWED_KEYS.has(key)) {
    return res.status(400).json({ error: 'Key not allowed' });
  }
  execFile('xdotool', ['key', key], { env: XDOTOOL_ENV }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'ok' });
  });
});

// Type text string
app.post('/input/type', requireGaming, (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.length > 100) {
    return res.status(400).json({ error: 'text must be 1-100 characters' });
  }
  execFile('xdotool', ['type', '--clearmodifiers', '--', text], { env: XDOTOOL_ENV }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'ok' });
  });
});

// ============================================================
// Zigbee Lights — MQTT-based control for livingroom group
// ============================================================
const mqtt = require('mqtt');

const LIGHT_GROUP = 'livingroom';
const MQTT_URL = 'mqtt://127.0.0.1:1883';
const LIGHT_IDLE_TIMEOUT = 60000; // Disconnect MQTT after 60s idle

let mqttClient = null;
let lastLightsRequest = 0;
let lightsIdleCheck = null;
let groupMembers = []; // Array of { ieee, friendly_name }
let subscribedTopics = new Set();

let lightsState = {
  group: { state: 'OFF', brightness: 0 },
  devices: {} // keyed by friendly_name: { state, brightness }
};

function startLightsMonitor() {
  if (mqttClient) return;
  console.log('Lights MQTT connecting...');

  mqttClient = mqtt.connect(MQTT_URL);

  mqttClient.on('connect', () => {
    console.log('Lights MQTT connected');
    // Subscribe to group state and bridge discovery topics
    mqttClient.subscribe(`zigbee2mqtt/${LIGHT_GROUP}`, { qos: 0 });
    mqttClient.subscribe('zigbee2mqtt/bridge/groups', { qos: 0 });
    mqttClient.subscribe('zigbee2mqtt/bridge/devices', { qos: 0 });
    // Request current groups/devices lists
    mqttClient.publish('zigbee2mqtt/bridge/request/groups', '');
    mqttClient.publish('zigbee2mqtt/bridge/request/devices', '');
  });

  let pendingGroups = null;
  let pendingDevices = null;

  function resolveMembers() {
    if (!pendingGroups || !pendingDevices) return;
    const group = pendingGroups.find(g => g.friendly_name === LIGHT_GROUP);
    if (!group) return;

    const ieeeSet = new Set(group.members.map(m => m.ieee_address));
    groupMembers = pendingDevices
      .filter(d => ieeeSet.has(d.ieee_address))
      .map(d => {
        // Extract color capabilities from device definition
        const supports = { color: false, color_temp: false, color_temp_min: 150, color_temp_max: 500 };
        const exposes = d.definition?.exposes || [];
        for (const expose of exposes) {
          const features = expose.features || [];
          for (const f of features) {
            if (f.name === 'color_xy' || f.name === 'color_hs') supports.color = true;
            if (f.name === 'color_temp') {
              supports.color_temp = true;
              if (f.value_min !== undefined) supports.color_temp_min = f.value_min;
              if (f.value_max !== undefined) supports.color_temp_max = f.value_max;
            }
          }
        }
        return { ieee: d.ieee_address, friendly_name: d.friendly_name, supports };
      });

    console.log('Light group members:', groupMembers.map(m => m.friendly_name));

    // Subscribe to individual device topics (skip already-subscribed)
    for (const member of groupMembers) {
      const topic = `zigbee2mqtt/${member.friendly_name}`;
      if (!subscribedTopics.has(topic)) {
        mqttClient.subscribe(topic, { qos: 0 });
        subscribedTopics.add(topic);
      }
    }
  }

  mqttClient.on('message', (topic, payload) => {
    let data;
    try { data = JSON.parse(payload.toString()); } catch { return; }

    if (topic === 'zigbee2mqtt/bridge/groups') {
      pendingGroups = data;
      resolveMembers();
    } else if (topic === 'zigbee2mqtt/bridge/devices') {
      pendingDevices = data;
      resolveMembers();
    } else if (topic === `zigbee2mqtt/${LIGHT_GROUP}`) {
      if (data.state !== undefined) lightsState.group.state = data.state;
      if (data.brightness !== undefined) lightsState.group.brightness = data.brightness;
      // Store color_temp from MQTT but NOT color (MQTT sends xy, not hex)
      if (data.color_temp !== undefined) lightsState.group.color_temp = data.color_temp;
    } else {
      // Individual device state
      const deviceName = topic.replace('zigbee2mqtt/', '');
      if (groupMembers.some(m => m.friendly_name === deviceName)) {
        if (!lightsState.devices[deviceName]) {
          lightsState.devices[deviceName] = { state: 'OFF', brightness: 0 };
        }
        if (data.state !== undefined) lightsState.devices[deviceName].state = data.state;
        if (data.brightness !== undefined) lightsState.devices[deviceName].brightness = data.brightness;
        // Store color_temp from MQTT but NOT color (MQTT sends xy, not hex)
        if (data.color_temp !== undefined) lightsState.devices[deviceName].color_temp = data.color_temp;
      }
    }
  });

  mqttClient.on('error', (err) => {
    console.error('Lights MQTT error:', err.message);
  });

  // Start idle checker
  if (!lightsIdleCheck) {
    lightsIdleCheck = setInterval(() => {
      if (mqttClient && Date.now() - lastLightsRequest > LIGHT_IDLE_TIMEOUT) {
        stopLightsMonitor();
      }
    }, 10000);
  }
}

function stopLightsMonitor() {
  if (!mqttClient) return;
  console.log('Lights MQTT disconnecting (idle)...');
  mqttClient.end();
  mqttClient = null;
  subscribedTopics.clear();
  if (lightsIdleCheck) {
    clearInterval(lightsIdleCheck);
    lightsIdleCheck = null;
  }
}

function touchLights() {
  lastLightsRequest = Date.now();
  startLightsMonitor();
}

// Wait for MQTT to be connected (or timeout). Used by POST handlers so the
// first request after sleep doesn't fail with "MQTT not connected".
function ensureMqttConnected(timeoutMs = 5000) {
  if (mqttClient?.connected) return Promise.resolve();
  startLightsMonitor();
  return new Promise((resolve, reject) => {
    if (!mqttClient) return reject(new Error('MQTT client unavailable'));
    const timeout = setTimeout(() => {
      mqttClient.removeListener('connect', onConnect);
      reject(new Error('MQTT connection timeout'));
    }, timeoutMs);
    function onConnect() {
      clearTimeout(timeout);
      resolve();
    }
    mqttClient.once('connect', onConnect);
  });
}

// GET /lights — current state of group + individual lights
app.get('/lights', async (req, res) => {
  touchLights();
  try { await ensureMqttConnected(2000); } catch {}
  // Aggregate capabilities across all group members
  const capabilities = { color: false, color_temp: false, color_temp_min: 150, color_temp_max: 500 };
  for (const m of groupMembers) {
    if (m.supports.color) capabilities.color = true;
    if (m.supports.color_temp) {
      capabilities.color_temp = true;
      capabilities.color_temp_min = Math.min(capabilities.color_temp_min, m.supports.color_temp_min);
      capabilities.color_temp_max = Math.max(capabilities.color_temp_max, m.supports.color_temp_max);
    }
  }
  // Reset to defaults if no color_temp devices found
  if (!capabilities.color_temp) {
    capabilities.color_temp_min = 150;
    capabilities.color_temp_max = 500;
  }
  const devices = groupMembers.map(m => ({
    id: m.friendly_name,
    name: m.friendly_name,
    state: lightsState.devices[m.friendly_name]?.state || 'OFF',
    brightness: lightsState.devices[m.friendly_name]?.brightness || 0,
    color_hex: lightsState.devices[m.friendly_name]?.color_hex || null,
    color_temp: lightsState.devices[m.friendly_name]?.color_temp || null,
    supports: m.supports,
  }));
  res.json({
    connected: mqttClient?.connected || false,
    capabilities,
    group: {
      name: LIGHT_GROUP,
      state: lightsState.group.state,
      brightness: lightsState.group.brightness,
      color_hex: lightsState.group.color_hex || null,
      color_temp: lightsState.group.color_temp || null,
    },
    devices,
  });
});

// POST /lights/group/set — control group { state?, brightness?, color?, color_temp? }
app.post('/lights/group/set', async (req, res) => {
  touchLights();
  try {
    await ensureMqttConnected();
  } catch {
    return res.status(503).json({ error: 'MQTT not connected' });
  }
  const payload = {};
  if (req.body.state !== undefined) payload.state = req.body.state;
  if (req.body.brightness !== undefined) payload.brightness = req.body.brightness;
  if (req.body.color !== undefined) payload.color = req.body.color;
  if (req.body.color_temp !== undefined) payload.color_temp = req.body.color_temp;

  // Brightness-only: send to individual ON lights instead of the group topic
  // so OFF lights don't get turned on as a side effect
  const brightnessOnly = payload.brightness !== undefined
    && payload.state === undefined && payload.color === undefined && payload.color_temp === undefined;

  // Track color_hex on set so we can serve it back (MQTT only echoes xy)
  if (req.body.color?.hex) {
    const hex = req.body.color.hex;
    lightsState.group.color_hex = hex;
    for (const member of groupMembers) {
      if (!lightsState.devices[member.friendly_name]) lightsState.devices[member.friendly_name] = { state: 'OFF', brightness: 0 };
      lightsState.devices[member.friendly_name].color_hex = hex;
    }
  }
  if (req.body.color_temp !== undefined) {
    lightsState.group.color_hex = null;
    for (const member of groupMembers) {
      if (lightsState.devices[member.friendly_name]) lightsState.devices[member.friendly_name].color_hex = null;
    }
  }

  if (brightnessOnly) {
    for (const member of groupMembers) {
      const name = member.friendly_name;
      if (lightsState.devices[name]?.state === 'ON') {
        mqttClient.publish(`zigbee2mqtt/${name}/set`, JSON.stringify({ brightness: payload.brightness }));
      }
    }
  } else {
    mqttClient.publish(`zigbee2mqtt/${LIGHT_GROUP}/set`, JSON.stringify(payload));
  }
  res.json({ status: 'ok', payload });
});

// POST /lights/:id/set — control individual light { state?, brightness?, color?, color_temp? }
app.post('/lights/:id/set', async (req, res) => {
  touchLights();
  try {
    await ensureMqttConnected();
  } catch {
    return res.status(503).json({ error: 'MQTT not connected' });
  }
  const id = req.params.id;
  if (!groupMembers.some(m => m.friendly_name === id)) {
    return res.status(400).json({ error: 'Unknown light' });
  }
  const payload = {};
  if (req.body.state !== undefined) payload.state = req.body.state;
  if (req.body.brightness !== undefined) payload.brightness = req.body.brightness;
  if (req.body.color !== undefined) payload.color = req.body.color;
  if (req.body.color_temp !== undefined) payload.color_temp = req.body.color_temp;

  // Track color_hex on set so we can serve it back (MQTT only echoes xy)
  if (!lightsState.devices[id]) lightsState.devices[id] = { state: 'OFF', brightness: 0 };
  if (req.body.color?.hex) lightsState.devices[id].color_hex = req.body.color.hex;
  if (req.body.color_temp !== undefined) lightsState.devices[id].color_hex = null;

  mqttClient.publish(`zigbee2mqtt/${id}/set`, JSON.stringify(payload));
  res.json({ status: 'ok', payload });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hobbit Bridge running on port ${PORT}`);
});
