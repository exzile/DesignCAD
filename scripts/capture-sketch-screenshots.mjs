/**
 * Captures Design workspace / Sketch screenshots for help documentation.
 * Run: node scripts/capture-sketch-screenshots.mjs
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

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 860 });

  console.log('Opening app…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await wait(3000);

  // Ensure Design workspace is active
  await page.evaluate(() => {
    document.querySelector('.ribbon-workspace-btn')?.click();
  });
  await wait(300);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('.ribbon-workspace-option'))
      .find(o => /design/i.test(o.textContent))?.click();
  });
  await wait(1500);

  // ── 1. Full Design workspace + ribbon ────────────────────────────────────────
  console.log('\n[1] Design workspace overview');
  await fullShot(page, 'help-design-overview.png');

  // ── 2. Design ribbon (CREATE section) ────────────────────────────────────────
  console.log('\n[2] Design ribbon');
  await shot(page, '.ribbon-toolbar', 'help-design-ribbon.png', 0);

  // ── 3. Enter sketch mode on XY plane ─────────────────────────────────────────
  console.log('\n[3] Entering sketch mode on XY plane…');
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find(b => /^sketch$/i.test(b.textContent?.trim()))?.click();
  });
  await wait(1000);

  // Click on the XY plane in the viewport (flat horizontal plane, ~60% down)
  const canvasBox = await page.$eval('canvas', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }).catch(() => null);

  if (canvasBox) {
    const cx = canvasBox.x + canvasBox.width * 0.50;
    const cy = canvasBox.y + canvasBox.height * 0.72;
    await page.mouse.move(cx, cy);
    await wait(200);
    await page.mouse.click(cx, cy);
    console.log(`  Clicked canvas at ${Math.round(cx)}, ${Math.round(cy)}`);
  }
  await wait(1500);

  // Confirm sketch mode activated
  const inSketch = await page.$('.sketch-ribbon').then(el => !!el);
  if (!inSketch) {
    console.warn('  ⚠ sketch-ribbon not found — trying alternate XY click position');
    if (canvasBox) {
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.5,
        canvasBox.y + canvasBox.height * 0.6,
      );
      await wait(1500);
    }
  }

  // ── 4. Sketch mode — full viewport ───────────────────────────────────────────
  console.log('\n[4] Sketch mode — full viewport (palette open)');
  await fullShot(page, 'help-sketch-mode.png');

  // ── 5. Sketch ribbon ─────────────────────────────────────────────────────────
  console.log('\n[5] Sketch ribbon');
  await shot(page, '.sketch-ribbon', 'help-sketch-ribbon.png', 0);

  // ── 6. Sketch palette ────────────────────────────────────────────────────────
  console.log('\n[6] Sketch palette');
  await shot(page, '.sketch-palette', 'help-sketch-palette.png', 0);

  // ── 7. Close palette, draw some geometry, capture active sketch ───────────────
  console.log('\n[7] Active sketch with geometry…');
  // Close the palette
  await page.evaluate(() => {
    document.querySelector('.sketch-palette-close')?.click();
  });
  await wait(400);

  // Draw a rectangle using the rectangle tool then dimension it
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find(b => /^rectangle$/i.test(b.textContent?.trim()))?.click();
  });
  await wait(500);

  if (canvasBox) {
    const cx = canvasBox.x + canvasBox.width * 0.5;
    const cy = canvasBox.y + canvasBox.height * 0.5;
    // Draw a two-corner rectangle
    await page.mouse.click(cx - 80, cy - 50);
    await wait(300);
    await page.mouse.click(cx + 80, cy + 50);
    await wait(600);
  }

  // Switch back to select / finish any active command
  await page.keyboard.press('Escape');
  await wait(400);

  await fullShot(page, 'help-sketch-active.png');

  // ── 8. Constraints section ────────────────────────────────────────────────────
  console.log('\n[8] Constraints ribbon area');
  // The CONSTRAINTS group in the sketch ribbon
  const constraintsBox = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('.ribbon-section-label, .ribbon-group-label, .ribbon-label'));
    const cs = sections.find(el => /constraint/i.test(el.textContent));
    if (!cs) return null;
    const parent = cs.closest('.ribbon-section') || cs.parentElement;
    if (!parent) return null;
    const r = parent.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });

  if (constraintsBox) {
    await page.screenshot({
      path: path.join(OUT, 'help-sketch-constraints.png'),
      clip: {
        x: Math.max(0, constraintsBox.x - 4),
        y: Math.max(0, constraintsBox.y - 4),
        width: constraintsBox.width + 8,
        height: constraintsBox.height + 8,
      },
    });
    console.log('  ✓ help-sketch-constraints.png');
  } else {
    console.warn('  ⚠ constraints section not found — using full ribbon crop');
    await shot(page, '.sketch-ribbon', 'help-sketch-constraints.png', 0);
  }

  // ── 9. Finish Sketch area ─────────────────────────────────────────────────────
  console.log('\n[9] Finish Sketch button area');
  await shot(page, '.sketch-finish-area', 'help-sketch-finish.png', 8);

  await browser.close();
  console.log('\nDone.');
})();
