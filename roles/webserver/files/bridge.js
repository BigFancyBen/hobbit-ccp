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

  // Check if already running
  exec('pgrep Xorg', (err) => {
    if (!err) {
      return res.status(400).json({ error: 'Already running. Exit first.' });
    }

    // xinit runs Moonlight directly - no window manager, no desktop
    // Moonlight runs fullscreen, monitor shows ONLY the stream
    // Using Flatpak version of Moonlight
    const cmd = `xinit flatpak run com.moonlight_stream.Moonlight stream "${GAMING_PC}" "${appName}" --fullscreen -- :0 vt1`;

    const child = spawn('sh', ['-c', cmd], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    res.json({ status: 'launching', app: appName });
  });
});

// List available apps from Sunshine on gaming PC
// These names can be passed directly to /launch-moonlight?app=
app.get('/apps', (req, res) => {
  exec(`flatpak run com.moonlight_stream.Moonlight list "${GAMING_PC}"`, { timeout: 10000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('Failed to list apps:', err.message, stderr);
      return res.json({ apps: ['Desktop'], error: 'Could not connect to gaming PC' });
    }
    const apps = stdout.trim().split('\n').filter(a => a.trim());
    res.json({ apps: apps.length > 0 ? apps : ['Desktop'] });
  });
});

// Kill Moonlight and X server, then turn off monitor
app.post('/exit-gaming', (req, res) => {
  exec('sudo pkill -9 Xorg; sudo pkill -9 xinit; sudo pkill -9 moonlight', (err) => {
    // Turn off monitor after X is killed
    // Clear console, hide cursor, blank framebuffer, then DPMS off
    setTimeout(() => {
      exec('sudo sh -c "chvt 1; setterm --cursor off --clear all </dev/tty1 >/dev/tty1; echo 1 > /sys/class/graphics/fb0/blank; vbetool dpms off"');
    }, 500);
    res.json({ status: 'stopped' });
  });
});

// Monitor power control via DPMS (when X is running)
app.post('/monitor-on', (req, res) => {
  exec('DISPLAY=:0 xset dpms force on', (err) => {
    res.json({ status: 'monitor on' });
  });
});

app.post('/monitor-off', (req, res) => {
  exec('DISPLAY=:0 xset dpms force off', (err) => {
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
  exec('pgrep -f moonlight', (moonlightErr) => {
    exec('pgrep Xorg', (xErr) => {
      res.json({
        moonlightRunning: !moonlightErr,
        xRunning: !xErr,
        mode: !moonlightErr ? 'gaming' : 'idle'
      });
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
