/**
 * Lumi AI — OpenAI(GPT) 로 세 가지를 한다.
 *  1) ask:      "오늘 무료 음식?" 같은 질문에 우리 데이터만 검색해서 답하고, 근거 카드를 붙인다
 *  2) profile:  가입할 때 자기소개 몇 줄(또는 이력서)을 읽고 관심사·목표를 채운 뒤 동아리·공고를 추천한다
 *  3) starters: 사람 프로필에서 상대가 공개한 것만으로 첫마디를 제안한다
 *
 * 키는 OPENAI_API_KEY (또는 API_KEY). 없으면 꺼진다 (aiEnabled() === false) — 화면은 AI 없이 원래대로 동작한다.
 * 모델은 AI_MODEL 로 고정할 수 있고, 비어 있으면 키가 쓸 수 있는 모델 중 PREFERRED 순서로 고른다.
 */
import OpenAI from 'openai';
import type { Snapshot, CatalogCourse } from '@core/api/types';
import type { Goal, ID, Interest, OpportunityType, Organization, Purpose, Role, User } from '@core/types';
import { ALL_GOALS, ALL_INTERESTS, ALL_PURPOSES } from '@core/lib/labels';
import { canViewField, isBlocked } from '@core/lib/relations';
import { recommendFor, searchActivities, searchClubs, searchCourses, searchListings, schoolOf, type Card } from './ai-search';
import { TOPICS, type RecType, type Topic } from '@core/lib/foryou';

const apiKey = () => process.env.OPENAI_API_KEY || process.env.API_KEY || '';
export const aiEnabled = () => apiKey().startsWith('sk-');
let client: OpenAI | null = null;
function ai(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: apiKey() });
  return client;
}

/** 키로 쓸 수 있는 모델 중 앞에서부터 — 빠르고 싼 것 위주 (학생 질문 답변·짧은 생성) */
const PREFERRED = ['gpt-5-mini', 'gpt-5.1-mini', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-5', 'gpt-4.1', 'gpt-4o'];
let modelPromise: Promise<string> | null = null;
function model(): Promise<string> {
  if (process.env.AI_MODEL) return Promise.resolve(process.env.AI_MODEL);
  modelPromise ??= (async () => {
    try {
      const ids = new Set<string>();
      for await (const m of ai().models.list()) ids.add(m.id);
      const pick = PREFERRED.find((id) => ids.has(id)) ?? [...ids].filter((id) => /^gpt-/.test(id) && !/audio|realtime|search|transcribe|tts|image/.test(id)).sort().pop();
      if (!pick) throw new Error('no chat model available for this key');
      console.log(`[ai] using model ${pick}`);
      return pick;
    } catch (e) { modelPromise = null; throw e; }
  })();
  return modelPromise;
}

export class AiError extends Error { constructor(public status: number, message: string) { super(message); } }

/** 정해진 JSON 모양으로만 답하게 한다 (structured outputs) */
async function jsonCall(system: string, user: string, name: string, schema: object, refusalMsg: string): Promise<Record<string, unknown>> {
  const m = await model();
  const res = await ai().chat.completions.create({
    model: m, max_completion_tokens: 3000,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    response_format: { type: 'json_schema', json_schema: { name, schema: schema as Record<string, unknown>, strict: true } },
  });
  const msg = res.choices[0]?.message;
  if (!msg || msg.refusal) throw new AiError(422, refusalMsg);
  try { return JSON.parse(msg.content ?? '') as Record<string, unknown>; } catch { throw new AiError(502, 'Something went wrong — please try again.'); }
}

/** 캠퍼스 시간대 기준 오늘 (UC 는 전부 태평양 시간) */
export function campusToday(tz = 'America/Los_Angeles') {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now);
  return { date, weekday };
}

/** 간단한 호출 한도 (프로세스 메모리) — 비용 폭주 방지 */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw new AiError(429, 'You’ve asked a lot in the last hour — try again a bit later.');
  arr.push(now); hits.set(key, arr);
}

const viewerContext = (u: User, school: string) => {
  const a = u.affiliation;
  const yr = a.type === 'university' ? Math.min(4, Math.max(1, new Date().getFullYear() - a.year + 1)) : undefined;
  return [
    `School: ${school}`,
    a.type === 'university' && a.department ? `Major: ${a.department}` : '',
    yr ? `Year: ${a.type === 'university' && a.role === 'graduate' ? 'graduate student' : `${yr}${['st', 'nd', 'rd', 'th'][yr - 1]} year`}` : '',
    u.interests.length ? `Interests: ${u.interests.join(', ')}` : '',
    u.goals.length ? `Goals this semester: ${u.goals.join(', ')}` : '',
  ].filter(Boolean).join('\n');
};

// ─── 1) Ask Lumi ─────────────────────────────────────────────────────────
const ASK_SYSTEM = `You are "Ask Lumi", the assistant inside Lumi, an app for college students to find events, free food, clubs, Greek life, internships, scholarships, research positions, hackathons, classes and study groups at their campus.

How to answer:
- Answer ONLY from what the search tools return. Never invent events, dates, deadlines, locations, links, prices or eligibility. If the tools return nothing useful, say plainly that Lumi doesn't have it yet, and suggest a different way to ask or where the student could look (only name a website if a tool result gave its link).
- When the student asks what fits THEM ("recommend", "for me", "what should I join / apply to / go to", "anything I'd like"), call recommend_for_me first — it ranks by their major, goals, interests and what they saved, the same order the app shows. For each item say in a few words why it fits, using only its why_it_fits reasons. Don't make up other reasons about the student.
- Search before answering anything about listings, clubs, courses or activities. Use several searches with different wording if the first one is thin (e.g. "finance" and "investment banking"; "climbing" and "outdoors").
- Cite every item you mention by putting its id in double brackets right after it, like "Cal Hacks 13.0 [[op_ext_devpost_123]]". The app turns these into tappable cards. Only cite ids that appeared in tool results.
- Dates: today's date and weekday are given below. Resolve "today", "this weekend", "next week" into from/to dates for the search. Deadlines and dates in results are YYYY-MM-DD; say them in a friendly way ("Fri, Oct 17").
- Be brief and scannable: one short sentence, then up to 5 items as a list, each with the one detail that matters (time, deadline, or why it fits). No long intros or sign-offs.
- If a listing's deadline is missing, say "deadline not posted" rather than guessing.
- Reply in the language the student writes in.`;

interface ToolSpec { name: string; description: string; parameters: Record<string, unknown>; run: (input: Record<string, unknown>) => string }
const tool = (t: ToolSpec) => t;
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : undefined);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined);

const LISTING_TYPES: OpportunityType[] = ['event', 'internship', 'hackathon', 'scholarship', 'lab', 'exchange', 'startup', 'club', 'activity'];
const ORG_TYPES: Organization['type'][] = ['club', 'greek', 'lab', 'council', 'department'];

export async function ask(db: Snapshot, catalog: CatalogCourse[], viewer: User, history: { role: 'user' | 'assistant'; content: string }[]): Promise<{ answer: string; cards: Card[] }> {
  const school = db.schools.find((s) => s.id === schoolOf(viewer))?.name ?? 'their school';
  const { date, weekday } = campusToday();
  const seen = new Map<ID, Card>();
  const remember = <T extends { card: Card; forModel: unknown }>(rows: T[]) => { rows.forEach((r) => seen.set(r.card.id, r.card)); return JSON.stringify(rows.length ? rows.map((r) => r.forModel) : { results: [], note: 'No matches. Try other words or fewer filters.' }); };

  const tools = [
    tool({
      name: 'search_listings',
      description: 'Search campus events (talks, socials, free food), internships, hackathons/competitions, scholarships, research/RA (lab), exchange programs and startup programs. Returns only upcoming items. Leave query empty to browse by filters.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keywords, e.g. "finance summer analyst", "machine learning", "career fair"' },
          types: { type: 'array', items: { type: 'string', enum: LISTING_TYPES }, description: 'Limit to these kinds. event = campus events; lab = research/RA positions' },
          free_food: { type: 'boolean', description: 'Only events that mention free food' },
          from: { type: 'string', description: 'Earliest date YYYY-MM-DD (event date, or deadline for applications)' },
          to: { type: 'string', description: 'Latest date YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 15 },
        },
        additionalProperties: false,
      },
      run: (input) => remember(searchListings(db, viewer, date, { query: str(input.query), types: arr(input.types) as OpportunityType[], free_food: input.free_food === true, from: str(input.from), to: str(input.to), limit: num(input.limit) })),
    }),
    tool({
      name: 'search_clubs',
      description: "Search the student's school clubs, Greek life (fraternities/sororities), research labs, student government and departments.",
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keywords, e.g. "climbing", "photography", "consulting", "Korean"' },
          types: { type: 'array', items: { type: 'string', enum: ORG_TYPES }, description: 'greek = fraternities and sororities' },
          recruiting_only: { type: 'boolean' },
          limit: { type: 'integer', minimum: 1, maximum: 15 },
        },
        additionalProperties: false,
      },
      run: (input) => remember(searchClubs(db, viewer, { query: str(input.query), types: arr(input.types) as Organization['type'][], recruiting_only: input.recruiting_only === true, limit: num(input.limit) })),
    }),
    tool({
      name: 'recommend_for_me',
      description: "Personal recommendations for this student: clubs, internships, hackathons, scholarships, research and events ranked by their major, goals, interests and what they've saved or joined. Each result has why_it_fits. Use for any 'what should I…' or 'recommend' question. Narrow with types and/or topic.",
      parameters: {
        type: 'object',
        properties: {
          types: { type: 'array', items: { type: 'string', enum: [...LISTING_TYPES.filter((x) => x !== 'club' && x !== 'activity'), 'club'] }, description: 'club = clubs/Greek/labs (organizations); others are listings' },
          topic: { type: 'string', enum: Object.keys(TOPICS), description: 'Only items about this topic, e.g. finance, ai_data, outdoors, arts' },
          limit: { type: 'integer', minimum: 1, maximum: 10 },
        },
        additionalProperties: false,
      },
      run: (input) => remember(recommendFor(db, viewer, { types: arr(input.types) as RecType[] | undefined, topic: (str(input.topic) && str(input.topic)! in TOPICS ? str(input.topic) : undefined) as Topic | undefined, limit: num(input.limit) })),
    }),
    tool({
      name: 'search_courses',
      description: "Search this term's classes at the student's school: meeting days/times, room, instructor and the official course page or syllabus link.",
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Course code or words, e.g. "CS 61B", "COMPSCI 61B", "data structures", "intro economics"' }, limit: { type: 'integer', minimum: 1, maximum: 12 } },
        required: ['query'],
        additionalProperties: false,
      },
      run: (input) => remember(searchCourses(catalog, viewer, { query: str(input.query) ?? '', limit: num(input.limit) })),
    }),
    tool({
      name: 'search_activities',
      description: 'Search upcoming meetups students created in Lumi: study groups ("Study Crew") for a course, coffee, meals, sports, club events.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'e.g. "CS 61B study", "coffee", "basketball"' }, limit: { type: 'integer', minimum: 1, maximum: 12 } },
        additionalProperties: false,
      },
      run: (input) => remember(searchActivities(db, viewer, date, { query: str(input.query), limit: num(input.limit) })),
    }),
  ];

  const byName = new Map(tools.map((t) => [t.name, t]));
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: `${ASK_SYSTEM}\n\nToday is ${weekday}, ${date} (campus time).\nAbout the student:\n${viewerContext(viewer, school)}` },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
  ];
  const m = await model();
  let raw = '';
  // 도구 호출 루프 — 검색을 몇 번 하고 나면 답을 쓴다 (최대 6 라운드)
  for (let round = 0; round < 6; round++) {
    const res = await ai().chat.completions.create({
      model: m, messages, max_completion_tokens: 4000,
      tools: tools.map((t) => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.parameters } })),
      tool_choice: round === 5 ? 'none' : 'auto',
    });
    const msg = res.choices[0]?.message;
    if (!msg) break;
    const calls = (msg.tool_calls ?? []).filter((c): c is OpenAI.Chat.ChatCompletionMessageFunctionToolCall => c.type === 'function');
    if (!calls.length) { raw = (msg.content ?? '').trim(); if (msg.refusal) return { answer: "Sorry — I can't help with that one. Try asking about events, clubs, classes or opportunities.", cards: [] }; break; }
    messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: calls });
    for (const c of calls) {
      let out: string;
      try {
        const t = byName.get(c.function.name);
        out = t ? t.run(JSON.parse(c.function.arguments || '{}') as Record<string, unknown>) : JSON.stringify({ error: 'unknown tool' });
      } catch { out = JSON.stringify({ error: 'bad arguments — send valid JSON matching the schema' }); }
      messages.push({ role: 'tool', tool_call_id: c.id, content: out });
    }
  }
  const ids = [...raw.matchAll(/\[\[([^\]\s]+)\]\]/g)].map((m) => m[1]);
  const cards = [...new Set(ids)].map((id) => seen.get(id)).filter((c): c is Card => !!c);
  const answer = raw.replace(/\s*\[\[([^\]\s]+)\]\]/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return { answer: answer || "I couldn't find anything for that yet.", cards };
}

// ─── 2) 대화형 가입 ─────────────────────────────────────────────────────────
const SAFE_GOALS = ALL_GOALS.filter((g) => g !== 'dating');
const SAFE_PURPOSES = ALL_PURPOSES.filter((p) => p !== 'dating');
const ROLES: Role[] = ['friend', 'teammate', 'cofounder', 'developer', 'designer', 'data', 'marketing', 'planning', 'presentation', 'video', 'research', 'club_ops', 'study_partner', 'application_partner', 'senior', 'mentor'];

const PROFILE_SCHEMA = {
  type: 'object',
  properties: {
    department: { type: 'string', description: 'Major or program as the student would write it, e.g. "Computer Science". Empty if not stated.' },
    role: { type: 'string', enum: ['undergraduate', 'graduate', 'alumni', 'unknown'] },
    year_in_school: { type: 'integer', description: '1-4 for undergrad year (freshman=1). 0 if not stated.' },
    goals: { type: 'array', items: { type: 'string', enum: SAFE_GOALS } },
    interests: { type: 'array', items: { type: 'string', enum: ALL_INTERESTS } },
    purposes: { type: 'array', items: { type: 'string', enum: SAFE_PURPOSES } },
    looking_for: { type: 'array', items: { type: 'string', enum: ROLES } },
    can_offer: { type: 'array', items: { type: 'string', enum: ROLES } },
    bio: { type: 'string', description: 'One or two first-person sentences for their profile, max 160 characters, in their voice. No made-up facts.' },
    likes: { type: 'string', description: 'Short comma list of things they like, from the text only. Empty if none.' },
    free_time: { type: 'string', description: 'What they like to do in free time, from the text only. Empty if none.' },
    search_terms: { type: 'array', items: { type: 'string' }, description: '3-8 short keywords to find clubs and opportunities for them, e.g. "climbing", "startup", "finance", "machine learning"' },
  },
  required: ['department', 'role', 'year_in_school', 'goals', 'interests', 'purposes', 'looking_for', 'can_offer', 'bio', 'likes', 'free_time', 'search_terms'],
  additionalProperties: false,
} as const;

const PROFILE_SYSTEM = `You turn a college student's short self-description (or pasted résumé) into profile fields for Lumi, a campus app for meeting people and finding events, clubs and opportunities.
Rules: use only what the text says or clearly implies. Never guess gender, age, ethnicity, religion, sexuality or dating intent; never pick dating-related values. Prefer fewer, accurate picks over many. Interests vocabulary: coffee, meal, study, exercise, walk, cycling, shopping, exhibition (arts & shows), club, research, startup, networking, etc. Goal "friends" fits almost everyone who wants to meet people.`;

export interface ProfileDraft {
  department: string; role: 'undergraduate' | 'graduate' | 'alumni' | 'unknown'; yearInSchool: number;
  goals: Goal[]; interests: Interest[]; purposes: Purpose[]; lookingFor: Role[]; canOffer: Role[];
  bio: string; likes: string; freeTime: string;
}

export async function profileDraft(db: Snapshot, schoolId: string, text: string) {
  const p = await jsonCall(PROFILE_SYSTEM, text, 'profile', PROFILE_SCHEMA, "Couldn't read that — try a few plain sentences about yourself.");
  const pick = <T extends string>(v: unknown, allowed: readonly T[]) => (Array.isArray(v) ? [...new Set(v.filter((x): x is T => allowed.includes(x as T)))] : []);
  const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const draft: ProfileDraft = {
    department: str(p.department, 80),
    role: (['undergraduate', 'graduate', 'alumni'] as const).includes(p.role as 'undergraduate') ? (p.role as ProfileDraft['role']) : 'unknown',
    yearInSchool: typeof p.year_in_school === 'number' && p.year_in_school >= 1 && p.year_in_school <= 6 ? Math.round(p.year_in_school) : 0,
    goals: pick(p.goals, SAFE_GOALS), interests: pick(p.interests, ALL_INTERESTS), purposes: pick(p.purposes, SAFE_PURPOSES),
    lookingFor: pick(p.looking_for, ROLES), canOffer: pick(p.can_offer, ROLES),
    bio: str(p.bio, 200), likes: str(p.likes, 120), freeTime: str(p.free_time, 120),
  };
  const terms = Array.isArray(p.search_terms) ? p.search_terms.filter((x): x is string => typeof x === 'string').slice(0, 8) : [];
  return { draft, suggestions: suggestFor(db, schoolId, terms, draft.goals) };
}

/** 가입 직후 보여줄 추천 — 검색어마다 따로 찾아 골고루 섞는다 */
export function suggestFor(db: Snapshot, schoolId: string, terms: string[], goals: Goal[]) {
  const viewer = { id: '_guest', affiliation: { type: 'university', schoolId } } as unknown as User;
  const today = campusToday().date;
  const clubs = new Map<ID, Card>(); const listings = new Map<ID, Card>();
  const types: OpportunityType[] = [...new Set(goals.flatMap((g): OpportunityType[] => (g === 'internship' ? ['internship'] : g === 'scholarship' ? ['scholarship'] : g === 'lab' ? ['lab'] : g === 'hackathon' ? ['hackathon'] : g === 'startup' || g === 'cofounder' ? ['startup', 'hackathon'] : [])))];
  for (const term of terms) {
    for (const r of searchClubs(db, viewer, { query: term, types: ['club', 'greek', 'lab'], limit: 2 })) if (clubs.size < 5) clubs.set(r.card.id, r.card);
    for (const r of searchListings(db, viewer, today, { query: term, types: types.length ? types : undefined, limit: 2 })) if (listings.size < 5) listings.set(r.card.id, r.card);
  }
  return { clubs: [...clubs.values()], listings: [...listings.values()] };
}

// ─── 3) 첫마디 제안 ─────────────────────────────────────────────────────────
const STARTERS_SCHEMA = {
  type: 'object',
  properties: { starters: { type: 'array', items: { type: 'string' }, description: 'Exactly 3 openers' } },
  required: ['starters'],
  additionalProperties: false,
} as const;

const STARTERS_SYSTEM = `You write first messages one college student could send another on Lumi, a campus app for making friends and finding study partners.
Write exactly 3 different openers, each under 140 characters: friendly, specific to the shared facts, easy to reply to (end with a question). Casual, not cheesy. No flirting, no compliments on looks, no emojis spam (at most one). Use only the facts given — never imply you saw anything else about them.`;

/** 상대가 나에게 공개한 것만 모은다 (공개 범위를 서버에서 다시 지킨다) */
export function starterFacts(db: Snapshot, viewer: User, target: User) {
  const see = (f: Parameters<typeof canViewField>[3]) => canViewField(db, viewer, target, f);
  const ta = target.affiliation, va = viewer.affiliation;
  const myCourses = new Set(viewer.timetable.map((c) => c.name));
  const sharedCourses = see('timetable') ? [...new Set(target.timetable.map((c) => c.name).filter((n) => myCourses.has(n)))] : [];
  const sharedInterests = see('interests') ? target.interests.filter((i) => viewer.interests.includes(i)) : [];
  const sharedGoals = see('goals') ? target.goals.filter((g) => viewer.goals.includes(g) && g !== 'dating') : [];
  const sharedOrgs = db.organizations.filter((o) => o.memberIds.includes(viewer.id) && o.memberIds.includes(target.id)).map((o) => o.name);
  const sameDept = ta.type === 'university' && va.type === 'university' && ta.showDepartment && ta.department && ta.department === va.department ? ta.department : '';
  return {
    their_name: target.nickname,
    their_department: ta.type === 'university' && ta.showDepartment ? ta.department : undefined,
    same_department: sameDept || undefined,
    shared_classes: sharedCourses.length ? sharedCourses : undefined,
    shared_interests: sharedInterests.length ? sharedInterests : undefined,
    shared_goals: sharedGoals.length ? sharedGoals : undefined,
    shared_clubs: sharedOrgs.length ? sharedOrgs : undefined,
    their_bio: see('bio') && target.bio ? target.bio : undefined,
    their_likes: see('likes') && target.likes ? target.likes : undefined,
    their_free_time: see('freeTime') && target.freeTime ? target.freeTime : undefined,
    their_prompt_answers: see('prompts') ? target.prompts.filter((p) => p.answer.trim()).slice(0, 3).map((p) => p.answer) : undefined,
    what_they_want_now: target.nowWant || undefined,
  };
}

const starterCache = new Map<string, string[]>();
export async function starters(db: Snapshot, viewer: User, target: User, language: 'en' | 'ko') {
  if (isBlocked(db, viewer.id, target.id)) throw new AiError(404, 'Not available.');
  const facts = starterFacts(db, viewer, target);
  const key = `${viewer.id}|${target.id}|${language}|${JSON.stringify(facts)}`;
  const hit = starterCache.get(key); if (hit) return { starters: hit, facts };
  const out = await jsonCall(STARTERS_SYSTEM, `Write in ${language === 'ko' ? 'Korean' : 'English'}.\nFacts I'm allowed to use:\n${JSON.stringify(facts, null, 1)}`, 'starters', STARTERS_SCHEMA, 'No suggestions for this profile.');
  let list: string[] = [];
  try { const p = out as { starters?: unknown }; list = Array.isArray(p.starters) ? p.starters.filter((x): x is string => typeof x === 'string').map((s) => s.trim().slice(0, 200)).filter(Boolean).slice(0, 3) : []; } catch { /* */ }
  if (!list.length) throw new AiError(502, 'Something went wrong — please try again.');
  if (starterCache.size > 2000) starterCache.clear();
  starterCache.set(key, list);
  return { starters: list, facts };
}
