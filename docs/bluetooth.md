# Bluetooth Controller Support

Bluetooth game controllers can be paired to the Hobbit mini PC and used with Moonlight game streaming.

## How It Works

```
┌─────────────────┐     Bluetooth     ┌─────────────────┐
│  Game Controller │ ───────────────► │  Hobbit Mini PC │
│  (Xbox, PS, etc) │                  │  (bluetoothctl) │
└─────────────────┘                   └────────┬────────┘
                                               │
                                               │ /dev/input/event*
                                               │ (evdev)
                                               ▼
                                      ┌─────────────────┐
                                      │    Moonlight    │
                                      │  (reads input)  │
                                      └────────┬────────┘
                                               │
                                               │ Network (GameStream)
                                               ▼
                                      ┌─────────────────┐
                                      │    Sunshine     │
                                      │  (Gaming PC)    │
                                      │                 │
                                      │ Virtual Xbox 360│
                                      └─────────────────┘
```

1. Controller connects via Bluetooth to the Hobbit
2. Linux kernel exposes it as an input device (`/dev/input/event*`)
3. Moonlight reads controller input via evdev
4. Moonlight sends input over the network to Sunshine
5. Sunshine emulates an Xbox 360 controller for games

## Requirements

### User Groups

The `hobbit` user must be in:
- **bluetooth** - Access to `bluetoothctl`
- **input** - Access to `/dev/input/event*` devices

This is configured in `playbooks/deploy.yml`:
```yaml
- name: Add hobbit to bluetooth and input groups
  user:
    name: hobbit
    groups: bluetooth,input
    append: yes
```

### Packages

- **bluez** - Linux Bluetooth stack

### Sudoers

```
hobbit ALL=(ALL) NOPASSWD: /usr/bin/bluetoothctl
```

## Web UI

The Bluetooth controller management UI is in **Settings > System** tab.

### Features

- View paired controllers with connection status
- Scan for new controllers (30 second timeout)
- Pair discovered controllers
- Connect/disconnect controllers
- Remove (unpair) controllers

### Components

| File | Description |
|------|-------------|
| `web/src/components/BluetoothSection.tsx` | Main UI component |
| `web/src/hooks/useBluetooth.ts` | Data fetching hook |
| `web/src/components/SystemTab.tsx` | Parent component |

## Bridge API

### GET /bluetooth/status

Returns paired devices with connection status.

```json
{
  "devices": [
    {
      "mac": "AA:BB:CC:DD:EE:FF",
      "name": "Xbox Wireless Controller",
      "connected": true,
      "trusted": true
    }
  ],
  "scanning": false
}
```

### POST /bluetooth/scan

Start or stop device discovery.

**Request:**
```json
{ "enabled": true }
```

**Response:**
```json
{ "status": "scanning" }
```

Scanning auto-stops after 30 seconds.

### GET /bluetooth/discovered

Get devices found during active scan.

```json
{
  "scanning": true,
  "devices": [
    {
      "mac": "AA:BB:CC:DD:EE:FF",
      "name": "Xbox Wireless Controller"
    }
  ]
}
```

### POST /bluetooth/pair

Pair with a discovered device.

**Request:**
```json
{ "mac": "AA:BB:CC:DD:EE:FF" }
```

Automatically trusts the device after pairing.

### POST /bluetooth/connect

Connect to a paired device.

**Request:**
```json
{ "mac": "AA:BB:CC:DD:EE:FF" }
```

### POST /bluetooth/disconnect

Disconnect a device.

**Request:**
```json
{ "mac": "AA:BB:CC:DD:EE:FF" }
```

### DELETE /bluetooth/device/:mac

Remove (unpair) a device.

```
DELETE /bluetooth/device/AA:BB:CC:DD:EE:FF
```

## Controller Pairing Guide

### Xbox One / Series Controller

1. Turn on controller (Xbox button)
2. Hold **Sync button** (top of controller) until Xbox button flashes rapidly
3. In web UI: Click **Scan**
4. Select controller from list, click **Pair**

### PlayStation 4/5 Controller

1. Turn off controller
2. Hold **Share + PS button** until light bar flashes rapidly
3. In web UI: Click **Scan**
4. Select controller from list, click **Pair**

### 8BitDo Controllers

1. Turn off controller
2. Hold **Start + Pair** button until LED flashes
3. In web UI: Click **Scan**
4. Select controller from list, click **Pair**

### Nintendo Switch Pro Controller

1. Turn off controller
2. Hold **Sync button** (top of controller) until lights flash
3. In web UI: Click **Scan**
4. Select controller from list, click **Pair**

## Manual CLI Operations

### Check Bluetooth Status

```bash
bluetoothctl show
```

### List Paired Devices

```bash
bluetoothctl devices Paired
```

### Interactive Pairing

```bash
bluetoothctl
[bluetooth]# power on
[bluetooth]# agent on
[bluetooth]# default-agent
[bluetooth]# scan on
# Wait for device to appear
[bluetooth]# pair AA:BB:CC:DD:EE:FF
[bluetooth]# trust AA:BB:CC:DD:EE:FF
[bluetooth]# connect AA:BB:CC:DD:EE:FF
[bluetooth]# quit
```

### Check Device Info

```bash
bluetoothctl info AA:BB:CC:DD:EE:FF
```

### Verify Input Device

```bash
# List input devices
ls -la /dev/input/by-id/

# Test controller input (press buttons)
cat /dev/input/by-id/*controller*-event-joystick
```

## Troubleshooting

### Controller Not Found During Scan

1. **Check adapter is powered:**
   ```bash
   bluetoothctl show | grep Powered
   ```

2. **Restart Bluetooth service:**
   ```bash
   sudo systemctl restart bluetooth
   ```

3. **Check controller is in pairing mode** - LED should be flashing rapidly

4. **Move controller closer** - Bluetooth range can be limited

### Controller Paired But No Input in Games

1. **Check group membership:**
   ```bash
   groups hobbit
   # Should include: input bluetooth
   ```

2. **Reboot after group changes:**
   ```bash
   sudo reboot
   ```

3. **Verify input device exists:**
   ```bash
   ls /dev/input/by-id/ | grep -i controller
   ```

4. **Check Moonlight sees the controller:**
   - Controller must be connected before launching Moonlight
   - Disconnect any controllers from the gaming PC

### Controller Disconnects Frequently

1. **Trust the device:**
   ```bash
   bluetoothctl trust AA:BB:CC:DD:EE:FF
   ```

2. **Check for interference:**
   - 2.4GHz WiFi can interfere
   - Move router/controller
   - Use 5GHz WiFi if possible

3. **Check battery level** - Low battery causes disconnections

### Xbox Controller Specific

For better Xbox controller support, consider installing **xpadneo**:
```bash
sudo apt install dkms
git clone https://github.com/atar-axis/xpadneo.git
cd xpadneo
sudo ./install.sh
```

### Check Bridge Logs

```bash
journalctl -u hobbit-bridge -f
```

### Test API Directly

```bash
# Check status
curl http://hobbit.local/api/control/bluetooth/status

# Start scan
curl -X POST http://hobbit.local/api/control/bluetooth/scan \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Check discovered
curl http://hobbit.local/api/control/bluetooth/discovered
```

## Implementation Details

### Bridge Scanning Process

The scan uses an interactive `bluetoothctl` session:

```javascript
scanProcess = spawn('bluetoothctl', ['--agent=NoInputNoOutput'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Set up agent before scanning
scanProcess.stdin.write('power on\n');
scanProcess.stdin.write('agent on\n');
scanProcess.stdin.write('default-agent\n');
scanProcess.stdin.write('scan on\n');
```

Output is parsed for `[NEW] Device` lines to populate discovered devices.

### React Hook Polling

- Status polling: Every 3 seconds
- Discovered polling: Every 1 second (only while scanning)

```typescript
useEffect(() => {
  if (!scanning) return;
  const interval = setInterval(fetchDiscovered, 1000);
  return () => clearInterval(interval);
}, [scanning, fetchDiscovered]);
```

## Files Reference

| File | Purpose |
|------|---------|
| `files/bridge.js` | API endpoints (lines 296-450) |
| `web/src/hooks/useBluetooth.ts` | React data hook |
| `web/src/components/BluetoothSection.tsx` | UI component |
| `web/src/components/SystemTab.tsx` | Parent tab component |
| `playbooks/deploy.yml` | Ansible deployment config |
| `docs/bluetooth.md` | This documentation |
| `.claude/skills/bluetooth.md` | Claude skill reference |
