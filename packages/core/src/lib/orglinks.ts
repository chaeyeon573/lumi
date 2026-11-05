/**
 * 동아리 링크 중 학교 로그인 뒤에만 보이는 것 — 학생에게 보여주지 않는다 (2026-11-02 사장님: "로그인해야 들어가는 건 별로 · 공개 데이터만").
 * 데이터에는 남겨 둔다(가져오기 기록·중복 검사용) — 화면과 미리보기에서만 뺀다.
 *   CampusGroups 단체 페이지(student_community?club_id=, /<slug>/) · Berkeley CalLink(CalNet)
 */
const LOGIN_HOSTS = /(^|\.)(callink\.berkeley\.edu|cardinalengage\.stanford\.edu|engage\.mit\.edu|sammyapp\.sjsu\.edu|aggielife\.ucdavis\.edu|dartmouthgroups\.dartmouth\.edu|soco\.college\.harvard\.edu)$|\.campusgroups\.com$|(^|\.)(canvas\.[a-z0-9-]+\.edu|[a-z0-9-]+\.instructure\.com|blackboard\.[a-z0-9-]+\.edu|[a-z0-9-]+\.brightspace\.com|d2l\.[a-z0-9-]+\.edu)$/i; // 수업 사이트(Canvas·Blackboard·Brightspace)는 학교 로그인 — Emory 동아리 링크 2026-11-04
export function isLoginOnlyLink(url: string): boolean {
  try {
    const u = new URL(url);
    // CampusGroups 단체 페이지는 학교마다 주소가 달라도(lionhub.columbia.edu, yaleconnect.yale.edu …) 같은 경로 — 로그인 뒤에만 보인다
    return LOGIN_HOSTS.test(u.hostname) || /^\/(student_community|feeds|webapp\/auth)\b/i.test(u.pathname) || /[?&]club_id=\d+/i.test(u.search);
  } catch { return false; }
}
/** 공유용 추적 꼬리표(igsh, utm_*, fbclid, hl) 떼기 — instagram.com/uncvtt?igsh=… → instagram.com/uncvtt */
export function cleanShareUrl(url: string): string {
  try {
    const u = new URL(url); let changed = false;
    for (const k of [...u.searchParams.keys()]) if (/^(igsh|igshid|utm_\w+|fbclid|hl|si)$/i.test(k)) { u.searchParams.delete(k); changed = true; }
    return changed ? u.toString().replace(/\?$/, '') : url;
  } catch { return url; }
}
/** 공개 링크만, 보기 좋은 순서 (Website → Instagram → Facebook → 나머지) */
export function publicLinks<T extends { label: string; url: string }>(links: T[] | undefined): T[] {
  const order = ['Website', 'Instagram', 'Facebook'];
  const rank = (l: T) => { const i = order.indexOf(l.label); return i < 0 ? order.length : i; };
  return (links ?? []).filter((l) => !isLoginOnlyLink(l.url)).map((l) => ({ ...l, url: cleanShareUrl(l.url) })).sort((a, b) => rank(a) - rank(b));
}

/**
 * 화면에는 이모지를 쓰지 않는다 (2026-11-02 사장님: "Do not put emoji").
 *   - 이름 끝의 💙 같은 이모지는 뺀다 (CalLink 에 그렇게 적혀 있어도)
 *   - 로고 사진이 없고 로고가 이모지(🎯 🏛️ …)면 이름 머리글자로 바꾼다. 그리스 문자(ΑΚΨ)·머리글자는 그대로
 * 저장된 데이터는 바꾸지 않고, 서버가 앱으로 보낼 때와 미리보기에서만 적용한다.
 */
const PICTO = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/gu;
export const stripEmoji = (s: string) => s.replace(PICTO, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
export function initialsOf(name: string): string {
  const words = stripEmoji(name).replace(/\([^)]*\)/g, ' ').replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/)
    .filter((w) => w && !/^(of|the|at|and|for|in|uc|cal|berkeley|stanford|club|campus|dept)$/i.test(w));
  return (words.length ? words : stripEmoji(name).split(/\s+/)).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '•';
}
export function withoutEmoji<T extends { name: string; logo: { emoji: string; hue: number; url?: string } }>(o: T): T {
  const name = stripEmoji(o.name) || o.name;
  const emojiLogo = !o.logo.url && (new RegExp(PICTO.source, 'u').test(o.logo.emoji) || !o.logo.emoji.trim());
  if (name === o.name && !emojiLogo) return o;
  return { ...o, name, logo: emojiLogo ? { ...o.logo, emoji: initialsOf(name) } : o.logo };
}

/** 모집 상태 한 줄 — "Open to join anytime" · "Apply by Nov 15" · "Recruits in Fall" · "Not taking new members" */
export function recruitmentLabel(r: { title: string; period: string; open: boolean; mode?: string; deadline?: string; how?: string } | undefined, today = new Date().toISOString().slice(0, 10)): { text: string; open: boolean } | null {
  if (!r) return null;
  const how = r.how ? ` · ${r.how}` : '';
  if (r.mode === 'deadline' && r.deadline) {
    if (r.deadline < today) return { text: 'Applications closed', open: false };
    const d = new Date(`${r.deadline}T12:00:00`);
    return { text: `Apply by ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${how}`, open: true };
  }
  if (r.mode === 'rolling') return { text: `Open to join anytime${how}`, open: true };
  if (r.mode === 'cycle') return { text: `Recruits in ${r.period}${how}`, open: false };
  if (r.mode === 'closed') return { text: 'Not taking new members', open: false };
  return r.open ? { text: r.title || 'Recruiting', open: true } : null;
}
