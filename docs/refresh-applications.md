# Refreshing the Sunshine Application List

## How the Cache Works

The bridge caches the list of Sunshine applications to avoid querying the gaming PC on every request. The cache has a **5-minute TTL** and is populated lazily — the first `GET /apps` request after the cache expires (or after a bridge restart) fetches a fresh list from Sunshine.

## Force Refresh

If you've added or removed apps on the gaming PC and don't want to wait for the cache to expire, trigger a manual refresh:

```bash
curl -X POST http://192.168.0.67:3001/apps/refresh
```

> **Note:** The gaming PC (Sunshine) must be online and reachable for the refresh to succeed. If it's off or unreachable, the request will fail.

## Verify the Updated List

After refreshing, confirm the new app list:

```bash
curl http://192.168.0.67:3001/apps
```

This returns a JSON array of available Sunshine applications.
