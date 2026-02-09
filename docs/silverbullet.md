# SilverBullet

SilverBullet is a markdown-based wiki/note-taking app running as a Docker container on the Hobbit Mini PC.

## Access

- **URL**: `https://hobbit.house/sb`
- **Credentials**: Configured via `sb_user` in `group_vars/all.yml` (default: `hobbit:changeme`)
- **IP restriction**: Only accessible from 192.168.0.70 and 192.168.0.69 (configured in `nginx.conf`)

## Architecture

```
Browser ──HTTPS──▶ Nginx (443)
                     │
                     ├─ /sb  → 301 redirect to /sb/
                     └─ /sb/ → proxy to silverbullet:3000
                                │
                                ▼
                         SilverBullet container
                         - SB_USER for auth
                         - SB_URL_PREFIX=/sb
                         - ./space:/space (markdown files)
```

## CLI / API Usage

SilverBullet exposes pages as plain markdown over HTTP. Use basic auth with the configured credentials.

### Read a page

```bash
curl -u hobbit:changeme -k https://hobbit.house/sb/index.md
```

### Create or update a page

```bash
curl -u hobbit:changeme -k -X PUT -d "# My Page" https://hobbit.house/sb/my-page.md
```

### Upload a page from a local file

```bash
curl -u hobbit:changeme -k -X PUT --data-binary @notes.md https://hobbit.house/sb/notes.md
```

### Delete a page

```bash
curl -u hobbit:changeme -k -X DELETE https://hobbit.house/sb/old-page.md
```

### List all pages (via API)

```bash
curl -u hobbit:changeme -k https://hobbit.house/sb/index.json
```

The `-k` flag skips self-signed certificate verification.

## Configuration

| Variable | File | Purpose |
|----------|------|---------|
| `sb_user` | `group_vars/all.yml` | Username:password for SilverBullet auth |
| `SB_URL_PREFIX` | `files/docker-compose.yml` | Path prefix (`/sb`) |
| IP allowlist | `files/nginx.conf` | Restrict access to specific devices |

## Data

Notes are stored as markdown files in `/home/hobbit/hobbit/space/` on the mini PC. This directory is bind-mounted into the container as `/space`.

## Changing the Password

1. Edit `group_vars/all.yml`:
   ```yaml
   sb_user: "hobbit:newpassword"
   ```
2. Deploy:
   ```bash
   ./deploy.sh
   ```

## Allowing Additional Devices

Add IP addresses to the `/sb/` location block in `files/nginx.conf`:

```nginx
location /sb/ {
    allow 192.168.0.70;
    allow 192.168.0.69;
    allow 192.168.0.XX;  # new device
    deny all;
    ...
}
```

Then deploy with `./deploy.sh`.
