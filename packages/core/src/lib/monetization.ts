import type { Post, User, BoostTier } from '@core/types';
import { todayISO } from './format';

/** 무료 플랜 하루 친구 요청(오른쪽 스와이프) 한도 — 같은 학교 탐색은 무료지만 남발은 막는다 */
export const FREE_SWIPES_PER_DAY = 30;
/** 무료 사용자가 Beyond(다른 학교·도시)에서 볼 수 있는 사람 수 — 가치는 보여주되 전체는 AroundU+ */
export const BEYOND_FREE_PREVIEW = 3;

/** AroundU+ 가격표 (모의 결제) — PRD: $5.99/월, $49.99/년 */
export const PLANS = {
  ko: { monthly: { label: '월', price: '₩7,900', per: '/월' }, yearly: { label: '연', price: '₩64,900', per: '/년', badge: '-32%' } },
  en: { monthly: { label: 'Monthly', price: '$5.99', per: '/mo' }, yearly: { label: 'Yearly', price: '$49.99', per: '/yr', badge: '-30%' } },
} as const;

/** Post Boost 가격표 (모의 결제) — PRD 15절 */
export const BOOST_PRICES: Record<BoostTier, { ko: string; en: string; reach: string }> = {
  community: { ko: '₩10,000–30,000', en: '$8–22', reach: 'x3' },
  cross: { ko: '₩50,000–150,000', en: '$38–110', reach: 'x10' },
};
/** Cross-network Boost 가 고를 수 있는 audience */
export const BOOST_AUDIENCES = ['AI Builders', 'Student Founders', 'PhD Researchers', 'Runners', 'Designers', 'Exchange Students'];

export const isPlus = (u: Pick<User, 'plan'>) => u.plan === 'plus';

/** 오늘 남은 무료 친구 요청 수 (Plus 는 Infinity) */
export function swipesLeft(u: Pick<User, 'plan' | 'swipes'>): number {
  if (isPlus(u)) return Infinity;
  const used = u.swipes?.date === todayISO() ? u.swipes.count : 0;
  return Math.max(0, FREE_SWIPES_PER_DAY - used);
}

export const isBoosted = (p: Pick<Post, 'boost'>) => !!p.boost && p.boost.until >= todayISO();

/** 피드 행 사이에 스폰서 글을 `every` 개마다 하나씩 끼운다 (Plus 사용자는 광고 없음). 부스트 글은 맨 위로 */
export function injectSponsored<T extends Post>(posts: T[], ads: T[], viewer: Pick<User, 'plan'>, every = 4): T[] {
  const ordered = [...posts.filter((p) => isBoosted(p)), ...posts.filter((p) => !isBoosted(p))];
  if (isPlus(viewer) || ads.length === 0) return ordered;
  const out: T[] = [];
  let ai = 0;
  ordered.forEach((p, i) => {
    out.push(p);
    if ((i + 1) % every === 0 && ai < ads.length) out.push(ads[ai++]);
  });
  if (ordered.length > 0 && ordered.length < every && ai < ads.length) out.push(ads[ai]);
  return out;
}
