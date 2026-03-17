# Running Ansible from Windows via WSL

Ansible doesn't run natively on Windows. This guide covers the working setup for running Ansible playbooks from WSL.

## Prerequisites

### 1. Install WSL Ubuntu

```powershell
wsl --install -d Ubuntu
```

After installation, set up your WSL user and password.

### 2. Install Ansible in WSL

```bash
# In WSL terminal
sudo apt update
sudo apt install -y ansible sshpass
```

### 3. Copy SSH Keys from Windows to WSL

Your Windows SSH keys are accessible via `/mnt/c/`:

```bash
# Copy keys to WSL home
cp /mnt/c/Users/YOUR_USERNAME/.ssh/id_ed25519 ~/.ssh/
cp /mnt/c/Users/YOUR_USERNAME/.ssh/id_ed25519.pub ~/.ssh/

# Fix permissions (required)
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```

## Running Playbooks

### Key Issue: World-Writable Directory Warning

Ansible ignores `ansible.cfg` when run from `/mnt/c/` because Windows mounts are world-writable. Always specify the inventory explicitly:

```bash
# From PowerShell/CMD - run via WSL
wsl -e bash -c "cd /mnt/c/Users/YOUR_USERNAME/Documents/projects/minipc-setup && ansible-playbook playbooks/deploy.yml -i inventory.ini -e 'ansible_become_password=\"YOUR_SUDO_PASSWORD\"'"
```

### Or from WSL terminal directly:

```bash
cd /mnt/c/Users/YOUR_USERNAME/Documents/projects/minipc-setup
ansible-playbook playbooks/deploy.yml -i inventory.ini -e 'ansible_become_password="YOUR_SUDO_PASSWORD"'
```

## Common Commands

### Deploy configuration changes

```bash
wsl -e bash -c "cd /mnt/c/Users/YOUR_USERNAME/Documents/projects/minipc-setup && ansible-playbook playbooks/deploy.yml -i inventory.ini -e 'ansible_become_password=\"YOUR_SUDO_PASSWORD\"'"
```

### Run full setup (first time or major changes)

```bash
wsl -e bash -c "cd /mnt/c/Users/YOUR_USERNAME/Documents/projects/minipc-setup && ansible-playbook playbooks/setup.yml -i inventory.ini -e 'ansible_become_password=\"YOUR_SUDO_PASSWORD\"'"
```

### Run ad-hoc commands

```bash
# Check uptime on all hosts
wsl -e bash -c "cd /mnt/c/Users/YOUR_USERNAME/Documents/projects/minipc-setup && ansible all -i inventory.ini -m command -a 'uptime'"

# Run with sudo
wsl -e bash -c "cd /mnt/c/Users/YOUR_USERNAME/Documents/projects/minipc-setup && ansible hobbit -i inventory.ini -m command -a 'ufw status' -e 'ansible_become_password=\"YOUR_SUDO_PASSWORD\"' -b"
```

### SSH directly to host

```bash
wsl -e ssh hobbit@192.168.0.67
# or
wsl -e ssh hobbit@hobbit.local
```

## Troubleshooting

### "No inventory was parsed"
Always use `-i inventory.ini` explicitly when running from Windows paths.

### SSH key permission errors
Run `chmod 600 ~/.ssh/id_ed25519` in WSL.

### "roles not found" error
The `roles_path` in ansible.cfg is ignored. Ensure playbooks use relative paths like `../roles/` or copy the project to WSL home directory.

### sudo password issues with rsync/synchronize
Use `copy` module instead of `synchronize` when deploying from Windows.
