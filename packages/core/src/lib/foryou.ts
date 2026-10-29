/**
 * For you — 관심사대로 동아리·해커톤·인턴십·장학금·행사를 고르는 추천 엔진.
 *
 * 화면(목록 순서)과 AI(Ask Lumi가 말로 추천)가 **같은 함수**를 쓴다. 같은 질문에 두 답이 나오지 않게.
 *
 * 1. 사람 → 주제 벡터: 전공·목표·관심사·역할·자기소개 글 + 행동(저장·지원·가입한 것)
 *    각 주제가 **어디서 왔는지**도 기억해 둔다 → "전공(CS)에 맞아요", "저장한 Roblox 인턴과 비슷해요" 같은 이유가 된다.
 * 2. 공고·동아리 → 주제 벡터: 제목·태그·분야·호스트·설명에서 키워드로
 * 3. 점수 = 관심 일치(코사인) + 종류 선호(목표) + 때(마감 임박·새 공고·이번 주·모집 중)
 *          + 맞는 대상(대학원/학부·지역) + 친구·비슷한 학생들의 저장
 * 4. 같은 회사·같은 종류가 줄줄이 붙지 않게 섞는다
 *
 * 숫자는 전부 모르는 값을 지어내지 않는다 — 신호가 하나도 없으면 인기·마감 순으로만 정렬한다.
 */
import type { Snapshot } from '@core/api/types';
import type { ID, Opportunity, OpportunityType, Organization, User } from '@core/types';
import { lang } from '@core/i18n';
import { audienceOf, audienceFits, campusDate, isGradStudent, isOfType, regionsOf, type Region } from './listings';

// ─── 주제 ─────────────────────────────────────────────────────────────────
export const TOPICS = {
  software: { en: 'software', ko: '개발', re: /\bsoftware|\bswe\b|developer|programming|\bcoding\b|web dev|full.?stack|back.?end|front.?end|mobile app|\bios\b|android|computer science|\beecs\b|\bcs\b|open.?source|devops|\bcloud\b|cyber|security engineer|hackers?\b/g },
  ai_data: { en: 'AI & data', ko: 'AI·데이터', re: /\bai\b|artificial intelligence|machine learning|\bml\b|deep learning|\bdata\b|analytics|statistic|\bnlp\b|computer vision|\bllms?\b|neural/g },
  hardware: { en: 'hardware & engineering', ko: '하드웨어·공학', re: /hardware|electrical|mechanical|robot|embedded|circuit|aerospace|rocket|motorcycle|solar car|formula sae|\bmaker|3d print|fpga|firmware|silicon|semiconductor/g },
  quant: { en: 'quant & trading', ko: '퀀트·트레이딩', re: /\bquant|trading|\btrader|derivative|market making/g },
  finance: { en: 'finance', ko: '금융', re: /financ|investment|invest(ing|or)|banking|private equity|venture capital|asset management|wealth|accounting|capital markets|fintech|crypto|blockchain|\becon(omics)?\b/g },
  consulting: { en: 'consulting', ko: '컨설팅', re: /consult|case competition|\bstrategy\b/g },
  business: { en: 'business & marketing', ko: '비즈니스·마케팅', re: /business|marketing|\bsales\b|\bbrand|real estate|e-?commerce|growth marketing/g },
  startup: { en: 'startups', ko: '창업', re: /start-?ups?\b|founders?\b|entrepreneur|incubator|accelerator|\bpitch/g },
  design: { en: 'design & product', ko: '디자인·프로덕트', re: /design|\bux\b|\bui\b|product manag|\bpm\b|figma|architecture/g },
  research: { en: 'research', ko: '연구', re: /research|\blabs?\b|scientist|\bph\.?d|thesis|journal club/g }, // ‘seminar·colloquium’ 은 형식이지 분야가 아니다 — 식물·인구학 세미나가 다 ‘연구’로 CS 학생에게 오지 않게
  bio_health: { en: 'bio & health', ko: '바이오·의료', re: /\bbio|medic|pre-?med|health|clinical|neuro|genom|pharm|nursing|dental|chemistry|mycolog|life science/g },
  physics: { en: 'physics & astronomy', ko: '물리·천문', re: /physic|astronom|astrophys|cosmolog|quantum|optics|particle|condensed matter|planetary/g },
  chemistry: { en: 'chemistry & materials', ko: '화학·재료', re: /chemi|materials science|polymer|catalys|biochem/g },
  math: { en: 'math', ko: '수학', re: /\bmath|statistic|probabilit|topolog|algebra|combinator|theoretical computer|discrete math/g },
  policy_law: { en: 'policy & law', ko: '정책·법', re: /policy|\blaw\b|legal|pre-?law|government|politic|debate|model un|\bmun\b|election|voting|civic|international relations/g },
  impact: { en: 'social impact', ko: '사회공헌', re: /volunteer|\bservice\b|nonprofit|social good|social impact|sustainab|climate|environment|tutor|mentor|education|justice|outreach|food bank|equity/g },
  media: { en: 'media & writing', ko: '미디어·글', re: /journalis|newspaper|magazine|writing|writers?\b|podcast|radio|\bfilm|video|photograph|\bmedia\b|editorial|publication|poetry|literature/g },
  arts: { en: 'arts & music', ko: '예술·음악', re: /\barts?\b|music|\bband\b|choir|a cappella|orchestra|\bdanc|theat|drama|comedy|\bimprov\b|paint|drawing|gallery|exhibit|museum|fashion|singing|jazz|\bdj\b/g },
  outdoors: { en: 'outdoors', ko: '아웃도어', re: /hiking|outdoor|climbing|camping|backpacking|surfing|surfers?\b|surf club|\bski(ing|ers?)?\b|snowboard|sailing|kayak|\btrails?\b|boulder/g },
  sports: { en: 'sports & fitness', ko: '운동', re: /sports?\b|basketball|soccer|football|volleyball|tennis|badminton|\brunning\b(?!\s+(?:now|until|through|late|out|on|for|a\b|the\b|this|these|smoothly))|run club|marathon|fitness|\bgym\b|yoga|martial|boxing|\bswim|cycling|frisbee|lacrosse|baseball|rugby|intramural/g },
  games: { en: 'games', ko: '게임', re: /gaming|e-?sports|video games?|league of legends|valorant|call of duty|\bchess|board games?|poker|smash bros|pok[eé]mon|anime|tabletop|dungeons/g },
  culture: { en: 'culture & identity', ko: '문화·커뮤니티', re: /korean|chinese|japanese|vietnamese|filipin|indian|south asian|asian american|latin[oax]|hispanic|\bblack\b|african|caribbean|middle east|\barab|persian|armenian|jewish|international students?|first.?gen|lgbt|queer|women in|cultural|heritage|diaspora/g },
  faith: { en: 'faith', ko: '종교', re: /christian|church|bible|catholic|ministry|hillel|buddhis|hindu|sikh|\bfaith|interfaith|worship|muslim/g },
  food: { en: 'food', ko: '음식', re: /cooking|culinary|baking|\bboba|coffee|\btea\b|foodie|free food|\bpizza/g },
  career: { en: 'careers', ko: '커리어', re: /career|networking|recruit|professional|resume|interview|alumni|mentorship/g },
} as const;
export type Topic = keyof typeof TOPICS;
const TOPIC_KEYS = Object.keys(TOPICS) as Topic[];
export const topicLabel = (t: Topic) => (lang === 'en' ? TOPICS[t].en : TOPICS[t].ko);

type Vec = Partial<Record<Topic, number>>;
const add = (v: Vec, t: Topic, w: number) => { v[t] = (v[t] ?? 0) + w; };

/** 글 → 주제. 한 주제가 여러 번 나와도 3번까지만 센다 */
export function topicsOfText(text: string, weight = 1, into: Vec = {}): Vec {
  if (!text) return into;
  const s = text.toLowerCase();
  for (const t of TOPIC_KEYS) {
    const n = Math.min(s.match(TOPICS[t].re)?.length ?? 0, 3);
    if (n) add(into, t, weight * (1 + Math.log(n)));
  }
  return into;
}
const norm = (v: Vec) => Math.sqrt(TOPIC_KEYS.reduce((a, t) => a + (v[t] ?? 0) ** 2, 0));
const unit = (v: Vec): Vec => { const n = norm(v); if (!n) return {}; const o: Vec = {}; for (const t of TOPIC_KEYS) if (v[t]) o[t] = v[t]! / n; return o; };

// ─── 사람의 관심 프로필 ───────────────────────────────────────────────────
/** 주제가 어디서 왔는지 — 이유 문장에 쓴다 */
export type SourceKind = 'major' | 'goal' | 'interest' | 'role' | 'about' | 'saved' | 'club';
interface Source { kind: SourceKind; label: string; w: number }

const DEPT: [RegExp, Vec][] = [
  [/computer|eecs|electrical engineering and computer/i, { software: 1, ai_data: 0.8, hardware: 0.4 }],
  [/data science|statistic|school of information/i, { ai_data: 1, software: 0.5 }],
  [/business|haas/i, { business: 1, finance: 0.8, consulting: 0.8, startup: 0.6 }],
  [/econom/i, { finance: 1, consulting: 0.5, policy_law: 0.5 }],
  [/math/i, { quant: 0.8, ai_data: 0.5, research: 0.5 }],
  [/mechanical|civil|bioengineering|industrial|chemical engineering|materials|nuclear|engineering/i, { hardware: 1, research: 0.4 }],
  [/biolog|molecular|integrative|neuro|public health|chemistry|nutrition/i, { bio_health: 1, research: 0.7 }],
  [/physics|astronomy|earth|planetary/i, { research: 1, hardware: 0.3 }],
  [/psycholog|cognitive/i, { research: 0.7, bio_health: 0.5 }],
  [/politic|legal|\blaw\b|sociology|history|philosophy|international|ethnic|gender|social science/i, { policy_law: 1, impact: 0.5 }],
  [/english|film|media|journalism|linguistics|rhetoric|comparative literature|east asian|languages/i, { media: 1, arts: 0.4 }],
  [/\bart\b|art practice|music|theater|dance|performance/i, { arts: 1, design: 0.5 }],
  [/architecture|design/i, { design: 1, arts: 0.6 }],
  [/environment|energy|natural resources|esp[mn]?\b/i, { impact: 1, outdoors: 0.5 }],
];
const INTEREST: Record<string, Vec> = {
  coffee: { food: 0.4 }, meal: { food: 0.5 }, study: { research: 0.3 }, exercise: { sports: 1 }, walk: { outdoors: 0.6 },
  cycling: { sports: 0.6, outdoors: 0.6 }, shopping: { arts: 0.3 }, exhibition: { arts: 1 }, club: {}, research: { research: 1 },
  startup: { startup: 1, business: 0.3 }, networking: { career: 1 },
};
const GOAL: Record<string, { topics?: Vec; types?: Partial<Record<RecType, number>> }> = {
  internship: { topics: { career: 0.6 }, types: { internship: 1.5 } },
  hackathon: { topics: { software: 0.6 }, types: { hackathon: 1.5 } },
  join_club: { types: { club: 1.5 } }, start_club: { types: { club: 0.8 } },
  startup: { topics: { startup: 1 }, types: { startup: 1, hackathon: 0.5 } }, cofounder: { topics: { startup: 0.8 }, types: { startup: 0.8 } },
  lab: { topics: { research: 1 }, types: { lab: 1.5 } }, scholarship: { types: { scholarship: 1.5 } },
  friends: { types: { club: 0.6, event: 0.6 } }, lunch: { types: { event: 0.4 } }, hobby: { types: { club: 1 } }, dating: {},
};
const ROLE: Record<string, Vec> = {
  developer: { software: 1 }, designer: { design: 1 }, data: { ai_data: 1 }, marketing: { business: 1 }, video: { media: 1 },
  research: { research: 1 }, presentation: { consulting: 0.3 }, planning: { business: 0.3 }, club_ops: {},
};

/** 추천에 쓰는 종류 — 동아리(조직)도 하나의 종류로 본다 */
export type RecType = OpportunityType | 'club';

export interface InterestProfile {
  vec: Vec;                       // 정규화된 관심 벡터
  sources: Partial<Record<Topic, Source[]>>;
  types: Partial<Record<RecType, number>>;
  /** 신호가 거의 없다 — 인기·마감 위주로 */
  cold: boolean;
  seen: Set<ID>;                  // 이미 지원·완료한 것 (For you에서 뺀다)
  saved: Set<ID>;
}

type Snap = Pick<Snapshot, 'opportunities' | 'opportunityIntents' | 'organizations' | 'relationships' | 'schools'>;

const INTENT_W: Record<string, number> = { applied: 3, done: 2, going: 2.5, team: 2.5, company: 2.5, solo: 2.5, interested: 1.5 };
const HALF_LIFE_DAYS = 30;

export function interestProfile(snap: Snap, me: User, now = new Date()): InterestProfile {
  const raw: Vec = {};
  const sources: Partial<Record<Topic, Source[]>> = {};
  const types: Partial<Record<RecType, number>> = {};
  const feed = (v: Vec, kind: SourceKind, label: string, k = 1) => {
    // 동아리·저장한 것은 그 주된 주제(가장 강한 주제의 3/4 이상)에서만 ‘이유’의 출처가 된다 —
    // 경영 동아리 소개에 ‘research’ 한 번 나왔다고 컴퓨팅 연구직이 “Similar to Alpha Kappa Psi” 가 되지 않게. 점수(raw)는 그대로
    const top = Math.max(0, ...TOPIC_KEYS.map((t) => v[t] ?? 0));
    for (const t of TOPIC_KEYS) if (v[t]) {
      const w = v[t]! * k; add(raw, t, w);
      if ((kind === 'club' || kind === 'saved') && v[t]! < top * 0.75) continue;
      (sources[t] ??= []).push({ kind, label, w });
    }
  };
  if (me.affiliation.type === 'university' && me.affiliation.department) {
    const dept = me.affiliation.department;
    for (const [re, v] of DEPT) if (re.test(dept)) { feed(v, 'major', dept, 1.2); break; }
  }
  for (const g of me.goals ?? []) { const x = GOAL[g]; if (!x) continue; if (x.topics) feed(x.topics, 'goal', g); for (const [k, w] of Object.entries(x.types ?? {})) types[k as RecType] = (types[k as RecType] ?? 0) + w!; }
  for (const i of me.interests ?? []) if (INTEREST[i]) feed(INTEREST[i], 'interest', i, 0.8);
  for (const r of me.canOffer) if (ROLE[r]) feed(ROLE[r], 'role', r, 0.8);
  for (const r of me.lookingFor) if (ROLE[r]) feed(ROLE[r], 'role', r, 0.4);
  const about = [me.bio, me.likes, me.freeTime, me.nowWant, ...(me.prompts ?? []).map((p) => p.answer), me.hotTake?.text].filter(Boolean).join(' · ');
  feed(topicsOfText(about), 'about', '', 0.7);

  // 행동 — 저장·지원한 공고, 가입·팔로우한 조직. 오래된 것은 덜
  const seen = new Set<ID>(); const saved = new Set<ID>();
  const opps = new Map(snap.opportunities.map((o) => [o.id, o]));
  for (const it of snap.opportunityIntents) {
    if (it.userId !== me.id) continue;
    const o = opps.get(it.opportunityId); if (!o) continue;
    if (it.saved) saved.add(o.id);
    if (it.intent === 'applied' || it.intent === 'done') seen.add(o.id);
    const age = Math.max(0, (now.getTime() - new Date(it.createdAt).getTime()) / 86400000);
    const w = Math.max(INTENT_W[it.intent] ?? 1, it.saved ? 2 : 0) * 0.5 ** (age / HALF_LIFE_DAYS);
    feed(itemVecRaw(o), 'saved', o.title, w * 0.6);
    const ty: RecType = o.type; types[ty] = (types[ty] ?? 0) + 0.4 * w;
  }
  for (const org of snap.organizations) {
    const w = org.memberIds.includes(me.id) || org.adminIds.includes(me.id) ? 2 : org.followerIds.includes(me.id) || org.applicantIds.includes(me.id) || !!me.interestedOrgIds?.includes(org.id) ? 1.4 : 0;
    if (!w) continue;
    seen.add(org.id);
    feed(orgVecRaw(org), 'club', org.name, w * 0.6);
    types.club = (types.club ?? 0) + 0.3 * w;
  }
  const signal = norm(raw);
  return { vec: unit(raw), sources, types, cold: signal < 0.5, seen, saved };
}

// ─── 공고·동아리의 주제 ──────────────────────────────────────────────────
const FIELD_TOPIC: Record<string, Vec> = {
  'Software': { software: 2 }, 'Data & AI': { ai_data: 2 }, 'Hardware': { hardware: 2 }, 'Quant & Trading': { quant: 2, finance: 0.6 },
  'Finance & Consulting': { finance: 1.5, consulting: 1.2 }, 'Product & Design': { design: 2 }, 'Business & Marketing': { business: 2 },
  'Research & Science': { research: 2 },
};
const PARENT_TOPIC: [RegExp, Vec][] = [
  [/engineering|computer science/i, { software: 0.6, hardware: 0.6 }], [/professional/i, { career: 0.8 }], [/service/i, { impact: 1 }],
  [/recreational/i, { sports: 0.5, games: 0.4 }], [/spiritual/i, { faith: 1 }], [/political|advocacy/i, { policy_law: 1 }],
  [/media|publication/i, { media: 1 }], [/performing arts|arts student/i, { arts: 1 }], [/cultural|identity|international/i, { culture: 1 }],
  [/environmental|sustainability/i, { impact: 0.8, outdoors: 0.4 }], [/academic/i, { research: 0.4 }],
];
const vecCache = new WeakMap<object, Vec>();
function itemVecRaw(o: Opportunity): Vec {
  const hit = vecCache.get(o); if (hit) return hit;
  const v: Vec = {};
  topicsOfText(o.title, 2, v); topicsOfText(o.tags.join(' '), 1.5, v); topicsOfText(o.host, 1, v); topicsOfText(o.description.slice(0, 500), 0.7, v);
  if (o.field && FIELD_TOPIC[o.field]) for (const [t, w] of Object.entries(FIELD_TOPIC[o.field])) add(v, t as Topic, w!);
  if (o.type === 'hackathon') add(v, 'software', 0.8);
  if (o.type === 'lab') add(v, 'research', 1.5);
  // 행사는 ‘연구’ 라는 말만으로 맞추지 않는다 — 고고학·화학 연구 세미나가 AI 연구를 좋아하는 학생에게 다 가지 않게. 분야(소프트웨어·AI·생물…)로 맞춘다
  if (o.type === 'event') delete v.research;
  vecCache.set(o, v); return v;
}
function orgVecRaw(o: Organization): Vec {
  const hit = vecCache.get(o); if (hit) return hit;
  const v: Vec = {};
  topicsOfText(o.name, 2, v); topicsOfText(o.description.slice(0, 600), 0.8, v); topicsOfText(o.regularActivities.join(' '), 0.8, v);
  for (const [re, x] of PARENT_TOPIC) if (o.parent && re.test(o.parent)) for (const [t, w] of Object.entries(x)) add(v, t as Topic, w!);
  if (o.type === 'lab') add(v, 'research', 1.5);
  vecCache.set(o, v); return v;
}
const dot = (a: Vec, b: Vec) => TOPIC_KEYS.reduce((s, t) => s + (a[t] ?? 0) * (b[t] ?? 0), 0);

// ─── 점수 ─────────────────────────────────────────────────────────────────
export interface Reason { kind: 'topic' | 'major' | 'saved' | 'club' | 'goal' | 'deadline' | 'new' | 'soon' | 'recruiting' | 'friends' | 'popular' | 'place' | 'grad'; text: string; w: number }
export interface Scored { score: number; reasons: Reason[] }

const day = 86400000;
// 버클리 달력으로 센다 — UTC 날짜로 세면 저녁·새벽에 목록의 D-day 배지(daysUntil)와 하루 어긋난다(“D-1 · Closes in 2 days”)
const daysTo = (iso: string, now: Date) => Math.round((Date.parse(`${campusDate(iso)}T12:00:00Z`) - Date.parse(`${campusDate(now.toISOString())}T12:00:00Z`)) / day);
const en = () => lang === 'en';
const say = (e: string, k: string) => (en() ? e : k);
const short = (s: string, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** 관심 일치 → 가장 크게 기여한 주제와 그 주제가 온 곳을 이유로 */
function topicReasons(p: InterestProfile, item: Vec): { sim: number; reasons: Reason[] } {
  const iv = unit(item);
  const sim = dot(p.vec, iv);
  if (sim <= 0) return { sim: 0, reasons: [] };
  const contrib = TOPIC_KEYS.map((t) => [t, (p.vec[t] ?? 0) * (iv[t] ?? 0)] as const).filter(([, c]) => c > 0.04).sort((a, b) => b[1] - a[1]);
  const out: Reason[] = [];
  for (const [t, c] of contrib.slice(0, 2)) {
    const src = (p.sources[t] ?? []).slice().sort((a, b) => b.w - a.w)[0];
    const w = c * 10;
    if (src?.kind === 'major') out.push({ kind: 'major', w, text: src.label.length <= 22 ? say(`Fits your major (${src.label})`, `전공(${src.label})과 맞아요`) : say('Fits your major', '전공과 맞아요') });
    else if (src?.kind === 'saved') out.push({ kind: 'saved', w, text: say(`Like “${short(src.label)}” you saved`, `저장한 “${short(src.label, 24)}” 같은 곳`) });
    else if (src?.kind === 'club') out.push({ kind: 'club', w, text: say(`Similar to ${short(src.label)}`, `${short(src.label, 24)} 같은 곳`) /* 가입뿐 아니라 팔로우·관심 표시한 단체도 여기로 온다 — ‘which you're in’ 은 틀릴 수 있다 */ });
    else out.push({ kind: 'topic', w, text: say(`Matches your interest in ${topicLabel(t)}`, `${topicLabel(t)} 관심사와 맞아요`) });
  }
  // "관심사 A와 맞아요 · 관심사 B와 맞아요" → 한 문장으로
  const topics = out.filter((r) => r.kind === 'topic');
  if (topics.length === 2) {
    const [a, b] = contrib.filter(([t]) => topics.some((r) => r.text.includes(topicLabel(t)))).map(([t]) => topicLabel(t));
    if (a && b) { const i = out.indexOf(topics[1]); out.splice(i, 1); topics[0].text = say(`Matches your interest in ${a} and ${b}`, `${a}·${b} 관심사와 맞아요`); topics[0].w += topics[1].w; }
  }
  // 같은 출처 문장이 두 번 나오지 않게
  return { sim, reasons: out.filter((r, i) => out.findIndex((x) => x.text === r.text) === i) };
}

interface Ctx { snap: Snap; me: User; p: InterestProfile; now: Date; friends: Set<ID>; peersBy: Map<ID, ID[]>; coSaved: Map<ID, number>; homeRegion?: string; q?: Ask }

function context(snap: Snap, me: User, now: Date, ask?: { query?: string; region?: Region }): Ctx {
  const p = interestProfile(snap, me, now);
  const friends = new Set(snap.relationships.friends.filter((f) => f.a === me.id || f.b === me.id).map((f) => (f.a === me.id ? f.b : f.a)));
  const peersBy = new Map<ID, ID[]>();
  for (const it of snap.opportunityIntents) if (it.userId !== me.id) (peersBy.get(it.opportunityId) ?? peersBy.set(it.opportunityId, []).get(it.opportunityId)!).push(it.userId);
  // 나와 같은 것을 저장한 학생들이 또 저장한 것 (아이템 공동 출현)
  const mine = new Set(snap.opportunityIntents.filter((i) => i.userId === me.id).map((i) => i.opportunityId));
  const twins = new Set(snap.opportunityIntents.filter((i) => i.userId !== me.id && mine.has(i.opportunityId)).map((i) => i.userId));
  const coSaved = new Map<ID, number>();
  for (const it of snap.opportunityIntents) if (twins.has(it.userId) && !mine.has(it.opportunityId)) coSaved.set(it.opportunityId, (coSaved.get(it.opportunityId) ?? 0) + 1);
  const sid = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const school = snap.schools.find((s) => s.id === sid);
  const homeRegion = school && /berkeley|stanford|san francisco|santa clara|bay area|oakland|san jose/i.test(`${school.name} ${school.region}`) ? 'Bay Area'
    : school && /los angeles|ucla|usc|irvine|san diego/i.test(`${school.name} ${school.region}`) ? 'Los Angeles' : undefined;
  const q = ask?.query || ask?.region ? parseAsk(ask.query ?? '', homeRegion as Region | undefined, ask.region) : undefined;
  return { snap, me, p, now, friends, peersBy, coSaved, homeRegion, q };
}

// ─── 학생이 방금 말한 것 ("AI 연구 해보고 싶어", "internship near berkeley") ─────────
/** 말한 관심이 추천의 주인공이다 — 프로필(전공·저장)은 순서를 살짝 거드는 정도로만 */
export interface Ask { vec: Vec; words: string[]; region?: Region; topics: Topic[] }
const ASK_STOP = new Set(('a an the and or of for to in on at by with about any some me my i im i\'m is are be want wanna would like love get into find show give looking look need help can could should what which where how do does doing '
  + 'near nearby around close campus school here area local job jobs intern interns internship internships hackathon hackathons competition competitions club clubs scholarship scholarships '
  + 'research ra lab labs program programs opportunity opportunities position positions fall spring 2026 2027 student students undergrad undergraduate for you recommend recommendation something stuff things '
  + 'this that these those there today tonight tomorrow week weeks weekend month now soon upcoming next coming anything good best cool fun new happening '
  + '나 저 좀 쪽 관련 하고 싶어 싶은데 하고싶어 추천 해줘 인턴 인턴십 해커톤 동아리 장학금 연구 같은 거 것').split(/\s+/));
const KO_TOPIC: [RegExp, string][] = [[/물리|천문/, 'physics astronomy'], [/화학/, 'chemistry'], [/수학|통계/, 'math statistics'], [/여름/, 'summer'], [/금융|투자|은행/, 'finance'], [/컨설팅/, 'consulting'], [/인공지능|머신러닝|데이터/, 'machine learning data'], [/개발|코딩|소프트웨어/, 'software'], [/디자인/, 'design'], [/창업|스타트업/, 'startup'], [/의료|의대|바이오|생명/, 'health biology'], [/마케팅/, 'marketing'], [/연구/, 'research'], [/게임/, 'gaming'], [/음악|밴드/, 'music'], [/운동|스포츠/, 'sports'], [/등산|하이킹|아웃도어/, 'hiking outdoor'], [/정책|법/, 'policy law'], [/환경|기후/, 'climate environment'], [/사진|영상|영화/, 'film photography'], [/퀀트|트레이딩/, 'quant trading']];
export function parseAsk(text: string, homeRegion?: Region, region?: Region): Ask {
  const t = text.toLowerCase();
  let r = region;
  if (!r && /\bnear (campus|me|school|here|us)\b|\bnearby\b|\blocal\b|근처|가까운/.test(t)) r = homeRegion;
  if (!r) r = regionsOf({ location: t, remote: false, description: '', type: 'internship' })[0];
  const ko = KO_TOPIC.filter(([re]) => re.test(text)).map(([, en]) => en).join(' ');
  const vec = unit(topicsOfText(`${t} ${ko}`));
  const placeWords = /^(berkeley|bay|sf|san|francisco|oakland|palo|alto|remote|new|york|nyc|seattle|boston|chicago|los|angeles|la|texas|austin)$/;
  const words = [...new Set(`${t} ${ko}`.replace(/[^a-z0-9가-힣+#&\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !ASK_STOP.has(w) && !placeWords.test(w)))].slice(0, 8);
  return { vec, words, region: r, topics: TOPIC_KEYS.filter((k) => (vec[k] ?? 0) > 0.25) };
}
/** 말한 관심과 얼마나 맞는지. 하나도 안 맞으면 null — 금융을 물었는데 개발 인턴이 나오지 않게 */
function askMatch(q: Ask, item: Vec, text: string): { score: number; reasons: Reason[] } | null {
  const hasTopic = TOPIC_KEYS.some((k) => q.vec[k]);
  if (!hasTopic && !q.words.length) return { score: 0, reasons: [] };
  const sim = dot(q.vec, unit(item));
  const low = text.toLowerCase();
  const hits = q.words.filter((w) => low.includes(w));
  const score = sim * 10 + Math.min(hits.length, 3) * 2.5;
  if (score < 2) return null;
  const shared = q.topics.filter((k) => (item[k] ?? 0) > 0).map(topicLabel);
  const text1 = shared.length ? say(`About ${shared.slice(0, 2).join(' & ')}`, `${shared.slice(0, 2).join('·')} 분야`) : say(`Mentions “${hits[0]}”`, `“${hits[0]}” 관련`);
  return { score, reasons: [{ kind: 'topic', w: score, text: text1 }] };
}
const listingText = (o: Opportunity) => `${o.title} ${o.tags.join(' ')} ${o.host} ${o.field ?? ''} ${o.location ?? ''} ${o.description.slice(0, 500)}`;

function typeBoost(c: Ctx, t: RecType): number { return Math.min(c.p.types[t] ?? 0, 3); }

function scoreListing(c: Ctx, o: Opportunity): Scored | null {
  const { me, now } = c;
  if (c.p.seen.has(o.id)) return null;
  if (o.deadline && daysTo(o.deadline, now) < 0) return null;
  if (o.date && !o.deadline && daysTo(o.date, now) < 0) return null; // 시작한 해커톤도 제출 마감 전이면 남긴다
  if (o.schoolId && me.affiliation.type === 'university' && o.schoolId !== me.affiliation.schoolId) return null;
  const aud = audienceOf(o);
  if (aud !== 'all' && !audienceFits(me, o)) return null;

  if (c.q?.region) {
    // "near Berkeley" — 그 지역이거나 우리 학교 공고, Remote 를 물으면 원격만
    const rs = regionsOf({ ...o, location: o.location ?? (o.type === 'hackathon' ? o.description.split(' · ')[0] : undefined) });
    const local = !!o.schoolId && c.q.region === c.homeRegion;
    if (!rs.includes(c.q.region) && !local) return null;
  }
  const base = topicReasons(c.p, itemVecRaw(o));
  // 관심이 있는 사람에게 아무것도 안 맞는 학과 세미나가 ‘이번 주’라는 이유 하나로 들어오지 않게 (신호가 거의 없을 땐 그대로)
  if (!c.q && !c.p.cold && o.type === 'event' && !base.reasons.length) return null; // 겹침이 이유 한 줄도 못 될 만큼 작으면(‘seminar’→연구 정도) 빼기
  let s: number; let why: Reason[];
  if (c.q) {
    const m = askMatch(c.q, itemVecRaw(o), listingText(o)); if (!m) return null;
    // 말한 것이 주인공 — 프로필은 3 정도만, 이유도 전공 한 줄만
    s = m.score + base.sim * 3; why = [...m.reasons, ...base.reasons.filter((r) => r.kind === 'major').map((r) => ({ ...r, w: r.w * 0.2 }))];
  } else { s = base.sim * 10; why = [...base.reasons]; }
  s += typeBoost(c, o.type);
  // 다른 학과·학부가 주는 상·장학금(“Department of Psychology”, “Division of Arts & Humanities”)은 내 전공과 단어가 하나도 안 겹치면 아래로 — 숨기진 않는다(전공 무관인 것도 있다)
  // 우리 학교 공고만 — “U.S. Department of Energy” 같은 연방 부처는 학과가 아니다. 흔한 말(science·studies·engineering·arts)로는 같은 학과로 보지 않는다
  const dept = o.schoolId && me.affiliation.type === 'university' && o.schoolId === me.affiliation.schoolId ? /\b(?:Department|Division) of ([A-Za-z ,&]+)/i.exec(o.host)?.[1] : undefined;
  const myDept = me.affiliation.type === 'university' ? me.affiliation.department ?? '' : '';
  if (dept && myDept) {
    const words = (x: string) => x.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !['and', 'with', 'science', 'sciences', 'studies', 'engineering', 'arts'].includes(w)).map((w) => w.slice(0, 6));
    const mine = new Set(words(myDept));
    if (!words(dept).some((w) => mine.has(w))) s -= 3;
    else { s += 1.5; why.push({ kind: 'major', w: 1.5, text: say('From your department', '내 학과') }); }
  }
  if (aud === 'grad') { s += 1; why.push({ kind: 'grad', w: 1, text: say('For grad students', '대학원생 대상') }); }
  if (o.deadline) {
    const d = daysTo(o.deadline, now);
    if (d <= 3) { s += 1.5; why.push({ kind: 'deadline', w: 1.5, text: d === 0 ? say('Closes today', '오늘 마감') : say(`Closes in ${d} day${d === 1 ? '' : 's'}`, `${d}일 뒤 마감`) }); }
    else if (d <= 14) { s += 0.8; why.push({ kind: 'deadline', w: 0.8, text: say(`Closes in ${d} days`, `${d}일 뒤 마감`) }); }
  }
  // 이미 시작한 것(제출 기간 중인 해커톤)은 '이번 주'가 아니다 — 남은 날은 위의 마감 이유가 말한다
  if (o.date) { const d = daysTo(o.date, now); if (d >= 0 && d <= 7) { s += 1 - d * 0.08; why.push({ kind: 'soon', w: 0.9, text: d === 0 ? say('Today', '오늘') : d === 1 ? say('Tomorrow', '내일') : say('This week', '이번 주') }); } }
  const posted = o.postedAt ?? (o.type === 'internship' ? o.createdAt : undefined);
  if (posted) { const age = (now.getTime() - new Date(posted).getTime()) / day; if (age <= 3) { s += 1.2; why.push({ kind: 'new', w: 1.2, text: say('Just posted', '방금 올라왔어요') }); } else if (age <= 7) s += 0.5; }
  if (o.type === 'hackathon' && /in.?person/i.test(o.tags.join(' ')) && !o.schoolId) {
    // 직접 가야 하는 해커톤 — 가까우면 올리고, 멀면 내린다
    const near = !!c.homeRegion && regionsOf({ ...o, location: o.location ?? o.description.split(' · ')[0] }).includes(c.homeRegion as Region);
    if (near) { s += 1; why.push({ kind: 'place', w: 1, text: say(`In person, ${c.homeRegion}`, `${c.homeRegion === 'Bay Area' ? '베이 지역' : c.homeRegion} 오프라인`) }); } else s -= 4;
  }
  if (o.type === 'internship' && c.homeRegion) {
    const rs = regionsOf(o);
    if (rs.includes(c.homeRegion as Region)) { s += 0.6; why.push({ kind: 'place', w: 0.6, text: say(`In the ${c.homeRegion}`, `${c.homeRegion === 'Bay Area' ? '베이 지역' : c.homeRegion}`) }); }
    else if (rs.includes('Remote')) { s += 0.4; why.push({ kind: 'place', w: 0.4, text: say('Remote-friendly', '원격 가능') }); }
  }
  const peers = c.peersBy.get(o.id) ?? [];
  const fr = peers.filter((u) => c.friends.has(u)).length;
  if (fr) { s += Math.min(fr, 3) * 0.8; why.push({ kind: 'friends', w: fr * 0.8, text: say(`${fr} friend${fr === 1 ? '' : 's'} saved this`, `친구 ${fr}명이 저장했어요`) }); }
  const co = c.coSaved.get(o.id) ?? 0;
  if (co) { s += Math.min(co, 4) * 0.5; why.push({ kind: 'popular', w: co * 0.5, text: say('Saved by students with picks like yours', '비슷한 걸 저장한 학생들이 저장했어요') }); }
  else if (peers.length >= 3) { s += Math.min(peers.length, 10) * 0.12; why.push({ kind: 'popular', w: 0.4, text: say(`${peers.length} students interested`, `${peers.length}명이 관심 있어요`) }); }
  return { score: s, reasons: why.sort((a, b) => b.w - a.w) };
}

const NOT_A_CLUB = /government offices|campus departments/i;
function scoreClub(c: Ctx, o: Organization): Scored | null {
  const { me } = c;
  if (c.p.seen.has(o.id)) return null;
  if (me.affiliation.type !== 'university' || o.schoolId !== me.affiliation.schoolId) return null;
  if (o.parent && NOT_A_CLUB.test(o.parent)) return null;
  const gradOrg = /graduate student organizations|\bgraduate\b|\bph\.?d|\bmba\b/i.test(`${o.parent ?? ''} ${o.name}`);
  if (gradOrg && !isGradStudent(me)) return null;
  const base = topicReasons(c.p, orgVecRaw(o));
  let s: number; let why: Reason[];
  if (c.q && (c.q.words.length || c.q.topics.length)) {
    const m = askMatch(c.q, orgVecRaw(o), `${o.name} ${o.description.slice(0, 600)} ${o.regularActivities.join(' ')}`); if (!m) return null;
    s = m.score + base.sim * 3; why = [...m.reasons];
  } else { s = base.sim * 10; why = [...base.reasons]; }
  s += typeBoost(c, 'club');
  if (gradOrg) { s += 0.8; why.push({ kind: 'grad', w: 0.8, text: say('Grad students', '대학원생 모임') }); }
  if (o.recruitment?.open) { s += 1.5; why.push({ kind: 'recruiting', w: 1.5, text: say('Recruiting now', '지금 모집 중') }); }
  const fr = [...o.memberIds, ...o.followerIds].filter((u) => c.friends.has(u)).length;
  if (fr) { s += Math.min(fr, 3); why.push({ kind: 'friends', w: fr, text: say(`${fr} friend${fr === 1 ? '' : 's'} here`, `친구 ${fr}명이 있어요`) }); }
  // 설명이 거의 없는 곳은 뭘 하는지 알 수 없다 — 살짝 뒤로
  if (o.description.length < 40) s -= 0.6;
  return { score: s, reasons: why.sort((a, b) => b.w - a.w) };
}

// ─── 공개 함수 ────────────────────────────────────────────────────────────
export type Rec =
  | { kind: 'listing'; id: ID; type: RecType; score: number; reasons: Reason[]; item: Opportunity }
  | { kind: 'club'; id: ID; type: 'club'; score: number; reasons: Reason[]; item: Organization };

export interface ForYouOptions {
  /** 이 종류만 (club = 동아리·Greek·연구실 조직) */
  types?: RecType[];
  /** 추가로 이 주제에 맞는 것만 (AI가 "금융 쪽"처럼 좁힐 때) */
  topic?: Topic;
  limit?: number;
  now?: Date;
  /** 같은 회사·같은 종류가 연달아 나오지 않게 섞기 (기본 true) */
  mix?: boolean;
  /** 학생이 말한 관심 그대로 ("AI research", "금융 인턴", "climate tech") — 주어지면 이것이 순위의 중심이 된다 */
  query?: string;
  /** 지역 (query 의 "near Berkeley" 에서도 읽는다) */
  region?: Region;
}

/** 이 사람에게 추천할 공고·동아리, 점수 높은 순 + 이유 */
export function forYou(snap: Snap, me: User, opts: ForYouOptions = {}): Rec[] {
  const now = opts.now ?? new Date();
  const c = context(snap, me, now, { query: opts.query, region: opts.region });
  const want = (t: RecType) => !opts.types?.length || opts.types.includes(t);
  const out: Rec[] = [];
  // 종류는 분류(categoriesOf)로 — "장학금"을 찾으면 연구비 지원(lab)도, "연구"를 찾으면 연구 펠로십(scholarship)도
  const wantListing = (o: Opportunity) => !opts.types?.length || opts.types.some((t) => isOfType(o, t));
  for (const o of snap.opportunities) {
    if (!wantListing(o)) continue;
    if (o.type === 'activity') continue;
    const r = scoreListing(c, o); if (!r) continue;
    if (opts.topic && !(itemVecRaw(o)[opts.topic])) continue;
    out.push({ kind: 'listing', id: o.id, type: o.type, item: o, ...r });
  }
  if (want('club')) for (const o of snap.organizations) {
    const r = scoreClub(c, o); if (!r) continue;
    if (opts.topic && !(orgVecRaw(o)[opts.topic])) continue;
    out.push({ kind: 'club', id: o.id, type: 'club', item: o, ...r });
  }
  out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const mixed = opts.mix === false ? out : mix(out);
  const top = opts.limit ? mixed.slice(0, opts.limit) : mixed;
  limitRepeats(top.map((r) => r.reasons)).forEach((rs, i) => { top[i].reasons = rs; });
  return top;
}

/** 이미 걸러 둔 목록(화면의 필터 결과)을 이 사람 기준으로 매긴다. 추천 대상이 아닌 것(지원함·대상 아님)은 null */
export function scoreListings(snap: Snap, me: User, list: Opportunity[], now = new Date()): Map<ID, Scored | null> {
  const c = context(snap, me, now);
  return new Map(list.map((o) => [o.id, scoreListing(c, o)]));
}
export function scoreClubs(snap: Snap, me: User, list: Organization[], now = new Date()): Map<ID, Scored | null> {
  const c = context(snap, me, now);
  return new Map(list.map((o) => [o.id, scoreClub(c, o)]));
}

/** 종류별 줄을 세우고, 매번 각 줄의 맨 앞(같은 회사가 최근 3개에 있으면 그다음)끼리 비교해 고른다.
 *  최근 4개에 같은 종류가 많을수록 깎는다 → 인턴만 줄줄이, 같은 회사만 줄줄이 나오지 않는다 */
function mix<T extends { score: number; type: RecType; kind: string; item: { name?: string; host?: string } }>(rows: T[]): T[] {
  const hostOf = (r: T) => (r.kind === 'club' ? r.item.name ?? '' : r.item.host ?? '');
  const queues = new Map<RecType, T[]>();
  for (const r of rows) (queues.get(r.type) ?? queues.set(r.type, []).get(r.type)!).push(r);
  const out: T[] = [];
  while (out.length < rows.length) {
    const recentHosts = out.slice(-3).map(hostOf); const recentTypes = out.slice(-4).map((r) => r.type);
    let pick: { q: T[]; i: number; v: number } | undefined;
    for (const [type, q] of queues) {
      if (!q.length) continue;
      let i = q.slice(0, 10).findIndex((r) => !recentHosts.includes(hostOf(r)));
      if (i < 0) i = 0;
      const same = recentTypes.filter((t) => t === type).length;
      const v = q[i].score - (recentHosts.includes(hostOf(q[i])) ? 3 : 0) - same * same * 0.7;
      if (!pick || v > pick.v) pick = { q, i, v };
    }
    out.push(pick!.q.splice(pick!.i, 1)[0]);
  }
  return out;
}

/** 목록 위에서부터 보며 같은 이유 문장은 두 번까지만 남긴다 ("Like X, which you're in" × 20 방지). 마감·날짜는 매번 다르니 그대로 */
export function limitRepeats(lists: Reason[][], max = 2): Reason[][] {
  const seen = new Map<string, number>();
  return lists.map((rs) => rs.filter((x) => {
    if (x.kind === 'deadline' || x.kind === 'soon') return true;
    const n = seen.get(x.text) ?? 0; if (n >= max) return false;
    seen.set(x.text, n + 1); return true;
  }));
}

/** 카드·AI에 쓸 짧은 이유 한 줄 (가장 큰 이유 1~2개) */
export const whyLine = (reasons: Reason[], n = 2) => reasons.slice(0, n).map((r) => r.text).join(' · ');
