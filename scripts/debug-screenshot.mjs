import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

// Check what buttons exist
const buttons = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim().slice(0, 30))
);
console.log('Buttons:', buttons.slice(0, 20).join(' | '));

// Click AI button
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'AI');
  if (btn) btn.click();
  console.log('clicked AI:', btn?.className);
});
await new Promise(r => setTimeout(r, 2000));

// Check if .ai-panel exists now
const panelExists = await page.evaluate(() => !!document.querySelector('.ai-panel'));
console.log('ai-panel exists:', panelExists);

// All classes after click
const classes = await page.evaluate(() => {
  const s = new Set();
  document.querySelectorAll('*').forEach(el => el.className?.toString().split(' ').forEach(c => { if (c) s.add(c); }));
  return [...s].filter(c => /\bai\b|panel|popup|popover|modal|overlay/i.test(c)).join(', ');
});
console.log('AI-related classes:', classes);

// Full page screenshot for debug
await page.screenshot({ path: 'public/help/debug-state.png' });
console.log('debug screenshot saved');

await browser.close();
