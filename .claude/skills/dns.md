# DNS Server Configuration

Configure and manage the dnsmasq local DNS server on the Hobbit mini PC.

## When to Use
Use this skill when the user wants to:
- Add new local hostnames
- Configure router DNS settings
- Troubleshoot DNS resolution
- Understand how local DNS works

## How It Works

1. **dnsmasq** runs on the mini PC (port 53)
2. Router DHCP points clients to hobbit (192.168.0.67) for DNS
3. dnsmasq resolves local hostnames, forwards others to Cloudflare/Google

## Current Hostnames

| Hostname | Resolves To |
|----------|-------------|
| `hobbit.house` | 192.168.0.67 |
| `hobbit.local` | 192.168.0.67 |
| `hobbit` | 192.168.0.67 |

## Router Configuration

Point your router's DNS to the mini PC:
1. Log into router admin panel
2. Find DHCP settings
3. Set primary DNS: `192.168.0.67`
4. Optional secondary DNS: `8.8.8.8` (fallback)
5. Clients need to renew DHCP lease (or reconnect WiFi)

## Adding New Hostnames

Edit `/etc/dnsmasq.d/local.conf` on the mini PC:

```bash
# Add a new hostname
address=/myservice.house/192.168.0.67

# Or point to a different IP
address=/nas.house/192.168.0.100
```

Then restart dnsmasq:
```bash
sudo systemctl restart dnsmasq
```

## Testing DNS

```bash
# From any device on network
nslookup hobbit.house

# Directly test the DNS server
dig hobbit.house @192.168.0.67 +short
```

## Configuration File Location

Main config: `/etc/dnsmasq.d/local.conf`

Ansible role: `roles/dns/`

## Troubleshooting

**DNS queries timeout**
```bash
systemctl status dnsmasq
sudo ufw status | grep 53
```

**Can't resolve external domains**
```bash
dig google.com @1.1.1.1
```

**Enable logging**
```bash
# Add to /etc/dnsmasq.d/local.conf
log-queries

# Restart and watch
sudo systemctl restart dnsmasq
journalctl -u dnsmasq -f
```
