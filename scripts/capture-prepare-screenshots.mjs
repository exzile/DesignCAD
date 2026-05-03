/**
 * Captures Prepare workspace screenshots for the help documentation.
 * Run: node scripts/capture-prepare-screenshots.mjs
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
  if (!box) { console.warn(`  ⚠ no boundingBox: ${selector}`); return; }
  const vp = page.viewport();
  await page.screenshot({
    path: path.join(OUT, outFile),
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: Math.min(box.width + pad * 2, vp.width - Math.max(0, box.x - pad)),
      height: Math.min(box.height + pad * 2, vp.height - Math.max(0, box.y - pad)),
    },
  });
  console.log(`  ✓ ${outFile}`);
}

async function fullShot(page, outFile) {
  await page.screenshot({ path: path.join(OUT, outFile) });
  console.log(`  ✓ ${outFile} (viewport)`);
}

async function goToPrepare(page) {
  await page.evaluate(() => {
    document.querySelector('.ribbon-workspace-btn')?.click();
  });
  await wait(300);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('.ribbon-workspace-option')).find(o => /prepare/i.test(o.textContent))?.click();
  });
  await wait(1500);
  // Dismiss loading overlay if present
  const skipBtn = await page.$('button');
  if (skipBtn) {
    const text = await page.evaluate(b => b.textContent, skipBtn);
    if (text?.trim() === 'Skip') { await skipBtn.click(); await wait(500); }
  }
  // More robust: wait for the prepare workspace to render
  try {
    await page.waitForSelector('.slicer-workspace-objects-panel', { timeout: 6000 });
  } catch { console.warn('  ⚠ objects panel timeout'); }
  await wait(1000);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 860 });

  console.log('Opening app…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await wait(3000);

  // ── Navigate to Prepare ──────────────────────────────────────────────────
  console.log('\n[prepare] Navigating to Prepare workspace…');
  await goToPrepare(page);

  // ── 1. Full workspace overview ───────────────────────────────────────────
  console.log('\n[1] Full Prepare workspace overview');
  await fullShot(page, 'help-prepare-overview.png');

  // ── 2. Ribbon toolbar ────────────────────────────────────────────────────
  console.log('\n[2] Ribbon toolbar');
  await shot(page, '.ribbon-toolbar', 'help-prepare-ribbon.png', 0);

  // ── 3. Objects on plate panel ────────────────────────────────────────────
  console.log('\n[3] Objects on plate panel');
  await shot(page, '.slicer-workspace-objects-panel', 'help-prepare-objects-panel.png', 0);

  // ── 4. Slicer settings panel ─────────────────────────────────────────────
  console.log('\n[4] Slicer settings panel');
  await shot(page, '.slicer-workspace-settings-panel', 'help-prepare-settings.png', 0);

  // ── 5. Profile row (printer + material) ─────────────────────────────────
  console.log('\n[5] Profile row');
  await shot(page, '.slicer-workspace-settings-panel__header', 'help-prepare-profile.png', 8);

  // ── 6. Viewport toolbar + nav tabs ──────────────────────────────────────
  console.log('\n[6] Viewport with nav tabs');
  // Capture the viewport + nav area together
  const navBox = await page.$eval('.slicer-workspace-nav', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  const vpBox = await page.$eval('.slicer-workspace__viewport, .slicer-workspace__canvas', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }).catch(() => null);
  if (vpBox) {
    await page.screenshot({
      path: path.join(OUT, 'help-prepare-viewport.png'),
      clip: { x: navBox.x, y: navBox.y, width: navBox.width, height: Math.min(vpBox.height + navBox.height, 860 - navBox.y) },
    });
    console.log('  ✓ help-prepare-viewport.png');
  }

  // ── 7. Viewport overlay tools ────────────────────────────────────────────
  console.log('\n[7] Viewport overlay toolbar');
  await shot(page, '.slicer-overlay-toolbar', 'help-prepare-viewport-tools.png', 6);

  // ── 8. Bottom action bar (Slice button) ──────────────────────────────────
  console.log('\n[8] Bottom action bar');
  await shot(page, '.slicer-bottom-bar', 'help-prepare-bottom-bar.png', 0);

  // ── 9. Trigger slice and wait for preview ────────────────────────────────
  console.log('\n[9] Slicing…');
  await page.evaluate(() => {
    const btn = document.querySelector('.slicer-bottom-bar__slice-btn');
    btn?.click();
  });
  // Wait up to 30s for preview to appear
  try {
    await page.waitForSelector('.slicer-workspace-nav__tab.is-active', { timeout: 5000 });
    // Click Preview tab
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button.slicer-workspace-nav__tab'))
        .find(b => b.textContent.trim() === 'Preview')?.click();
    });
    await wait(3000);
    // Check if preview loaded
    const hasPreview = await page.$('.slicer-workspace-nav__tab.is-active');
    if (hasPreview) {
      console.log('  Slice done — capturing preview');
      await fullShot(page, 'help-prepare-preview.png');
      // Also capture the preview-specific right panel if present
      await shot(page, '.slicer-workspace-settings-panel', 'help-prepare-preview-panel.png', 0);
    }
  } catch {
    console.warn('  ⚠ slice did not complete in time — skipping preview screenshot');
  }

  await browser.close();
  console.log('\nDone.');
})();
