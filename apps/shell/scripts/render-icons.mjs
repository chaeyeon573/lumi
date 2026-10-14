/**
 * Renders assets/icon.png (1024², opaque, App Store icon) and assets/splash-icon.png (transparent, splash) —
 * the "lumi." wordmark (Unbounded 800, pink dot #FF3DA8) on the v2 night background #08070C.
 *
 *   node scripts/render-icons.mjs assets <unbounded-800.woff2>     (needs playwright-core + a Chromium)
 *   node scripts/strip-alpha.cjs . assets/icon.png                 (re-encode as RGB — Apple rejects alpha)
 *
 * The font: https://fonts.googleapis.com/css2?family=Unbounded:wght@800 → the latin .woff2.
 * CHROMIUM env = executable path (default /opt/pw-browsers/chromium).
 */
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const out = process.argv[2];
const FONT = readFileSync(process.argv[3]).toString('base64');
const html = (bg, size, font) => `<!doctype html><html><head>
<style>@font-face{font-family:'Unbounded';font-weight:800;src:url(data:font/woff2;base64,${FONT}) format('woff2');}
html,body{margin:0;width:${size}px;height:${size}px;background:${bg};}
.w{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
.m{font-family:'Unbounded';font-weight:800;font-size:${font}px;letter-spacing:-0.025em;color:#F4F1FF;line-height:1;transform:translateY(-2%);}
.d{color:#FF3DA8}</style></head><body><div class="w"><span class="m">lumi<span class="d">.</span></span></div></body></html>`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [name, bg, size, font, omit] of [['icon.png', '#08070C', 1024, 256, false], ['splash-icon.png', 'transparent', 1024, 256, true]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html(bg, size, font), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const ok = await page.evaluate(async () => (await document.fonts.load("800 100px Unbounded")).length > 0);
  if (!ok) throw new Error('Unbounded font did not load');
  const w = await page.evaluate(() => document.querySelector('.m').getBoundingClientRect().width);
  console.log(name, 'wordmark width', Math.round(w));
  await page.screenshot({ path: `${out}/${name}`, omitBackground: omit });
}
await browser.close();
