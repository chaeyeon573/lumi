import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, MapPinOff, Pencil, Plane } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import { whoIsAround, weekRange, aroundCityOptions, type AroundPerson, type AroundWindow } from '@core/lib/around';
import { localeContext } from '@core/lib/locale-context';
import { profileView, privacyOf } from '@core/lib/privacy';
import { activeStatuses } from '@core/lib/status';
import { todayISO } from '@core/lib/format';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Segmented, Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/components/ui';
import { useSectionState } from '@/hooks/useSectionState';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useViewer } from '@/hooks/useViewer';
import { MaskedPersonCard, DegreePill, degreeLine, StatusPill } from '@/components/around_PersonCard';
import { TripsSheet, shortRange } from '@/components/around_TripsSheet';

/**
 * Who's Around This Week — 도시(권역) 단위로 이번 주/다음 주에 여기 있는 사람 · 방문 예정인 사람.
 * 지도·핀·정확한 위치·실시간 위치는 쓰지 않는다. 사람은 거리(촌수) 순.
 * /people/around?city=&week=this|next&open=1
 */
export function AroundPage() {
  const nav = useNavigate();
  const v = useViewer();
  const snap = useSnapshot();
  const me = v.me;
  const [params, setParams] = useSearchParams();
  const cities = useMemo(() => aroundCityOptions(me, localeContext().cities), [me]);
  const city = params.get('city') || cities[0] || '';
  const win: AroundWindow = params.get('week') === 'next' ? 'next' : 'this';
  const openOnly = params.get('open') === '1';
  const [tripsOpen, setTripsOpen] = useState(false);
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, val]) => (val === null ? next.delete(k) : next.set(k, val)));
    setParams(next, { replace: true });
  };
  const s = useSectionState(`around:${city}:${win}`);

  const all = useMemo(() => {
    const hidden = new Set(me.hiddenPeople ?? []);
    return whoIsAround(snap, me, city, win, (u: User) => profileView(snap, me, u).trips).filter((p) => !hidden.has(p.user.id));
  }, [snap, me, city, win]);
  const list = openOnly ? all.filter((p) => activeStatuses(p.user).length > 0) : all;
  const here = list.filter((p) => p.kind === 'here');
  const visiting = list.filter((p) => p.kind === 'visiting');
  const [from, to] = weekRange(win);
  const neighbor = cities.find((c) => c !== city);
  const myTrips = [...(me.trips ?? [])].filter((tr) => tr.to >= todayISO()).sort((a, b) => a.from.localeCompare(b.from));
  const denied = me.settings.locationPermission === 'denied';

  const emptyTitle = lang === 'en' ? `No one in ${city} for these dates yet` : `이 기간에 ${city}에는 아직 없어요`;
  const empty = list.length === 0 && (
    openOnly && all.length > 0
      ? <SectionEmpty emoji="☕" title={t('지금 시간 되는 사람이 없어요')} description={t('상태를 켠 사람만 보고 있어요')} action={<Button size="sm" variant="outline" onClick={() => set({ open: null })}>{t('필터 끄기')}</Button>} />
      : <SectionEmpty emoji="🌙" title={emptyTitle} description={t('방문 예정은 공개한 사람만 보여요')} action={
        <div className="flex flex-wrap justify-center gap-2">
          {win === 'this' && <Button size="sm" variant="outline" onClick={() => set({ week: 'next' })}>{t('다음 주 보기')}</Button>}
          {neighbor && <Button size="sm" variant="outline" onClick={() => set({ city: neighbor })}>{t('인접 도시')} · {neighbor}</Button>}
        </div>
      } />
  );

  return (
    <div className="min-h-full bg-bg pb-10">
      <TopBar back title={t('이번 주 주변')} />
      <div className="px-4 pt-3 space-y-4">
        {denied && (
          <div className="rounded-2xl bg-surface-2 px-3.5 py-2.5 flex items-center gap-2 text-[12px] text-ink-2">
            <MapPinOff size={14} className="shrink-0 text-primary" />{t('위치 권한 없이도 도시로 찾을 수 있어요')}
          </div>
        )}

        {/* 내 방문 예정 */}
        <section className="rounded-[24px] bg-[linear-gradient(135deg,var(--tint),var(--tint))] p-4">
          <div className="flex items-center gap-2">
            <Plane size={16} className="text-primary" />
            <span className="flex-1 text-[14px] font-bold text-primary">{t('내 방문 예정')}</span>
            <button onClick={() => setTripsOpen(true)} className="h-8 px-3 rounded-full bg-white text-primary text-[12px] font-semibold flex items-center gap-1 press"><Pencil size={12} />{t('추가·수정')}</button>
          </div>
          {myTrips.length === 0
            ? <p className="mt-1.5 text-[12px] text-ink-2">{t('다른 도시에 갈 일이 있으면 도시와 날짜만 남겨 두세요')}</p>
            : <div className="mt-2 flex flex-wrap gap-1.5">{myTrips.map((tr) => (
              <button key={tr.id} onClick={() => set({ city: tr.city })} className="h-7 px-3 rounded-full bg-white/80 text-[12px] font-semibold text-primary press">{tr.city} · {shortRange(tr.from, tr.to)}</button>
            ))}</div>}
          <PrivacyNote className="mt-2" text={privacyOf(me).showTrips ? t('도시와 날짜만 보여요') : t('방문 예정 공개가 꺼져 있어요')} />
        </section>

        {/* 도시 · 기간 · 필터 */}
        <div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
            {cities.map((c) => <Chip key={c} active={c === city} onClick={() => set({ city: c })}>{c}</Chip>)}
          </div>
          <Segmented className="mt-2" value={win} onChange={(w) => set({ week: w === 'this' ? null : w })} options={[{ value: 'this', label: t('이번 주') }, { value: 'next', label: t('다음 주') }]} />
          <div className="mt-2 flex items-center gap-2">
            <Chip size="sm" active={openOnly} onClick={() => set({ open: openOnly ? null : '1' })}>☕ {t('지금 시간 되는 사람만')}</Chip>
            <span className="ml-auto text-[11px] text-ink-3 flex items-center gap-1"><CalendarDays size={11} />{shortRange(from, to)}</span>
          </div>
        </div>

        <Section loading={s.loading} error={s.error} onRetry={s.retry} skeleton={<SectionSkeleton count={3} />} empty={empty}>
          <div className="space-y-5">
            {here.length > 0 && (
              <section>
                <h2 className="text-[13px] font-semibold text-ink-3 mb-2">{t('여기 있는 사람')} {here.length}</h2>
                <div className="space-y-2.5">{here.map((p) => <AroundCard key={p.user.id} p={p} city={city} />)}</div>
              </section>
            )}
            {visiting.length > 0 && (
              <section>
                <h2 className="text-[13px] font-semibold text-ink-3 mb-2">{t('방문 예정')} {visiting.length}</h2>
                <div className="space-y-2.5">{visiting.map((p) => <AroundCard key={p.user.id} p={p} city={city} />)}</div>
              </section>
            )}
            <PrivacyNote className="justify-center" text={t('도시 단위로만 보여요 · 정확한 위치·실시간 위치는 쓰지 않아요')} />
          </div>
        </Section>

        <button onClick={() => nav('/meet/tables')} className="w-full rounded-[20px] border border-line bg-white px-4 py-3 text-left press">
          <div className="text-[14px] font-bold text-primary">{t('작은 모임 · 4~6명')}</div>
          <div className="text-[12px] text-ink-3 mt-0.5">{t('4~6명이 모이는 작은 모임이 1:1보다 편해요')}</div>
        </button>
      </div>
      <TripsSheet open={tripsOpen} onClose={() => setTripsOpen(false)} defaultCity={city} />
    </div>
  );
}

function AroundCard({ p, city }: { p: AroundPerson; city: string }) {
  const snap = useSnapshot();
  const v = useViewer();
  const visitLine = p.kind === 'visiting' && p.tripFrom && p.tripTo
    ? (lang === 'en' ? `Visiting ${city} ${shortRange(p.tripFrom, p.tripTo)}` : `${shortRange(p.tripFrom, p.tripTo)} ${city} 방문 예정`)
    : null;
  return (
    <MaskedPersonCard
      user={p.user}
      top={<><DegreePill text={degreeLine(snap, v.me, p.user, p.degree)} /><StatusPill user={p.user} size="sm" /></>}
      sub={visitLine ? <div className="text-[12px] font-semibold text-verify mt-0.5 flex items-center gap-1"><Plane size={11} />{visitLine}</div> : undefined}
    />
  );
}
