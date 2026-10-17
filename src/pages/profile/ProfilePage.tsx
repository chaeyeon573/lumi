import { useNavigate } from 'react-router-dom';
import { Settings, Pencil, ShieldCheck, BadgeCheck, CalendarDays, ChevronRight, Users, CalendarCheck, Bookmark, Building2, Quote, Car } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar, Button, CardSkeleton, ErrorState, Tag } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { INTEREST_LABELS } from '@core/lib/labels';
import { friendsOf } from '@core/lib/relations';
import { todayISO, formatDateTime } from '@core/lib/format';
import { statusNow, statusLabel, freeBlocks, todayIdx, nowMin, fmtBlock } from '@core/lib/timetable';
import { profileCompletion, questionById } from '@core/data/prompts';
import { cn } from '@core/lib/cn';
import { WeekGrid } from '@/components/timetable/WeekGrid';
import { KeyDatesCard } from '@/components/academic/KeyDatesCard';
import { SeatWatchCard } from '@/components/seats/SeatWatch';
import { campusToday } from '@core/lib/rides';


/** 나 — 프로필 카드 · 주간 시간표 · 다가오는 약속 (Pastel Breeze) */
export function ProfilePage() {
  const nav = useNavigate();
  const v = useViewer();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const activities = useAppStore((s) => s.activities);
  const participations = useAppStore((s) => s.participations);
  const polls = useAppStore((s) => s.timePolls);
  const intents = useAppStore((s) => s.opportunityIntents);
  const orgs = useAppStore((s) => s.organizations);
  const rides = useAppStore((s) => s.rides);
  const me = v.me;
  if (status === 'loading') return <div><AppHeader /><CardSkeleton count={2} /></div>;
  if (status === 'error') return <div><AppHeader /><ErrorState message={error ?? undefined} onRetry={init} /></div>;

  const friends = friendsOf(v.snap, me.id).length;
  const today = todayISO();
  const upcoming = activities.filter((a) => a.date >= today && (a.hostId === me.id || participations.some((p) => p.activityId === a.id && p.userId === me.id && (p.status === 'approved' || p.status === 'pending')))).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const hangouts = activities.filter((a) => participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'approved')).length + activities.filter((a) => a.hostId === me.id).length;
  const completion = profileCompletion(me);
  const goTo = me.prompts[0];
  const now = statusNow(me.timetable);
  const nextFree = freeBlocks(me.timetable, todayIdx()).find((b) => b.end > nowMin());
  const days = [0, 1, 2, 3, 4];
  const openPolls = polls.filter((p) => p.status === 'open' && (p.hostId === me.id || p.inviteeIds.includes(me.id))).length;
  const saved = intents.filter((i) => i.userId === me.id && (i.saved || i.intent === 'applied')).length;
  const myOrgs = orgs.filter((o) => o.memberIds.includes(me.id) || o.adminIds.includes(me.id)).length;
  const myRides = (rides ?? []).filter((r) => r.status !== 'cancelled' && r.date >= campusToday() && (r.hostId === me.id || r.memberIds.includes(me.id))).length;
  const dept = me.affiliation.type === 'university' ? `${me.affiliation.department} • ${me.affiliation.schoolName}` : '';

  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader right={<button onClick={() => nav('/settings')} aria-label={t('설정')} className="h-11 w-11 rounded-full grid place-items-center text-ink-2"><Settings size={21} /></button>} />
      <div className="px-4 space-y-4">
        {me.affiliation.type === 'university' && <KeyDatesCard schoolId={me.affiliation.schoolId} />}
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[20px] font-bold text-primary flex items-center gap-2 whitespace-nowrap"><CalendarDays size={18} />{lang === 'en' ? 'Schedule' : '내 시간표'}</h2>
            {me.timetable.length > 0 && <span className={cn('h-7 px-3 rounded-full text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0', now.kind === 'free' ? 'bg-mint-soft text-mint' : 'bg-surface-2 text-ink-2')}><span className={cn('h-1.5 w-1.5 rounded-full', now.kind === 'free' ? 'bg-mint' : 'bg-ink-3')} />{now.kind === 'free' ? statusLabel(now) : now.kind === 'in_class' ? t('수업 중') : t('오늘 수업 끝')}</span>}
          </div>
          {me.timetable.length === 0 ? (
            <Button full variant="secondary" className="mt-4" onClick={() => nav('/timetable')}>{t('시간표 만들기')}</Button>
          ) : (
            <>
              <div className="mt-3 -mx-3 rounded-2xl overflow-hidden border border-line">
                <WeekGrid courses={me.timetable} days={days} today={todayIdx()} onCourse={(c) => nav(`/classes/${encodeURIComponent(c.name)}`)} onCell={() => nav('/timetable')} />
              </div>
              <button onClick={() => nav('/timetable')} className="mt-2 w-full h-10 rounded-xl bg-surface-2 text-[13px] font-semibold text-primary press">{lang === 'en' ? 'Edit timetable' : '시간표 편집'}</button>
              {nextFree && <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-2"><span className="text-verify">★</span><span className="flex-1 truncate">{lang === 'en' ? `Next free window ${fmtBlock({ start: Math.max(nextFree.start, nowMin()), end: nextFree.end })}` : `다음 공강 ${fmtBlock({ start: Math.max(nextFree.start, nowMin()), end: nextFree.end })}`}</span><Button size="sm" onClick={() => nav('/timetable?open=1')}>{t('열기')}</Button></div>}
            </>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-4">
            <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={72} />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-[24px] font-bold text-primary leading-tight truncate">{me.nickname}</h1>
              <div className="text-[13px] text-ink-2 truncate">{dept}</div>
              {me.affiliation.type === 'university' && me.affiliation.emailVerified && <span className="mt-1.5 inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-accent-soft border border-accent text-primary text-[11px] font-bold"><BadgeCheck size={12} />{lang === 'en' ? 'Campus verified' : '학교 인증'}</span>}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 text-center">
            {[{ n: friends, l: t('친구'), to: '/profile/friends' }, { n: hangouts, l: lang === 'en' ? 'Hangouts' : '활동', to: '/plans' }, { n: `${completion.percent}%`, l: lang === 'en' ? 'Profile' : '프로필 완성', to: '/profile/prompts' }].map((s) => (
              <button key={s.l} onClick={() => nav(s.to)} className="py-1"><div className="font-display text-[22px] font-bold text-primary">{s.n}</div><div className="text-[12px] text-ink-3">{s.l}</div></button>
            ))}
          </div>
          {goTo?.answer && (
            <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3">
              <div className="text-[11px] font-bold tracking-wide text-verify uppercase flex items-center gap-1"><Quote size={11} />{questionById(goTo.questionId)?.text}</div>
              <p className="mt-1 text-[14px] text-ink-2 italic">“{goTo.answer}”</p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">{me.interests.slice(0, 5).map((i) => <span key={i} className="h-7 px-3 rounded-full bg-accent-soft text-primary text-[12px] font-semibold flex items-center">#{INTEREST_LABELS[i]}</span>)}</div>
          <div className="mt-4 flex gap-2">
            <Button full icon={<Pencil size={15} />} onClick={() => nav('/profile/edit')}>{t('프로필 편집')}</Button>
            <Button full variant="secondary" icon={<ShieldCheck size={15} />} onClick={() => nav('/settings/privacy')}>{t('공개 범위')}</Button>
          </div>
        </section>


        <SeatWatchCard />

        <section className="card p-5">
          <div className="flex items-center justify-between mb-2"><h2 className="font-display text-[20px] font-bold text-primary flex items-center gap-2"><CalendarCheck size={18} />{lang === 'en' ? 'Upcoming Hangouts' : '다가오는 약속'}</h2><button onClick={() => nav('/plans')} className="text-[13px] font-semibold text-verify">{t('전체')} ({upcoming.length + openPolls})</button></div>
          {upcoming.length === 0 && openPolls === 0 ? <p className="text-[13px] text-ink-3">{t('확정된 약속이 없어요.')}</p> : (
            <div className="divide-y divide-line">
              {upcoming.slice(0, 3).map((a) => { const pending = participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'pending'); return (
                <button key={a.id} onClick={() => nav(`/activities/${a.id}`)} className="w-full flex items-center gap-3 py-3 text-left press">
                  <span className="h-10 w-10 rounded-full bg-surface-2 grid place-items-center text-primary"><CalendarCheck size={17} /></span>
                  <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-primary truncate">{a.title}</span><span className="block text-[12px] text-ink-3">{formatDateTime(a.date, a.startTime)}</span></span>
                  <Tag tone={pending ? 'neutral' : 'primary'} className="h-6 rounded-full">{pending ? t('대기') : lang === 'en' ? 'Confirmed' : '확정'}</Tag>
                </button>
              ); })}
            </div>
          )}
        </section>

        <div className="card divide-y divide-line">
          {[
            { icon: <Users size={18} />, label: t('친구'), sub: `${friends}${t('명')}`, to: '/profile/friends' },
            { icon: <CalendarCheck size={18} />, label: lang === 'en' ? 'My Plans' : '내 약속', sub: openPolls ? `${t('시간 정하는 중')} ${openPolls}` : t('초대·대기·확정'), to: '/plans' },
            { icon: <Bookmark size={18} />, label: t('저장·지원 내역'), sub: `${saved}${t('개')}`, to: '/community?tab=opportunities&sub=saved' },
            { icon: <Car size={18} />, label: 'My rides', sub: myRides ? `${myRides} upcoming` : 'Airports, groceries, SF, Tahoe', to: '/rides?mine=1' },
            { icon: <Building2 size={18} />, label: t('가입한 단체'), sub: `${myOrgs}${t('개')}`, to: '/community?tab=opportunities&sub=clubs&kind=mine' },
          ].map((r) => (
            <button key={r.label} onClick={() => nav(r.to)} className="w-full flex items-center gap-3 px-4 py-3 text-left press">
              <span className="h-10 w-10 rounded-full bg-surface-2 grid place-items-center text-primary">{r.icon}</span>
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-primary">{r.label}</span><span className="block text-[12px] text-ink-3 truncate">{r.sub}</span></span>
              <ChevronRight size={18} className="text-ink-3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
