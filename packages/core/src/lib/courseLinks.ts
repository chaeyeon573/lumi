/**
 * 수업에서 바깥 사이트로 가는 링크 — 학교마다 한 곳에 적는다 (owner 2026-11-06).
 *
 * 링크만 건다. 그 사이트의 숫자(성적 분포·평점·수강 인원)는 읽지도, 옮기지도, 보여 주지도 않는다 — 그 사이트 약관이고,
 * 우리가 보증할 수 없는 숫자는 보여 주지 않는다.
 *
 * ⛔ 실제 브라우저에서 깊은 링크를 열어 확인한 학교만 넣는다. 주소를 짐작해서 넣지 않는다 — 틀린 깊은 링크는 링크가 없는 것보다 나쁘다.
 *    지금은 UC Berkeley 만 확인했다 (2026-11-06). 다른 학교를 열 때의 순서는 docs/course-links.md.
 *
 * Rate My Professors 는 미국 학교 어디든 있지만, 학교 id 없이 검색하면 다른 학교 사람이 섞여 나온다 — rmpSchoolId 가 없으면 링크도 없다.
 */
import type { CatalogCourse } from '@core/api/types';
import type { ID } from '@core/types';
import { BERKELEY_ABBR } from '@core/data/catalog/subjects';

type LinkCourse = Pick<CatalogCourse, 'schoolId' | 'code' | 'term' | 'url' | 'instructor'>;
export interface CourseSite { label: string; build: (c: LinkCourse) => string | null }
export interface SchoolCourseLinks {
  /** ratemyprofessors.com/search/schools?q=… 에서 확인한 학교 번호 */
  rmpSchoolId?: number;
  /** 학생이 만든 성적·수업 사이트 — 깊은 링크를 브라우저에서 확인한 것만 */
  courseSites?: CourseSite[];
}

// ─── Berkeley ────────────────────────────────────────────────────────────────
const SHORT_TO_LONG = Object.fromEntries(Object.entries(BERKELEY_ABBR).map(([long, short]) => [short, long]));
const SEASON_RE = /^(Spring|Summer|Fall)\s+(\d{4})$/i;

/** "CS 61A" → { subject: "COMPSCI", number: "61A" } (학교 공식 약칭). 약칭이 여러 단어("POL SCI")면 null — 그 모양의 깊은 링크는 확인 못 했다 */
export function berkeleySubject(code: string): { subject: string; number: string } | null {
  const m = /^(.+?)\s+([A-Z]{0,2}\d+[A-Z]{0,3})$/i.exec(code.trim().replace(/\s+/g, ' '));
  if (!m) return null;
  const subject = (SHORT_TO_LONG[m[1].toUpperCase()] ?? m[1]).toUpperCase();
  return /^[A-Z]+$/.test(subject) ? { subject, number: m[2].toUpperCase() } : null;
}

/** 강의 분반 세 자리 — 수업 페이지 주소 끝(…-lec-002)에서. 주소가 없으면 001. 글자가 붙은 분반(061A)은 모양을 확인 못 해 null */
export function lectureSection(c: Pick<CatalogCourse, 'url'>): string | null {
  if (!c.url) return '001';
  const m = /-([0-9a-z]{1,4})$/i.exec(c.url);
  return m && /^\d{1,3}$/.test(m[1]) ? m[1].padStart(3, '0') : null;
}

/**
 * Berkeleytime — https://berkeleytime.com/catalog/{year}/{Term}/{SUBJECT}/{NUMBER}/{section}/1
 * 과목 약칭·번호·학기·분반을 모두 확실히 읽을 때만 깊은 링크, 아니면 그 학기 목록 페이지
 */
export function berkeleytimeUrl(c: Pick<CatalogCourse, 'code' | 'term' | 'url'>): string {
  const t = SEASON_RE.exec((c.term ?? '').trim());
  if (!t) return 'https://berkeleytime.com/catalog';
  const season = t[1][0].toUpperCase() + t[1].slice(1).toLowerCase();
  const base = `https://berkeleytime.com/catalog/${t[2]}/${season}`;
  const s = berkeleySubject(c.code);
  const sec = lectureSection(c);
  return s && sec ? `${base}/${s.subject}/${encodeURIComponent(s.number)}/${sec}/1` : base;
}

/**
 * 학교 → 바깥 링크. ⛔ 실제 브라우저에서 확인한 학교만 — 그 전에는 어떤 학교도 넣지 않는다 (주소를 짐작하지 않는다).
 * 순서: docs/course-links.md
 */
export const COURSE_LINKS: Record<ID, SchoolCourseLinks> = {
  // 2026-11-06 실제 브라우저로 확인: RMP 1072 → John DeNero (coordinator), Berkeleytime 깊은 링크 COMPSCI 61A 001 · DATA C100 001 ·
  // MATH 51 002 (Fall 2026) · STAT 134 001 (Spring 2027) 이 각각 그 과목·분반 페이지로 열린다
  s_berkeley: {
    rmpSchoolId: 1072,
    courseSites: [{ label: 'Berkeleytime', build: berkeleytimeUrl }],
  },
};

// ─── 화면이 부르는 것 ─────────────────────────────────────────────────────────
/** 진짜 이름처럼 보이는 교수만 ("Staff" · "TBA" 빼고), 쉼표·"and" 로 여러 명 */
export function instructorNames(instructor: string | undefined): string[] {
  return [...new Set((instructor ?? '').split(/\s*[,;]\s*|\s+and\s+/i).map((x) => x.trim())
    .filter((x) => x && !/^(the\s+)?(staff|tba|tbd|instructor|faculty)$/i.test(x) && /[a-z]/i.test(x) && /\s/.test(x)))];
}

export interface CourseLink { kind: 'site' | 'rmp'; label: string; url: string; name?: string }

/** 이 수업의 바깥 링크 — 학교 설정이 주는 것만. 없는 학교는 [] (화면은 "Elsewhere" 묶음을 그리지 않는다) */
export function courseLinks(c: LinkCourse, config: Record<ID, SchoolCourseLinks> = COURSE_LINKS): CourseLink[] {
  const cfg = config[c.schoolId];
  if (!cfg) return [];
  const out: CourseLink[] = [];
  for (const s of cfg.courseSites ?? []) { const url = s.build(c); if (url) out.push({ kind: 'site', label: s.label, url }); }
  if (cfg.rmpSchoolId) for (const name of instructorNames(c.instructor)) out.push({ kind: 'rmp', label: 'Rate My Professors', name, url: `https://www.ratemyprofessors.com/search/professors/${cfg.rmpSchoolId}?q=${encodeURIComponent(name)}` });
  return out;
}
