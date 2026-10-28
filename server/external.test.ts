/**
 * 자동으로 가져온 공고(Devpost 등) — 이미 다른 출처에 같은 제목이 있으면 두 번 보이지 않게 뺀다.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeJobs, dropDuplicateTitles, isChallengePage, isInternTitle, youthOnly } from './sources/external';

test('imported items that repeat a curated title are dropped; their own earlier copies are not counted', () => {
  const existing = [
    { id: 'op_nat_technica', title: 'Technica 2026' },
    { id: 'op_ext_devpost_1', title: 'Old Devpost Hack' },
  ];
  const fetched = [
    { id: 'op_ext_devpost_2', title: 'technica 2026' },
    { id: 'op_ext_devpost_1', title: 'Old Devpost Hack' },
    { id: 'op_ext_devpost_3', title: 'Brand New Hack' },
  ];
  assert.deepEqual(dropDuplicateTitles(fetched, existing, 'op_ext_devpost_').map((o) => o.id), ['op_ext_devpost_1', 'op_ext_devpost_3']);
});

test('CalLink (Engage) events co-hosted by two orgs come once', async () => {
  const { fetchEngageEvents } = await import('./sources/opportunities');
  const soon = new Date(Date.now() + 86_400_000).toISOString();
  const ev = (id: string, org: string) => ({ id, name: 'Real Talk Buddies Kick-Off', organizationName: org, location: 'Mulford Hall', startsOn: soon, endsOn: soon, benefitNames: ['Free Food'] });
  const real = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ value: [ev('1', 'Real Talk Buddies'), ev('2', 'ASUC'), { ...ev('3', 'X'), name: 'Other event' }] }))) as typeof fetch;
  try {
    const out = await fetchEngageEvents('https://callink.berkeley.edu', { id: 's_berkeley', center: { lat: 0, lng: 0 } });
    assert.deepEqual(out.map((o) => o.title).sort(), ['Other event', 'Real Talk Buddies Kick-Off']);
  } finally { globalThis.fetch = real; }
});

test('hackathons whose page says high school only (ages up to 18) are recognised; college-eligible ones are not', () => {
  const page = (items: string) => `<html><script>var x = "Who can participate";</script><h2>Who can participate</h2><ul>${items}</ul><a href="/rules">View full rules</a><p>Ages 10 to 12 workshop later</p></html>`;
  // Girls Who Code HHS Hackathon 2026 — 실제 페이지 문구
  assert.equal(youthOnly(page('<li>Ages 14 to 18 only</li><li>Students only</li><li>All countries/territories, excluding standard exceptions</li>')), true);
  assert.equal(youthOnly(page('<li>High school students only</li>')), true);
  assert.equal(youthOnly(page('<li>Ages 18+ only</li><li>Students only</li>')), false);
  assert.equal(youthOnly(page('<li>Ages 13+ only</li>')), false);
  assert.equal(youthOnly(page('<li>Ages 16 to 24 only</li>')), false);
  assert.equal(youthOnly(page('<li>High school and college students</li>')), false);
  assert.equal(youthOnly('<html>Just a moment...</html>'), false);
});

test('internship titles: interns and student co-ops in; staff jobs that mention a housing co-op out', () => {
  for (const t of ['Software Engineering Intern - Summer 2027', 'Winter 2027 Propulsion Engineer Co-op', 'Firmware Engineer Co-Op', 'Summer Analyst', 'PhD Machine Learning Software Engineer Intern (Summer 2027)']) assert.ok(isInternTitle(t), t);
  for (const t of ['Staff Credit Policy Analyst – Condo, Co-op & Project Review', 'Senior Manager, Co-op Programs', 'Internal Tools Engineer', 'High School Intern Program']) assert.ok(!isInternTitle(t), t);
});

test('one company posting the same internship title in the same city several times shows once', () => {
  const j = (title: string, location: string, host = 'Samsara') => ({ host, title, location });
  const out = dedupeJobs([j('ADR Intern - Phoenix', 'Phoenix, AZ'), j('ADR Intern - Phoenix', 'Phoenix, AZ'), j('ADR Intern - Phoenix ', 'phoenix, az'), j('ADR Intern - Atlanta', 'Atlanta, GA'), j('ADR Intern - Phoenix', 'Phoenix, AZ', 'Other Co')]);
  assert.equal(out.length, 3);
});

test('a Cloudflare check page stops the youth check for this run; an ordinary page without the box does not', () => {
  assert.ok(isChallengePage('<title>Just a moment...</title><script src="/cdn-cgi/challenge-platform/h/b"></script>'));
  assert.ok(!isChallengePage('<html><h1>My Hackathon</h1><p>Prizes</p></html>'));
});
