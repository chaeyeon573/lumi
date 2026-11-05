require('fs').mkdirSync(process.env.LUMI_SCREENSHOT_DIR || '/tmp/lumi-review', {
  recursive: true,
});
const base = process.env.LUMI_TEST_URL || 'http://127.0.0.1:8091';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw new Error('Use a local mock-mode test server.');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const b = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const text = (x) => p.getByText(x, { exact: true }).first();
  await p.goto(base, { waitUntil: 'networkidle' });
  await text('Explore demo · sample data').click();
  await text('Campus picks').waitFor();
  const state = await p.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.includes('demo.v1'));
    return { key, db: JSON.parse(localStorage.getItem(key)) };
  });
  await p.goto(base + '/explore?category=Opportunities', {
    waitUntil: 'networkidle',
  });
  const save = p.getByRole('button', { name: 'Save opportunity' }).first();
  await save.click();
  await p.waitForTimeout(900);
  await p.getByRole('button', { name: 'Unsave opportunity' }).first().waitFor();
  await p.goto(base + '/profile/saved-content', { waitUntil: 'networkidle' });
  await p
    .getByRole('button', { name: 'Unsave opportunity' })
    .first()
    .waitFor({ timeout: 20000 });
  await p.screenshot({
    path:
      (process.env.LUMI_SCREENSHOT_DIR || '/tmp/lumi-review') +
      '/34-saved-demo-390.png',
  });
  await p.goto(base + '/schedule', { waitUntil: 'networkidle' });
  await text('Load a sample timetable').click();
  await p.waitForTimeout(1200);
  await p.screenshot({
    path:
      (process.env.LUMI_SCREENSHOT_DIR || '/tmp/lumi-review') +
      '/26-schedule-grid-demo-390.png',
  });
  for (const width of [375, 430]) {
    await p.setViewportSize({ width, height: 844 });
    await p.screenshot({
      path:
        (process.env.LUMI_SCREENSHOT_DIR || '/tmp/lumi-review') +
        '/26-schedule-grid-demo-' +
        width +
        '.png',
    });
  }
  await p.setViewportSize({ width: 390, height: 844 });
  const updated = await p.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    state.key,
  );
  const course = updated.users.find((u) => u.id === 'u_me').timetable[0];
  assert(course);
  await p.goto(base + '/classes/' + encodeURIComponent(course.name), {
    waitUntil: 'networkidle',
  });
  await p.waitForTimeout(500);
  assert((await p.locator('body').innerText()).includes('Study'));
  await p.screenshot({
    path:
      (process.env.LUMI_SCREENSHOT_DIR || '/tmp/lumi-review') +
      '/35-class-detail-demo-390.png',
  });
  await p.goto(base + '/profile/prompts', { waitUntil: 'networkidle' });
  await p
    .getByLabel("I'm always down for…", { exact: true })
    .fill('A coffee after class.');
  await text('Save answers').click();
  await text('Answers saved').waitFor();
  await p.goto(base + '/me', { waitUntil: 'networkidle' });
  await text('A coffee after class.').waitFor();
  await p.screenshot({
    path:
      (process.env.LUMI_SCREENSHOT_DIR || '/tmp/lumi-review') +
      '/36-profile-qa-demo-390.png',
  });
  for (const [path, section] of [
    ['/people', 'people'],
    ['/meet', 'meetups'],
    ['/feed', 'feed'],
  ]) {
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.waitForURL(
      (url) =>
        url.toString().includes('/social') &&
        url.searchParams.get('section') === section,
      { timeout: 15000 },
    );
  }
  console.log(
    'PASS: save persistence, class route, optional Q&A save, old native root redirects',
  );
  assert.equal(errors.length, 0);
  await b.close();
})();
