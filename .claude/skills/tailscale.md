---
name: tailscale
description: Manage Tailscale VPN on the Hobbit mini PC. Use for remote access setup, subnet routing, Split DNS, cert renewal, troubleshooting connectivity, or checking Tailscale status.
---

# Overview

Tailscale provides WireGuard-based remote access to the mini PC. No port forwarding or public IP needed — only devices you authorize can join the tailnet.

# Current Setup

| Setting | Value |
|---------|-------|
| Tailscale FQDN | `<your-tailscale-fqdn>` |
| Tailscale IP | `100.91.142.95` |
| Subnet routing | `192.168.0.0/24` (LAN advertised) |
| Split DNS | `house` domain → hobbit's dnsmasq |
| HTTPS cert | Let's Encrypt via `tailscale cert` |
| Admin console | https://login.tailscale.com/admin |

# Access URLs

| Service | LAN | Tailscale (remote) |
|---------|-----|-------------------|
| Web UI | `https://hobbit.house` | `https://hobbit.house` (via subnet routing) |
| SilverBullet | `https://hobbit.house/sb/` | `https://hobbit.house/sb/` or `https://<your-tailscale-fqdn>/sb/` |
| Bridge API | `https://hobbit.house/api/control/` | Same (via nginx proxy only) |

# Check Status

```bash
# Tailscale connection status
ssh hobbit@192.168.0.67 'tailscale status'

# Verify subnet routes are advertised
ssh hobbit@192.168.0.67 'tailscale status --json | grep -A5 AllowedIPs'

# Test cert validity
curl -v https://<your-tailscale-fqdn>/api/control/health 2>&1 | grep "SSL certificate"
```

# Cert Renewal

Certs auto-renew monthly via cron. To manually renew:

```bash
ssh hobbit@192.168.0.67 'sudo tailscale cert --cert-file /home/hobbit/hobbit/ssl/tailscale.crt --key-file /home/hobbit/hobbit/ssl/tailscale.key <your-tailscale-fqdn> && docker restart hobbit-webserver-1'
```

# Adding a New Device

1. Install Tailscale on the device
2. Sign in with the same Tailscale account
3. Approve in admin console if needed
4. `hobbit.house` resolves automatically (Split DNS)

# Security Model

- **No blanket UFW rule** on `tailscale0` — only DNS (port 53/udp) allowed
- **Bridge API (3001)** not directly reachable from Tailscale — only via nginx proxy
- **MQTT (1883)** bound to `127.0.0.1` — unreachable from any external interface
- **SSH (22)** only allowed from LAN subnet, not Tailscale
- **SilverBullet** IP-restricted to LAN IPs + `100.64.0.0/10` (Tailscale CGNAT)

# Key Files

| File | Purpose |
|------|---------|
| `roles/tailscale/tasks/main.yml` | Install Tailscale, IP forwarding, subnet routing, UFW |
| `files/nginx.conf` | Tailscale HTTPS server block (Jinja2 template) |
| `group_vars/minipcs/vault.yml` | `tailscale_fqdn` variable (encrypted) |
| `playbooks/deploy.yml` | Cert provisioning + cron renewal |

# Troubleshooting

**Can't reach hobbit.house from phone (remote)**
1. Check Tailscale is connected on phone
2. Verify subnet route is approved in admin console
3. Verify Split DNS for `house` domain in admin console → DNS

**Cert expired / HTTPS errors**
```bash
ssh hobbit@192.168.0.67 'sudo tailscale cert --cert-file /home/hobbit/hobbit/ssl/tailscale.crt --key-file /home/hobbit/hobbit/ssl/tailscale.key <your-tailscale-fqdn>'
```

**Tailscale not connected**
```bash
ssh hobbit@192.168.0.67 'sudo tailscale up'
```
