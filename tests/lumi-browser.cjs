require('fs').mkdirSync(process.env.LUMI_SCREENSHOT_DIR || '/tmp/lumi-review', {
  recursive: true,
});
const base = process.env.LUMI_TEST_URL || 'http://127.0.0.1:8091';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw new Error('Use a local mock-mode test server.');
const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');
const out = process.env.LUMI_SCREENSHOT_DIR || '/tmp/lumi-review';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (name) => {
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log('SCREEN', name);
  };
  const text = (value) => page.getByText(value, { exact: true }).first();
  await page.goto(base, { waitUntil: 'networkidle' });
  await text('Get started').waitFor({ timeout: 30000 });
  await shot('01-welcome-390');
  await text('Get started').click();
  await text('What would you like to do?').waitFor();
  await shot('02-goals-390');
  await text('Plan my classes').click();
  await text('Continue').click();
  await text('What Lumi can do').waitFor();
  await shot('03-preview-schedule-390');
  for (const [label, key] of [
    ['Events & Opportunities', 'events'],
    ['Clubs & Groups', 'clubs'],
    ['Social', 'social'],
  ]) {
    await text(label).click();
    await shot('03-preview-' + key + '-390');
  }
  await text('Continue').click();
  await text('Your university').waitFor();
  await page.getByLabel('Search universities').fill('Berkeley');
  await text('UC Berkeley').click();
  await text('Graduate').click();
  await shot('04-university-graduate-390');
  await text('Undergraduate').click();
  await text('2nd').click();
  await text('Continue').click();
  await text('Make it yours').waitFor();
  await shot('05-interests-390');
  await text('Skip').click();
  await text('Your communities').waitFor();
  await shot('06-communities-390');
  await text('Skip').click();
  await text('A little about you').waitFor();
  await page.getByLabel('Your name', { exact: true }).fill('Review account');
  await page.getByLabel('Birth year', { exact: true }).fill('2004');
  await page
    .getByLabel('School email', { exact: true })
    .fill('review@berkeley.edu');
  await text('Send code').click();
  await page.getByLabel('Verification code').fill('123456');
  await text('Verify email').click();
  await text('Email verified').waitFor();
  await shot('07-account-390');
  await text('Get Started').click();
  await text("What's happening\non campus?").waitFor({ timeout: 30000 });
  await shot('08-home-empty-390');
  for (const [path, name, expected] of [
    ['/explore', '09-explore-events-empty', 'Explore'],
    ['/social', '10-social-for-you-empty', 'Social'],
    [
      '/social?section=meetups',
      '11-social-meetups-empty',
      'Make the first plan',
    ],
    [
      '/social?section=people',
      '12-social-people-empty',
      'Good company starts somewhere',
    ],
    ['/social?section=feed', '13-social-feed-empty', 'Be the first to share'],
    ['/schedule', '14-schedule-empty', 'Schedule'],
    ['/me', '15-profile-empty', 'Review account'],
    ['/profile/discovery', '16-privacy', 'Discovery & privacy'],
    [
      '/meet/create?category=study',
      '17-meetup-create',
      'Student status (optional)',
    ],
  ]) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await text(expected).waitFor({ timeout: 20000 });
    await shot(name + '-390');
  }
  console.log('ERRORS', JSON.stringify(errors));
  assert.equal(errors.length, 0);
  await browser.close();
})();
