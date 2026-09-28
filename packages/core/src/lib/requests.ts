/**
 * 네트워크 요청 — "사람 찾기 › 네트워크에 물어보기".
 * 두 엔진이 같이 돈다: (1) AroundU 가 프로필로 조건과 가까운 사람을 찾고, (2) 요청을 1촌 → 2촌 → 3촌 → 관련 학교·업종·관심사 순으로
 * 관련 있는 사람에게 보여줘 본인이 "저예요" 하거나 지인이 "제가 아는 사람이 있어요" 로 추천한다.
 * 후보의 프로필은 본인이 '관심 있어요' 하기 전까지 요청자에게 공개되지 않는다.
 */
import type { Snapshot } from '@core/api/types';
import type { ID, NetworkRequest, User, RequestReach } from '@core/types';
import { t } from '@core/i18n';
import { degreesFrom } from './graph';
import { cityOf, citiesOf, sameSchool, majorOf } from './network';
import { INTEREST_LABELS } from './labels';
import { isBlocked } from './relations';

const lc = (s?: string) => (s ?? '').toLowerCase();
const STOP = new Set(['the', 'and', 'with', 'who', 'can', 'for', 'from', 'into', 'that', 'this', 'once', 'any', 'anyone', 'someone', 'would', 'love', 'like', 'about', 'have', 'has', 'had', 'actually', 'minutes', 'chat', 'talk', 'meet', 'people', 'person', 'looking', 'experience', 'know', 'knows', 'our', 'your', 'you', 'are', 'was', 'were', 'one', 'out', 'over', 'what', 'when', 'where', 'how', 'lessons', '사람', '분', '있는', '하는', '아는', '관심', '경험', '이야기', '한번', '같이', '혹시', '찾아요', '찾고', '있어요', '싶어요', '나눌', '해주실', '분을']);
const words = (s: string) => [...new Set(lc(s).replace(/[.!?'"“”‘’:;]/g, ' ').split(/[\s,·/()+&]+/).filter((w) => !STOP.has(w) && (/[가-힣]/.test(w) ? w.length >= 2 : w.length >= 3)))];
/** 라틴 문자는 단어 단위로, 한글은 부분 문자열로 (조사가 붙으니까) */
const mentions = (hay: string, w: string) => (/[가-힣]/.test(w) ? hay.includes(w) : new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?([^a-z0-9]|$)`).test(hay));

/** 요청 본문·맥락과 사용자 프로필의 관련성 점수 (0 = 무관) */
export function relevanceToRequest(req: Pick<NetworkRequest, 'text' | 'city' | 'field' | 'interests'>, u: User): { score: number; reasons: string[] } {
  let s = 0; const why: string[] = [];
  if (req.city && citiesOf(u).some((c) => lc(c) === lc(req.city))) { s += 3; why.push(`${t('같은 지역')} · ${req.city}`); }
  if (req.field) {
    const f = lc(req.field);
    const hay = [u.career?.industry, u.career?.role, u.career?.company, majorOf(u)].map(lc);
    if (hay.some((h) => h && (h.includes(f) || f.includes(h)))) { s += 4; why.push(`${t('같은 분야')} · ${req.field}`); }
  }
  const shared = req.interests.filter((i) => u.interests.includes(i));
  if (shared.length) { s += 1.5 * shared.length; why.push(`${t('같은 관심사')} · ${shared.map((i) => INTEREST_LABELS[i]).join('·')}`); }
  // 본문 키워드 ↔ 소개·직무·회사·업종·전공
  const ws = words(req.text);
  const text = [u.bio, u.likes, u.career?.industry, u.career?.role, u.career?.company, majorOf(u), u.nowWant].map(lc).join(' ');
  const hits = ws.filter((w) => mentions(text, w));
  if (hits.length) { s += Math.min(hits.length, 4); why.push(`${t('프로필에 언급')} · ${hits.slice(0, 2).join(', ')}`); }
  return { score: s, reasons: why };
}

export interface RequestMatch { user: User; score: number; reasons: string[]; degree?: number }

/** (1) AroundU 가 찾아보기 — 조건과 가까운 사람 (프로필 기반). 요청자 제외, 차단 제외 */
export function matchesForRequest(snap: Snapshot, req: Pick<NetworkRequest, 'authorId' | 'text' | 'city' | 'field' | 'interests'>, limit = 7): RequestMatch[] {
  const degrees = degreesFrom(snap, req.authorId, 3);
  return snap.users
    .filter((u) => u.id !== req.authorId && !isBlocked(snap, req.authorId, u.id))
    .map((u) => { const r = relevanceToRequest(req, u); return { user: u, score: r.score + (degrees.has(u.id) ? 0.5 : 0), reasons: r.reasons, degree: degrees.get(u.id) }; })
    .filter((m) => m.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** (2) 네트워크에 전달 — 촌수 안이거나(reach), 그 밖이어도 같은 학교·같은 분야·같은 도시면 관련 있는 사람으로 본다 */
export function audienceForRequest(snap: Snapshot, req: Pick<NetworkRequest, 'authorId' | 'text' | 'city' | 'field' | 'interests' | 'reach'>): { userId: ID; degree?: number; score: number }[] {
  const author = snap.users.find((u) => u.id === req.authorId);
  if (!author) return [];
  const degrees = degreesFrom(snap, req.authorId, req.reach);
  return snap.users
    .filter((u) => u.id !== req.authorId && !isBlocked(snap, req.authorId, u.id))
    .map((u) => {
      const d = degrees.get(u.id);
      const r = relevanceToRequest(req, u).score;
      const related = r > 0 || sameSchool(u, author);
      const score = (d ? (4 - d) * 2 : 0) + r + (sameSchool(u, author) ? 1 : 0);
      return { userId: u.id, degree: d, score, ok: !!d || related };
    })
    .filter((x) => x.ok)
    .sort((a, b) => b.score - a.score)
    .map(({ userId, degree, score }) => ({ userId, degree, score }));
}

export interface IncomingRequest { req: NetworkRequest; author: User; degree?: number; reasons: string[]; myResponse?: NetworkRequest['responses'][number]; myReferral?: NetworkRequest['referrals'][number] }

/** 내가 받은 요청 — 열려 있고, 내가 전달 대상이고, 관심 없어요 하지 않은 것. 나에게 온 지인 추천(referral)도 포함 */
export function requestsForMe(snap: Snapshot, me: User): IncomingRequest[] {
  const out: IncomingRequest[] = [];
  for (const req of snap.networkRequests) {
    if (req.status !== 'open' || req.authorId === me.id || req.dismissedIds.includes(me.id)) continue;
    const author = snap.users.find((u) => u.id === req.authorId);
    if (!author || isBlocked(snap, me.id, author.id)) continue;
    const myReferral = req.referrals.find((r) => r.candidateId === me.id && r.status !== 'declined');
    const aud = audienceForRequest(snap, req).find((a) => a.userId === me.id);
    if (!aud && !myReferral) continue;
    const { reasons } = relevanceToRequest(req, me);
    out.push({ req, author, degree: aud?.degree ?? degreesFrom(snap, me.id, 3).get(author.id), reasons, myResponse: req.responses.find((r) => r.userId === me.id), myReferral });
  }
  return out.sort((a, b) => (b.myReferral ? 1 : 0) - (a.myReferral ? 1 : 0) || b.req.createdAt.localeCompare(a.req.createdAt));
}

export const myRequests = (snap: Snapshot, me: User) => snap.networkRequests.filter((r) => r.authorId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** "2촌 거리" 라벨 */
export function degreeLabel(d: number | undefined, lang: 'ko' | 'en'): string {
  if (d === undefined) return lang === 'en' ? 'Related network' : '관련 네트워크';
  if (d === 1) return lang === 'en' ? 'Your connection' : '내 연결';
  return lang === 'en' ? `${d}${d === 2 ? 'nd' : 'rd'}-degree` : `${d}촌 거리`;
}

/** 내 지인 중 이 요청에 맞을 만한 사람 (제가 아는 사람이 있어요 → 후보 선택) */
export function referralCandidates(snap: Snapshot, me: User, req: NetworkRequest): RequestMatch[] {
  const friends = new Set(snap.relationships.friends.filter((f) => f.a === me.id || f.b === me.id).map((f) => (f.a === me.id ? f.b : f.a)));
  const already = new Set([...req.referrals.map((r) => r.candidateId), ...req.responses.map((r) => r.userId), req.authorId]);
  return snap.users.filter((u) => friends.has(u.id) && !already.has(u.id))
    .map((u) => { const r = relevanceToRequest(req, u); return { user: u, score: r.score, reasons: r.reasons }; })
    .sort((a, b) => b.score - a.score);
}

export const REACH_LABELS_KO: Record<RequestReach, string> = { 1: '내 연결까지', 2: '연결의 연결(2촌)까지', 3: '3촌 + 관련 학교·업종·관심사' };
export const REACH_LABELS_EN: Record<RequestReach, string> = { 1: 'My connections', 2: 'Connections of connections (2nd)', 3: '3rd degree + related school · field · interests' };

export const requestContextLine = (req: Pick<NetworkRequest, 'city' | 'field' | 'interests'>) => [req.city, req.field, ...req.interests.map((i) => INTEREST_LABELS[i])].filter(Boolean).join(' · ');
export const cityOfAuthor = (u: User) => cityOf(u);
