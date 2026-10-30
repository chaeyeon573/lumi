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

test('Workday postings: link, id and a short “+N more” location; non-tech titles get a real field', async () => {
  const { workdayJob } = await import('./sources/external');
  const { fieldOf } = await import('@core/lib/listings');
  const one = workdayJob({ title: 'Content Research Intern, Spring 2027', externalPath: '/job/Burbank-CA-USA/Content-Research-Intern_10132345', locationsText: 'Burbank, CA, USA', bulletFields: ['10132345'] }, 'disney.wd5.myworkdayjobs.com', 'disneycareer');
  assert.deepEqual([one.id, one.location, one.url], ['10132345', 'Burbank, CA, USA', 'https://disney.wd5.myworkdayjobs.com/en-US/disneycareer/job/Burbank-CA-USA/Content-Research-Intern_10132345']);
  const many = workdayJob({ title: 'Store Executive Intern', externalPath: '/job/x_R1', locationsText: '4 Locations' }, 'target.wd5.myworkdayjobs.com', 'targetcareers', '200 W Orangethorpe Ave, Fullerton, CA 92832-2900, United States of America');
  assert.equal(many.location, 'Fullerton, CA 92832-2900, United States of America (+3 more)');
  assert.equal(fieldOf('Store Executive Intern (Store Leadership Intern)'), 'Business & Marketing');
  assert.equal(fieldOf('Brand Management Intern (MBA - Summer 2027)'), 'Business & Marketing');
  assert.equal(fieldOf('R&D Intern (Summer 2027)'), 'Research & Science');
});

test('OURS scholarship pages: every deadline wording on the site is read in Berkeley time; a month without a day is not', async () => {
  const { oursDeadline, oursPageToOpportunity } = await import('./sources/ours');
  assert.equal(oursDeadline('Next Campus Deadline: Noon, December 14, 2026 UCB recipients!'), '2026-12-14T20:00:00.000Z');
  assert.equal(oursDeadline('Next deadline: January 31, 2027, 9:00 pm – application now open!'), '2027-02-01T05:00:00.000Z');
  assert.equal(oursDeadline('Next campus deadline (for 2027–2028 cohort): November 23, 2026 – 12:00 noon (Pacific) – application'), '2026-11-23T20:00:00.000Z');
  assert.equal(oursDeadline('Campus Deadline: December 9, 2026, Noon, 12:00 p.m. Campus Instructions'), '2026-12-09T20:00:00.000Z');
  assert.equal(oursDeadline('Next Campus Deadline: November 2, 2026 Princeton'), '2026-11-03T07:59:00.000Z');
  assert.equal(oursDeadline('Next Campus Deadline: October 2027 UCB recipients!'), undefined);
  const now = new Date('2026-10-30T09:00:00Z');
  assert.equal(oursPageToOpportunity({ slug: 'guidance', link: 'x', title: 'Guidance', html: 'Next deadline: December 1, 2026' }, now), null, 'help pages are not scholarships');
  assert.equal(oursPageToOpportunity({ slug: 'churchill', link: 'x', title: 'Churchill', html: 'Next Campus Deadline: October 2027' }, now), null, 'no day → not listed');
  const g = oursPageToOpportunity({ slug: 'goldwater', link: 'https://scholarships.berkeley.edu/goldwater/', title: 'Goldwater Scholarship', html: '<p>Next Campus Deadline: Noon, December 14, 2026 UCB recipients! The Barry M. Goldwater Scholarship provides $7,500 per year.</p>' }, now)!;
  assert.equal(g.description, 'The Barry M. Goldwater Scholarship provides $7,500 per year.');
  assert.equal(g.schoolId, 's_berkeley');
});

test('Study Abroad list rows: program + term, the earlier of the two deadlines (Berkeley time), sponsor and eligibility', async () => {
  const { parseStudyAbroadRows } = await import('./sources/studyabroad');
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('./fixtures/studyabroad-rows.html', import.meta.url), 'utf8');
  const rows = parseStudyAbroadRows(html, new Date('2026-10-30T12:00:00Z'));
  assert.equal(rows.length, 3);
  const ba = rows.find((o) => /Buenos Aires/.test(o.title))!;
  assert.equal(ba.title, 'Global Internships: Buenos Aires, Argentina (Summer)');
  assert.equal(ba.host, 'Berkeley Global Internships');
  assert.equal(ba.deadline, '2027-01-14T07:59:00.000Z', '01/13 23:59 PT — the earlier of 01/13 and 01/14');
  assert.equal(ba.sourceUrl, 'https://studyabroad.berkeley.edu/program/globalinternships/buenos-aires');
  assert.match(ba.eligibility, /Soph, Jr, Sr · GPA \+2\.0/);
  assert.match(ba.description, /Buenos Aires · Central & South America · Taught in English · Applications open 12\/1\/2026/);
  assert.equal(ba.type, 'exchange');
  assert.equal(parseStudyAbroadRows(html, new Date('2027-02-01T00:00:00Z')).length, 0, 'past deadlines are dropped');
});

test('OURS import never shows a scholarship twice: adopts moved Berkeley rows, leaves national-CSV ones alone', async () => {
  const { mergeWithExisting } = await import('./sources/ours');
  const mk = (slug: string) => ({ id: `op_ours_${slug}`, sourceUrl: `https://scholarships.berkeley.edu/${slug}/` }) as never;
  const out = mergeWithExisting([mk('goldwater'), mk('cbyx'), mk('hollings-scholarship'), mk('luce')], [
    { id: 'op_berkeley_barry_goldwater_scholarship_berkeley_campus_nomination', sourceUrl: 'https://scholarships.berkeley.edu/goldwater/' },
    { id: 'op_all_congress_bundestag_youth_exchange', sourceUrl: 'https://scholarships.berkeley.edu/cbyx/' },
  ]);
  assert.deepEqual(out.map((o: { id: string }) => o.id), ['op_berkeley_barry_goldwater_scholarship_berkeley_campus_nomination', 'op_ours_luce']);
});
