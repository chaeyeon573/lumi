/**
 * 같은 수업 학생 (classmates) — "아무것도 올리지 않고 같은 수업 친구 찾기".
 *
 * 공개 규칙 (서버 server/view.ts 가 이 함수들로 보는 사람마다 계산한다):
 *   - 같은 수업 = 같은 학교 + 정규화한 과목 코드 + 학기 (시간표 항목에 학기가 없으면 지금 학기)
 *   - 같은 수업 학생에게는 '이 수업을 듣는다'(+ 수업 목록이 알려 준 분반)만 보인다. 다른 수업·시간표는 보이지 않는다
 *   - "Show me to classmates" 를 끈 사람은 아무 목록에도 나오지 않고, 본인도 목록을 못 본다 (서로 같은 조건)
 *   - 차단 관계(어느 쪽이든)는 서로 보이지 않고, 스터디 그룹에도 같이 묶지 않는다
 *   - 예시 프로필(sample)은 목록에 '예시'로 표시되고, 공개 인원 수·스터디 그룹 제안에는 넣지 않는다
 */
import type { CatalogCourse, ClassRoomInfo, Snapshot } from '@core/api/types';
import type { Activity, ClassRoster, Course, ID, User } from '@core/types';
import { currentTerm, normalizeTermLabel, termLabel, termOrder } from './terms';
import { freeBlocks, overlapBlocks, toHHMM, toMin, type Block } from './timetable';

// ─── 코드·학기·키 ───────────────────────────────────────────────────────────
/** "CS 61A" → "cs61a" (URL·키용) */
export const codeSlug = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, '');
/** "s_berkeley" → "berkeley" */
export const schoolSlug = (schoolId: ID) => schoolId.replace(/^s_/, '');
export const schoolIdFromSlug = (slug: string) => `s_${slug.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

/** 과목 코드 모양: 대문자 과목 약칭 (+ 두 번째 약칭) + 번호 ("CS 61A", "UGBA 102A", "L&S C30T", "DATA C8") */
const CODE_RE = /^([A-Z][A-Z&]{0,9}(?:\s[A-Z&]{2,6})?)\s?(C?\d{1,4}[A-Z]{0,3})(?=$|[\s:·,(—-])/;
export const normalizeCode = (code: string) => {
  const m = CODE_RE.exec(code.trim().toUpperCase().replace(/\s+/g, ' '));
  return m ? `${m[1]} ${m[2]}` : code.trim().toUpperCase().replace(/\s+/g, ' ');
};
/** 이름에서 과목 코드를 읽는다 — 코드 모양이 아니면 null ("Public Speaking", "Lab seminar") */
export function codeFromName(name: string): string | null {
  const m = CODE_RE.exec(name.trim().replace(/\s+/g, ' '));
  return m ? `${m[1]} ${m[2]}` : null;
}
export const courseCodeOf = (c: Pick<Course, 'code' | 'name'>): string | null => (c.code?.trim() ? normalizeCode(c.code) : codeFromName(c.name));
export const nowTermLabel = (now: Date = new Date()) => termLabel(currentTerm(now));
export const courseTermOf = (c: Pick<Course, 'term'>, now: Date = new Date()) => (c.term?.trim() ? normalizeTermLabel(c.term) : nowTermLabel(now));
export const classKey = (schoolId: ID, code: string, term: string) => `${schoolId}|${codeSlug(code)}|${term}`;
export function parseClassKey(key: string): { schoolId: ID; codeSlug: string; term: string } | null {
  const [schoolId, slug, term] = key.split('|');
  return schoolId && slug && term ? { schoolId, codeSlug: slug, term } : null;
}
/** 공유 링크 경로 */
export const classPath = (schoolId: ID, code: string) => `/c/${schoolSlug(schoolId)}/${codeSlug(code)}`;
/** slug("cs61a") → 화면용 추정 코드 ("CS 61A") — 수업 목록에 없을 때만 쓴다 */
export const codeFromSlug = (slug: string) => { const m = /^([a-z&]+)(c?\d.*)$/i.exec(slug); return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : slug.toUpperCase(); };

/** 어느 쪽이든 차단했으면 true */
const isBlocked = (db: Pick<Snapshot, 'relationships'>, a: ID, b: ID) => db.relationships.blocks.some((x) => (x.fromId === a && x.toId === b) || (x.fromId === b && x.toId === a));

export const schoolOf = (u: Pick<User, 'affiliation'>): ID => (u.affiliation.type === 'university' ? u.affiliation.schoolId : '');
export const showsToClassmates = (u: Pick<User, 'showToClassmates'>) => u.showToClassmates !== false;

export interface Enrollment { key: string; schoolId: ID; code: string; term: string; name: string; section?: string; meetings: Course[] }

/** 한 사람의 수업 (과목 코드를 읽을 수 있는 항목만, 키별로 하나) */
export function enrollments(u: Pick<User, 'affiliation' | 'timetable'>, now: Date = new Date()): Enrollment[] {
  const schoolId = schoolOf(u);
  if (!schoolId) return [];
  const out = new Map<string, Enrollment>();
  for (const c of u.timetable) {
    const code = courseCodeOf(c);
    if (!code) continue;
    const term = courseTermOf(c, now);
    const key = classKey(schoolId, code, term);
    const e = out.get(key);
    if (e) { e.meetings.push(c); if (!e.section && c.section) e.section = c.section; }
    else out.set(key, { key, schoolId, code, term, name: c.name, section: c.section || undefined, meetings: [c] });
  }
  return [...out.values()];
}

/** 같은 학기 수업만으로 하루 공강 (다음 학기 수업이 섞여 있어도 이번 학기 기준) */
const termCourses = (u: Pick<User, 'timetable'>, term: string, now: Date) => u.timetable.filter((c) => courseTermOf(c, now) === term);

// ─── 수업별 학생 목록 ───────────────────────────────────────────────────────
export interface ClassMember { userId: ID; section?: string; sample: boolean }
export type ClassIndex = Map<string, ClassMember[]>;

/** 키 → 보이기를 켠 학생들. 서버는 패치 하나당 한 번 만들어 모든 접속자에게 같이 쓴다 */
export function buildClassIndex(users: User[], now: Date = new Date()): ClassIndex {
  const idx: ClassIndex = new Map();
  for (const u of users) {
    if (!showsToClassmates(u)) continue;
    for (const e of enrollments(u, now)) (idx.get(e.key) ?? idx.set(e.key, []).get(e.key)!).push({ userId: u.id, section: e.section, sample: !!u.sample });
  }
  return idx;
}

type RosterDb = Pick<Snapshot, 'users' | 'relationships'>;

/** 두 사람이 같이 비는 평일 시간 (최대 3개, 1시간 이상, 10~21시) */
export function sharedFree(a: Pick<User, 'timetable'>, b: Pick<User, 'timetable'>, term: string, now: Date = new Date()) {
  const ca = termCourses(a, term, now), cb = termCourses(b, term, now);
  const out: { day: number; start: string; end: string }[] = [];
  for (let day = 0; day < 5; day++) {
    const ov = overlapBlocks(freeBlocks(ca, day, 10 * 60, 21 * 60), freeBlocks(cb, day, 10 * 60, 21 * 60), 60);
    const best = ov.sort((x, y) => (y.end - y.start) - (x.end - x.start))[0];
    if (best) out.push({ day, start: toHHMM(best.start), end: toHHMM(best.end) });
  }
  // 하루 종일 비는 날보다 수업 사이에 맞는 짧은 시간이 더 쓸모 있다 — 짧은 것부터 3개, 요일 순으로
  return out.sort((x, y) => (toMin(x.end) - toMin(x.start)) - (toMin(y.end) - toMin(y.start))).slice(0, 3).sort((x, y) => x.day - y.day);
}

/** 이 사람에게 보낼 수업별 목록 — 그 수업을 듣는 사람에게만, 그 수업의 같은 학생만 */
export function classRostersFor(db: RosterDb, viewerId: ID, now: Date = new Date(), index?: ClassIndex): ClassRoster[] {
  const me = db.users.find((u) => u.id === viewerId);
  if (!me) return [];
  const mine = enrollments(me, now);
  if (!mine.length) return [];
  if (!showsToClassmates(me)) return mine.map((e) => ({ id: e.key, schoolId: e.schoolId, code: e.code, term: e.term, name: e.name, mySection: e.section, members: [], count: 0, partners: [], hidden: true }));
  const idx = index ?? buildClassIndex(db.users, now);
  const byId = new Map(db.users.map((u) => [u.id, u]));
  const curOrder = termOrder(nowTermLabel(now));
  return mine.map((e) => {
    const members = (idx.get(e.key) ?? []).filter((m) => m.userId !== me.id && !isBlocked(db, me.id, m.userId));
    const partners = members.flatMap((m) => {
      const u = byId.get(m.userId);
      const p = u?.partnerSearch?.find((x) => x.key === e.key && termOrder(x.term) >= curOrder);
      return u && p ? [{ userId: u.id, note: p.note, since: p.since, overlap: sharedFree(me, u, e.term, now) }] : [];
    });
    return {
      id: e.key, schoolId: e.schoolId, code: e.code, term: e.term, name: e.name, mySection: e.section,
      members: members.map((m) => (m.section ? { userId: m.userId, section: m.section } : { userId: m.userId })),
      count: members.length + 1, partners,
    };
  });
}

/** 내 시간표의 수업 이름 → 그 수업 목록 */
export function rosterForCourse(rosters: ClassRoster[] | undefined, me: Pick<User, 'affiliation' | 'timetable'>, courseName: string, now: Date = new Date()): ClassRoster | undefined {
  const c = me.timetable.find((x) => x.name === courseName);
  const code = c && courseCodeOf(c);
  if (!c || !code) return undefined;
  return rosters?.find((r) => r.id === classKey(schoolOf(me), code, courseTermOf(c, now)));
}

/** 나와 같은 수업을 듣는 사람인지 (목록에 있는 수업 이름) */
export function sharedClassWith(rosters: ClassRoster[] | undefined, userId: ID): ClassRoster | undefined {
  return rosters?.find((r) => r.members.some((m) => m.userId === userId));
}

// ─── 수업 방 공개 정보 ──────────────────────────────────────────────────────
/** 수업 목록에서 지금 학기(없으면 가장 가까운 학기)의 그 과목 */
export function findCatalogCourse(catalog: CatalogCourse[], schoolId: ID, slug: string, now: Date = new Date()): CatalogCourse | undefined {
  const hits = catalog.filter((c) => c.schoolId === schoolId && codeSlug(c.code) === slug);
  if (!hits.length) return undefined;
  const cur = nowTermLabel(now);
  const curOrder = termOrder(cur);
  const termOf = (c: CatalogCourse) => normalizeTermLabel(c.term ?? '');
  return hits.find((c) => termOf(c) === cur && c.meetings.length) ?? hits.find((c) => termOf(c) === cur)
    ?? [...hits].sort((a, b) => Math.abs(termOrder(termOf(a)) - curOrder) - Math.abs(termOrder(termOf(b)) - curOrder))[0];
}

/** /c/<학교>/<코드> 에 보여줄 정보. 학교를 모르거나, 수업 목록에도 없고 듣는 사람도 없으면 null */
export function classRoomInfo(db: Pick<Snapshot, 'users' | 'schools'>, catalog: CatalogCourse[], schoolSlugIn: string, codeSlugIn: string, now: Date = new Date(), index?: ClassIndex): ClassRoomInfo | null {
  const schoolId = schoolIdFromSlug(schoolSlugIn);
  const school = db.schools.find((s) => s.id === schoolId);
  const slug = codeSlug(codeSlugIn);
  if (!school || !slug) return null;
  const found = findCatalogCourse(catalog, schoolId, slug, now);
  const cur = nowTermLabel(now);
  const idx = index ?? buildClassIndex(db.users, now);
  const ccTerm = found ? normalizeTermLabel(found.term ?? '') : '';
  const seasonal = /^(Spring|Summer|Fall|Winter|Autumn) \d{4}$/.test(ccTerm);
  // 지금 학기가 기본. 수업 목록에 지금 학기가 없고(다음 학기만 올라온 학교) 지금 학기로 듣는 사람도 없을 때만 목록의 학기로.
  // 학기 구분이 없는 공개 카탈로그('catalog' 같은 라벨)는 지금 학기로 본다
  const term = !found || !seasonal || ccTerm === cur || (idx.get(`${schoolId}|${slug}|${cur}`) ?? []).length ? cur : ccTerm;
  // 다른 학기 행이면 제목만 쓴다 (교수·시간은 학기마다 다르다)
  const cc = found && (!seasonal || ccTerm === term) ? found : undefined;
  const key = `${schoolId}|${slug}|${term}`;
  const count = (idx.get(key) ?? []).filter((m) => !m.sample).length;
  const enrolled = cc || !(idx.get(key) ?? []).length ? undefined : db.users.find((u) => enrollments(u, now).some((e) => e.key === key));
  if (!found && !enrolled) return null;
  const code = found ? normalizeCode(found.code) : enrollments(enrolled!, now).find((e) => e.key === key)?.code ?? codeFromSlug(slug);
  return {
    schoolId, schoolName: school.name, schoolSlug: schoolSlug(schoolId), codeSlug: slug, code, term,
    title: found?.title, instructor: cc?.instructor, meetings: cc?.meetings ?? [], url: (cc ?? found)?.url, inCatalog: !!cc, count, catalogCourse: cc,
  };
}

// ─── 스터디 그룹 짝짓기 ─────────────────────────────────────────────────────
export interface Slot { day: number; start: string; end: string }
export interface StudyGroupPlan { key: string; schoolId: ID; code: string; term: string; courseName: string; userIds: ID[]; date: string; slot: Slot; alternatives: Slot[]; exam?: { label: string; date: string } }
export interface PlanOptions {
  /** 알려진 시험 (없으면 undefined — 지어내지 않는다) */
  examFor?: (key: string) => { label: string; date: string } | undefined;
  /** 같은 수업으로 다시 제안하기까지 (기본 7일, 시험 2주 전이면 3일) */
  windowDays?: number;
  examWindowDays?: number;
  /** 한 사람이 일주일에 받는 제안 수 (모든 수업 합) */
  maxPerWeek?: number;
  minSize?: number;
  maxSize?: number;
}
const DAY_MS = 86400000;
/** 캠퍼스(태평양) 날짜 "YYYY-MM-DD" */
export const campusDateOf = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const weekdayIdx = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** 블록 목록끼리 겹치는 부분 (minLen 이상) */
function intersect(a: Block[], b: Block[], minLen: number): Block[] { return overlapBlocks(a, b, minLen); }

/** 겹치는 시간에서 모임 시간 고르기 — 오후 4시 근처, 최대 2시간, 30분 단위 */
function pickSlot(b: Block): Block {
  const len = Math.min(120, b.end - b.start);
  let start = Math.min(Math.max(b.start, 16 * 60), b.end - len);
  start = Math.ceil(start / 30) * 30;
  if (start + len > b.end) start = Math.floor((b.end - len) / 30) * 30;
  if (start < b.start) start = b.start;
  return { start, end: start + len };
}

/**
 * 같은 수업에서 이번 주에 같이 비는 3~4명을 묶는다 (순수 함수 — 만들기·알림은 api/classes.ts).
 * 제외: 보이기를 끈 사람 · 이 수업 제안을 끈 사람 · 예시 프로필 · 최근에 이 수업으로 제안받은 사람 · 일주일 제안 한도를 채운 사람 · 차단 관계끼리
 */
export function planStudyGroups(db: Pick<Snapshot, 'users' | 'relationships' | 'activities'>, now: Date = new Date(), opts: PlanOptions = {}): StudyGroupPlan[] {
  const { windowDays = 7, examWindowDays = 3, maxPerWeek = 2, minSize = 3, maxSize = 4 } = opts;
  const today = campusDateOf(now);
  const cur = nowTermLabel(now);
  const t0 = now.getTime();
  const recent = db.activities.filter((a) => a.studyGroup && t0 - Date.parse(a.createdAt) < 7 * DAY_MS);
  const weekCount = new Map<ID, number>();
  for (const a of recent) for (const id of a.studyGroup!.invitedIds) weekCount.set(id, (weekCount.get(id) ?? 0) + 1);
  const lastFor = (key: string, userId: ID) => Math.max(0, ...db.activities.filter((a) => a.studyGroup?.key === key && a.studyGroup.invitedIds.includes(userId)).map((a) => Date.parse(a.createdAt)));

  // 이번 주 남은 평일 (내일부터 6일)
  const days = Array.from({ length: 6 }, (_, i) => addDays(today, i + 1)).filter((d) => weekdayIdx(d) < 5);
  const byKey = new Map<string, { e: Enrollment; u: User }[]>();
  for (const u of db.users) {
    if (u.sample || !showsToClassmates(u)) continue;
    for (const e of enrollments(u, now)) {
      if (e.term !== cur || (u.studyGroupOptOut ?? []).includes(e.key)) continue;
      (byKey.get(e.key) ?? byKey.set(e.key, []).get(e.key)!).push({ e, u });
    }
  }
  const examOf = (key: string) => {
    const x = opts.examFor?.(key);
    if (!x) return undefined;
    const d = Math.round((Date.parse(`${x.date.slice(0, 10)}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY_MS);
    return d >= 0 && d <= 14 ? x : undefined;
  };
  const keys = [...byKey.keys()].sort((a, b) => Number(!!examOf(b)) - Number(!!examOf(a)) || byKey.get(b)!.length - byKey.get(a)!.length);
  const plans: StudyGroupPlan[] = [];
  for (const key of keys) {
    const exam = examOf(key);
    const win = (exam ? examWindowDays : windowDays) * DAY_MS;
    let pool = byKey.get(key)!.filter(({ u }) => (weekCount.get(u.id) ?? 0) < maxPerWeek && t0 - lastFor(key, u.id) >= win);
    // 수업 목록이 알려 준 분반이 같은 사람끼리 먼저
    pool.sort((a, b) => (a.e.section ?? '~').localeCompare(b.e.section ?? '~'));
    while (pool.length >= minSize) {
      let best: { group: typeof pool; date: string; common: Block[] } | null = null;
      for (const date of days) {
        const day = weekdayIdx(date);
        const free = new Map(pool.slice(0, 60).map(({ u }) => [u.id, freeBlocks(termCourses(u, cur, now), day, 10 * 60, 21 * 60).filter((b) => b.end - b.start >= 90)]));
        // 큰 수업(수백 명)에서도 가볍게 — 씨앗 12명, 후보 60명까지만 본다
        for (const seed of pool.slice(0, 12)) {
          const group = [seed];
          let common = free.get(seed.u.id)!;
          const rest = pool.slice(0, 60).filter((x) => x !== seed);
          while (group.length < maxSize) {
            const next = rest.filter((x) => !group.includes(x) && group.every((g) => !isBlocked(db, g.u.id, x.u.id)))
              .map((x) => ({ x, c: intersect(common, free.get(x.u.id)!, 90) }))
              .filter((y) => y.c.length)
              .sort((p, q) => Number(q.x.e.section === seed.e.section && !!seed.e.section) - Number(p.x.e.section === seed.e.section && !!seed.e.section) || Math.max(...q.c.map((b) => b.end - b.start)) - Math.max(...p.c.map((b) => b.end - b.start)))[0];
            if (!next) break;
            group.push(next.x); common = next.c;
          }
          if (group.length >= minSize && (!best || group.length > best.group.length)) best = { group, date, common };
          if (best?.group.length === maxSize) break;
        }
        if (best) break; // 가장 이른 날
      }
      if (!best) break;
      const block = best.common.sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];
      const s = pickSlot(block);
      const ids = best.group.map((g) => g.u.id);
      const alternatives: Slot[] = [];
      for (const date of days) {
        if (date === best.date || alternatives.length >= 3) continue;
        const day = weekdayIdx(date);
        let c: Block[] | null = null;
        for (const g of best.group) { const f = freeBlocks(termCourses(g.u, cur, now), day, 10 * 60, 21 * 60); c = c ? intersect(c, f, 90) : f.filter((b) => b.end - b.start >= 90); }
        const b = c?.sort((x, y) => (y.end - y.start) - (x.end - x.start))[0];
        if (b) { const p = pickSlot(b); alternatives.push({ day, start: toHHMM(p.start), end: toHHMM(p.end) }); }
      }
      const first = best.group[0].e;
      plans.push({ key, schoolId: first.schoolId, code: first.code, term: first.term, courseName: first.name, userIds: ids, date: best.date, slot: { day: weekdayIdx(best.date), start: toHHMM(s.start), end: toHHMM(s.end) }, alternatives, exam });
      ids.forEach((id) => weekCount.set(id, (weekCount.get(id) ?? 0) + 1));
      pool = pool.filter((x) => !ids.includes(x.u.id) && (weekCount.get(x.u.id) ?? 0) < maxPerWeek);
    }
  }
  return plans;
}

/** 다음 그 요일 날짜 (오늘 포함 안 함) — "다른 시간" 고를 때 */
export function nextDateFor(day: number, now: Date = new Date()): string {
  const today = campusDateOf(now);
  for (let i = 1; i <= 7; i++) { const d = addDays(today, i); if (weekdayIdx(d) === day) return d; }
  return addDays(today, 7);
}

/** 내 스터디 그룹 제안 (아직 답하지 않았거나 진행 중) */
export const myStudyGroups = (activities: Activity[], userId: ID, today: string) =>
  activities.filter((a) => a.studyGroup && a.studyGroup.invitedIds.includes(userId) && a.studyGroup.status !== 'expired' && a.date >= today);
