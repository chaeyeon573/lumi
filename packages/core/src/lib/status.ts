/**
 * 가벼운 상태 — "☕ 이번 주 커피 가능", "🏃 주말 러닝 가능".
 * LinkedIn 식 "Open to networking / mentorship" 대신, 기간이 지나면 자동으로 꺼지는 한 줄.
 */
import type { StatusKind, StatusWhen, User, UserStatus } from '@core/types';
import { t } from '@core/i18n';

export const STATUS_EMOJI: Record<StatusKind, string> = { coffee: '☕', meal: '🍽️', running: '🏃', study: '📖', walk: '🚶', chat: '💬' };
export const STATUS_LABELS: Record<StatusKind, string> = { coffee: t('커피'), meal: t('밥'), running: t('러닝'), study: t('같이 공부'), walk: t('산책'), chat: t('이야기') };
export const WHEN_LABELS: Record<StatusWhen, string> = { now: t('지금'), today: t('오늘'), week: t('이번 주'), weekend: t('주말'), ongoing: t('계속') };
export const ALL_STATUS_KINDS: StatusKind[] = ['coffee', 'meal', 'running', 'study', 'walk', 'chat'];
export const ALL_STATUS_WHENS: StatusWhen[] = ['now', 'today', 'week', 'weekend'];
/** Open To 설정 화면의 기간 선택지 (오늘 · 이번 주 · 계속) */
export const OPEN_TO_WHENS: StatusWhen[] = ['today', 'week', 'ongoing'];

/** 상태가 꺼지는 시각 */
export function statusUntil(when: StatusWhen, from = new Date()): string {
  const d = new Date(from);
  if (when === 'ongoing') { d.setFullYear(d.getFullYear() + 5); return d.toISOString(); }
  if (when === 'now') d.setHours(d.getHours() + 3);
  else if (when === 'today') d.setHours(23, 59, 0, 0);
  else if (when === 'week') { const add = (7 - d.getDay()) % 7; d.setDate(d.getDate() + add); d.setHours(23, 59, 0, 0); }
  else { const toSun = (7 - d.getDay()) % 7; d.setDate(d.getDate() + toSun); d.setHours(23, 59, 0, 0); }
  return d.toISOString();
}

export const makeStatus = (kind: StatusKind, when: StatusWhen, audience?: UserStatus['audience']): UserStatus => ({ kind, when, until: statusUntil(when), setAt: new Date().toISOString(), audience });

/** 켜져 있는 상태 전부 (Open To 여러 개 + 레거시 단일 상태). 기간이 지난 것은 빠진다 */
export function activeStatuses(u: Pick<User, 'status' | 'openStatuses'>, now = Date.now()): UserStatus[] {
  const all = [...(u.openStatuses ?? []), ...(u.status && !(u.openStatuses ?? []).some((x) => x.kind === u.status!.kind) ? [u.status] : [])];
  return all.filter((x) => new Date(x.until).getTime() > now);
}
/** 대표 상태 하나 (가장 가까운 기간) */
export const activeStatus = (u: Pick<User, 'status' | 'openStatuses'>, now = Date.now()): UserStatus | null => activeStatuses(u, now).sort((a, b) => a.until.localeCompare(b.until))[0] ?? null;

/** "☕ 이번 주 커피 가능" */
export function statusLine(s: UserStatus): string {
  if (s.when === 'ongoing') return `${STATUS_EMOJI[s.kind]} ${STATUS_LABELS[s.kind]} ${t('열려 있어요')}`;
  return `${STATUS_EMOJI[s.kind]} ${WHEN_LABELS[s.when]} ${STATUS_LABELS[s.kind]} ${t('가능')}`;
}
