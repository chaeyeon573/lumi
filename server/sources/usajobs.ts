/**
 * USAJOBS — 미국 연방정부 공식 채용 API(data.usajobs.gov/api/Search)에서 학생 채용 경로(HiringPath=student: Pathways 인턴·학생 연수직)를 가져온다.
 * 키: Railway 워커 서비스의 USAJOBS_API_KEY · USAJOBS_EMAIL(신청한 이메일, User-Agent 로 보낸다). 키가 없으면 돌지 않는다.
 * 버클리 학생이 갈 수 있는 곳만 — 캘리포니아·워싱턴 D.C.·원격·여러 지역. 마감(ApplicationCloseDate)이 지난 것은 넣지 않는다.
 */
import type { Opportunity } from '@core/types';
import { fieldOf, type Field } from '@core/lib/listings';

const API = 'https://data.usajobs.gov/api/Search';

export interface UsaJobItem {
  MatchedObjectId?: string;
  MatchedObjectDescriptor: {
    PositionID?: string; PositionTitle: string; PositionURI: string; ApplyURI?: string[];
    PositionLocationDisplay?: string; OrganizationName?: string; DepartmentName?: string;
    PositionRemuneration?: { MinimumRange?: string; MaximumRange?: string; RateIntervalCode?: string; Description?: string }[];
    PublicationStartDate?: string; ApplicationCloseDate?: string;
    UserArea?: { Details?: { JobSummary?: string } };
  };
}

const NEAR = /california|, ca\b|district of columbia|washington, dc|washington dc|remote|anywhere|multiple locations|nationwide|negotiable/i;

/** 기관으로 본 분야 — 제목으로 못 고르면. 정책·법은 정책·법 기관일 때만(모든 연방 일자리를 정책으로 넣었더니 미술 보존·계약 업무까지 Policy & Law 였다) */
function deptField(dept = '', org = ''): Field {
  const s = `${dept} ${org}`;
  if (/health|veterans|medicare|disease control|\bnih\b|food and drug/i.test(s)) return 'Health';
  if (/education|national park|smithsonian|library of congress|archives/i.test(s)) return 'Nonprofit & Education';
  if (/justice|state\b|congress|legislative|court|management and budget|attorney|federal election|government accountability|homeland|treasury|commerce|labor|small business/i.test(s)) return 'Policy & Law';
  return 'Other';
}

const money = (n?: string) => { const x = Number(n); return Number.isFinite(x) && x > 0 ? `$${x >= 1000 ? Math.round(x).toLocaleString('en-US') : x.toFixed(2)}` : ''; };
const RATE: Record<string, string> = { PA: '/yr', PH: '/hr', PM: '/mo', PW: '/wk', PD: '/day' };

export function usaJobToOpportunity(item: UsaJobItem, now = new Date()): Opportunity | null {
  const d = item.MatchedObjectDescriptor;
  const close = d.ApplicationCloseDate ? Date.parse(d.ApplicationCloseDate) : NaN;
  if (!d.PositionTitle || !d.PositionURI || !Number.isFinite(close) || close < now.getTime()) return null;
  const loc = (d.PositionLocationDisplay ?? '').trim();
  if (!NEAR.test(loc)) return null;
  const pay = d.PositionRemuneration?.[0];
  const payText = pay && money(pay.MinimumRange) ? `${money(pay.MinimumRange)}${money(pay.MaximumRange) && pay.MaximumRange !== pay.MinimumRange ? `–${money(pay.MaximumRange)}` : ''}${RATE[pay.RateIntervalCode ?? ''] ?? ''}` : '';
  const id = (d.PositionID || item.MatchedObjectId || d.PositionURI.split('/').pop() || '').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  // “Student Trainee (Budget Analysis)” — 괄호 안이 실제 일
  const inner = /\(([^)]+)\)/.exec(d.PositionTitle)?.[1] ?? '';
  const titleField = fieldOf(d.PositionTitle) !== 'Other' ? fieldOf(d.PositionTitle) : fieldOf(inner);
  const host = d.OrganizationName || d.DepartmentName || 'U.S. federal government';
  const iso = now.toISOString();
  return {
    id: `op_usajobs_${id}`.slice(0, 120), type: 'internship', title: d.PositionTitle.trim(), host,
    description: [d.DepartmentName && d.DepartmentName !== host ? d.DepartmentName : '', payText ? `Paid · ${payText}` : '', (d.UserArea?.Details?.JobSummary ?? '').replace(/\s+/g, ' ').trim().slice(0, 260)].filter(Boolean).join(' · '),
    cover: { emoji: '🏛️', hue: 220 }, deadline: new Date(close).toISOString(),
    location: loc, remote: /remote/i.test(loc), field: titleField !== 'Other' ? titleField : deptField(d.DepartmentName, d.OrganizationName),
    postedAt: d.PublicationStartDate ? new Date(Date.parse(d.PublicationStartDate)).toISOString() : undefined,
    eligibility: 'U.S. federal student hiring path (Pathways) — usually U.S. citizens enrolled in school; see the posting',
    ...(payText ? { benefit: `Paid · ${payText}` } : {}),
    sourceUrl: d.PositionURI, sourceLabel: 'USAJOBS (U.S. federal government)',
    tags: ['internship', 'federal government', 'Pathways', ...(/remote/i.test(loc) ? ['remote'] : [])], interests: ['networking'], goals: ['internship'],
    official: true, lastVerified: iso, qna: [], reviews: [], createdAt: iso,
  };
}

export async function fetchUsaJobs(key = process.env.USAJOBS_API_KEY, email = process.env.USAJOBS_EMAIL, now = new Date()): Promise<Opportunity[]> {
  if (!key || !email) throw new Error('USAJOBS_API_KEY / USAJOBS_EMAIL not set on this service');
  const out = new Map<string, Opportunity>();
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(`${API}?HiringPath=student&ResultsPerPage=500&Page=${page}`, { headers: { Host: 'data.usajobs.gov', 'User-Agent': email, 'Authorization-Key': key } });
    if (!r.ok) throw new Error(`usajobs page ${page} → ${r.status}`);
    const j = (await r.json()) as { SearchResult?: { SearchResultItems?: UsaJobItem[]; UserArea?: { NumberOfPages?: string } } };
    const items = j.SearchResult?.SearchResultItems ?? [];
    for (const it of items) { const o = usaJobToOpportunity(it, now); if (o) out.set(o.id, o); }
    const pages = Number(j.SearchResult?.UserArea?.NumberOfPages ?? 0); // 쪽 수가 안 오면 500개가 꽉 찼을 때만 다음 쪽
    if (!items.length || (pages ? page >= pages : items.length < 500)) break;
    await new Promise((res) => setTimeout(res, 300));
  }
  return [...out.values()];
}
