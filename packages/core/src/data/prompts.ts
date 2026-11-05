/** 프로필 질문 풀. Hinge식 구조: 텍스트 3개 필수 + 음성 1개·투표 1개 선택
 *  필수 3개는 슬롯별로 카테고리를 분배해 어떤 카드를 봐도 "뭘 · 어디서/언제 · 어떤 사람과"가 한 줄씩 나오게 한다.
 *  1번 슬롯은 첫 질문(FIRST_PROMPT_ID)으로 고정 — 답이 추천과 카드 첫 줄에 바로 쓰인다. */
import { t, lang } from '@core/i18n';
export type PromptCategory = 'activity' | 'campus' | 'time' | 'style' | 'connect' | 'me';

export const PROMPT_CATEGORY_LABELS: Record<PromptCategory, string> = {
  activity: t('함께할 활동'), campus: t('캠퍼스·동네'), time: t('시간·리듬'), style: t('함께하기 스타일'), connect: t('연결 고리'), me: t('나에 대해'),
};

export interface PromptQuestion { id: string; text: string; category: PromptCategory; placeholder?: string }

export const TEXT_PROMPTS: PromptQuestion[] = [
  { id: 'q_now', text: t('이번 주에 학교 근처에서 누군가랑 같이 하고 싶은 거 하나'), category: 'activity', placeholder: t('예: 정문 카페에서 커피 한 잔') },
  { id: 'q_hobby', text: t('혼자 하기 아까운 취미 하나'), category: 'activity', placeholder: t('예: 보드게임, 클라이밍') },
  { id: 'q_into', text: t('요즘 꽂힌 것'), category: 'activity', placeholder: t('음악, 유튜브, 책, 게임 뭐든') },
  { id: 'q_always', text: t('같이 가자고 하면 무조건 나가는 것'), category: 'activity' },
  { id: 'q_after_exam', text: t('시험 끝나면 제일 먼저 하고 싶은 것'), category: 'activity' },
  { id: 'q_cafe', text: t('학교 근처 내 최애 카페 / 밥집'), category: 'campus' },
  { id: 'q_spot', text: t('학교에서 가장 좋아하는 자리'), category: 'campus' },
  { id: 'q_tip', text: t('우리 학교 사람만 아는 꿀팁 하나'), category: 'campus' },
  { id: 'q_3hours', text: t('학교 근처에서 3시간 비면'), category: 'campus', placeholder: t('예: 백양로 산책하고 중도 카페') },
  { id: 'q_not_yet', text: t('우리 학교에서 같이 가보고 싶은데 아직 못 간 곳'), category: 'campus' },
  { id: 'q_morning', text: t('나는 아침형 / 밤형'), category: 'time' },
  { id: 'q_gap', text: t('공강 시간엔 보통'), category: 'time' },
  { id: 'q_free_day', text: t('이번 주 가장 한가한 요일은'), category: 'time' },
  { id: 'q_after_class', text: t('수업 끝나고 바로 갈 수 있는 시간대'), category: 'time', placeholder: t('예: 화·목 5시 이후') },
  { id: 'q_first_meet', text: t('처음 만나면 이런 활동이 제일 편해요'), category: 'style' },
  { id: 'q_study_type', text: t('스터디할 때 나는 이런 타입'), category: 'style', placeholder: t('조용히 / 토론 / 카페 / 도서관') },
  { id: 'q_role', text: t('모임에서 나는 주로 이런 역할'), category: 'style' },
  { id: 'q_want_person', text: t('이런 사람이면 같이하고 싶어요'), category: 'connect' },
  { id: 'q_project', text: t('요즘 하는 프로젝트·연구·준비'), category: 'connect' },
  { id: 'q_ask_me', text: t('나한테 물어보면 잘 알려줄 수 있는 것'), category: 'connect' },
  { id: 'q_team_with', text: t('같이 하면 좋을 것 같은 전공·학년'), category: 'connect', placeholder: t('예: 디자인 전공, 2~3학년') },
  { id: 'q_life', text: t('내 인생 활동 하나'), category: 'me' },
  { id: 'q_new', text: t('최근에 새로 시작한 것'), category: 'me' },
  { id: 'q_emoji', text: t('나를 설명하는 이모지 세 개'), category: 'me', placeholder: '☕📚🏃' },
  { id: 'q_one_line', text: t('요즘 나를 한 문장으로'), category: 'me' },
  // Harness A "Get to know me" (S073) — 짧은 답 세 개, 모두 선택
  ...GET_TO_KNOW_ME_PROMPTS(),
];

/** S073 의 세 질문 — 화면(EditPromptsPage)이 이 순서로 보여 준다 */
export const GET_TO_KNOW_ME_IDS = ['q_down_for', 'q_weekend', 'q_people_to'] as const;
function GET_TO_KNOW_ME_PROMPTS(): PromptQuestion[] {
  const en = lang === 'en';
  return [
    { id: 'q_down_for', text: en ? 'I’m always down for…' : '언제든 좋다고 하는 것…', category: 'activity', placeholder: en ? 'A coffee after class.' : '수업 끝나고 커피 한 잔.' },
    { id: 'q_weekend', text: en ? 'My ideal weekend…' : '내가 그리는 주말…', category: 'time', placeholder: en ? 'A hike, a book, and good company.' : '산책, 책 한 권, 좋은 사람들.' },
    { id: 'q_people_to', text: en ? 'I’m looking for people to…' : '이런 걸 같이 할 사람을 찾아요…', category: 'connect', placeholder: en ? 'Try something new with.' : '새로운 걸 같이 해 볼 사람.' },
  ];
}

export const VOICE_PROMPTS: PromptQuestion[] = [
  { id: 'v_now', text: t('지금 같이 하고 싶은 걸 30초로 말해주세요'), category: 'activity' },
  { id: 'v_campus', text: t('우리 학교 근처 추천 코스를 소개해주세요'), category: 'campus' },
  { id: 'v_hello', text: t('처음 만나는 사람에게 인사 한마디'), category: 'me' },
  { id: 'v_weekend', text: t('이번 주말 계획을 말해주세요'), category: 'time' },
  { id: 'v_song', text: t('요즘 가장 많이 듣는 노래 흥얼거리기'), category: 'me' },
];

export interface PollQuestion { id: string; text: string; options: string[] }
export const POLL_PROMPTS: PollQuestion[] = [
  { id: 'p_gap', text: t('공강엔'), options: [t('카페'), t('도서관'), t('산책')] },
  { id: 'p_first', text: t('처음 만나면'), options: [t('커피'), t('밥'), t('같이 운동')] },
  { id: 'p_study', text: t('시험 기간 나는'), options: [t('중도 붙박이'), t('카페 노마드'), t('집에서 벼락치기')] },
  { id: 'p_weekend', text: t('주말에 부르면'), options: [t('바로 나감'), t('집이 좋아'), t('전시·공연이면 나감')] },
  { id: 'p_meal', text: t('학식 vs 배달 vs 정문 맛집'), options: [t('학식'), t('배달'), t('정문 맛집')] },
];

export const questionById = (id: string) => TEXT_PROMPTS.find((q) => q.id === id) ?? VOICE_PROMPTS.find((q) => q.id === id);
export const pollById = (id: string) => POLL_PROMPTS.find((q) => q.id === id);

export const REQUIRED_TEXT_PROMPTS = 3;
export const MAX_TEXT_PROMPTS = 6;

/** 1번 슬롯에 고정되는 첫 질문 */
export const FIRST_PROMPT_ID = 'q_now';

/** 필수 슬롯별 허용 카테고리. 1번: 활동(고정) · 2번: 캠퍼스|시간 · 3번: 스타일|나 */
export const REQUIRED_SLOTS: { categories: PromptCategory[]; fixedId?: string; hint: string }[] = [
  { categories: ['activity'], fixedId: FIRST_PROMPT_ID, hint: t('뭘 같이 할지') },
  { categories: ['campus', 'time'], hint: t('어디서 · 언제') },
  { categories: ['style', 'me'], hint: t('어떤 사람인지') },
];

/** i번째 슬롯에서 고를 수 있는 카테고리. 필수 슬롯 밖은 제한 없음 */
export const slotCategories = (index: number): PromptCategory[] | null => REQUIRED_SLOTS[index]?.categories ?? null;

/** 슬롯 규칙에 맞게 정규화: 1번은 항상 FIRST_PROMPT_ID, 필수 슬롯의 카테고리가 어긋나면 뒤로 민다 */
export function normalizePrompts(prompts: { questionId: string; answer: string }[]) {
  const first = prompts.find((p) => p.questionId === FIRST_PROMPT_ID) ?? { questionId: FIRST_PROMPT_ID, answer: '' };
  const rest = prompts.filter((p) => p.questionId !== FIRST_PROMPT_ID);
  const out = [first];
  const pool = [...rest];
  for (let i = 1; i < REQUIRED_SLOTS.length; i++) {
    const idx = pool.findIndex((p) => REQUIRED_SLOTS[i].categories.includes(questionById(p.questionId)?.category as PromptCategory));
    if (idx >= 0) out.push(pool.splice(idx, 1)[0]);
  }
  return [...out, ...pool].slice(0, MAX_TEXT_PROMPTS);
}

/** 필수 슬롯이 규칙대로 채워졌고 모든 답이 비어 있지 않은지 */
export function promptsSatisfyRules(prompts: { questionId: string; answer: string }[]) {
  if (prompts.length < REQUIRED_TEXT_PROMPTS) return false;
  if (!prompts.every((p) => p.answer.trim())) return false;
  return REQUIRED_SLOTS.every((slot, i) => {
    const p = prompts[i];
    if (!p) return false;
    if (slot.fixedId) return p.questionId === slot.fixedId;
    return slot.categories.includes(questionById(p.questionId)?.category as PromptCategory);
  });
}

/** 프로필 완성도 계산 */
export function profileCompletion(u: { prompts?: { answer: string }[]; voicePrompt?: unknown; poll?: unknown; bio?: string; interests?: unknown[]; likes?: string; freeTime?: string; timetable?: unknown[]; goals?: unknown[]; lookingFor?: unknown[]; canOffer?: unknown[]; living?: unknown }) {
  const items = [
    { key: 'photo', label: t('프로필 사진'), done: true },
    { key: 'bio', label: t('자기소개'), done: !!u.bio?.trim() },
    { key: 'interests', label: t('관심사'), done: !!u.interests?.length },
    { key: 'prompts', label: `${t('질문 답변 ')}${REQUIRED_TEXT_PROMPTS}${t('개')}`, done: (u.prompts ?? []).filter((p) => p.answer.trim()).length >= REQUIRED_TEXT_PROMPTS },
    { key: 'voice', label: t('음성 질문'), done: !!u.voicePrompt },
    { key: 'poll', label: t('투표형 질문'), done: !!u.poll },
    { key: 'likes', label: t('좋아하는 것'), done: !!u.likes?.trim() },
    { key: 'timetable', label: t('시간표'), done: (u.timetable?.length ?? 0) > 0 },
    { key: 'goals', label: t('이번 학기 목표'), done: (u.goals?.length ?? 0) > 0 },
    { key: 'roles', label: t('찾는 사람·제공할 수 있는 것'), done: (u.lookingFor?.length ?? 0) > 0 && (u.canOffer?.length ?? 0) > 0 },
    { key: 'living', label: t('생활권'), done: !!u.living },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, percent: Math.round((done / items.length) * 100), complete: done === items.length };
}
