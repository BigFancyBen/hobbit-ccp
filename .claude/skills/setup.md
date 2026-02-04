# Full System Setup

Run the full Ansible setup playbook to configure a fresh mini PC or apply major changes.

## When to Use
Use this skill when the user wants to:
- Set up a new mini PC from scratch
- Apply major infrastructure changes (new roles, packages)
- Re-run the full setup after significant changes

## Prerequisites
Before running setup, ensure:
1. Ubuntu Server 24.04 LTS is installed on the mini PC
2. SSH key is copied: `ssh-copy-id hobbit@<ip-address>`
3. `inventory.ini` has the correct IP address
4. `group_vars/all.yml` has the gaming PC IP (default: 192.168.0.69)

## Instructions

1. **Run the setup playbook via WSL**:
   ```bash
   wsl -e bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && ansible-playbook playbooks/setup.yml -i inventory.ini -e 'ansible_become_password=\"SUDO_PASSWORD\"'"
   ```

2. **Ask the user for the sudo password** if not provided.

## What Setup Installs
The setup playbook runs these roles:
- **base**: mDNS (avahi), firewall (ufw), Docker, Node.js
- **dns**: dnsmasq local DNS server
- **moonlight**: X11, Moonlight AppImage, openbox window manager
- **zigbee**: Zigbee2MQTT, Mosquitto MQTT broker
- **webserver**: Bridge service, nginx configs

## After Setup
1. **Pair Moonlight** with the gaming PC (one-time):
   ```bash
   ssh hobbit@192.168.0.67
   sudo xinit moonlight -- :0 vt7
   ```
   See docs/MOONLIGHT-PAIRING.md for details.

2. **Start Docker services**:
   ```bash
   ssh hobbit@192.168.0.67
   cd /home/hobbit/hobbit && docker compose up -d
   ```

3. **Build and deploy web UI**:
   ```bash
   cd web && npm install && npm run build
   # Then run /deploy
   ```
