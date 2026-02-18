# Security Hardening Guide

This document describes the security measures implemented on the Hobbit Mini PC to make it safe for 24/7 operation on a home LAN.

## Security Model: LAN + Tailscale Access

The server follows a layered access model:
- **LAN (192.168.0.0/24)**: Full access to all services via UFW rules
- **Tailscale**: Web UI and SilverBullet via nginx (Docker bypasses UFW); DNS via targeted UFW rule. Bridge API, SSH, and MQTT are NOT accessible from Tailscale.
- **Internet**: Blocked inbound (UFW deny incoming). Outbound allowed for updates.
- See `docs/tailscale.md` for the full Tailscale security model.

## Implemented Security Measures

### 1. UFW Firewall (LAN-Only)

All services are restricted to the local subnet `192.168.0.0/24`.

**Allowed Ports:**

| Port | Service | Notes |
|------|---------|-------|
| 22 | SSH | Key-only authentication |
| 53 | DNS | dnsmasq |
| 80 | HTTP | Nginx web UI |
| 443 | HTTPS | Nginx (self-signed cert) |
| 853 | DNS-over-TLS | Required for Android |
| 5353 | mDNS | avahi-daemon |

Additionally:
- **Port 53/udp** is allowed on the `tailscale0` interface (for Split DNS)
- **Port 1883** (MQTT) is bound to `127.0.0.1` in Docker — not reachable externally regardless of UFW
- **Port 3001** (Bridge API) has no UFW rule — only reachable via nginx proxy (Docker network)
- **Ports 80/443** (Docker-published) bypass UFW entirely via iptables FORWARD chain

**Configuration:** [roles/base/tasks/main.yml](../roles/base/tasks/main.yml), [roles/tailscale/tasks/main.yml](../roles/tailscale/tasks/main.yml)

```yaml
- name: Configure firewall - LAN only
  ufw:
    rule: allow
    port: "{{ item }}"
    from_ip: "{{ lan_subnet }}"
  loop:
    - "22"    # SSH
    - "53"    # DNS
    - "80"    # HTTP
    - "443"   # HTTPS
    - "853"   # DNS-over-TLS (Android)
    - "5353"  # mDNS
```

### 2. SSH Key-Only Authentication

Password authentication is disabled for SSH. Only public key authentication works.

**Configuration:** [roles/security/files/sshd_hardening.conf](../roles/security/files/sshd_hardening.conf)

```
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
```

**Physical console login still works with password** - this only affects network SSH.

**Setup SSH Keys:**
```bash
# Generate key (if you don't have one)
ssh-keygen -t ed25519

# Copy to server
ssh-copy-id hobbit@192.168.0.67

# Test (should NOT prompt for password)
ssh hobbit@192.168.0.67
```

### 3. Unattended Security Upgrades

Security patches are automatically installed daily.

**Configuration:**
- [roles/security/files/50unattended-upgrades](../roles/security/files/50unattended-upgrades)
- [roles/security/files/20auto-upgrades](../roles/security/files/20auto-upgrades)

Only security updates are installed automatically. Major version changes require manual intervention.

**Check status:**
```bash
systemctl status unattended-upgrades
```

### 4. Nginx Security Headers

The web server includes security headers to prevent common attacks.

**Configuration:** [files/nginx.conf](../files/nginx.conf)

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
server_tokens off;
```

### 5. Nginx Hostname Validation

Requests must use a valid hostname (`hobbit`, `hobbit.local`, `hobbit.house`, or the Tailscale FQDN). Requests with other Host headers are rejected on both HTTP and HTTPS.

```nginx
# Reject requests with unknown Host headers
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    ssl_certificate /etc/nginx/ssl/hobbit.crt;
    ssl_certificate_key /etc/nginx/ssl/hobbit.key;
    return 444;  # Close connection without response
}
```

This prevents DNS rebinding attacks through the browser.

### 6. Input Validation (Bridge API)

All bridge endpoints that pass user input to shell commands validate inputs:
- **`/launch-moonlight?app=`**: App name validated against `cachedApps` allowlist (prevents command injection)

### 7. MQTT Bound to Localhost

MQTT (`mosquitto`) is published on `127.0.0.1:1883` in Docker — it never listens on external interfaces. Docker-published ports bypass UFW, so binding to localhost is the only reliable way to prevent external access. The bridge connects via localhost; Zigbee2MQTT connects via Docker's internal network.

### 6. Zigbee Network Security

- **permit_join: false** by default - devices can't join without explicit permission
- **network_key: GENERATE** - unique 128-bit encryption key auto-generated on first run

**To pair new Zigbee devices:**
1. Open http://hobbit.local/zigbee/
2. Click "Permit Join" toggle at the top
3. Put your device in pairing mode
4. Click "Permit Join" again to disable

## What We're NOT Doing (and Why)

| Feature | Decision | Reason |
|---------|----------|--------|
| HTTPS (public CA) | Partial | Tailscale FQDN has a valid Let's Encrypt cert via `tailscale cert`. LAN hostnames use self-signed. LAN HTTP is redirected to HTTPS (required for SilverBullet's `crypto.subtle`). |
| MQTT authentication | Skip | MQTT bound to `127.0.0.1` — unreachable externally. Adds complexity for no benefit. |
| Zigbee2MQTT frontend auth | Skip | Not natively supported. UFW is sufficient. |
| fail2ban | Skip | With key-only SSH + LAN firewall, brute force is impossible. |
| DNS rebinding protection (stop-dns-rebind) | Skip | Breaks Android connectivity checks. See below. |

## Gotchas & Lessons Learned

### Android Requires Port 853 (DNS-over-TLS)

Android uses encrypted DNS by default. If you only allow port 53, Android will show "Connected, no internet" even though regular DNS works.

**Solution:** Allow port 853/tcp in firewall rules.

### stop-dns-rebind Breaks Android

The dnsmasq `stop-dns-rebind` option blocks DNS responses containing private IPs from upstream servers. This breaks Android's connectivity checks (Google servers).

**Solution:** Don't use `stop-dns-rebind`. The firewall is your primary protection.

### Docker NATs Client IPs in Nginx

Because nginx runs inside Docker with default bridge networking, all external clients appear as `172.18.0.1` (the Docker bridge gateway). This means `allow`/`deny` directives in nginx **cannot distinguish between LAN clients** — they all share the same source IP. The SilverBullet `/sb/` location includes `allow 172.16.0.0/12` to permit Docker-routed traffic, and relies on SilverBullet's built-in password auth (`SB_USER`) for actual access control.

To get real client IPs in nginx, you would need `network_mode: host` on the webserver container (which breaks Docker DNS for inter-container routing).

### UFW Rules Are Additive

When you run `ufw allow <port>`, it adds a new rule. It doesn't replace existing rules. To get clean rules after changes:

```bash
sudo ufw --force reset
# Then re-run Ansible setup playbook
```

## Verification Commands

```bash
# Check firewall rules
ssh hobbit@192.168.0.67 'sudo ufw status verbose'

# Verify SSH rejects password
ssh -o PreferredAuthentications=password hobbit@192.168.0.67
# Expected: "Permission denied"

# Check security headers
curl -skI https://192.168.0.67/ | grep -E "X-Frame|X-Content"

# Check unattended-upgrades
ssh hobbit@192.168.0.67 'systemctl status unattended-upgrades'

# Check for blocked connections (useful for debugging)
ssh hobbit@192.168.0.67 'sudo dmesg | grep "UFW BLOCK" | tail -10'
```

## Security Role Structure

```
roles/security/
├── tasks/main.yml           # Installs unattended-upgrades, SSH hardening
├── handlers/main.yml        # Restarts SSH service
└── files/
    ├── sshd_hardening.conf  # SSH key-only config
    ├── 50unattended-upgrades # What to auto-update
    └── 20auto-upgrades      # Enable auto-updates
```

## Network Diagram (Secured)

```
Internet
    │
    ▼ (BLOCKED by UFW - deny incoming)
┌─────────────────────────────────────────────────────────┐
│  Hobbit Mini PC (192.168.0.67)                          │
│                                                         │
│  UFW Firewall: deny incoming, allow outgoing            │
│  ┌─────────────────────────────────────────────────┐    │
│  │ UFW: Allowed from 192.168.0.0/24 only:         │    │
│  │   :22    SSH (key-only)                         │    │
│  │   :53    DNS                                    │    │
│  │   :80    HTTP                                   │    │
│  │   :443   HTTPS                                  │    │
│  │   :853   DNS-over-TLS                           │    │
│  │   :5353  mDNS                                   │    │
│  │                                                  │    │
│  │ UFW: Allowed on tailscale0:                     │    │
│  │   :53/udp  DNS (Split DNS for .house)           │    │
│  │                                                  │    │
│  │ Docker (bypasses UFW):                          │    │
│  │   :80/:443  Nginx (0.0.0.0)                     │    │
│  │                                                  │    │
│  │ Localhost only:                                  │    │
│  │   :1883  MQTT (127.0.0.1 bind)                  │    │
│  │   :3001  Bridge (nginx proxies via Docker net)   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Outbound: ──────────────────────────────────────► OK   │
│  (Updates, Docker pulls, etc.)                          │
└─────────────────────────────────────────────────────────┘
    ▲                              ▲
    │ (LAN)                        │ (Tailscale tunnel)
┌───────────────────────┐  ┌──────────────────────────┐
│  LAN Devices          │  │  Tailscale Peers          │
│  192.168.0.0/24       │  │  100.64.0.0/10            │
│  - Phone (home)       │  │  - Phone (remote)         │
│  - Laptop             │  │  Subnet routing:           │
│  - Gaming PC          │  │    can reach 192.168.0.0/24│
└───────────────────────┘  └──────────────────────────┘
```
