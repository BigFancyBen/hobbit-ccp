# Deploy Configuration Changes

Deploy configuration changes to the Hobbit mini PC using Ansible.

## When to Use
Use this skill when the user wants to:
- Deploy configuration changes to the mini PC
- Push updated configs after editing files
- Sync web UI changes after building

## Instructions

1. **Confirm the web UI is built** (if web changes were made):
   ```bash
   cd web && npm run build
   ```

2. **Run the deploy playbook via WSL**:
   ```bash
   wsl -e bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && ansible-playbook playbooks/deploy.yml -i inventory.ini -e 'ansible_become_password=\"SUDO_PASSWORD\"'"
   ```

3. **Ask the user for the sudo password** if not provided. The password is for the `hobbit` user on the mini PC.

## Important Notes
- Always use `-i inventory.ini` explicitly (ansible.cfg is ignored on Windows mounts)
- The mini PC IP is defined in `inventory.ini` (default: 192.168.0.67)
- Deploy uses the `copy` module, not `synchronize` (WSL compatibility)
- After deploy, Docker services may need restart: `docker compose up -d`

## Key Files Deployed
- `files/docker-compose.yml` -> `/home/hobbit/hobbit/docker-compose.yml`
- `files/bridge.js` -> `/home/hobbit/hobbit/bridge.js`
- `files/nginx.conf` -> `/home/hobbit/hobbit/nginx.conf`
- `web/dist/` -> `/home/hobbit/hobbit/www/`
