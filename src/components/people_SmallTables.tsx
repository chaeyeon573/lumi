import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Users } from 'lucide-react';
import { t } from '@core/i18n';
import type { User } from '@core/types';
import { sharedSmallTables } from '@core/lib/around';
import { placeLabel } from '@core/lib/relations';
import { formatDateTime } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { Cover } from '@/components/ui';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useViewer } from '@/hooks/useViewer';

/** "둘 다 참여할 수 있는 작은 모임이 있어요" — 1:1 대신 4~6명 모임. 없으면 아무것도 그리지 않는다 */
export function SmallTables({ other, limit = 2, compact, className }: { other: User; limit?: number; compact?: boolean; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const snap = useSnapshot();
  const tables = sharedSmallTables(snap, v.me, other, v.visibleActivities, limit);
  if (tables.length === 0) return null;
  return (
    <section className={cn(compact ? '' : 'card p-4', className)}>
      <div className={cn('font-bold text-primary flex items-center gap-1.5', compact ? 'text-[12px]' : 'text-[14px]')}><Users size={compact ? 13 : 15} />{t('둘 다 참여할 수 있는 작은 모임이 있어요')}</div>
      <div className={cn('mt-2 space-y-1.5')}>
        {tables.map((a) => {
          const mine = v.myParticipation(a.id);
          const place = placeLabel(a, v.me, mine?.status === 'approved');
          const filled = v.approvedCount(a.id) + 1;
          return (
            <button key={a.id} onClick={() => nav(`/activities/${a.id}`)} className="w-full flex items-center gap-2.5 rounded-2xl bg-surface-2 px-2.5 py-2 text-left press">
              <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} className="h-9 w-9 rounded-xl shrink-0" size={18} />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold text-ink truncate">{a.title}</span>
                <span className="flex items-center gap-1 text-[11px] text-ink-3 min-w-0"><span className="shrink-0">{formatDateTime(a.date, a.startTime)}</span><span className="shrink-0">·</span><MapPin size={10} className="shrink-0" /><span className="truncate">{place.name}</span></span>
              </span>
              <span className="text-[11px] font-bold text-verify shrink-0">{filled}/{a.capacity}</span>
              <ChevronRight size={15} className="text-ink-3 shrink-0" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
