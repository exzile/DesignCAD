/**
 * Captures help-doc screenshots from the running dev server (localhost:5173).
 * Saves to public/help/*.png
 * Run: node scripts/capture-help-screenshots.mjs
 */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'help');
const BASE = 'http://localhost:5173';

async function shot(page, selector, outFile, padding = 0) {
  const el = await page.$(selector);
  if (!el) { console.warn(`  ⚠ selector not found: ${selector}`); return false; }
  const box = await el.boundingBox();
  await page.screenshot({
    path: path.join(OUT, outFile),
    clip: {
      x: Math.max(0, box.x - padding),
      y: Math.max(0, box.y - padding),
      width: box.width + padding * 2,
      height: box.height + padding * 2,
    },
  });
  console.log(`  ✓ ${outFile}`);
  return true;
}

async function fullShot(page, outFile) {
  await page.screenshot({ path: path.join(OUT, outFile), fullPage: false });
  console.log(`  ✓ ${outFile} (full viewport)`);
}

async function evalClick(page, expr) {
  await page.evaluate(expr);
  await new Promise(r => setTimeout(r, 400));
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Opening app…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // ── 1. Top bar (AI MCP badge visible) ────────────────────────────────────
  console.log('\n[1] Top bar');
  await shot(page, '.ribbon-toolbar', 'help-topbar.png', 0);

  // ── 2. AI panel — MCP tab ────────────────────────────────────────────────
  console.log('\n[2] AI panel — MCP tab');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'AI');
    btn?.click();
  });
  await page.waitForSelector('.ai-panel', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    const mcp = Array.from(document.querySelectorAll('button.ai-tab-btn')).find(b => b.textContent.trim() === 'MCP');
    mcp?.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await shot(page, '.ai-panel', 'help-ai-mcp.png', 0);

  // ── 3. AI panel — Chat tab ───────────────────────────────────────────────
  console.log('\n[3] AI panel — Chat tab');
  await page.evaluate(() => document.querySelector('button.ai-tab-btn:not(.active)')?.click());
  await new Promise(r => setTimeout(r, 500));
  await shot(page, '.ai-panel', 'help-ai-chat.png', 0);

  // ── 4. Close AI panel, go to Prepare page ───────────────────────────────
  console.log('\n[4] Prepare workspace overview');
  await evalClick(page, `() => document.querySelector('.ai-panel-close')?.click()`);
  // Navigate to Prepare workspace via dropdown
  await evalClick(page, `() => document.querySelector('.ribbon-workspace-btn')?.click()`);
  await evalClick(page, `() => {
    const opts = Array.from(document.querySelectorAll('.ribbon-workspace-option'));
    opts.find(o => /prepare/i.test(o.textContent))?.click();
  }`);
  await new Promise(r => setTimeout(r, 1200));
  await fullShot(page, 'help-prepare-workspace.png');

  // ── 5. Printer workspace overview ───────────────────────────────────────
  console.log('\n[5] 3D Printer workspace overview');
  await evalClick(page, `() => document.querySelector('.ribbon-workspace-btn')?.click()`);
  await evalClick(page, `() => {
    const opts = Array.from(document.querySelectorAll('.ribbon-workspace-option'));
    opts.find(o => /printer/i.test(o.textContent))?.click();
  }`);
  await new Promise(r => setTimeout(r, 1200));
  await fullShot(page, 'help-printer-workspace.png');

  await browser.close();
  console.log('\nDone.');
})();
