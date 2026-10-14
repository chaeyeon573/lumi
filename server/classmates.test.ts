/**
 * 같은 수업 (classmates) — 목록 공개 범위, 보이기 끄기, 차단, 스터디 그룹 짝짓기·제안 한도, 파트너 목록, 공유 링크 미리보기.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '@core/api/types';
import type { Course, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createClassesEngine } from '@core/api/classes';
import { buildClassIndex, classKey, classRoomInfo, classRostersFor, codeFromName, enrollments, nowTermLabel, planStudyGroups } from '@core/lib/classmates';
import { snapshotFor, patchFor } from './view';
import { classMeta, withMeta } from './classes';
import { catalogCourses } from '@core/data/catalog/courses';

const TERM = nowTermLabel();
const KEY = classKey('s_berkeley', 'CS 61A', TERM);
const cs61a = (extra: Partial<Course> = {}): Course[] => [0, 2, 4].map((day) => ({ id: `c61a_${day}`, name: 'CS 61A The Structure and Interpretation of Computer Programs', code: 'CS 61A', term: TERM, day, start: '13:00', end: '14:00', room: 'Wheeler 150', professor: 'John DeNero', hue: 220, ...extra }));
const econ1: Course[] = [{ id: 'econ1', name: 'ECON 1 Introduction to Economics', day: 1, start: '11:00', end: '12:30', room: 'VLSB 2050', hue: 100 }];

function student(id: string, nickname: string, timetable: Course[], extra: Partial<User> = {}): User {
  const base = structuredClone(seed.users.find((u) => u.id === 'u_jimin')!);
  return { ...base, id, nickname, sample: false, timetable, partnerSearch: undefined, showToClassmates: undefined, studyGroupOptOut: undefined, ...extra, affiliation: { ...base.affiliation, schoolId: 's_berkeley', schoolName: 'UC Berkeley' } as User['affiliation'] };
}

/** 시드 + 같은 수업 학생 5명 (u_a ~ u_d 실제 학생, u_s 예시) + 다른 수업만 듣는 u_x */
function db(): Snapshot {
  const d: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: [], activities: seed.activities,
    participations: seed.participations, posts: [], relationships: seed.relationships, proposals: [],
    chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [], timePolls: [], games: [],
  });
  d.users.push(
    student('u_a', 'Ana', [...cs61a({ section: 'DIS 104' }), ...econ1]),
    student('u_b', 'Ben', cs61a({ section: 'DIS 104' })),
    student('u_c', 'Cleo', cs61a({ section: 'DIS 112' })),
    student('u_d', 'Dev', [{ id: 'old', name: 'CS 61A', day: 0, start: '13:00', end: '14:00', hue: 1 }]), // 옛 항목: 코드·학기 없이 이름만
    student('u_s', 'Sample Sam', cs61a(), { sample: true }),
    student('u_x', 'Xena', econ1),
  );
  return d;
}
const engine = (d: Snapshot) => createClassesEngine({ db: d, t, demo: false, push: () => {} }, { catalog: (sid) => catalogCourses.filter((c) => c.schoolId === sid) });

test('course codes come from the catalog code or the start of the name', () => {
  assert.equal(codeFromName('CS 61A The Structure'), 'CS 61A');
  assert.equal(codeFromName('UGBA 102A Accounting'), 'UGBA 102A');
  assert.equal(codeFromName('Public Speaking'), null);
  assert.equal(codeFromName('Lab seminar'), null);
  const d = db();
  assert.deepEqual(enrollments(d.users.find((u) => u.id === 'u_d')!).map((e) => e.key), [KEY], 'legacy entry without code/term = current term');
});

test('membership: only people in the course get its list, and nothing else from timetables', () => {
  const d = db();
  const a = snapshotFor(d, 'u_a');
  const r = a.classRosters!.find((x) => x.id === KEY)!;
  assert.ok(r, 'Ana gets the CS 61A roster');
  // Sample Sam is a sample profile — real accounts never get sample people in a roster or its count (server/samples.ts)
  assert.deepEqual(r.members.map((m) => m.userId).sort(), ['u_b', 'u_c', 'u_d']);
  assert.equal(r.count, 4);
  assert.equal(r.members.find((m) => m.userId === 'u_b')?.section, 'DIS 104', 'section only when the catalog entry has one');
  assert.equal(r.members.find((m) => m.userId === 'u_d')?.section, undefined, 'no invented section');
  // Xena (ECON 1 only) never gets the CS 61A list
  const x = snapshotFor(d, 'u_x');
  assert.ok(!x.classRosters!.some((y) => y.id === KEY));
  // other people's timetables: no course names, rooms or professors — at most busy blocks
  for (const viewer of ['u_a', 'u_x', 'u_me']) {
    const s = snapshotFor(d, viewer);
    for (const u of s.users) if (u.id !== viewer) {
      assert.ok(u.timetable.every((c) => !c.name && !c.room && !c.professor && !c.code && !c.section && !c.url), `${viewer} saw ${u.id}'s course details`);
      assert.equal(u.partnerSearch, undefined); assert.equal(u.showToClassmates, undefined); assert.equal(u.studyGroupOptOut, undefined);
    }
  }
  // timetable hidden (friends only, not friends) → not even busy blocks
  const bOnlyFriends = snapshotFor(d, 'u_x').users.find((u) => u.id === 'u_b')!;
  assert.deepEqual(bOnlyFriends.timetable, []);
});

test('opt-out: "Show me to classmates" off hides me everywhere and hides the list from me', () => {
  const d = db();
  d.users.find((u) => u.id === 'u_c')!.showToClassmates = false;
  const a = classRostersFor(d, 'u_a').find((x) => x.id === KEY)!;
  assert.ok(!a.members.some((m) => m.userId === 'u_c'));
  const c = classRostersFor(d, 'u_c').find((x) => x.id === KEY)!;
  assert.equal(c.hidden, true);
  assert.deepEqual(c.members, []);
  // public count leaves out hidden people and sample profiles
  const info = classRoomInfo(d, catalogCourses, 'berkeley', 'cs61a')!;
  assert.equal(info.count, 3, 'Ana, Ben, Dev — not hidden Cleo, not Sample Sam');
});

test('blocks: blocked pairs never see each other or get grouped', () => {
  const d = db();
  d.relationships.blocks.push({ fromId: 'u_b', toId: 'u_a' });
  assert.ok(!classRostersFor(d, 'u_a').find((x) => x.id === KEY)!.members.some((m) => m.userId === 'u_b'));
  assert.ok(!classRostersFor(d, 'u_b').find((x) => x.id === KEY)!.members.some((m) => m.userId === 'u_a'));
  for (const p of planStudyGroups(d, new Date())) assert.ok(!(p.userIds.includes('u_a') && p.userIds.includes('u_b')), 'blocked pair grouped');
});

test('patches: a timetable change refreshes rosters for classmates only', () => {
  const d = db();
  const u = d.users.find((x) => x.id === 'u_x')!;
  u.timetable = [...u.timetable, ...cs61a()];
  const patch = { users: [u] };
  const forA = patchFor(patch, 'u_a', d)!;
  assert.ok(forA.classRosters!.find((r) => r.id === KEY)!.members.some((m) => m.userId === 'u_x'));
  assert.ok(forA.users!.every((x) => x.timetable.every((c) => !c.name)));
});

test('study groups: 3–4 free classmates, sample/opted-out excluded, then rate-limited', () => {
  const d = db();
  d.users.find((u) => u.id === 'u_d')!.studyGroupOptOut = [KEY];
  const e = engine(d);
  const p1 = e.runStudyGroups(new Date());
  const groups = p1.activities!.filter((a) => a.studyGroup);
  assert.equal(groups.length, 1);
  const g = groups[0];
  assert.deepEqual([...g.studyGroup!.invitedIds].sort(), ['u_a', 'u_b', 'u_c']);
  assert.equal(g.category, 'study');
  assert.equal(g.studyGroup!.status, 'suggested');
  assert.equal(g.studyGroup!.key, KEY);
  assert.equal(p1.notifications!.length, 3);
  assert.match(p1.notifications!.find((n) => n.userId === 'u_a')!.body, /^You, (Ben|Cleo) & (Ben|Cleo) are all free \w{3} .+ for CS 61A — in\?$/);
  // not again this week
  const p2 = e.runStudyGroups(new Date());
  assert.equal(p2.activities!.filter((a) => a.studyGroup?.status === 'suggested').length, 0);
  // only invitees receive it
  assert.ok(snapshotFor(d, 'u_a').activities.some((a) => a.id === g.id));
  assert.ok(!snapshotFor(d, 'u_x').activities.some((a) => a.id === g.id));
  assert.equal(patchFor({ activities: [g] }, 'u_x', d), null);
});

test('study groups: an exam the catalog knows about shortens the wait; none is invented', () => {
  const d = db();
  const e = engine(d);
  e.runStudyGroups(new Date());
  // backdate the first suggestion by 4 days
  d.activities.filter((a) => a.studyGroup).forEach((a) => { a.createdAt = new Date(Date.now() - 4 * 86400000).toISOString(); });
  assert.equal(planStudyGroups(d, new Date()).length, 0, 'no exam → weekly limit holds');
  const soon = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const plans = planStudyGroups(d, new Date(), { examFor: (k) => (k === KEY ? { label: 'Midterm 1', date: soon } : undefined) });
  assert.equal(plans.length, 1);
  assert.equal(plans[0].exam?.label, 'Midterm 1');
});

test('study groups: two "I\'m in" make it real with a group chat', () => {
  const d = db();
  const e = engine(d);
  const g = e.runStudyGroups(new Date()).activities!.find((a) => a.studyGroup)!;
  const [x, y, z] = g.studyGroup!.invitedIds;
  e.respond(g.id, x, 'in');
  assert.equal(g.studyGroup!.status, 'suggested');
  const p = e.respond(g.id, y, 'in');
  assert.equal(g.studyGroup!.status, 'formed');
  assert.deepEqual(p.chatRooms![0].memberIds.sort(), [x, y].sort());
  assert.equal(p.participations!.filter((q) => q.status === 'approved').length, 2);
  e.respond(g.id, z, 'other', { day: 3, start: '15:00', end: '17:00' });
  assert.deepEqual(g.studyGroup!.preferred?.[z], { day: 3, start: '15:00', end: '17:00' });
  assert.throws(() => e.respond(g.id, 'u_x', 'in'), 'outsiders cannot answer');
});

test('partner finder: visible to the class only, with free-time overlap; removed when paired or after the term', () => {
  const d = db();
  const e = engine(d);
  assert.throws(() => e.setPartner('u_x', KEY, 'hi'), 'must take the class');
  e.setPartner('u_b', KEY, '  works early,   pair programming in person ');
  const a = classRostersFor(d, 'u_a').find((r) => r.id === KEY)!;
  assert.equal(a.partners.length, 1);
  assert.equal(a.partners[0].userId, 'u_b');
  assert.equal(a.partners[0].note, 'works early, pair programming in person');
  assert.ok(a.partners[0].overlap.length > 0, 'shows when we are both free');
  assert.ok(!(classRostersFor(d, 'u_x').find((r) => r.id === KEY)), 'non-members get nothing');
  // blocked → not listed
  d.relationships.blocks.push({ fromId: 'u_a', toId: 'u_b' });
  assert.equal(classRostersFor(d, 'u_a').find((r) => r.id === KEY)!.partners.length, 0);
  d.relationships.blocks.pop();
  // paired up
  e.setPartner('u_b', KEY, null);
  assert.equal(classRostersFor(d, 'u_a').find((r) => r.id === KEY)!.partners.length, 0);
  // after the term
  d.users.find((u) => u.id === 'u_b')!.partnerSearch = [{ key: 'old', code: 'CS 61A', term: 'Spring 2020', since: '2020-01-01' }];
  const p = e.runStudyGroups(new Date());
  assert.ok(p.users!.some((u) => u.id === 'u_b'));
  assert.deepEqual(d.users.find((u) => u.id === 'u_b')!.partnerSearch, []);
});

test('class link preview: counts only, no names', () => {
  const d = db();
  const info = classRoomInfo(d, catalogCourses, 'berkeley', 'cs61a', new Date(), buildClassIndex(d.users))!;
  assert.equal(info.code, 'CS 61A');
  const m = classMeta(info);
  assert.equal(m.title, 'CS 61A on Lumi — 4 classmates');
  assert.equal(m.description, 'Find a study group, a project partner, or who’s free after lecture.');
  const html = withMeta('<html><head><title>x</title><meta name="description" content="y" /><meta property="og:title" content="Lumi" /></head><body></body></html>', { ...m, url: 'https://x/c/berkeley/cs61a', image: 'https://x/og-class.png' });
  assert.match(html, /<meta property="og:title" content="CS 61A on Lumi — 4 classmates" \/>/);
  assert.match(html, /og:image" content="https:\/\/x\/og-class.png"/);
  assert.equal((html.match(/og:title/g) ?? []).length, 1);
  for (const n of ['Ana', 'Ben', 'Cleo', 'Dev']) assert.ok(!html.includes(n));
  assert.equal(classRoomInfo(d, catalogCourses, 'nowhere', 'cs61a'), null);
});

test('class room term: current term unless the catalog only has another term and nobody takes it now', () => {
  const d = db();
  const spring = catalogCourses.filter((c) => c.schoolId === 's_berkeley' && c.code === 'CS 61A').map((c) => ({ ...c, term: 'Spring 2099', instructor: 'Someone Else' }));
  const now = classRoomInfo(d, spring, 'berkeley', 'cs61a')!;
  assert.equal(now.term, TERM, 'students take it this term → this term');
  assert.equal(now.instructor, undefined, 'no instructor/times from another term');
  assert.equal(now.title, 'The Structure and Interpretation of Computer Programs');
  d.users = d.users.filter((u) => !enrollments(u).some((e) => e.key === KEY));
  assert.equal(classRoomInfo(d, spring, 'berkeley', 'cs61a')!.term, 'Spring 2099');
});

test('class lists are only for students with a verified school email', () => {
  const d = db();
  const ben = d.users.find((u) => u.id === 'u_b')!;
  ben.affiliation = { ...ben.affiliation, emailVerified: false } as User['affiliation'];
  // 미인증이면 명단을 받지 못한다
  const r = snapshotFor(d, 'u_b').classRosters!.find((x) => x.id === KEY)!;
  assert.equal(r.unverified, true);
  assert.deepEqual(r.members, []);
  assert.deepEqual(r.partners, []);
  // 남의 명단에도, 인원 수에도, 스터디 그룹에도 들어가지 않는다
  const a = snapshotFor(d, 'u_a').classRosters!.find((x) => x.id === KEY)!;
  assert.ok(!a.members.some((m) => m.userId === 'u_b'));
  assert.ok(!(buildClassIndex(d.users).get(KEY) ?? []).some((m) => m.userId === 'u_b'));
  assert.ok(!planStudyGroups(d).some((g) => g.userIds.includes('u_b')));
});
