/**
 * Captures printer connection settings screenshots for the help documentation.
 * Run: node scripts/capture-connection-screenshots.mjs
 */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'help');
const BASE = 'http://localhost:5173';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function shot(page, selector, outFile, pad = 0) {
  const el = await page.$(selector);
  if (!el) { console.warn(`  ⚠ not found: ${selector}`); return; }
  const box = await el.boundingBox();
  if (!box) { console.warn(`  ⚠ no box: ${selector}`); return; }
  const vp = page.viewport();
  await page.screenshot({
    path: path.join(OUT, outFile),
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: Math.min(box.width + pad * 2, vp.width),
      height: Math.min(box.height + pad * 2, vp.height - Math.max(0, box.y - pad)),
    },
  });
  console.log(`  ✓ ${outFile}`);
}

async function fullShot(page, outFile) {
  await page.screenshot({ path: path.join(OUT, outFile) });
  console.log(`  ✓ ${outFile} (viewport)`);
}

async function clickBtn(page, text) {
  await page.evaluate((t) => {
    Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === t)?.click();
  }, text);
  await wait(400);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 860 });

  console.log('Opening app…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await wait(3000);

  // Navigate: 3D Printer → Settings → Connection
  await page.evaluate(() => {
    document.querySelector('.ribbon-workspace-btn')?.click();
  });
  await wait(300);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('.ribbon-workspace-option')).find(o => /printer/i.test(o.textContent))?.click();
  });
  await wait(1200);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Settings')?.click();
  });
  await wait(1000);
  try { await page.waitForSelector('.duet-settings__page', { timeout: 5000 }); } catch {}
  await wait(500);

  // ── 1. Klipper Network (default view most users encounter) ───────────────
  console.log('\n[1] Network + Klipper (full page)');
  await clickBtn(page, 'Network');
  await clickBtn(page, 'Klipper');
  await fullShot(page, 'help-conn-network-klipper.png');
  await shot(page, '.duet-settings__page', 'help-conn-network-klipper-panel.png', 0);

  // ── 2. Board type row cropped ────────────────────────────────────────────
  console.log('\n[2] Board type row');
  await shot(page, '.duet-settings__mode-selector', 'help-conn-board-types.png', 8);

  // ── 3. Preset dropdown open ──────────────────────────────────────────────
  console.log('\n[3] Printer preset dropdown open');
  await page.evaluate(() => {
    const sel = document.querySelector('.duet-settings__select, select');
    // Open a native select isn't visual — find the custom dropdown if present
    sel?.click();
  });
  await wait(300);
  // Just capture the preset row area
  const presetEl = await page.$('.duet-settings__form-group');
  if (presetEl) {
    const box = await presetEl.boundingBox();
    await page.screenshot({
      path: path.join(OUT, 'help-conn-preset-row.png'),
      clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height + 80, 860 - box.y) },
    });
    console.log('  ✓ help-conn-preset-row.png');
  }

  // ── 4. Marlin Network ────────────────────────────────────────────────────
  console.log('\n[4] Network + Marlin');
  await clickBtn(page, 'Marlin');
  await fullShot(page, 'help-conn-network-marlin.png');

  // ── 5. Duet (RRF) with Standalone / SBC toggle ──────────────────────────
  console.log('\n[5] Duet (RRF) — Standalone / SBC toggle');
  await clickBtn(page, 'Duet (RRF)');
  await fullShot(page, 'help-conn-network-duet.png');

  // ── 6. USB mode ──────────────────────────────────────────────────────────
  console.log('\n[6] USB mode');
  await clickBtn(page, 'USB');
  await fullShot(page, 'help-conn-usb.png');
  // USB serial port section
  const usbSection = await page.$('.duet-settings__section');
  if (usbSection) {
    const box = await usbSection.boundingBox();
    await page.screenshot({
      path: path.join(OUT, 'help-conn-usb-section.png'),
      clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.width + 16, height: Math.min(box.height + 16, 860) },
    });
    console.log('  ✓ help-conn-usb-section.png');
  }

  // ── 7. Auto-reconnect section ────────────────────────────────────────────
  console.log('\n[7] Auto-reconnect section');
  // Switch back to network view first so full page shows nicely
  await clickBtn(page, 'Network');
  await clickBtn(page, 'Klipper');
  // Get the auto-reconnect section (last section on the page)
  const sections = await page.$$('.duet-settings__section');
  if (sections.length > 0) {
    const last = sections[sections.length - 1];
    const box = await last.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(OUT, 'help-conn-auto-reconnect.png'),
        clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: Math.min(box.width + 16, 1280), height: Math.min(box.height + 16, 860) },
      });
      console.log('  ✓ help-conn-auto-reconnect.png');
    }
  }

  // ── 8. Test Connection + Connect buttons ─────────────────────────────────
  console.log('\n[8] Test / Connect button row');
  const btnRow = await page.$('.duet-settings__btn-row');
  if (btnRow) {
    const box = await btnRow.boundingBox();
    await page.screenshot({
      path: path.join(OUT, 'help-conn-buttons.png'),
      clip: { x: Math.max(0, box.x - 12), y: Math.max(0, box.y - 12), width: Math.min(box.width + 24, 1280), height: Math.min(box.height + 24, 860) },
    });
    console.log('  ✓ help-conn-buttons.png');
  }

  await browser.close();
  console.log('\nDone.');
})();
