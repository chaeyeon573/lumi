/**
 * S029 "Add classes" — 학교 수업 목록에서 찾아 넣기의 순수 규칙 (화면 없이 테스트한다: server/coursefinder.test.ts).
 *
 * 이 화면의 일은 "CalCentral 에 이미 있는 내 수업을 30초 안에 Lumi 에 넣기" (owner 2026-11-06) — 계획 도구가 아니다.
 * 그래서 검색이 주인공이고 필터는 가볍다: 학기 · 학과(★) · 학년 단계 · 정렬(기본 / 과목 코드 / 이름).
 *   - 검색·거르기·정렬은 한 함수(findCourses)로 — 목록과 필터 시트의 "Show N results" 가 같은 함수를 부른다
 *   - "N on Lumi" 는 수만 (이름 없음). 같은 수업 학생 보이기를 끈 사람·인증 안 한 사람·예시 프로필은 세지 않는다
 *   - 학부생에게는 대학원 수업을 둘러보기 목록에 밀어 넣지 않는다 (PRODUCT_TASTE). 직접 검색하면 찾을 수 있다
 */
import type { CatalogCourse } from '@core/api/types';
import type { Course, ID, User } from '@core/types';
import { scoreCourse } from '@core/data/catalog/courses';
import { buildClassIndex, codeSlug, courseCodeOf, courseTermOf } from './classmates';
import { normalizeTermLabel } from './terms';
import { toMin } from './timetable';

// ─── 학년 단계 (과목 번호로 — 학교가 정한 번호 규칙) ─────────────────────────
export type CourseLevel = 'lower' | 'upper' | 'grad';
/**
 * Berkeley 번호 규칙: 1–99 하위(lower division), 100–199 상위(upper division), 200 이상 대학원·전문(300·400 포함).
 * 번호 앞 글자(C 교차 개설 · W 온라인 · R 읽기·작문 · H 우등 · N 여름)와 뒤 글자(61A 의 A)는 무시한다. 번호를 못 읽으면 undefined
 */
export function courseLevel(code: string): CourseLevel | undefined {
  const tail = code.trim().split(/\s+/).pop() ?? '';
  const m = /^[A-Z]{0,2}(\d{1,3})/i.exec(tail);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n < 100 ? 'lower' : n < 200 ? 'upper' : 'grad';
}

// ─── 검색 · 거르기 · 정렬 ─────────────────────────────────────────────────────
export type CourseSort = 'default' | 'code' | 'name';
export interface CourseQuery {
  q?: string;
  /** 학과 이름 그대로 ('' = 전체) */
  dept?: string;
  /** '' = 전체 (학부생은 둘러보기에서 대학원 제외) */
  level?: CourseLevel | '';
  sort?: CourseSort;
  /** 보는 사람이 학부생이면 true — 학년 단계를 고르지 않았을 때 둘러보기 목록에서 대학원 수업을 뺀다 */
  undergrad?: boolean;
}

const byCode = (a: CatalogCourse, b: CatalogCourse) => a.code.localeCompare(b.code, 'en', { numeric: true }) || a.title.localeCompare(b.title, 'en', { numeric: true });
const byName = (a: CatalogCourse, b: CatalogCourse) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base', numeric: true }) || byCode(a, b);

/**
 * 목록에 보일 수업 — 검색어가 있으면 맞는 것만(맞는 정도 순), 없으면 학과·단계로 거른 전체.
 * 기본 정렬: 검색 중엔 맞는 정도(같으면 학부 수업 먼저 · 코드 순), 둘러볼 땐 과목 코드 순
 */
export function findCourses(courses: CatalogCourse[], f: CourseQuery): CatalogCourse[] {
  const q = (f.q ?? '').trim();
  const level = f.level ?? '';
  const keep = (c: CatalogCourse) => (!f.dept || c.department === f.dept) && (!level || courseLevel(c.code) === level);
  let list: CatalogCourse[];
  if (q) {
    const scored: { c: CatalogCourse; s: number }[] = [];
    for (const c of courses) { if (!keep(c)) continue; const s = scoreCourse(c, q); if (s > 0) scored.push({ c, s }); }
    const grad = (c: CatalogCourse) => (f.undergrad && courseLevel(c.code) === 'grad' ? 1 : 0);
    scored.sort((a, b) => b.s - a.s || grad(a.c) - grad(b.c) || byCode(a.c, b.c));
    list = scored.map((x) => x.c);
  } else {
    list = courses.filter((c) => keep(c) && (level || !f.undergrad || courseLevel(c.code) !== 'grad')).sort(byCode);
  }
  if (f.sort === 'code') return q ? [...list].sort(byCode) : list;
  if (f.sort === 'name') return [...list].sort(byName);
  return list;
}

// ─── 겹침 · 미리보기 ─────────────────────────────────────────────────────────
export interface Meeting { day: number; start: string; end: string }
export interface Overlap { label: string; day: number; start: string }

/** 시간표 줄의 짧은 이름 — 과목 코드가 있으면 코드 ("CS 61B"), 없으면 이름 */
export const shortCourseLabel = (c: Pick<Course, 'code' | 'name'>) => courseCodeOf(c) ?? c.name;

/**
 * 미리보는 수업이 내 시간표와 처음 겹치는 곳 (요일 → 시작 시각 순) — "Overlaps CS 61B · Mon 2 PM".
 * 같은 과목(이미 넣은 그 수업)은 겹침으로 치지 않는다. 끝과 시작이 맞닿는 것(10:00 끝 · 10:00 시작)은 겹침이 아니다
 */
export function findOverlap(timetable: Course[], meetings: Meeting[], selfCode?: string): Overlap | null {
  const self = selfCode ? codeSlug(selfCode) : '';
  let best: Overlap & { at: number } | null = null;
  for (const m of meetings) {
    for (const x of timetable) {
      if (x.day !== m.day) continue;
      const code = courseCodeOf(x);
      if (self && code && codeSlug(code) === self) continue;
      if (toMin(m.start) < toMin(x.end) && toMin(x.start) < toMin(m.end)) {
        const at = x.day * 1440 + Math.max(toMin(x.start), toMin(m.start));
        if (!best || at < best.at) best = { label: shortCourseLabel(x), day: x.day, start: toMin(x.start) > toMin(m.start) ? x.start : m.start, at };
      }
    }
  }
  return best ? { label: best.label, day: best.day, start: best.start } : null;
}

// ─── "N on Lumi" ──────────────────────────────────────────────────────────────
/**
 * 학교·학기별 과목 → Lumi 학생 수 (codeSlug → n). 이름은 없다 — 수만.
 * 같은 수업 명단과 같은 규칙(buildClassIndex): "Show me to classmates" 를 끈 사람, 학교 이메일을 인증하지 않은 사람은 빠진다.
 * 예시 프로필(sample)은 실제 수에 섞지 않는다. 0 인 과목은 담지 않는다
 */
export function lumiCounts(users: User[], schoolId: ID, term: string, now: Date = new Date()): Record<string, number> {
  const out: Record<string, number> = {};
  const prefix = `${schoolId}|`, suffix = `|${term}`;
  for (const [key, members] of buildClassIndex(users, now)) {
    if (!key.startsWith(prefix) || !key.endsWith(suffix)) continue;
    const n = members.filter((m) => !m.sample).length;
    if (n > 0) out[key.slice(prefix.length, key.length - suffix.length)] = n;
  }
  return out;
}
/** 줄 오른쪽 조용한 글자 — 1명 이상일 때만 */
export const lumiCountLabel = (n: number | undefined, en = true): string | null => (n && n >= 1 ? (en ? `${n} on Lumi` : `Lumi ${n}명`) : null);

// ─── 학과 ★ ─────────────────────────────────────────────────────────────────
/** 학과 고르기 목록: ★ 먼저(별 누른 순서), 그다음 이름순. 검색어가 있으면 이름에 들어간 것만 */
export function orderDepartments<T extends { name: string }>(depts: T[], favorites: string[], query = ''): T[] {
  const q = query.trim().toLowerCase();
  const list = q ? depts.filter((d) => d.name.toLowerCase().includes(q)) : depts;
  const fav = favorites.map((f) => list.find((d) => d.name === f)).filter((d): d is T => !!d);
  return [...fav, ...list.filter((d) => !favorites.includes(d.name)).sort((a, b) => a.name.localeCompare(b.name))];
}
export const toggleFavorite = (favorites: string[], name: string) => (favorites.includes(name) ? favorites.filter((x) => x !== name) : [...favorites, name].slice(-30));

// ─── 줄에 쓰는 글자 ───────────────────────────────────────────────────────────
const clock12 = (hhmm: string, withPeriod: boolean) => {
  const m = toMin(hhmm); const h = Math.floor(m / 60) % 24; const mm = m % 60;
  return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, '0')}` : ''}${withPeriod ? (h < 12 ? ' AM' : ' PM') : ''}`;
};
/** "9:30–10:59 AM" · "11 AM–12:29 PM" — 오전·오후가 같으면 한 번만 */
export const timeRange = (start: string, end: string) => {
  const same = (toMin(start) < 720) === (toMin(end) < 720);
  return `${clock12(start, !same)}–${clock12(end, true)}`;
};
/** 요일·시각 한 줄 — 같은 시각끼리 묶는다: "Mon/Wed/Fri 1–1:59 PM", 다르면 " · " 로 */
export function meetingLine(meetings: Meeting[], dayLabels: string[]): string {
  const groups = new Map<string, number[]>();
  for (const m of [...meetings].sort((a, b) => a.day - b.day)) {
    const k = `${m.start}-${m.end}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(m.day);
  }
  return [...groups].map(([k, days]) => { const [s, e] = k.split('-'); return `${[...new Set(days)].map((d) => dayLabels[d]).join('/')} ${timeRange(s, e)}`; }).join(' · ');
}
/** "Overlaps CS 61B · Mon 2 PM" */
export const overlapLine = (o: Overlap, dayLabels: string[], en = true) => (en ? `Overlaps ${o.label} · ${dayLabels[o.day]} ${clock12(o.start, true)}` : `${o.label}와 겹쳐요 · ${dayLabels[o.day]} ${o.start}`);
export const LEVEL_LABELS: Record<CourseLevel, [string, string]> = { lower: ['Lower division', '하위 과목'], upper: ['Upper division', '상위 과목'], grad: ['Graduate', '대학원'] };

/** 이미 시간표에 있는 수업인지 — 같은 이름이거나, 같은 과목 코드 + 같은 학기 */
export function isCourseAdded(timetable: Course[], c: Pick<CatalogCourse, 'code' | 'title' | 'term'>): boolean {
  const name = `${c.code} ${c.title}`.slice(0, 60);
  const slug = codeSlug(c.code), term = normalizeTermLabel(c.term ?? '');
  return timetable.some((x) => x.name === name || (!!x.code && codeSlug(x.code) === slug && (!term || courseTermOf(x) === term)));
}
