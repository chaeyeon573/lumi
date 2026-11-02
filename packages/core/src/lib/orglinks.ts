/**
 * 동아리 링크 중 학교 로그인 뒤에만 보이는 것 — 학생에게 보여주지 않는다 (2026-11-02 사장님: "로그인해야 들어가는 건 별로 · 공개 데이터만").
 * 데이터에는 남겨 둔다(가져오기 기록·중복 검사용) — 화면과 미리보기에서만 뺀다.
 *   CampusGroups 단체 페이지(student_community?club_id=, /<slug>/) · Berkeley CalLink(CalNet)
 */
const LOGIN_HOSTS = /(^|\.)(callink\.berkeley\.edu|cardinalengage\.stanford\.edu|engage\.mit\.edu|sammyapp\.sjsu\.edu|aggielife\.ucdavis\.edu|dartmouthgroups\.dartmouth\.edu|soco\.college\.harvard\.edu)$|\.campusgroups\.com$/i;
export function isLoginOnlyLink(url: string): boolean {
  try { return LOGIN_HOSTS.test(new URL(url).hostname); } catch { return false; }
}
/** 공개 링크만, 보기 좋은 순서 (Website → Instagram → Facebook → 나머지) */
export function publicLinks<T extends { label: string; url: string }>(links: T[] | undefined): T[] {
  const order = ['Website', 'Instagram', 'Facebook'];
  const rank = (l: T) => { const i = order.indexOf(l.label); return i < 0 ? order.length : i; };
  return (links ?? []).filter((l) => !isLoginOnlyLink(l.url)).sort((a, b) => rank(a) - rank(b));
}
