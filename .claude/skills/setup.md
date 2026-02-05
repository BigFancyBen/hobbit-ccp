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
wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && ansible-playbook playbooks/setup.yml -i inventory.ini -e 'ansible_become_password=\"SUDO_PASSWORD\"'"
```

This configures passwordless sudo for all future deployments.

# What Gets Installed

| Role | Components |
|------|------------|
| base | mDNS (avahi), UFW firewall, Docker, Node.js, backups |
| security | SSH hardening (key-only), unattended-upgrades |
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

2. **Deploy web UI**:
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
