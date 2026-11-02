/**
 * Rides — share a ride around campus (airports for breaks, groceries, SF/Oakland, Tahoe, concerts).
 *
 * Pure logic shared by the engine (@core/api/rides), the server's per-viewer filter (server/view.ts),
 * the mock API and the screens. Nothing here talks to the network.
 *
 * Safety rules that live here (and are tested in server/rides.test.ts):
 * - Pickup is always a preset public landmark — never a free-text address.
 * - Only students of the same school see / join a school's rides; blocks hide rides both ways
 *   (a ride is hidden when you and the host — or anyone already riding — have blocked each other).
 * - Who is riding (memberIds) and the ride chat (roomId) go only to the people in the ride.
 * - The signed-out teaser (/r/<id>) carries destination, time, seats and the host's first name — nothing else.
 * - Money: we never invent fares. If the host typed an estimated total we divide it, otherwise "split evenly".
 *
 * Dates are campus calendar dates (YYYY-MM-DD, Pacific) and times are HH:MM campus time.
 */
import type { ID, Relationships, User } from '@core/types';
import { schoolTz } from './campusclock';
import { lang } from '@core/i18n';

/** 영어/한국어 한 쌍 — 서버(AROUNDU_LANG)와 화면이 같은 문장을 쓴다. 장소 이름(Sproul Plaza 등)은 고유명사라 그대로 */
const say = (en: string, ko: string) => (lang === 'en' ? en : ko);

export type RideKind = 'driving' | 'splitting' | 'looking';
export type RideStatus = 'open' | 'closed' | 'cancelled';

export interface Ride {
  /** rd_… */
  id: ID;
  schoolId: ID;
  hostId: ID;
  kind: RideKind;
  /** pickup preset key (RIDE_PICKUPS) */
  from: string;
  /** destination preset key, or 'custom' with toCustom */
  to: string;
  toCustom?: string;
  date: string;
  /** leaving window, HH:MM */
  start: string;
  end: string;
  /** driving: seats for riders · splitting: people wanted to share with · looking: people in my party */
  seats: number;
  /** riders who joined (not the host). Only sent to the people in the ride */
  memberIds: ID[];
  /** = memberIds.length, kept so outsiders can see "2 riders" without seeing who */
  memberCount: number;
  /** what the host expects the whole trip to cost (USD) — optional, never guessed */
  estTotal?: number;
  note?: string;
  status: RideStatus;
  /** group chat — opens with the first rider. Only sent to the people in the ride */
  roomId?: ID;
  /** posted by a sample/demo profile — shown with a Sample tag */
  sample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RideInput {
  kind: RideKind;
  from: string;
  to: string;
  toCustom?: string;
  date: string;
  start: string;
  end: string;
  seats: number;
  estTotal?: number;
  note?: string;
}

/** What a signed-out visitor of /r/<id> gets — and what goes into the link preview */
export interface RideTeaser {
  id: ID;
  kind: RideKind;
  /** "SFO" · "Trader Joe's" */
  to: string;
  date: string;
  start: string;
  end: string;
  /** null for "looking for a ride" posts */
  seatsLeft: number | null;
  hostFirstName: string;
  status: RideStatus;
  sample: boolean;
  schoolName: string;
}

export interface RidePlace { key: string; label: string; emoji: string; group: string }

// ─── Places ──────────────────────────────────────────────────────────────────
/** Public meeting points only. Never a home address. */
const BERKELEY_PICKUPS: RidePlace[] = [
  { key: 'unit1', label: 'Unit 1', emoji: '🏢', group: 'southside' },
  { key: 'unit2', label: 'Unit 2', emoji: '🏢', group: 'southside' },
  { key: 'unit3', label: 'Unit 3', emoji: '🏢', group: 'southside' },
  { key: 'blackwell', label: 'Blackwell Hall', emoji: '🏢', group: 'southside' },
  { key: 'foothill', label: 'Foothill', emoji: '🌲', group: 'northside' },
  { key: 'ckc', label: 'Clark Kerr', emoji: '🌳', group: 'southside' },
  { key: 'northside', label: 'Northside (Euclid & Hearst)', emoji: '📍', group: 'northside' },
  { key: 'southside', label: 'Southside (Telegraph & Bancroft)', emoji: '📍', group: 'southside' },
  { key: 'sproul', label: 'Sproul Plaza', emoji: '🐻', group: 'campus' },
  { key: 'bart', label: 'Downtown Berkeley BART', emoji: '🚉', group: 'downtown' },
];
const GENERIC_PICKUPS: RidePlace[] = [
  { key: 'main', label: 'Main campus entrance', emoji: '🏫', group: 'campus' },
  { key: 'union', label: 'Student union', emoji: '🏛️', group: 'campus' },
  { key: 'library', label: 'Main library', emoji: '📚', group: 'campus' },
  { key: 'transit', label: 'Campus transit stop', emoji: '🚌', group: 'campus' },
];

/** group = what "same destination" means for matching */
const BERKELEY_DESTINATIONS: RidePlace[] = [
  { key: 'sfo', label: 'SFO', emoji: '✈️', group: 'sfo' },
  { key: 'oak', label: 'OAK', emoji: '✈️', group: 'oak' },
  { key: 'sjc', label: 'SJC', emoji: '✈️', group: 'sjc' },
  { key: 'tj', label: "Trader Joe's", emoji: '🛒', group: 'errands' },
  { key: 'costco', label: 'Costco Richmond', emoji: '🛒', group: 'errands' },
  { key: 'target', label: 'Target Emeryville', emoji: '🎯', group: 'errands' },
  { key: 'ikea', label: 'IKEA Emeryville', emoji: '🛋️', group: 'errands' },
  { key: 'emeryville', label: 'Emeryville', emoji: '🛍️', group: 'errands' },
  { key: 'sf', label: 'SF downtown', emoji: '🌉', group: 'sf' },
  { key: 'chase', label: 'Chase Center', emoji: '🎤', group: 'sf' },
  { key: 'oakland', label: 'Downtown Oakland', emoji: '🌆', group: 'oakland' },
  { key: 'tahoe', label: 'Tahoe', emoji: '🏔️', group: 'tahoe' },
];

export const CUSTOM = 'custom';

export const ridePickups = (schoolId: ID): RidePlace[] => (schoolId === 's_berkeley' ? BERKELEY_PICKUPS : GENERIC_PICKUPS);
export const rideDestinations = (schoolId: ID): RidePlace[] => (schoolId === 's_berkeley' ? BERKELEY_DESTINATIONS : []);

/** Browse filter chips → destination groups */
export const RIDE_FILTERS: { key: string; label: string; groups: string[] | null }[] = [
  { key: 'all', label: say('All', '전체'), groups: null },
  { key: 'airports', label: say('✈️ Airports', '✈️ 공항'), groups: ['sfo', 'oak', 'sjc'] },
  { key: 'errands', label: say('🛒 Groceries & errands', '🛒 장보기·볼일'), groups: ['errands'] },
  { key: 'city', label: say('🌉 SF & Oakland', '🌉 SF·오클랜드'), groups: ['sf', 'oakland'] },
  { key: 'tahoe', label: say('🏔️ Tahoe', '🏔️ 타호'), groups: ['tahoe'] },
  { key: 'other', label: say('Other', '기타'), groups: ['custom'] },
];

export const RIDE_KIND_LABELS: Record<RideKind, string> = {
  driving: say("I'm driving", '내 차로 가요'),
  splitting: say('Splitting an Uber/Lyft', 'Uber/Lyft 나눠 타기'),
  looking: say('Looking for a ride', '탈 차를 찾아요'),
};
export const RIDE_KIND_SHORT: Record<RideKind, string> = { driving: say('Driving', '운전'), splitting: say('Uber/Lyft split', 'Uber/Lyft 나눠 타기'), looking: say('Looking', '찾는 중') };
export const RIDE_KIND_EMOJI: Record<RideKind, string> = { driving: '🚗', splitting: '🚕', looking: '🙋' };

export const SAFETY_NOTE = say('Meet at the public pickup spot, ride only with verified students, and share your trip with a friend.', '공개된 탑승 장소에서 만나고, 인증된 학생과만 타고, 친구에게 이동 일정을 알려 두세요.');

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const findPlace = (list: RidePlace[], key: string) => list.find((p) => p.key === key);

export function pickupLabel(r: Pick<Ride, 'schoolId' | 'from'>): string {
  return findPlace(ridePickups(r.schoolId), r.from)?.label ?? r.from;
}
export function destLabel(r: Pick<Ride, 'schoolId' | 'to' | 'toCustom'>): string {
  if (r.to === CUSTOM) return r.toCustom?.trim() || say('Somewhere', '어딘가');
  return findPlace(rideDestinations(r.schoolId), r.to)?.label ?? r.to;
}
export function destEmoji(r: Pick<Ride, 'schoolId' | 'to'>): string {
  return findPlace(rideDestinations(r.schoolId), r.to)?.emoji ?? '📍';
}
/** Destination group used for matching — custom destinations match on the same words */
export function destGroup(r: Pick<Ride, 'schoolId' | 'to' | 'toCustom'>): string {
  if (r.to === CUSTOM) return `custom:${norm(r.toCustom ?? '')}`;
  return findPlace(rideDestinations(r.schoolId), r.to)?.group ?? r.to;
}
export const filterGroupOf = (r: Pick<Ride, 'schoolId' | 'to' | 'toCustom'>) => (r.to === CUSTOM ? 'custom' : destGroup(r));

// ─── Time ────────────────────────────────────────────────────────────────────
export const CAMPUS_TZ = 'America/Los_Angeles';
export function campusToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: schoolTz(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function campusNowHHMM(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: schoolTz(), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}
/** 떠난 차 — 지난 날짜이거나, 오늘인데 출발 시간 창(start–end)이 끝났다. 예전엔 날짜만 봐서 오후 5시에 끝난 차가 자정까지 ‘Join’ 으로 남았다 */
export function rideLeft(r: Pick<Ride, 'date' | 'end'>, now: Date = new Date()): boolean {
  const today = campusToday(now);
  return r.date < today || (r.date === today && r.end < campusNowHHMM(now));
}
const DAY = 86_400_000;
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
/** minutes since epoch of the start of the leaving window (campus wall clock — only ever compared with each other) */
export const departMin = (r: Pick<Ride, 'date' | 'start'>) => Date.parse(`${r.date}T00:00:00Z`) / 60000 + toMin(r.start);

/** "9:30am" */
export function clock(hhmm: string): string {
  const m = toMin(hhmm); const h = Math.floor(m / 60); const mm = m % 60;
  const hm = `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`;
  if (lang !== 'en') return `${h < 12 ? '오전' : '오후'} ${mm ? hm : `${hm}시`}`; // "오전 9시" · "오후 1:30"
  return `${hm}${h < 12 ? 'am' : 'pm'}`;
}
/** "Wed Nov 25" */
export function dayLabel(date: string): string {
  if (lang !== 'en') return new Date(`${date}T12:00:00Z`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' });
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).replace(',', '');
}
/** "Wed" · "수" — 목록 한 줄의 요일 */
export function weekdayLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR', { weekday: 'short', timeZone: 'UTC' });
}
/** "Wed Nov 25 · 9:30–10:30am" */
export function whenLabel(r: Pick<Ride, 'date' | 'start' | 'end'>): string {
  const a = clock(r.start), b = clock(r.end);
  if (lang !== 'en') return `${dayLabel(r.date)} · ${r.start === r.end ? a : `${a}–${b.replace(a.slice(0, 2), '').trim()}`}`;
  const sameHalf = a.slice(-2) === b.slice(-2);
  return `${dayLabel(r.date)} · ${r.start === r.end ? a : `${sameHalf ? a.slice(0, -2) : a}–${b}`}`;
}

// ─── Seats & money ───────────────────────────────────────────────────────────
/** "looking" posts have no seats to give — any number of people can team up (up to MAX_GROUP) */
export const MAX_GROUP = 6;
export function seatsLeft(r: Pick<Ride, 'kind' | 'seats' | 'memberCount'>): number | null {
  if (r.kind === 'looking') return null;
  return Math.max(0, r.seats - r.memberCount);
}
export function isFull(r: Pick<Ride, 'kind' | 'seats' | 'memberCount'>): boolean {
  const left = seatsLeft(r);
  return left === null ? r.memberCount + 1 >= MAX_GROUP : left <= 0;
}
export function seatsText(r: Pick<Ride, 'kind' | 'seats' | 'memberCount'>): string {
  const left = seatsLeft(r);
  if (left === null) return r.memberCount ? say(`${r.memberCount} teamed up`, `${r.memberCount}명 함께`) : r.seats > 1 ? say(`${r.seats} people`, `${r.seats}명`) : say('1 person', '1명');
  if (left === 0) return say('Full', '마감');
  return left === 1 ? say('1 seat left', '1자리 남음') : say(`${left} seats left`, `${left}자리 남음`);
}
/** People in the car right now, host included */
export const peopleCount = (r: Pick<Ride, 'memberCount'>) => 1 + r.memberCount;

/**
 * "≈ $14 each with 3 people" when the host typed an estimate, otherwise "Split evenly".
 * N is the people in the ride now (at least 2, so a fresh post shows the 2-person split).
 */
export function fareText(r: Pick<Ride, 'estTotal' | 'memberCount'>, people = Math.max(2, peopleCount(r))): string {
  if (!r.estTotal) return say('Split evenly', '똑같이 나눠요');
  return say(`≈ $${Math.round(r.estTotal / people)} each with ${people} people`, `${people}명이면 1인당 ≈ $${Math.round(r.estTotal / people)}`);
}

/** "Ride to SFO · Wed Nov 25 9:30am · 2 seats left" — link previews and share text */
export function rideTitle(r: Pick<Ride, 'kind' | 'schoolId' | 'to' | 'toCustom' | 'date' | 'start' | 'seats' | 'memberCount' | 'status'>): string {
  const head = r.kind === 'looking' ? say(`Looking for a ride to ${destLabel(r)}`, `${destLabel(r)} 가는 차 찾아요`) : say(`Ride to ${destLabel(r)}`, `${destLabel(r)} 같이 타기`);
  const tail = r.status === 'cancelled' ? say('Cancelled', '취소됨') : r.status === 'closed' ? say('Closed', '모집 마감') : seatsText(r);
  return `${head} · ${dayLabel(r.date)} ${clock(r.start)} · ${tail}`;
}

// ─── Who can use rides ───────────────────────────────────────────────────────
export const schoolOf = (u?: Pick<User, 'affiliation'>) => (u?.affiliation.type === 'university' ? u.affiliation.schoolId ?? '' : '');
/** The "verified student" mark: school email checked by the server, not a sample profile */
export const isVerifiedStudent = (u?: Pick<User, 'affiliation' | 'sample'>) => !!u && u.affiliation.type === 'university' && u.affiliation.emailVerified && !u.sample;

/**
 * Students of a school with a verified school email can post and join.
 * Sample/demo profiles are allowed so the demo works — their rides are labelled Sample.
 */
/** Rides put people in a car with strangers, so they stay 18+ even though Lumi itself is 16+ (birth year only — a floor, not proof) */
export const RIDE_MIN_AGE = 18;
export const isAdultByYear = (birthYear?: number, now = new Date()) => !!birthYear && now.getFullYear() - birthYear >= RIDE_MIN_AGE;
export function rideEligibility(u?: Pick<User, 'affiliation' | 'sample' | 'birthYear'>): { ok: boolean; reason?: string; minor?: boolean } {
  if (!u || u.affiliation.type !== 'university') return { ok: false, reason: say('Rides are for students — sign in with your school account.', '같이 타기는 학생만 쓸 수 있어요 — 학교 계정으로 로그인하세요.') };
  if (!u.sample && !isAdultByYear(u.birthYear)) return { ok: false, minor: true, reason: say(`Rides are for students ${RIDE_MIN_AGE} and older.`, `같이 타기는 만 ${RIDE_MIN_AGE}세 이상 학생만 쓸 수 있어요.`) };
  if (!u.affiliation.emailVerified && !u.sample) return { ok: false, reason: say('Verify your school email to post or join rides — it keeps rides to students from your campus.', '학교 이메일을 인증해야 올리거나 탈 수 있어요 — 같은 학교 학생끼리만 타게 하려는 거예요.') };
  return { ok: true };
}

// ─── Validation ──────────────────────────────────────────────────────────────
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** "2650 Durant Ave", "123 Main St Apt 4" — addresses stay out of public text */
const ADDRESS = /\b\d{1,6}\s+(?:[nsew]\.?\s+)?[a-z0-9.'-]+(?:\s+[a-z0-9.'-]+){0,3}\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|ln|lane|ct|court|ter|terrace|cir)\b\.?/i;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
export const MAX_NOTE = 200;
export const MAX_OPEN_RIDES = 5;
export const MAX_DAYS_AHEAD = 180;
export const MAX_WINDOW_MIN = 6 * 60;

/** null when OK, otherwise a sentence to show the student */
export function validateRideInput(input: Partial<RideInput>, schoolId: ID, today: string): string | null {
  if (!input || !['driving', 'splitting', 'looking'].includes(input.kind as string)) return say('Pick a ride type.', '종류를 고르세요.');
  if (!findPlace(ridePickups(schoolId), String(input.from ?? ''))) return say('Pick a pickup spot from the list — rides meet at public spots, never a home address.', '목록에서 탑승 장소를 고르세요 — 집 주소가 아니라 공개된 장소에서 만나요.');
  if (input.to === CUSTOM) {
    const c = String(input.toCustom ?? '').trim();
    if (c.length < 2 || c.length > 60) return say('Name the destination (2–60 characters).', '목적지 이름을 적어 주세요 (2–60자).');
    if (ADDRESS.test(c)) return say('Use a place name (like "Napa" or "Golden 1 Center"), not a street address.', '도로명 주소 말고 장소 이름(예: "Napa", "Golden 1 Center")을 적어 주세요.');
  } else if (!findPlace(rideDestinations(schoolId), String(input.to ?? ''))) return say('Pick a destination.', '목적지를 고르세요.');
  if (!DATE.test(String(input.date ?? '')) || Number.isNaN(Date.parse(`${input.date}T12:00:00Z`))) return say('Pick a date.', '날짜를 고르세요.');
  if (input.date! < today) return say('That date has passed.', '이미 지난 날짜예요.');
  if (input.date! > addDays(today, MAX_DAYS_AHEAD)) return say('Rides can be posted up to 6 months ahead.', '6개월 안의 날짜만 올릴 수 있어요.');
  if (!HHMM.test(String(input.start ?? '')) || !HHMM.test(String(input.end ?? ''))) return say('Pick a time window.', '출발 시간대를 고르세요.');
  if (toMin(input.end!) < toMin(input.start!)) return say('The window should end after it starts.', '끝나는 시간이 시작보다 뒤여야 해요.');
  if (toMin(input.end!) - toMin(input.start!) > MAX_WINDOW_MIN) return say('Keep the time window under 6 hours so people can plan.', '다른 사람이 계획할 수 있게 시간대는 6시간 안으로 잡아 주세요.');
  const seats = Number(input.seats);
  const maxSeats = input.kind === 'looking' ? 4 : MAX_GROUP - 1;
  if (!Number.isInteger(seats) || seats < 1 || seats > maxSeats) return input.kind === 'looking' ? say('How many people need a ride? (1–4)', '몇 명이 타야 하나요? (1–4)') : say(`Seats should be 1–${maxSeats}.`, `자리는 1–${maxSeats}개예요.`);
  if (input.estTotal !== undefined && input.estTotal !== null) {
    const v = Number(input.estTotal);
    if (!Number.isFinite(v) || v < 1 || v > 2000) return say('Estimated total should be between $1 and $2,000 — or leave it blank.', '예상 총액은 $1–$2,000 사이로 적거나 비워 두세요.');
  }
  const note = String(input.note ?? '');
  if (note.length > MAX_NOTE) return say(`Keep the note under ${MAX_NOTE} characters.`, `메모는 ${MAX_NOTE}자 안으로 적어 주세요.`);
  if (ADDRESS.test(note)) return say('Keep addresses out of the note — meet at the pickup spot.', '메모에 주소는 적지 마세요 — 탑승 장소에서 만나요.');
  if (PHONE.test(note)) return say('Share phone numbers in the ride chat, not the public note.', '전화번호는 공개 메모 말고 라이드 채팅에서 나누세요.');
  return null;
}

/** Trimmed copy with only the fields we keep */
export function cleanRideInput(input: RideInput): RideInput {
  const out: RideInput = { kind: input.kind, from: input.from, to: input.to, date: input.date, start: input.start, end: input.end, seats: Number(input.seats) };
  if (input.to === CUSTOM) out.toCustom = String(input.toCustom ?? '').trim().replace(/\s+/g, ' ');
  if (input.estTotal) out.estTotal = Math.round(Number(input.estTotal));
  const note = String(input.note ?? '').trim().replace(/\s+/g, ' ');
  if (note) out.note = note;
  return out;
}

// ─── Who sees what ───────────────────────────────────────────────────────────
type Rel = { relationships: Pick<Relationships, 'blocks'> };
export const blockedPair = (s: Rel, a: ID, b: ID) => s.relationships.blocks.some((x) => (x.fromId === a && x.toId === b) || (x.fromId === b && x.toId === a));
export const isInRide = (r: Pick<Ride, 'hostId' | 'memberIds'>, userId: ID) => r.hostId === userId || r.memberIds.includes(userId);
/** True when the viewer has a block with anyone already in the ride */
export const blockedInRide = (s: Rel, r: Pick<Ride, 'hostId' | 'memberIds'>, viewerId: ID) => [r.hostId, ...r.memberIds].some((id) => id !== viewerId && blockedPair(s, viewerId, id));

/**
 * Can this viewer see the ride at all?
 * People in the ride always do. Everyone else: same school, not cancelled, not long past, no block with anyone in it.
 */
export function rideVisibleTo(s: Rel & { users: Pick<User, 'id' | 'affiliation'>[] }, r: Ride, viewerId: ID, today: string): boolean {
  if (isInRide(r, viewerId)) return true;
  const viewer = s.users.find((u) => u.id === viewerId);
  if (!viewer || !schoolOf(viewer) || schoolOf(viewer) !== r.schoolId) return false;
  if (r.status === 'cancelled') return false;
  if (r.date < addDays(today, -1)) return false;
  return !blockedInRide(s, r, viewerId);
}

/** The viewer's copy: outsiders get the rider count, not who the riders are, and no chat id */
export function rideFor(r: Ride, viewerId: ID): Ride {
  if (isInRide(r, viewerId)) return r;
  const { roomId: _room, ...rest } = r;
  return { ...rest, memberIds: [], memberCount: r.memberIds.length };
}

export function ridesFor(s: Rel & { users: Pick<User, 'id' | 'affiliation'>[]; rides?: Ride[] }, viewerId: ID, today = campusToday()): Ride[] {
  return (s.rides ?? []).filter((r) => rideVisibleTo(s, r, viewerId, today)).map((r) => rideFor(r, viewerId));
}

/**
 * Filter a patch's rides for one viewer. Rides of the viewer's school that they may no longer see
 * (cancelled, they left, a block) come back as removals so the screen drops them.
 */
export function ridesPatchFor(s: Rel & { users: Pick<User, 'id' | 'affiliation'>[] }, rides: Ride[], viewerId: ID, today = campusToday()): { rides: Ride[]; removed: ID[] } {
  const viewer = s.users.find((u) => u.id === viewerId);
  const school = schoolOf(viewer);
  const out: Ride[] = []; const removed: ID[] = [];
  for (const r of rides) {
    if (rideVisibleTo(s, r, viewerId, today)) out.push(rideFor(r, viewerId));
    else if (school && r.schoolId === school) removed.push(r.id);
  }
  return { rides: out, removed };
}

/** Signed-out preview — destination, time, seats, host first name. No pickup spot, note, riders or chat. */
export function rideTeaser(r: Ride, host: Pick<User, 'nickname'> | undefined, schoolName: string): RideTeaser {
  return {
    id: r.id, kind: r.kind, to: destLabel(r), date: r.date, start: r.start, end: r.end,
    seatsLeft: seatsLeft(r), hostFirstName: (host?.nickname ?? 'A student').trim().split(/\s+/)[0],
    status: r.status, sample: !!r.sample, schoolName,
  };
}

// ─── Matching ────────────────────────────────────────────────────────────────
export const MATCH_WINDOW_MIN = 90;

/** Same destination group, leaving within ±90 min of each other */
export function ridesMatch(a: Pick<Ride, 'schoolId' | 'to' | 'toCustom' | 'date' | 'start'>, b: Pick<Ride, 'schoolId' | 'to' | 'toCustom' | 'date' | 'start'>): boolean {
  return a.schoolId === b.schoolId && destGroup(a) === destGroup(b) && Math.abs(departMin(a) - departMin(b)) <= MATCH_WINDOW_MIN;
}

/**
 * Rides the viewer could join that match `target` (a ride or a draft):
 * open, not full, not past, not theirs, nobody blocked in it. Closest departure first.
 */
export function matchRides(s: Rel & { rides?: Ride[] }, target: Pick<Ride, 'schoolId' | 'to' | 'toCustom' | 'date' | 'start'> & { id?: ID }, viewerId: ID, today = campusToday()): Ride[] {
  return (s.rides ?? [])
    .filter((r) => r.id !== target.id && r.status === 'open' && r.date >= today && !isFull(r) && !isInRide(r, viewerId) && !blockedInRide(s, r, viewerId) && ridesMatch(r, target))
    .sort((a, b) => Math.abs(departMin(a) - departMin(target)) - Math.abs(departMin(b) - departMin(target)));
}

// ─── Seasonal banner ─────────────────────────────────────────────────────────
export interface RideSeason {
  key: string;
  schoolId: ID;
  /** "Thanksgiving break rides" */
  title: string;
  /** first and last day without classes */
  breakStart: string;
  breakEnd: string;
  /** Discover/Browse banner shows from..to (inclusive) */
  showFrom: string;
  showTo: string;
  source: string;
}

/**
 * Dated fallback until the academic-calendar collection is readable on the client.
 * UC Berkeley 2026–27 calendar: no classes Wed Nov 25 (non-instructional) – Fri Nov 27 (Thanksgiving holiday).
 * Screens pass the registrar calendar (api.academic.dates → useAcademicDates) and this is only used while it loads
 * or for a school without one. TODO(academic-calendar): drop once every rides school has calendar rows.
 */
export const RIDE_SEASONS: RideSeason[] = [
  { key: 'thanksgiving-2026', schoolId: 's_berkeley', title: say('Thanksgiving break rides', '추수감사절 연휴 같이 타기'), breakStart: '2026-11-25', breakEnd: '2026-11-29', showFrom: '2026-11-10', showTo: '2026-11-25', source: 'https://registrar.berkeley.edu/wp-content/uploads/UCB_AcademicCalendar_2026-27_a11y.pdf' },
];

/** Minimal shape of an academic-calendar row (lib/academic AcademicDate) */
export interface CalendarDay { schoolId: ID; start: string; end: string; title: string; kind?: string; source?: string }
const BANNER_DAYS_BEFORE = 15;

/**
 * Thanksgiving break from the academic calendar when we have it: the Thanksgiving row, stretched back over
 * no-class days right before it (Berkeley lists Wed Nov 25 as a separate non-instructional day) and on to Sunday.
 * Falls back to RIDE_SEASONS.
 */
export function rideSeasons(schoolId: ID, calendar?: CalendarDay[]): RideSeason[] {
  const rows = (calendar ?? []).filter((d) => d.schoolId === schoolId);
  const out: RideSeason[] = [];
  for (const tg of rows.filter((d) => /thanksgiving/i.test(d.title))) {
    let start = tg.start;
    for (;;) {
      const prev = rows.find((d) => d !== tg && d.end === addDays(start, -1) && (d.kind === 'holiday' || /no classes|non-instructional/i.test(d.title)));
      if (!prev) break;
      start = prev.start;
    }
    const dow = new Date(`${tg.end}T12:00:00Z`).getUTCDay();
    const end = addDays(tg.end, dow === 0 ? 0 : 7 - dow);
    out.push({ key: `thanksgiving-${start.slice(0, 4)}`, schoolId, title: say('Thanksgiving break rides', '추수감사절 연휴 같이 타기'), breakStart: start, breakEnd: end, showFrom: addDays(start, -BANNER_DAYS_BEFORE), showTo: start, source: tg.source ?? '' });
  }
  return out.length ? out : RIDE_SEASONS.filter((x) => x.schoolId === schoolId);
}

/** The season whose banner is up today (Discover / Browse) */
export const bannerSeason = (schoolId: ID, today: string, calendar?: CalendarDay[]) => rideSeasons(schoolId, calendar).find((x) => today >= x.showFrom && today <= x.showTo) ?? null;
/** The next break that hasn't started — the Rides screen offers it as a shortcut well before the banner */
export const upcomingSeason = (schoolId: ID, today: string, calendar?: CalendarDay[]) => rideSeasons(schoolId, calendar).find((x) => today <= x.breakStart && today >= addDays(x.breakStart, -60)) ?? null;
