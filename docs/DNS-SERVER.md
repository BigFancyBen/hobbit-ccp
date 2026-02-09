# DNS Server Setup

The Hobbit mini PC runs dnsmasq as a local DNS server. This allows all devices on your network to resolve custom hostnames like `hobbit.house`.

## How It Works

1. **dnsmasq** runs on the mini PC and listens on port 53
2. Your router's DHCP points clients to hobbit (192.168.0.67) for DNS
3. dnsmasq resolves local hostnames and forwards everything else to upstream DNS (Cloudflare/Google)

## Local Hostnames

The following hostnames all resolve to 192.168.0.67:

| Hostname | Resolution Method |
|----------|------------------|
| `hobbit.house` | dnsmasq local config |
| `hobbit.local` | dnsmasq + mDNS (avahi) |
| `hobbit` | dnsmasq local config |

## Router Configuration

Point your router's DNS to the mini PC:

1. Log into your router's admin panel
2. Find DHCP settings
3. Set primary DNS to: `192.168.0.67`
4. Optionally set secondary DNS to: `8.8.8.8` (fallback)

After saving, clients will need to renew their DHCP lease (or reconnect to WiFi).

## Adding More Hostnames

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

## Configuration File

The main config is at `/etc/dnsmasq.d/local.conf`:

```ini
# Don't read /etc/resolv.conf
no-resolv

# Upstream DNS servers
server=1.1.1.1
server=8.8.8.8

# Local domain
local=/house/
domain=house

# Local hostnames
address=/hobbit.house/192.168.0.67
address=/hobbit.local/192.168.0.67
address=/hobbit/192.168.0.67

# Cache size
cache-size=1000

# Don't forward short names
domain-needed

# Don't forward non-routable addresses
bogus-priv
```

## Testing

From any device on your network (after router DNS is configured):

```bash
# Should return 192.168.0.67
nslookup hobbit.house

# Should return external IP
nslookup google.com
```

Or directly test the DNS server:

```bash
dig hobbit.house @192.168.0.67 +short
```

## Troubleshooting

### DNS queries timeout

Check dnsmasq is running:
```bash
systemctl status dnsmasq
```

Check firewall allows port 53:
```bash
sudo ufw status | grep 53
```

### Can't resolve external domains

Check upstream DNS connectivity:
```bash
dig google.com @1.1.1.1
```

### Check dnsmasq logs

Enable logging temporarily:
```bash
# Add to /etc/dnsmasq.d/local.conf
log-queries

# Restart and watch logs
sudo systemctl restart dnsmasq
journalctl -u dnsmasq -f
```

## Tailscale Split DNS

When away from the LAN, Tailscale's Split DNS routes `*.house` queries to the mini PC's dnsmasq (via Tailscale IP `100.91.142.95`). Combined with subnet routing (`192.168.0.0/24`), `hobbit.house` resolves and is reachable from anywhere on the tailnet.

Configuration is in the Tailscale admin console (DNS → Split DNS):
- Domain: `house`
- Nameserver: `100.91.142.95`

UFW allows DNS queries on the `tailscale0` interface (port 53/udp). See `roles/tailscale/tasks/main.yml`.

## Ansible Role

The DNS server is configured by the `dns` role in `roles/dns/`. Key files:

- `roles/dns/tasks/main.yml` - Installation and configuration tasks
- `roles/dns/files/dnsmasq-local.conf` - dnsmasq configuration
- `roles/dns/handlers/main.yml` - Service restart handlers
