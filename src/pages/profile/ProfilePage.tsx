import { useNavigate } from 'react-router-dom';
import { Settings, Pencil, ShieldCheck, BadgeCheck, CalendarDays, ChevronRight, Users, CalendarCheck, Bookmark, MessageCircle, Building2, Quote, Briefcase, FileText, Bell } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar, Button, CardSkeleton, ErrorState, Tag } from '@/components/ui';
import { PostCard } from '@/components/cards/PostCard';
import { OpenToPills } from '@/components/profile_OpenToChips';
import { careerLine } from '@/components/profile_CareerFields';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { INTEREST_LABELS } from '@core/lib/labels';
import { friendsOf } from '@core/lib/relations';
import { networkLabel, stageOf, isStudentStage, STAGE_LABELS_KO, STAGE_LABELS_EN } from '@core/lib/network';
import { todayISO, formatDateTime } from '@core/lib/format';
import { DAY_LABELS, toMin, statusNow, freeBlocks, todayIdx, nowMin, fmtBlock, toHHMM } from '@core/lib/timetable';
import { profileCompletion, questionById } from '@core/data/prompts';
import { cn } from '@core/lib/cn';

const H0 = 9, H1 = 18, PX = 26;

/** 나 — 프로필 카드 · 시간표(재학생) / 경력(졸업생) · 다가오는 만남 · 내 글 (Pastel Breeze) */
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
  const posts = useAppStore((s) => s.posts);
  const notifications = useAppStore((s) => s.notifications);
  const me = v.me;
  if (status === 'loading') return <div><AppHeader /><CardSkeleton count={2} /></div>;
  if (status === 'error') return <div><AppHeader /><ErrorState message={error ?? undefined} onRetry={init} /></div>;

  const friends = friendsOf(v.snap, me.id).length;
  const today = todayISO();
  const upcoming = activities.filter((a) => a.date >= today && (a.hostId === me.id || participations.some((p) => p.activityId === a.id && p.userId === me.id && (p.status === 'approved' || p.status === 'pending')))).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const meets = activities.filter((a) => participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'approved')).length + activities.filter((a) => a.hostId === me.id).length;
  const completion = profileCompletion(me);
  const goTo = me.prompts[0];
  const now = statusNow(me.timetable);
  const nextFree = freeBlocks(me.timetable, todayIdx()).find((b) => b.end > nowMin());
  const days = [0, 1, 2, 3, 4];
  const openPolls = polls.filter((p) => p.status === 'open' && (p.hostId === me.id || p.inviteeIds.includes(me.id))).length;
  const saved = intents.filter((i) => i.userId === me.id && (i.saved || i.intent === 'applied')).length;
  const myOrgs = orgs.filter((o) => o.memberIds.includes(me.id) || o.adminIds.includes(me.id) || o.followerIds.includes(me.id)).length;
  const myPosts = posts.filter((p) => p.authorId === me.id && p.authorType === 'user').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = notifications.filter((n) => n.userId === me.id && !n.read).length;
  const student = isStudentStage(me);
  const stageLabel = (lang === 'en' ? STAGE_LABELS_EN : STAGE_LABELS_KO)[stageOf(me)];
  const dept = me.affiliation.type === 'university' ? me.affiliation.department : me.affiliation.jobTitle ?? '';
  const city = me.career?.city ?? me.region;
  const headline = [networkLabel(me, lang), stageLabel, dept, city].filter(Boolean).join(' · ');
  const career = careerLine(me.career);
  const scrollToPosts = () => document.getElementById('my-posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader right={<button onClick={() => nav('/settings')} aria-label={t('설정')} className="h-11 w-11 rounded-full grid place-items-center text-ink-2"><Settings size={21} /></button>} />
      <div className="px-4 space-y-4">
        <section className="card p-5">
          <div className="flex items-center gap-4">
            <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={72} />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-[24px] font-bold text-primary leading-tight truncate flex items-center gap-2">{me.nickname}{me.plan === 'plus' && <span className="h-5 px-2 rounded-full bg-primary text-white text-[10px] font-extrabold grid place-items-center">PLUS</span>}</h1>
              <div className="text-[13px] text-ink-2 leading-snug">{headline}</div>
              {me.affiliation.type === 'university' && me.affiliation.emailVerified && <span className="mt-1.5 inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-accent-soft border border-accent text-primary text-[11px] font-bold"><BadgeCheck size={12} />{lang === 'en' ? 'Campus verified' : '학교 인증'}</span>}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 text-center">
            {[{ n: friends, l: t('내 연결'), to: '/profile/friends' }, { n: meets, l: t('내 만남'), to: '/plans' }, { n: `${completion.percent}%`, l: lang === 'en' ? 'Profile' : '프로필 완성', to: '/profile/prompts' }].map((s) => (
              <button key={s.l} onClick={() => nav(s.to)} className="py-1"><div className="font-display text-[22px] font-bold text-primary">{s.n}</div><div className="text-[12px] text-ink-3">{s.l}</div></button>
            ))}
          </div>
          {goTo?.answer && (
            <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3">
              <div className="text-[11px] font-bold tracking-wide text-verify uppercase flex items-center gap-1"><Quote size={11} />{questionById(goTo.questionId)?.text}</div>
              <p className="mt-1 text-[14px] text-ink-2 italic">“{goTo.answer}”</p>
            </div>
          )}
          {me.interests.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-bold tracking-wide text-ink-3 uppercase mb-1.5">{t('관심사')}</div>
              <div className="flex flex-wrap gap-1.5">{me.interests.slice(0, 5).map((i) => <span key={i} className="h-7 px-3 rounded-full bg-accent-soft text-primary text-[12px] font-semibold flex items-center">#{INTEREST_LABELS[i]}</span>)}</div>
            </div>
          )}
          {(me.openTo?.length ?? 0) > 0 && (
            <div className="mt-3">
              <div className="text-[11px] font-bold tracking-wide text-ink-3 uppercase mb-1.5">{t('열려 있어요')}</div>
              <OpenToPills value={me.openTo ?? []} />
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button full icon={<Pencil size={15} />} onClick={() => nav('/profile/edit')}>{t('프로필 편집')}</Button>
            <Button full variant="secondary" icon={<ShieldCheck size={15} />} onClick={() => nav('/settings/privacy')}>{t('공개 범위')}</Button>
          </div>
        </section>

        {student ? (
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[20px] font-bold text-primary flex items-center gap-2"><CalendarDays size={18} />{lang === 'en' ? 'Weekly Schedule' : '내 시간표'}</h2>
              {me.timetable.length > 0 && <span className={cn('h-7 px-3 rounded-full text-[11px] font-bold flex items-center gap-1', now.kind === 'free' ? 'bg-mint-soft text-mint' : 'bg-surface-2 text-ink-2')}><span className={cn('h-1.5 w-1.5 rounded-full', now.kind === 'free' ? 'bg-mint' : 'bg-ink-3')} />{now.kind === 'free' ? (now.until ? `${t('공강')} · ${toHHMM(now.until)}` : t('오늘 수업 없음')) : now.kind === 'in_class' ? t('수업 중') : t('오늘 수업 끝')}</span>}
            </div>
            {me.timetable.length === 0 ? (
              <Button full variant="secondary" className="mt-4" onClick={() => nav('/timetable')}>{t('시간표 만들기')}</Button>
            ) : (
              <>
                <button onClick={() => nav('/timetable')} className="mt-3 w-full text-left">
                  <div className="grid text-center text-[11px] font-semibold text-ink-3" style={{ gridTemplateColumns: `20px repeat(${days.length}, 1fr)` }}><span />{days.map((d) => <span key={d} className={cn(d === todayIdx() && 'text-primary')}>{DAY_LABELS[d]}</span>)}</div>
                  <div className="grid mt-1" style={{ gridTemplateColumns: `20px repeat(${days.length}, 1fr)`, height: (H1 - H0) * PX }}>
                    <div className="relative">{Array.from({ length: H1 - H0 }, (_, i) => <span key={i} className="absolute text-[9px] text-ink-3" style={{ top: i * PX }}>{H0 + i}</span>)}</div>
                    {days.map((d) => (
                      <div key={d} className={cn('relative border-l border-line/60', d === todayIdx() && 'bg-accent-soft/40')}>
                        {me.timetable.filter((c) => c.day === d).map((c) => (
                          <div key={c.id} className="absolute left-0.5 right-0.5 rounded-lg bg-primary-soft text-primary px-1 overflow-hidden" style={{ top: Math.max(0, (toMin(c.start) - H0 * 60) / 60 * PX), height: Math.max(14, (toMin(c.end) - toMin(c.start)) / 60 * PX - 2) }}>
                            <div className="text-[9px] font-bold leading-tight truncate">{c.name}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </button>
                {nextFree && <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-2"><span className="text-verify">★</span><span className="flex-1 truncate">{lang === 'en' ? `Next free window ${fmtBlock({ start: Math.max(nextFree.start, nowMin()), end: nextFree.end })}` : `다음 공강 ${fmtBlock({ start: Math.max(nextFree.start, nowMin()), end: nextFree.end })}`}</span><Button size="sm" onClick={() => nav('/timetable?open=1')}>{t('열기')}</Button></div>}
              </>
            )}
          </section>
        ) : (
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[20px] font-bold text-primary flex items-center gap-2"><Briefcase size={18} />{t('경력')}</h2>
              <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => nav('/profile/edit')}>{t('편집')}</Button>
            </div>
            {career ? (
              <>
                <p className="mt-2 text-[14px] font-semibold text-primary">{career}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[{ l: t('도시'), v: me.career?.city }, { l: t('회사'), v: me.career?.company }, { l: t('업종'), v: me.career?.industry }, { l: t('역할'), v: me.career?.role }].filter((x) => x.v).map((x) => (
                    <div key={x.l} className="rounded-2xl bg-surface-2 px-3.5 py-2.5"><div className="text-[11px] text-ink-3">{x.l}</div><div className="text-[14px] font-semibold text-ink truncate">{x.v}</div></div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-[13px] text-ink-3">{t('도시·회사·업종·역할을 추가하면 졸업생 네트워크에서 더 잘 보여요.')}</p>
            )}
          </section>
        )}

        <section className="card p-5">
          <div className="flex items-center justify-between mb-2"><h2 className="font-display text-[20px] font-bold text-primary flex items-center gap-2"><CalendarCheck size={18} />{t('다가오는 만남')}</h2><button onClick={() => nav('/plans')} className="text-[13px] font-semibold text-verify">{t('전체')} ({upcoming.length + openPolls})</button></div>
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
            { icon: <Building2 size={18} />, label: t('내 그룹'), sub: `${myOrgs}${t('개')}`, go: () => nav('/profile/groups') },
            { icon: <CalendarCheck size={18} />, label: t('내 만남'), sub: openPolls ? `${t('시간 정하는 중')} ${openPolls}` : t('초대·대기·확정'), go: () => nav('/plans') },
            { icon: <Users size={18} />, label: t('내 연결'), sub: `${friends}${t('명')}`, go: () => nav('/profile/friends') },
            { icon: <FileText size={18} />, label: t('내 글'), sub: `${myPosts.length}${t('개')}`, go: scrollToPosts },
            { icon: <Bookmark size={18} />, label: t('저장·지원 내역'), sub: `${saved}${t('개')}`, go: () => nav('/community?tab=opportunities&sub=saved') },
            { icon: <MessageCircle size={18} />, label: t('채팅'), sub: t('개인·활동·조직 대화'), go: () => nav('/chats') },
            { icon: <Bell size={18} />, label: t('알림'), sub: unread ? `${unread}${t('개')}` : t('모두 확인했어요'), go: () => nav('/notifications') },
          ].map((r) => (
            <button key={r.label} onClick={r.go} className="w-full flex items-center gap-3 px-4 py-3 text-left press">
              <span className="h-10 w-10 rounded-full bg-surface-2 grid place-items-center text-primary">{r.icon}</span>
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-primary">{r.label}</span><span className="block text-[12px] text-ink-3 truncate">{r.sub}</span></span>
              <ChevronRight size={18} className="text-ink-3" />
            </button>
          ))}
        </div>

        <section id="my-posts" className="scroll-mt-20 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-[20px] font-bold text-primary flex items-center gap-2"><FileText size={18} />{t('내 글')}</h2>
            <button onClick={() => nav('/feed?tab=following')} className="text-[13px] font-semibold text-verify">{t('전체 보기')}</button>
          </div>
          {myPosts.length === 0 ? (
            <div className="card p-5 text-center">
              <p className="text-[13px] text-ink-3">{t('아직 글이 없어요')}</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => nav('/create/post')}>{t('첫 글 쓰기')}</Button>
            </div>
          ) : myPosts.slice(0, 3).map((p) => <PostCard key={p.id} post={p} />)}
        </section>
      </div>
    </div>
  );
}
