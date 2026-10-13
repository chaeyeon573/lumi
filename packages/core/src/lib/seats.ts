/**
 * 좌석 알림 (Seat alerts) — 학생이 다음 학기 수업을 "Watch seats" 하면 워커가 공개 수업 시간표
 * (classes.berkeley.edu 수업 페이지)의 좌석 수를 주기적으로 보고, 자리가 나면 알림을 보낸다.
 * 우리는 대신 수강신청을 하지 않는다 — 알림은 CalCentral 로 안내만 한다.
 */
import type { ID } from '@core/types';

export const CALCENTRAL_URL = 'https://calcentral.berkeley.edu/';

/** 한 번 본 좌석 수 */
export interface SeatSnapshot {
  /** O = Open · C = Closed · W = Waitlist (원본 코드 그대로) */
  code: string;
  /** 원본 설명 ("Open", "Closed") */
  label: string;
  enrolled: number;
  max: number;
  waitlisted: number;
  maxWaitlist: number;
  /** 특정 학생에게 묶인 빈자리 (예약석) — 일반 학생이 못 쓸 수 있다 */
  openReserved: number;
  /** 확인한 시각 (ISO) */
  at: string;
}

/** 열린 자리 = 정원 - 등록 (음수면 0) */
export const openSeats = (s: Pick<SeatSnapshot, 'max' | 'enrolled'>) => Math.max(0, s.max - s.enrolled);

/** 화면용 상태 — open: 빈자리 있음 · waitlist: 마감됐고 대기 가능 · closed: 마감 */
export function seatState(s: SeatSnapshot): 'open' | 'waitlist' | 'closed' {
  if (s.code === 'O' && openSeats(s) > 0) return 'open';
  return s.maxWaitlist > s.waitlisted ? 'waitlist' : 'closed';
}

/** "Open 12/481 · Waitlist 0" · "Closed · Waitlist 34/555" */
export function seatLine(s: SeatSnapshot): string {
  const wl = s.maxWaitlist ? `Waitlist ${s.waitlisted}/${s.maxWaitlist}` : `Waitlist ${s.waitlisted}`;
  if (s.code === 'O' && openSeats(s) > 0) return `Open ${openSeats(s)}/${s.max} · ${wl}`;
  return `${s.code === 'O' ? 'Full' : s.label || 'Closed'} · ${wl}`;
}

/** 화면이 받는 내 관심 수업 하나 */
export interface SeatWatchItem {
  id: ID;
  courseId: ID;
  code: string;
  title: string;
  term: string;
  /** 공식 수업 페이지 */
  url: string;
  createdAt: string;
  /** 학기 add 마감이 지나 더는 보지 않음 */
  ended: boolean;
  /** 마지막 add 마감 (YYYY-MM-DD) */
  until?: string;
  latest?: SeatSnapshot;
  /** 원본을 마지막으로 확인한 시각 (값이 그대로여도 갱신) */
  checkedAt?: string;
  /** 최근 확인이 실패했으면 그 이유 (다음 확인에서 다시 시도) */
  error?: string;
}

export interface SeatWatchView {
  watches: SeatWatchItem[];
  /** 이 학교에서 지금 좌석 알림을 걸 수 있는 학기 (add 마감 전) */
  watchableTerms: string[];
  /** 이 학교가 좌석 알림을 지원하는지 */
  supported: boolean;
}

/** 이 수업 페이지가 좌석을 읽을 수 있는 공개 시간표인지 (지금은 UC Berkeley 만) */
export const seatSourceOk = (url?: string) => !!url && /^https:\/\/classes\.berkeley\.edu\/content\/[a-z0-9-]+$/i.test(url);

/** "N min ago" */
export function agoText(iso: string | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} hr ago`;
  return `${Math.round(h / 24)} days ago`;
}
