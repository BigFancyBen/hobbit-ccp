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

// Cleanup when session ends (only if no new session has started)
function cleanupSession(gen) {
  if (gen !== sessionGen) return;
  sessionGen++;  // invalidate this gen so a second call (close + timeout) is a no-op
  console.log('Session ended, cleaning up...');
  exec('sudo /usr/local/bin/hdmi-control.sh off');
}

// Launch Moonlight streaming a specific app
// POST /launch-moonlight?app=Desktop  (use actual app name from Sunshine)
app.post('/launch-moonlight', (req, res) => {
  const appName = req.query.app || 'Desktop';
  if (!cachedApps.includes(appName)) {
    return res.status(400).json({ error: 'Unknown app' });
  }

  // Check if already running (X server = gaming, kodi = media center)
  exec('pgrep -x Xorg || pgrep -x kodi.bin', (err) => {
    if (!err) {
      return res.status(400).json({ error: 'Already running. Exit first.' });
    }

    // Increment session generation so any pending cleanup from a previous session becomes a no-op
    const gen = ++sessionGen;

    // Pin ALSA at max as passthrough, unmute PulseAudio, then turn on HDMI and launch X
    exec('amixer set Master unmute 100% && amixer set Headphone unmute 100%');
    exec('sudo -u hobbit env XDG_RUNTIME_DIR=/run/user/1000 pactl set-sink-mute @DEFAULT_SINK@ 0');
    exec('sudo /usr/local/bin/hdmi-control.sh on', () => {
      // Launch X with openbox window manager for proper fullscreen handling
      // Stream at 4K 60fps to match monitor, openbox handles window maximization
      const cmd = `sudo xinit /bin/sh -c 'xhost +local: && xrandr --output HDMI-2 --mode 3840x2160 && openbox --sm-disable --config-file /home/hobbit/openbox-rc.xml &
sleep 1 && su hobbit -c "DISPLAY=:0 PULSE_SERVER=unix:/run/user/1000/pulse/native moonlight stream ${GAMING_PC} \\"${appName}\\" --4K --fps 60 --display-mode fullscreen"' -- :0 vt7`;

      const child = spawn('sh', ['-c', cmd], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      // Cleanup when the gaming session exits on its own
      child.on('close', () => {
        cleanupSession(gen);
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
        setTimeout(() => cleanupSession(gen), 500);
      });
    }, 200);
  });
  res.json({ status: 'stopped' });
});

// Launch Kodi media center (GBM backend, no X server needed)
app.post('/launch-kodi', (req, res) => {
  // Check if already running
  exec('pgrep -x Xorg || pgrep -x kodi.bin', (err) => {
    if (!err) {
      return res.status(400).json({ error: 'Already running. Exit first.' });
    }

    const gen = ++sessionGen;

    exec('amixer set Master unmute 100% && amixer set Headphone unmute 100%');
    exec('sudo -u hobbit env XDG_RUNTIME_DIR=/run/user/1000 pactl set-sink-mute @DEFAULT_SINK@ 0');
    exec('sudo /usr/local/bin/hdmi-control.sh on', () => {
      const child = spawn('sudo', ['-u', 'hobbit', 'env', 'HOME=/home/hobbit', 'XDG_RUNTIME_DIR=/run/user/1000', 'PULSE_SERVER=unix:/run/user/1000/pulse/native', 'kodi-standalone', '--windowing=gbm'], {
        detached: true,
        stdio: ['ignore', 'ignore', 'pipe']
      });
      child.stderr.on('data', d => console.error('[kodi stderr]', d.toString().trim()));
      child.on('error', e => console.error('[kodi spawn error]', e.message));
      child.unref();

      child.on('close', (code) => {
        if (code) console.log(`[kodi] exited with code ${code}`);
        cleanupSession(gen);
      });

      res.json({ status: 'launching' });
    });
  });
});

// Exit Kodi media center
app.post('/exit-kodi', (req, res) => {
  const gen = sessionGen;
  exec('sudo pkill -x kodi.bin', () => {
    // Wait for kodi to fully exit before turning off HDMI
    setTimeout(() => {
      exec('sudo /usr/local/bin/hdmi-control.sh off', (err) => {
        if (err) console.error('[exit-kodi] hdmi-control.sh off failed:', err.message);
      });
      cleanupSession(gen);
    }, 500);
  });
  res.json({ status: 'stopped' });
});

// Proxy JSON-RPC to Kodi web server
app.post('/kodi/jsonrpc', async (req, res) => {
  try {
    const response = await fetch('http://localhost:8085/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Kodi not responding' });
  }
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
  // Three-way mode: kodi (GBM, no X), gaming (X server), idle
  exec('pgrep -x kodi.bin', (kodiErr) => {
    if (!kodiErr) {
      return res.json({ mode: 'kodi', sunshineOnline });
    }
    exec('pgrep -x Xorg', (xorgErr) => {
      res.json({
        mode: !xorgErr ? 'gaming' : 'idle',
        sunshineOnline
      });
    });
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve CA certificate for device import
app.get('/ca.crt', (req, res) => {
  const certPath = '/home/hobbit/hobbit/ssl/hobbit-ca.crt';
  res.setHeader('Content-Type', 'application/x-x509-ca-cert');
  res.setHeader('Content-Disposition', 'attachment; filename="hobbit-ca.crt"');
  res.sendFile(certPath);
});

// System volume control via PulseAudio (single volume authority)
// ALSA Master/Headphone are pinned at 100% as passthrough so PA has full range.
const PA_SINK = '@DEFAULT_SINK@';

function readPaVolume(callback) {
  exec(`sudo -u hobbit env XDG_RUNTIME_DIR=/run/user/1000 pactl get-sink-volume ${PA_SINK}`, (err, volOut) => {
    if (err) return callback(err);
    exec(`sudo -u hobbit env XDG_RUNTIME_DIR=/run/user/1000 pactl get-sink-mute ${PA_SINK}`, (err2, muteOut) => {
      if (err2) return callback(err2);
      const volMatch = volOut.match(/(\d+)%/);
      const muteMatch = muteOut.match(/Mute:\s*(yes|no)/);
      if (!volMatch || !muteMatch) return callback(new Error('Could not parse pactl output'));
      callback(null, { volume: parseInt(volMatch[1]), muted: muteMatch[1] === 'yes' });
    });
  });
}

function runPactl(args) {
  return new Promise((resolve, reject) => {
    exec(`sudo -u hobbit env XDG_RUNTIME_DIR=/run/user/1000 pactl ${args}`, (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

app.get('/volume', (req, res) => {
  readPaVolume((err, state) => {
    if (err) return res.status(500).json({ error: 'Failed to read volume' });
    res.json(state);
  });
});

app.post('/volume', (req, res) => {
  const { volume, muted, delta } = req.body;
  const commands = [];

  if (typeof volume === 'number') {
    const v = Math.max(0, Math.min(100, Math.round(volume)));
    commands.push(`set-sink-volume ${PA_SINK} ${v}%`);
  }
  if (typeof delta === 'number') {
    const sign = delta >= 0 ? '+' : '-';
    const abs = Math.abs(Math.round(delta));
    commands.push(`set-sink-volume ${PA_SINK} ${sign}${abs}%`);
  }
  if (muted === true) commands.push(`set-sink-mute ${PA_SINK} 1`);
  else if (muted === false) commands.push(`set-sink-mute ${PA_SINK} 0`);
  else if (muted === 'toggle') commands.push(`set-sink-mute ${PA_SINK} toggle`);

  if (commands.length === 0) return res.status(400).json({ error: 'No valid params' });

  Promise.all(commands.map(cmd => runPactl(cmd)))
    .then(() => {
      readPaVolume((err, state) => {
        if (err) return res.status(500).json({ error: 'Failed to read volume' });
        res.json(state);
      });
    })
    .catch(() => res.status(500).json({ error: 'Failed to set volume' }));
});

app.get('/wifi', (req, res) => {
  const ssid = process.env.WIFI_SSID;
  const password = process.env.WIFI_PASSWORD;
  if (!ssid || !password) return res.status(503).json({ error: 'Wi-Fi not configured' });
  res.json({ ssid, password });
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

const LIGHT_GROUPS = ['livingroom', 'kitchen', 'office'];
const MQTT_URL = 'mqtt://127.0.0.1:1883';
const LIGHT_IDLE_TIMEOUT = 60000; // Disconnect MQTT after 60s idle

let mqttClient = null;
let lastLightsRequest = 0;
let lightsIdleCheck = null;
let groupMembers = {};   // groupName → [{ ieee, friendly_name, supports }]
let deviceState = {};     // friendly_name → { state, brightness, color_hex, color_temp }
let lightsState = {};     // groupName → { state, brightness, color_hex, color_temp }
let allDevices = [];      // cached bridge/devices list
let subscribedTopics = new Set();
let groupsResolved = false;

// Initialize each group
for (const g of LIGHT_GROUPS) {
  lightsState[g] = { state: 'OFF', brightness: 0 };
  groupMembers[g] = [];
}

function extractSupports(device) {
  const supports = { color: false, color_temp: false, color_temp_min: 150, color_temp_max: 500 };
  const exposes = device.definition?.exposes || [];
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
  return supports;
}

function isLightDevice(device) {
  if (device.type === 'Coordinator') return false;
  const exposes = device.definition?.exposes || [];
  for (const expose of exposes) {
    if (expose.type === 'light') return true;
    const features = expose.features || [];
    for (const f of features) {
      if (f.name === 'state' || f.name === 'brightness') return true;
    }
  }
  return false;
}

// Auto-off timers for individual devices — keyed by friendly_name
const deviceTimers = new Map(); // { timeoutId, endsAt }

function setDeviceTimer(name, ms) {
  clearDeviceTimer(name);
  const endsAt = Date.now() + ms;
  const timeoutId = setTimeout(async () => {
    console.log(`Timer expired for ${name}, turning OFF`);
    try {
      touchLights();
      await ensureMqttConnected();
      mqttClient.publish(`zigbee2mqtt/${name}/set`, JSON.stringify({ state: 'OFF' }));
      console.log(`Timer OFF command sent for ${name}`);
    } catch (err) {
      console.error(`Timer failed to send OFF for ${name}:`, err.message);
    }
    deviceTimers.delete(name);
  }, ms);
  deviceTimers.set(name, { timeoutId, endsAt });
  console.log(`Timer set for ${name}: ${ms / 60000}min (ends at ${new Date(endsAt).toLocaleTimeString()})`);
}

function clearDeviceTimer(name) {
  const entry = deviceTimers.get(name);
  if (entry) {
    clearTimeout(entry.timeoutId);
    deviceTimers.delete(name);
    console.log(`Timer cleared for ${name}`);
  }
}

function startLightsMonitor() {
  if (mqttClient) return;
  console.log('Lights MQTT connecting...');

  mqttClient = mqtt.connect(MQTT_URL);

  mqttClient.on('connect', () => {
    console.log('Lights MQTT connected');
    // Subscribe to all group topics and bridge discovery topics
    for (const g of LIGHT_GROUPS) {
      mqttClient.subscribe(`zigbee2mqtt/${g}`, { qos: 0 });
    }
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
    allDevices = pendingDevices;

    // Collect all grouped IEEE addresses
    const allGroupedIeee = new Set();

    for (const groupName of LIGHT_GROUPS) {
      const group = pendingGroups.find(g => g.friendly_name === groupName);
      if (!group) {
        // Group doesn't exist in Zigbee2MQTT yet — skip gracefully
        groupMembers[groupName] = [];
        continue;
      }

      const ieeeSet = new Set(group.members.map(m => m.ieee_address));
      groupMembers[groupName] = pendingDevices
        .filter(d => ieeeSet.has(d.ieee_address))
        .map(d => {
          allGroupedIeee.add(d.ieee_address);
          return { ieee: d.ieee_address, friendly_name: d.friendly_name, supports: extractSupports(d) };
        });

      console.log(`Light group "${groupName}" members:`, groupMembers[groupName].map(m => m.friendly_name));
    }
    groupsResolved = true;

    // Subscribe to individual device topics for all groups (skip already-subscribed)
    for (const groupName of LIGHT_GROUPS) {
      for (const member of groupMembers[groupName]) {
        const topic = `zigbee2mqtt/${member.friendly_name}`;
        if (!subscribedTopics.has(topic)) {
          mqttClient.subscribe(topic, { qos: 0 });
          subscribedTopics.add(topic);
        }
      }
    }

    // Subscribe to ungrouped light devices
    for (const d of pendingDevices) {
      if (allGroupedIeee.has(d.ieee_address)) continue;
      if (!isLightDevice(d)) continue;
      const topic = `zigbee2mqtt/${d.friendly_name}`;
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
    } else {
      // Check if this is a group topic
      const topicName = topic.replace('zigbee2mqtt/', '');
      const matchedGroup = LIGHT_GROUPS.find(g => g === topicName);

      if (matchedGroup) {
        if (data.state !== undefined) lightsState[matchedGroup].state = data.state;
        if (data.brightness !== undefined) lightsState[matchedGroup].brightness = data.brightness;
        if (data.color_temp !== undefined) lightsState[matchedGroup].color_temp = data.color_temp;
      } else {
        // Individual device state (grouped or ungrouped)
        if (!deviceState[topicName]) {
          deviceState[topicName] = { state: 'OFF', brightness: 0 };
        }
        if (data.state !== undefined) {
          deviceState[topicName].state = data.state;
          if (data.state === 'OFF') clearDeviceTimer(topicName);
        }
        if (data.brightness !== undefined) deviceState[topicName].brightness = data.brightness;
        if (data.color_temp !== undefined) deviceState[topicName].color_temp = data.color_temp;
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
  groupsResolved = false;
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

// GET /lights — current state of all groups + ungrouped lights
app.get('/lights', async (req, res) => {
  touchLights();
  try { await ensureMqttConnected(2000); } catch {}

  // Collect all grouped IEEE addresses
  const allGroupedIeee = new Set();
  for (const g of LIGHT_GROUPS) {
    for (const m of groupMembers[g]) allGroupedIeee.add(m.ieee);
  }

  // Build groups array — skip empty groups (not yet in Zigbee2MQTT)
  const groups = [];
  for (const groupName of LIGHT_GROUPS) {
    const members = groupMembers[groupName];
    if (!members || members.length === 0) continue;

    const capabilities = { color: false, color_temp: false, color_temp_min: 150, color_temp_max: 500 };
    for (const m of members) {
      if (m.supports.color) capabilities.color = true;
      if (m.supports.color_temp) {
        capabilities.color_temp = true;
        capabilities.color_temp_min = Math.min(capabilities.color_temp_min, m.supports.color_temp_min);
        capabilities.color_temp_max = Math.max(capabilities.color_temp_max, m.supports.color_temp_max);
      }
    }
    if (!capabilities.color_temp) {
      capabilities.color_temp_min = 150;
      capabilities.color_temp_max = 500;
    }

    const devices = members.map(m => ({
      id: m.friendly_name,
      name: m.friendly_name,
      state: deviceState[m.friendly_name]?.state || 'OFF',
      brightness: deviceState[m.friendly_name]?.brightness || 0,
      color_hex: deviceState[m.friendly_name]?.color_hex || null,
      color_temp: deviceState[m.friendly_name]?.color_temp || null,
      supports: m.supports,
      timer: deviceTimers.has(m.friendly_name) ? { endsAt: deviceTimers.get(m.friendly_name).endsAt } : null,
    }));

    groups.push({
      name: groupName,
      capabilities,
      state: lightsState[groupName]?.state || 'OFF',
      brightness: lightsState[groupName]?.brightness || 0,
      color_hex: lightsState[groupName]?.color_hex || null,
      color_temp: lightsState[groupName]?.color_temp || null,
      devices,
    });
  }

  // Ungrouped light devices
  const ungrouped = [];
  for (const d of allDevices) {
    if (allGroupedIeee.has(d.ieee_address)) continue;
    if (!isLightDevice(d)) continue;
    const name = d.friendly_name;
    ungrouped.push({
      id: name,
      name,
      state: deviceState[name]?.state || 'OFF',
      brightness: deviceState[name]?.brightness || 0,
      color_hex: deviceState[name]?.color_hex || null,
      color_temp: deviceState[name]?.color_temp || null,
      supports: extractSupports(d),
      timer: deviceTimers.has(name) ? { endsAt: deviceTimers.get(name).endsAt } : null,
    });
  }

  res.json({
    connected: (mqttClient?.connected && groupsResolved) || false,
    groups,
    ungrouped,
  });
});

// POST /lights/group/:groupName/set — control group { state?, brightness?, color?, color_temp? }
app.post('/lights/group/:groupName/set', async (req, res) => {
  touchLights();
  const groupName = req.params.groupName;
  if (!LIGHT_GROUPS.includes(groupName)) {
    return res.status(400).json({ error: 'Unknown group' });
  }
  try {
    await ensureMqttConnected();
  } catch {
    return res.status(503).json({ error: 'MQTT not connected' });
  }
  const members = groupMembers[groupName] || [];
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
    lightsState[groupName].color_hex = hex;
    for (const member of members) {
      if (!deviceState[member.friendly_name]) deviceState[member.friendly_name] = { state: 'OFF', brightness: 0 };
      deviceState[member.friendly_name].color_hex = hex;
    }
  }
  if (req.body.color_temp !== undefined) {
    lightsState[groupName].color_hex = null;
    for (const member of members) {
      if (deviceState[member.friendly_name]) deviceState[member.friendly_name].color_hex = null;
    }
  }

  if (brightnessOnly) {
    for (const member of members) {
      const name = member.friendly_name;
      if (deviceState[name]?.state === 'ON') {
        mqttClient.publish(`zigbee2mqtt/${name}/set`, JSON.stringify({ brightness: payload.brightness }));
      }
    }
  } else {
    mqttClient.publish(`zigbee2mqtt/${groupName}/set`, JSON.stringify(payload));
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
  // Validate against all known devices (all groups + ungrouped)
  const allKnown = new Set();
  for (const g of LIGHT_GROUPS) {
    for (const m of groupMembers[g]) allKnown.add(m.friendly_name);
  }
  for (const d of allDevices) {
    if (isLightDevice(d)) allKnown.add(d.friendly_name);
  }
  if (!allKnown.has(id)) {
    return res.status(400).json({ error: 'Unknown light' });
  }
  const payload = {};
  if (req.body.state !== undefined) payload.state = req.body.state;
  if (req.body.brightness !== undefined) payload.brightness = req.body.brightness;
  if (req.body.color !== undefined) payload.color = req.body.color;
  if (req.body.color_temp !== undefined) payload.color_temp = req.body.color_temp;

  // Track color_hex on set so we can serve it back (MQTT only echoes xy)
  if (!deviceState[id]) deviceState[id] = { state: 'OFF', brightness: 0 };
  if (req.body.color?.hex) deviceState[id].color_hex = req.body.color.hex;
  if (req.body.color_temp !== undefined) deviceState[id].color_hex = null;

  mqttClient.publish(`zigbee2mqtt/${id}/set`, JSON.stringify(payload));
  res.json({ status: 'ok', payload });
});

// POST /lights/:id/timer — set or cancel auto-off timer { duration: <minutes> }
app.post('/lights/:id/timer', async (req, res) => {
  touchLights();
  try {
    await ensureMqttConnected();
  } catch {
    return res.status(503).json({ error: 'MQTT not connected' });
  }
  const id = req.params.id;
  const allKnown = new Set();
  for (const g of LIGHT_GROUPS) {
    for (const m of groupMembers[g]) allKnown.add(m.friendly_name);
  }
  for (const d of allDevices) {
    if (isLightDevice(d)) allKnown.add(d.friendly_name);
  }
  if (!allKnown.has(id)) {
    return res.status(400).json({ error: 'Unknown light' });
  }
  const duration = req.body.duration;
  if (typeof duration !== 'number' || duration < 0) {
    return res.status(400).json({ error: 'duration must be a non-negative number (minutes)' });
  }
  if (duration === 0) {
    clearDeviceTimer(id);
    return res.json({ status: 'ok', timer: null });
  }
  // Turn device ON and set the auto-off timer
  mqttClient.publish(`zigbee2mqtt/${id}/set`, JSON.stringify({ state: 'ON' }));
  setDeviceTimer(id, duration * 60000);
  const endsAt = deviceTimers.get(id)?.endsAt;
  res.json({ status: 'ok', timer: { endsAt } });
});

// ============================================================
// Spotify — OAuth, search, and queue endpoints
// ============================================================
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const SPOTIFY_TOKEN_FILE = path.join(__dirname, 'spotify-tokens.json');

let spotifyTokens = null; // { access_token, refresh_token, expires_at }

// Spotify response cache — keyed by endpoint string, stores { json, status, ts }
const spotifyCache = new Map();

// SSE clients for real-time queue update notifications
const sseClients = new Set();

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
}
const SPOTIFY_CACHE_TTL = {
  '/me/player/currently-playing': 5_000,
  '/me/player/queue': 10_000,
};
const SPOTIFY_SEARCH_TTL = 60_000;

function spotifyCacheTtl(endpoint) {
  for (const [prefix, ttl] of Object.entries(SPOTIFY_CACHE_TTL)) {
    if (endpoint.startsWith(prefix)) return ttl;
  }
  if (endpoint.startsWith('/search')) return SPOTIFY_SEARCH_TTL;
  return 0;
}

// Load persisted tokens on startup
try {
  spotifyTokens = JSON.parse(fs.readFileSync(SPOTIFY_TOKEN_FILE, 'utf8'));
  console.log('Loaded Spotify tokens from disk');
} catch {
  // No saved tokens yet
}

function saveSpotifyTokens() {
  try {
    fs.writeFileSync(SPOTIFY_TOKEN_FILE, JSON.stringify(spotifyTokens, null, 2));
  } catch (e) {
    console.error('Failed to save Spotify tokens:', e.message);
  }
}

async function getSpotifyToken() {
  if (!spotifyTokens?.refresh_token) throw new Error('Not authenticated');
  // Return existing token if still valid (with 60s buffer)
  if (spotifyTokens.access_token && spotifyTokens.expires_at > Date.now() + 60000) {
    return spotifyTokens.access_token;
  }
  // Refresh the token
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: spotifyTokens.refresh_token,
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: params.toString(),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const data = await res.json();
  spotifyTokens.access_token = data.access_token;
  if (data.refresh_token) spotifyTokens.refresh_token = data.refresh_token;
  spotifyTokens.expires_at = Date.now() + data.expires_in * 1000;
  saveSpotifyTokens();
  return spotifyTokens.access_token;
}

async function spotifyApi(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const ttl = method === 'GET' ? spotifyCacheTtl(endpoint) : 0;

  if (ttl > 0) {
    const cached = spotifyCache.get(endpoint);
    if (cached && Date.now() - cached.ts < ttl) {
      return { ok: true, status: cached.status, json: async () => cached.json };
    }
  }

  const token = await getSpotifyToken();
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });

  if (ttl > 0 && res.status === 200) {
    const json = await res.json();
    spotifyCache.set(endpoint, { json, status: res.status, ts: Date.now() });
    return { ok: true, status: res.status, json: async () => json };
  }

  return res;
}

// Build Spotify redirect URI from the incoming request's Host header
// so auth works from both hobbit.house (LAN) and the Tailscale FQDN.
// Both must be registered in the Spotify app dashboard.
function spotifyRedirectUri(req) {
  const host = req.get('host') || req.hostname;
  const proto = req.get('x-forwarded-proto') || req.protocol;
  return `${proto}://${host}/api/control/spotify/callback`;
}

// OAuth: redirect to Spotify authorize page
app.get('/spotify/auth', (req, res) => {
  if (!SPOTIFY_CLIENT_ID) return res.status(500).json({ error: 'Spotify not configured' });
  const state = Math.random().toString(36).substring(2, 15);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: 'user-modify-playback-state user-read-playback-state user-read-recently-played',
    redirect_uri: spotifyRedirectUri(req),
    state,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// OAuth: exchange authorization code for tokens
app.get('/spotify/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.redirect('/tunes');
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    const redirectUri = spotifyRedirectUri(req);
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: params.toString(),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Spotify token exchange failed:', err);
      return res.redirect('/tunes');
    }
    const data = await tokenRes.json();
    spotifyTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    saveSpotifyTokens();
    console.log('Spotify authenticated successfully');
    res.redirect('/tunes');
  } catch (e) {
    console.error('Spotify callback error:', e.message);
    res.redirect('/tunes');
  }
});

// Auth status
app.get('/spotify/status', (req, res) => {
  res.json({ authenticated: !!(spotifyTokens?.refresh_token) });
});

// Logout
app.post('/spotify/logout', (req, res) => {
  spotifyTokens = null;
  try { fs.unlinkSync(SPOTIFY_TOKEN_FILE); } catch {}
  res.json({ status: 'ok' });
});

// Search tracks
app.get('/spotify/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    const spotRes = await spotifyApi(`/search?q=${encodeURIComponent(q)}&type=track&limit=10`);
    if (!spotRes.ok) return res.status(spotRes.status).json({ error: 'Spotify search failed' });
    const data = await spotRes.json();
    const tracks = (data.tracks?.items || []).map(t => ({
      id: t.id,
      name: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      album: t.album.name,
      albumArt: t.album.images?.find(i => i.width <= 100)?.url || t.album.images?.[0]?.url || '',
      uri: t.uri,
    }));
    res.json({ tracks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Queue a single track by URI
app.post('/spotify/queue', async (req, res) => {
  const { uri } = req.body;
  if (!uri) return res.status(400).json({ error: 'Missing uri' });
  try {
    const spotRes = await spotifyApi(`/me/player/queue?uri=${encodeURIComponent(uri)}`, { method: 'POST' });
    if (spotRes.status === 404) {
      return res.status(404).json({ error: 'No active Spotify player. Start playing a song first.' });
    }
    if (!spotRes.ok) {
      const err = await spotRes.text();
      return res.status(spotRes.status).json({ error: err || 'Failed to queue' });
    }
    for (const key of spotifyCache.keys()) {
      if (key.startsWith('/me/player')) spotifyCache.delete(key);
    }
    res.json({ status: 'ok' });
    broadcastSSE('queue-updated', {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Queue from a Spotify link (track, album, or playlist)
app.post('/spotify/queue-link', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  // Parse Spotify URL: https://open.spotify.com/{type}/{id}?...
  const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) return res.status(400).json({ error: 'Invalid Spotify URL' });

  const [, type, id] = match;

  try {
    if (type === 'track') {
      const uri = `spotify:track:${id}`;
      const spotRes = await spotifyApi(`/me/player/queue?uri=${encodeURIComponent(uri)}`, { method: 'POST' });
      if (spotRes.status === 404) {
        return res.status(404).json({ error: 'No active Spotify player. Start playing a song first.' });
      }
      if (!spotRes.ok) return res.status(spotRes.status).json({ error: 'Failed to queue track' });
      for (const key of spotifyCache.keys()) {
        if (key.startsWith('/me/player')) spotifyCache.delete(key);
      }
      broadcastSSE('queue-updated', {});
      return res.json({ queued: 1, total: 1 });
    }

    // Album or playlist — fetch tracks then queue each with delay
    let tracks = [];
    if (type === 'album') {
      const spotRes = await spotifyApi(`/albums/${id}/tracks?limit=50`);
      if (!spotRes.ok) return res.status(spotRes.status).json({ error: 'Failed to fetch album' });
      const data = await spotRes.json();
      tracks = data.items.map(t => t.uri);
    } else {
      const spotRes = await spotifyApi(`/playlists/${id}/tracks?limit=50&fields=items(track(uri))`);
      if (!spotRes.ok) return res.status(spotRes.status).json({ error: 'Failed to fetch playlist' });
      const data = await spotRes.json();
      tracks = data.items.map(t => t.track?.uri).filter(Boolean);
    }

    let queued = 0;
    for (const uri of tracks) {
      const qRes = await spotifyApi(`/me/player/queue?uri=${encodeURIComponent(uri)}`, { method: 'POST' });
      if (qRes.status === 404) {
        return res.status(404).json({ error: 'No active Spotify player. Start playing a song first.', queued, total: tracks.length });
      }
      if (qRes.ok) queued++;
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 100));
    }
    for (const key of spotifyCache.keys()) {
      if (key.startsWith('/me/player')) spotifyCache.delete(key);
    }
    res.json({ queued, total: tracks.length });
    broadcastSSE('queue-updated', {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SSE stream for real-time queue update notifications
app.get('/spotify/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// Get player queue (currently playing + upcoming)
app.get('/spotify/queue', async (req, res) => {
  try {
    const spotRes = await spotifyApi('/me/player/queue');
    if (!spotRes.ok) return res.status(spotRes.status).json({ error: 'Failed to fetch queue' });
    const data = await spotRes.json();

    const mapTrack = (t) => t ? {
      name: t.name,
      artist: t.artists?.map(a => a.name).join(', ') || '',
      albumArt: t.album?.images?.find(i => i.width <= 100)?.url || t.album?.images?.[0]?.url || '',
    } : null;

    res.json({
      currentlyPlaying: mapTrack(data.currently_playing),
      queue: (data.queue || []).map(mapTrack).filter(Boolean),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get currently playing track
app.get('/spotify/now-playing', async (req, res) => {
  try {
    const spotRes = await spotifyApi('/me/player/currently-playing');
    // 204 = nothing playing
    if (spotRes.status === 204 || spotRes.status === 202) {
      return res.json(null);
    }
    if (!spotRes.ok) return res.status(spotRes.status).json({ error: 'Failed to fetch now playing' });
    const data = await spotRes.json();
    if (!data?.item) return res.json(null);
    const t = data.item;
    const fetchedAt = spotifyCache.get('/me/player/currently-playing')?.ts || Date.now();
    res.json({
      name: t.name,
      artist: t.artists?.map(a => a.name).join(', ') || '',
      albumArt: t.album?.images?.[0]?.url || '',
      isPlaying: data.is_playing,
      progress_ms: data.progress_ms || 0,
      duration_ms: t.duration_ms || 0,
      timestamp: fetchedAt,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get recently played tracks
app.get('/spotify/history', async (req, res) => {
  try {
    const spotRes = await spotifyApi('/me/player/recently-played?limit=20');
    if (!spotRes.ok) return res.status(spotRes.status).json({ error: 'Failed to fetch history' });
    const data = await spotRes.json();

    const tracks = (data.items || []).map(item => ({
      name: item.track.name,
      artist: item.track.artists?.map(a => a.name).join(', ') || '',
      albumArt: item.track.album?.images?.find(i => i.width <= 100)?.url || item.track.album?.images?.[0]?.url || '',
      playedAt: item.played_at,
    }));

    res.json({ tracks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// Camera PTZ — ONVIF SOAP with HTTP Digest auth (presets only)
// ============================================================
const crypto = require('crypto');

const CAMERA_HOST = '192.168.0.105';
const CAMERA_USER = 'admin';
const CAMERA_PASS = process.env.CAMERA_PASSWORD || '';
const ONVIF_PTZ_URL = `http://${CAMERA_HOST}/onvif/ptz_service`;
const ONVIF_PROFILE = 'Profile000';

function parseDigestChallenge(header) {
  const params = {};
  const regex = /(\w+)="?([^",]+)"?/g;
  let m;
  while ((m = regex.exec(header)) !== null) {
    params[m[1]] = m[2];
  }
  return params;
}

function buildDigestHeader(method, uri, challenge) {
  const { realm, nonce, qop } = challenge;
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const ha1 = crypto.createHash('md5').update(`${CAMERA_USER}:${realm}:${CAMERA_PASS}`).digest('hex');
  const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
  const response = qop
    ? crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex')
    : crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
  let header = `Digest username="${CAMERA_USER}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  if (qop) header += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
  return header;
}

async function onvifRequest(soapBody, serviceUrl = ONVIF_PTZ_URL) {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl"
            xmlns:tt="http://www.onvif.org/ver10/schema"
            xmlns:tev="http://www.onvif.org/ver10/events/wsdl"
            xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2"
            xmlns:wsa="http://www.w3.org/2005/08/addressing">
  <s:Body>${soapBody}</s:Body>
</s:Envelope>`;

  const url = new URL(serviceUrl);
  const res1 = await fetch(serviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
    body: envelope,
  });

  if (res1.status !== 401) return res1;

  const wwwAuth = res1.headers.get('www-authenticate');
  if (!wwwAuth) throw new Error('No WWW-Authenticate header');

  const challenge = parseDigestChallenge(wwwAuth);
  const authHeader = buildDigestHeader('POST', url.pathname, challenge);

  return fetch(serviceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      Authorization: authHeader,
    },
    body: envelope,
  });
}

// POST /camera/preset/:token — GotoPreset
app.post('/camera/preset/:token', async (req, res) => {
  const token = req.params.token;
  if (!['1', '2'].includes(token)) {
    return res.status(400).json({ error: 'Invalid preset token' });
  }
  try {
    await onvifRequest(`
    <tptz:GotoPreset>
      <tptz:ProfileToken>${ONVIF_PROFILE}</tptz:ProfileToken>
      <tptz:PresetToken>${token}</tptz:PresetToken>
    </tptz:GotoPreset>`);
    res.json({ status: 'ok' });
  } catch (e) {
    console.error('PTZ preset error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hobbit Bridge running on port ${PORT}`);
});
