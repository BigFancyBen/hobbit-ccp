const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const app = express();

app.use(cors());
app.use(express.json());

// Gaming PC with Sunshine server
const GAMING_PC = process.env.GAMING_PC_HOST || '192.168.0.69';

// Cached app list - refreshed on-demand when stale
let cachedApps = ['Desktop'];
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

// Cleanup when gaming session ends
function cleanupGamingSession() {
  console.log('Gaming session ended, cleaning up...');
  exec('sudo /usr/local/bin/hdmi-control.sh off');
  // Xbox Wireless Adapter controllers don't need software disconnect —
  // the adapter handles connection state in hardware
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

    // Enable HDMI output first, then launch X
    exec('sudo /usr/local/bin/hdmi-control.sh on', () => {
      // Launch X with openbox window manager for proper fullscreen handling
      // Stream at 1080p to match monitor, openbox handles window maximization
      const cmd = `sudo xinit /bin/sh -c 'xhost +local: && xrandr --output HDMI-2 --mode 1920x1080 && openbox --sm-disable &
sleep 1 && su hobbit -c "DISPLAY=:0 moonlight stream ${GAMING_PC} \\"${appName}\\" --1080 --fps 60 --display-mode fullscreen"' -- :0 vt7`;

      const child = spawn('sh', ['-c', cmd], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      // Cleanup when the gaming session exits on its own
      child.on('close', () => {
        cleanupGamingSession();
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
  // Turn off monitor FIRST while Xorg is still running (DPMS works reliably)
  exec('DISPLAY=:0 xset dpms force off', () => {
    // Small delay to let DPMS take effect before killing X
    setTimeout(() => {
      exec('sudo pkill -9 Xorg; sudo pkill -9 xinit; sudo pkill -9 moonlight', () => {
        setTimeout(cleanupGamingSession, 500);
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
  exec(`nc -z -w 1 ${GAMING_PC} 47989`, { timeout: 2000 }, (err) => {
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

// Xbox Wireless Adapter — connected controllers
// Only match devices from the xone driver (Xbox Wireless Adapter)
let pairingActive = false;
let pairingTimeout = null;

app.get('/controllers', (req, res) => {
  fs.readdir('/dev/input/by-id/', (err, files) => {
    if (err) return res.json({ controllers: [], pairing: pairingActive });
    const controllers = files
      .filter(f => f.endsWith('-event-joystick') && /xbox|microsoft/i.test(f))
      .map(f => ({
        name: f.replace(/-event-joystick$/, '').replace(/^usb-/, '').replace(/_/g, ' ')
      }));
    res.json({ controllers, pairing: pairingActive });
  });
});

// Toggle adapter pairing mode via xone sysfs interface
app.post('/controllers/pair', (req, res) => {
  const { enabled } = req.body;

  if (enabled && !pairingActive) {
    pairingActive = true;
    pairingTimeout = setTimeout(() => {
      exec('sudo /usr/local/bin/xone-pair.sh 0');
      pairingActive = false;
      pairingTimeout = null;
    }, 30000);
    exec('sudo /usr/local/bin/xone-pair.sh 1', (err) => {
      if (err) console.error('xone-pair.sh:', err.message);
    });
    res.json({ status: 'pairing' });
  } else if (!enabled && pairingActive) {
    exec('sudo /usr/local/bin/xone-pair.sh 0');
    pairingActive = false;
    if (pairingTimeout) {
      clearTimeout(pairingTimeout);
      pairingTimeout = null;
    }
    res.json({ status: 'stopped' });
  } else {
    res.json({ status: enabled ? 'already pairing' : 'not pairing' });
  }
});

// Bluetooth controller management (DISABLED — using Xbox Wireless Adapter)
let scanProcess = null;
let scanTimeout = null;
let discoveredDevices = new Map();

// GET /bluetooth/status - adapter status + paired devices
app.get('/bluetooth/status', (req, res) => {
  exec('bluetoothctl devices Paired', { timeout: 5000 }, (err, stdout) => {
    const devices = [];
    if (!err && stdout.trim()) {
      for (const line of stdout.trim().split('\n')) {
        const match = line.match(/Device\s+([A-F0-9:]+)\s+(.+)/i);
        if (match) devices.push({ mac: match[1], name: match[2] });
      }
    }
    if (devices.length === 0) {
      return res.json({ devices: [], scanning: !!scanProcess });
    }
    // Get connection status for each device
    Promise.all(devices.map(d =>
      new Promise(resolve => {
        exec(`bluetoothctl info ${d.mac}`, (e, out) => {
          d.connected = out?.includes('Connected: yes') ?? false;
          d.trusted = out?.includes('Trusted: yes') ?? false;
          resolve(d);
        });
      })
    )).then(devs => res.json({ devices: devs, scanning: !!scanProcess }));
  });
});

// POST /bluetooth/scan - start/stop discovery
app.post('/bluetooth/scan', (req, res) => {
  const { enabled } = req.body;

  if (enabled && !scanProcess) {
    discoveredDevices.clear();

    // Use script mode for proper scanning
    scanProcess = spawn('bluetoothctl', ['--agent=NoInputNoOutput'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';
    scanProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      // Parse device discoveries - handle multiple formats
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line

      for (const line of lines) {
        // Match: [NEW] Device XX:XX:XX:XX:XX:XX Name
        // Also match: Device XX:XX:XX:XX:XX:XX Name
        const newMatch = line.match(/(?:\[NEW\]\s+)?Device\s+([A-F0-9:]{17})\s+(.+)/i);
        if (newMatch && !discoveredDevices.has(newMatch[1])) {
          discoveredDevices.set(newMatch[1], { mac: newMatch[1], name: newMatch[2].trim() });
        }
      }
    });

    scanProcess.on('close', () => {
      scanProcess = null;
      if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
      }
    });

    scanProcess.on('error', (err) => {
      console.error('Bluetooth scan error:', err.message);
      scanProcess = null;
    });

    // Set up agent and start scanning
    scanProcess.stdin.write('power on\n');
    scanProcess.stdin.write('agent on\n');
    scanProcess.stdin.write('default-agent\n');
    scanProcess.stdin.write('scan on\n');

    // Auto-stop after 30 seconds
    scanTimeout = setTimeout(() => {
      if (scanProcess) {
        scanProcess.stdin.write('scan off\n');
        setTimeout(() => {
          if (scanProcess) {
            scanProcess.stdin.write('quit\n');
          }
        }, 500);
      }
    }, 30000);

    res.json({ status: 'scanning' });
  } else if (!enabled && scanProcess) {
    scanProcess.stdin.write('scan off\n');
    setTimeout(() => {
      if (scanProcess) {
        scanProcess.stdin.write('quit\n');
      }
    }, 500);
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
    res.json({ status: 'stopped' });
  } else {
    res.json({ status: enabled ? 'already scanning' : 'not scanning' });
  }
});

// GET /bluetooth/discovered - devices found during scan
app.get('/bluetooth/discovered', (req, res) => {
  res.json({
    scanning: !!scanProcess,
    devices: Array.from(discoveredDevices.values())
  });
});

// POST /bluetooth/pair - pair with device
app.post('/bluetooth/pair', (req, res) => {
  const { mac } = req.body;
  if (!mac?.match(/^[A-F0-9:]+$/i)) return res.status(400).json({ error: 'Invalid MAC' });

  // Use expect-like approach for pairing
  const pairProcess = spawn('bluetoothctl', ['--agent=NoInputNoOutput'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  pairProcess.stdout.on('data', (data) => { output += data.toString(); });
  pairProcess.stderr.on('data', (data) => { output += data.toString(); });

  pairProcess.stdin.write('agent on\n');
  pairProcess.stdin.write('default-agent\n');
  pairProcess.stdin.write(`pair ${mac}\n`);

  setTimeout(() => {
    pairProcess.stdin.write(`trust ${mac}\n`);
    setTimeout(() => {
      pairProcess.stdin.write('quit\n');
    }, 1000);
  }, 5000);

  pairProcess.on('close', () => {
    if (output.includes('Pairing successful') || output.includes('already paired')) {
      res.json({ status: 'paired' });
    } else if (output.includes('Failed')) {
      res.status(500).json({ error: 'Pairing failed', details: output });
    } else {
      res.json({ status: 'paired' });
    }
  });
});

// POST /bluetooth/connect - connect to paired device
app.post('/bluetooth/connect', (req, res) => {
  const { mac } = req.body;
  if (!mac?.match(/^[A-F0-9:]+$/i)) return res.status(400).json({ error: 'Invalid MAC' });
  exec(`bluetoothctl connect ${mac}`, { timeout: 15000 }, (err, stdout, stderr) => {
    if (err && !stdout.includes('Connection successful')) {
      return res.status(500).json({ error: stderr || err.message });
    }
    res.json({ status: 'connected' });
  });
});

// POST /bluetooth/disconnect
app.post('/bluetooth/disconnect', (req, res) => {
  const { mac } = req.body;
  if (!mac?.match(/^[A-F0-9:]+$/i)) return res.status(400).json({ error: 'Invalid MAC' });
  exec(`bluetoothctl disconnect ${mac}`, (err) => {
    res.json({ status: 'disconnected' });
  });
});

// DELETE /bluetooth/device/:mac - remove paired device
app.delete('/bluetooth/device/:mac', (req, res) => {
  const mac = decodeURIComponent(req.params.mac);
  if (!mac.match(/^[A-F0-9:]+$/i)) return res.status(400).json({ error: 'Invalid MAC' });
  exec(`bluetoothctl remove ${mac}`, (err) => {
    res.json({ status: 'removed' });
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

    // Subscribe to individual device topics
    for (const member of groupMembers) {
      mqttClient.subscribe(`zigbee2mqtt/${member.friendly_name}`, { qos: 0 });
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
      if (data.color !== undefined) lightsState.group.color = data.color;
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
        if (data.color !== undefined) lightsState.devices[deviceName].color = data.color;
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
  if (lightsIdleCheck) {
    clearInterval(lightsIdleCheck);
    lightsIdleCheck = null;
  }
}

function touchLights() {
  lastLightsRequest = Date.now();
  startLightsMonitor();
}

// GET /lights — current state of group + individual lights
app.get('/lights', (req, res) => {
  touchLights();
  // Aggregate capabilities across all group members
  const capabilities = { color: false, color_temp: false, color_temp_min: 500, color_temp_max: 150 };
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
    color: lightsState.devices[m.friendly_name]?.color || null,
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
      color: lightsState.group.color || null,
      color_temp: lightsState.group.color_temp || null,
    },
    devices,
  });
});

// POST /lights/group/set — control group { state?, brightness?, color?, color_temp? }
app.post('/lights/group/set', (req, res) => {
  touchLights();
  if (!mqttClient?.connected) {
    return res.status(503).json({ error: 'MQTT not connected' });
  }
  const payload = {};
  if (req.body.state !== undefined) payload.state = req.body.state;
  if (req.body.brightness !== undefined) payload.brightness = req.body.brightness;
  if (req.body.color !== undefined) payload.color = req.body.color;
  if (req.body.color_temp !== undefined) payload.color_temp = req.body.color_temp;
  mqttClient.publish(`zigbee2mqtt/${LIGHT_GROUP}/set`, JSON.stringify(payload));
  res.json({ status: 'ok', payload });
});

// POST /lights/:id/set — control individual light { state?, brightness?, color?, color_temp? }
app.post('/lights/:id/set', (req, res) => {
  touchLights();
  if (!mqttClient?.connected) {
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
  mqttClient.publish(`zigbee2mqtt/${id}/set`, JSON.stringify(payload));
  res.json({ status: 'ok', payload });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hobbit Bridge running on port ${PORT}`);
});
