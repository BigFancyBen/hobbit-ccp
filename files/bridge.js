const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const app = express();

app.use(cors());
app.use(express.json());

// Gaming PC with Sunshine server
const GAMING_PC = process.env.GAMING_PC_HOST || '192.168.0.69';

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

      res.json({ status: 'launching', app: appName });
    });
  });
});

// List available apps from Sunshine on gaming PC
// These names can be passed directly to /launch-moonlight?app=
app.get('/apps', (req, res) => {
  exec(`moonlight list "${GAMING_PC}"`, { timeout: 10000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('Failed to list apps:', err.message, stderr);
      // Return default apps if can't connect
      return res.json({ apps: ['Desktop'], error: 'Could not connect to gaming PC' });
    }
    const apps = stdout.trim().split('\n').filter(a => a.trim());
    res.json({ apps: apps.length > 0 ? apps : ['Desktop'] });
  });
});

// Kill Moonlight and X, then turn off HDMI output at kernel level
app.post('/exit-gaming', (req, res) => {
  exec('sudo pkill -9 Xorg; sudo pkill -9 xinit; sudo pkill -9 moonlight', (err) => {
    // Force HDMI output off via DRM debugfs
    setTimeout(() => {
      exec('sudo /usr/local/bin/hdmi-control.sh off');
    }, 500);
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hobbit Bridge running on port ${PORT}`);
});
