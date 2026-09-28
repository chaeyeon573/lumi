import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { StatusKind, StatusWhen, User, UserStatus } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { activeStatuses, makeStatus, statusLine, STATUS_EMOJI, STATUS_LABELS, WHEN_LABELS, ALL_STATUS_KINDS, ALL_STATUS_WHENS } from '@core/lib/status';
import { cn } from '@core/lib/cn';
import { BottomSheet, Button, Chip, Segmented } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { visibleStatuses } from '@/components/people_view';

/** "☕ 이번 주 커피 가능" / EN "☕ Coffee · this week" (영어 어순) */
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

const pillCls = (size: 'sm' | 'md') => cn('inline-block align-middle rounded-full bg-accent-soft text-ink-2 font-semibold whitespace-nowrap max-w-full truncate', size === 'sm' ? 'h-6 leading-6 px-2.5 text-[11px]' : 'h-7 leading-7 px-3 text-[12px]');

export function StatusChip({ status, size = 'md', className }: { status: Pick<UserStatus, 'kind' | 'when'>; size?: 'sm' | 'md'; className?: string }) {
  return <span className={cn(pillCls(size), className)}>{statusText(status)}</span>;
}

/** 대표 상태 한 줄 — 볼 수 있는 상태가 없으면 아무것도 그리지 않는다 (항목별 공개 대상 존중) */
export function StatusPill({ user, className, size = 'md' }: { user: User; className?: string; size?: 'sm' | 'md' }) {
  const s = useVisibleStatuses(user)[0];
  if (!s) return null;
  return <StatusChip status={s} size={size} className={className} />;
}

/** Open To 여러 개 */
export function StatusPills({ user, className, size = 'md' }: { user: User; className?: string; size?: 'sm' | 'md' }) {
  const list = useVisibleStatuses(user);
  if (!list.length) return null;
  return <div className={cn('flex flex-wrap gap-1.5', className)}>{list.map((s) => <StatusChip key={s.kind} status={s} size={size} />)}</div>;
}

/** 빠른 상태 켜기 시트 — 한 항목만 바꾸고 나머지 Open To 는 그대로 둔다. 자세한 설정은 /profile/open-to */
export function StatusPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const mine = activeStatuses(v.me);
  const [kind, setKind] = useState<StatusKind>(mine[0]?.kind ?? 'coffee');
  const [when, setWhen] = useState<StatusWhen>(mine[0]?.when ?? 'week');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setKind(mine[0]?.kind ?? 'coffee'); setWhen(mine[0]?.when ?? 'week'); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = mine.find((x) => x.kind === kind);
  const whens = ALL_STATUS_WHENS.includes(when) ? ALL_STATUS_WHENS : [...ALL_STATUS_WHENS, when];

  const save = async (on: boolean) => {
    setBusy(true);
    const rest = mine.filter((x) => x.kind !== kind);
    const next = on ? [...rest, makeStatus(kind, when, current?.audience ?? 'school_2nd')] : rest;
    try { await run(() => api.users.setOpenStatuses(v.me.id, next), on ? t('상태를 켰어요') : t('상태를 껐어요')); onClose(); }
    catch { /* toast by run */ } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('지금 상태')}>
      <p className="text-[12px] text-ink-3">{t('기간이 지나면 자동으로 꺼져요')}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ALL_STATUS_KINDS.map((k) => <Chip key={k} size="sm" active={kind === k} onClick={() => setKind(k)}>{STATUS_EMOJI[k]} {STATUS_LABELS[k]}</Chip>)}
      </div>
      <Segmented className="mt-3" value={when} onChange={setWhen} options={whens.map((w) => ({ value: w, label: WHEN_LABELS[w] }))} />
      <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-center"><StatusChip status={{ kind, when }} /></div>
      <div className="mt-4 flex gap-2">
        {current && <Button size="lg" variant="outline" onClick={() => save(false)} disabled={busy}>{t('끄기')}</Button>}
        <Button size="lg" full loading={busy} onClick={() => save(true)}>{current ? t('바꾸기') : t('켜기')}</Button>
      </div>
      <button type="button" onClick={() => { onClose(); nav('/profile/open-to'); }} className="mt-3 w-full flex items-center justify-center gap-1 text-[12px] font-semibold text-verify press">{t('요즘 가능한 것 자세히 설정')}<ChevronRight size={13} /></button>
    </BottomSheet>
  );
}
