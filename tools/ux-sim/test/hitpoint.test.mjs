// Regression for the pilot's ride form: tapping the centre of a Note textarea that a fixed "Post ride" bar half covers
// pressed the bar and posted the ride. The harness must tap a point where the element itself is on top.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { CHROMIUM } from '../lib/paths.mjs';
import { hitPoint } from '../lib/dom.mjs';

const HTML = `<!doctype html><meta name=viewport content="width=device-width"><body style="margin:0">
<div style="height:766px"></div><textarea id=note style="display:block;margin:0 16px;width:358px;height:88px">x</textarea><div style="height:400px"></div>
<button id=post onclick="window.posted=true" style="position:fixed;left:0;right:0;bottom:0;height:52px">Post ride</button>
<div id=sheet style="position:fixed;inset:0;background:#fff;display:none">sheet</div><button id=hidden style="position:fixed;top:10px;left:10px">covered</button></body>`;

test('hitPoint avoids the part of an element under a fixed bar', { skip: !existsSync(CHROMIUM) && `no Chromium at ${CHROMIUM}` }, async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.setContent(HTML);
    const ta = page.locator('#note');
    const box = await ta.boundingBox();
    // the old behaviour: the geometric centre is on the button
    const centreHit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    assert.equal(centreHit, 'post');
    const pt = await ta.evaluate(hitPoint);
    assert.ok(pt.x !== null && pt.y < 792, JSON.stringify(pt));
    await page.mouse.click(pt.x, pt.y);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'note');
    assert.equal(await page.evaluate(() => !!window.posted), false);
    // fully covered → no point, and the cover is named
    await page.evaluate(() => { document.getElementById('sheet').style.display = 'block'; document.getElementById('hidden').style.zIndex = '-1'; });
    const none = await page.locator('#hidden').evaluate(hitPoint);
    assert.equal(none.x, null);
    assert.match(none.coveredBy, /sheet/);
  } finally { await browser.close(); }
});
