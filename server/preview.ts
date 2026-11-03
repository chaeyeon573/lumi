/**
 * 아직 안 연 학교 미리보기 (2026-11-02 사장님 A안) — server/data/collected/<id>.orgs.json 을 요청이 올 때만 읽어 보여준다.
 * DB·메모리에 올리지 않는다. 링크로만 들어오는 페이지(/preview) — 앱 화면 어디에도 걸지 않는다.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Organization } from '@core/types';
import { parseCSV } from './scripts/csv';
import { publicLinks, recruitmentLabel, withoutEmoji } from '@core/lib/orglinks';

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const COLLECTED = path.join(DATA, 'collected');
const ID_RE = /^s_[a-z0-9]+$/;

interface Row { id: string; name: string; region: string; orgs_host?: string; courses_source?: string; catalog_url?: string; events_source?: string; tz?: string }
const rows = (): Row[] => (existsSync(path.join(DATA, 'schools-collect.csv')) ? (parseCSV(readFileSync(path.join(DATA, 'schools-collect.csv'), 'utf8')) as unknown as Row[]) : []);
const readJson = <T>(file: string): T | undefined => { try { return JSON.parse(readFileSync(file, 'utf8')) as T; } catch { return undefined; } };

export interface PreviewSchool { id: string; name: string; region: string; orgs: number; withLinks: number; courses: number; events: number; tz?: string; collectedAt?: string; probe?: { status?: string; source?: string; sampled?: number; checkedAt?: string } }
export interface PreviewOrg { id: string; name: string; type: Organization['type']; category?: string; description: string; links: { label: string; url: string }[]; logo: Organization['logo']; recruiting?: { text: string; open: boolean } }

const hasOwnLink = (o: Organization) => publicLinks(o.links).some((l) => ['Website', 'Instagram', 'Facebook'].includes(l.label));

export function previewSchools(): PreviewSchool[] {
  return rows().map((r) => {
    const f = path.join(COLLECTED, `${r.id}.orgs.json`);
    const orgs = (readJson<Organization[]>(f) ?? []).filter((o) => o.type !== 'department'); // 학교 부서·사무실은 파일에는 남기고 목록에서는 뺀다
    const probe = readJson<PreviewSchool['probe']>(path.join(COLLECTED, `${r.id}.probe.json`));
    const courses = readJson<unknown[]>(path.join(COLLECTED, `${r.id}.courses.json`))?.length ?? 0;
    const events = readJson<{ events?: unknown[] }>(path.join(COLLECTED, `${r.id}.events.json`))?.events?.length ?? 0;
    return { id: r.id, name: r.name, region: r.region, tz: r.tz || undefined, orgs: orgs.length, courses, events, withLinks: orgs.filter(hasOwnLink).length, collectedAt: existsSync(f) ? statSync(f).mtime.toISOString() : undefined, probe: probe ? { status: probe.status, source: probe.source, sampled: probe.sampled, checkedAt: probe.checkedAt } : undefined };
  });
}

export function previewSchool(id: string): { school: PreviewSchool; orgs: PreviewOrg[]; probe?: Record<string, unknown>; events: { id: string; title: string; host: string; date?: string; location?: string; url: string }[]; eventsCollectedAt?: string } | null {
  if (!ID_RE.test(id)) return null;
  const school = previewSchools().find((s) => s.id === id);
  if (!school) return null;
  const orgs = (readJson<Organization[]>(path.join(COLLECTED, `${id}.orgs.json`)) ?? []).filter((o) => o.type !== 'department').map(withoutEmoji).map((o) => ({ id: o.id, name: o.name, type: o.type, category: o.parent, description: o.description, links: publicLinks(o.links), logo: o.logo, recruiting: recruitmentLabel(o.recruitment) ?? undefined }));
  const probe = readJson<Record<string, unknown>>(path.join(COLLECTED, `${id}.probe.json`));
  const today = new Date().toISOString().slice(0, 10);
  const ev = readJson<{ collectedAt?: string; events?: { id: string; title: string; host: string; date?: string; location?: string; sourceUrl: string }[] }>(path.join(COLLECTED, `${id}.events.json`));
  const events = (ev?.events ?? []).filter((e) => !e.date || e.date >= today).slice(0, 40).map((e) => ({ id: e.id, title: e.title, host: e.host, date: e.date, location: e.location, url: e.sourceUrl }));
  return { school, orgs, probe, events, eventsCollectedAt: ev?.collectedAt };
}

/** 파일로 모아 둔 수업에서 찾기 (코드·이름) — 30개까지 */
export function previewCourses(id: string, q: string): { code: string; title: string; term?: string; meetings?: { day: number; start: string; end: string }[]; url?: string }[] | null {
  if (!ID_RE.test(id) || !rows().some((r) => r.id === id)) return null;
  const all = readJson<{ code: string; title: string; term?: string; meetings?: { day: number; start: string; end: string }[]; url?: string }[]>(path.join(COLLECTED, `${id}.courses.json`)) ?? [];
  const k = q.trim().toLowerCase();
  return all.filter((c) => !k || `${c.code} ${c.title}`.toLowerCase().includes(k)).slice(0, 30).map((c) => ({ code: c.code, title: c.title, term: c.term, meetings: c.meetings, url: c.url }));
}

/** 미국 전역 학생 채용 파일 (server/data/collected/jobs-us.json) — 대상·종류·검색어로 거른다, 200개까지 */
export function previewJobs(q: { q?: string; audience?: string; kind?: string }): { collectedAt?: string; total: number; counts: Record<string, number>; jobs: unknown[] } {
  const f = readJson<{ collectedAt?: string; jobs?: { title: string; company: string; location: string; audience: string[]; kind: string }[] }>(path.join(COLLECTED, 'jobs-us.json'));
  const all = f?.jobs ?? [];
  const k = (q.q ?? '').trim().toLowerCase();
  const hit = all.filter((j) => (!q.audience || j.audience.includes(q.audience)) && (!q.kind || j.kind === q.kind) && (!k || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(k)));
  const counts: Record<string, number> = { all: all.length, internship: all.filter((j) => j.kind === 'internship').length };
  for (const a of ['phd', 'masters', 'newgrad', 'postdoc', 'undergrad']) counts[a] = all.filter((j) => j.audience.includes(a)).length;
  return { collectedAt: f?.collectedAt, total: hit.length, counts, jobs: hit.slice(0, 200) };
}
