/**
 * 학기(term) — 수업 목록은 학기마다 따로 있고, 학생은 "지금 듣는 학기" 시간표를 먼저 본다.
 *
 * 정규 학기만 다룬다 (봄·가을). 여름 계절학기는 선택이라 시간표 기본값으로 삼지 않는다.
 *   1~5월  → 봄 학기 진행 중 (Spring Y)
 *   6~12월 → 가을 학기 (8월 말 개강 · 6~7월 방학에는 다가오는 가을을 본다)
 * 수업 목록은 지금 학기와 다음 학기를 같이 가져온다 (10월: Fall 2026 + Spring 2027).
 * 라벨은 "Fall 2026" 형식 하나로 맞춘다 — 학교마다 다른 원본 코드(FA26, 202608, "2026 Fall")는 CatalogCourse.termCode 에 둔다.
 */

export interface Term { season: 'Spring' | 'Fall'; year: number }

/** 날짜 기준 진행 중인 정규 학기 */
export function currentTerm(now: Date = new Date()): Term {
  const m = now.getMonth() + 1;
  return m <= 5 ? { season: 'Spring', year: now.getFullYear() } : { season: 'Fall', year: now.getFullYear() };
}

/** 바로 다음 정규 학기 (Fall Y → Spring Y+1, Spring Y → Fall Y) */
export function nextTerm(t: Term): Term {
  return t.season === 'Fall' ? { season: 'Spring', year: t.year + 1 } : { season: 'Fall', year: t.year };
}

export const termLabel = (t: Term) => `${t.season} ${t.year}`;

/** 가져올 학기 라벨: [지금 학기, 다음 학기] */
export function catalogTermLabels(now: Date = new Date()): [string, string] {
  const cur = currentTerm(now);
  return [termLabel(cur), termLabel(nextTerm(cur))];
}

/** "Spring 2027" → "sp27" (다음 학기 수업 id 꼬리표) */
export function termSlug(label: string): string {
  const m = /^(\w+)\s+(\d{4})$/.exec(label.trim());
  return m ? `${m[1].slice(0, 2).toLowerCase()}${m[2].slice(2)}` : label.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const SEASONS: Record<string, string> = { SP: 'Spring', SU: 'Summer', FA: 'Fall', WI: 'Winter' };
/**
 * 저장된 term 값을 "Fall 2026" 형식으로. 원본 코드 그대로 저장된 옛 행도 읽을 수 있게 아는 모양만 바꾼다:
 *   "Fall 2026" 그대로 · "2026 Fall" → "Fall 2026" · "FA26" → "Fall 2026". 모르는 코드(202630 등)는 그대로 둔다.
 */
export function normalizeTermLabel(raw: string): string {
  const s = raw.trim();
  if (/^(Spring|Summer|Fall|Winter|Autumn) \d{4}$/.test(s)) return s;
  let m = /^(\d{4})\s+(Spring|Summer|Fall|Winter|Autumn)$/i.exec(s);
  if (m) return `${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()} ${m[1]}`;
  m = /^(SP|SU|FA|WI)(\d{2})$/i.exec(s);
  if (m) return `${SEASONS[m[1].toUpperCase()]} 20${m[2]}`;
  // Stanford 학년도 쿼터: "2026-2027 Autumn" / "Autumn 2026-2027" → 가을은 앞 해, 겨울·봄·여름은 뒤 해
  m = /^(?:(\d{4})-(\d{4})\s+(Autumn|Winter|Spring|Summer)|(Autumn|Winter|Spring|Summer)\s+(\d{4})-(\d{4}))$/i.exec(s);
  if (m) { const q = (m[3] ?? m[4]).toLowerCase(); const y1 = m[1] ?? m[5], y2 = m[2] ?? m[6]; return `${q[0].toUpperCase()}${q.slice(1)} ${q === 'autumn' ? y1 : y2}`; }
  // UMD 학기 id (연도 + 시작 달): 202601 봄 · 202605 여름 · 202608 가을 · 202612 겨울. Banner 의 202610·202630 같은 코드는 건드리지 않는다
  m = /^(\d{4})(01|05|08|12)$/.exec(s);
  if (m) return `${({ '01': 'Spring', '05': 'Summer', '08': 'Fall', '12': 'Winter' } as Record<string, string>)[m[2]]} ${m[1]}`;
  return s;
}

/** 학기 라벨 정렬 키 (연도 → 봄·여름·가을·겨울 순). 모르는 라벨은 뒤로 */
export function termOrder(label: string): number {
  const m = /^(Winter|Spring|Summer|Fall|Autumn) (\d{4})$/.exec(label);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[2]) * 10 + ({ Winter: 0, Spring: 1, Summer: 2, Fall: 3, Autumn: 3 } as Record<string, number>)[m[1]];
}
