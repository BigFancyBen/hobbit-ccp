# Moonlight Pairing Guide

This guide covers pairing Moonlight (AppImage) with Sunshine on your gaming PC.

## Overview

- **Moonlight**: Game streaming client running on the mini PC (AppImage)
- **Sunshine**: Game streaming server running on your gaming PC
- **Pairing**: One-time process where Moonlight registers with Sunshine

## Prerequisites

1. Sunshine installed and running on your gaming PC (192.168.0.69:21675)
2. Moonlight AppImage installed on mini PC (via ansible setup)
3. Physical access to the mini PC's monitor (to see the Moonlight UI)

## Pairing Process

### 1. SSH into the mini PC

```bash
ssh hobbit@192.168.0.67
```

### 2. Start Moonlight with X server on physical display

The key is using `sudo xinit` with a specific virtual terminal:

```bash
sudo xinit moonlight -- :0 vt7
```

This will:
- Start an X server on display :0
- Use virtual terminal 7 (your physical monitor)
- Launch Moonlight in fullscreen

### 3. Pair with Sunshine

1. Look at the mini PC's physical monitor - you should see Moonlight UI
2. Add your gaming PC's IP if not already listed: `192.168.0.69`
3. Click on the gaming PC to start pairing
4. A 4-digit PIN will appear on the mini PC screen
5. Go to your gaming PC, open Sunshine web UI (https://192.168.0.69:21675 or the Sunshine admin port)
6. Enter the PIN to approve pairing

### 4. Exit Moonlight

Press `Ctrl+Q` in Moonlight, or from another SSH session:

```bash
sudo pkill Xorg
```

## Verifying the Pairing

Test that Moonlight can see apps from your gaming PC. Since Moonlight is a Qt app that requires a display, use `xvfb-run` for headless operation:

```bash
xvfb-run -a moonlight list 192.168.0.69:21675
```

Should output something like:
```
Steam Big Picture
Desktop
```

**Note**: Running `moonlight list` without xvfb will fail with Qt platform errors because the AppImage only includes the `xcb` (X11) plugin.

## Troubleshooting

### "Failed to start session" or X server errors

Kill any existing X sessions:
```bash
sudo pkill Xorg
sudo pkill moonlight
```

Then try again with `sudo xinit`.

### Can't see anything on monitor

Make sure:
- Monitor is connected and powered on
- Using `vt7` (or another free VT)
- Not trying to run over SSH without a physical display

### "Permission denied to open /dev/tty"

Use `sudo` with xinit:
```bash
sudo xinit moonlight -- :0 vt7
```

### Pairing fails

1. Check Sunshine is running on gaming PC
2. Verify network connectivity: `ping 192.168.0.69`
3. Check Sunshine logs on gaming PC
4. Try restarting Sunshine service

### No hardware accelerated video decoder

This warning can be ignored during pairing. Moonlight will still work for streaming once paired. The mini PC's GPU handles decoding during actual gameplay.

## After Pairing

Once paired, the bridge service can launch Moonlight remotely:

```bash
# Test via curl
curl -X POST "http://localhost:3001/launch-moonlight?app=Desktop"
```

Or use the web UI at http://hobbit.local

## Gaming Mode Details

The bridge service launches Moonlight with these settings:
- **Resolution**: 1920x1080 (matches monitor)
- **FPS**: 60
- **Display mode**: Fullscreen via openbox window manager
- **Monitor control**: Auto-off when exiting gaming mode (DPMS/HDMI)

Components used:
- `openbox` - Window manager for proper fullscreen handling
- `xrandr` - Sets display resolution to 1080p
- `hdmi-control.sh` - Controls HDMI output power
- DPMS via `xset` when X is running

Audio pipeline: Moonlight (SDL2) → PulseAudio → ALSA → Realtek ALC269VC (3.5mm jack). The bridge passes `PULSE_SERVER=unix:/run/user/1000/pulse/native` so Moonlight can find PulseAudio when launched headless via `xinit`. The `hobbit` user must be in the `audio` group for ALSA device access (`alsa-utils` provides hardware detection).
