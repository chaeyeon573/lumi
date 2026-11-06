/**
 * 강의에 딸린 토론·랩 섹션 (Berkeley DIS · LAB …) — 학생이 수업을 시간표에 넣을 때 그 수업 것만 읽어 온다.
 * (Stanford·MIT 처럼 목록 원본에 섹션이 같이 오는 학교는 가져올 때 CatalogCourse.sections 에 넣어 두고 그대로 돌려준다.)
 *
 * 원본: classes.berkeley.edu/sections/associated/<node id> — 수업 페이지가 "Associated Sections" 칸을 채울 때 부르는 주소.
 *   섹션마다 "COMPSCI 61A 118" · "118 DIS" · Days · Time · Place 가 한 덩어리로 온다.
 *   node id 는 목록 가져오기가 저장해 둔 sourceId, 없으면(옛 목록) 수업 페이지의 data-section-id 에서 읽는다.
 * 전체 가져오기에 넣지 않은 이유: 수업마다 요청이 하나씩 늘어 하루 가져오기가 두 배가 된다. 학생이 실제로 넣는 수업만 읽으면 충분하다.
 *
 * 규칙
 *   - 학교가 시간을 정하지 않은 섹션(시간 없음)과 자리 채우기용 섹션(999 · 일요일 0시 1분)은 뺀다 — 지어내지 않는다
 *   - 같은 수업은 6시간 기억한다 (못 읽은 결과는 10분). 같은 순간에 여러 명이 부르면 요청은 한 번
 */
import type { CatalogCourse, CatalogDetails, CatalogSection } from '@core/api/types';
import { parseDays, parseTime } from './scripts/csv';

const BERKELEY_PUBLIC = 'https://classes.berkeley.edu';
const decode = (x: string) => x.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&nbsp;/g, ' ');
const text = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const KIND_ORDER = ['DIS', 'LAB', 'REC', 'SEM', 'STD', 'WBD', 'WBL'];

/** /sections/associated/<id> 의 HTML → 섹션들 (시간이 있는 진짜 섹션만, 종류·번호 순) */
export function parseAssociatedSections(html: string): CatalogSection[] {
  const out: CatalogSection[] = [];
  for (const block of html.split('<div class="detail-class-associated-sections-flex">').slice(1)) {
    const head = /<div>\s*([0-9A-Z]+)\s+([A-Z]{3})\s*<\/div>/.exec(block);
    if (!head) continue;
    const [, number, kind] = head;
    if (/^9{3}/.test(number)) continue; // 자리 채우기용 (999 · 999L)
    const meetings: CatalogSection['meetings'] = [];
    let location: string | undefined;
    // 요일·시간 쌍이 여러 번 나올 수 있다 (화·목 시간이 다른 랩 등)
    for (const part of block.split(/<span class="detail-label">Days:<\/span>/).slice(1)) {
      const days = text(part.split('</div>')[0]);
      const time = /<span class="detail-label">Time:<\/span>([\s\S]*?)<\/div>/.exec(part)?.[1];
      const tm = time && text(time).match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
      if (!days || !tm) continue;
      const start = parseTime(tm[1]), end = parseTime(tm[2]);
      if (toMin(end) - toMin(start) < 10) continue; // "12:00 am - 12:01 am" 같은 자리표시
      location ||= text(/<span class="detail-label">Place:<\/span>([\s\S]*?)<\/div>/.exec(part)?.[1] ?? '') || undefined;
      for (const day of parseDays(days)) meetings.push({ day, start, end });
    }
    if (!meetings.length) continue;
    out.push({ label: `${kind} ${number}`, kind, meetings, location });
  }
  const rank = (k: string) => (KIND_ORDER.indexOf(k) + 1 || 99);
  return out.sort((a, b) => rank(a.kind) - rank(b.kind) || a.label.localeCompare(b.label, 'en', { numeric: true }));
}

/** 수업 페이지에서 Associated Sections 칸의 node id */
export const associatedIdFromPage = (html: string): string | undefined =>
  /data-element="associated_sections"[\s\S]{0,200}?data-section-id="(\d+)"/.exec(html)?.[1];

type Fetch = (url: string) => Promise<string>;
const defaultFetch: Fetch = async (url) => {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 Lumi-sections' }, signal: AbortSignal.timeout(SECTION_FETCH_MS) });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
};

/** 학생이 기다리는 동안 읽는다 — 예전 30초는 너무 길었다 (AI 사용자 테스트: "거의 20초 기다림"). 화면은 기다리지 않고 강의부터 넣게 해 준다 */
export const SECTION_FETCH_MS = 8_000;
const KEEP_MS = 6 * 3_600_000;
const RETRY_MS = 10 * 60_000;

/** 수업 하나씩 그때 읽는 것을 기억한다 — 6시간 (못 읽은 결과는 10분). 같은 순간에 여러 명이 부르면 요청은 한 번 */
function memoized<T>(what: string, load: (c: CatalogCourse) => Promise<T>, empty: () => T, now: () => number) {
  const memo = new Map<string, { at: number; ok: boolean; value: T }>();
  const inflight = new Map<string, Promise<T>>();
  return (c: CatalogCourse): Promise<T> => {
    const hit = memo.get(c.id);
    if (hit && now() - hit.at < (hit.ok ? KEEP_MS : RETRY_MS)) return Promise.resolve(hit.value);
    const running = inflight.get(c.id);
    if (running) return running;
    const p = load(c)
      .then((value) => { memo.set(c.id, { at: now(), ok: true, value }); return value; })
      .catch((e) => { console.warn(`[${what}] ${c.code} ${c.term}: ${(e as Error).message}`); const value = empty(); memo.set(c.id, { at: now(), ok: false, value }); return value; })
      .finally(() => inflight.delete(c.id));
    inflight.set(c.id, p);
    return p;
  };
}

/** 수업 하나의 딸린 섹션 — Berkeley 만. 다른 학교·못 읽음은 빈 목록 */
export function createSectionReader(get: Fetch = defaultFetch, now = () => Date.now()) {
  const read = memoized<CatalogSection[]>('sections', async (c) => {
    let id = c.sourceId;
    if (!id) {
      if (!c.url?.startsWith(`${BERKELEY_PUBLIC}/content/`)) return [];
      id = associatedIdFromPage(await get(c.url));
      if (!id) return [];
    }
    return parseAssociatedSections(await get(`${BERKELEY_PUBLIC}/sections/associated/${id}`));
  }, () => [], now);
  return async (c: CatalogCourse): Promise<CatalogSection[]> => {
    if (c.sections) return c.sections; // 가져올 때 같이 받아 둔 학교 (Stanford·MIT)
    if (c.schoolId !== 's_berkeley') return [];
    return read(c);
  };
}

// ─── 수업 페이지: 수업 번호 · 수강 조건 · Class Notes (S029 펼친 줄의 핑크 한 줄, S030 수업 정보) ─────────
const lines = (html: string) => decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(li|p|div)>/gi, '\n').replace(/<[^>]+>/g, ' '))
  .split('\n').map((x) => x.replace(/\s+/g, ' ').trim().replace(/^[-•*]\s*/, '')).filter(Boolean);

/** classes.berkeley.edu/content/… 한 장 → 학교가 적어 둔 것만. 없는 칸은 비운다 */
export function parseClassPage(html: string): CatalogDetails {
  const out: CatalogDetails = {};
  const num = /<span>\s*Class #:\s*<\/span>\s*(\d{4,6})/.exec(html)?.[1];
  if (num) out.classNumber = num;
  const rules = /id="section-rules-requirements"[\s\S]*?<div class="section-content">([\s\S]*?)<\/section>/.exec(html)?.[1] ?? '';
  const req = /<h3>\s*Requisites\s*<\/h3>\s*<ul>([\s\S]*?)<\/ul>/.exec(rules)?.[1];
  if (req) { const r = lines(req).map((x) => x.slice(0, 200)); if (r.length) out.requisites = r.slice(0, 6); }
  const notesSec = /id="section-class-notes"[\s\S]*?<div class="section-content">([\s\S]*?)<\/section>/.exec(html)?.[1] ?? '';
  const full = /<div class="full">([\s\S]*?)<a [^>]*summary-toggle/.exec(notesSec)?.[1] ?? notesSec.replace(/<a [^>]*summary-toggle[\s\S]*?<\/a>/g, '');
  const n = lines(full).map((x) => x.slice(0, 400));
  if (n.length) out.notes = n.slice(0, 12);
  return out;
}

/** 수업 페이지 읽기 — Berkeley 수업 페이지 주소가 있을 때만. 다른 학교·못 읽음은 {} */
export function createDetailsReader(get: Fetch = defaultFetch, now = () => Date.now()) {
  const read = memoized<CatalogDetails>('details', async (c) => parseClassPage(await get(c.url!)), () => ({}), now);
  return async (c: CatalogCourse): Promise<CatalogDetails> => {
    if (c.schoolId !== 's_berkeley' || !c.url?.startsWith(`${BERKELEY_PUBLIC}/content/`)) return c.classNumber ? { classNumber: c.classNumber } : {};
    const d = await read(c);
    return c.classNumber && !d.classNumber ? { ...d, classNumber: c.classNumber } : d;
  };
}
