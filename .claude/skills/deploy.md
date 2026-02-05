# Deploy Configuration Changes

Deploy configuration changes to the Hobbit mini PC.

## When to Use
Use this skill when the user wants to:
- Deploy configuration changes to the mini PC
- Push updated configs after editing files
- Sync web UI changes after building

## Instructions

**Use the unified deploy script (from Git Bash on Windows):**
```bash
./deploy.sh
```

This script automatically:
1. Builds the web UI (`npm run build`)
2. Deploys via Ansible (passwordless - no password needed)
3. Verifies services are running

## Manual Deployment (if needed)

If you need to run steps individually:

1. **Build web UI:**
   ```bash
   cd web && npm run build
   ```

2. **Run the deploy playbook via WSL:**
   ```bash
   wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && ansible-playbook playbooks/deploy.yml -i inventory.ini"
   ```

## Important Notes
- Passwordless sudo is configured - no password required for deployments
- Always use `-i inventory.ini` explicitly (ansible.cfg is ignored on Windows mounts)
- The mini PC IP is defined in `inventory.ini` (default: 192.168.0.67)
- Health checks run automatically after deployment

## Key Files Deployed
- `files/docker-compose.yml` -> `/home/hobbit/hobbit/docker-compose.yml`
- `files/bridge.js` -> `/home/hobbit/hobbit/bridge/bridge.js`
- `files/nginx.conf` -> `/home/hobbit/hobbit/nginx.conf`
- `web/dist/` -> `/home/hobbit/hobbit/web/`
