#!/usr/bin/env node

/**
 * Capture screenshots of the Hobbit web app at Pixel 10 Pro dimensions.
 *
 * Usage:
 *   node scripts/screenshots.mjs                          # all screenshots against dev server
 *   node scripts/screenshots.mjs --base-url=http://hobbit.house  # against real device
 *   node scripts/screenshots.mjs --skip-gaming            # skip gaming/kodi (they launch real sessions)
 *
 * Prerequisites:
 *   npm install -D playwright
 *   npx playwright install chromium
 *   Vite dev server running (cd web && npm run dev) — or use --base-url
 *   Mini PC online with lights paired, Spotify playing, camera connected
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'docs', 'screenshots');

// Pixel 10 Pro viewport
const VIEWPORT = { width: 412, height: 932 };
const DEVICE_SCALE_FACTOR = 3;

// Parse CLI flags
const args = process.argv.slice(2);
const skipGaming = args.includes('--skip-gaming');
const baseUrlFlag = args.find((a) => a.startsWith('--base-url='));
const BASE_URL = baseUrlFlag ? baseUrlFlag.split('=')[1] : 'http://localhost:5173';
const API = `${BASE_URL}/api/control`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function settle(page, ms = 600) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}

async function capture(page, name) {
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path });
  console.log(`  ✓ ${name}.png`);
}

async function apiPost(url) {
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}`);
  return res;
}

async function pollStatus(mode, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${API}/status`);
      const data = await res.json();
      if (data.mode === mode) return data;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for mode=${mode}`);
}

// ─── Screenshots ──────────────────────────────────────────────────────────────

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`\nCapturing screenshots → ${OUT_DIR}`);
  console.log(`Base URL: ${BASE_URL}`);
  if (skipGaming) console.log('Skipping gaming/kodi screenshots (--skip-gaming)\n');
  else console.log('');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  try {
    // ── Lights ──────────────────────────────────────────────────────────────
    console.log('[1/9] Lights');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await settle(page);

    // If "Tap to connect" overlay is showing, click it and wait for groups
    const tapOverlay = page.locator('text=Tap to connect');
    if (await tapOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tapOverlay.click();
      // Wait for overlay to disappear (groups load)
      await page.locator('text=Tap to connect').waitFor({ state: 'hidden', timeout: 10000 });
      await settle(page);
    }
    await capture(page, 'lights');

    // ── Games (idle) ────────────────────────────────────────────────────────
    console.log('[2/9] Games (idle)');
    // Make sure we're in idle mode first
    try {
      const status = await (await fetch(`${API}/status`)).json();
      if (status.mode === 'gaming') await apiPost(`${API}/exit-gaming`);
      if (status.mode === 'kodi') await apiPost(`${API}/exit-kodi`);
      if (status.mode !== 'idle') await pollStatus('idle');
    } catch { /* best effort */ }

    await page.goto(`${BASE_URL}/games`, { waitUntil: 'networkidle' });
    await settle(page);
    await capture(page, 'games-idle');

    // ── Games (playing) ─────────────────────────────────────────────────────
    if (!skipGaming) {
      console.log('[3/9] Games (playing)');
      // Pick first available app (no guaranteed "Desktop" entry)
      const appsRes = await fetch(`${API}/apps`);
      const { apps } = await appsRes.json();
      const app = apps[0] || 'Desktop';
      console.log(`  Launching "${app}"...`);
      await apiPost(`${API}/launch-moonlight?app=${encodeURIComponent(app)}`);
      await pollStatus('gaming');
      // Reload to see gaming UI
      await page.goto(`${BASE_URL}/games`, { waitUntil: 'networkidle' });
      await settle(page, 1000);
      await capture(page, 'games-playing');

      // ── Games (Kodi) ───────────────────────────────────────────────────────
      console.log('[4/9] Games (Kodi)');
      await apiPost(`${API}/exit-gaming`);
      await pollStatus('idle');
      await apiPost(`${API}/launch-kodi`);
      await pollStatus('kodi');
      await page.goto(`${BASE_URL}/games`, { waitUntil: 'networkidle' });
      await settle(page, 1000);
      await capture(page, 'games-kodi');

      // Cleanup: exit kodi
      await apiPost(`${API}/exit-kodi`);
      await pollStatus('idle').catch(() => {});
    } else {
      console.log('[3/9] Games (playing) — SKIPPED');
      console.log('[4/9] Games (Kodi) — SKIPPED');
    }

    // ── Tunes ───────────────────────────────────────────────────────────────
    console.log('[5/9] Tunes');
    // SSE keeps connection open — use domcontentloaded instead of networkidle
    await page.goto(`${BASE_URL}/tunes`, { waitUntil: 'domcontentloaded' });
    await settle(page, 2000); // extra time for album art + SSE data
    await capture(page, 'tunes');

    // ── Settings (System) ───────────────────────────────────────────────────
    console.log('[6/9] Settings (System)');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await settle(page);
    // Click gear icon (button with variant ghost + size icon in the header)
    await page.locator('header button').last().click();
    await settle(page);
    await capture(page, 'settings-system');

    // ── Settings (Stats) ────────────────────────────────────────────────────
    console.log('[7/9] Settings (Stats)');
    await page.locator('button:has-text("Stats")').click();
    await settle(page, 300);
    // Click "Start Monitoring" if visible
    const startBtn = page.locator('button:has-text("Start Monitoring")');
    if (await startBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await startBtn.click();
    }
    // Wait for CPU value to appear (non-zero progress)
    await page.waitForTimeout(3000);
    await capture(page, 'settings-stats');

    // ── Settings (Camera) ───────────────────────────────────────────────────
    console.log('[8/9] Settings (Camera)');
    // Click Camera tab directly (settings modal is still open from stats)
    await page.locator('button:has-text("Camera")').click();
    await settle(page, 3000); // wait for WebRTC to establish
    await capture(page, 'settings-camera');

    // ── WiFi ────────────────────────────────────────────────────────────────
    console.log('[9/9] WiFi');
    // Intercept /wifi API to mask real password
    await page.route('**/api/control/wifi', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      await route.fulfill({
        response,
        body: JSON.stringify({ ...json, password: 'hunter2' }),
      });
    });
    await page.goto(`${BASE_URL}/wifi`, { waitUntil: 'networkidle' });
    await settle(page);
    await capture(page, 'wifi');
    // Remove the intercept for any subsequent requests
    await page.unroute('**/api/control/wifi');

    console.log('\nDone! Screenshots saved to docs/screenshots/');
    console.log('Tip: run `pngquant --quality=65-80 docs/screenshots/*.png` to optimize file sizes.');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
