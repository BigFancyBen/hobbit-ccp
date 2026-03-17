# Tailscale Remote Access

Tailscale adds a WireGuard mesh VPN to the Hobbit mini PC, enabling secure remote access from your phone or any authorized device — no port forwarding, no public IP.

## Architecture

```
Phone (remote)
    │
    │  WireGuard tunnel (Tailscale)
    ▼
┌─────────────────────────────────────────────────────────┐
│  Hobbit Mini PC                                         │
│                                                         │
│  tailscale0: 100.91.142.95                             │
│  eth0:       192.168.0.67                              │
│                                                         │
│  Subnet routing: 192.168.0.0/24 advertised             │
│  Split DNS: *.house → dnsmasq (192.168.0.67:53)        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Nginx (Docker, ports 80/443)                    │   │
│  │   hobbit.house → self-signed cert               │   │
│  │   <your-tailscale-fqdn> → LE cert            │   │
│  │                                                  │   │
│  │   /           → React SPA                       │   │
│  │   /api/control/ → Bridge (localhost:3001)       │   │
│  │   /sb/        → SilverBullet (IP-restricted)    │   │
│  │   /zigbee/    → Zigbee2MQTT                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Bridge: 0.0.0.0:3001 (UFW blocks non-LAN direct)     │
│  MQTT: 127.0.0.1:1883 (localhost only)                 │
│  dnsmasq: 0.0.0.0:53 (UFW allows LAN + tailscale0)    │
└─────────────────────────────────────────────────────────┘
```

## How It Works

1. **Tailscale tunnel**: Phone connects to mini PC over WireGuard. Traffic is encrypted end-to-end.
2. **Subnet routing**: The mini PC advertises `192.168.0.0/24` to the tailnet, so the phone can reach LAN IPs through the tunnel.
3. **Split DNS**: Tailscale routes `*.house` queries to the mini PC's dnsmasq, so `hobbit.house` resolves correctly even when remote.
4. **Nginx**: Serves the web UI and proxies API requests. Two server blocks — LAN (self-signed cert) and Tailscale FQDN (valid Let's Encrypt cert).

## Security Model

### What Tailscale peers CAN access

| Service | How | Auth |
|---------|-----|------|
| Web UI (port 80/443) | Docker publishes on 0.0.0.0, bypasses UFW | None (LAN-trust model) |
| SilverBullet (`/sb/`) | Nginx IP allowlist includes `100.64.0.0/10` | Basic auth (SB_USER) |
| DNS (port 53) | UFW allows on `tailscale0` interface | None |
| LAN devices | Subnet routing (192.168.0.0/24) | N/A |

### What Tailscale peers CANNOT access

| Service | Why |
|---------|-----|
| Bridge API (3001) | UFW denies — no rule for port 3001 from Tailscale |
| SSH (22) | UFW only allows from `192.168.0.0/24` |
| MQTT (1883) | Docker binds to `127.0.0.1` — not reachable from any external interface |

The bridge API is only reachable through nginx's `/api/control/` proxy (Docker internal network). This means all bridge access goes through nginx's hostname validation and security headers.

### Why no blanket `ufw allow in on tailscale0`

Docker-published ports (80, 443) bypass UFW entirely (Docker uses iptables FORWARD chain; UFW only controls INPUT). So web access works without any UFW rule. Not adding a blanket rule keeps the bridge, SSH, and MQTT locked down.

## HTTPS Certificates

| Hostname | Cert Type | Issued By | Validity |
|----------|-----------|-----------|----------|
| `hobbit`, `hobbit.local`, `hobbit.house` | Self-signed | openssl | 10 years |
| `<your-tailscale-fqdn>` | Valid LE | Let's Encrypt (via Tailscale) | 90 days (auto-renewed monthly) |

The Tailscale cert is provisioned by `tailscale cert` and stored at:
- `/home/hobbit/hobbit/ssl/tailscale.crt`
- `/home/hobbit/hobbit/ssl/tailscale.key`

A monthly cron job renews the cert and restarts the nginx container.

## Initial Setup

1. **Enable HTTPS** in Tailscale admin console (DNS → Enable HTTPS)
2. **Run setup**: `ansible-playbook playbooks/setup.yml -i inventory.ini` (installs Tailscale)
3. **Authenticate**: `ssh hobbit@192.168.0.67` then `sudo tailscale up` → click auth URL
4. **Note the FQDN**: `tailscale status` shows MagicDNS name
5. **Set variable**: Add `tailscale_fqdn` to vault: `ansible-vault edit group_vars/minipcs/vault.yml`
6. **Deploy**: `./deploy.sh` — provisions cert, templates nginx
7. **Approve subnet route**: Tailscale admin → Machines → hobbit → Edit route settings → approve `192.168.0.0/24`
8. **Configure Split DNS**: Tailscale admin → DNS → Split DNS → domain `house`, nameserver `100.91.142.95`
9. **Phone**: Install Tailscale app, sign in with same account

## Adding a New Device

1. Install Tailscale on the device
2. Sign in with the same Tailscale account
3. Approve in admin console if prompted
4. `hobbit.house` resolves automatically via Split DNS

## Nginx Configuration

The nginx config (`files/nginx.conf`) is a Jinja2 template with a shared macro to avoid duplicating location blocks:

```
{% macro shared_locations() %}
    # Security headers, location blocks
{% endmacro %}

# Default server (reject unknown hosts)
# LAN server (hobbit / hobbit.local / hobbit.house)
# Tailscale redirect (HTTP → HTTPS)      ← conditional on tailscale_fqdn
# Tailscale HTTPS (LE cert)              ← conditional on tailscale_fqdn
```

The Tailscale server blocks only render when `tailscale_fqdn` is defined (in vault). This means the config works safely before Tailscale is set up.

## Ansible Role

```
roles/tailscale/
├── tasks/main.yml      # Install, enable, IP forwarding, subnet routing, UFW
└── handlers/main.yml   # (empty, convention)
```

The role:
1. Adds the Tailscale apt repo and installs the package
2. Enables `tailscaled` systemd service
3. Enables `net.ipv4.ip_forward` (required for subnet routing)
4. Advertises `192.168.0.0/24` via `tailscale set --advertise-routes`
5. Adds a UFW rule allowing DNS (port 53/udp) on `tailscale0`
6. Prints auth instructions if not yet authenticated

## Cert Renewal

Certs are renewed by a monthly cron job set up by `playbooks/deploy.yml`:

```
tailscale cert --cert-file .../tailscale.crt --key-file .../tailscale.key <fqdn> && docker restart hobbit-webserver-1
```

To manually renew:

```bash
ssh hobbit@192.168.0.67
sudo tailscale cert --cert-file /home/hobbit/hobbit/ssl/tailscale.crt --key-file /home/hobbit/hobbit/ssl/tailscale.key <your-tailscale-fqdn>
docker restart hobbit-webserver-1
```

## Verification

```bash
# Tailscale connected
ssh hobbit@192.168.0.67 'tailscale status'

# MQTT locked down (should fail from Tailscale peer)
nc -z 100.91.142.95 1883

# Command injection blocked
curl -X POST "https://hobbit.house/api/control/launch-moonlight?app=;id"
# Expected: 400 {"error":"Unknown app"}

# HTTPS cert valid
curl -v https://<your-tailscale-fqdn>/ 2>&1 | grep "SSL certificate verify ok"

# DNS rebinding blocked
curl -H "Host: evil.com" http://100.91.142.95/
# Expected: empty response (444)

# Bridge not directly reachable from Tailscale
curl http://100.91.142.95:3001/health
# Expected: connection refused / timeout
```

## Troubleshooting

### Can't reach hobbit.house remotely

1. Is Tailscale connected on your phone? Check the Tailscale app.
2. Is the subnet route approved? Tailscale admin → Machines → hobbit → routes
3. Is Split DNS configured? Tailscale admin → DNS → Split DNS → `house` domain
4. Test with Tailscale IP directly: `https://100.91.142.95/`

### HTTPS cert warnings on <your-tailscale-fqdn>

Cert may be expired. Renew:
```bash
sudo tailscale cert --cert-file /home/hobbit/hobbit/ssl/tailscale.crt --key-file /home/hobbit/hobbit/ssl/tailscale.key <your-tailscale-fqdn>
docker restart hobbit-webserver-1
```

### Tailscale not connecting

```bash
sudo tailscale up    # Re-authenticate if needed
tailscale status     # Check connection
tailscale ping <peer-name>  # Test connectivity to specific peer
```

### DNS not resolving remotely

Check dnsmasq is listening on tailscale0:
```bash
ss -ulnp | grep ':53'
```

Check UFW allows DNS on tailscale0:
```bash
sudo ufw status | grep tailscale
```
