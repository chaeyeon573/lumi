import { test } from 'node:test';
import assert from 'node:assert/strict';
import { socialLinks, engageLinks, campusGroupsWebsite, pennClubToOrg, COUNCIL_RE, notCouncil, isCouncil, GOV_GROUP_TYPE_RE, studentGovToOrg } from './sources/orglinks';

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
  for (const [n, c] of [['Clairmont Tower', 'Residence Hall'], ['Berkeley College', 'Residence Halls'], ['University Health Services', 'Health/Wellness'], ['University Career Center', ''], ['Neal-Marshall Black Culture Center', 'University Department'], ['Muscarelle Museum of Art', 'Campus Offices/Departments'], ['Grainger Electrical & Computer Engineering', 'Grainger Departments & Programs'], ['Orientation & Student Experience', 'University Department'], ['Pava Center for Entrepreneurship', 'PRIMARY: University/Academic Department (non student org)'], ['Center for Career Development', 'Department'], ['Ackland Art Museum', 'University Department'], ['Academic Success and Writing Center', 'Department Office/Department Initiative'], ['Leaning In', 'Staff-Only Social Group'], ['Alumni Affairs at UC Santa Barbara', 'Department'], ['Data Intensive Social Science Center', 'Administrative'], ['Group Conduct', 'Admin Group'], ['Carey Business School', 'Group Management'], ['Department of Environmental Safety, Sustainability and Risk-Office of Risk Management', undefined], ['Office of Study Abroad', undefined], ['Center for Student Support and Care', undefined], ['Emory Bookstore', 'University Department'], ['University of Texas at Austin Police Department (UTPD)', undefined], ['YDS Registrar\'s Office', 'Academic'], ['Transportation Services (DOTS)', undefined], ['School of Social Work', undefined]])
    assert.equal(isOfficeOrg(n as string, c), true, n);
  for (const [n, c] of [['University Activities Center', 'Programming'], ['American Institute of Chemical Engineers', 'Academic Department'], ['Amateur Radio Club at UCSB', 'Department'], ['Amaranth Literary Magazine', 'Department Office/Department Initiative'], ['Bears Bikes', 'University Department'], ['Atlantic Hope @ Cornell', 'Department'], ['Graduate Student Council', 'University Department'], ['Chess Club', 'Department Sponsored Student Organization'], ['Robotics Team', 'Academic'], ['Yale Black Seminarians', 'Administrative'], ['SWANA-Y: Southwest Asia and North Africa at Yale', "Yale College Dean's Office Administration"], ['Department of Biostatistics & Bioinformatics Student Association', undefined], ['Bookstore Basketball Commission, University of Notre Dame', undefined], ['College of Pharmacy Graduate Student Organization', undefined], ['College of Liberal Arts Student Board #214', undefined], ['School of Medicine: Class of 2027', undefined], ['School of Public Health Foodies', undefined], ['College of Pharmacy Student Ambassadors', undefined]])
    assert.equal(isOfficeOrg(n as string, c), false, n);
});

test('descriptionLinks: real URLs in a club description become links; forms, mail, handles skipped', async () => {
  const { descriptionLinks } = await import('./sources/orglinks');
  assert.deepEqual(descriptionLinks('Follow us at https://www.instagram.com/apowashu/ and see https://apo.wustl.edu. Join: https://forms.gle/abc @apowashu wustlapo@gmail.com'), [
    { label: 'Website', url: 'https://apo.wustl.edu/' }, { label: 'Instagram', url: 'https://www.instagram.com/apowashu/' },
  ]);
  assert.deepEqual(descriptionLinks('Find us @ability_washu'), []);
  assert.deepEqual(descriptionLinks('Apply: https://aiesecusa.typeform.com/to/d6WPTvHI'), []); // Northwestern AIESEC sign-up form
  assert.deepEqual(descriptionLinks('Join our group chat: https://chat.whatsapp.com/FXFNi0UhHDN1guJjTQE7cO'), []); // Columbia Q&A
  assert.deepEqual(descriptionLinks('<a href=&#34http://www.instagram.com/wustlumang/&#34>IG</a>'), [{ label: 'Instagram', url: 'http://www.instagram.com/wustlumang/' }]);
});

test('isCouncil: belonging to a council or being recognized by student government is not being one (Vanderbilt, CMU, Lehigh 2026-11-03)', () => {
  // real category lists from the public directories
  assert.equal(isCouncil('Mexican American Student Association', ['Multicultural Leadership Council ', 'Advised by Student Center for Belonging and Communities'], 's_vanderbilt'), false);
  assert.equal(isCouncil('Methodist Student Association', ['Interfaith Council Organizations'], 's_vanderbilt'), false);
  assert.equal(isCouncil('ACM@CMU', ['Student Government Recognized Organizations', 'Professional/Academic'], 's_cmu'), false);
  assert.equal(isCouncil('African Students Association', ['Student Senate Recognized Organization', 'Cultural'], 's_lehigh'), false);
  assert.equal(isCouncil('History Undergraduate Association', ['Academic and Pre-Professional'], 's_umd'), false);
  assert.equal(isCouncil('Vanderbilt Bar Association', ['Governing Councils'], 's_vanderbilt'), true);
  assert.equal(isCouncil('Vanderbilt Student Government', [], 's_vanderbilt'), true);
  assert.equal(isCouncil('Harvard Undergraduate Association', [], 's_harvard'), true);
  assert.equal(isCouncil('Area Councils', ['Government/Council'], 's_northwestern'), true);
  assert.equal(isCouncil('Model United Nations Club', ['Cultural', 'Governance', 'Special Interest'], 's_syracuse'), false); // Syracuse 'Governance' is a topic
  assert.equal(isCouncil('Brown Undergraduate Council', ['Student Governance'], 's_brown'), true);
});

test('GOV_GROUP_TYPE_RE: CampusGroups group type that is itself government vs a registration path', () => {
  assert.equal(GOV_GROUP_TYPE_RE.test('Divisional Council'), true); // Emory graduate school governments
  assert.equal(GOV_GROUP_TYPE_RE.test('Student Government'), true); // Duke
  assert.equal(GOV_GROUP_TYPE_RE.test('Class Councils'), true); // Dartmouth Class of 20xx
  assert.equal(GOV_GROUP_TYPE_RE.test('Homewood: Student Government Association'), false); // JHU clubs registered with SGA
  assert.equal(GOV_GROUP_TYPE_RE.test('Student Government Recognized Organizations'), false); // CMU
});

test('isLoginOnlyLink: course sites (Canvas, Blackboard, Brightspace) need a school login (Emory club link 2026-11-04)', async () => {
  const { isLoginOnlyLink } = await import('@core/lib/orglinks');
  assert.equal(isLoginOnlyLink('https://canvas.emory.edu/courses/124290'), true);
  assert.equal(isLoginOnlyLink('https://emory.instructure.com/courses/1'), true);
  assert.equal(isLoginOnlyLink('https://bupls.com/'), false);
  assert.equal(isLoginOnlyLink('https://canvasclub.org/'), false);
});

test('cleanCollectedOrgs: emoji, double-encoded entities, link spaces; placeholder test clubs recognised', async () => {
  const { cleanCollectedOrgs, isPlaceholderOrg } = await import('./sources/orglinks');
  const list = [
    { id: 'a', name: 'Strawberries &amp; Sudoku at UW', description: 'Puzzles &amp; fruit', links: [{ label: 'Facebook', url: 'https://www.facebook.com/AlphaChiUGA ' }] },
    { id: 'b', name: 'The AgriBusiness Club 🌱', description: 'Two  spaces stay', links: [{ label: 'Facebook', url: 'https://www.facebook.com/Alpha Omicron Pi - SJSU' }, { label: 'Instagram', url: 'https://instagram.com/aoii' }] },
    { id: 'c', name: 'Plain  Club', description: 'Nothing  to do', links: [] },
  ] as never;
  const { orgs, badLinks } = cleanCollectedOrgs(list, '2026-11-05');
  assert.equal(orgs[0].name, 'Strawberries & Sudoku at UW');
  assert.equal(orgs[0].description, 'Puzzles & fruit');
  assert.equal(orgs[0].links![0].url, 'https://www.facebook.com/AlphaChiUGA');
  assert.equal(orgs[1].name, 'The AgriBusiness Club');
  assert.equal(orgs[1].description, 'Two  spaces stay');
  assert.deepEqual(orgs[1].links, [{ label: 'Instagram', url: 'https://instagram.com/aoii' }]);
  assert.equal(badLinks.length, 1);
  assert.equal(orgs[2], list[2]);
  for (const n of ['Test Club', 'Test Club 2', 'Test Org One', 'Test Organization', 'Test CIO', 'Test CLP (#0001)', 'Test Test Test', 'Test Group']) assert.ok(isPlaceholderOrg(n), n);
  for (const n of ['Testing Center', 'Test Prep Club', 'TestBed Robotics', 'Contest Club']) assert.ok(!isPlaceholderOrg(n), n);
});

test('cleanCollectedOrgs: a website shared by 10+ clubs is a school page, not theirs; HTML tags leave descriptions', async () => {
  const { cleanCollectedOrgs } = await import('./sources/orglinks');
  const list = Array.from({ length: 52 }, (_, i) => ({ id: `o${i}`, name: `Club ${i}`, description: i === 0 ? 'Graduate Business Association<strong>Mission Statement</strong><p>We meet</p>' : 'x', links: [{ label: 'Directory', url: 'https://umn.campusgroups.com/x' }, { label: 'Website', url: 'https://student.sua.umn.edu/' }, ...(i === 1 ? [{ label: 'Instagram', url: 'https://instagram.com/club1' }] : [])] })) as never;
  const { orgs, badLinks } = cleanCollectedOrgs(list, '2026-11-05');
  assert.equal(badLinks.length, 52);
  assert.deepEqual(orgs[1].links!.map((l: { label: string }) => l.label), ['Directory', 'Instagram']);
  assert.equal(orgs[0].description, 'Graduate Business Association Mission Statement We meet');
});

test('publicFix / cleanCollectedOrgs: login-redirect social links point at the real profile; admin and editor links are set aside', async () => {
  const { publicFix, cleanCollectedOrgs } = await import('./sources/orglinks');
  assert.equal(publicFix('https://www.instagram.com/accounts/login/?next=%2Fshpeuga%2F&source=omni_redirect'), 'https://www.instagram.com/shpeuga/');
  assert.equal(publicFix('https://www.instagram.com/accounts/login/?next=https%3A%2F%2Fwww.instagram.com%2Fgw_rotaract%2F'), 'https://www.instagram.com/gw_rotaract/');
  assert.equal(publicFix('https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fcompany%2Fpsu-black-caucus'), 'https://www.linkedin.com/company/psu-black-caucus');
  assert.equal(publicFix('https://twitter.com/i/flow/login?redirect_after_login=%2Fthaakat'), 'https://www.twitter.com/thaakat');
  assert.equal(publicFix('https://sites.nd.edu/balletclub/wp-admin/'), 'https://sites.nd.edu/balletclub/');
  assert.equal(publicFix('https://www.instagram.com/realclub/'), 'https://www.instagram.com/realclub/');
  const { orgs, badLinks } = cleanCollectedOrgs([
    { id: 'a', name: 'ASA', links: [{ label: 'Directory', url: 'https://x' }, { label: 'Website', url: 'https://manage.wix.com/account/sites' }] },
    { id: 'b', name: 'Swim', links: [{ label: 'Website', url: 'https://sites.google.com/d/1xWxpbzrvAxVt9oASH60Fh9_U7Uqjj25v/p/1O0ScqdGVB3HQaNnhsEMl9wXkOB' }] },
    { id: 'c', name: 'Alpha Phi', links: [{ label: 'Website', url: 'https://sites.google.com/d.umn.edu/plsalphaphi/home?authuser=0' }] },
  ] as never, '2026-11-05');
  assert.deepEqual(orgs[0].links!.map((l: { label: string }) => l.label), ['Directory']);
  assert.equal(orgs[1].links!.length, 0);
  assert.equal(orgs[2].links!.length, 1, 'a domain-named Google Site stays');
  assert.equal(badLinks.length, 2);
});

test('publicFix: tracking tails (fbclid, utm_*, igshid) are removed, other query parts stay', async () => {
  const { publicFix } = await import('./sources/orglinks');
  assert.equal(publicFix('https://linktr.ee/SylvanSnackBar?fbclid=PAZXh0bgNhZW0CMTEAAaa'), 'https://linktr.ee/SylvanSnackBar');
  assert.equal(publicFix('https://www.instagram.com/umass_club/?igshid=abc&utm_source=qr'), 'https://www.instagram.com/umass_club/');
  assert.equal(publicFix('https://example.org/page?id=7&utm_campaign=x'), 'https://example.org/page?id=7');
  assert.equal(publicFix('https://example.org/page?id=7'), 'https://example.org/page?id=7');
});

test('cleanCollectedOrgs: links into a school login portal (Rutgers-Newark raiderlink) are set aside, not kept as the website', async () => {
  const { cleanCollectedOrgs } = await import('./sources/orglinks');
  const org = { id: 'oc_rn_ruff', name: 'RUFF', schoolId: 's_rutgersnewark', type: 'club', links: [{ label: 'Directory', url: 'https://rutgers.campusgroups.com/student_community?club_id=1' }, { label: 'Website', url: 'https://raiderlink.newark.rutgers.edu/RUFF/' }, { label: 'Instagram', url: 'https://www.instagram.com/ruff/' }] } as never;
  const { orgs, badLinks } = cleanCollectedOrgs([org], '2026-11-07');
  assert.deepEqual(orgs[0].links!.map((l) => l.label), ['Directory', 'Instagram']);
  assert.equal(badLinks[0].url, 'https://raiderlink.newark.rutgers.edu/RUFF/');
});

test('cleanCollectedOrgs: retired directory addresses that redirect to a generic page are set aside (clubs.psu.edu, ross.campusgroups.com)', async () => {
  const { cleanCollectedOrgs } = await import('./sources/orglinks');
  const orgs = [
    { id: 'oc_psu_astro', name: 'Astronomy Club', schoolId: 's_psu', type: 'club', links: [{ label: 'Website', url: 'http://www.clubs.psu.edu/up/astro' }, { label: 'Instagram', url: 'https://www.instagram.com/psuastro/' }] },
    { id: 'oc_umich_aaba', name: 'AABA', schoolId: 's_umich', type: 'club', links: [{ label: 'Website', url: 'https://ross.campusgroups.com/AABA/' }] },
  ] as never;
  const r = cleanCollectedOrgs(orgs, '2026-11-07');
  assert.deepEqual(r.orgs[0].links!.map((l) => l.label), ['Instagram']);
  assert.deepEqual(r.orgs[1].links, []);
  assert.equal(r.badLinks.length, 2);
});
