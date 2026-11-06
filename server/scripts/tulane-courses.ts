/**
 * Tulane 수업 시간 파일 — classschedule.tulane.edu 공개 수업 목록 (로그인 없음; 요일·시간만 보인다).
 *   npm run -s tulane-courses -- [요청 수=300]
 * 1) Search.aspx 에서 학기를 고른다(postback 한 번) → 세션에 그 학기가 정해진다.
 * 2) Results.aspx?course=<글자 A…Z> 를 열고 다음 쪽(Page$N postback)이 없을 때까지 읽는다. 이 검색은 코드 어디에든 그 글자가 있으면 주므로
 *    그 글자로 시작하는 과목만 쓴다.
 * 진행 상황: server/data/collected/s_tulane.courses-progress.json  { "<학기 코드>": ["A", "B", …끝낸 글자] }
 * 끝낸 글자의 그 학기 수업만 파일에서 바꿔 넣는다(다른 글자·학기는 그대로, 모은 데이터는 지우지 않는다). 요청 사이 0.5초.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { TULANE, tulaneResultsToCourses, tulaneHasPage } from '../sources/courses';
import { catalogTermLabels } from '@core/lib/terms';
import type { CatalogCourse } from '@core/api/types';

const DIR = path.join(import.meta.dirname, '..', 'data', 'collected');
const OUT = path.join(DIR, 's_tulane.courses.json'); const PROG = path.join(DIR, 's_tulane.courses-progress.json');
let budget = Number(process.argv[2] ?? 300);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jar = new Map<string, string>();
const dec = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function req(url: string, form?: Record<string, string>): Promise<string> {
  budget--;
  const headers: Record<string, string> = { 'user-agent': 'AroundU-class-times', cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
  if (form) { headers['content-type'] = 'application/x-www-form-urlencoded'; headers.referer = url; }
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { method: form ? 'POST' : 'GET', headers, body: form ? new URLSearchParams(form).toString() : undefined, redirect: 'manual', signal: AbortSignal.timeout(90000) });
      for (const c of r.headers.getSetCookie()) { const m = /^([^=]+)=([^;]*)/.exec(c); if (m) jar.set(m[1], m[2]); }
      if (r.status >= 300 && r.status < 400) { const loc = r.headers.get('location') ?? '/'; await sleep(500); return req(new URL(loc, url).toString()); }
      if (r.ok) { const t = await r.text(); await sleep(500); return t; }
      if (r.status < 500) throw new Error(`${r.status} ${url}`);
    } catch (e) { if (i === 2) throw e; }
    await sleep(3000);
  }
  throw new Error('unreachable');
}
/** 쪽에 있는 폼 값(숨은 칸 + 골라진 선택지)을 브라우저가 보내는 대로 모은다 */
function formOf(html: string): Record<string, string> {
  const f: Record<string, string> = {};
  for (const m of html.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) { const n = /name="([^"]+)"/.exec(m[0])?.[1]; if (n) f[dec(n)] = dec(/value="([^"]*)"/.exec(m[0])?.[1] ?? ''); }
  for (const m of html.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) { const v = /<option selected="selected" value="([^"]*)"/.exec(m[2])?.[1]; if (v !== undefined) f[dec(m[1])] = dec(v); }
  return f;
}
const post = (url: string, html: string, target: string, arg: string, extra: Record<string, string> = {}) => req(url, { ...formOf(html), __EVENTTARGET: target, __EVENTARGUMENT: arg, ...extra });

const prog: Record<string, string[]> = existsSync(PROG) ? JSON.parse(readFileSync(PROG, 'utf8')) : {};
let all: CatalogCourse[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
all = [...new Map(all.map((c) => [c.id, c])).values()]; // 같은 수업이 두 번 들어간 것 하나로
const save = () => { writeFileSync(OUT, `[\n${all.map((c) => JSON.stringify(c)).join(',\n')}\n]\n`); writeFileSync(PROG, `${JSON.stringify(prog, null, 1)}\n`); };

const search = await req(`${TULANE}/Search.aspx`);
const terms = [...search.matchAll(/<option[^>]*value="(\d{6})"[^>]*>([^<]+)/g)].map((m) => ({ code: m[1], label: `${/(Spring|Summer|Fall|Winter)/.exec(m[2])?.[1]} ${/(20\d{2})/.exec(m[2])?.[1]}` }));
const want = catalogTermLabels();
const pick = want.map((l) => terms.find((t) => t.label === l)).filter((t): t is { code: string; label: string } => !!t);
if (!pick.length) throw new Error(`tulane: none of ${want.join(', ')} in the term list`);
let did = 0;
for (const t of pick) {
  const done = new Set(prog[t.code] ?? []);
  const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter((l) => !done.has(l));
  if (!letters.length) continue;
  if (budget < 40) break;
  const s = await req(`${TULANE}/Search.aspx`);
  await post(`${TULANE}/Search.aspx`, s, 'ctl00$MenuContent$ddlterm', '', { 'ctl00$MenuContent$ddlterm': t.code });
  for (const L of letters) {
    if (budget < 40) break; // 큰 글자 하나(쪽 30개 남짓)를 끝낼 만큼 남았을 때만 시작
    const url = `${TULANE}/Results.aspx?course=${L}`;
    let page = await req(url); const got: CatalogCourse[] = []; let blocks = 0;
    const termOk = new RegExp(`getCourseDesc\\('${t.code}'`).test(page) || !/getCourseDesc\('/.test(page);
    if (!termOk) throw new Error(`tulane: session is not on ${t.code} (page shows another term)`);
    got.push(...tulaneResultsToCourses(page, t.label)); blocks += (page.match(/getCourseDesc\('/g) ?? []).length;
    for (let n = 2; tulaneHasPage(page, n) && n < 200; n++) { page = await post(url, page, 'ctl00$MainContent$rprResults', `Page$${n}`); got.push(...tulaneResultsToCourses(page, t.label)); }
    // course=A 는 코드 어디에든 A 가 있는 과목을 다 준다(EDUC, TIDE …) — 그 글자로 시작하는 것만 이 글자 몫으로 쓴다
    const uniqGot = [...new Map(got.filter((c) => c.code.startsWith(L)).map((c) => [c.id, c])).values()];
    // 쪽에 수업 칸이 있는데 하나도 못 읽었으면 읽는 코드가 틀린 것 — 끝냄으로 적지 않고 멈춘다 (2026-11-06 첫 시도에서 0개로 18글자를 끝냄 처리했다)
    if (!got.length && blocks > 0) throw new Error(`tulane: ${blocks} course blocks under ${L} but none read - reader needs fixing`);
    // 같은 과목에 분반이 여러 쪽에 걸쳐 있으면 (Sec NN) 표시를 다시 맞춘다
    for (const c of uniqGot) { const many = uniqGot.filter((o) => o.code === c.code).length > 1; const base = c.title.replace(/ \(Sec [^)]+\)$/, ''); c.title = many ? `${base} (Sec ${c.id.split('_').pop()?.toUpperCase()})` : base; }
    all = [...all.filter((c) => !(c.termCode === t.code && c.code.startsWith(L))), ...uniqGot];
    done.add(L); prog[t.code] = [...done].sort(); did++; save();
    console.log(`  ${t.label} ${L}: ${uniqGot.length} classes with times (budget left ${budget})`);
  }
}
console.log(`tulane-courses: ${did} letters this run, ${all.length} classes in file; ${pick.map((t) => `${t.label} ${(prog[t.code] ?? []).length}/26`).join(', ')}`);
