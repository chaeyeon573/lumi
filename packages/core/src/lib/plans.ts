/**
 * 링크로 묻는 약속 (/p/<id>) — 순수 함수만. 엔진은 @core/api/plans, 서버 연결은 server/plans.ts.
 *
 * Plan Together(TimePoll)를 그대로 쓰고 `poll.link` 에 링크 약속만의 정보를 둔다:
 *   - fixed: 시간을 정해 두고 Going / Maybe / Can't
 *   - vote : 후보 시간 2~6개(장소 후보는 선택) 중 되는 것을 모두 고르고, 주최자가 하나로 확정(lock)
 * 계정 없는 사람도 이름(첫 단어)만 적고 답한다. 공개 화면에는 이름 첫 단어와 숫자만 — id·토큰·프로필은 절대 없다.
 */
import type { ID, PlanMode, PlanResponse, PlanRsvp, TimeOption, TimePoll, User } from '@core/types';
import { lang } from '@core/i18n';

export const PLAN_LIMITS = {
  titleMax: 80,
  noteMax: 280,
  nameMax: 20,
  placeMax: 60,
  minVoteOptions: 2,
  maxOptions: 6,
  maxPlaces: 4,
  /** 한 약속에 받는 답의 최대 개수 (링크가 퍼져도 끝없이 늘지 않게) */
  maxResponses: 150,
} as const;

/** 캠퍼스 시간대 — 약속 시간(date + HH:MM)은 이 시간대의 벽시계 시간이다 */
export const campusTz = () => (lang === 'en' ? 'America/Los_Angeles' : 'Asia/Seoul');

// ─── 입력 정리 ────────────────────────────────────────────────────────────
/** HTML 태그·꺾쇠·제어 문자를 지우고 공백을 하나로 (multiline 이면 줄바꿈은 두 줄까지 남긴다). 욕설 검사는 하지 않는다 */
export function cleanText(s: unknown, max: number, multiline = false): string {
  const text = String(s ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ');
  const flat = multiline
    ? text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n')
    : text.replace(/\s+/g, ' ');
  return flat.trim().slice(0, max).trim();
}

/** 이름은 첫 단어만 ("Asha Patel" → "Asha") */
export function firstName(s: unknown): string {
  return cleanText(s, 60).split(' ')[0]?.slice(0, PLAN_LIMITS.nameMax) ?? '';
}

const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** 추측할 수 없는 문자열 (브라우저·Node 모두 crypto.getRandomValues) */
export function randomId(len: number): string {
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  // 62의 배수(248) 밖 값은 버려 치우침이 없게
  let out = '';
  let i = 0;
  while (out.length < len) {
    if (i >= bytes.length) { globalThis.crypto.getRandomValues(bytes); i = 0; }
    const b = bytes[i++];
    if (b < 248) out += B62[b % 62];
  }
  return out;
}
/** 약속 id — p_ + 16자 (약 95비트) */
export const newPlanId = () => `p_${randomId(16)}`;
/** 손님 토큰 — 이 기기에만 저장된다. 서버에는 해시만 */
export const newGuestToken = () => randomId(32);
export const isPlanId = (id: unknown): id is string => typeof id === 'string' && /^p_[0-9A-Za-z]{16}$/.test(id);

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** 시간 후보 하나 검사 — 끝이 시작보다 늦어야 한다 */
export function validOption(o: Partial<TimeOption> | undefined): o is Omit<TimeOption, 'id'> {
  return !!o && DATE.test(String(o.date)) && !Number.isNaN(Date.parse(`${o.date}T00:00:00Z`)) && HHMM.test(String(o.startTime)) && HHMM.test(String(o.endTime)) && String(o.startTime) < String(o.endTime);
}

// ─── 시간 ────────────────────────────────────────────────────────────────
/** 그 시간대의 벽시계 시간(date + HH:MM)을 실제 시각으로 */
export function zonedToUtc(date: string, hhmm: string, tz = campusTz()): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const offset = (at: number) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(at));
    const get = (k: string) => Number(parts.find((p) => p.type === k)?.value);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute')) - at;
  };
  let t = guess - offset(guess);
  t = guess - offset(t); // 서머타임 경계에서 한 번 더
  return new Date(t);
}

const WEEKDAY = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ko: ['일', '월', '화', '수', '목', '금', '토'] };
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
/** "2pm" · "2:30pm" (en) / "오후 2시" (ko) */
export function clock(hhmm: string, en = lang === 'en'): string {
  const [h, m] = hhmm.split(':').map(Number);
  const hr = h % 12 || 12;
  if (en) return `${m ? `${hr}:${String(m).padStart(2, '0')}` : hr}${h >= 12 ? 'pm' : 'am'}`;
  return `${h < 12 ? '오전' : '오후'} ${hr}${m ? `:${String(m).padStart(2, '0')}` : '시'}`;
}
/** "Thu" */
export const weekday = (date: string, en = lang === 'en') => WEEKDAY[en ? 'en' : 'ko'][dayOf(date)];
/** "Thu, Oct 15" / "10월 15일 (목)" */
export function dayLabel(date: string, en = lang === 'en'): string {
  const [, m, d] = date.split('-').map(Number);
  return en ? `${weekday(date, true)}, ${MONTH[m - 1]} ${d}` : `${m}월 ${d}일 (${weekday(date, false)})`;
}
/** "Thu, Oct 15 · 2–3:30pm" */
export function whenLabel(o: Pick<TimeOption, 'date' | 'startTime' | 'endTime'>, en = lang === 'en'): string {
  return `${dayLabel(o.date, en)} · ${clock(o.startTime, en)}–${clock(o.endTime, en)}`;
}
/** "Thu 2pm" — 미리보기처럼 짧게 */
export const shortWhen = (o: Pick<TimeOption, 'date' | 'startTime'>, en = lang === 'en') => `${weekday(o.date, en)} ${clock(o.startTime, en)}`;

// ─── 상태·집계 ────────────────────────────────────────────────────────────
export type PlanStatus = 'open' | 'closed' | 'locked' | 'cancelled' | 'past';

/** 정해진 시간 — fixed 는 처음부터, vote 는 확정한 뒤에만 */
export function finalOption(poll: TimePoll): TimeOption | undefined {
  if (!poll.link) return undefined;
  const id = poll.link.mode === 'fixed' ? poll.options[0]?.id : poll.status === 'decided' ? poll.decidedOptionId : undefined;
  return id ? poll.options.find((o) => o.id === id) : undefined;
}

/** 이 약속이 끝났는지 (정해진 시간이 지났거나, 투표 중인데 모든 후보 시간이 지났거나) */
export function isPast(poll: TimePoll, now = new Date()): boolean {
  const ends = (o: TimeOption) => zonedToUtc(o.date, o.endTime).getTime() < now.getTime();
  const f = finalOption(poll);
  if (f) return ends(f);
  return poll.options.length > 0 && poll.options.every(ends);
}

export function planStatus(poll: TimePoll, now = new Date()): PlanStatus {
  if (poll.status === 'cancelled') return 'cancelled';
  if (isPast(poll, now)) return 'past';
  if (poll.link?.mode === 'vote' && poll.status === 'decided') return 'locked';
  if (poll.link?.closed) return 'closed';
  return 'open';
}
/** 지금 답을 받는지 */
export const acceptsResponses = (poll: TimePoll, now = new Date()) => planStatus(poll, now) === 'open';

type Names = (r: PlanResponse) => string;
/** 보여줄 이름 — Lumi 사용자는 닉네임 첫 단어 (지금 닉네임으로) */
export function namer(users: Pick<User, 'id' | 'nickname'>[]): Names {
  const byId = new Map(users.map((u) => [u.id, u]));
  return (r) => (r.userId ? firstName(byId.get(r.userId)?.nickname ?? '') || 'Lumi' : r.name || 'Guest');
}

export interface OptionCount { id: ID; date: string; startTime: string; endTime: string; count: number; names: string[] }
export interface PlanTally {
  options: OptionCount[];
  places: { id: ID; name: string; count: number; names: string[] }[];
  going: string[];
  maybe: string[];
  no: number;
  /** 가장 많이 고른 시간 (동점이면 이른 시간) */
  best?: OptionCount;
  responded: number;
}

export function planTally(poll: TimePoll, users: Pick<User, 'id' | 'nickname'>[]): PlanTally {
  const rs = poll.link?.responses ?? [];
  const name = namer(users);
  const options = poll.options.map((o) => {
    const who = rs.filter((r) => r.optionIds?.includes(o.id));
    return { id: o.id, date: o.date, startTime: o.startTime, endTime: o.endTime, count: who.length, names: who.map(name) };
  });
  const places = (poll.link?.placeOptions ?? []).map((p) => {
    const who = rs.filter((r) => r.placeIds?.includes(p.id));
    return { id: p.id, name: p.name, count: who.length, names: who.map(name) };
  });
  const by = (x: PlanRsvp) => rs.filter((r) => r.rsvp === x);
  const best = [...options].sort((a, b) => b.count - a.count || (a.date + a.startTime).localeCompare(b.date + b.startTime))[0];
  return { options, places, going: by('going').map(name), maybe: by('maybe').map(name), no: by('no').length, best: best && best.count > 0 ? best : undefined, responded: rs.length };
}

// ─── 공개 화면 모양 ────────────────────────────────────────────────────────
/** 로그인 없이 /p/<id> 가 보는 것. 사람은 이름 첫 단어와 숫자뿐 — id·토큰·프로필·연락처는 없다 */
export interface PublicPlan {
  id: ID;
  title: string;
  emoji: string;
  note?: string;
  mode: PlanMode;
  hostName: string;
  /** 정해진 장소 (확정한 장소 후보 또는 처음 적은 장소) */
  place?: string;
  options: OptionCount[];
  places: PlanTally['places'];
  going: string[];
  maybe: string[];
  no: number;
  best?: OptionCount;
  /** 정해진 시간 (fixed: 처음부터, vote: 확정 뒤) */
  final?: { optionId: ID; date: string; startTime: string; endTime: string };
  status: PlanStatus;
  responded: number;
  /** 이 기기(또는 로그인한 나)의 답 */
  me?: { responseId: ID; name: string; rsvp?: PlanRsvp; optionIds: ID[]; placeIds: ID[]; lumi: boolean };
  isHost: boolean;
  /** 주최자에게만 — 답한 사람 목록 (지우기용 응답 id) */
  responses?: { id: ID; name: string; lumi: boolean; host: boolean; rsvp?: PlanRsvp; optionIds: ID[]; placeIds: ID[]; updatedAt: string }[];
  createdAt: string;
}

export interface PlanViewer { userId?: ID; tokenHash?: string }

export function finalPlace(poll: TimePoll): string | undefined {
  const l = poll.link;
  const decided = l?.decidedPlaceId ? l.placeOptions?.find((p) => p.id === l.decidedPlaceId)?.name : undefined;
  return decided ?? poll.place?.name ?? (l?.placeOptions?.length === 1 ? l.placeOptions[0].name : undefined);
}

export function findResponse(poll: TimePoll, viewer: PlanViewer): PlanResponse | undefined {
  const rs = poll.link?.responses ?? [];
  if (viewer.userId) { const mine = rs.find((r) => r.userId === viewer.userId); if (mine) return mine; }
  return viewer.tokenHash ? rs.find((r) => !r.userId && r.tokenHash === viewer.tokenHash) : undefined;
}

export function publicPlan(poll: TimePoll, users: Pick<User, 'id' | 'nickname'>[], viewer: PlanViewer = {}, now = new Date()): PublicPlan | null {
  const l = poll.link;
  if (!l) return null;
  const tally = planTally(poll, users);
  const name = namer(users);
  const host = users.find((u) => u.id === poll.hostId);
  const isHost = !!viewer.userId && viewer.userId === poll.hostId;
  const mine = findResponse(poll, viewer);
  const f = finalOption(poll);
  return {
    id: poll.id, title: poll.title, emoji: l.emoji, note: l.note, mode: l.mode,
    hostName: firstName(host?.nickname ?? '') || 'Someone',
    place: finalPlace(poll),
    options: tally.options, places: tally.places, going: tally.going, maybe: tally.maybe, no: tally.no, best: tally.best,
    final: f ? { optionId: f.id, date: f.date, startTime: f.startTime, endTime: f.endTime } : undefined,
    status: planStatus(poll, now), responded: tally.responded,
    me: mine ? { responseId: mine.id, name: name(mine), rsvp: mine.rsvp, optionIds: mine.optionIds ?? [], placeIds: mine.placeIds ?? [], lumi: !!mine.userId } : undefined,
    isHost,
    responses: isHost ? l.responses.map((r) => ({ id: r.id, name: name(r), lumi: !!r.userId, host: r.userId === poll.hostId, rsvp: r.rsvp, optionIds: r.optionIds ?? [], placeIds: r.placeIds ?? [], updatedAt: r.updatedAt })) : undefined,
    createdAt: poll.createdAt,
  };
}

// ─── 앱 안에서 내려보내는 모양 (server/view.ts) ───────────────────────────────
/** 링크 약속은 주최자와 Lumi 로 답한 사람에게만 (예전 Plan Together 는 그대로) */
export const planVisibleTo = (poll: TimePoll, viewerId: ID) => !poll.link || poll.hostId === viewerId || poll.link.responses.some((r) => r.userId === viewerId);
/** 손님 토큰 해시를 지운 사본 */
export function stripPlanSecrets(poll: TimePoll): TimePoll {
  if (!poll.link) return poll;
  return { ...poll, link: { ...poll.link, responses: poll.link.responses.map(({ tokenHash: _h, ...r }) => r) } };
}

// ─── 미리보기 (Open Graph) ─────────────────────────────────────────────────
/** iMessage·카톡·디스코드 미리보기 문구 — 숫자만, 이름은 넣지 않는다 */
export function planMeta(poll: TimePoll | undefined, users: Pick<User, 'id' | 'nickname'>[], en = lang === 'en'): { title: string; description: string } {
  if (!poll?.link || poll.status === 'cancelled') return { title: en ? 'A plan on Lumi' : 'Lumi 약속', description: en ? 'This plan isn’t available anymore.' : '더 이상 볼 수 없는 약속이에요.' };
  const l = poll.link;
  const t = planTally(poll, users);
  const head = `${l.emoji ? `${l.emoji} ` : ''}${poll.title}`;
  const place = finalPlace(poll);
  const f = finalOption(poll);
  const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`;
  if (l.mode === 'fixed' && f) {
    const parts = [t.going.length ? `${t.going.length} going` : '', t.maybe.length ? `${t.maybe.length} maybe` : ''].filter(Boolean);
    return {
      title: [head, shortWhen(f, en), place].filter(Boolean).join(' · '),
      description: en ? `${parts.length ? `${parts.join(' · ')} — ` : ''}tap to say if you’re in. No app needed.` : `${t.going.length}명 참석 — 눌러서 답해주세요. 앱 없이도 돼요.`,
    };
  }
  if (f) {
    const coming = t.options.find((o) => o.id === f.id)?.count ?? 0;
    return {
      title: [head, `${dayLabel(f.date, en)} ${clock(f.startTime, en)}`, place].filter(Boolean).join(' · '),
      description: en ? `It’s set${coming ? ` — ${n(coming, 'person', 'people')} coming` : ''}. Add it to your calendar.` : `시간이 정해졌어요. 캘린더에 추가하세요.`,
    };
  }
  const count = n(poll.options.length, 'time', 'times');
  return {
    title: en ? `${head} — pick a time` : `${head} — 시간 고르기`,
    description: en
      ? (t.best ? `${shortWhen(t.best, true)} works for ${t.best.count} · ${count} to pick from${place ? ` · ${place}` : ''}` : `${count} to pick from — tap the ones that work. No app needed.`)
      : (t.best ? `${shortWhen(t.best, false)} ${t.best.count}명 가능 · 후보 ${poll.options.length}개` : `후보 ${poll.options.length}개 — 되는 시간을 눌러주세요.`),
  };
}

// ─── 캘린더 (.ics) ──────────────────────────────────────────────────────────
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsTime = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
/** 75 바이트마다 접기 (RFC 5545 3.1) — 한글·이모지가 잘리지 않게 문자 단위로 */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/** 캘린더 파일 — 공개 화면 모양(PublicPlan)에서 만든다 (서버 /api/plans/:id/ics 와 목업 화면이 같이 쓴다). 정해진 시간이 없으면 null */
export function planIcs(plan: Pick<PublicPlan, 'id' | 'title' | 'emoji' | 'note' | 'place' | 'final' | 'status'> | null, url: string, now = new Date()): string | null {
  const f = plan?.final;
  if (!plan || !f || plan.status === 'cancelled') return null;
  const place = plan.place;
  const desc = [plan.note, url].filter(Boolean).join('\n\n');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lumi//Plans//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${plan.id}@lumi`,
    `DTSTAMP:${icsTime(now)}`,
    `DTSTART:${icsTime(zonedToUtc(f.date, f.startTime))}`,
    `DTEND:${icsTime(zonedToUtc(f.date, f.endTime))}`,
    `SUMMARY:${icsText(`${plan.emoji ? `${plan.emoji} ` : ''}${plan.title}`)}`,
    ...(place ? [`LOCATION:${icsText(place)}`] : []),
    `DESCRIPTION:${icsText(desc)}`,
    `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(plan.title)}`, 'TRIGGER:-PT1H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
