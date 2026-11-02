/**
 * 학교별 "지원 마감 달력" CSV → opportunities (Community › Opportunities 에 마감 순으로 보인다)
 *
 *   npm run import:opportunities -- server/data/opportunities-berkeley.csv
 *
 * CSV 헤더:
 *   school_id,type,title,host,deadline,date,eligibility,benefit,description,url,source_label,tags,goals,official
 *   - type: event | club | lab | internship | scholarship | hackathon | startup | activity | exchange
 *   - deadline / date: YYYY-MM-DD. 모르면 비워 둔다 — 지어내지 말고 description 에 "보통 3월" 처럼 적는다
 *   - id 는 school_id + title 로 만들어지므로 같은 제목을 다시 넣으면 갱신된다 (저장·Q&A·후기는 유지)
 *   - status=closed 인 줄은 앱에서 내린다 (마감됐거나 다음 회차 날짜가 없는 것 — 줄을 지우기만 하면 DB 에 남는다)
 *   - PRUNE_DEMO=1 이면 CSV 에 있는 학교의 데모 시드 공고(링크가 example.com 이거나 없는 것)와 그에 딸린 저장 기록을 지운다
 */
import { pacificToIso } from '../sources/ours';
import { readFileSync } from 'node:fs';
import type { Opportunity, OpportunityType, Goal } from '@core/types';
import { createStore, emptySnapshot } from '../store';
import { parseCSV } from './csv';

const file = process.argv[2];
if (!file) { console.error('usage: npm run import:opportunities -- <opportunities.csv>'); process.exit(1); }

const COVER: Record<OpportunityType, { emoji: string; hue: number }> = {
  event: { emoji: '📅', hue: 200 }, club: { emoji: '🎯', hue: 150 }, lab: { emoji: '🔬', hue: 175 }, internship: { emoji: '💼', hue: 215 },
  scholarship: { emoji: '🎓', hue: 45 }, hackathon: { emoji: '💡', hue: 230 }, startup: { emoji: '🚀', hue: 265 }, activity: { emoji: '🏃', hue: 120 }, exchange: { emoji: '✈️', hue: 190 },
};
const TYPES = Object.keys(COVER) as OpportunityType[];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
// 그날 23:59 버클리 시각 — ‘-07:00’ 고정이면 겨울(11월~3월, UTC−8)엔 밤 10:59 에 닫혔다
// 날짜만 쓰면 그날 23:59, 마감 시각이 따로 있으면 ‘YYYY-MM-DDTHH:MM’(버클리 시각) — 예: 동부 5 PM 마감 = 2026-11-04T14:00
const iso = (s: string) => {
  if (!s) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(s);
  if (!m) throw new Error(`bad date (YYYY-MM-DD or YYYY-MM-DDTHH:MM Pacific): ${s}`);
  return pacificToIso(Number(m[1]), Number(m[2]) - 1, Number(m[3]), m[4] ? Number(m[4]) : 23, m[5] ? Number(m[5]) : 59);
};

const store = createStore();
await store.init();
const snap = (await store.loadSnapshot()) ?? emptySnapshot();
const existing = new Map(snap.opportunities.map((o) => [o.id, o]));
const now = new Date().toISOString();

const rows = parseCSV(readFileSync(file, 'utf8'));
const out: Opportunity[] = [];
const retired: string[] = [];
for (const r of rows) {
  // school_id 가 비면 모든 학교에 보이는 공고 (NSF GRFP 같은 전국 펠로우십)
  if (!r.title || !r.url) { console.warn('skip row (title/url required):', r.title); continue; }
  const type = (TYPES.includes(r.type as OpportunityType) ? r.type : 'event') as OpportunityType;
  const id = `op_${r.school_id ? r.school_id.replace('s_', '') : 'all'}_${slug(r.title)}`;
  if ((r.status ?? '').trim().toLowerCase() === 'closed') { if (existing.has(id)) retired.push(id); continue; }
  const prev = existing.get(id);
  out.push({
    id, type, title: r.title, host: r.host || r.source_label || '', description: r.description || '',
    cover: prev?.cover ?? COVER[type],
    deadline: iso(r.deadline), date: iso(r.date),
    eligibility: r.eligibility || '', benefit: r.benefit || undefined,
    sourceUrl: r.url, sourceLabel: r.source_label || new URL(r.url).hostname,
    tags: list(r.tags ?? ''), interests: [], goals: list(r.goals ?? '') as Goal[],
    schoolId: r.school_id || undefined, official: r.official === '1' || /^true$/i.test(r.official ?? ''),
    lastVerified: now, qna: prev?.qna ?? [], reviews: prev?.reviews ?? [], createdAt: prev?.createdAt ?? now,
  });
}
console.log(`${out.length} opportunities (${out.filter((o) => existing.has(o.id)).length} updated, ${out.filter((o) => !o.deadline && !o.date).length} without a confirmed date)`);
const schools = new Set(out.map((o) => o.schoolId));
const demo = process.env.PRUNE_DEMO === '1'
  ? snap.opportunities.filter((o) => o.schoolId && schools.has(o.schoolId) && !out.some((n) => n.id === o.id) && (!o.sourceUrl || /(^|[./])example\.com(\/|$)/.test(o.sourceUrl) || /instagram\.com\/example/.test(o.sourceUrl)))
  : [];
const demoIds = new Set([...demo.map((o) => o.id), ...retired]);
if (retired.length) console.log(`closed: ${retired.length} (${retired.map((id) => existing.get(id)?.title).join(' · ')})`);
const intents = snap.opportunityIntents.filter((i) => demoIds.has(i.opportunityId)).map((i) => i.id);
if (demo.length) console.log(`prune demo: ${demo.length} opportunities (${demo.map((o) => o.title).join(' · ')}), ${intents.length} intents`);
await store.applyPatch({ opportunities: out, removed: { opportunities: [...demoIds], opportunityIntents: intents } });
console.log('DB 반영 완료');
process.exit(0);
