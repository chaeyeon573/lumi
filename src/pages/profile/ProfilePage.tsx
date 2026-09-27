import { useNavigate } from 'react-router-dom';
import { Settings, Pencil, ShieldCheck, CalendarDays, ChevronRight, Users, CalendarCheck, Bookmark, Building2, FileText, Bell, MapPin, Briefcase, Sparkles, GraduationCap, Quote, Target, MessageSquareText, BookmarkCheck, Coffee } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar, Button, CardSkeleton, ErrorState, Tag } from '@/components/ui';
import { PostCard } from '@/components/cards/PostCard';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { StatusPills } from '@/components/people_StatusPill';
import { activeStatuses } from '@core/lib/status';
import { AUDIENCE_LABELS, privacyOf } from '@core/lib/privacy';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { INTEREST_LABELS, INTEREST_EMOJI } from '@core/lib/labels';
import { friendsOf } from '@core/lib/relations';
import { isStudentStage, isAlumniStage, isGradStage, majorOf, cityOf, contextLine, classYearLabel, yy, shouldSuggestStatusUpdate, stageLabel, stageOf, gradYearOf } from '@core/lib/network';
import { PEOPLE_WANT_LABELS, PEOPLE_WANT_EMOJI, ACTIVITY_WANT_LABELS, ACTIVITY_WANT_EMOJI, hasWants } from '@core/lib/wants';
import { todayISO, formatDateTime } from '@core/lib/format';
import { DAY_LABELS, toMin, statusNow, freeBlocks, todayIdx, nowMin, fmtBlock, toHHMM } from '@core/lib/timetable';
import { profileCompletion, questionById } from '@core/data/prompts';
import { cn } from '@core/lib/cn';
import type { User } from '@core/types';

const H0 = 9, H1 = 18, PX = 26;

/** 헤더 두 번째 줄 — 학생: "경영학과 · '25 졸업 예정" / 석·박사: "컴퓨터과학과 · 석사 과정" / 졸업생: "2018 졸업 · 서울 · AI / Product" */
function headerLine(me: User): string {
  if (isAlumniStage(me)) return contextLine(me, lang);
  const major = majorOf(me);
  const stagePart = isGradStage(me) || !me.gradYear ? classYearLabel(me, lang) : lang === 'en' ? `Class of ${yy(me.gradYear)}` : `${yy(me.gradYear)} 졸업 예정`;
  return [major, stagePart].filter(Boolean).join(' · ');
}

function SectionTitle({ icon, children, right }: { icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="flex items-center justify-between"><h2 className="font-display text-[18px] font-bold text-primary flex items-center gap-2">{icon}{children}</h2>{right}</div>;
}
function EditLink({ to, label }: { to: string; label?: string }) {
  const nav = useNavigate();
  return <button onClick={() => nav(to)} className="h-8 px-3 rounded-full bg-surface-2 text-[12px] font-bold text-primary flex items-center gap-1 press"><Pencil size={12} />{label ?? t('편집')}</button>;
}

/** 나 — 헤더 · 현재 · 관심사 · 추천 설정 · 시간표(재학생) · 카운트 · 상태 변경 · 다가오는 만남 · 더 알려주기 · 내 글 (Pastel Breeze) */
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
  if (status === 'loading' || !me) return <div><AppHeader /><CardSkeleton count={3} /></div>;
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
  const alumni = isAlumniStage(me);
  const suggest = shouldSuggestStatusUpdate(me);
  const wants = me.wants;
  const homeCity = cityOf(me);
  const myStatus = activeStatuses(me).length > 0;
  const savedPeople = (me.savedPeople ?? []).filter((id) => v.visibleUsers.some((u) => u.id === id)).length;
  const scrollToPosts = () => document.getElementById('my-posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const nowRows: { icon: React.ReactNode; l: string; v?: string }[] = [
    { icon: <MapPin size={15} />, l: t('거주 도시'), v: homeCity },
    { icon: <MapPin size={15} />, l: t('활동 지역'), v: me.activityCity },
  ];
  if (alumni) nowRows.push({ icon: <Briefcase size={15} />, l: t('회사'), v: me.career?.company }, { icon: <Briefcase size={15} />, l: t('업종'), v: me.career?.industry }, { icon: <Briefcase size={15} />, l: t('직무'), v: me.career?.role });
  const nowFilled = nowRows.filter((r) => r.v);

  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader right={<button onClick={() => nav('/settings')} aria-label={t('설정')} className="h-11 w-11 rounded-full grid place-items-center text-ink-2"><Settings size={21} /></button>} />
      <div className="px-4 space-y-4">
        {/* ── 헤더: 사진 · 이름 · 학교 배지 · 전공 · 졸업(예정) ── */}
        <section className="card p-5">
          <div className="flex items-center gap-4">
            <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={72} />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-[24px] font-bold text-primary leading-tight truncate flex items-center gap-2">{me.nickname}{me.plan === 'plus' && <span className="h-5 px-2 rounded-full bg-primary text-white text-[10px] font-extrabold grid place-items-center">PLUS</span>}</h1>
              {me.affiliation.type === 'university' && <SchoolBadge user={me} className="mt-0.5 max-w-full" />}
              <div className="text-[13px] text-ink-2 leading-snug truncate">{headerLine(me)}</div>
            </div>
          </div>
          {goTo?.answer && (
            <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3">
              <div className="text-[11px] font-bold tracking-wide text-verify uppercase flex items-center gap-1"><Quote size={11} />{questionById(goTo.questionId)?.text}</div>
              <p className="mt-1 text-[14px] text-ink-2 italic">“{goTo.answer}”</p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button full icon={<Pencil size={15} />} onClick={() => nav('/profile/edit')}>{t('프로필 편집')}</Button>
            <Button full variant="secondary" icon={<ShieldCheck size={15} />} onClick={() => nav('/settings/privacy')}>{t('공개 범위')}</Button>
          </div>
        </section>

        {/* ── Open To: "☕ 이번 주 커피 가능" — 기간이 지나면 자동으로 꺼진다. 크게 내걸지 않고 한 줄 ── */}
        <button onClick={() => nav('/profile/open-to')} className="card w-full p-4 flex items-center gap-3 text-left press">
          <span className="h-10 w-10 rounded-full bg-accent-soft grid place-items-center text-primary shrink-0"><Coffee size={18} /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-[12px] font-bold text-ink-3">Open To · {t('지금 상태')}</span>
            {myStatus ? <StatusPills user={me} className="mt-1" /> : <span className="block text-[14px] text-ink-2">{t('상태 없음')}</span>}
          </span>
          <span className="text-[13px] font-bold text-verify shrink-0">{myStatus ? t('바꾸기') : t('켜기')}</span>
        </button>

        {/* ── 현재: 거주 도시 · 활동 지역 · (졸업생) 회사 · 업종 · 직무 ── */}
        <section className="card p-5">
          <SectionTitle icon={<MapPin size={17} />} right={<EditLink to="/profile/edit" />}>{t('현재')}</SectionTitle>
          {nowFilled.length === 0 ? (
            <p className="mt-2 text-[13px] text-ink-3">{alumni ? t('거주 도시와 하는 일을 알려주면 같은 도시·분야의 동문과 더 잘 연결돼요.') : t('거주 도시를 알려주면 같은 지역 사람과 모임이 먼저 보여요.')}</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {nowFilled.map((r) => (
                <div key={r.l} className="rounded-2xl bg-surface-2 px-3.5 py-2.5"><div className="text-[11px] text-ink-3 flex items-center gap-1">{r.icon}{r.l}</div><div className="text-[14px] font-semibold text-ink truncate">{r.v}</div></div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-ink-3">{t('도시 단위만 표시돼요. 정확한 주소는 받지 않아요.')}</p>
        </section>

        {/* ── 관심사 ── */}
        <section className="card p-5">
          <SectionTitle icon={<Sparkles size={17} />} right={<EditLink to="/profile/edit" />}>{t('관심사')}</SectionTitle>
          {me.interests.length === 0 ? (
            <p className="mt-2 text-[13px] text-ink-3">{t('관심사를 고르면 비슷한 사람과 모임을 먼저 추천해요.')}</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">{me.interests.slice(0, 8).map((i) => <span key={i} className="h-7 px-3 rounded-full bg-accent-soft text-primary text-[12px] font-semibold flex items-center gap-1">{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</span>)}</div>
          )}
        </section>

        {/* ── 추천 설정 — 나만 보는 추천 기준 (프로필 앞면에 크게 내걸지 않는다) ── */}
        <section className="card p-5">
          <SectionTitle icon={<Target size={17} />} right={<EditLink to="/profile/wants" />}>{t('추천 설정')}</SectionTitle>
          <p className="mt-0.5 text-[12px] text-ink-3">{t('나만 보여요 · 추천에만 쓰여요')}</p>
          {!hasWants(wants) ? (
            <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-4 text-center">
              <p className="text-[13px] text-ink-2">{t('어떤 사람을 만나고, 무엇을 하고 싶은지 알려주세요.')}</p>
              <Button size="sm" className="mt-3" onClick={() => nav('/profile/wants')}>{t('설정하기')}</Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-[11px] font-bold tracking-wide text-ink-3 uppercase mb-1.5">{t('찾는 사람')}</div>
                <div className="flex flex-wrap gap-1.5">{(wants?.people ?? []).map((p) => <span key={p} className="h-7 px-3 rounded-full bg-primary-soft text-primary text-[12px] font-semibold flex items-center gap-1">{PEOPLE_WANT_EMOJI[p]} {PEOPLE_WANT_LABELS[p]}</span>)}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-wide text-ink-3 uppercase mb-1.5">{t('하고 싶은 활동')}</div>
                <div className="flex flex-wrap gap-1.5">{(wants?.activities ?? []).map((a) => <span key={a} className="h-7 px-3 rounded-full bg-accent-soft text-primary text-[12px] font-semibold flex items-center gap-1">{ACTIVITY_WANT_EMOJI[a]} {ACTIVITY_WANT_LABELS[a]}</span>)}</div>
              </div>
            </div>
          )}
        </section>

        {/* ── 이번 주 시간표 (재학생·대학원생) ── */}
        {student && (
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[18px] font-bold text-primary flex items-center gap-2"><CalendarDays size={17} />{t('이번 주 시간표')}</h2>
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
        )}

        {/* ── 카운트: 그룹 · 연결 · 모임 · 글 ── */}
        <section className="card px-2 py-3 grid grid-cols-4 text-center">
          {[
            { n: myOrgs, l: t('그룹'), go: () => nav('/profile/groups') },
            { n: friends, l: t('연결'), go: () => nav('/profile/friends') },
            { n: meets, l: t('모임'), go: () => nav('/plans') },
            { n: myPosts.length, l: t('글'), go: scrollToPosts },
          ].map((s) => (
            <button key={s.l} onClick={s.go} className="py-1 press"><div className="font-display text-[22px] font-bold text-primary">{s.n}</div><div className="text-[12px] text-ink-3">{s.l}</div></button>
          ))}
        </section>

        {/* ── 현재 상태가 바뀌었나요? (학생) / 상태: 졸업생 · 변경 (졸업생) ── */}
        {student ? (
          <button onClick={() => nav('/profile/status')} className={cn('card w-full text-left p-4 flex items-center gap-3 press', suggest && 'ring-1 ring-gold/40')} style={suggest ? { background: 'linear-gradient(120deg, #FFF1C9, #FFFFFF)' } : undefined}>
            <span className={cn('h-11 w-11 rounded-full grid place-items-center shrink-0', suggest ? 'bg-gold-soft text-[#B57A0E]' : 'bg-primary-soft text-primary')}><GraduationCap size={20} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold text-primary">{t('현재 상태가 바뀌었나요?')}</span>
              <span className="block text-[12px] text-ink-2">{suggest ? t('졸업 예정연도가 지났어요. 졸업생으로 바꾸면 홈과 추천이 달라져요.') : t('졸업·대학원 진학 — 연결과 기록은 그대로 유지돼요')}</span>
            </span>
            <ChevronRight size={18} className="text-ink-3 shrink-0" />
          </button>
        ) : (
          <button onClick={() => nav('/profile/status')} className="w-full flex items-center justify-center gap-1.5 text-[12px] text-ink-3 press">
            <GraduationCap size={13} /><span>{t('상태')}: {stageLabel(stageOf(me), lang)}{gradYearOf(me) ? ` · ${gradYearOf(me)}` : ''}</span><span className="font-bold text-verify">· {t('변경')}</span>
          </button>
        )}

        {/* ── 다가오는 만남 ── */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-2"><h2 className="font-display text-[18px] font-bold text-primary flex items-center gap-2"><CalendarCheck size={17} />{t('다가오는 만남')}</h2><button onClick={() => nav('/plans')} className="text-[13px] font-semibold text-verify">{t('전체')} ({upcoming.length + openPolls})</button></div>
          {upcoming.length === 0 && openPolls === 0 ? (
            <div className="text-center py-3">
              <p className="text-[13px] text-ink-3">{t('확정된 약속이 없어요.')}</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => nav('/meet')}>{t('모임 둘러보기')}</Button>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {upcoming.slice(0, 3).map((a) => { const pending = participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'pending'); return (
                <button key={a.id} onClick={() => nav(`/activities/${a.id}`)} className="w-full flex items-center gap-3 py-3 text-left press">
                  <span className="h-10 w-10 rounded-full bg-surface-2 grid place-items-center text-primary"><CalendarCheck size={17} /></span>
                  <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-primary truncate">{a.title}</span><span className="block text-[12px] text-ink-3">{formatDateTime(a.date, a.startTime)}</span></span>
                  <Tag tone={pending ? 'neutral' : 'primary'} className="h-6 rounded-full">{pending ? t('대기') : lang === 'en' ? 'Confirmed' : '확정'}</Tag>
                </button>
              ); })}
              {upcoming.length === 0 && openPolls > 0 && <p className="py-3 text-[13px] text-ink-3">{t('시간 정하는 중')} {openPolls}</p>}
            </div>
          )}
        </section>

        {/* ── 더 알려주기 ── */}
        <section className="space-y-2">
          <div className="px-1"><h2 className="font-display text-[18px] font-bold text-primary">{t('더 알려주기')}</h2></div>
          <div className="card divide-y divide-line">
            {[
              { icon: <MessageSquareText size={18} />, label: t('프로필 질문'), sub: `${t('프로필 완성')} ${completion.percent}%`, go: () => nav('/profile/prompts') },
              { icon: <BookmarkCheck size={18} />, label: `${t('저장한 사람')} ${savedPeople}`, sub: t('나만 볼 수 있어요'), go: () => nav('/profile/saved') },
              { icon: <ShieldCheck size={18} />, label: t('공개 범위'), sub: AUDIENCE_LABELS[privacyOf(me).scope], go: () => nav('/settings/privacy') },
              { icon: <Target size={18} />, label: t('목표와 역할'), sub: t('이번 학기 목표 · 생활권 · 찾는 역할'), go: () => nav('/profile/context') },
              { icon: <Building2 size={18} />, label: t('내 그룹'), sub: `${myOrgs}${t('개')}`, go: () => nav('/profile/groups') },
              { icon: <Users size={18} />, label: t('내 연결'), sub: `${friends}${t('명')}`, go: () => nav('/profile/friends') },
              { icon: <Bookmark size={18} />, label: t('저장·지원 내역'), sub: `${saved}${t('개')}`, go: () => nav('/community?tab=opportunities&sub=saved') },
              { icon: <Bell size={18} />, label: t('알림'), sub: unread ? `${unread}${t('개')}` : t('모두 확인했어요'), go: () => nav('/notifications') },
            ].map((r) => (
              <button key={r.label} onClick={r.go} className="w-full flex items-center gap-3 px-4 py-3 text-left press">
                <span className="h-10 w-10 rounded-full bg-surface-2 grid place-items-center text-primary">{r.icon}</span>
                <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-primary">{r.label}</span><span className="block text-[12px] text-ink-3 truncate">{r.sub}</span></span>
                <ChevronRight size={18} className="text-ink-3" />
              </button>
            ))}
          </div>
        </section>

        {/* ── 내 글 ── */}
        <section id="my-posts" className="scroll-mt-20 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-[18px] font-bold text-primary flex items-center gap-2"><FileText size={17} />{t('내 글')}</h2>
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
