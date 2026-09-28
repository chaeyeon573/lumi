/**
 * "무엇을 찾고 있나요?" — 어떤 사람 · 어떤 활동.
 * 온보딩에서 묻고, 프로필 › 추천 설정에서 언제든 바꾼다. 추천(사람·모임·홈)의 가중치에 그대로 쓰인다.
 */
import { t } from '@core/i18n';
import type { StageKind } from './stage';
import type { ActivityCategory, ActivityWant, OpenTo, PeopleWant, Wants } from '@core/types';

export const PEOPLE_WANT_LABELS: Record<PeopleWant, string> = {
  same_major: t('같은 전공'), same_interest: t('같은 관심사'), other_school: t('다른 학교 사람'), senior_mentor: t('선배·멘토'),
  alumni: t('동문'), same_city: t('같은 지역'), same_field: t('같은 분야 직장인'), new_people: t('새로운 사람'), same_research: t('같은 연구 분야'),
};
export const PEOPLE_WANT_EMOJI: Record<PeopleWant, string> = {
  same_major: '📚', same_interest: '🎯', other_school: '🏫', senior_mentor: '🧭', alumni: '🎓', same_city: '📍', same_field: '💼', new_people: '🌍', same_research: '🔬',
};
export const ACTIVITY_WANT_LABELS: Record<ActivityWant, string> = {
  coffee: t('커피'), meal: t('식사'), study: t('스터디'), exercise: t('운동'), networking: t('작은 모임'), project: t('프로젝트·창업'), research: t('연구'), hobby: t('취미'),
};
export const ACTIVITY_WANT_EMOJI: Record<ActivityWant, string> = {
  coffee: '☕', meal: '🍽️', study: '📖', exercise: '🏃', networking: '🤝', project: '🚀', research: '🔬', hobby: '🎨',
};

/** 활동 want → 모임 카테고리 */
export const ACTIVITY_WANT_CATEGORIES: Record<ActivityWant, ActivityCategory[]> = {
  coffee: ['coffee'], meal: ['meal'], study: ['study'], exercise: ['exercise'], networking: ['networking'], project: ['networking', 'seminar'], research: ['seminar'], hobby: ['club', 'performance', 'etc'],
};

/** 기존 Open To(프로필 표시)는 활동 want 에서 파생 */
export function openToFromWants(w: Wants): OpenTo[] {
  const out = new Set<OpenTo>();
  w.activities.forEach((a) => {
    if (a === 'coffee' || a === 'meal') out.add('coffee');
    if (a === 'exercise' || a === 'hobby' || a === 'study') out.add('activities');
    if (a === 'research') out.add('research');
    if (a === 'networking') out.add('networking');
    if (a === 'project') out.add('cofounding');
  });
  if (w.people.includes('senior_mentor')) out.add('mentoring');
  return [...out];
}

export const emptyWants = (): Wants => ({ people: [], activities: [] });
export const hasWants = (w?: Wants) => !!w && (w.people.length > 0 || w.activities.length > 0);

/** 사람 want 를 한 줄로 ("같은 관심사 · 동문 · 같은 지역") */
export const wantsLine = (w?: Wants, max = 3) => (w?.people ?? []).slice(0, max).map((p) => PEOPLE_WANT_LABELS[p]).join(' · ');
export const activityWantsLine = (w?: Wants, max = 3) => (w?.activities ?? []).slice(0, max).map((a) => ACTIVITY_WANT_LABELS[a]).join(' · ');

/** 단계별 선택지 순서 — 같은 질문이지만 먼저 보여줄 답이 다르다 (대학원생에게만 '같은 연구 분야') */
export function peopleWantOptions(kind: StageKind): PeopleWant[] {
  if (kind === 'grad') return ['same_research', 'other_school', 'senior_mentor', 'same_field', 'same_major', 'same_interest', 'alumni', 'new_people'];
  if (kind === 'alumni') return ['same_city', 'same_field', 'alumni', 'same_interest', 'new_people', 'other_school', 'same_major', 'senior_mentor'];
  return ['same_major', 'same_interest', 'other_school', 'senior_mentor', 'alumni', 'same_city', 'new_people', 'same_field'];
}
export function activityWantOptions(kind: StageKind): ActivityWant[] {
  if (kind === 'grad') return ['research', 'study', 'coffee', 'project', 'networking', 'meal', 'exercise', 'hobby'];
  if (kind === 'alumni') return ['coffee', 'networking', 'meal', 'exercise', 'project', 'hobby', 'study', 'research'];
  return ['meal', 'study', 'coffee', 'exercise', 'hobby', 'project', 'networking', 'research'];
}
