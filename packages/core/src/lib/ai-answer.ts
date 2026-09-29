/**
 * AI에게 묻기 — "누구를 만나야 할까"에 사람과 관계로 답한다.
 * 한 문장 → 의도 파악 → 실제 네트워크에서 사람 찾기 → 왜 이 사람인지 → 공통점·서로 아는 사람 → 관련 모임 → 다음 행동.
 * 의도: find(특정 사람) · research(연구 분야) · moving(새 도시) · meal(오늘 같이 밥) · advice(누구를 만나야 할지 모를 때 — 사람 유형부터 제안).
 * 규칙 기반이고 공개 프로필만 쓴다. 민감한 조건(성별·나이·종교 등)은 nlsearch 에서 버린다.
 */
import type { Activity, Organization, PeopleSearch, School, User } from '@core/types';
import type { Snapshot } from '@core/api/types';
import { t } from '@core/i18n';
import { parseQuery, removeChip, type QueryChip } from './nlsearch';
import { searchPeople } from './people';
import { matchScore, shareableReasons, type Reason } from './recommend';
import { cityOf, citiesOf, sameSchool, sameField, isAlumniStage, isGradStage, majorOf, gradYearOf, shortSchool, stageOf } from './network';
import { friendsOf, isBlocked, mutualFriends } from './relations';
import { activeStatus } from './status';
import { todayISO } from './format';
import { INTEREST_LABELS } from './labels';

export type AiIntent = 'find' | 'research' | 'moving' | 'meal' | 'advice';

export interface AiPerson {
  user: User;
  /** 한 줄 — 단계에 맞게 (동문: 학교 'YY · 직무 @ 회사 · 도시 / 대학원생: 학교 석사 · 연구 분야 / 학생: 학교 전공) */
  line: string;
  /** 왜 추천했는지 — 짧은 문장 */
  why: string;
  /** 공통점 (이유 칩) */
  reasons: Reason[];
  /** 겹치는 연구 키워드 · 관련 태그 */
  keywords: string[];
  /** 소개를 부탁할 수 있는 서로 아는 사람 */
  via?: User;
  mutualCount: number;
  /** 지금 시간 됨 · 새 연결 환영 같은 상태 */
  open?: string;
}
export interface AiKind { title: string; why: string; people: AiPerson[] }
export interface AiFollowup { label: string; q?: string; to?: string }
export interface AiAnswer {
  intent: AiIntent;
  /** AI 첫 문장 */
  lead: string;
  /** 이해한 조건 */
  understood: string[];
  people: AiPerson[];
  /** 전체 찾은 수 (people 은 앞의 몇 명) */
  total: number;
  /** 조건을 넓혀서 찾았는가 */
  relaxed: boolean;
  /** advice — 만나 볼 사람 유형 */
  kinds: AiKind[];
  meets: Activity[];
  groups: Organization[];
  followups: AiFollowup[];
  city?: string;
}

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const yy = (y?: number) => (y ? `'${String(y).slice(-2)}` : '');

/** 한 줄 — 단계별 */
export function aiLine(u: User, withSchool = true): string {
  const school = withSchool && u.affiliation.type === 'university' ? shortSchool(u.affiliation.schoolName) : '';
  if (isAlumniStage(u)) {
    const job = [u.career?.role, u.career?.company?.replace(/\s*\((창업|founder)\)/i, '')].filter(Boolean).join(' @ ');
    return [`${school} ${withSchool ? yy(gradYearOf(u)) : ''}`.trim(), majorOf(u), job, cityOf(u)].filter(Boolean).join(' · ');
  }
  if (isGradStage(u)) return [`${school} ${stageOf(u) === 'phd' ? t('박사') : t('석사')}`.trim(), u.research?.field].filter(Boolean).join(' · ');
  return [school, majorOf(u)].filter(Boolean).join(' ');
}

/** 새 연결에 열려 있는지 */
function openLabel(u: User): string | undefined {
  const s = activeStatus(u);
  if (s?.kind === 'meal') return t('오늘 같이 밥 먹을 사람을 찾고 있어요');
  if (s?.kind === 'coffee') return t('오늘 커피 한잔 가능해요');
  if (s) return t('지금 시간 돼요');
  if ((u.openTo ?? []).some((o) => o === 'coffee' || o === 'networking' || o === 'activities')) return t('새 연결 환영');
  return undefined;
}

interface Ctx { snap: Snapshot; me: User; users: User[]; acts: Activity[]; schools: School[]; lang: 'ko' | 'en'; canSeeTT: (u: User) => boolean }

function person(c: Ctx, u: User, why: string, keywords: string[] = []): AiPerson {
  const m = matchScore(c.me, u, c.snap, c.canSeeTT(u));
  const mids = mutualFriends(c.snap, c.me.id, u.id);
  const via = mids.map((id) => c.snap.users.find((x) => x.id === id)).find((x): x is User => !!x && !x.deleted);
  return { user: u, line: aiLine(u), why, reasons: shareableReasons(m.reasons).slice(0, 3), keywords, via, mutualCount: mids.length, open: openLabel(u) };
}
/** 공통 순위 — 추천 점수 + 서로 아는 사람 + 같은 학교 */
function rankUsers(c: Ctx, list: User[], extra: (u: User) => number = () => 0): User[] {
  const friends = new Set(friendsOf(c.snap, c.me.id));
  return list.map((u) => ({ u, s: matchScore(c.me, u, c.snap, c.canSeeTT(u)).score * 0.1 + (mutualFriends(c.snap, c.me.id, u.id).length ? 3 : 0) + (sameSchool(u, c.me) ? 2 : 0) - (friends.has(u.id) ? 4 : 0) + extra(u) }))
    .sort((a, b) => b.s - a.s).map((x) => x.u);
}
const textOf = (a: Activity) => `${a.title} ${a.description ?? ''} ${a.place.area ?? ''} ${a.place.address ?? ''}`;
const upcoming = (c: Ctx) => c.acts.filter((a) => a.date >= todayISO());

// ─── 의도 ────────────────────────────────────────────────────────────────
const RE = {
  advice: /(어떤\s?사람(들)?을?\s?만나|누구(를|를\s?먼저)?\s?만나|누굴\s?만나|어떤\s?사람이\s?필요|만나\s?보는\s?게\s?좋을|who should i (meet|talk)|what kind of people|who do i need)/i,
  meal: /(밥|저녁|점심|혼밥|같이\s?먹|식사|dinner|lunch|eat\b|grab food)/i,
  now: /(오늘|지금|근처|tonight|today|now|nearby|this evening)/i,
  moving: /(이사|옮기|옮겨|이주|새로\s?(가|왔|온)|아는\s?사람이\s?(하나도\s?)?없|moving to|relocat|new in town|don'?t know anyone)/i,
  research: /(연구|논문|research|paper)/i,
  sameSchool: /(같은\s?학교|우리\s?학교|내\s?학교|same school|my school)/i,
  consumer: /(consumer\s?tech|컨슈머\s?테크|소비자\s?(앱|서비스))/i,
};

export function detectIntent(q: string): AiIntent {
  if (RE.advice.test(q)) return 'advice';
  if (RE.meal.test(q) && RE.now.test(q)) return 'meal';
  if (RE.moving.test(q)) return 'moving';
  if (RE.research.test(q) && !/(동문|alumni)/i.test(q)) return 'research';
  return 'find';
}

// ─── 1. 특정 사람 찾기 ───────────────────────────────────────────────────
function answerFind(c: Ctx, q: string): AiAnswer {
  const parsed = parseQuery(q, c.schools, c.lang, { myMajor: majorOf(c.me) });
  let chips = parsed.chips.filter((x) => x.kind !== 'keyword');
  let crit: PeopleSearch = { ...parsed.criteria, q: '' };
  const understood: string[] = [];
  if (RE.consumer.test(q)) { crit = { ...crit, industries: [...crit.industries, 'Consumer Tech'] }; chips = [...chips, { kind: 'industry', label: 'Consumer Tech', value: 'Consumer Tech' }]; }
  const mySchool = c.me.affiliation.type === 'university' ? c.me.affiliation.schoolId : undefined;
  if (RE.sameSchool.test(q) && mySchool && !crit.schools.includes(mySchool)) { crit = { ...crit, schools: [...crit.schools, mySchool] }; chips = [...chips, { kind: 'school', label: t('같은 학교'), value: mySchool }]; }
  // 학생이 "같은 학교"에서 찾으면 재학생부터
  chips.forEach((x) => understood.push(x.label));
  let found = searchPeople(c.users, c.me, crit);
  let relaxed = false;
  // 없으면 조건을 하나씩 넓힌다 — 직무 → 업종 → 관심사 → 상태
  const order: QueryChip['kind'][] = ['role', 'gradYear', 'interest', 'industry', 'stage'];
  for (const k of order) {
    if (found.length) break;
    const drop = chips.find((x) => x.kind === k); if (!drop) continue;
    crit = removeChip(crit, drop); chips = chips.filter((x) => x !== drop); relaxed = true;
    found = searchPeople(c.users, c.me, crit);
  }
  const studentAsk = RE.sameSchool.test(q) && !isAlumniStage(c.me);
  const ranked = rankUsers(c, found, (u) => (studentAsk && !isAlumniStage(u) ? 4 : 0));
  const chipOf = (k: QueryChip['kind']) => chips.filter((x) => x.kind === k);
  const people = ranked.slice(0, 4).map((u) => {
    const parts: string[] = [];
    if (chipOf('city').length) parts.push(fill(t('{city}에 살아요'), { city: cityOf(u) ?? '' }));
    if (chipOf('school').length && isAlumniStage(u)) parts.push(fill(t('{school} {year} 동문'), { school: u.affiliation.type === 'university' ? shortSchool(u.affiliation.schoolName) : '', year: yy(gradYearOf(u)) }));
    if ((chipOf('role').length || chipOf('industry').length) && u.career) {
      const co = (u.career.company ?? '').replace(/\s*\((창업|founder)\)/i, '');
      parts.push(/창업자|founder/i.test(u.career.role ?? '') ? fill(t('{company} 창업자'), { company: co }) : fill(t('{company}에서 {role}'), { company: co, role: u.career.role ?? '' }));
    }
    const ints = chipOf('interest').map((x) => x.value).filter((v) => u.interests.includes(v as never));
    if (ints.length) parts.push(fill(t('{interest}에 관심 있어요'), { interest: ints.map((i) => INTEREST_LABELS[i as keyof typeof INTEREST_LABELS]).join('·') }));
    const kw: string[] = [];
    const hosting = c.acts.find((a) => a.hostId === u.id && a.date >= todayISO() && /(창업|팀원|스타트업|startup|team)/i.test(textOf(a)));
    if (hosting) kw.push(t('창업 모임 운영'));
    if (u.lookingFor.includes('developer') || (u.seeking ?? []).some((s) => /팀원|개발자|공동창업/.test(s))) kw.push(t('팀원 모집 중'));
    const joined = c.snap.participations.find((p) => p.userId === u.id && p.status === 'approved' && c.acts.some((a) => a.id === p.activityId && /(창업|startup)/i.test(textOf(a))));
    if (joined && !hosting) kw.push(t('창업 세션 참여'));
    return person(c, u, parts.join(' · ') || t('찾으신 조건과 가까워요'), kw);
  });
  const words = [...chips.filter((x) => ['city', 'interest', 'role', 'industry'].includes(x.kind)).map((x) => x.label.toLowerCase().replace('창업자', '창업')), ...chipOf('interest').map((x) => x.value)];
  const cityWords = chipOf('city').map((x) => x.label);
  const groups = c.snap.organizations.filter((o) => chipOf('interest').some((x) => (o.interests ?? []).includes(x.value as never)) && (!mySchool || !o.schoolId || o.schoolId === mySchool))
    .sort((a, b) => Number(b.schoolId === mySchool) - Number(a.schoolId === mySchool)).slice(0, 1);
  const meets = upcoming(c).map((a) => ({ a, n: words.filter((w) => w.length >= 2 && textOf(a).toLowerCase().includes(w)).length + words.filter((w) => w.length >= 2 && a.title.toLowerCase().includes(w)).length * 2 + (groups.some((g) => g.id === a.orgId) ? 3 : 0) }))
    .filter((x) => x.n > 0 && (!cityWords.length || cityWords.some((w) => `${x.a.place.area ?? ''} ${x.a.place.address ?? ''}`.includes(w)))).sort((a, b) => b.n - a.n).slice(0, 2).map((x) => x.a);
  const total = found.length;
  const lead = total === 0 ? t('가까운 네트워크에서는 아직 찾지 못했어요. 지인들에게 물어볼까요?')
    : relaxed ? fill(t('조건을 조금 넓혀서 {n}명을 찾았어요.'), { n: total })
      : fill(t('조건에 맞는 사람 {n}명을 찾았어요. 왜 추천했는지와 서로 아는 사람도 함께 보여드릴게요.'), { n: total });
  return { intent: 'find', lead, understood, people, total, relaxed, kinds: [], meets, groups,
    followups: [{ label: t('지인들에게 물어보기'), to: `/people/ask?q=${encodeURIComponent(q)}` }, { label: t('조건으로 자세히 보기'), to: `/people/find?q=${encodeURIComponent(q)}` }] };
}

// ─── 2. 연구 분야 ────────────────────────────────────────────────────────
const SYN: [string, string[]][] = [['보행', ['pedestrian', '보행', '걷']], ['행태', ['behavior', '행태', '행동']], ['도시', ['urban', '도시']], ['공간', ['space', '공간']], ['GIS', ['gis', '공간정보', '공간 데이터']],
  ['NLP', ['nlp', '자연어']], ['LLM', ['llm', '언어 모델']], ['AI', ['인공지능']], ['모빌리티', ['mobility', '모빌리티', '교통']], ['시뮬레이션', ['simulation', '시뮬레이션']]];
function researchTerms(q: string): { terms: string[]; labels: string[] } {
  const low = q.toLowerCase();
  const terms = new Set<string>(); const labels: string[] = [];
  SYN.forEach(([label, g]) => { if (g.some((w) => low.includes(w)) || (label === 'AI' && /\bai\b/i.test(q))) { labels.push(label); g.forEach((w) => terms.add(w)); if (label === 'AI') terms.add('ai'); } });
  // 사전에 없는 분야 ("도시계획 연구하는 대학원생") — 남은 낱말을 그대로 쓴다
  if (!labels.length) {
    const STOP = /^(연구하는|연구|대학원생|대학원|사람|사람들|중에|같이|얘기해볼|만한|있어|있어요|있을까|하는|다른|학교에서|학교|분|석사|박사|researching|research|grad|students?|people|at|other|schools?|in)$/i;
    q.split(/\s+/).map((w) => w.replace(/(에서|에게|으로|로|을|를|은|는|이|가|의|와|과|도|\?|\.)+$/u, '')).filter((w) => w.length >= 2 && !STOP.test(w)).forEach((w) => { labels.push(w); terms.add(w.toLowerCase()); });
  }
  return { terms: [...terms], labels };
}
function answerResearch(c: Ctx, q: string): AiAnswer {
  const { terms, labels } = researchTerms(q);
  const scored = c.users.filter((u) => u.id !== c.me.id && (isGradStage(u) || !!u.research) && u.research)
    .map((u) => {
      const kws = [u.research!.field, ...(u.research!.keywords ?? [])];
      const hit = kws.filter((k) => terms.some((w) => k.toLowerCase().includes(w)));
      return { u, hit };
    }).filter((x) => x.hit.length > 0);
  const rankedIds = rankUsers(c, scored.map((x) => x.u), (u) => (scored.find((x) => x.u.id === u.id)?.hit.length ?? 0) * 3).map((u) => u.id);
  const people = rankedIds.slice(0, 4).map((id) => {
    const x = scored.find((s) => s.u.id === id)!;
    const why = fill(t('{field} 연구 · 겹치는 주제: {kw}'), { field: x.u.research!.field, kw: x.hit.slice(0, 2).join(', ') });
    return person(c, x.u, why, x.hit.slice(0, 3));
  });
  const meets = upcoming(c).filter((a) => (a.category === 'study' || a.category === 'seminar') && terms.some((w) => textOf(a).toLowerCase().includes(w))).slice(0, 2);
  return { intent: 'research', understood: [t('연구 분야'), ...labels], people, total: scored.length, relaxed: false, kinds: [], meets, groups: [],
    lead: scored.length ? fill(t('연구 관심사가 겹치는 사람 {n}명을 찾았어요. 다른 학교 연구실까지 봤고, 어떤 키워드가 겹치는지 함께 보여드릴게요.'), { n: scored.length }) : t('아직 같은 분야 연구자를 찾지 못했어요. 연구 분야를 조금 넓혀 볼까요?'),
    followups: [{ label: t('리딩 그룹 만들기'), to: '/meet/create?category=study' }, { label: t('지인들에게 물어보기'), to: `/people/ask?q=${encodeURIComponent(q)}` }] };
}

// ─── 3. 새 도시 ──────────────────────────────────────────────────────────
function answerMoving(c: Ctx, q: string): AiAnswer {
  const parsed = parseQuery(q, c.schools, c.lang);
  const city = parsed.criteria.homeCities[0] ?? cityOf(c.me) ?? '';
  const inCity = c.users.filter((u) => u.id !== c.me.id && citiesOf(u).some((x) => x.toLowerCase() === city.toLowerCase()));
  const my = c.me.birthYear;
  const ranked = rankUsers(c, inCity, (u) => (isAlumniStage(u) ? 1 : 0) + (Math.abs(u.birthYear - my) <= 4 ? 1.5 : 0) + (sameField(u, c.me) ? 2 : 0) + (openLabel(u) ? 1.5 : 0));
  const people = ranked.slice(0, 4).map((u) => {
    const parts: string[] = [];
    if (sameSchool(u, c.me)) parts.push(t('같은 학교 동문'));
    if (Math.abs(u.birthYear - my) <= 4) parts.push(t('비슷한 또래'));
    if (sameField(u, c.me)) parts.push(t('같은 업계'));
    const shared = u.interests.filter((i) => c.me.interests.includes(i)).slice(0, 2).map((i) => INTEREST_LABELS[i]);
    if (shared.length) parts.push(fill(t('{x} 좋아해요'), { x: shared.join('·') }));
    return person(c, u, [fill(t('{city}에 살아요'), { city }), ...parts].join(' · '), (u.helpWith ?? []).slice(0, 2));
  });
  const meets = upcoming(c).filter((a) => textOf(a).includes(city)).sort((a, b) => Number(!!b.newcomers) - Number(!!a.newcomers)).slice(0, 2);
  const groups = c.snap.organizations.filter((o) => o.city === city || o.name.includes(city)).slice(0, 1);
  return { intent: 'moving', city, understood: [city, t('새로 이사'), t('아는 사람 없음')], people, total: inCity.length, relaxed: false, kinds: [], meets, groups,
    lead: inCity.length ? fill(t('{city}에 사는 사람 {n}명을 찾았어요. 같은 학교 동문, 비슷한 또래와 분야, 새 연결에 열려 있는 사람부터 보여드릴게요.'), { city, n: inCity.length }) : fill(t('{city}에는 아직 아는 사람이 없어요. 방문 일정을 알려두면 그 도시 사람에게 보여요.'), { city }),
    followups: [{ label: fill(t('{city} 이사 일정 알리기'), { city }), to: '/people/around' }, { label: t('지인들에게 물어보기'), to: `/people/ask?q=${encodeURIComponent(q)}` }] };
}

// ─── 4. 오늘 같이 밥 ─────────────────────────────────────────────────────
function answerMeal(c: Ctx): AiAnswer {
  const city = cityOf(c.me) ?? '';
  const today = todayISO();
  const cand = c.users.filter((u) => u.id !== c.me.id && citiesOf(u).some((x) => citiesOf(c.me).includes(x)) && (() => { const s = activeStatus(u); return !!s && (s.kind === 'meal' || s.kind === 'coffee' || s.kind === 'chat'); })());
  const ranked = rankUsers(c, cand, (u) => (activeStatus(u)?.kind === 'meal' ? 3 : 0));
  const people = ranked.slice(0, 3).map((u) => person(c, u, [openLabel(u) ?? '', citiesOf(u)[0] ? fill(t('{city}에 있어요'), { city: citiesOf(u)[0] }) : ''].filter(Boolean).join(' · ')));
  const meets = c.acts.filter((a) => a.date === today && (a.category === 'meal' || a.category === 'coffee') && a.startTime >= '17:00')
    .filter((a) => !/(점심|lunch)/i.test(a.title)).sort((a, b) => Number(b.category === 'meal') - Number(a.category === 'meal') || a.startTime.localeCompare(b.startTime)).slice(0, 2);
  return { intent: 'meal', city, understood: [t('오늘 저녁'), city, t('같이 밥')].filter(Boolean), people, total: cand.length, relaxed: false, kinds: [], meets, groups: [],
    lead: fill(t('오늘 저녁 같이 먹을 수 있는 사람 {n}명과 이미 열린 저녁 모임 {m}개를 찾았어요. 모임에 바로 참여하거나, 한 사람에게 먼저 말을 걸어 보세요.'), { n: cand.length, m: meets.length }),
    followups: [{ label: t('저녁 모임 열기'), to: '/meet/create?category=meal' }, { label: t('나도 오늘 시간 된다고 알리기'), to: '/profile/open-to' }] };
}

// ─── 5. 누구를 만나야 할지 모를 때 ──────────────────────────────────────
interface KindDef { title: string; why: string; match: (u: User) => boolean }
const has = (u: User, re: RegExp) => re.test(`${u.career?.industry ?? ''} ${u.career?.role ?? ''} ${u.career?.company ?? ''} ${u.research?.field ?? ''}`);
function kindsFor(q: string): { topic: string; kinds: KindDef[] } {
  const ai = /(ai|인공지능|머신러닝|llm)/i.test(q);
  const startup = /(스타트업|창업|startup|found)/i.test(q);
  const grad = /(대학원|유학|박사|grad school|phd)/i.test(q);
  const founders: KindDef = { title: t('창업을 먼저 해 본 사람'), why: t('팀 꾸리기, 첫 고객, 첫 투자처럼 처음 겪는 일을 먼저 지나온 사람이에요.'), match: (u) => has(u, /(창업자|founder)/i) };
  const investors: KindDef = { title: t('투자자 · 액셀러레이터'), why: t('어떤 팀이 투자를 받는지, 언제 투자를 알아봐야 하는지 알려줄 수 있어요.'), match: (u) => has(u, /(투자|vc|벤처|액셀러|심사역|invest)/i) };
  if (ai && startup) return { topic: t('AI 스타트업'), kinds: [
    { title: t('AI 제품을 직접 만들어 본 사람'), why: t('모델보다 어려운 건 사람들이 실제로 쓰게 만드는 일이에요. 데이터·평가·사용자 경험을 먼저 겪어 본 사람이에요.'), match: (u) => !!u.career && isAlumniStage(u) && has(u, /(^|\s)ai(\s|$)|인공지능|ml|머신/i) && !has(u, /(투자|심사역|액셀러)/) },
    founders, investors] };
  if (startup) return { topic: t('창업'), kinds: [founders, { title: t('같은 업계에서 일하는 사람'), why: t('고객이 실제로 무엇에 돈을 쓰는지 현장에서 알려줄 수 있어요.'), match: (u) => !!u.career?.industry && !has(u, /(창업자|투자)/) }, investors] };
  if (grad) return { topic: t('대학원 진학'), kinds: [
    { title: t('먼저 진학한 선배'), why: t('연구실 고르기, 지원 시기, 첫 학기를 먼저 겪었어요.'), match: (u) => isGradStage(u) },
    { title: t('박사 후 일하는 동문'), why: t('학위가 실제 일에서 어떻게 쓰이는지 알려줄 수 있어요.'), match: (u) => isAlumniStage(u) && has(u, /(연구|research|ml|데이터)/i) },
    { title: t('같은 분야 연구자'), why: t('관심 주제가 요즘 어디로 가는지 이야기할 수 있어요.'), match: (u) => !!u.research }] };
  return { topic: t('새로운 시작'), kinds: [founders, { title: t('먼저 가 본 동문'), why: t('비슷한 길을 먼저 걸어 본 사람이에요.'), match: (u) => isAlumniStage(u) }, investors] };
}
function answerAdvice(c: Ctx, q: string): AiAnswer {
  const { topic, kinds: defs } = kindsFor(q);
  const used = new Set<string>();
  const kinds: AiKind[] = defs.map((d) => {
    const list = rankUsers(c, c.users.filter((u) => u.id !== c.me.id && d.match(u) && !used.has(u.id))).slice(0, 2);
    list.forEach((u) => used.add(u.id));
    return { title: d.title, why: d.why, people: list.map((u) => person(c, u, u.helpWith?.length ? fill(t('도와줄 수 있어요: {x}'), { x: u.helpWith.slice(0, 2).join(', ') }) : aiLine(u, false))) };
  });
  const sc = (a: Activity) => Number(/(창업|스타트업|startup|투자)/i.test(textOf(a))) + Number(/\bAI\b/.test(textOf(a))) + Number(/(창업|스타트업|\bAI\b)/.test(a.title));
  const meets = upcoming(c).filter((a) => sc(a) > 1).sort((a, b) => sc(b) - sc(a)).slice(0, 2);
  return { intent: 'advice', understood: [fill(t('{topic} 준비'), { topic }), fill(t('만나 볼 사람 유형 {n}가지'), { n: kinds.length })], people: [], total: kinds.reduce((a, k) => a + k.people.length, 0), relaxed: false, kinds, meets, groups: [],
    lead: fill(t('{topic}을 시작한다면 이런 세 부류를 먼저 만나 보길 권해요. AroundU에서 바로 만날 수 있는 사람도 함께 골랐어요.'), { topic }),
    followups: [{ label: t('투자자만 더 보기'), q: t('AI 스타트업 투자하는 동문') }, { label: t('지인들에게 물어보기'), to: `/people/ask?q=${encodeURIComponent(q)}` }] };
}

/** 한 문장 → AI 답변 */
export function answerQuery(snap: Snapshot, me: User, visibleUsers: User[], visibleActivities: Activity[], q: string, lang: 'ko' | 'en', canSeeTT: (u: User) => boolean): AiAnswer {
  const users = visibleUsers.filter((u) => u.id !== me.id && !u.deleted && !u.suspended && !isBlocked(snap, me.id, u.id));
  const c: Ctx = { snap, me, users, acts: visibleActivities, schools: snap.schools, lang, canSeeTT };
  const text = q.trim();
  const intent = detectIntent(text);
  if (intent === 'advice') return answerAdvice(c, text);
  if (intent === 'meal') return answerMeal(c);
  if (intent === 'moving') return answerMoving(c, text);
  if (intent === 'research') return answerResearch(c, text);
  return answerFind(c, text);
}

/** 단계별 예시 질문 — 실제 사용 상황 */
export function aiQuestionExamples(kind: 'undergrad' | 'grad' | 'alumni'): string[] {
  const all = {
    alumni: [t('뉴욕에서 일하는 연세대 동문 중 consumer tech 쪽에서 창업한 사람 있어?'), t('다음 달 도쿄로 이사하는데 아는 사람이 하나도 없어.'), t('AI 스타트업을 시작하려고 하는데 어떤 사람들을 만나보는 게 좋을까?')],
    grad: [t('도시 공간에서 pedestrian behavior 연구하는 사람 중에 같이 연구 얘기해볼 만한 사람 있어?'), t('AI 스타트업을 시작하려고 하는데 어떤 사람들을 만나보는 게 좋을까?'), t('오늘 저녁에 혼자 밥 먹기 싫은데 근처에 같이 먹을 사람 있을까?')],
    undergrad: [t('이번 학기에 창업에 관심 있는 사람들을 만나고 싶은데 같은 학교에 누구 있어?'), t('오늘 저녁에 혼자 밥 먹기 싫은데 근처에 같이 먹을 사람 있을까?'), t('AI 스타트업을 시작하려고 하는데 어떤 사람들을 만나보는 게 좋을까?')],
  };
  return all[kind];
}
