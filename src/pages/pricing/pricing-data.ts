import { lang } from '@core/i18n';

/** 한/영 한 쌍 — 긴 투자자용 카피는 t() 대신 lang 분기로 보여준다 */
export type Bi = { ko: string; en: string };
export const L = (s: Bi) => (lang === 'en' ? s.en : s.ko);

/** 가격 — KO 는 ₩ 를 크게, EN 은 $ 를 크게, 나머지 통화는 작은 회색으로 */
export type Price = { krw: string; usd: string };

export const SECTIONS: { id: string; letter: string; label: Bi }[] = [
  { id: 'pr-principle', letter: '0', label: { ko: '원칙', en: 'Principle' } },
  { id: 'pr-plus', letter: 'A', label: { ko: 'AroundU+', en: 'AroundU+' } },
  { id: 'pr-boosts', letter: 'B', label: { ko: '부스트', en: 'Boosts' } },
  { id: 'pr-promoted', letter: 'C', label: { ko: '프로모티드', en: 'Promoted' } },
  { id: 'pr-experience', letter: 'D', label: { ko: '스폰서 경험', en: 'Sponsored Experience' } },
  { id: 'pr-sponsored', letter: 'E', label: { ko: '스폰서 글', en: 'Sponsored Posts' } },
  { id: 'pr-economics', letter: 'F', label: { ko: '유닛 이코노믹스', en: 'Unit economics' } },
  { id: 'pr-boundary', letter: 'G', label: { ko: '무료 vs 프리미엄', en: 'Free vs Premium' } },
  { id: 'pr-roadmap', letter: 'H', label: { ko: '로드맵', en: 'Roadmap' } },
  { id: 'pr-why', letter: 'I', label: { ko: '왜 되는가', en: 'Why it works' } },
];

// ─── 0. Principle ────────────────────────────────────────────────────────
export const FREE_CORE: Bi[] = [
  { ko: '같은 학교 사람 발견', en: 'Same-school people discovery' },
  { ko: '내 학교 졸업생 발견', en: 'Alumni discovery within my school' },
  { ko: '기본 스와이프 30/일', en: 'Basic swipe 30/day' },
  { ko: 'DM', en: 'DM' },
  { ko: '피드 읽기·쓰기', en: 'Feed read & write' },
  { ko: '그룹 만들기·참여', en: 'Group create & join' },
  { ko: '만남 만들기·참여', en: 'Meet create & join' },
  { ko: '캠퍼스 정보', en: 'Campus info' },
  { ko: '기본 프로필', en: 'Basic profile' },
];

export const REVENUE_STREAMS: { key: 'A' | 'B' | 'C'; title: Bi; desc: Bi; product: Bi }[] = [
  { key: 'A', title: { ko: '내 네트워크 밖으로 확장', en: 'Expanding beyond your network' }, desc: { ko: '다른 학교·도시·커뮤니티의 사람을 찾을 때', en: 'When you look for people at other schools, cities and communities' }, product: { ko: 'AroundU+ 구독', en: 'AroundU+ subscription' } },
  { key: 'B', title: { ko: '도달 구매', en: 'Buying reach' }, desc: { ko: '내 프로필·글·만남·그룹을 더 많은 사람에게', en: 'Put your profile, post, meet or group in front of more people' }, product: { ko: '부스트 (1회성)', en: 'Boosts (one-off)' } },
  { key: 'C', title: { ko: '기관이 학생에게 도달', en: 'Institutions reaching students' }, desc: { ko: '기업·연구실·프로그램이 인증된 학생에게', en: 'Companies, labs and programs reaching verified students' }, product: { ko: '프로모티드 · 스폰서 경험 · 스폰서 글', en: 'Promoted · Sponsored Experience · Sponsored posts' } },
];

// ─── A. AroundU+ ─────────────────────────────────────────────────────────
export type PlusPlanId = 'monthly' | 'yearly' | 'semester';
export const PLUS_PLANS: { id: PlusPlanId; name: Bi; sub?: Bi; price: Price; per: Bi; equiv?: Price; save?: Price; recommended?: boolean; why: Bi }[] = [
  { id: 'monthly', name: { ko: '월간', en: 'Monthly' }, price: { krw: '₩7,900', usd: '$5.99' }, per: { ko: '/월', en: '/mo' },
    why: { ko: '"한 달에 커피 한 잔" 앵커. 언제든 해지.', en: 'The "one coffee a month" anchor. Cancel any time.' } },
  { id: 'yearly', name: { ko: '연간', en: 'Yearly' }, price: { krw: '₩64,900', usd: '$49.99' }, per: { ko: '/년', en: '/yr' },
    equiv: { krw: '≈ ₩5,400/월', usd: '≈ $4.17/mo' }, save: { krw: '-32%', usd: '-30%' },
    why: { ko: '졸업생·대학원생처럼 오래 쓰는 사용자용. 선결제로 이탈을 줄여요.', en: 'For alumni and grad students who stay long. Prepaid lowers churn.' } },
  { id: 'semester', name: { ko: '학기 패스', en: 'Semester Pass' }, sub: { ko: '4개월', en: '4 months' }, price: { krw: '₩24,900', usd: '$19.99' }, per: { ko: '/4개월', en: '/4 mo' },
    equiv: { krw: '≈ ₩6,200/월', usd: '≈ $5.00/mo' }, save: { krw: '-21%', usd: '-17%' }, recommended: true,
    why: { ko: '학사 일정에 맞춘 학생 추천 상품. 새 학기 = 새 사람을 만나는 시점.', en: 'Recommended for students — aligns with the academic calendar. New semester = the moment you meet new people.' } },
];

export const PLUS_NOTES: Bi[] = [
  { ko: '7일 무료 체험', en: '7-day free trial' },
  { ko: '학생 할인은 이미 가격에 포함', en: 'Student discount already baked in' },
  { ko: '모의 결제 — 실제 과금 없음', en: 'Mock checkout — no real charge' },
];

export const PLUS_PERKS: { feature: Bi; free: Bi; plus: Bi }[] = [
  { feature: { ko: 'Beyond 발견 (다른 학교·도시)', en: 'Beyond discovery (other schools & cities)' }, free: { ko: '하루 3명 미리보기', en: '3 previews/day' }, plus: { ko: '무제한', en: 'Unlimited' } },
  { feature: { ko: '다른 학교 졸업생', en: 'Cross-school alumni' }, free: { ko: '—', en: '—' }, plus: { ko: '✓', en: '✓' } },
  { feature: { ko: '고급 필터 (학교 × 단계 × 관심사 × 도시)', en: 'Advanced filters (school × stage × interest × city)' }, free: { ko: '—', en: '—' }, plus: { ko: '✓', en: '✓' } },
  { feature: { ko: '여러 학교 동시 검색', en: 'Multi-school search' }, free: { ko: '—', en: '—' }, plus: { ko: '✓', en: '✓' } },
  { feature: { ko: '저장한 검색 + 발견 알림', en: 'Saved searches + discovery alerts' }, free: { ko: '—', en: '—' }, plus: { ko: '✓', en: '✓' } },
  { feature: { ko: '소개 요청', en: 'Introduction requests' }, free: { ko: '하루 30개', en: '30/day' }, plus: { ko: '무제한', en: 'Unlimited' } },
  { feature: { ko: '광고 없는 피드', en: 'Ad-free feed' }, free: { ko: '—', en: '—' }, plus: { ko: '✓', en: '✓' } },
  { feature: { ko: '"덱에서 먼저 보이기" 부스트', en: '"Shown first in the deck" boost' }, free: { ko: '—', en: '—' }, plus: { ko: '주 1회', en: '1x/week' } },
];

/** 가격 앵커 비교 — 월 요금(USD). 막대 그래프용 */
export const PRICE_ANCHORS: { name: string; usd: number; kind: 'dating' | 'student' | 'us' }[] = [
  { name: 'Tinder Gold', usd: 39.99, kind: 'dating' },
  { name: 'Bumble Premium', usd: 32.99, kind: 'dating' },
  { name: 'Hinge+', usd: 29.99, kind: 'dating' },
  { name: 'YouTube Premium Student', usd: 7.99, kind: 'student' },
  { name: 'Spotify Student', usd: 5.99, kind: 'student' },
  { name: 'AroundU+', usd: 5.99, kind: 'us' },
];

export const PLUS_REASON: Bi[] = [
  { ko: '데이팅 앱은 연애 의도에 월 $25–50을 받아요 — Tinder Gold $39.99, Hinge+ $29.99, Bumble Premium $32.99.', en: 'Dating apps charge $25–50/mo for romantic intent — Tinder Gold $39.99, Hinge+ $29.99, Bumble Premium $32.99.' },
  { ko: '학생이 친구·네트워크 앱에 낼 의사는 학생 미디어 구독에 가까워요 — Spotify Student $5.99, YouTube Premium Student $7.99.', en: "Students' willingness to pay for a friend/network app is closer to student media subscriptions — Spotify Student $5.99, YouTube Premium Student $7.99." },
  { ko: '그래서 $5.99(₩7,900)를 "한 달에 커피 한 잔"으로 앵커링해요.', en: 'So $5.99 (₩7,900) anchors as "one coffee a month".' },
  { ko: '예상 전환율은 MAU의 3–6% (벤치마크: Bumble ~4%, Hinge는 더 높은 의도). 우리는 4%로 가정해요.', en: 'Expected conversion 3–6% of MAU (benchmark: Bumble ~4%, Hinge higher intent). We assume 4%.' },
];

// ─── B. Boosts ───────────────────────────────────────────────────────────
export type BoostItem = { name: Bi; desc?: Bi; price: Price; unit?: Bi };
export const BOOSTS: { group: Bi; meta?: Bi; items: BoostItem[] }[] = [
  { group: { ko: '프로필 부스트', en: 'Profile Boost' }, meta: { ko: '내 네트워크 덱에서 x3 노출', en: 'x3 visibility in My Network deck' }, items: [
    { name: { ko: '24시간', en: '24h' }, price: { krw: '₩2,900', usd: '$1.99' } },
    { name: { ko: '5팩', en: '5-pack' }, desc: { ko: '24시간 × 5 · 개당 ₩1,980', en: '5 × 24h · $1.40 each' }, price: { krw: '₩9,900', usd: '$6.99' } },
  ] },
  { group: { ko: '만남 부스트', en: 'Meet Boost' }, meta: { ko: '내 학교 Meet › 지금/이벤트 맨 위에 고정', en: 'Pinned at top of Meet › Now/Events for your school' }, items: [
    { name: { ko: '24시간', en: '24h' }, price: { krw: '₩4,900', usd: '$3.99' } },
  ] },
  { group: { ko: '글 부스트 — 커뮤니티', en: 'Post Boost — Community' }, meta: { ko: '모두 7일 · ~x3 도달', en: 'All 7 days · ~x3 reach' }, items: [
    { name: { ko: '캠퍼스 (1개 학교)', en: 'Campus (1 school)' }, price: { krw: '₩10,000', usd: '$7.99' } },
    { name: { ko: '캠퍼스 + 근처 학교', en: 'Campus + nearby schools' }, price: { krw: '₩20,000', usd: '$14.99' } },
    { name: { ko: '지역', en: 'Region' }, price: { krw: '₩30,000', usd: '$21.99' } },
  ] },
  { group: { ko: '글 부스트 — 크로스 네트워크', en: 'Post Boost — Cross-network' }, meta: { ko: '~x10 도달 · 오디언스 예: AI Builders, Student Founders, PhD Researchers', en: '~x10 reach · audiences e.g. AI Builders, Student Founders, PhD Researchers' }, items: [
    { name: { ko: '오디언스 2개', en: '2 audiences' }, price: { krw: '₩50,000', usd: '$37.99' } },
    { name: { ko: '오디언스 4개', en: '4 audiences' }, price: { krw: '₩100,000', usd: '$74.99' } },
    { name: { ko: '전체 오디언스 + 14일', en: 'All audiences + 14 days' }, price: { krw: '₩150,000', usd: '$109.99' } },
  ] },
  { group: { ko: '그룹 부스트 (모집 주간)', en: 'Group Boost (recruiting week)' }, meta: { ko: '동아리·학회 모집 기간에 Meet › 그룹 상단', en: 'Top of Meet › Groups during recruiting season' }, items: [
    { name: { ko: '1주', en: '1 week' }, price: { krw: '₩30,000', usd: '$22.99' }, unit: { ko: '/주', en: '/week' } },
  ] },
];

export const BOOST_REASON: Bi[] = [
  { ko: 'Tinder Boost($6.99)·Bumble Spotlight와 같은 구조를 학생 가격으로 낮췄어요. 프로필 부스트 ₩2,900은 편의점 음료 값.', en: 'Priced like Tinder Boost ($6.99) and Bumble Spotlight, scaled down for students. A ₩2,900 ($1.99) Profile Boost is the price of a convenience-store drink.' },
  { ko: '글 부스트는 에브리타임 게시판 광고(~₩20,000 / 학교 / 글)에 맞췄어요. 학생 단체가 같은 돈으로 캠퍼스 전체에 — 그것도 타겟팅해서 — 도달해요.', en: 'Post Boost is priced against Everytime board ads (~₩20,000 per school per post), so a student org can reach a whole campus for the same money — but targeted.' },
  { ko: '크로스 네트워크는 학교 대신 관심사 오디언스 단위라 프리미엄(~x10 도달)을 받아요.', en: 'Cross-network sells interest audiences instead of a school, so it carries a premium (~x10 reach).' },
];

// ─── C. Promoted Opportunity ─────────────────────────────────────────────
export const PROMOTED: { name: Bi; scope: Bi; price: Price; recommended?: boolean }[] = [
  { name: { ko: '캠퍼스 캠페인', en: 'Campus campaign' }, scope: { ko: '1개 학교 · 1주 · Home › 기회 + 피드', en: '1 school · 1 week · Home › Opportunities + Feed' }, price: { krw: '₩100,000', usd: '$79' } },
  { name: { ko: '멀티 캠퍼스', en: 'Multi-campus' }, scope: { ko: '3개 학교 · 1주', en: '3 schools · 1 week' }, price: { krw: '₩250,000', usd: '$199' }, recommended: true },
  { name: { ko: '전국', en: 'National' }, scope: { ko: '전체 캠퍼스 · 2주', en: 'All campuses · 2 weeks' }, price: { krw: '₩500,000', usd: '$399' } },
];
export const PROMOTED_ADDONS: { name: Bi; price: Bi }[] = [
  { name: { ko: '전공·단계 타겟팅', en: 'Major / stage targeting' }, price: { ko: '+20%', en: '+20%' } },
  { name: { ko: '"앱에서 지원" CTA', en: '"Apply in-app" CTA' }, price: { ko: '+₩30,000', en: '+₩30,000 (≈ $23)' } },
  { name: { ko: '성과 리포트', en: 'Performance report' }, price: { ko: '포함', en: 'Included' } },
];
export const CPM_ROWS: { name: Bi; lo: number; hi: number; us?: boolean }[] = [
  { name: { ko: 'AroundU 캠퍼스 캠페인', en: 'AroundU Campus campaign' }, lo: 950, hi: 950, us: true },
  { name: { ko: '에브리타임 배너', en: 'Everytime banner' }, lo: 2000, hi: 4000 },
  { name: { ko: 'Instagram', en: 'Instagram' }, lo: 6000, hi: 10000 },
];
export const PROMOTED_REASON: Bi[] = [
  { ko: '가정: 캠퍼스당 DAU 3,000 × 하루 5회 노출 × 7일 = 105,000 노출. ₩100,000 ÷ 105k × 1,000 ≈ ₩950 CPM.', en: 'Assume 3,000 DAU per campus × 5 impressions/day × 7 days = 105k impressions. ₩100,000 ÷ 105k × 1,000 ≈ ₩950 CPM.' },
  { ko: '에브리타임 배너 CPM ~₩2,000–4,000, Instagram ~₩6,000–10,000 보다 노출당 더 싸요.', en: 'Cheaper per impression than Everytime banner CPM (~₩2,000–4,000) and Instagram (~₩6,000–10,000).' },
  { ko: '대신 100% 인증된 학생이고 전공·단계로 타겟팅돼요. 싼 CPM이 아니라 "낭비 없는 CPM"을 팔아요.', en: "But it's 100% verified students with major/stage targeting. We don't sell a cheap CPM — we sell a CPM with no waste." },
];

// ─── D. Sponsored Experience ─────────────────────────────────────────────
export const EXPERIENCES: { name: Bi; price: Price; who: Bi }[] = [
  { name: { ko: '오피스 아워 / 회사 방문', en: 'Office hours / Company visit' }, price: { krw: '₩500,000', usd: '$399' }, who: { ko: '스타트업·연구실 · 10–20명', en: 'Startups & labs · 10–20 students' } },
  { name: { ko: '워크숍 또는 테크 토크', en: 'Workshop or Tech talk' }, price: { krw: '₩1,000,000–1,500,000', usd: '$799–1,199' }, who: { ko: '기업 채용팀 · 30–60명', en: 'Company recruiting teams · 30–60 students' } },
  { name: { ko: '리서치 나이트 / 해커톤 스폰서', en: 'Research night / Hackathon sponsor' }, price: { krw: '₩2,000,000–3,000,000', usd: '$1,599–2,399' }, who: { ko: '대기업·재단 · 100명+', en: 'Enterprises & foundations · 100+ students' } },
];
export const EXPERIENCE_INCLUDES: Bi[] = [
  { ko: 'Meet 안의 이벤트 페이지', en: 'Event page in Meet' },
  { ko: '관련 학생에게 프로모션', en: 'Promoted to relevant students' },
  { ko: 'RSVP 명단', en: 'RSVP list' },
  { ko: '동의한 학생의 이력서·연락처 공유', en: 'Opt-in résumé / contact sharing' },
  { ko: '행사 후 리포트', en: 'Post-event report' },
];
export const EXPERIENCE_REASON: Bi[] = [
  { ko: '기업이 대행사를 통해 캠퍼스 리크루팅 행사를 열면 ₩3–10M이 들어요.', en: 'Campus recruiting events cost companies ₩3–10M via agencies.' },
  { ko: '우리는 장소·케이터링이 아니라 "타겟팅된 참석"을 팔아요 — 맞는 전공·단계의 학생이 실제로 오는 것.', en: "We don't sell venues or catering — we sell targeted attendance: the right majors and stages actually show up." },
  { ko: '학생에게는 그냥 좋은 만남이라, 앱 안의 Meet 경험을 해치지 않아요.', en: "For students it's just a good Meet, so it doesn't degrade the in-app experience." },
];

// ─── E. Sponsored Posts & Partner Deals ──────────────────────────────────
export const SPONSORED: { name: Bi; desc: Bi; price: Price; unit: Bi; rule?: Bi }[] = [
  { name: { ko: '스폰서 글', en: 'Sponsored post' }, desc: { ko: '맥락에 맞고, 라벨이 붙은 글', en: 'Context-relevant, labeled' }, price: { krw: '₩150,000', usd: '$119' }, unit: { ko: '/캠퍼스/주', en: '/campus/week' }, rule: { ko: '글 4개당 1슬롯 · 캠퍼스당 하루 최대 3 광고주 (Fizz식 희소성)', en: '1 slot per 4 posts · max 3 advertisers/campus/day (Fizz-style scarcity)' } },
  { name: { ko: '파트너 딜 카드', en: 'Partner Deal card' }, desc: { ko: 'Meet › 지금에 노출 · 동네 카페·식당의 학생증 할인', en: 'In Meet › Now · local café/restaurant, student-ID deal' }, price: { krw: '₩50,000', usd: '$39' }, unit: { ko: '/주', en: '/week' } },
];
export const SPONSORED_REASON: Bi[] = [
  { ko: '배너 광고는 없어요. 광고는 피드의 글과 같은 모양이되 "스폰서" 라벨이 붙고, 4개당 1개만 들어가요.', en: 'No banner ads. An ad looks like any feed post, carries a "Sponsored" label, and appears at most once per 4 posts.' },
  { ko: '캠퍼스당 하루 3 광고주로 제한해 인벤토리를 희소하게 유지 — 가격을 지키고 피드를 지켜요.', en: 'Capping at 3 advertisers per campus per day keeps inventory scarce — protects both the price and the feed.' },
  { ko: '파트너 딜은 학생에게 실제 혜택이라 광고가 아니라 콘텐츠로 느껴져요.', en: 'Partner Deals are real perks for students, so they read as content, not ads.' },
];

// ─── F. Unit economics (illustrative) ────────────────────────────────────
export const UNIT_ROWS: { name: Bi; calc: Bi; krw: string; usd: string }[] = [
  { name: { ko: 'AroundU+', en: 'AroundU+' }, calc: { ko: '5,000 MAU × 4% × ₩7,900', en: '5,000 MAU × 4% × ₩7,900' }, krw: '₩1,580,000', usd: '≈ $1,180' },
  { name: { ko: '부스트', en: 'Boosts' }, calc: { ko: '개인 1회성 구매 합계', en: 'One-off individual purchases' }, krw: '~₩500,000', usd: '≈ $370' },
  { name: { ko: '프로모티드 기회', en: 'Promoted opportunities' }, calc: { ko: '4 × ₩100,000', en: '4 × ₩100,000' }, krw: '₩400,000', usd: '≈ $300' },
  { name: { ko: '스폰서 글', en: 'Sponsored posts' }, calc: { ko: '2 × ₩150,000 × 4주', en: '2 × ₩150,000 × 4 weeks' }, krw: '₩1,200,000', usd: '≈ $890' },
  { name: { ko: '스폰서 경험', en: 'Sponsored experience' }, calc: { ko: '1 × 워크숍', en: '1 × workshop' }, krw: '₩1,000,000', usd: '≈ $745' },
];
export const UNIT_TOTAL = { perCampus: { krw: '≈ ₩4.7M', usd: '≈ $3,500' }, campuses20: { krw: '≈ ₩94M', usd: '≈ $70k' } };

// ─── G. Free vs Premium boundary ─────────────────────────────────────────
export const BOUNDARY: { feature: Bi; free: Bi; premium: Bi }[] = [
  { feature: { ko: '같은 학교 사람 발견', en: 'Same-school discovery' }, free: { ko: '무료', en: 'Free' }, premium: { ko: '—', en: '—' } },
  { feature: { ko: '내 학교 졸업생', en: 'Alumni within my school' }, free: { ko: '무료', en: 'Free' }, premium: { ko: '—', en: '—' } },
  { feature: { ko: 'DM · 피드 · 그룹 · 만남 · 캠퍼스 정보 · 기본 프로필', en: 'DM · Feed · Groups · Meets · Campus info · Basic profile' }, free: { ko: '무료', en: 'Free' }, premium: { ko: '—', en: '—' } },
  { feature: { ko: '스와이프 · 소개 요청', en: 'Swipes · introduction requests' }, free: { ko: '하루 30', en: '30/day' }, premium: { ko: '무제한 (Plus)', en: 'Unlimited (Plus)' } },
  { feature: { ko: 'Beyond (다른 학교·도시)', en: 'Beyond (other schools & cities)' }, free: { ko: '하루 3명 미리보기', en: '3 previews/day' }, premium: { ko: '무제한 (Plus)', en: 'Unlimited (Plus)' } },
  { feature: { ko: '다른 학교 졸업생', en: 'Cross-school alumni' }, free: { ko: '—', en: '—' }, premium: { ko: 'Plus', en: 'Plus' } },
  { feature: { ko: '고급 필터 · 여러 학교 검색 · 저장한 검색·알림', en: 'Advanced filters · multi-school search · saved searches & alerts' }, free: { ko: '—', en: '—' }, premium: { ko: 'Plus', en: 'Plus' } },
  { feature: { ko: '피드 광고', en: 'Ads in feed' }, free: { ko: '글 4개당 1개 (라벨)', en: '1 per 4 posts (labeled)' }, premium: { ko: '광고 없음 (Plus)', en: 'Ad-free (Plus)' } },
  { feature: { ko: '노출 · 도달', en: 'Visibility · reach' }, free: { ko: '오가닉', en: 'Organic' }, premium: { ko: '부스트 (1회성)', en: 'Boosts (one-off)' } },
  { feature: { ko: '기관이 학생에게 도달', en: 'Institutions reaching students' }, free: { ko: '—', en: '—' }, premium: { ko: '프로모티드 · 스폰서', en: 'Promoted · Sponsored' } },
];

// ─── H. Roadmap ──────────────────────────────────────────────────────────
export const ROADMAP: { phase: Bi; when: Bi; items: Bi[]; why: Bi }[] = [
  { phase: { ko: '1단계 — 출시', en: 'Phase 1 — Launch' }, when: { ko: '출시 ~ 첫 3개 캠퍼스', en: 'Launch · first 3 campuses' }, items: [{ ko: 'A · AroundU+', en: 'A · AroundU+' }, { ko: 'E · 스폰서 글 & 파트너 딜', en: 'E · Sponsored posts & Partner deals' }], why: { ko: '결제·광고 인프라가 가장 단순하고, 캠퍼스 하나만 있어도 매출이 나요.', en: 'Simplest billing and ad plumbing; makes revenue with a single campus.' } },
  { phase: { ko: '2단계', en: 'Phase 2' }, when: { ko: '캠퍼스 5–10개', en: '5–10 campuses' }, items: [{ ko: 'B · 부스트', en: 'B · Boosts' }, { ko: 'C · 프로모티드 기회', en: 'C · Promoted Opportunity' }], why: { ko: '도달을 팔려면 도달할 사람이 먼저 있어야 해요 — 밀도가 생긴 뒤에.', en: 'Selling reach needs people to reach — only after density.' } },
  { phase: { ko: '3단계', en: 'Phase 3' }, when: { ko: '캠퍼스 20개+', en: '20+ campuses' }, items: [{ ko: 'D · 스폰서 경험', en: 'D · Sponsored Experience' }, { ko: '기관·동아리용 플랜', en: 'Org plans' }], why: { ko: '오프라인 운영과 기관 세일즈는 팀이 커진 뒤에.', en: 'Offline ops and institutional sales come once the team is bigger.' } },
];

// ─── I. Why this works ───────────────────────────────────────────────────
export const WHY: { title: Bi; desc: Bi }[] = [
  { title: { ko: '네트워크는 무료라서 계속 커져요', en: 'The network stays free, so it grows' }, desc: { ko: '같은 학교 사람·졸업생·DM·피드·만남은 영원히 무료. 페이월이 성장을 막지 않아요.', en: 'Same-school people, alumni, DM, feed and meets are free forever. No paywall in the way of growth.' } },
  { title: { ko: '프리미엄은 접근이 아니라 확장이에요', en: 'Premium is expansion, not access' }, desc: { ko: '돈을 내는 이유는 "내 네트워크 밖"으로 나가기 위해서 — 데이팅 앱처럼 기본 기능을 막지 않아요.', en: 'People pay to go beyond their network — we never gate the basics the way dating apps do.' } },
  { title: { ko: '기관은 인증된, 타겟팅된 학생에게 돈을 내요', en: 'Institutions pay for verified, targeted students' }, desc: { ko: '100% 학교 인증 + 전공·단계 타겟팅. 에브리타임보다 싼 CPM인데 낭비가 없어요.', en: '100% school-verified + major/stage targeting. Cheaper CPM than Everytime, with zero waste.' } },
];

export const FOOTNOTE: Bi = { ko: '모든 가격은 출시 제안가예요. 스토어 수수료(Apple/Google 15–30%)와 VAT가 적용돼요.', en: 'All prices are proposed launch prices; store fees (Apple/Google 15–30%) and VAT apply.' };
