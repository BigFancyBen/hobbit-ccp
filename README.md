# Hobbit Mini PC Setup

Transform a Peladn mini PC into a hybrid beast: a 24/7 silent server that can "wake up" into a gaming console at the press of a web button.

## Architecture

```
┌─────────────────────────────────────┐
│  Your Phone                         │
│  http://hobbit.local                │
│  http://hobbit.house (requires DNS) │
│  http://192.168.0.67                │
└─────────────────────────────────────┘
                │
                ▼ HTTP
┌─────────────────────────────────────┐
│  Hobbit Mini PC (192.168.0.67)      │
│  - dnsmasq DNS server               │
│  - Nginx (Docker) serves web UI     │
│  - Bridge.js controls Moonlight     │
│  - Zigbee2MQTT for smart home       │
│  - Mosquitto MQTT broker            │
│  - System stats via bridge API      │
└─────────────────────────────────────┘
                │
                ▼ Network stream
┌─────────────────────────────────────┐
│  Gaming PC (192.168.0.69)           │
│  - Sunshine streams to Moonlight    │
└─────────────────────────────────────┘
```

## Quick Start

### Prerequisites

1. **Windows Users**: Ansible runs via WSL. See [docs/ANSIBLE-WSL-GUIDE.md](docs/ANSIBLE-WSL-GUIDE.md)
   ```powershell
   wsl --install -d Ubuntu
   # Then in WSL:
   sudo apt update && sudo apt install -y ansible
   ```

2. Flash Ubuntu Server 24.04 LTS to your mini PC:
   - Set hostname: `hobbit`
   - Create user: `hobbit`
   - Install OpenSSH Server

3. Copy your SSH key:
   ```bash
   ssh-copy-id hobbit@<ip-address>
   ```

### Deploy

1. Update `inventory.ini` with your mini PC's IP

2. Update `group_vars/all.yml` with your gaming PC's IP

3. Run the setup playbook (first time requires password, from WSL on Windows):
   ```bash
   cd /mnt/c/Users/YOUR_USER/path/to/minipc-setup
   ansible-playbook playbooks/setup.yml -i inventory.ini -e 'ansible_become_password="YOUR_SUDO_PASSWORD"'
   ```
   This configures passwordless sudo for future deployments.

4. Pair Moonlight with your gaming PC (one-time). See [docs/MOONLIGHT-PAIRING.md](docs/MOONLIGHT-PAIRING.md):
   ```bash
   ssh hobbit@192.168.0.67
   sudo xinit moonlight -- :0 vt7
   # Pair with gaming PC (enter PIN shown on screen), then Ctrl+Q to exit
   ```

5. Deploy the web UI and configs (from Git Bash on Windows):
   ```bash
   ./deploy.sh
   ```
   This single command builds the web UI, deploys via Ansible, and verifies services.

## Hostnames & DNS Server

The mini PC runs **dnsmasq** as a local DNS server. Point your router's DNS to `192.168.0.67` and all devices on your network can use these hostnames:

| Hostname | How it works |
|----------|--------------|
| `hobbit.house` | dnsmasq local DNS (point router DNS to hobbit) |
| `hobbit.local` | mDNS via avahi-daemon (works automatically) |
| `hobbit` | dnsmasq local DNS |
| `192.168.0.67` | Direct IP (always works) |

See [docs/DNS-SERVER.md](docs/DNS-SERVER.md) for configuration details.

## Local Development

```bash
cd web
npm install
npm run dev
# Opens http://localhost:5173
```

See [docs/WEB-UI.md](docs/WEB-UI.md) for web UI architecture, 8bitcn components, and theming.

## Project Structure

```
minipc-setup/
├── ansible.cfg               # Ansible configuration
├── inventory.ini             # List of all mini PCs
├── group_vars/
│   └── all.yml               # Shared variables (gaming PC IP, etc.)
├── playbooks/
│   ├── setup.yml             # Full system setup
│   └── deploy.yml            # Deploy config updates
├── roles/
│   ├── base/                 # mDNS, firewall, Docker, Node.js
│   ├── security/             # SSH hardening, unattended-upgrades
│   ├── dns/                  # dnsmasq DNS server
│   ├── moonlight/            # X11, Moonlight AppImage, openbox
│   ├── zigbee/               # Zigbee2MQTT, Mosquitto
│   └── webserver/            # Bridge service, configs
├── files/                    # Config files to deploy
├── docs/                     # Documentation
│   ├── ANSIBLE-WSL-GUIDE.md  # Running Ansible from Windows
│   ├── DNS-SERVER.md         # Local DNS server setup
│   ├── MOONLIGHT-PAIRING.md  # Pairing with Sunshine
│   ├── SECURITY.md           # Security hardening guide
│   ├── TROUBLESHOOTING.md    # Common issues and fixes
│   ├── WEB-UI.md             # Web UI development guide
│   ├── bluetooth.md          # Bluetooth controller support
│   └── bridge.md             # Host bridge service docs
└── web/                      # React TypeScript SPA (8bitcn)
```

## API Endpoints

The bridge service exposes these endpoints (via `/api/control/`):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Mode (gaming/idle) + sunshineOnline |
| `/health` | GET | Health check |
| `/apps` | GET | List available games from Sunshine |
| `/launch-moonlight?app=Desktop` | POST | Start streaming an app (1080p 60fps) |
| `/exit-gaming` | POST | Stop Moonlight/X and turn off monitor |
| `/reboot` | POST | Reboot the mini PC |

## Verification

After deployment:

- [ ] `ping hobbit.local` resolves (or use IP)
- [ ] http://hobbit.local loads React SPA
- [ ] Status shows "Online" or "Offline" based on gaming PC reachability
- [ ] Gaming buttons launch Moonlight (monitor turns on automatically)
- [ ] Exit Gaming Mode stops streaming (monitor turns off automatically)

## Security

The server is hardened for LAN-only access:

- **Firewall**: UFW restricts all ports to `192.168.0.0/24` only
- **SSH**: Key-only authentication (no passwords over network)
- **Auto-updates**: Security patches applied automatically via `unattended-upgrades`
- **Nginx**: Security headers + hostname validation

See [docs/SECURITY.md](docs/SECURITY.md) for full details.

## Backups

Automatic weekly backups run every Sunday at 2am via systemd timer.

**Backup location:** `/home/hobbit/backups/`

**What's backed up:**
- `/home/hobbit/hobbit/` (all configs and data)
- `/etc/dnsmasq.d/` (DNS configuration)
- `/etc/ssh/sshd_config.d/` (SSH hardening)

**Manual backup:**
```bash
ssh hobbit@192.168.0.67 'sudo /usr/local/bin/backup.sh'
```

**Check timer status:**
```bash
ssh hobbit@192.168.0.67 'systemctl status hobbit-backup.timer'
```

## Documentation

- [Running Ansible from Windows (WSL)](docs/ANSIBLE-WSL-GUIDE.md)
- [DNS Server Setup](docs/DNS-SERVER.md)
- [Moonlight Pairing Guide](docs/MOONLIGHT-PAIRING.md)
- [Security Hardening](docs/SECURITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Web UI Development](docs/WEB-UI.md)
- [Bluetooth Controllers](docs/bluetooth.md)
- [Bridge Service](docs/bridge.md)
