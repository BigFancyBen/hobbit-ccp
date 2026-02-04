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

3. Run the setup playbook (from WSL on Windows):
   ```bash
   cd /mnt/c/Users/YOUR_USER/path/to/minipc-setup
   ansible-playbook playbooks/setup.yml -i inventory.ini -e 'ansible_become_password="YOUR_SUDO_PASSWORD"'
   ```

4. Pair Moonlight with your gaming PC (one-time). See [docs/MOONLIGHT-PAIRING.md](docs/MOONLIGHT-PAIRING.md):
   ```bash
   ssh hobbit@192.168.0.67
   sudo xinit moonlight -- :0 vt7
   # Pair with gaming PC (enter PIN shown on screen), then Ctrl+Q to exit
   ```

5. Build and deploy the web UI:
   ```bash
   # Build on Windows
   cd web && npm install && npm run build

   # Deploy via Ansible (from WSL)
   ansible-playbook playbooks/deploy.yml -i inventory.ini -e 'ansible_become_password="YOUR_SUDO_PASSWORD"'
   ```

6. Start Docker services:
   ```bash
   ssh hobbit@192.168.0.67
   cd /home/hobbit/hobbit && docker compose up -d
   ```

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
│   ├── dns/                  # dnsmasq DNS server
│   ├── moonlight/            # X11, Moonlight AppImage, openbox
│   ├── zigbee/               # Zigbee2MQTT, Mosquitto
│   └── webserver/            # Bridge service, configs
├── files/                    # Config files to deploy
├── docs/                     # Documentation
│   ├── ANSIBLE-WSL-GUIDE.md  # Running Ansible from Windows
│   ├── DNS-SERVER.md         # Local DNS server setup
│   ├── MOONLIGHT-PAIRING.md  # Pairing with Sunshine
│   └── TROUBLESHOOTING.md    # Common issues and fixes
└── web/                      # React SPA
```

## API Endpoints

The bridge service exposes these endpoints (via `/api/control/`):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Current status (gaming/idle) |
| `/health` | GET | Health check |
| `/apps` | GET | List available games from Sunshine |
| `/launch-moonlight?app=Desktop` | POST | Start streaming an app (1080p 60fps) |
| `/exit-gaming` | POST | Stop Moonlight/X and turn off monitor |
| `/monitor-on` | POST | Turn monitor on (DPMS or vbetool) |
| `/monitor-off` | POST | Turn monitor off (DPMS or vbetool) |
| `/reboot` | POST | Reboot the mini PC |
| `/shutdown` | POST | Shutdown the mini PC |

## Verification

After deployment:

- [ ] `ping hobbit.local` resolves (or use IP)
- [ ] http://hobbit.local loads React SPA
- [ ] Status shows "Idle" initially
- [ ] Gaming buttons launch Moonlight
- [ ] Monitor on/off works
- [ ] Exit Gaming Mode stops streaming

## Documentation

- [Running Ansible from Windows (WSL)](docs/ANSIBLE-WSL-GUIDE.md)
- [DNS Server Setup](docs/DNS-SERVER.md)
- [Moonlight Pairing Guide](docs/MOONLIGHT-PAIRING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
