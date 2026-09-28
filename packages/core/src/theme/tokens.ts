/**
 * AroundU 디자인 토큰 v3 — "Timeleft 느낌": 차분하고 여백이 많고, 한 화면에 한 가지 행동이 또렷하다.
 * 웹(src/index.css 의 CSS 변수)과 모바일(apps/mobile 테마)이 같은 값을 쓴다. 값을 바꾸면 두 곳을 같이 바꾼다.
 *
 * 색 규칙
 * - 배경은 옅고 차분한 하늘색 기운의 흰색, 카드는 흰색. 쨍한 하늘색(#BFF4FF)·진한 남색(#0F2B48)은 쓰지 않는다.
 * - 행동(버튼·선택)은 맑은 파랑 하나. 한 화면에 채워진 파랑 버튼은 되도록 하나.
 * - 글자는 짙은 회청색 3단계(ink / ink2 / ink3). 순수 검정은 쓰지 않는다.
 * - 칩·강조 배경은 옅은 하늘(tint), 선택된 칩은 파랑 글자 + tint 배경.
 *
 * 글자 규칙 (px / line-height / weight)
 * - display 30/1.15/800 (화면 첫 문장, 화면당 하나) · title 22/1.25/700 (섹션 제목) · headline 17/1.35/700 (카드 제목)
 * - body 15/1.5/400 · label 13/1.3/600 (칩·버튼 보조) · caption 12/1.4/500
 * - 자간: display·title 은 -0.02em. 한 화면에서 굵기는 3단계까지만.
 *
 * 카드 규칙
 * - 반경 20 (작은 카드 16, 칩·버튼은 완전한 알약). 흰 배경 + 1px line 테두리 + 아주 옅은 그림자(shadow.card).
 * - 카드 하나 = 목적 하나. 카드 안에 카드를 넣지 않는다. 카드 안 여백 16~20, 카드 사이 12, 섹션 사이 28.
 * - 한 화면 섹션은 3~4개까지. 나머지는 "더 보기"로 (기능은 없애지 않는다).
 */
export type PaletteId = 'mist' | 'harbor' | 'glacier';

export interface Palette {
  id: PaletteId;
  name: string;
  /** 페이지 배경 */ bg: string;
  /** 카드 */ surface: string;
  /** 옅은 회청 면 (입력칸·비활성 칩) */ surface2: string;
  /** 테두리 */ line: string;
  /** 옅고 차분한 하늘 (칩·강조 배경) */ tint: string;
  /** 조금 더 진한 하늘 (보조 버튼 배경·아이콘 원) */ tint2: string;
  /** 맑은 파랑 (주 버튼·선택) */ primary: string;
  /** 주 버튼 눌림 */ primaryPress: string;
  /** 주 버튼 위 글자 */ onPrimary: string;
  /** 짙은 회청 글자 3단계 */ ink: string; ink2: string; ink3: string;
  /** 인증·링크 파랑 (글자) */ link: string;
  ok: string; okSoft: string; warn: string; warnSoft: string; danger: string; dangerSoft: string;
}

export const PALETTES: Record<PaletteId, Palette> = {
  // A. 미스트 — 흰색에 가까운 하늘 배경 + 맑은 파랑. 가장 가볍고 밝다
  mist: {
    id: 'mist', name: 'Mist',
    bg: '#F6F9FC', surface: '#FFFFFF', surface2: '#EEF3F8', line: '#E1E8F0',
    tint: '#E7F1FB', tint2: '#D3E5F7',
    primary: '#2F80ED', primaryPress: '#2468C4', onPrimary: '#FFFFFF',
    ink: '#1E2B3A', ink2: '#4A5A6B', ink3: '#7E8B9A', link: '#2A6FC9',
    ok: '#2F8F67', okSoft: '#E3F4EC', warn: '#B7791F', warnSoft: '#FDF3DC', danger: '#C53D3D', dangerSoft: '#FCE8E8',
  },
  // B. 하버 — 조금 더 회색 기운의 하늘 + 깊은 바다 파랑. 가장 차분하다
  harbor: {
    id: 'harbor', name: 'Harbor',
    bg: '#F2F5F8', surface: '#FFFFFF', surface2: '#E9EEF3', line: '#DCE3EA',
    tint: '#E3EDF5', tint2: '#CCDDEC',
    primary: '#1F6FD6', primaryPress: '#1858AD', onPrimary: '#FFFFFF',
    ink: '#25323F', ink2: '#4E5D6B', ink3: '#808C98', link: '#1F63BD',
    ok: '#2E8062', okSoft: '#E1F1EA', warn: '#A86F1A', warnSoft: '#FAF0DA', danger: '#B93838', dangerSoft: '#F9E5E5',
  },
  // C. 글래시어 — 얼음처럼 투명한 하늘 + 밝은 하늘파랑 버튼. 가장 산뜻하다
  glacier: {
    id: 'glacier', name: 'Glacier',
    bg: '#F8FBFD', surface: '#FFFFFF', surface2: '#F0F5F9', line: '#E4EBF1',
    tint: '#EAF4FB', tint2: '#D6E9F6',
    primary: '#3A92F0', primaryPress: '#2B78CF', onPrimary: '#FFFFFF',
    ink: '#223243', ink2: '#51606F', ink3: '#86929E', link: '#2F7BD0',
    ok: '#2F8C6A', okSoft: '#E4F4ED', warn: '#B27A22', warnSoft: '#FCF2DE', danger: '#C24242', dangerSoft: '#FBE8E8',
  },
};

export const DEFAULT_PALETTE: PaletteId = 'mist';

export const TYPE = {
  display: { size: 30, line: 1.15, weight: 800, tracking: -0.02 },
  title: { size: 22, line: 1.25, weight: 700, tracking: -0.02 },
  headline: { size: 17, line: 1.35, weight: 700, tracking: -0.01 },
  body: { size: 15, line: 1.5, weight: 400, tracking: 0 },
  label: { size: 13, line: 1.3, weight: 600, tracking: 0 },
  caption: { size: 12, line: 1.4, weight: 500, tracking: 0 },
} as const;

export const RADIUS = { card: 20, cardSm: 16, input: 14, pill: 999 } as const;
export const SPACE = { cardPad: 18, cardGap: 12, section: 28, screenX: 20 } as const;
export const SHADOW = {
  card: '0 1px 2px rgba(30, 43, 58, 0.04), 0 8px 24px -12px rgba(30, 43, 58, 0.10)',
  float: '0 10px 30px -8px rgba(30, 43, 58, 0.22)',
  sheet: '0 -8px 40px rgba(30, 43, 58, 0.12)',
} as const;
/** 글꼴 — 라틴은 Plus Jakarta Sans, 한글은 Noto Sans KR (둘 다 Google Fonts) */
export const FONT = { sans: '"Plus Jakarta Sans", "Noto Sans KR", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' } as const;
