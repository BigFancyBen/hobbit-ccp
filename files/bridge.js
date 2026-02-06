const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const app = express();

app.use(cors());
app.use(express.json());

// Gaming PC with Sunshine server
const GAMING_PC = process.env.GAMING_PC_HOST || '192.168.0.69';

// Cached app list - refreshed periodically
let cachedApps = ['Desktop'];
let lastAppRefresh = 0;
const APP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function refreshAppList() {
  const env = { ...process.env, HOME: '/home/hobbit', XDG_RUNTIME_DIR: '/run/user/1000' };
  exec(`xvfb-run -a moonlight list "${GAMING_PC}"`, { timeout: 15000, env }, (err, stdout, stderr) => {
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

// Refresh app list on startup and every 5 minutes
refreshAppList();
setInterval(refreshAppList, APP_CACHE_TTL);

// Ensure HDMI is off on startup (default idle state)
exec('sudo /usr/local/bin/hdmi-control.sh off', (err) => {
  if (err) console.error('Failed to turn off HDMI on startup:', err.message);
  else console.log('HDMI turned off (idle state)');
});

// Cleanup when gaming session ends
function cleanupGamingSession() {
  console.log('Gaming session ended, cleaning up...');
  exec('sudo /usr/local/bin/hdmi-control.sh off');
  // Disconnect all Bluetooth devices
  exec('bluetoothctl devices Paired', (btErr, stdout) => {
    if (!btErr && stdout.trim()) {
      for (const line of stdout.trim().split('\n')) {
        const match = line.match(/Device\s+([A-F0-9:]+)/i);
        if (match) {
          exec(`bluetoothctl disconnect ${match[1]}`);
        }
      }
    }
  });
}

// Launch Moonlight streaming a specific app
// POST /launch-moonlight?app=Desktop  (use actual app name from Sunshine)
app.post('/launch-moonlight', (req, res) => {
  const appName = req.query.app || 'Desktop';

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
  res.json({ apps: cachedApps });
});

// Force refresh of app list
app.post('/apps/refresh', (req, res) => {
  refreshAppList();
  res.json({ status: 'refreshing' });
});

// Kill Moonlight and X, then cleanup
app.post('/exit-gaming', (req, res) => {
  exec('sudo pkill -9 Xorg; sudo pkill -9 xinit; sudo pkill -9 moonlight', (err) => {
    setTimeout(cleanupGamingSession, 500);
    res.json({ status: 'stopped' });
  });
});

// Monitor power control - uses DPMS when X running, vbetool otherwise
app.post('/monitor-on', (req, res) => {
  exec('pgrep -x Xorg', (err) => {
    if (!err) {
      // X is running, use DPMS
      exec('DISPLAY=:0 xset dpms force on');
    } else {
      // No X, use vbetool
      exec('sudo vbetool dpms on');
    }
    res.json({ status: 'monitor on' });
  });
});

app.post('/monitor-off', (req, res) => {
  exec('pgrep -x Xorg', (err) => {
    if (!err) {
      // X is running, use DPMS
      exec('DISPLAY=:0 xset dpms force off');
    } else {
      // No X, use vbetool
      exec('sudo vbetool dpms off');
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

// Status check
app.get('/status', (req, res) => {
  // Check for X server (reliable indicator of gaming mode)
  exec('pgrep -x Xorg', (err) => {
    res.json({
      gaming: !err,
      mode: !err ? 'gaming' : 'idle'
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
  // Use full path and pipe through jq for compact JSON (one object per line)
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
    setTimeout(startGpuMonitor, 5000);
  });

  gpuStatsProcess.on('error', (err) => {
    console.error('GPU monitor error:', err.message);
    gpuStatsProcess = null;
  });
}

startGpuMonitor();

app.get('/gpu-stats', (req, res) => {
  res.json(gpuStats);
});

// Network stats - reads /proc/net/dev and calculates rate
const fs = require('fs');
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

// Update network rate every second
setInterval(updateNetRate, 1000);
updateNetRate();

app.get('/net-stats', (req, res) => {
  res.json(netRate);
});

// Bluetooth controller management
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
  exec(`bluetoothctl disconnect ${mac}`, (err) => {
    res.json({ status: 'disconnected' });
  });
});

// DELETE /bluetooth/device/:mac - remove paired device
app.delete('/bluetooth/device/:mac', (req, res) => {
  const mac = decodeURIComponent(req.params.mac);
  exec(`bluetoothctl remove ${mac}`, (err) => {
    res.json({ status: 'removed' });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hobbit Bridge running on port ${PORT}`);
});
