# Zigbee Persistence & Light Controls

## The Problem

Zigbee2MQTT generates a unique network encryption key on first startup (`network_key: GENERATE` in config). If the config file is overwritten by a deploy, all paired devices lose their connection and must be re-paired.

## How Persistence Works

The Ansible deploy playbook uses `force: no` on the Zigbee2MQTT config template. This means:

1. **First deploy**: Template is written, Zigbee2MQTT starts and replaces `GENERATE` with a real key
2. **Subsequent deploys**: Template is skipped — the real key is preserved
3. **Each deploy**: A backup of `configuration.yaml` and `database.db` is saved as `.backup`

## Critical Files

On the mini PC at `/home/hobbit/hobbit/zigbee2mqtt/`:

| File | Purpose |
|------|---------|
| `configuration.yaml` | Zigbee2MQTT config with the real network key |
| `database.db` | Device pairings, network info |
| `configuration.yaml.backup` | Auto-backup from last deploy |
| `database.db.backup` | Auto-backup from last deploy |

**Never overwrite these files** unless you intend to re-pair all devices.

## Backup & Restore

### Manual backup (from local machine)

```bash
ssh hobbit "cp /home/hobbit/hobbit/zigbee2mqtt/configuration.yaml /home/hobbit/hobbit/zigbee2mqtt/configuration.yaml.manual-backup"
ssh hobbit "cp /home/hobbit/hobbit/zigbee2mqtt/database.db /home/hobbit/hobbit/zigbee2mqtt/database.db.manual-backup"
```

### Restore from backup

```bash
ssh hobbit "cp /home/hobbit/hobbit/zigbee2mqtt/configuration.yaml.backup /home/hobbit/hobbit/zigbee2mqtt/configuration.yaml"
ssh hobbit "cp /home/hobbit/hobbit/zigbee2mqtt/database.db.backup /home/hobbit/hobbit/zigbee2mqtt/database.db"
ssh hobbit "cd /home/hobbit/hobbit && docker compose restart zigbee2mqtt"
```

## Adding Lights to the Living Room Group

1. Open the Zigbee2MQTT frontend at `http://hobbit.local/zigbee/#/`
2. Pair the light: enable "Permit Join" and put the light in pairing mode
3. Rename the device to something descriptive (e.g., `floor_lamp`)
4. Go to Groups, create or select the `livingroom` group
5. Add the device to the group

The bridge auto-discovers group members via MQTT — no code changes needed.

## Changing the Config Template

If you need to change the Zigbee2MQTT config template (`files/zigbee2mqtt.yaml.j2`), be aware that `force: no` means changes won't apply on existing deployments. To apply template changes:

1. SSH into the mini PC
2. Edit `/home/hobbit/hobbit/zigbee2mqtt/configuration.yaml` directly
3. Restart: `cd /home/hobbit/hobbit && docker compose restart zigbee2mqtt`

Or, for a clean re-deploy (will lose pairings):

```bash
ssh hobbit "rm /home/hobbit/hobbit/zigbee2mqtt/configuration.yaml"
./deploy.sh
```
