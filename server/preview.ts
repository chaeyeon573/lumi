/**
 * 아직 안 연 학교 미리보기 (2026-11-02 사장님 A안) — server/data/collected/<id>.orgs.json 을 요청이 올 때만 읽어 보여준다.
 * DB·메모리에 올리지 않는다. 링크로만 들어오는 페이지(/preview) — 앱 화면 어디에도 걸지 않는다.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Organization } from '@core/types';
import { parseCSV } from './scripts/csv';

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const COLLECTED = path.join(DATA, 'collected');
const ID_RE = /^s_[a-z0-9]+$/;

interface Row { id: string; name: string; region: string; orgs_host?: string; courses_source?: string; catalog_url?: string; events_source?: string }
const rows = (): Row[] => (existsSync(path.join(DATA, 'schools-collect.csv')) ? (parseCSV(readFileSync(path.join(DATA, 'schools-collect.csv'), 'utf8')) as unknown as Row[]) : []);
const readJson = <T>(file: string): T | undefined => { try { return JSON.parse(readFileSync(file, 'utf8')) as T; } catch { return undefined; } };

export interface PreviewSchool { id: string; name: string; region: string; orgs: number; withLinks: number; collectedAt?: string; probe?: { status?: string; source?: string; sampled?: number; checkedAt?: string } }
export interface PreviewOrg { id: string; name: string; type: Organization['type']; category?: string; description: string; links: { label: string; url: string }[]; logo: Organization['logo'] }

const hasOwnLink = (o: Organization) => !!o.links?.some((l) => l.label !== 'Directory' && !/Engage$/.test(l.label) && l.label !== 'Penn Clubs');

export function previewSchools(): PreviewSchool[] {
  return rows().map((r) => {
    const f = path.join(COLLECTED, `${r.id}.orgs.json`);
    const orgs = readJson<Organization[]>(f) ?? [];
    const probe = readJson<PreviewSchool['probe']>(path.join(COLLECTED, `${r.id}.probe.json`));
    return { id: r.id, name: r.name, region: r.region, orgs: orgs.length, withLinks: orgs.filter(hasOwnLink).length, collectedAt: existsSync(f) ? statSync(f).mtime.toISOString() : undefined, probe: probe ? { status: probe.status, source: probe.source, sampled: probe.sampled, checkedAt: probe.checkedAt } : undefined };
  });
}

export function previewSchool(id: string): { school: PreviewSchool; orgs: PreviewOrg[]; probe?: Record<string, unknown> } | null {
  if (!ID_RE.test(id)) return null;
  const school = previewSchools().find((s) => s.id === id);
  if (!school) return null;
  const orgs = (readJson<Organization[]>(path.join(COLLECTED, `${id}.orgs.json`)) ?? []).map((o) => ({ id: o.id, name: o.name, type: o.type, category: o.parent, description: o.description, links: o.links ?? [], logo: o.logo }));
  const probe = readJson<Record<string, unknown>>(path.join(COLLECTED, `${id}.probe.json`));
  return { school, orgs, probe };
}
