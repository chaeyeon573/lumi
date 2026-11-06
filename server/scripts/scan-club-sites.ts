/**
 * 동아리 웹사이트 한 번씩 열어 보기 — 도메인이 남에게 넘어가 도박·불법 영상 사이트가 된 것(isHijackedPage)만 골라 낸다.
 *   npm run -s scan-club-sites -- [사이트 수=1500]
 * 2026-11-06: 무작위 검사 10개 중 2개가 넘어간 도메인이었다(W&M TBD Theatre, BU Alpha Phi Omega). 주간 수집의 웹사이트 읽기는
 * 인스타·페북이 없는 동아리만 열어서, 나머지는 한 번도 열지 않았다.
 * - 사이트마다 한 번(서로 다른 사이트라 한 곳에 몰리지 않는다), 동시에 6개, 15초 제한.
 * - 찾은 링크는 동아리에서 빼서 <id>.deadlinks.json 에 남긴다(지우지 않는다). 안 열리는 사이트는 건드리지 않는다(주간 끊긴 링크 검사가 맡는다).
 * 진행 상황: server/data/collected/site-scan-progress.json { "<url>": "<확인한 날>" } — 다음 실행은 안 연 것부터.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { isHijackedPage } from '../sources/sitesocial';
import type { Organization } from '@core/types';

const DIR = path.join(import.meta.dirname, '..', 'data', 'collected');
const PROG = path.join(DIR, 'site-scan-progress.json');
const budget = Number(process.argv[2] ?? 1500);
const today = new Date().toISOString().slice(0, 10);
const prog: Record<string, string> = existsSync(PROG) ? JSON.parse(readFileSync(PROG, 'utf8')) : {};

const files = readdirSync(DIR).filter((f) => f.endsWith('.orgs.json'));
const todo: { file: string; url: string }[] = [];
const seen = new Set<string>();
for (const f of files) for (const o of JSON.parse(readFileSync(path.join(DIR, f), 'utf8')) as Organization[]) for (const l of o.links ?? []) {
  if (l.label !== 'Website' || seen.has(l.url) || prog[l.url]) continue;
  seen.add(l.url); todo.push({ file: f, url: l.url });
}
const batch = todo.slice(0, budget);
const hits = new Map<string, string>(); // url → title
async function title(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Lumi-campus-directory/1.0)', accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (!r.ok || !/html/i.test(r.headers.get('content-type') ?? '')) return null;
    return (await r.text()).slice(0, 200_000);
  } catch { return null; }
}
let i = 0, opened = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < batch.length) {
    const { url } = batch[i++];
    const html = await title(url); prog[url] = today;
    if (html === null) continue; opened++;
    if (isHijackedPage(html)) hits.set(url, (/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? '').trim().slice(0, 120));
  }
}));
// 찾은 링크를 동아리에서 빼고 deadlinks 에 남긴다
for (const f of files) {
  const file = path.join(DIR, f); const orgs = JSON.parse(readFileSync(file, 'utf8')) as Organization[];
  const moved: { orgId: string; url: string; checkedAt: string; note: string }[] = [];
  for (const o of orgs) for (const l of o.links ?? []) if (l.label === 'Website' && hits.has(l.url)) moved.push({ orgId: o.id, url: l.url, checkedAt: today, note: `domain now shows an unrelated site: "${hits.get(l.url)}"` });
  if (!moved.length) continue;
  for (const o of orgs) o.links = (o.links ?? []).filter((l) => !(l.label === 'Website' && hits.has(l.url)));
  writeFileSync(file, `${JSON.stringify(orgs, null, 1)}\n`);
  const df = file.replace('.orgs.json', '.deadlinks.json'); const old = existsSync(df) ? JSON.parse(readFileSync(df, 'utf8')) : [];
  writeFileSync(df, `${JSON.stringify([...old, ...moved], null, 1)}\n`);
  for (const m of moved) console.log(`  ${f.replace('.orgs.json', '')} ${m.orgId} ${m.url} — ${hits.get(m.url)}`);
}
writeFileSync(PROG, `${JSON.stringify(prog, null, 1)}\n`);
console.log(`scan-club-sites: ${batch.length} sites tried, ${opened} opened, ${hits.size} taken over; ${todo.length - batch.length} left`);
