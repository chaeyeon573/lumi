import { test } from 'node:test';
import assert from 'node:assert/strict';
import { socialLinks, engageLinks, campusGroupsWebsite, pennClubToOrg, COUNCIL_RE, notCouncil, studentGovToOrg } from './sources/orglinks';

test('engageLinks: real Notre Dame socialMedia shape → labeled links, empties dropped', () => {
  const l = engageLinks({ ExternalWebsite: 'https://asce.nd.edu/', InstagramUrl: 'https://www.instagram.com/notredame_asce/', FacebookUrl: 'https://www.facebook.com/NotreDameASCE', LinkedInUrl: '', TwitterUrl: null, YoutubeUrl: '' });
  assert.deepEqual(l.map((x) => x.label), ['Website', 'Instagram', 'Facebook']);
});

test('socialLinks: adds https, rejects wrong-site values and "Hidden"', () => {
  const l = socialLinks({ website: 'asce.nd.edu', instagram: 'https://facebook.com/oops', facebook: 'Hidden' });
  assert.deepEqual(l, [{ label: 'Website', url: 'https://asce.nd.edu/' }]);
});

test('campusGroupsWebsite: first outside link, not the directory itself', () => {
  const html = '<a href="https://engage.mit.edu/ASAP/">x</a><a href="http://skiing.mit.edu/">y</a>';
  assert.equal(campusGroupsWebsite(html, 'https://engage.mit.edu'), 'http://skiing.mit.edu/');
  assert.equal(campusGroupsWebsite('<a href="https://engage.mit.edu/ADC/">x</a>', 'https://engage.mit.edu'), undefined);
});

test('pennClubToOrg: Penn Clubs record → club with directory + Instagram', () => {
  const o = pennClubToOrg({ code: 'future-black-men-in-white-coats', name: 'Future Black Men in White Coats at Penn', description: '<p>Healthcare club</p>', tags: [{ name: 'Cultural' }], instagram: 'https://instagram.com/Upenn_fbmwc/' });
  assert.equal(o.type, 'club');
  assert.equal(o.schoolId, 's_upenn');
  assert.equal(o.description, 'Healthcare club');
  assert.deepEqual(o.links?.map((l) => l.label), ['Penn Clubs', 'Instagram']);
  assert.equal(pennClubToOrg({ code: 'ua', name: 'Undergraduate Assembly (UA)' }).type, 'council');
});

test('council: student government yes; COSO group type and grad department associations no', () => {
  assert.ok(COUNCIL_RE.test('Student Government / Senate'));
  assert.ok(COUNCIL_RE.test('Graduate Student Government'));
  assert.ok(!COUNCIL_RE.test('Anthropology Graduate Student Association'));
  assert.ok(!COUNCIL_RE.test(notCouncil('Council on Student Organizations Pre-Professional Arab Student Association')));
});

test('studentGovToOrg: verified council with official links', () => {
  const o = studentGovToOrg({ school_id: 's_dartmouth', name: 'Dartmouth Student Government', website: 'https://sg.dartmouth.edu/', instagram: 'http://instagram.com/dartmouthstudentgovernment' });
  assert.equal(o.type, 'council'); assert.equal(o.verified, true);
  assert.deepEqual(o.links?.map((l) => l.label), ['Website', 'Instagram']);
});

test('parseFacetWpCards: UC Santa Cruz Get Involved cards (real page excerpt)', async () => {
  const { readFileSync } = await import('node:fs');
  const { parseFacetWpCards, facetCardToOrg } = await import('./sources/orglinks');
  const cards = parseFacetWpCards(readFileSync(new URL('./fixtures/ucsc-getinvolved.html', import.meta.url), 'utf8'));
  assert.deepEqual(cards.map((c) => c.name), ['8th Rank Society', 'Asian American Christian Fellowship (AACF)', 'Emergency Medical Slugs (EMS)']);
  const aacf = cards[1];
  assert.match(aacf.description, /Christian fellowship at UC Santa Cruz/);
  assert.deepEqual(aacf.links, [{ label: 'Instagram', url: 'https://www.instagram.com/aacfucsc/' }]);
  const o = facetCardToOrg(aacf, 's_ucsc', 'https://getinvolved.ucsc.edu/student-organizations/join/');
  assert.equal(o.type, 'club'); assert.equal(o.schoolId, 's_ucsc'); assert.equal(o.links?.[0].label, 'Directory');
});

test('parseAccordionDirectory: Santa Clara RSO directory (real page excerpt)', async () => {
  const { readFileSync } = await import('node:fs');
  const { parseAccordionDirectory, namedOrgToOrg } = await import('./sources/orglinks');
  const list = parseAccordionDirectory(readFileSync(new URL('./fixtures/scu-rso-directory.html', import.meta.url), 'utf8'));
  assert.equal(list.length, 48);
  assert.deepEqual(list[0], { name: 'Alliance of Latin Americans en Salud', category: 'Academic & Professional' });
  const akp = list.find((x) => x.name.startsWith('Alpha Kappa Psi'))!;
  assert.equal(akp.category, 'Business');
  assert.equal(namedOrgToOrg(akp, 's_scu', 'https://www.scu.edu/csi/organizations/directory/').type, 'greek');
  assert.equal(namedOrgToOrg({ name: 'Mock Trial Team', category: 'Academic & Professional' }, 's_scu', 'x').type, 'club');
});

test('parseDrupalAccordionCards: USF undergraduate org page (real excerpt)', async () => {
  const { readFileSync } = await import('node:fs');
  const { parseDrupalAccordionCards } = await import('./sources/orglinks');
  const cards = parseDrupalAccordionCards(readFileSync(new URL('./fixtures/usf-orgs.html', import.meta.url), 'utf8'), 'Academic, Honorary & Professional');
  assert.equal(cards.length, 3);
  assert.equal(cards[0].name, 'Alpha Sigma Nu (ASN)');
  assert.match(cards[0].description, /Jesuit Honors Society/);
  assert.deepEqual(cards[0].links, [{ label: 'Website', url: 'https://www.alphasigmanu.org/' }, { label: 'Instagram', url: 'https://www.instagram.com/asn.usfca/' }]);
});

test('school list names decode HTML codes (USF, UCSC, SCU pages)', async () => {
  const { parseAccordionDirectory } = await import('./sources/orglinks');
  const html = '<div id="d.en.1" class="default-accordion"><h2>Cultural</h2><div id="accordion-panel-1" class="collapse"><p>Ballet Folkl&oacute;rico de SCU<br />Hui O Hawai&#039;i<br />Game Design &#038; Art Collaborations<br />ACM &#8211; Women</p></div></div>';
  assert.deepEqual(parseAccordionDirectory(html).map((x) => x.name), ['Ballet Folklórico de SCU', "Hui O Hawai'i", 'Game Design & Art Collaborations', 'ACM – Women']);
});

test('uclaOrgToOrg: UCLA SOLE search rows (real excerpt) → club/greek with site and socials', async () => {
  const { readFileSync } = await import('node:fs');
  const { uclaOrgToOrg } = await import('./sources/orglinks');
  const rows = JSON.parse(readFileSync(new URL('./fixtures/ucla-rco.json', import.meta.url), 'utf8')).orgList;
  const baja = uclaOrgToOrg(rows.find((r: { OrganizationID: number }) => r.OrganizationID === 34));
  assert.equal(baja.type, 'club'); assert.equal(baja.schoolId, 's_ucla');
  assert.deepEqual(baja.links?.map((l) => l.label), ['Directory', 'Website', 'Instagram', 'LinkedIn', 'YouTube']);
  assert.equal(uclaOrgToOrg(rows.find((r: { OrganizationID: number }) => r.OrganizationID === 3)).type, 'greek');
});

test('pennRecruitment: open membership, deadline from the public application, cycle, closed', async () => {
  const { pennRecruitment } = await import('./sources/orglinks');
  const now = new Date('2026-11-02T00:00:00Z');
  assert.equal(pennRecruitment({ code: 'a', name: 'A', application_required: 1, accepting_members: true }, now)?.mode, 'rolling');
  const d = pennRecruitment({ code: 'b', name: 'B', application_required: 4, recruiting_cycle: 2, applications: [{ application_end_time: '2026-11-15T23:59:00-05:00' }, { application_end_time: '2026-09-01T00:00:00Z' }] }, now);
  assert.deepEqual([d?.mode, d?.deadline, d?.how], ['deadline', '2026-11-15', 'Application']);
  const c = pennRecruitment({ code: 'c', name: 'C', application_required: 3, recruiting_cycle: 3, applications: [] }, now);
  assert.deepEqual([c?.mode, c?.period, c?.how], ['cycle', 'Spring', 'Audition']);
  assert.equal(pennRecruitment({ code: 'd', name: 'D', accepting_members: false }, now)?.mode, 'closed');
});

test('recruitmentLabel: readable one-liners', async () => {
  const { recruitmentLabel } = await import('@core/lib/orglinks');
  assert.deepEqual(recruitmentLabel({ title: '', period: '', open: true, mode: 'deadline', deadline: '2026-11-15', how: 'Application' }, '2026-11-02'), { text: 'Apply by Nov 15 · Application', open: true });
  assert.deepEqual(recruitmentLabel({ title: '', period: '', open: true, mode: 'deadline', deadline: '2026-10-01' }, '2026-11-02'), { text: 'Applications closed', open: false });
  assert.equal(recruitmentLabel({ title: '', period: 'Fall', open: false, mode: 'cycle' })?.text, 'Recruits in Fall');
});

test('Caltech SFE club list: approved-club names only, no page text', async () => {
  const { readFileSync } = await import('node:fs');
  const { parseAccordionDirectory, namedOrgToOrg } = await import('./sources/orglinks');
  const list = parseAccordionDirectory(readFileSync(new URL('./fixtures/caltech-clubs.html', import.meta.url), 'utf8'));
  assert.equal(list.length, 124);
  assert.equal(list[0].name, 'ACEing Autism');
  assert.ok(!list.some((x) => /Help Desk|reimbursement|Financial Hub/.test(x.name)));
  const orgs = list.map((x) => namedOrgToOrg(x, 's_caltech', 'https://sfe.caltech.edu/student-engagement/clubs'));
  assert.equal(orgs.find((o) => o.name.startsWith('Organization of Associated Students'))?.type, 'club');
});

test('Brown Student Activities list + club page social block', async () => {
  const { readFileSync } = await import('node:fs');
  const { parseBrownDsf, parseBrownOrgLinks, brownRowToOrg } = await import('./sources/orglinks');
  const rows = parseBrownDsf(readFileSync(new URL('./fixtures/brown-dsf.html', import.meta.url), 'utf8'));
  assert.ok(rows.length >= 400, String(rows.length));
  const r = rows.find((x) => x.name === '180 Degrees at Brown University')!;
  assert.equal(r.category, 'Service'); assert.equal(r.path, '/organizations/180-degrees-brown-university');
  assert.match(r.description, /consultancy for non-profits/);
  const links = parseBrownOrgLinks(readFileSync(new URL('./fixtures/brown-org.html', import.meta.url), 'utf8'));
  assert.deepEqual(links, [{ label: 'Instagram', url: 'https://instagram.com/brown180dc' }]);
  const o = brownRowToOrg(r, links, 's_brown', 'https://studentactivities.brown.edu');
  assert.equal(o.type, 'club'); assert.equal(o.links?.[0]?.url, 'https://studentactivities.brown.edu/organizations/180-degrees-brown-university');
  assert.ok(rows.filter((x) => x.category === 'Student Governance').every((x) => brownRowToOrg(x, [], 's_brown', '').type === 'council'));
});

test('isOfficeOrg: school offices are not clubs; student groups filed under Department stay clubs', async () => {
  const { isOfficeOrg } = await import('./sources/orglinks');
  for (const [n, c] of [['Orientation & Student Experience', 'University Department'], ['Pava Center for Entrepreneurship', 'PRIMARY: University/Academic Department (non student org)'], ['Center for Career Development', 'Department'], ['Ackland Art Museum', 'University Department'], ['Academic Success and Writing Center', 'Department Office/Department Initiative'], ['Leaning In', 'Staff-Only Social Group'], ['Alumni Affairs at UC Santa Barbara', 'Department'], ['Data Intensive Social Science Center', 'Administrative']])
    assert.equal(isOfficeOrg(n, c), true, n);
  for (const [n, c] of [['Amateur Radio Club at UCSB', 'Department'], ['Amaranth Literary Magazine', 'Department Office/Department Initiative'], ['Bears Bikes', 'University Department'], ['Atlantic Hope @ Cornell', 'Department'], ['Graduate Student Council', 'University Department'], ['Chess Club', 'Department Sponsored Student Organization'], ['Robotics Team', 'Academic'], ['Yale Black Seminarians', 'Administrative'], ['SWANA-Y: Southwest Asia and North Africa at Yale', "Yale College Dean's Office Administration"]])
    assert.equal(isOfficeOrg(n, c), false, n);
});
