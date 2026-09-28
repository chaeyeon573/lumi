/** 탈퇴한 사용자 표시 — 대화 기록에는 남지만 이름·사진은 중립으로, 연결·메시지는 막는다 */
import { t } from '@core/i18n';
import type { User } from '@core/types';

export const isDeletedUser = (u?: User | null): boolean => !!u?.deleted;

/** 화면에 쓸 이름 — 탈퇴한 사용자는 현재 언어의 "탈퇴한 사용자" */
export function displayName(u?: User | null, fallback = ''): string {
  if (!u) return fallback;
  return u.deleted ? t('탈퇴한 사용자') : u.nickname;
}

/** 화면에 쓸 아바타 — 탈퇴한 사용자·알 수 없는 사용자는 중립 아바타 */
export function displayAvatar(u?: User | null): { emoji: string; hue: number; url?: string } {
  if (!u || u.deleted) return { emoji: '👤', hue: 210 };
  return u.avatar;
}
