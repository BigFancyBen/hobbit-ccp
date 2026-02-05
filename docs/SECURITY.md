# Security Hardening Guide

This document describes the security measures implemented on the Hobbit Mini PC to make it safe for 24/7 operation on a home LAN.

## Security Model: LAN-Only Access

The server follows a "one-way valve" model:
- **Inbound**: Only accessible from LAN (192.168.0.0/24)
- **Outbound**: Can reach the internet freely (for updates)
- **Invisible** from outside the home network

## Implemented Security Measures

### 1. UFW Firewall (LAN-Only)

All services are restricted to the local subnet `192.168.0.0/24`.

**Allowed Ports:**

| Port | Service | Notes |
|------|---------|-------|
| 22 | SSH | Key-only authentication |
| 53 | DNS | dnsmasq |
| 80 | HTTP | Nginx web UI |
| 853 | DNS-over-TLS | Required for Android |
| 1883 | MQTT | Mosquitto broker |
| 3001 | Bridge API | Moonlight/monitor control |
| 5353 | mDNS | avahi-daemon |
| 19999 | Netdata | System monitoring |

**Configuration:** [roles/base/tasks/main.yml](../roles/base/tasks/main.yml)

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
    - "853"   # DNS-over-TLS (Android)
    - "3001"  # Bridge API
    - "5353"  # mDNS
    - "1883"  # MQTT
    - "19999" # Netdata monitoring
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

Requests must use a valid hostname (`hobbit`, `hobbit.local`, or `hobbit.house`). Requests with other Host headers are rejected.

```nginx
# Reject requests with unknown Host headers
server {
    listen 80 default_server;
    return 444;  # Close connection without response
}
```

This prevents DNS rebinding attacks through the browser.

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
| HTTPS | Skip | Self-signed certs cause browser warnings. LAN-only traffic doesn't need encryption. |
| MQTT authentication | Skip | Firewall blocks external access. Adds complexity for no benefit on LAN. |
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
curl -I http://192.168.0.67/ | grep -E "X-Frame|X-Content"

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
│  │ Allowed from 192.168.0.0/24 only:               │    │
│  │   :22    SSH (key-only)                         │    │
│  │   :53    DNS                                    │    │
│  │   :80    HTTP                                   │    │
│  │   :853   DNS-over-TLS                           │    │
│  │   :1883  MQTT                                   │    │
│  │   :3001  Bridge API                             │    │
│  │   :5353  mDNS                                   │    │
│  │   :19999 Netdata                                │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Outbound: ──────────────────────────────────────► OK   │
│  (Updates, Docker pulls, etc.)                          │
└─────────────────────────────────────────────────────────┘
    ▲
    │ (ALLOWED from LAN)
┌───────────────────────┐
│  LAN Devices          │
│  192.168.0.0/24       │
│  - Phone              │
│  - Laptop             │
│  - Gaming PC          │
└───────────────────────┘
```
