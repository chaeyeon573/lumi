/**
 * 단계별 화면 — 학부생 · 대학원생 · 졸업생은 같은 5탭 구조를 쓰지만, 무엇을 먼저 보여주고 무엇을 쓰기 쉽게 할지가 다르다.
 * 학부생: 수업·공강·동아리·학교 행사 → 같은 학교·같은 전공·같은 수업
 * 대학원생: 연구 분야·연구실·리딩 그룹·세미나·학회 → 같은 연구 분야(다른 학교 포함) · 먼저 가 본 선배(박사·업계)
 * 졸업생: 도시·하는 일·동문 → 같은 도시·같은 분야 · 근황 · 후배 질문
 * 화면(웹·모바일)은 여기 설정만 읽는다. 데이터 계산은 home/feed/recommend/people 에서.
 */
import type { PostType, User } from '@core/types';
import { t } from '@core/i18n';
import { isAlumniStage, isGradStage } from './network';

export type StageKind = 'undergrad' | 'grad' | 'alumni';

export const stageKind = (u: Pick<User, 'stage' | 'affiliation'>): StageKind => (isAlumniStage(u) ? 'alumni' : isGradStage(u) ? 'grad' : 'undergrad');

export const STAGE_KIND_LABELS = (): Record<StageKind, string> => ({ undergrad: t('학부생'), grad: t('대학원생'), alumni: t('졸업생') });

// ─── 피드 컴포저 — 단계마다 쓰기 쉬운 시작점 (강요하지 않는 보조 칩) ───────────────────────────
export interface ComposerPrompt {
  /** Post.topics 에 들어가는 키 */
  key: string;
  emoji: string;
  label: string;
  postType: PostType;
  placeholder: string;
}

export const COMPOSER_PROMPT_KEYS: Record<StageKind, string[]> = {
  undergrad: ['class_q', 'together_meal', 'club_review', 'info_scholar'],
  grad: ['research_q', 'reading', 'conference', 'collab', 'path'],
  alumni: ['update', 'city_meet', 'ama', 'visit', 'hiring'],
};

export function composerPrompts(kind: StageKind): ComposerPrompt[] {
  const all: Record<string, ComposerPrompt> = {
    class_q: { key: 'class_q', emoji: '✏️', label: t('수업·과제 질문'), postType: 'question', placeholder: t('예: 데이터베이스 기말 범위 어디까지인가요?') },
    together_meal: { key: 'together_meal', emoji: '🍚', label: t('같이 밥·공부'), postType: 'together', placeholder: t('예: 오늘 12시 학생회관에서 같이 점심 드실 분') },
    club_review: { key: 'club_review', emoji: '🎪', label: t('동아리·행사 후기'), postType: 'review', placeholder: t('예: 어제 동아리 박람회 다녀온 후기') },
    info_scholar: { key: 'info_scholar', emoji: '📌', label: t('장학금·공모전 정보'), postType: 'info', placeholder: t('예: 교내 창업 공모전 마감이 다음 주 금요일이에요') },
    research_q: { key: 'research_q', emoji: '🔬', label: t('연구 질문'), postType: 'question', placeholder: t('예: LLM 평가 벤치마크, 요즘 뭐 쓰세요?') },
    reading: { key: 'reading', emoji: '📚', label: t('리딩 그룹·세미나'), postType: 'together', placeholder: t('예: 금요일 저녁 NLP 논문 리딩 그룹 같이 하실 분') },
    conference: { key: 'conference', emoji: '🎤', label: t('학회 같이 가요'), postType: 'together', placeholder: t('예: 11월 학회 가시는 분, 일정·숙소 같이 봐요') },
    collab: { key: 'collab', emoji: '🤝', label: t('협업·공동연구'), postType: 'together', placeholder: t('예: 데이터 수집 같이 할 다른 학교 연구실을 찾아요') },
    path: { key: 'path', emoji: '🧭', label: t('진로 고민'), postType: 'question', placeholder: t('예: 박사 진학 vs 취업, 먼저 고민해본 분 이야기 듣고 싶어요') },
    update: { key: 'update', emoji: '🌱', label: t('근황'), postType: 'story', placeholder: t('예: 새 도시로 이사 왔어요. 요즘 이렇게 지내요') },
    city_meet: { key: 'city_meet', emoji: '☕', label: t('이 도시에서 만나요'), postType: 'together', placeholder: t('예: 퇴근 후 커피 한 잔 하실 동문') },
    ama: { key: 'ama', emoji: '💬', label: t('후배 질문 받아요'), postType: 'question', placeholder: t('예: 지금 하는 일에 대해 궁금한 것 편하게 물어보세요') },
    visit: { key: 'visit', emoji: '✈️', label: t('출장·여행 가요'), postType: 'together', placeholder: t('예: 다음 주에 서울 가요. 시간 맞는 분 커피해요') },
    hiring: { key: 'hiring', emoji: '📌', label: t('채용·추천 정보'), postType: 'info', placeholder: t('예: 우리 팀이 사람을 찾고 있어요. 관심 있으면 편하게 물어보세요') },
  };
  return COMPOSER_PROMPT_KEYS[kind].map((k) => all[k]);
}

/** 어떤 단계의 글인지 (topics 키로 판단) — 없으면 undefined */
export function promptStageOf(topics?: string[]): StageKind | undefined {
  if (!topics?.length) return undefined;
  return (Object.keys(COMPOSER_PROMPT_KEYS) as StageKind[]).find((k) => COMPOSER_PROMPT_KEYS[k].some((key) => topics.includes(key)));
}

/** 컴포저 첫 줄 */
export const composerPlaceholder = (kind: StageKind) =>
  kind === 'alumni' ? t('요즘 어떻게 지내요?') : kind === 'grad' ? t('연구하면서 나누고 싶은 게 있나요?') : t('무슨 일이 있나요?');

// ─── 내 학교 피드 범위 ───────────────────────────────────────────────────────────
export type CampusScope = 'students' | 'grads' | 'alumni' | 'all';

export function campusScopes(kind: StageKind): { value: CampusScope; label: string }[] {
  if (kind === 'alumni') return [{ value: 'alumni', label: t('동문') }, { value: 'all', label: t('학교 전체') }];
  if (kind === 'grad') return [{ value: 'grads', label: t('대학원 과정') }, { value: 'students', label: t('재학생') }, { value: 'all', label: t('학교 전체') }];
  return [{ value: 'students', label: t('재학생만') }, { value: 'all', label: t('학교 전체') }];
}
export const defaultCampusScope = (kind: StageKind): CampusScope => (kind === 'alumni' ? 'alumni' : kind === 'grad' ? 'grads' : 'all');

/** 내 학교 탭 이름 — 졸업생에게는 "동문" 맥락이 먼저 */
export const campusTabLabel = (kind: StageKind) => (kind === 'alumni' ? t('내 학교·동문') : t('내 학교'));

// ─── 사람 탭 · 모임 탭 · 홈에서 단계별로 달라지는 문구 ────────────────────────────────────
export interface StageCopy {
  /** 사람 탭 추천 허브 첫 섹션 제목 */
  peopleTitle: string;
  /** 사람 탭 추천 허브 부제 */
  peopleSub: string;
  /** 모임 탭 추천 상단 한 줄 */
  meetHint: string;
  /** 모임 만들기 예시 */
  meetExamples: string[];
  /** 프로필 "현재" 카드 제목 */
  nowTitle: string;
}

export function stageCopy(kind: StageKind): StageCopy {
  if (kind === 'grad') return {
    peopleTitle: t('같은 연구 분야'), peopleSub: t('다른 학교 연구실까지 — 분야가 겹치는 사람부터'),
    meetHint: t('리딩 그룹 · 세미나 · 학회 같이 가기'), meetExamples: [t('논문 리딩 그룹'), t('학회 같이 가기'), t('대학원생 진로 커피')],
    nowTitle: t('연구'),
  };
  if (kind === 'alumni') return {
    peopleTitle: t('가까운 동문'), peopleSub: t('같은 도시 · 같은 분야 · 같은 학교 순으로'),
    meetHint: t('퇴근 후 작은 모임 · 같은 도시 동문'), meetExamples: [t('퇴근 후 커피 4명'), t('주말 러닝'), t('동문 저녁')],
    nowTitle: t('현재'),
  };
  return {
    peopleTitle: t('지금 가까운 사람'), peopleSub: t('같은 학교 · 같은 전공 · 공강이 겹치는 사람부터'),
    meetHint: t('공강 · 밥 · 스터디 · 동아리'), meetExamples: [t('점심 같이'), t('시험 스터디'), t('동아리 구경')],
    nowTitle: t('이번 학기'),
  };
}

// ─── 연구 분야 ↔ 업계 (대학원생이 "먼저 가 본 선배"을 찾을 때) ─────────────────────────────
const RESEARCH_ALIASES: Record<string, string[]> = {
  nlp: ['nlp', 'ai', 'ml', 'llm', '자연어', 'machine learning'],
  ai: ['ai', 'ml', 'machine learning', 'nlp', 'llm', '인공지능'],
  '로봇': ['로봇', 'robotics', 'ai'], robotics: ['robotics', 'robot', 'ai'],
  '바이오': ['바이오', 'bio', '헬스케어', 'healthcare'], bioinformatics: ['bio', 'healthcare', 'biotech'],
  '경제': ['경제', '금융', 'finance', 'economics'], economics: ['economics', 'finance'],
};
const lc = (s?: string) => (s ?? '').toLowerCase().trim();

/** 연구 분야 토큰 (별칭 포함) */
export function researchTokens(field?: string): string[] {
  const f = lc(field);
  if (!f) return [];
  return [...new Set([f, ...(RESEARCH_ALIASES[f] ?? [])])];
}

/** 두 사람의 연구 분야가 겹치는가 */
export function sameResearch(a: Pick<User, 'research'>, b: Pick<User, 'research'>): boolean {
  if (!a.research?.field || !b.research?.field) return false;
  if (lc(a.research.field) === lc(b.research.field)) return true;
  const ka = new Set((a.research.keywords ?? []).map(lc));
  return (b.research.keywords ?? []).some((k) => ka.has(lc(k)));
}

/** 연구 분야와 관련된 일을 하는가 (대학원생 → 업계 동문) */
export function researchMatchesCareer(r: User['research'], career: User['career']): boolean {
  if (!r?.field || !career) return false;
  const tokens = researchTokens(r.field);
  const hay = [career.industry, career.role].map(lc).join(' ');
  return tokens.some((tk) => tk && hay.includes(tk));
}

/** "NLP · 자연어처리 연구실 · 2년차" — 지도교수는 showAdvisor 일 때만 */
export function researchLine(u: Pick<User, 'research'>, lang: 'ko' | 'en', withAdvisor = false): string {
  const r = u.research;
  if (!r?.field) return '';
  const year = r.year ? (lang === 'en' ? `Year ${r.year}` : `${r.year}년차`) : '';
  const adv = withAdvisor && r.showAdvisor && r.advisor ? (lang === 'en' ? `Advisor ${r.advisor}` : `지도교수 ${r.advisor}`) : '';
  return [r.field, r.lab, year, adv].filter(Boolean).join(' · ');
}
