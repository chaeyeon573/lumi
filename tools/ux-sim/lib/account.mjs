// Fresh REAL accounts on a local stack, made through the app's own API — the same calls the sign-up screen makes
// (src/pages/onboarding/StartPage.tsx): POST /api/schools/send-code → /api/schools/verify-code → /api/auth/register.
// The account is school-e-mail-verified and NOT a sample profile (server/samples.ts only marks seed/demo users), so the
// persona sees what a real new student sees and its own posts are never tagged "Sample".
//
// Peers (scenario setup.peers) are made the same way and then post through the app's RPC as themselves — local test
// fixtures that stand in for "other real students on the app" (live has them; a fresh local store has none).
import { readFileSync, existsSync } from 'node:fs';

const DEFAULT_FV = { bio: 'school', likes: 'school', freeTime: 'school', height: 'private', availability: 'school', preferredPartner: 'private', purposes: 'school', interests: 'public', posts: 'school', prompts: 'public', timetable: 'friends', goals: 'school', living: 'friends' };
const SCHOOL_DOMAIN = { s_berkeley: 'berkeley.edu', s_ucmerced: 'ucmerced.edu' };

/** Persona → the profile the sign-up screen would collect. `persona.account` overrides; the rest is derived. */
export function profileFor(persona, { now = new Date(), schoolId = 's_berkeley' } = {}) {
  const a = persona.account ?? {};
  const thisYear = now.getFullYear();
  const yr = Number(a.yearInSchool ?? 1);
  return {
    nickname: a.nickname ?? persona.name,
    birthYear: Number(a.birthYear ?? thisYear - persona.age),
    department: a.department ?? (persona.major ?? '').replace(/\s*\(.*\)\s*$/, ''),
    yearInSchool: yr,
    role: a.role ?? (yr >= 5 ? 'graduate' : 'undergraduate'),
    // the app stores the entry year for undergrads (StartPage: thisYear - yr + 1) and this year for grads
    year: a.year ?? (yr >= 5 ? thisYear : thisYear - yr + 1),
    gender: a.gender ?? 'private',
    avatar: a.avatar ?? '🙂',
    goals: a.goals ?? ['friends'],
    interests: a.interests ?? [],
    purposes: a.purposes ?? ['friend'],
    lookingFor: a.lookingFor ?? ['friend'],
    likes: a.likes ?? '',
    bio: a.bio ?? '',
    /** the persona's language; the app UI itself stays English unless appLanguage is set (README "Limits") */
    language: persona.language?.preferred ?? 'en',
    appLanguage: a.appLanguage ?? null,
    schoolId: a.schoolId ?? schoolId,
  };
}

export function registerInput(profile, email) {
  return {
    email, nickname: profile.nickname, birthYear: profile.birthYear, gender: profile.gender, avatar: { emoji: profile.avatar, hue: 210, photoType: 'face' },
    schoolId: profile.schoolId, role: profile.role, department: profile.department, year: profile.year,
    emailVerified: true, showSchool: true, showDepartment: true,
    interests: profile.interests, purposes: profile.purposes, bio: profile.bio, likes: profile.likes, freeTime: '', availability: 'after18',
    fieldVisibility: DEFAULT_FV, prompts: [], goals: profile.goals, lookingFor: profile.lookingFor, canOffer: [], meetPreference: [], interestedOrgIds: [],
    locationPermission: 'undecided', notifications: true,
  };
}

async function post(baseUrl, p, body, token) {
  const res = await fetch(new URL(p, baseUrl), {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${p} → ${res.status}: ${json.error ?? text.slice(0, 200)}`);
  return json;
}

/** the 6-digit code: from the on-screen hint (no mail locally), else from the stack's data file */
function codeFrom(hint, email, dataFile) {
  const m = /\b(\d{6})\b/.exec(hint ?? '');
  if (m) return m[1];
  if (dataFile && existsSync(dataFile)) {
    const d = JSON.parse(readFileSync(dataFile, 'utf8'));
    const c = (d.codes ?? []).find((x) => x.email === email);
    if (c) return c.code;
  }
  return null;
}

/**
 * Register a brand-new verified account. Returns { token, user, email, profile }.
 * `tag` makes the e-mail unique (run id); the local part is the persona's nickname.
 */
export async function registerFresh(baseUrl, profile, { tag, dataFile } = {}) {
  const domain = SCHOOL_DOMAIN[profile.schoolId] ?? 'berkeley.edu';
  const local = `${profile.nickname}`.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'student';
  const email = `${local}.${String(tag ?? Date.now().toString(36)).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(-10)}@${domain}`;
  const sent = await post(baseUrl, '/api/schools/send-code', { email, schoolId: profile.schoolId });
  if (!sent.ok) throw new Error(`send-code refused ${email}: ${sent.hint}`);
  let code = codeFrom(sent.hint, email, dataFile);
  for (let i = 0; !code && i < 10; i++) { await new Promise((r) => setTimeout(r, 200)); code = codeFrom('', email, dataFile); }
  if (!code) throw new Error('could not read the sign-up code (no dev code in the hint and none in the data file) — fresh accounts need a local stack without mail');
  const v = await post(baseUrl, '/api/schools/verify-code', { email, code });
  if (!v.ok) throw new Error(`verify-code failed for ${email}`);
  const { token, user } = await post(baseUrl, '/api/auth/register', { input: registerInput(profile, email) });
  if (!user?.affiliation?.emailVerified) throw new Error('registered user is not e-mail-verified');
  if (user.sample) throw new Error('registered user came back as a sample profile');
  return { token, user, email, profile };
}

/** localStorage keys the web app reads for its session (packages/core/src/api/remote/index.ts, packages/core/src/i18n) */
export const BROWSER_KEYS = { token: 'aroundu.remote.token.v1', user: 'aroundu.remote.user.v1', lang: 'aroundu.lang' };

// ─── peers ───────────────────────────────────────────────────────────────────
const isoDay = (offset = 0, tz = 'America/Los_Angeles') => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offset * 86400000));
const nowHHMM = (tz = 'America/Los_Angeles') => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
const addMin = (hhmm, min) => { const [h, m] = hhmm.split(':').map(Number); const t = Math.min(23 * 60 + 59, h * 60 + m + min); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

/** "later today" times stay in the future: a startTime already past moves to now + 45 min (keeps the duration) */
export function resolveTimes(spec) {
  const date = spec.date ?? isoDay(spec.dateOffsetDays ?? 0);
  let { startTime = '12:30', endTime } = spec;
  const dur = endTime ? (Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3))) - (Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3))) : 60;
  if (date === isoDay(0) && startTime <= nowHHMM()) { startTime = addMin(nowHHMM(), 45); }
  endTime = addMin(startTime, Math.max(dur, 15));
  return { date, startTime, endTime };
}

/**
 * Seed other real students for this run: each peer registers like a person would and posts as themself.
 * spec: { nickname, department, yearInSchool, age, activity?: {...}, ride?: {...} }
 * Returns [{ userId, nickname, activityId?, rideId? }].
 */
export async function seedPeers(baseUrl, peers, { tag, dataFile } = {}) {
  const out = [];
  for (const [i, p] of (peers ?? []).entries()) {
    const profile = profileFor({ name: p.nickname, age: p.age ?? 20, major: p.department ?? '', language: { preferred: 'en' }, account: { yearInSchool: p.yearInSchool ?? 2, interests: p.interests ?? ['meal'], goals: p.goals ?? ['friends', 'lunch'] } });
    const acc = await registerFresh(baseUrl, profile, { tag: `${tag ?? ''}p${i}`, dataFile });
    const rec = { userId: acc.user.id, nickname: profile.nickname };
    if (p.activity) {
      const a = p.activity;
      const t = resolveTimes(a);
      const input = {
        kind: a.kind ?? 'group', category: a.category ?? 'meal', title: a.title, description: a.description ?? '', cover: { emoji: a.emoji ?? '🍱', hue: a.hue ?? 30 },
        ...t, place: a.place ?? { name: 'Crossroads', area: 'Unit 1', lat: 37.8667, lng: -122.256 },
        capacity: a.capacity ?? 4, fee: 0, joinPolicy: a.joinPolicy ?? 'open', visibility: a.visibility ?? 'school',
      };
      const r = await post(baseUrl, '/api/rpc/activities/create', { args: [acc.user.id, input] }, acc.token);
      rec.activityId = r.activity?.id ?? (r.patch?.activities ?? r.activities ?? [])[0]?.id ?? null;
    }
    if (p.ride) {
      const r0 = p.ride;
      const input = { kind: r0.kind ?? 'splitting', from: r0.from ?? 'unit2', to: r0.to ?? 'sfo', date: r0.date ?? isoDay(r0.dateOffsetDays ?? 1), start: r0.start ?? '09:00', end: r0.end ?? '10:00', seats: r0.seats ?? 3, ...(r0.estTotal ? { estTotal: r0.estTotal } : {}), ...(r0.note ? { note: r0.note } : {}) };
      const r = await post(baseUrl, '/api/rpc/rides/create', { args: [acc.user.id, input] }, acc.token);
      rec.rideId = r.ride?.id ?? null;
    }
    out.push(rec);
  }
  return out;
}
