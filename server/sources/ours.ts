/**
 * UC Berkeley OURS 장학금(scholarships.berkeley.edu) — 공식 WordPress 페이지를 로그인 없이 읽어 장학금마다 다음 마감을 가져온다.
 * 페이지 본문에 “Next Campus Deadline: Noon, December 14, 2026” / “Next deadline: January 31, 2027, 9:00 pm” 처럼 적혀 있다.
 * 마감을 읽지 못했거나 이미 지난 장학금은 넣지 않는다(지어내지 않는다). 손으로 넣은 CSV 의 같은 페이지(url)는 이 가져오기가 대신한다.
 */
import type { Opportunity } from '@core/types';

const SITE = 'https://scholarships.berkeley.edu';
// 장학금이 아닌 안내 페이지
const NOT_SCHOLARSHIP = new Set(['search', 'scholarship-databases', 'recent-graduates-alumni', 'scholarships-by-4th-5th-year', 'scholarships-by-3rd-year', 'scholarships-by-2nd-year', 'scholarships-by-1st-year', 'test-query', 'international-and-undocumented-students', 'guidance', 'on-campus-resources', 'scholarships', 'requirements', 'news', 'home', 'people']);
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#8211;|&ndash;/g, '–').replace(/&#8217;|&rsquo;/g, '’').replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();

/** 버클리 벽시계 시각 → UTC ISO (여름·겨울 시간 모두) */
export function pacificToIso(y: number, m: number, d: number, hh: number, mm: number): string {
  const guess = Date.UTC(y, m, d, hh, mm);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return new Date(guess + (guess - shown)).toISOString();
}

/**
 * 본문에서 “(Next) (Campus) Deadline (괄호): 날짜 [시각]” — 실제 쓰이는 꼴:
 *   “Next Campus Deadline: Noon, December 14, 2026” · “Next deadline: January 31, 2027, 9:00 pm”
 *   “Next campus deadline (for 2027–2028 cohort): November 23, 2026 – 12:00 noon (Pacific)” · “Campus Deadline: December 9, 2026, Noon, 12:00 p.m.”
 * 날(日)이 없는 “October 2027” 은 읽지 않는다. 시각이 없으면 그날 23:59 (버클리)
 */
export function oursDeadline(text: string): string | undefined {
  const m = /(?:next\s+)?(?:campus\s+)?deadline\s*(?:\([^)]*\))?\s*:\s*(noon,?\s*)?([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})([^.;]{0,40})/i.exec(text);
  if (!m) return undefined;
  const month = MONTHS.findIndex((x) => x.startsWith(m[2].toLowerCase().slice(0, 3)));
  if (month < 0) return undefined;
  let hh = 23; let mm = 59;
  const tail = m[5] ?? '';
  const t = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i.exec(tail);
  if (m[1] || /\bnoon\b/i.test(tail)) { hh = 12; mm = 0; } else if (t) { hh = Number(t[1]) % 12 + (/p/i.test(t[3]) ? 12 : 0); mm = Number(t[2] ?? 0); }
  return pacificToIso(Number(m[4]), month, Number(m[3]), hh, mm);
}

export function oursPageToOpportunity(p: { slug: string; link: string; title: string; html: string }, now = new Date()): Opportunity | null {
  if (NOT_SCHOLARSHIP.has(p.slug)) return null;
  const text = plain(p.html);
  const deadline = oursDeadline(text);
  if (!deadline || Date.parse(deadline) < now.getTime()) return null;
  // 첫 문장 두어 개 — 마감 문장과 축하 문구(“UCB recipients!”)는 뺀다
  // 설명 = 장학금이 무엇인지 말하는 첫 문장 (“provides/supports/honors…”). ‘U.S.’ 의 점에서 문장을 자르지 않는다
  const sentences = text.replace(/next (?:campus )?deadline:[^.!]*[.!]?/i, '').replace(/\(opens [^)]*\)/gi, ' ').replace(/U\.S\./g, 'U§S§').replace(/\b([A-Z])\.\s(?=[A-Z])/g, '$1¶ ').split(/(?<=[.!?])\s+(?=[A-Z])/).map((x) => x.replace(/U§S§/g, 'U.S.').replace(/¶/g, '.').replace(/\s+/g, ' ').trim());
  const about = (sentences.find((x) => x.length > 40 && /\b(provides?|supports?|offers?|honou?rs?|funds?|funded|awards?|is an?|are)\b/i.test(x) && !/recipients!/i.test(x)) ?? '').slice(0, 280);
  const title = plain(p.title);
  const iso = now.toISOString();
  return {
    id: `op_ours_${p.slug}`.slice(0, 120), type: 'scholarship', schoolId: 's_berkeley', title: `${title} (Berkeley campus deadline)`, host: 'UC Berkeley OURS National Scholarships',
    description: about, cover: { emoji: '🎓', hue: 45 }, deadline,
    eligibility: 'See the scholarship page for class year, citizenship and GPA requirements', sourceUrl: p.link, sourceLabel: 'UC Berkeley OURS National Scholarships',
    tags: ['scholarship', 'national', 'campus nomination'], interests: ['study'], goals: ['scholarship'], official: true, lastVerified: iso, qna: [], reviews: [], createdAt: iso,
  };
}

/** existing: 지금 DB 의 공고 — 같은 페이지를 손으로 넣어 둔 항목이 있으면 그 id 를 이어받는다(학생들의 저장·Q&A 유지) */
export async function fetchOursScholarships(now = new Date(), existing: Pick<Opportunity, 'id' | 'sourceUrl'>[] = []): Promise<Opportunity[]> {
  const byUrl = new Map(existing.filter((o) => o.sourceUrl.startsWith(SITE)).map((o) => [o.sourceUrl.replace(/\/$/, ''), o.id]));
  const r = await fetch(`${SITE}/wp-json/wp/v2/pages?per_page=100&_fields=slug,link,title,content`, { headers: { 'user-agent': 'Mozilla/5.0 AroundU-importer', accept: 'application/json' } });
  if (!r.ok) throw new Error(`ours → ${r.status}`);
  const pages = (await r.json()) as { slug: string; link: string; title: { rendered: string }; content: { rendered: string } }[];
  return pages.map((p) => oursPageToOpportunity({ slug: p.slug, link: p.link, title: p.title.rendered, html: p.content.rendered }, now)).filter((o): o is Opportunity => !!o)
    .map((o) => { const id = byUrl.get(o.sourceUrl.replace(/\/$/, '')); return id ? { ...o, id } : o; });
}
