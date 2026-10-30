/**
 * Berkeley Study Abroad — 공식 프로그램 목록(studyabroad.berkeley.edu/explore/programs, 로그인 없음)을 쪽마다 읽는다.
 * 줄 하나 = 프로그램 하나의 한 학기(지원 시작일·마감일·지역·후원 기관·학년·GPA). 마감이 없거나 지난 줄은 넣지 않는다.
 * 같은 줄에 마감이 두 번 적혀 있고 하루씩 다를 때가 있다(표 칸 01/13, 설명 01/14) — 학생이 놓치지 않게 더 이른 날을 쓴다.
 */
import type { Opportunity } from '@core/types';
import { pacificToIso } from './ours';

const SITE = 'https://studyabroad.berkeley.edu';
const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
const cell = (row: string, name: string) => { const m = new RegExp(`views-field-${name}[^>]*>([\\s\\S]*?)</td>`).exec(row); return m ? plain(m[1]) : ''; };
const mdy = (s: string) => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? { y: Number(m[3]), m: Number(m[1]) - 1, d: Number(m[2]) } : undefined; };
const field = (text: string, label: string) => new RegExp(`${label}:\\s*(.+?)(?=\\s+(?:Region|City|GPA|Class Level|Prerequisites|Language|Term Options|Term|Sponsor|Adviser|Application Open|Deadline):|\\s+Apply$|$)`).exec(text)?.[1]?.trim();

export function parseStudyAbroadRows(html: string, now = new Date()): Opportunity[] {
  const out: Opportunity[] = [];
  const iso = now.toISOString();
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    // 프로그램 링크는 제목 칸 안에 — 버클리 쪽(/program/…) 또는 UCEAP 같은 바깥 공식 사이트. 아이콘(svg)·# 은 아니다
    const titleHtml = /views-field-title[^>]*>([\s\S]*?)<\/td>/.exec(row)?.[1] ?? '';
    const href = [...titleHtml.matchAll(/href="([^"#]+)"/g)].map((x) => x[1]).find((u) => !/\/themes\/|\.svg/.test(u));
    if (!href) continue;
    const url = href.startsWith('http') ? href : SITE + href;
    const text = cell(row, 'title');
    const name = text.split(/\s+Region:/)[0].replace(/\(opens new (site|window)\)/gi, '').replace(/\s+/g, ' ').trim();
    const term = cell(row, 'field-term') || field(text, 'Term') || '';
    // 마감 두 곳(표 칸·설명) 중 이른 날, 그날 23:59 버클리
    const dates = [mdy(cell(row, 'field-deadline')), mdy(field(text, 'Deadline') ?? '')].filter((x): x is NonNullable<typeof x> => !!x).map((x) => pacificToIso(x.y, x.m, x.d, 23, 59)).sort();
    const deadline = dates[0];
    // “Find an Independent Program / Planned Leave of Absence” 는 프로그램이 아니라 휴학 신청 안내다
    if (!name || /^find an independent program/i.test(name) || !deadline || Date.parse(deadline) < now.getTime()) continue;
    const open = mdy(cell(row, 'field-app-open-date') || field(text, 'Application Open') || '');
    const sponsor = cell(row, 'field-sponsor') || field(text, 'Sponsor') || 'Berkeley Study Abroad';
    const region = field(text, 'Region'); const city = field(text, 'City'); const gpa = field(text, 'GPA'); const level = field(text, 'Class Level'); const lang = field(text, 'Language');
    const slug = new URL(url).pathname.replace(/^\/(program|programs)\//, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
    out.push({
      id: `op_sa_${slug}_${term.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`.slice(0, 120), type: 'exchange', schoolId: 's_berkeley',
      title: `${name}${term ? ` (${term})` : ''}`, host: sponsor,
      description: [city && region ? `${city} · ${region}` : region, lang ? `Taught in ${lang}` : '', open && Date.UTC(open.y, open.m, open.d) > now.getTime() ? `Applications open ${open.m + 1}/${open.d}/${open.y}` : ''].filter(Boolean).join(' · '),
      cover: { emoji: '✈️', hue: 190 }, deadline,
      eligibility: [level ? `Class level: ${level}` : '', gpa ? `GPA ${gpa}` : ''].filter(Boolean).join(' · ') || 'See the program page',
      sourceUrl: url, sourceLabel: 'Berkeley Study Abroad', tags: ['study abroad', ...(term ? [term.toLowerCase()] : []), ...(region ? [region] : [])],
      interests: ['study'], goals: [], official: true, lastVerified: iso, qna: [], reviews: [], createdAt: iso,
    });
  }
  return out;
}

export async function fetchStudyAbroad(now = new Date(), maxPages = 20): Promise<Opportunity[]> {
  const all: Opportunity[] = []; const seen = new Set<string>();
  for (let page = 0; page < maxPages; page++) {
    const r = await fetch(`${SITE}/explore/programs?page=${page}`, { headers: { 'user-agent': 'Mozilla/5.0 AroundU-importer' } });
    if (!r.ok) throw new Error(`studyabroad page ${page} → ${r.status}`);
    const html = await r.text();
    if (!/views-field-title/.test(html)) break; // 마지막 쪽 너머
    const before = all.length; let listed = 0;
    for (const o of parseStudyAbroadRows(html, now)) { listed++; if (!seen.has(o.id)) { seen.add(o.id); all.push(o); } }
    if (listed && all.length === before) break; // 같은 쪽이 되풀이되면 끝
    await new Promise((res) => setTimeout(res, 200));
  }
  return all;
}
