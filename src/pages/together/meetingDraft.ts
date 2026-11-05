/**
 * Create a meeting (S032) ↔ Location Ideas (S033) 사이에 들고 다니는 초안 — 화면을 오가도(iOS 새로고침에도) 남게 sessionStorage.
 * 보내면(Set Up Poll) 지운다.
 */
import type { ActivityCategory } from '@core/types';

export interface MeetingDraft {
  title: string;
  category: ActivityCategory;
  inviteeIds: string[];
  /** 그 주 월요일 ('YYYY-MM-DD') */
  weekStart: string;
  minutes: number;
  places: string[];
}
const KEY = 'lumi.meeting.draft.v1';

export function loadDraft(): MeetingDraft | null {
  try { const s = sessionStorage.getItem(KEY); return s ? (JSON.parse(s) as MeetingDraft) : null; } catch { return null; }
}
export function saveDraft(d: MeetingDraft) {
  try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* private mode */ }
}
export function clearDraft() {
  try { sessionStorage.removeItem(KEY); } catch { /* */ }
}
