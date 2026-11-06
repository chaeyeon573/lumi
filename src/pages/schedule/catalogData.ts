import { useEffect, useState } from 'react';
import type { CatalogCourse } from '@core/api/types';
import { api } from '@core/api';

/**
 * S029 수업 목록 — 한 학기 전부를 한 번 받아 이 탭이 열려 있는 동안 기억한다 (다시 열면 바로).
 * 검색·거르기는 받은 목록 위에서 바로 (@core/lib/coursefinder). Lumi 학생 수는 따로, 가볍게.
 */
type Browse = { term: string; courses: CatalogCourse[] };
const browseMemo = new Map<string, Promise<Browse>>();
const termsMemo = new Map<string, Promise<{ terms: string[]; current: string }>>();

function browse(schoolId: string, term: string): Promise<Browse> {
  const k = `${schoolId}|${term}`;
  let p = browseMemo.get(k);
  if (!p) { p = api.catalog.browse(schoolId, term || undefined); browseMemo.set(k, p); p.catch(() => browseMemo.delete(k)); }
  return p;
}

/** 지금 학기와 그다음 학기만 ("Fall 2026", "Spring 2027") */
export function useCatalogTerms(schoolId: string) {
  const [v, setV] = useState<{ current: string; next?: string } | null>(null);
  useEffect(() => {
    if (!schoolId) { setV({ current: '' }); return; }
    let p = termsMemo.get(schoolId);
    if (!p) { p = api.catalog.terms(schoolId); termsMemo.set(schoolId, p); p.catch(() => termsMemo.delete(schoolId)); }
    let alive = true;
    p.then((r) => {
      if (!alive) return;
      const i = r.terms.indexOf(r.current);
      const next = i >= 0 ? r.terms[i + 1] : undefined;
      setV({ current: r.current, next: next && /^(Spring|Summer|Fall|Winter|Autumn) \d{4}$/.test(next) ? next : undefined });
    }).catch(() => alive && setV({ current: '' }));
    return () => { alive = false; };
  }, [schoolId]);
  return v;
}

export function useCatalogBrowse(schoolId: string, term: string | null) {
  const [state, setState] = useState<{ key: string; data?: Browse; counts: Record<string, number>; error?: boolean }>({ key: '', counts: {} });
  const key = `${schoolId}|${term ?? ''}`;
  useEffect(() => {
    if (!schoolId || term === null) return;
    let alive = true;
    setState((s) => (s.key === key ? s : { key, counts: {} }));
    browse(schoolId, term).then((data) => {
      if (!alive) return;
      setState((s) => ({ ...s, key, data }));
      api.catalog.counts(schoolId, data.term).then((counts) => { if (alive) setState((s) => (s.key === key ? { ...s, counts } : s)); }).catch(() => {});
    }).catch(() => alive && setState({ key, counts: {}, error: true }));
    return () => { alive = false; };
  }, [schoolId, term, key]);
  const mine = state.key === key ? state : { key, counts: {} as Record<string, number>, data: undefined, error: false };
  // 넣고 나면 내 수도 들어간다 — 수만 다시 읽는다 (목록은 그대로)
  const refreshCounts = () => { const t = mine.data?.term; if (schoolId && t) api.catalog.counts(schoolId, t).then((counts) => setState((s) => (s.key === key ? { ...s, counts } : s))).catch(() => {}); };
  return { loading: !mine.data && !mine.error, error: !!mine.error, term: mine.data?.term ?? term ?? '', courses: mine.data?.courses ?? [], counts: mine.counts, refreshCounts };
}

/** 학과 목록 (받은 학기 수업에서) — 이름 + 수업 수 */
export function departmentsOf(courses: CatalogCourse[]) {
  const m = new Map<string, number>();
  for (const c of courses) if (c.department) m.set(c.department, (m.get(c.department) ?? 0) + 1);
  return [...m].map(([name, count]) => ({ name, count }));
}
