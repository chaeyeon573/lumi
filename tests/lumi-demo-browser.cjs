require('fs').mkdirSync(process.env.LUMI_SCREENSHOT_DIR || '/tmp/lumi-review', {
  recursive: true,
});
const base = process.env.LUMI_TEST_URL || 'http://127.0.0.1:8091';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw new Error('Use a local mock-mode test server.');
const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const text = (x) => page.getByText(x, { exact: true }).first();
  const shot = async (name) => {
    await page.waitForTimeout(350);
    await page.screenshot({
      path:
        (process.env.LUMI_SCREENSHOT_DIR || '/tmp/lumi-review') +
        '/' +
        name +
        '.png',
    });
    console.log('SCREEN', name);
  };
  await page.goto(base, { waitUntil: 'networkidle' });
  await text('Explore demo · sample data').click();
  await text("What's happening\non campus?").waitFor({ timeout: 30000 });
  await shot('18-home-demo-390');
  console.log('TAB LABELS', await page.getByRole('tab').allTextContents());
  const saved = await page.evaluate(() => ({
    keys: Object.keys(localStorage),
    items: Object.fromEntries(
      Object.keys(localStorage)
        .filter((k) => k.includes('lumi.'))
        .map((k) => [k, localStorage.getItem(k)]),
    ),
  }));
  console.log('LOCAL KEYS', saved.keys);
  for (const [path, name, expected] of [
    ['/explore?category=Events', '19-explore-events-demo', 'Explore'],
    [
      '/explore?category=Opportunities',
      '20-explore-opportunities-demo',
      'Explore',
    ],
    ['/explore?category=Clubs', '21-explore-clubs-demo', 'Explore'],
    ['/social', '22-social-for-you-demo', 'Social'],
    ['/social?section=meetups', '23-social-meetups-demo', 'Better together'],
    ['/social?section=people', '24-social-people-demo', 'Ask Network'],
    ['/social?section=feed', '25-social-feed-demo', 'Social'],
    ['/schedule', '26-schedule-demo', 'Schedule'],
    ['/me', '27-profile-demo', 'Get to know me'],
    ['/profile/prompts', '28-prompts', 'Get to know me'],
    ['/settings/privacy', '29-settings-privacy', 'Visibility settings'],
  ]) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await text(expected).waitFor({ timeout: 20000 });
    await shot(name + '-390');
  }
  const demoKey = Object.keys(saved.items).find((k) => k.includes('demo.v1'));
  assert(demoKey);
  const db = JSON.parse(saved.items[demoKey]);
  const other = db.users.find((u) => u.id !== 'u_me');
  await page.goto(base + '/users/' + other.id, { waitUntil: 'networkidle' });
  await text(other.nickname).waitFor();
  await shot('30-visitor-profile-demo-390');
  const opportunity = db.opportunities.find(
    (o) =>
      o.sourceUrl.startsWith('https://') &&
      (!o.deadline ||
        o.deadline.slice(0, 10) >= new Date().toISOString().slice(0, 10)),
  );
  if (opportunity) {
    await page.goto(base + '/opportunities/' + opportunity.id, {
      waitUntil: 'networkidle',
    });
    await text(opportunity.title).waitFor();
    await shot('31-opportunity-detail-demo-390');
  }
  const activity = db.activities.find((a) => a.visibility === 'public');
  if (activity) {
    await page.goto(base + '/activities/' + activity.id, {
      waitUntil: 'networkidle',
    });
    await text(activity.title).waitFor();
    await shot('32-meetup-detail-demo-390');
  }
  for (const width of [375, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/', '/social?section=people', '/schedule', '/me']) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        'horizontal overflow ' + path + ' at ' + width,
      );
      await shot(
        'responsive-' +
          (path === '/'
            ? 'home'
            : path.includes('social')
              ? 'people'
              : path.slice(1)) +
          '-' +
          width,
      );
    }
  }
  // QA-only opt-in demo fixture: public sample content with no other social users.
  await page.setViewportSize({ width: 390, height: 844 });
  const zero = {
    ...db,
    users: db.users.filter((u) => u.id === 'u_me'),
    activities: [],
    posts: [],
    participations: [],
    proposals: [],
    chatRooms: [],
    notifications: [],
    relationships: {
      likes: [],
      follows: [],
      friendRequests: [],
      friends: [],
      blocks: [],
    },
    organizations: db.organizations.map((o) => ({
      ...o,
      memberIds: [],
      adminIds: [],
      followerIds: [],
      applicantIds: [],
    })),
  };
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: demoKey,
    value: JSON.stringify(zero),
  });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await shot('33-home-content-no-social-demo-390');
  console.log('ERRORS', errors);
  assert.equal(errors.length, 0);
  await browser.close();
})();
