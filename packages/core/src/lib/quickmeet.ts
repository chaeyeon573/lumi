/**
 * 즉석 만남(Instant meetup) 짧은 양식의 기본값 — 무엇 · 언제 · 어디, 끝.
 * 예전엔 긴 활동 양식(제목·설명·커버·날짜·시작·끝·장소·인원·참가비·공개 범위)이 열렸고, 밤 10시 반에 열면 시작이 '오후 11시'로
 * 채워졌다 (ux-sim 2026-11-02 diego: "I want lunch in 20 minutes"). 기본값은 절대 지난 시각이거나 이상한 시각(밤늦게·새벽)이 아니다.
 */
import type { ActivityCategory } from '@core/types';

export type QuickWhatKey = 'lunch' | 'coffee' | 'study' | 'walk';
export interface QuickWhat { key: QuickWhatKey; category: ActivityCategory; emoji: string; en: string; ko: string; /** 기본 길이(분) */ minutes: number; /** 어울리는 장소 (학교 프리셋에 있으면 그것을 고른다) */ place: string }
export const QUICK_WHAT: QuickWhat[] = [
  { key: 'lunch', category: 'meal', emoji: '🍱', en: 'Lunch', ko: '점심', minutes: 60, place: 'MLK Student Union' },
  { key: 'coffee', category: 'coffee', emoji: '☕', en: 'Coffee', ko: '커피', minutes: 45, place: 'Caffe Strada' },
  { key: 'study', category: 'study', emoji: '📚', en: 'Study', ko: '공부', minutes: 120, place: 'Doe Library' },
  { key: 'walk', category: 'exercise', emoji: '🌳', en: 'Walk', ko: '산책', minutes: 45, place: 'Memorial Glade' },
];

/** 즉석 만남이 시작해도 되는 시각 — 이 밖이면 '지금'·'30분 뒤'를 내지 않고 시각을 고르게 한다 */
export const QUICK_EARLIEST = 8 * 60;
export const QUICK_LATEST = 21 * 60 + 30;
/** 하루의 끝 — 끝나는 시각이 자정을 넘지 않게 */
const DAY_END = 23 * 60 + 59;

export type QuickWhenKey = 'now' | 'in30' | 'pick';
export interface QuickWhen {
  /** '지금' 시작 (5분 단위로 올림). 이상한 시각이면 null */
  now: number | null;
  /** 30분 뒤 시작. 이상한 시각이면 null */
  in30: number | null;
  /** 처음에 골라 둘 것 */
  initial: QuickWhenKey;
  /** '시간 고르기'를 눌렀을 때 미리 넣어 둘 날짜(오늘=0, 내일=1)와 시각 */
  pick: { dayOffset: 0 | 1; start: number };
}

const up = (m: number, step: number) => Math.ceil(m / step) * step;
const sensible = (m: number) => m >= QUICK_EARLIEST && m <= QUICK_LATEST;

/** 지금 시각(분)으로 '언제' 선택지를 만든다 */
export function quickWhen(now: number): QuickWhen {
  const n = up(now, 5);
  const in30 = up(now + 30, 5);
  const okNow = sensible(n) ? n : null;
  const ok30 = sensible(in30) ? in30 : null;
  const next = up(now + 60, 30);
  const pick: QuickWhen['pick'] = sensible(next) ? { dayOffset: 0, start: next }
    : now < QUICK_EARLIEST ? { dayOffset: 0, start: 12 * 60 }
    : { dayOffset: 1, start: 12 * 60 };
  return { now: okNow, in30: ok30, initial: ok30 != null ? 'in30' : okNow != null ? 'now' : 'pick', pick };
}

/** 끝나는 시각 — 기본 길이만큼, 자정은 넘지 않게 */
export const quickEnd = (start: number, minutes: number) => Math.min(start + minutes, DAY_END);

/** 고른 시각이 쓸 수 있는가 — 오늘이면 지금 이후, 언제든 06:00~23:00 */
export function quickPickOk(dayOffset: number, start: number, now: number): boolean {
  if (!Number.isFinite(start) || start < 6 * 60 || start > 23 * 60) return false;
  return dayOffset > 0 || start >= now;
}
