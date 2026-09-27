import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Link2, MapPin, Coffee } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import type { Snapshot } from '@core/api/types';
import { aroundToday } from '@core/lib/around';
import { Avatar, SectionSkeleton, SectionError } from '@/components/ui';
import { useSectionState } from '@/hooks/useSectionState';

/**
 * 오늘 주변에서 — 목표·숙제 없이 사실만 조용히.
 * "아는 사람을 통해 이어진 사람 3명 · 이번 주 서울에 있는 사람 2명 · 지금 커피에 열려 있는 사람 1명"
 */
export function AroundTodayCard({ me, snap }: { me: User; snap: Snapshot }) {
  const nav = useNavigate();
  const st = useSectionState('home-around');
  const d = useMemo(() => aroundToday(snap, me), [snap, me]);
  const rows = [
    { key: 'via', Icon: Link2, n: d.viaFriends.length, label: t('아는 사람을 통해 이어진 사람'), people: d.viaFriends.map((x) => x.user), to: '/people/second' },
    { key: 'city', Icon: MapPin, n: d.inCity.length, label: lang === 'en' ? `People in ${d.city} this week` : `이번 주 ${d.city}에 있는 사람`, people: d.inCity, to: `/people/around?city=${encodeURIComponent(d.city)}` },
    { key: 'open', Icon: Coffee, n: d.openNow.length, label: t('지금 무언가에 열려 있는 사람'), people: d.openNow, to: '/people/around?open=1' },
  ].filter((r) => r.n > 0);
  if (st.loading) return <div className="px-4 mt-3"><SectionSkeleton count={1} /></div>;
  if (st.error) return <div className="px-4 mt-3"><SectionError onRetry={st.retry} /></div>;
  if (!rows.length) return null; // 아무것도 없으면 조용히 비워둔다 (숙제처럼 채우라고 하지 않는다)
  return (
    <section className="mx-4 mt-3 rounded-[24px] bg-white border border-line p-3.5" aria-label={t('오늘 주변에서')}>
      <div className="px-0.5 text-[12px] font-bold text-ink-3">{t('오늘 주변에서')}</div>
      <ul className="mt-1.5 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.key}>
            <button onClick={() => nav(r.to)} className="w-full flex items-center gap-3 py-2.5 text-left press">
              <span className="h-8 w-8 rounded-full bg-[#BFF4FF] text-primary grid place-items-center shrink-0"><r.Icon size={15} /></span>
              <span className="flex-1 min-w-0 text-[14px] text-ink"><span className="truncate">{r.label}</span> <b className="text-primary">{r.n}{t('명')}</b></span>
              <span className="flex -space-x-2 shrink-0">{r.people.slice(0, 3).map((p) => <Avatar key={p.id} emoji={p.avatar.emoji} hue={p.avatar.hue} url={p.avatar.url} size={24} className="ring-2 ring-white" />)}</span>
              <ChevronRight size={15} className="text-ink-3 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
