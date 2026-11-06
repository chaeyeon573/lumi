/**
 * Club "Ask to join" (S022 · S091 · /club-setup) — rules shared by the engine, the server and the screens.
 * Owner decisions 2026-11-06:
 *   - every club has "Ask to join", also clubs from the campus directory with no organizers on Lumi
 *   - the student sees one consent line first; the request records that consent
 *   - the wording follows real delivery: "Sent" / "We told" only when it is true (organizers on Lumi, or an outreach
 *     e-mail actually went to the club covering this request). Otherwise "Saved — we'll pass it on"
 *   - organizers (verified through the club's official directory e-mail) see name · year · major of students who
 *     consented and didn't block them, and can message them as the club
 */
import type { HowToJoin, HowToJoinWho, ID, JoinRequest, Organization, User } from '@core/types';
import { lang } from '@core/i18n';

const L = (en: string, ko: string) => (lang === 'en' ? en : ko);

/**
 * the short name students use — "Cal Hiking and Outdoor Society (CHAOS)" → "CHAOS". Only the club's own acronym in
 * parentheses at the end of its directory name; otherwise the full name (never made up)
 */
export function clubShort(name: string): string {
  const m = /\(([A-Z][A-Za-z0-9&.+\- ]{1,11})\)\s*$/.exec(name.trim());
  return m && /[A-Z].*[A-Z]/.test(m[1]) ? m[1].trim() : name.trim();
}

/** the version of the consent line the student saw (stored on each request). v3 (owner 2026-11-06): one quiet line under the
 * Ask to join button — tapping the button is the consent, no sheet */
export const CONSENT_VERSION = 'v3:line-under-button:name-year-major-message';
export const consentLine = (name: string, club = clubShort(name)) => L(`${club} organizers will see your name, year and major and can message you.`, `${club} 운영진이 내 이름·학년·전공을 보고 메시지를 보낼 수 있어요.`);

/** a request to the club, if this student has one */
export const requestOf = (org: Pick<Organization, 'joinRequests'>, userId: ID): JoinRequest | undefined => org.joinRequests?.find((r) => r.userId === userId);

/**
 * what the student's own request status is — only what really happened:
 *   none  · no request
 *   saved · stored on Lumi, nobody at the club has it yet
 *   sent  · organizers on Lumi have it
 *   told  · the club was told: an outreach e-mail counted it, or the Lumi team contacted the club (Instagram DM, e-mail …)
 */
export type RequestStatus = 'none' | 'saved' | 'sent' | 'told';
export function requestStatus(org: Pick<Organization, 'joinRequests' | 'applicantIds' | 'adminIds'>, userId: ID): RequestStatus {
  if (!org.applicantIds.includes(userId)) return 'none';
  const r = requestOf(org, userId);
  // a request from before this record existed went to organizers on Lumi (the old flow only sent when there were some)
  if (!r) return org.adminIds.some((a) => a !== userId) ? 'sent' : 'saved';
  if (!r.deliveredAt) return 'saved';
  return r.deliveredVia === 'organizers' ? 'sent' : 'told';
}

/** days until a saved request gets its promised update ("update you within 3 days") */
export const FOLLOW_UP_DAYS = 3;
/** a club contacted (or e-mailed) this recently counts as told for new requests too */
export const TOLD_WINDOW_DAYS = 30;
export const promiseDate = (askedAt: string) => new Date(Date.parse(askedAt) + FOLLOW_UP_DAYS * 86400_000).toISOString();
const shortDay = (iso: string) => new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' });

/** the toast right after the one tap (owner 2026-11-06 — must match requestStatus) */
export function askedToast(status: RequestStatus, name: string): string {
  const club = clubShort(name);
  if (status === 'sent') return L(`Sent to ${club} ✓`, `${club}에 보냈어요 ✓`);
  if (status === 'told') return L(`Sent ✓ We passed it to ${club} — you’ll hear here when they reply.`, `보냈어요 ✓ ${club}에 전했어요 — 답이 오면 여기서 알려 드려요.`);
  return L(`Saved ✓ We’ll pass it to ${club} and update you within ${FOLLOW_UP_DAYS} days.`, `저장했어요 ✓ ${club}에 전하고 ${FOLLOW_UP_DAYS}일 안에 알려 드릴게요.`);
}

/** the student's own one-line status on the club page */
export function statusLine(status: RequestStatus, name: string, req?: Pick<JoinRequest, 'askedAt' | 'promisedBy'>): string {
  const club = clubShort(name);
  if (status === 'saved') {
    const by = req?.promisedBy ?? (req ? promiseDate(req.askedAt) : undefined);
    return by && Date.parse(by) > Date.now() ? L(`You asked · we’ll update you by ${shortDay(by)}`, `요청함 · ${shortDay(by)}까지 알려 드려요`) : L(`You asked · waiting for ${club}`, `요청함 · ${club} 기다리는 중`);
  }
  if (status === 'told') return L(`We passed it to ${club}`, `${club}에 전했어요`);
  return L(`Sent to ${club}`, `${club}에 보냈어요`);
}

/**
 * mark every saved (undelivered) request of this club as delivered. Returns the students whose status just flipped
 * — each gets "We told {club} you want to join" (or "Sent to …" when organizers arrived). `until` limits it to
 * requests made up to that moment (an e-mail covers the requests counted in it, not later ones)
 */
export function deliverSaved(org: Organization, via: NonNullable<JoinRequest['deliveredVia']>, at: string, until?: string): ID[] {
  const out: ID[] = [];
  for (const r of org.joinRequests ?? []) {
    if (r.deliveredAt || !org.applicantIds.includes(r.userId)) continue;
    if (until && r.askedAt > until) continue;
    r.deliveredAt = at; r.deliveredVia = via; out.push(r.userId);
  }
  return out;
}

/** the DM the Lumi team sends a club (owner 2026-11-06 — Instagram for now). Never stored */
export const dmText = (name: string, waiting: number, link: string, schoolShort = 'Berkeley') =>
  `Hi ${clubShort(name)}! ${waiting} ${schoolShort} ${waiting === 1 ? 'student' : 'students'} asked to join you on Lumi (a campus app for finding people to do things with). Could you tell them how to join? 2 minutes, no account needed: ${link}`;

/** requests still waiting on the club (on Lumi, not yet handled) */
export const pendingRequests = (org: Pick<Organization, 'joinRequests' | 'applicantIds'>): JoinRequest[] => (org.joinRequests ?? []).filter((r) => org.applicantIds.includes(r.userId));

// ─── how to join (/club-setup) ───────────────────────────────────────────
export const WHO_CHOICES: HowToJoinWho[] = ['open', 'application', 'tryouts', 'dues'];
export const whoLabel = (w: HowToJoinWho) => ({
  open: L('Open to all', '누구나'), application: L('Application', '지원서'), tryouts: L('Tryouts', '트라이아웃'), dues: L('Dues', '회비'),
})[w];
export const HOW_TO_JOIN_LIMITS = { url: 500, whoNote: 140, place: 120 } as const;

export class ClubJoinError extends Error { constructor(message: string, public status = 400) { super(message); } }

/** an https address only (a Google Form, the club's site …) — never javascript:, http: or a bare word */
export function cleanSignupUrl(raw: unknown): string | undefined {
  const s = String(raw ?? '').trim();
  if (!s) return undefined;
  if (s.length > HOW_TO_JOIN_LIMITS.url) throw new ClubJoinError(L('That link is too long.', '링크가 너무 길어요.'));
  let u: URL;
  try { u = new URL(s); } catch { throw new ClubJoinError(L('Use a full link that starts with https://', 'https:// 로 시작하는 전체 주소를 적어주세요.')); }
  if (u.protocol !== 'https:' || !u.hostname.includes('.')) throw new ClubJoinError(L('Use a full link that starts with https://', 'https:// 로 시작하는 전체 주소를 적어주세요.'));
  return u.href;
}

/** validate what an organizer typed on /club-setup. Throws a readable reason; nothing is invented to fill gaps */
export function cleanHowToJoin(input: unknown, now = new Date()): HowToJoin {
  const x = (input ?? {}) as Record<string, unknown>;
  const signupUrl = cleanSignupUrl(x.signupUrl);
  const who = WHO_CHOICES.includes(x.who as HowToJoinWho) ? x.who as HowToJoinWho : undefined;
  if (x.who && !who) throw new ClubJoinError(L('Pick who can join.', '누가 가입할 수 있는지 골라주세요.'));
  const whoNote = String(x.whoNote ?? '').replace(/\s+/g, ' ').trim();
  if (whoNote.length > HOW_TO_JOIN_LIMITS.whoNote) throw new ClubJoinError(L(`Keep the note under ${HOW_TO_JOIN_LIMITS.whoNote} characters.`, `메모는 ${HOW_TO_JOIN_LIMITS.whoNote}자까지예요.`));
  let next: HowToJoin['next'];
  const n = (x.next ?? null) as Record<string, unknown> | null;
  if (n && (n.date || n.time || n.place)) {
    const date = String(n.date ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new ClubJoinError(L('Pick a date for the info session.', '설명회 날짜를 골라주세요.'));
    if (date < now.toISOString().slice(0, 10)) throw new ClubJoinError(L('That date has passed.', '이미 지난 날짜예요.'));
    const time = String(n.time ?? '').trim();
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new ClubJoinError(L('Check the time.', '시간을 확인해주세요.'));
    const place = String(n.place ?? '').replace(/\s+/g, ' ').trim();
    if (place.length > HOW_TO_JOIN_LIMITS.place) throw new ClubJoinError(L('Keep the place short.', '장소는 짧게 적어주세요.'));
    next = { date, ...(time ? { time } : {}), ...(place ? { place } : {}) };
  }
  if (!signupUrl && !who && !whoNote && !next) throw new ClubJoinError(L('Add a sign-up link, who can join, or the next info session.', '가입 링크, 가입 조건, 다음 설명회 중 하나는 적어주세요.'));
  return { ...(signupUrl ? { signupUrl } : {}), ...(who ? { who } : {}), ...(whoNote ? { whoNote } : {}), ...(next ? { next } : {}), updatedAt: now.toISOString() };
}

/** is there anything students can act on (the date may have passed since it was saved) */
export function howToJoinLive(h: HowToJoin | undefined, today: string): h is HowToJoin {
  if (!h) return false;
  return !!(h.signupUrl || h.who || h.whoNote || (h.next && h.next.date >= today));
}

// ─── organizers ──────────────────────────────────────────────────────────
/** year · major the requester agreed to share with organizers (major even when hidden on their profile — they consented) */
export function yearAndMajor(u: User, d = new Date()): { year: string; major: string } {
  if (u.affiliation.type !== 'university') return { year: '', major: '' };
  const a = u.affiliation;
  const academic = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  const y = Math.min(4, Math.max(1, academic - a.year + 1));
  const year = a.role === 'graduate' ? L('Grad student', '대학원생') : a.role === 'alumni' ? L('Alum', '졸업생') : lang === 'en' ? ['Freshman', 'Sophomore', 'Junior', 'Senior'][y - 1] : `${y}학년`;
  return { year, major: a.department ?? '' };
}

/** "Cal Hiking (organizer)" — how an organizer's message is signed */
export const orgSenderLabel = (name: string) => L(`${clubShort(name)} (organizer)`, `${clubShort(name)} (운영진)`);
export const ORG_MESSAGE_MAX = 1000;

/** what /club-setup/:token shows (server/clubs.ts setupView) */
export interface ClubSetupView {
  org: { id: ID; name: string; type: Organization['type']; logo?: { url: string }; cover?: { url: string } };
  school: string;
  howToJoin: HowToJoin | null;
  /** students waiting on the club */
  waiting: number;
  /** organizers already on Lumi */
  organizers: number;
  /** the link was used to set up an organizer account (How to join can't be changed with it any more) */
  used: boolean;
  expiresAt: string;
}
export type HowToJoinInput = Omit<HowToJoin, 'updatedAt'>;
