---
name: deploy
description: Deploy configuration changes to the Hobbit mini PC. Use when pushing code changes, updating configs, syncing web UI, or running the deploy playbook. Builds web UI, runs Ansible, and verifies services.
---

# Instructions

Run the unified deploy script from Git Bash on Windows:

```bash
./deploy.sh
```

This automatically:
1. Builds the web UI (`npm run build`)
2. Deploys via Ansible (passwordless sudo configured)
3. Verifies all services are running

## Manual Deployment

If you need to run steps individually:

1. Build web UI:
   ```bash
   cd web && npm run build
   ```

2. Deploy via Ansible (from WSL):
   ```bash
   wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && ansible-playbook playbooks/deploy.yml -i inventory.ini"
   ```

## Verification

After deployment, check:
- Bridge API: http://192.168.0.67/api/control/health
- Web UI: http://hobbit.local

## Key Files Deployed

| Source | Destination |
|--------|-------------|
| `files/docker-compose.yml` | `/home/hobbit/hobbit/docker-compose.yml` |
| `files/bridge.js` | `/home/hobbit/hobbit/bridge/bridge.js` |
| `files/nginx.conf` | `/home/hobbit/hobbit/nginx.conf` |
| `web/dist/` | `/home/hobbit/hobbit/web/` |

## Notes

- Passwordless sudo is configured - no password needed
- Always use `-i inventory.ini` (ansible.cfg ignored on Windows mounts)
- Health checks run automatically after deployment
