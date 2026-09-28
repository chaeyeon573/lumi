import { Text, View } from 'react-native';
import { lang } from '@core/i18n';
import type { User, UserStatus } from '@core/types';
import { activeStatuses, statusLine, STATUS_EMOJI, STATUS_LABELS, WHEN_LABELS } from '@core/lib/status';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { visibleStatuses } from './personView';

/** "☕ 이번 주 커피 가능" / EN "☕ Coffee · this week" (웹 people_StatusPill) */
export function statusText(s: Pick<UserStatus, 'kind' | 'when'>): string {
  if (lang !== 'en') return statusLine(s as UserStatus);
  const when = WHEN_LABELS[s.when] ?? '';
  return `${STATUS_EMOJI[s.kind]} ${STATUS_LABELS[s.kind]}${when ? ` · ${when.toLowerCase()}` : ''}`;
}

/** 내가 볼 수 있는 이 사람의 상태 (본인이면 전부) — 가장 가까운 기간 순 */
export function useVisibleStatuses(user: User): UserStatus[] {
  const v = useViewer();
  const list = user.id === v.me.id ? activeStatuses(user) : visibleStatuses(v.snap, v.me, user);
  return [...list].sort((a, b) => a.until.localeCompare(b.until));
}

export function StatusChip({ status, size = 'md' }: { status: Pick<UserStatus, 'kind' | 'when'>; size?: 'sm' | 'md' }) {
  return (
    <View style={tw`${size === 'sm' ? 'h-6 px-2.5' : 'h-7 px-3'} self-start rounded-full bg-accent-soft justify-center max-w-full`}>
      <Text numberOfLines={1} style={tw`${size === 'sm' ? 'text-[11px]' : 'text-[12px]'} font-semibold text-primary`}>{statusText(status)}</Text>
    </View>
  );
}

/** 대표 상태 한 줄 — 볼 수 있는 상태가 없으면 아무것도 그리지 않는다 (항목별 공개 대상 존중) */
export function StatusPill({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' }) {
  const s = useVisibleStatuses(user)[0];
  if (!s) return null;
  return <StatusChip status={s} size={size} />;
}

/** Open To 여러 개 */
export function StatusPills({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' }) {
  const list = useVisibleStatuses(user);
  if (!list.length) return null;
  return <View style={tw`flex-row flex-wrap`}>{list.map((s) => <View key={s.kind} style={tw`mr-1.5 mb-1.5`}><StatusChip status={s} size={size} /></View>)}</View>;
}
