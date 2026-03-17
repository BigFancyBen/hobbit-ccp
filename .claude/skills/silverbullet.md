---
name: silverbullet
description: Read, write, or manage SilverBullet wiki pages on the Hobbit mini PC via its HTTP API. Use when the user wants to create, update, read, or delete notes/pages, or manage SilverBullet configuration.
---

# Instructions

SilverBullet runs at `https://hobbit.house/sb` with basic auth credentials from `group_vars/all.yml` (`sb_user`). Pages are plain markdown accessible via HTTP.

## Reading a page

```bash
curl -u hobbit:changeme -k https://hobbit.house/sb/<page-name>.md
```

## Creating or updating a page

```bash
curl -u hobbit:changeme -k -X PUT -d "# Page Title

Content here" https://hobbit.house/sb/<page-name>.md
```

For multi-line content, use `--data-binary` with a file:

```bash
curl -u hobbit:changeme -k -X PUT --data-binary @local-file.md https://hobbit.house/sb/<page-name>.md
```

## Deleting a page

```bash
curl -u hobbit:changeme -k -X DELETE https://hobbit.house/sb/<page-name>.md
```

## Configuration changes

- **Credentials**: Edit `sb_user` in `group_vars/all.yml`, then deploy
- **IP allowlist**: Edit the `/sb/` location block in `files/nginx.conf`, then deploy
- **URL prefix**: Set via `SB_URL_PREFIX` env var in `files/docker-compose.yml`

## Key files

| File | Purpose |
|------|---------|
| `group_vars/all.yml` | `sb_user` credential |
| `files/docker-compose.yml` | SilverBullet service definition |
| `files/nginx.conf` | `/sb` proxy + IP allowlist |
| `docs/silverbullet.md` | Full documentation |

## Notes

- Use `-k` flag with curl when accessing via `hobbit.house` (self-signed SSL cert)
- No `-k` needed when accessing via `<your-tailscale-fqdn>` (valid Let's Encrypt cert)
- Access is restricted to LAN IPs + Tailscale peers (100.64.0.0/10) in the nginx `/sb/` location block
- Page data lives in `/home/hobbit/hobbit/space/` on the mini PC
