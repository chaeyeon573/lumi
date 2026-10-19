/**
 * 데모 계정·예시 프로필 정리 — 친구들에게 링크를 돌릴 때 학교별로 둘러볼 수 있게 한다.
 * - 시드 사용자는 전부 sample=true (화면에 '예시 프로필'로 표시)
 * - 앱에서 내린 학교(Stanford·SF State)에 있던 예시 사용자는 UC Merced 로 옮긴다
 * - 게임(핫테이크·두 개의 진실·이모지·맞혀봐) 항목이 없는 예시 사용자에게 시드 값을 채운다
 * - UC Merced 데모 계정(u_me_ucmerced)을 기본 데모 계정에서 복제해 만든다
 * 이미 적용된 것은 건드리지 않으므로 서버가 켜질 때마다 돌려도 된다.
 * 예시 사용자·모임은 데모 계정에게만, 그 학교 것만 내려간다 — 실제 계정은 받지 않는다 (server/samples.ts, server/view.ts)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Patch, Snapshot } from '@core/api/types';
import type { Activity, ActivityProposal, ChatRoom, ID, Notification, Participation, Post, User } from '@core/types';
import { users as seedUsers, activities as seedActivities, posts as seedPosts, chatRooms as seedRooms, notifications as seedNotifications, proposals as seedProposals, participations as seedParticipations, DEMO_USER_ID } from '@core/data/seed.en';
import { todayISO } from '@core/lib/format';

export { DEMO_USER_ID };
const SEED_IDS = new Set(seedUsers.map((u) => u.id));
const seedById = new Map(seedUsers.map((u) => [u.id, u]));

const MERCED = { schoolId: 's_ucmerced', schoolName: 'UC Merced', emailDomain: 'ucmerced.edu' };
/** 예시 사용자 → UC Merced 로 옮길 때의 학과·생활권 (원래 학교 지명이 들어간 문장도 바꾼다) */
const MOVE_TO_MERCED: Record<ID, { department: string; zone: string; freeTime?: string }> = {
  u_minjun: { department: 'Economics', zone: 'Merced', freeTime: 'Bike rides around Lake Yosemite' },
  u_hana: { department: 'Global Arts Studies', zone: 'Merced', freeTime: 'Wandering downtown Merced' },
};

export const demoUserIdFor = (schoolId?: string) => (schoolId === MERCED.schoolId ? `${DEMO_USER_ID}_ucmerced` : DEMO_USER_ID);

function mercedDemo(base: User): User {
  const u: User = structuredClone(base);
  u.id = demoUserIdFor(MERCED.schoolId);
  u.sample = true;
  if (u.affiliation.type === 'university') u.affiliation = { ...u.affiliation, schoolId: MERCED.schoolId, schoolName: MERCED.schoolName, department: 'Computer Science and Engineering' };
  u.bio = 'CS student at UC Merced. Building side projects and always down for coffee with new people.';
  u.freeTime = 'Coding at the library or walking around Lake Yosemite';
  u.nowWant = 'Coffee near campus tonight?';
  u.prompts = (u.prompts ?? []).map((p, i) => ({ ...p, answer: ['Coffee and talk side projects', 'Kolligian Library by the windows', 'React, best cafés downtown, hiking picks'][i] ?? p.answer }));
  u.timetable = [];
  if (u.living) u.living = { ...u.living, zone: 'Merced' };
  u.interestedOrgIds = [];
  return u;
}

/** 이 학교 목록(schools.csv)에 없고 사용자도 없는 학교는 앱 목록에서 뺀다 — 워커와 같은 규칙 */
function activeSchoolIds(): Set<string> {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const rows = readFileSync(path.join(here, 'data/schools.csv'), 'utf8').trim().split('\n').slice(1);
    return new Set(rows.map((r) => r.split(',')[0]).filter(Boolean));
  } catch { return new Set(); }
}

/** 지금 4학년이 졸업하는 해 — 학년은 가을(8월)에 바뀐다 */
export const seniorClassYear = (now = new Date()) => (now.getUTCMonth() >= 7 ? now.getUTCFullYear() + 1 : now.getUTCFullYear());

export function migrateDemo(db: Snapshot): Patch | null {
  const changed = new Map<ID, User>();
  for (const u of db.users) {
    if (!SEED_IDS.has(u.id)) continue;
    let next = u;
    if (!u.sample) next = { ...next, sample: true };
    // 아이스브레이커 게임 항목 — 게임 기능 이전에 저장된 예시 사용자에게 시드 값을 한 번 채운다 (이미 있으면 건드리지 않음)
    const seedU = seedById.get(u.id);
    if (seedU && !u.hotTake && !u.twoTruths && !u.emojiWeek && !u.pickAnswers) {
      const fill: Partial<User> = {};
      if (seedU.hotTake) fill.hotTake = structuredClone(seedU.hotTake);
      if (seedU.twoTruths) fill.twoTruths = structuredClone(seedU.twoTruths);
      if (seedU.emojiWeek) fill.emojiWeek = structuredClone(seedU.emojiWeek);
      if (seedU.pickAnswers) fill.pickAnswers = structuredClone(seedU.pickAnswers);
      if (Object.keys(fill).length) next = { ...next, ...fill };
    }
    const move = MOVE_TO_MERCED[u.id];
    if (move && next.affiliation.type === 'university' && next.affiliation.schoolId !== MERCED.schoolId) {
      next = { ...next, affiliation: { ...next.affiliation, schoolId: MERCED.schoolId, schoolName: MERCED.schoolName, department: move.department }, living: next.living ? { ...next.living, zone: move.zone } : next.living, freeTime: move.freeTime ?? next.freeTime };
    }
    // 시드는 몇 해 전에 쓰여서 이미 졸업한 학번('25)이 있다 — 예시 학부생이 졸업생이면 올해 4학년으로 올린다
    const seniors = seniorClassYear();
    if (next.affiliation.type === 'university' && next.affiliation.role === 'undergraduate' && next.affiliation.year + 4 < seniors) {
      next = { ...next, affiliation: { ...next.affiliation, year: seniors - 4 } };
    }
    if (next !== u) changed.set(u.id, next);
  }
  const base = changed.get(DEMO_USER_ID) ?? db.users.find((u) => u.id === DEMO_USER_ID);
  const added: User[] = [];
  if (base && !db.users.some((u) => u.id === demoUserIdFor(MERCED.schoolId))) added.push(mercedDemo(base));

  const users = [...db.users.map((u) => changed.get(u.id) ?? u), ...added];
  const active = activeSchoolIds();
  const withUsers = new Set(users.map((u) => (u.affiliation.type === 'university' ? u.affiliation.schoolId ?? '' : '')));
  const hideSchools = active.size ? db.schools.filter((s) => !active.has(s.id) && !withUsers.has(s.id)).map((s) => s.id) : [];

  if (!changed.size && !added.length && !hideSchools.length) return null;
  db.users = users;
  if (hideSchools.length) db.schools = db.schools.filter((s) => !hideSchools.includes(s.id));
  return { users: [...changed.values(), ...added], ...(hideSchools.length ? { removed: { schools: hideSchools } } : {}) };
}

// ─── 예시 모임 날짜 굴리기 ──────────────────────────────────────────────────
// 시드 모임은 "오늘·내일·모레…" 기준으로 쓰여 있다. 그대로 두면 날짜가 지나 Discover 가 텅 빈다.
// 매번 캠퍼스 시간 기준 오늘로 다시 맞추고, 오늘 것 중 이미 끝난 것은 곧 시작하도록 시간을 민다.
const DAY = 86400000;
const seedOffset = new Map(seedActivities.map((a) => [a.id, Math.round((Date.parse(a.date) - Date.parse(todayISO())) / DAY)]));
// 예시 모임 댓글('Yes! Everyone welcome.')도 시드의 '몇 시간 전'으로 — 그대로 두면 Sep 23 으로 찍힌다
const activityCommentAge = new Map(seedActivities.flatMap((a) => (a.comments ?? []).map((c) => [c.id, Date.now() - Date.parse(c.createdAt)] as const)));
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function campusNow(tz = 'America/Los_Angeles') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);

export function rollSampleActivities(db: Snapshot): Patch | null {
  const now = campusNow();
  const soon = Math.ceil((now.minutes + 15) / 15) * 15; // 15분 뒤부터
  const changed: Activity[] = [];
  let k = 0;
  for (const a of db.activities) {
    const offset = seedOffset.get(a.id);
    if (offset === undefined) continue;
    let date = addDays(now.date, offset);
    let start = toMin(a.startTime), end = toMin(a.endTime);
    const dur = Math.max(30, end - start);
    // 원래 시간(시드에 적힌 시간)을 기준으로 다시 계산한다 — 지난번에 밀어 둔 시간이 쌓이지 않게
    const orig = seedActivities.find((x) => x.id === a.id)!;
    start = toMin(orig.startTime); end = start + Math.max(30, toMin(orig.endTime) - start);
    if (offset === 0 && end <= now.minutes) {
      const s2 = soon + (k++ % 4) * 20;
      if (s2 + dur <= 23 * 60) { start = s2; end = s2 + dur; } else { date = addDays(now.date, 1); }
    }
    // 제목·설명도 시드를 따른다 — 시간이 굴러가므로 시각에 묶인 말("lunch")을 고치면 라이브에도 닿게
    const nowMs = Date.now();
    let staleComment = false;
    const comments = (a.comments ?? []).map((c) => {
      const age = activityCommentAge.get(c.id);
      if (age === undefined || Math.abs(nowMs - age - Date.parse(c.createdAt)) < 60 * 60 * 1000) return c;
      staleComment = true;
      return { ...c, createdAt: new Date(nowMs - age).toISOString() };
    });
    const next = { ...a, title: orig.title, description: orig.description, date, startTime: toHHMM(start), endTime: toHHMM(Math.min(end, 23 * 60 + 59)), sample: true, comments };
    if (next.date !== a.date || next.startTime !== a.startTime || next.endTime !== a.endTime || next.title !== a.title || next.description !== a.description || !a.sample || staleComment) changed.push(next);
    void dur;
  }
  if (!changed.length) return null;
  const byId = new Map(changed.map((a) => [a.id, a]));
  db.activities = db.activities.map((a) => byId.get(a.id) ?? a);
  return { activities: changed };
}

// ─── 예시 글·대화 시각 굴리기 ───────────────────────────────────────────────
// 시드 글·대화는 "2시간 전·어제" 기준으로 쓰여 있다("tonight", "today"). 저장된 시각이 그대로면 몇 주 뒤엔
// "Sep 23 · Hosting a coffee meetup tonight" 처럼 보인다 → 시드에 적힌 '몇 시간 전'을 지금 기준으로 다시 맞춘다.
// 시드에 없는 글·댓글·메시지(실제 사람이 쓴 것)는 건드리지 않는다. 데모 계정에 누가 메시지를 보탠 대화는 통째로 둔다.
const LOADED_AT = Date.now();
const ageOf = (iso: string) => LOADED_AT - Date.parse(iso);
const postAge = new Map(seedPosts.map((p) => [p.id, ageOf(p.createdAt)]));
const notificationAge = new Map(seedNotifications.map((n) => [n.id, ageOf(n.createdAt)]));
const commentAge = new Map(seedPosts.flatMap((p) => p.comments.map((c) => [c.id, ageOf(c.createdAt)] as const)));
const participationAge = new Map(seedParticipations.map((p) => [p.id, ageOf(p.createdAt)]));
const seedRoomById = new Map(seedRooms.map((r) => [r.id, r]));
// when("2026-10-21 19:00")은 보낸 날로부터 며칠 뒤인지 기억한다 — 다시 살릴 때 제안 날짜도 같이 옮긴다 (안 그러면 '19h ago' 에 지난달 날짜)
const whenDays = (when: string, from: string) => { const d = /^(\d{4}-\d{2}-\d{2})/.exec(when)?.[1]; return d ? Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${from.slice(0, 10)}T12:00:00Z`)) / 86_400_000) : null; };
const proposalAge = new Map(seedProposals.map((p) => [p.id, { age: ageOf(p.createdAt), ttl: Date.parse(p.expiresAt) - Date.parse(p.createdAt), whenDays: whenDays(p.when, p.createdAt) }]));
const STALE_MS = 60 * 60 * 1000; // 한 시간 넘게 밀렸을 때만 — 15분마다 모든 글을 다시 보내지 않게
const shift = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString();

export function rollSampleContent(db: Snapshot, now = Date.now()): Patch | null {
  const posts: Post[] = [];
  for (const p of db.posts) {
    const age = postAge.get(p.id);
    if (age === undefined || now - age - Date.parse(p.createdAt) < STALE_MS) continue;
    posts.push({ ...p, createdAt: new Date(now - age).toISOString(), comments: p.comments.map((c) => { const a = commentAge.get(c.id); return a === undefined ? c : { ...c, createdAt: new Date(now - a).toISOString() }; }) });
  }
  const chatRooms: ChatRoom[] = [];
  for (const r of db.chatRooms) {
    const orig = seedRoomById.get(r.id);
    if (!orig || !r.messages.length || r.messages.length !== orig.messages.length || r.messages.some((m, i) => m.id !== orig.messages[i].id)) continue;
    const last = orig.messages[orig.messages.length - 1];
    let delta = now - ageOf(last.createdAt) - Date.parse(r.messages[r.messages.length - 1].createdAt);
    // 문구도 시드를 따른다 — 시드 문구를 고치면(숨긴 예시 사람 이름 빼기 등) 라이브 예시 대화에도 닿게
    const staleText = r.messages.some((m, i) => m.text !== orig.messages[i].text);
    if (delta < STALE_MS && !staleText) continue;
    if (delta < STALE_MS) delta = 0;
    chatRooms.push({ ...r, createdAt: shift(r.createdAt, delta), messages: r.messages.map((m, i) => ({ ...m, text: orig.messages[i].text, createdAt: shift(m.createdAt, delta) })), lastReadAt: Object.fromEntries(Object.entries(r.lastReadAt).map(([k, v]) => [k, shift(v, delta)])) });
  }
  // 데모 계정의 예시 알림도 — 'Deadline in 4 days' 가 Sep 23 으로 찍혀 있으면 앱이 멈춘 것처럼 보인다
  const notifications: Notification[] = [];
  for (const n of db.notifications) {
    const age = notificationAge.get(n.id);
    if (age === undefined || now - age - Date.parse(n.createdAt) < STALE_MS) continue;
    notifications.push({ ...n, createdAt: new Date(now - age).toISOString() });
  }
  // 예시 참가 요청 — 관리 화면에 '20분 전' 요청이 'Sep 23' 으로 보이면 아무도 안 쓰는 앱 같다
  const participations: Participation[] = [];
  for (const p of db.participations) {
    const age = participationAge.get(p.id);
    if (age === undefined || now - age - Date.parse(p.createdAt) < STALE_MS) continue;
    participations.push({ ...p, createdAt: new Date(now - age).toISOString() });
  }
  // 예시 1:1 제안 — 시드 후 47시간이면 만료돼 “New proposal” 알림이 빈 목록을 연다. 만료된 것만 다시 기다림으로(답한 것은 그대로)
  const proposals: ActivityProposal[] = [];
  for (const p of db.proposals) {
    const seedP = proposalAge.get(p.id);
    const whenDate = /^(\d{4}-\d{2}-\d{2})/.exec(p.when)?.[1];
    const whenPast = p.status === 'pending' && !!whenDate && whenDate < new Date(now).toISOString().slice(0, 10);
    if (!seedP || !(p.status === 'expired' || (p.status === 'pending' && Date.parse(p.expiresAt) < now) || whenPast)) continue;
    const createdAt = now - seedP.age;
    const created = new Date(createdAt).toISOString();
    const when = seedP.whenDays != null && whenDate ? `${new Date(Date.parse(`${created.slice(0, 10)}T12:00:00Z`) + seedP.whenDays * 86_400_000).toISOString().slice(0, 10)}${p.when.slice(10)}` : p.when;
    proposals.push({ ...p, status: 'pending', when, createdAt: created, expiresAt: new Date(createdAt + seedP.ttl).toISOString() });
  }
  if (!posts.length && !chatRooms.length && !notifications.length && !proposals.length && !participations.length) return null;
  const byPost = new Map(posts.map((p) => [p.id, p])), byRoom = new Map(chatRooms.map((r) => [r.id, r]));
  db.posts = db.posts.map((p) => byPost.get(p.id) ?? p);
  db.chatRooms = db.chatRooms.map((r) => byRoom.get(r.id) ?? r);
  const byNote = new Map(notifications.map((n) => [n.id, n]));
  db.notifications = db.notifications.map((n) => byNote.get(n.id) ?? n);
  const byProposal = new Map(proposals.map((p) => [p.id, p]));
  db.proposals = db.proposals.map((p) => byProposal.get(p.id) ?? p);
  const byPart = new Map(participations.map((p) => [p.id, p]));
  db.participations = db.participations.map((p) => byPart.get(p.id) ?? p);
  return { ...(participations.length ? { participations } : {}), ...(posts.length ? { posts } : {}), ...(chatRooms.length ? { chatRooms } : {}), ...(notifications.length ? { notifications } : {}), ...(proposals.length ? { proposals } : {}) };
}
