---
name: setup
description: Run full system setup on a fresh Hobbit mini PC. Use for initial installation, applying major infrastructure changes, or re-provisioning. Installs Docker, Node.js, Moonlight, Zigbee2MQTT, firewall rules, and all base services.
---

# Prerequisites

Before running setup:

1. Ubuntu Server 24.04 LTS installed on mini PC
2. SSH key copied: `ssh-copy-id hobbit@<ip-address>`
3. `inventory.ini` has correct IP (default: 192.168.0.67)
4. `group_vars/all.yml` has gaming PC IP (default: 192.168.0.69)

# Instructions

Run the setup playbook via WSL (first time requires password):

```bash
wsl bash -c "cd /mnt/c/Users/YOUR_USERNAME/Documents/projects/minipc-setup && ansible-playbook playbooks/setup.yml -i inventory.ini -e 'ansible_become_password=\"SUDO_PASSWORD\"'"
```

This configures passwordless sudo for all future deployments.

# What Gets Installed

| Role | Components |
|------|------------|
| base | mDNS (avahi), UFW firewall, Docker, Node.js, backups |
| security | SSH hardening (key-only), unattended-upgrades |
| tailscale | WireGuard mesh VPN, subnet routing, Split DNS UFW rule |
| dns | dnsmasq local DNS server |
| moonlight | X11, Moonlight AppImage, openbox |
| zigbee | Zigbee2MQTT, Mosquitto MQTT broker |
| webserver | Bridge service, nginx configs |

# After Setup

1. **Pair Moonlight** (one-time):
   ```bash
   ssh hobbit@192.168.0.67
   sudo xinit moonlight -- :0 vt7
   ```
   Enter PIN shown on Sunshine web UI, then `Ctrl+Q` to exit.

2. **Authenticate Tailscale** (one-time):
   ```bash
   ssh hobbit@192.168.0.67
   sudo tailscale up
   ```
   Click auth URL, approve device, note MagicDNS name. Add `tailscale_fqdn` to vault: `ansible-vault edit group_vars/minipcs/vault.yml`.
   Approve subnet route and configure Split DNS in Tailscale admin console.

3. **Deploy web UI**:
   ```bash
   ./deploy.sh
   ```

# Verification

```bash
# Test SSH (should not prompt for password)
ssh hobbit@192.168.0.67

# Check services
ssh hobbit@192.168.0.67 'systemctl status hobbit-bridge'

# Test web UI
curl -H "Host: hobbit.local" http://192.168.0.67/
```
