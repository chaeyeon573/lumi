/**
 * Berkeley 과목 약칭 — 학교 공개 시간표는 "COMPSCI 61A" 로 쓰지만 학생은 "CS 61A" 라고 부른다.
 * 가져오기(server/sources/courses.ts)는 이 표로 코드를 짧게 저장하고, 검색(searchCatalog · scoreCourse)은 거꾸로
 * 긴 이름으로 쳐도 찾게 한다 ("compsci 61a" → CS 61A). 한 곳에만 적는다.
 */
export const BERKELEY_ABBR: Record<string, string> = { COMPSCI: 'CS', 'POL SCI': 'POLSCI', 'MCELLBI': 'MCB', 'INTEGBI': 'IB', 'PB HLTH': 'PBHLTH', 'IND ENG': 'IEOR', 'MEC ENG': 'ME', 'CIV ENG': 'CE', 'BIO ENG': 'BIOE', 'COG SCI': 'COGSCI', 'ART': 'ART', 'L & S': 'LS' };

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** 붙여 쓴 긴 약칭 → 붙여 쓴 짧은 약칭 ("compsci" → "cs"), 긴 것부터 */
const LONG_TO_SHORT = Object.entries(BERKELEY_ABBR)
  .map(([long, short]) => [compact(long), compact(short)] as const)
  .filter(([a, b]) => a !== b)
  .sort((a, b) => b[0].length - a[0].length);

/** 검색어의 긴 과목 약칭을 저장된 짧은 약칭으로 ("compsci61a" → "cs61a"). 바꿀 것이 없으면 그대로 */
export function shortSubject(compactQuery: string): string {
  for (const [long, short] of LONG_TO_SHORT) if (compactQuery.startsWith(long) && /^\d|^c\d|^[a-z]?\d/.test(compactQuery.slice(long.length) || '0')) return short + compactQuery.slice(long.length);
  return compactQuery;
}
