/** 아이스브레이커 게임 문제 은행 — 사람 카드의 "Say hi" 대신 보내는 게임.
 *  문구는 한국어 원문 + i18n/en.ts 번역 (prompts.ts와 같은 방식). id·option key는 저장되는 값이라 바꾸지 않는다. */
import { t } from '@core/i18n';

export interface PairOption { emoji: string; label: string }
export interface ThisOrThatPair { id: string; a: PairOption; b: PairOption }

/** 이것 또는 저것 — 캠퍼스 생활 버전 */
export const THIS_OR_THAT_PAIRS: ThisOrThatPair[] = [
  { id: 'tt_tacos_ramen', a: { emoji: '🌮', label: t('타코') }, b: { emoji: '🍜', label: t('라멘') } },
  { id: 'tt_library_cafe', a: { emoji: '📚', label: t('도서관') }, b: { emoji: '☕', label: t('카페') } },
  { id: 'tt_morning_night', a: { emoji: '🌅', label: t('아침형') }, b: { emoji: '🌙', label: t('밤형') } },
  { id: 'tt_8am_night', a: { emoji: '⏰', label: t('오전 8시 수업') }, b: { emoji: '🌃', label: t('밤 7시 수업') } },
  { id: 'tt_frontrow_backrow', a: { emoji: '🙋', label: t('맨 앞자리') }, b: { emoji: '🫥', label: t('맨 뒷자리') } },
  { id: 'tt_cram_plan', a: { emoji: '🔥', label: t('벼락치기') }, b: { emoji: '🗓️', label: t('미리미리') } },
  { id: 'tt_dining_delivery', a: { emoji: '🍱', label: t('학식') }, b: { emoji: '🛵', label: t('배달') } },
  { id: 'tt_coffee_boba', a: { emoji: '☕', label: t('커피') }, b: { emoji: '🧋', label: t('버블티') } },
  { id: 'tt_party_movie', a: { emoji: '🎉', label: t('파티') }, b: { emoji: '🍿', label: t('집에서 영화') } },
  { id: 'tt_gym_walk', a: { emoji: '🏋️', label: t('헬스장') }, b: { emoji: '🚶', label: t('캠퍼스 산책') } },
  { id: 'tt_solo_group', a: { emoji: '🎧', label: t('혼자 공부') }, b: { emoji: '👯', label: t('같이 공부') } },
  { id: 'tt_pizza_burrito', a: { emoji: '🍕', label: t('피자') }, b: { emoji: '🌯', label: t('부리토') } },
  { id: 'tt_beach_mountain', a: { emoji: '🏖️', label: t('바다') }, b: { emoji: '🏔️', label: t('산') } },
  { id: 'tt_dorm_apartment', a: { emoji: '🏠', label: t('기숙사 생활') }, b: { emoji: '🏢', label: t('자취') } },
  { id: 'tt_texting_calling', a: { emoji: '💬', label: t('문자') }, b: { emoji: '📞', label: t('전화') } },
  { id: 'tt_spotify_silence', a: { emoji: '🎶', label: t('음악 틀고 공부') }, b: { emoji: '🤫', label: t('완전 조용히') } },
  { id: 'tt_bike_scooter', a: { emoji: '🚲', label: t('자전거') }, b: { emoji: '🛴', label: t('킥보드') } },
  { id: 'tt_game_concert', a: { emoji: '🏈', label: t('학교 경기') }, b: { emoji: '🎤', label: t('공연') } },
  { id: 'tt_hoodie_fit', a: { emoji: '🧥', label: t('후드티') }, b: { emoji: '👗', label: t('꾸민 날') } },
  { id: 'tt_cats_dogs', a: { emoji: '🐈', label: t('고양이') }, b: { emoji: '🐕', label: t('강아지') } },
  { id: 'tt_sweet_salty', a: { emoji: '🍩', label: t('단 거') }, b: { emoji: '🍟', label: t('짠 거') } },
  { id: 'tt_club_research', a: { emoji: '🎸', label: t('동아리 활동') }, b: { emoji: '🔬', label: t('연구실 생활') } },
];

export interface GuessPickOption { key: string; emoji: string; label: string }
export interface GuessPickQuestion {
  id: string;
  /** 본인이 답할 때 보는 문장 (1인칭) */
  text: string;
  /** 맞히는 사람이 보는 문장 — {name} 자리에 상대 이름 */
  guessText: string;
  /** 정확히 4개 */
  options: GuessPickOption[];
}

/** "내 답 맞혀봐" — 가입·프로필에서 본인이 미리 답해 두는 질문 */
export const GUESS_PICK_QUESTIONS: GuessPickQuestion[] = [
  {
    id: 'gp_2am_friday', text: t('금요일 새벽 2시, 나는…'), guessText: t('금요일 새벽 2시, {name}님은…'),
    options: [{ key: 'show', emoji: '🎸', label: t('공연장') }, { key: 'studying', emoji: '📚', label: t('아직 공부 중') }, { key: 'taco_truck', emoji: '🌮', label: t('타코 트럭') }, { key: 'asleep', emoji: '😴', label: t('자는 중') }],
  },
  {
    id: 'gp_free_afternoon', text: t('갑자기 오후가 통째로 비면'), guessText: t('갑자기 오후가 통째로 비면 {name}님은…'),
    options: [{ key: 'nap', emoji: '🛌', label: t('낮잠') }, { key: 'cafe', emoji: '☕', label: t('새 카페 탐방') }, { key: 'hike', emoji: '🥾', label: t('등산·산책') }, { key: 'side_project', emoji: '💻', label: t('사이드 프로젝트') }],
  },
  {
    id: 'gp_finals_fuel', text: t('기말고사 버티는 연료는'), guessText: t('{name}님의 기말고사 연료는…'),
    options: [{ key: 'coffee', emoji: '☕', label: t('커피 수혈') }, { key: 'snacks', emoji: '🍫', label: t('간식 산더미') }, { key: 'playlist', emoji: '🎧', label: t('플레이리스트') }, { key: 'friends', emoji: '👯', label: t('스터디 친구') }],
  },
  {
    id: 'gp_group_role', text: t('조별과제에서 나는'), guessText: t('조별과제에서 {name}님은…'),
    options: [{ key: 'leader', emoji: '📋', label: t('리더') }, { key: 'designer', emoji: '🎨', label: t('슬라이드 장인') }, { key: 'last_minute', emoji: '⏱️', label: t('마감 직전 해결사') }, { key: 'snacks', emoji: '🍪', label: t('간식 담당') }],
  },
  {
    id: 'gp_weekend', text: t('완벽한 주말은'), guessText: t('{name}님의 완벽한 주말은…'),
    options: [{ key: 'city', emoji: '🌉', label: t('도시 나들이') }, { key: 'home', emoji: '🛋️', label: t('집에서 충전') }, { key: 'outdoors', emoji: '🏕️', label: t('야외 활동') }, { key: 'party', emoji: '🎉', label: t('파티') }],
  },
  {
    id: 'gp_order', text: t('카페에서 내 단골 메뉴'), guessText: t('카페에서 {name}님의 단골 메뉴는…'),
    options: [{ key: 'americano', emoji: '☕', label: t('아메리카노') }, { key: 'latte', emoji: '🥛', label: t('라떼') }, { key: 'matcha', emoji: '🍵', label: t('말차') }, { key: 'boba', emoji: '🧋', label: t('버블티') }],
  },
];

/** 이모지 주간 — 본인이 보기를 안 정했을 때 맞히는 사람에게 보여주는 기본 보기 */
export const EMOJI_WEEK_CHIPS: string[] = [t('중간고사 생존 😮‍💨'), t('카페인 + 공연'), t('새 취미 시작'), t('여행 다녀옴'), t('그냥 바쁜 한 주')];

export const pairById = (id: string) => THIS_OR_THAT_PAIRS.find((p) => p.id === id);
export const guessQuestionById = (id: string) => GUESS_PICK_QUESTIONS.find((q) => q.id === id);
