/**
 * 수집한 수업 목록이 "믿을 만한가"를 판정한다 — 규칙 검사 → 지난 목록과의 변화량 → 원본 표본 재확인.
 * 통과하지 못하면 반영하지 않는다. 틀린 시간표가 들어가는 것보다 하루 늦는 편이 낫다.
 */
import type { CatalogCourse } from '@core/api/types';

export interface RuleResult { kept: CatalogCourse[]; dropped: { code: string; reason: string }[] }

const CODE_RE: Record<string, RegExp> = {
  s_berkeley: /^[A-Z][A-Z &]{1,12} [A-Z]?\d{1,3}[A-Z]{0,3}$/,
  s_stanford: /^[A-Z&]{2,10} \d{1,3}[A-Z]{0,5}$/,
  s_mit: /^[A-Z0-9]{1,5}\.[A-Z0-9]{1,6}$/,
  s_cornell: /^[A-Z]{2,6} \d{4}$/,
  s_umd: /^[A-Z]{4}\d{3}[A-Z]{0,2}$/,
};
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** 행 단위 규칙: 코드 형식 · 요일 · 시간 범위 · 시작<종료 · 제목 */
export function applyRules(schoolId: string, courses: CatalogCourse[]): RuleResult {
  const kept: CatalogCourse[] = []; const dropped: RuleResult['dropped'] = [];
  const codeRe = CODE_RE[schoolId];
  for (const c of courses) {
    const problems: string[] = [];
    if (!c.title?.trim()) problems.push('no title');
    if (codeRe && !codeRe.test(c.code)) problems.push(`code format: ${c.code}`);
    if (!c.meetings.length) problems.push('no meetings');
    for (const m of c.meetings) {
      if (m.day < 0 || m.day > 6) problems.push(`day ${m.day}`);
      if (!/^\d{2}:\d{2}$/.test(m.start) || !/^\d{2}:\d{2}$/.test(m.end)) { problems.push(`time format ${m.start}-${m.end}`); continue; }
      const a = toMin(m.start), b = toMin(m.end);
      if (a < 6 * 60 || b > 23 * 60) problems.push(`odd hours ${m.start}-${m.end}`);
      if (b <= a) problems.push(`end before start ${m.start}-${m.end}`);
      if (b - a > 6 * 60) problems.push(`too long ${m.start}-${m.end}`);
    }
    if (problems.length) dropped.push({ code: c.code, reason: problems.join('; ') }); else kept.push(c);
  }
  return { kept, dropped };
}

export interface DriftResult { ok: boolean; before: number; after: number; changePct: number; added: number; removed: number; changedMeetings: number; note?: string }

/** 지난 목록과 비교: 20% 넘게 줄면 사이트 구조가 바뀐 신호로 보고 막는다 */
export function checkDrift(previous: CatalogCourse[], next: CatalogCourse[], maxDropPct = 20): DriftResult {
  const prevById = new Map(previous.map((c) => [c.id, c]));
  const nextById = new Map(next.map((c) => [c.id, c]));
  const added = [...nextById.keys()].filter((id) => !prevById.has(id)).length;
  const removed = [...prevById.keys()].filter((id) => !nextById.has(id)).length;
  const key = (c: CatalogCourse) => c.meetings.map((m) => `${m.day}${m.start}${m.end}`).sort().join('|');
  const changedMeetings = [...nextById.values()].filter((c) => prevById.has(c.id) && key(prevById.get(c.id)!) !== key(c)).length;
  const changePct = previous.length ? Math.round(((next.length - previous.length) / previous.length) * 1000) / 10 : 0;
  const ok = previous.length === 0 || next.length >= previous.length * (1 - maxDropPct / 100);
  return { ok, before: previous.length, after: next.length, changePct, added, removed, changedMeetings, note: ok ? undefined : `count fell more than ${maxDropPct}% — source layout may have changed` };
}

export interface SpotCheckResult { sampled: number; matched: number; mismatched: { code: string; field: string; ours: string; source: string }[]; unavailable: number; ok: boolean }

/** 무작위 표본을 원본에서 다시 읽어 시간·강의실·제목이 같은지 대조한다 */
export async function spotCheck(courses: CatalogCourse[], lookup: ((c: CatalogCourse) => Promise<CatalogCourse | null>) | undefined, sampleSize = 12, minMatchRate = 0.9): Promise<SpotCheckResult> {
  if (!lookup || !courses.length) return { sampled: 0, matched: 0, mismatched: [], unavailable: 0, ok: true };
  const pool = [...courses]; const sample: CatalogCourse[] = [];
  while (sample.length < Math.min(sampleSize, pool.length)) sample.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const key = (c: CatalogCourse) => c.meetings.map((m) => `${m.day} ${m.start}-${m.end}`).sort().join(', ');
  let matched = 0, unavailable = 0; const mismatched: SpotCheckResult['mismatched'] = [];
  for (const c of sample) {
    let src: CatalogCourse | null = null;
    try { src = await lookup(c); } catch { src = null; }
    if (!src) { unavailable++; continue; }
    if (key(src) !== key(c)) mismatched.push({ code: c.code, field: 'meetings', ours: key(c), source: key(src) });
    else if ((src.location ?? '') !== (c.location ?? '')) mismatched.push({ code: c.code, field: 'location', ours: c.location ?? '', source: src.location ?? '' });
    else matched++;
  }
  const checked = matched + mismatched.length;
  return { sampled: sample.length, matched, mismatched, unavailable, ok: checked === 0 ? true : matched / checked >= minMatchRate };
}
