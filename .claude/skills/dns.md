---
name: dns
description: Configure the dnsmasq local DNS server on the Hobbit mini PC. Use when adding hostnames, setting up router DNS, troubleshooting name resolution, or configuring hobbit.house domain.
---

# How It Works

1. **dnsmasq** runs on mini PC (port 53)
2. Router DHCP points clients to 192.168.0.67 for DNS
3. dnsmasq resolves local hostnames, forwards others to Cloudflare/Google

# Current Hostnames

| Hostname | Resolves To |
|----------|-------------|
| `hobbit.house` | 192.168.0.67 |
| `hobbit.local` | 192.168.0.67 (mDNS) |
| `hobbit` | 192.168.0.67 |

# Router Configuration

Point your router's DNS to the mini PC:

1. Log into router admin panel
2. Find DHCP settings
3. Set primary DNS: `192.168.0.67`
4. Optional secondary DNS: `8.8.8.8` (fallback)
5. Clients reconnect WiFi to get new settings

# Adding New Hostnames

Edit `/etc/dnsmasq.d/local.conf`:

```bash
# Add a new hostname
address=/myservice.house/192.168.0.67

# Point to different IP
address=/nas.house/192.168.0.100
```

Then restart:
```bash
sudo systemctl restart dnsmasq
```

# Testing DNS

```bash
# From any network device
nslookup hobbit.house

# Direct test
dig hobbit.house @192.168.0.67 +short
```

# Tailscale Split DNS

When away from the LAN, Tailscale routes `*.house` queries to hobbit's dnsmasq. Configured in the Tailscale admin console:
- Domain: `house`, Nameserver: `100.91.142.95`
- UFW allows DNS on `tailscale0` (port 53/udp)

# Configuration

- Main config: `/etc/dnsmasq.d/local.conf`
- Ansible roles: `roles/dns/`, `roles/tailscale/`

# Troubleshooting

**DNS queries timeout**
```bash
systemctl status dnsmasq
sudo ufw status | grep 53
```

**Can't resolve external domains**
```bash
dig google.com @1.1.1.1
```

**Enable query logging**
```bash
# Add to /etc/dnsmasq.d/local.conf
log-queries

# Restart and watch
sudo systemctl restart dnsmasq
journalctl -u dnsmasq -f
```

**Android "no internet" warning**
Port 853 (DNS-over-TLS) must be open. Check firewall:
```bash
sudo ufw status | grep 853
```
