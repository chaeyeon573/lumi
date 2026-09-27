import { useEffect, useState } from 'react';
import { t, lang } from '@core/i18n';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { UserMinus, MessageCircle, MoreHorizontal, Clock, MapPin, Flag, Ban, Sparkles, Users, CalendarPlus, Lock, Mic, Briefcase, X, EyeOff, ChevronRight } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, VerifiedBadge, Tag, Button, BottomSheet, Dialog, Textarea, Input, Chip, Cover, EmptyState, VisibilityTag, PrivacyNote, Section, SectionEmpty, SectionSkeleton } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { ActivityCard } from '@/components/cards/ActivityCard';
import { useViewer } from '@/hooks/useViewer';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { ReasonChips } from '@/components/people_ReasonChips';
import { ActionBar } from '@/components/people_ActionBar';
import { SmallTables } from '@/components/people_SmallTables';
import { StatusPills } from '@/components/people_StatusPill';
import { maskedCity, maskedPersonLine } from '@/components/people_view';
import { useSectionState } from '@/hooks/useSectionState';
import { profileView, connectionStatus, CONNECTION_LABELS, canShowInPath } from '@core/lib/privacy';
import { degreeOf, pathBetween } from '@core/lib/graph';
import { isAlumniStage } from '@core/lib/network';
import { PEOPLE_WANT_LABELS, ACTIVITY_WANT_LABELS, PEOPLE_WANT_EMOJI, ACTIVITY_WANT_EMOJI, hasWants } from '@core/lib/wants';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { INTEREST_EMOJI, INTEREST_LABELS, PURPOSE_LABELS, ALL_CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABELS, CATEGORY_COLORS } from '@core/lib/labels';
import { commonInterests, mutualFriends } from '@core/lib/relations';
import { todayISO } from '@core/lib/format';
import type { ActivityCategory } from '@core/types';
import { cn } from '@core/lib/cn';
import { assetUrl } from '@/lib/assets';
import type { User } from '@core/types';
import { PromptAnswerCard, VoicePlayer, PollCard } from '@/components/prompts/PromptComponents';
import { questionById } from '@core/data/prompts';
import { availabilityText, freeBlocks, todayIdx, fmtBlock, overlapBlocks } from '@core/lib/timetable';
import { matchReasons, shareableReasons } from '@core/lib/recommend';
import { GOAL_EMOJI, GOAL_LABELS, PERSON_ROLE_LABELS, RESIDENCE_LABELS } from '@core/lib/labels';

export function PersonPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const orgs = useAppStore((s) => s.organizations);
  const proposals = useAppStore((s) => s.proposals);
  const user = v.userById(id!);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [propose, setPropose] = useState(params.get('propose') === '1');
  const [pCat, setPCat] = useState<ActivityCategory>((params.get('cat') as ActivityCategory) || 'coffee');
  const oppsAll = useAppStore((s) => s.opportunities);
  const oppRef = params.get('opp') ? oppsAll.find((o) => o.id === params.get('opp')) : undefined;
  const [pMsg, setPMsg] = useState(oppRef ? (lang === 'en' ? `Want to go to ${oppRef.title} together?` : `${oppRef.title} 같이 갈래요?`) : '');
  const [pWhen, setPWhen] = useState(`${todayISO()} 18:00`);
  const [busy, setBusy] = useState(false);
  const [mutualOpen, setMutualOpen] = useState(false);
  const sec = useSectionState(`person-${id}`);
  useEffect(() => { if (params.get('propose')) setParams({}, { replace: true }); }, [params, setParams]);

  if (user && user.id === v.me.id) return <Navigate to="/profile" replace />;
  const gone = <div className="min-h-full"><TopBar back title={t('프로필')} /><EmptyState emoji="🫥" title={t('없거나 비활성화된 계정이에요')} description={t('링크가 오래됐거나 계정이 닫혔을 수 있어요.')} action={<Button size="sm" variant="secondary" onClick={() => nav('/people')}>{t('사람 찾아보기')}</Button>} /></div>;
  if (!user) return gone;
  if (v.hasBlocked(user.id)) return <div className="min-h-full"><TopBar back title={t('프로필')} /><EmptyState emoji="🚫" title={t('차단한 사용자예요')} description={t('차단을 해제하면 프로필을 다시 볼 수 있어요.')} action={<Button variant="outline" onClick={() => run(() => api.relationships.unblock(v.me.id, user.id), t('차단을 해제했어요.'))}>{t('차단 해제')}</Button>} /></div>;
  if (v.isBlocked(user.id)) return gone;

  const friend = v.isFriend(user.id);
  const outReq = v.pendingOut(user.id);
  const inReq = v.pendingIn(user.id);
  const msg = v.canMessage(user.id);
  const common = commonInterests(v.me, user);
  const mutualF = mutualFriends(v.snap, v.me.id, user.id);
  const mutualUsers = mutualF.map((m) => v.userById(m)).filter((u): u is User => !!u);
  const mutualShown = mutualUsers.filter(canShowInPath);
  const mutualHidden = mutualUsers.length - mutualShown.length;
  const view = profileView(v.snap, v.me, user);
  const cstatus = connectionStatus(v.snap, v.me, user);
  const degree = friend ? 1 : degreeOf(v.snap, v.me.id, user.id, 3);
  const path = degree && degree >= 2 ? pathBetween(v.snap, v.me.id, user.id, 3).map((pid) => v.userById(pid)) : [];
  const commonGroups = view.groups ? orgs.filter((o) => { const has = (uid: string) => o.memberIds.includes(uid) || o.adminIds.includes(uid); return has(v.me.id) && has(user.id); }) : [];
  const sameMeets = v.visibleActivities.filter((a) => { const inIt = (uid: string) => a.hostId === uid || v.snap.participations.some((p) => p.activityId === a.id && p.userId === uid && p.status === 'approved'); return inIt(v.me.id) && inIt(user.id); }).slice(0, 3);
  const overlapEmpty = mutualUsers.length === 0 && commonGroups.length === 0 && common.length === 0 && sameMeets.length === 0;
  const see = (f: Parameters<typeof v.canSeeField>[1]) => v.canSeeField(user, f);
  const upcoming = v.visibleActivities.filter((a) => a.visibility === 'public' && a.date >= todayISO() && (a.hostId === user.id || v.snap.participations.some((p) => p.activityId === a.id && p.userId === user.id && p.status === 'approved')));
  const hosting = v.visibleActivities.filter((a) => a.hostId === user.id && a.date >= todayISO());
  const userPosts = v.visiblePosts.filter((p) => p.authorId === user.id && p.authorType === 'user' && !p.anonymous);
  const taggedPosts = v.visiblePosts.filter((p) => p.authorId !== user.id && (p.taggedUserIds ?? []).includes(user.id) && (p.tagApprovedIds ?? []).includes(user.id) && p.media.length > 0);
  const together = params.get('tab') === 'together';
  const sharedOpps = v.snap.opportunityIntents.filter((i) => i.userId === user.id).map((i) => oppsAll.find((o) => o.id === i.opportunityId)).filter((o): o is NonNullable<typeof o> => !!o && o.date !== undefined && o.date >= todayISO());
  const adminOrgs = view.groups ? orgs.filter((o) => o.adminIds.includes(user.id)) : [];
  const pendingProposal = proposals.find((p) => p.fromId === v.me.id && p.toId === user.id && p.status === 'pending');
  const reasons = shareableReasons(matchReasons(v.me, user, v.snap, see('timetable')));
  const city = maskedCity(user, view);
  const career = isAlumniStage(user) ? [user.career?.role, view.company ? user.career?.company : undefined, user.career?.industry].filter(Boolean).join(' · ') : '';
  const degreeText = degree === 1 ? t('1촌 · 연결된 사이') : degree === 2 ? `${t('2촌')}${mutualUsers.length ? ` · ${t('공통 연결')} ${mutualUsers.length}${t('명')}` : ''}` : degree === 3 ? t('3촌') : t('아직 이어진 연결이 없어요');

  const openChat = async () => {
    if (!msg.ok) { showToast(msg.reason ?? t('아직 메시지를 보낼 수 없어요.'), 'info'); return; }
    try { const res = await run(() => api.chats.openDirect(v.me.id, user.id)); nav(`/chats/${res.room.id}`); } catch { /* toast */ }
  };
  const sendProposal = async () => {
    setBusy(true);
    try { await run(() => api.proposals.create(v.me.id, user.id, { category: pCat, message: pMsg, when: pWhen }), t('활동을 제안했어요. 수락되면 알려드릴게요.')); setPropose(false); } catch { /* */ } finally { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28">
      <TopBar back title="" transparent className="absolute left-0 right-0" right={<button onClick={() => setMenu(true)} className="h-10 w-10 grid place-items-center rounded-full bg-white/80 backdrop-blur" aria-label={t('더보기')}><MoreHorizontal size={20} /></button>} />
      <PhotoHero user={user} />
      <div className="px-4 -mt-8 relative space-y-3">
        {/* 순서: 왜 추천됐나 → 얼마나 가까운가 → 경로 → 이름·프로필 → (아래) 겹치는 것 · 작은 모임 · 행동 */}
        <div className="card p-4">
          <ReasonChips reasons={reasons} max={3} className="mb-2.5" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag tone={cstatus === 'connected' ? 'mint' : cstatus === 'blocked' ? 'danger' : cstatus === 'requested' ? 'gold' : 'primary'}>{CONNECTION_LABELS[cstatus]}</Tag>
            <button type="button" onClick={() => mutualUsers.length && setMutualOpen(true)} className={cn('text-[12px] font-semibold text-verify', mutualUsers.length ? 'press' : 'pointer-events-none')}>{degreeText}</button>
          </div>
          {path.length > 0 && (
            <div className="mt-2 flex items-center gap-1 flex-wrap text-[12px]">
              <span className="h-6 px-2 rounded-full bg-surface-2 font-semibold inline-flex items-center">{t('나')}</span>
              {path.map((pu, i) => <span key={i} className="inline-flex items-center gap-1"><ChevronRight size={12} className="text-ink-3" />{pu && canShowInPath(pu) ? <button onClick={() => nav(`/users/${pu.id}`)} className="h-6 px-2 rounded-full bg-accent-soft text-primary font-semibold inline-flex items-center gap-1 press"><Avatar emoji={pu.avatar.emoji} hue={pu.avatar.hue} url={pu.avatar.url} size={16} />{pu.nickname}</button> : <span className="h-6 px-2 rounded-full bg-surface-2 text-ink-3 inline-flex items-center gap-1"><Lock size={10} />{t('비공개')}</span>}</span>)}
              <ChevronRight size={12} className="text-ink-3" /><span className="h-6 px-2 rounded-full bg-primary text-white font-semibold inline-flex items-center">{user.nickname}</span>
            </div>
          )}
          <h1 className="mt-3 font-display text-[28px] leading-tight font-bold text-ink">{user.nickname}</h1>
          <SchoolBadge user={user} withYear={view.gradYear} size="lg" className="mt-1" />
          <div className="text-[14px] text-ink-2 mt-1">{maskedPersonLine(user, view, lang)}</div>
          {career && <div className="text-[13px] text-ink-2 mt-0.5 flex items-center gap-1"><Briefcase size={13} className="text-ink-3" />{career}</div>}
          {city && <div className="text-[13px] text-ink-3 mt-0.5 flex items-center gap-1"><MapPin size={13} />{city}{user.activityCity && user.activityCity !== city ? ` · ${t('활동')} ${user.activityCity}` : ''}</div>}
          <StatusPills user={user} className="mt-2.5" />
          {user.interests.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{[...common, ...user.interests.filter((i) => !common.includes(i))].map((i) => <span key={i} className={cn('h-7 px-3 rounded-full text-[12px] font-semibold inline-flex items-center', common.includes(i) ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-ink-2')}>{INTEREST_LABELS[i]}</span>)}</div>}
          {user.identityVerified && <div className="mt-3"><VerifiedBadge kind="identity" size={16} label /></div>}
          {!view.full && view.reason && <PrivacyNote text={`${view.reason} · ${t('회사·도시·졸업연도·그룹은 가려져요')}`} className="mt-3" />}
          {inReq && (
            <div className="mt-3 rounded-xl bg-primary-soft px-3 py-2.5 flex items-center gap-2 text-[13px]"><span className="flex-1 font-semibold text-primary">{user.nickname}{t('님이 연결 요청을 보냈어요')}</span>
              <Button size="sm" variant="outline" onClick={() => run(() => api.relationships.respondFriendRequest(inReq.id, false))}>{t('거절')}</Button><Button size="sm" onClick={() => run(() => api.relationships.respondFriendRequest(inReq.id, true), `${user.nickname}${t('님과 연결되었어요.')}`)}>{t('수락')}</Button></div>
          )}
          {view.full && see('bio') && user.bio && <p className="text-[14px] text-ink-2 leading-relaxed mt-3">{user.bio}</p>}
        </div>

        {/* 둘이 겹치는 것 · 둘 다 갈 수 있는 작은 모임 */}
        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={1} />}
          empty={overlapEmpty ? <><SectionEmpty emoji="🌿" title={t('아직 겹치는 게 없어요')} description={t('작은 모임에서 먼저 만나보면 자연스러워요')} action={<Button size="sm" variant="secondary" onClick={() => nav('/meet')}>{t('작은 모임 보기')}</Button>} /><SmallTables other={user} /></> : false}>
          <div className="card p-4">
            <div className="text-[11px] font-bold text-ink-3">{t('둘이 겹치는 것')}</div>
            <div className="mt-2 space-y-2.5">
              {mutualUsers.length > 0 && (
                <button type="button" onClick={() => setMutualOpen(true)} className="w-full flex items-center gap-2 text-left press">
                  <span className="flex -space-x-2">{mutualShown.slice(0, 3).map((m) => <Avatar key={m.id} emoji={m.avatar.emoji} hue={m.avatar.hue} url={m.avatar.url} size={26} className="ring-2 ring-white" />)}</span>
                  <span className="flex-1 text-[13px] font-semibold text-primary">{t('공통 연결')} {mutualUsers.length}{t('명')}</span>
                  <ChevronRight size={16} className="text-ink-3" />
                </button>
              )}
              {commonGroups.length > 0 && <div className="flex flex-wrap gap-1.5">{commonGroups.map((o) => <button key={o.id} onClick={() => nav(`/orgs/${o.id}`)} className="h-7 px-3 rounded-full bg-primary-soft text-primary text-[12px] font-semibold inline-flex items-center gap-1 press"><Users size={12} />{o.name}</button>)}</div>}
              {common.length > 0 && <div className="flex flex-wrap gap-1.5">{common.map((i) => <span key={i} className="h-7 px-3 rounded-full bg-accent-soft text-primary text-[12px] font-semibold inline-flex items-center">{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</span>)}</div>}
              {sameMeets.length > 0 && <div className="space-y-1">{sameMeets.map((a) => <button key={a.id} onClick={() => nav(`/activities/${a.id}`)} className="w-full flex items-center gap-2 text-[13px] text-left press"><span>{CATEGORY_EMOJI[a.category]}</span><span className="flex-1 truncate text-ink-2">{t('같은 모임')} · {a.title}</span><ChevronRight size={14} className="text-ink-3" /></button>)}</div>}
            </div>
          </div>
          <SmallTables other={user} className="mt-3" />
        </Section>

        {hasWants(user.wants) && (
          <div className="card p-4">
            <div className="text-[11px] font-bold text-ink-3">{t('찾고 있어요')}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {user.wants!.people.map((w) => <Tag key={w} tone={v.me.wants?.people.includes(w) ? 'primary' : 'neutral'}>{PEOPLE_WANT_EMOJI[w]} {PEOPLE_WANT_LABELS[w]}</Tag>)}
              {user.wants!.activities.map((a) => <Tag key={a} tone={v.me.wants?.activities.includes(a) ? 'primary' : 'neutral'}>{ACTIVITY_WANT_EMOJI[a]} {ACTIVITY_WANT_LABELS[a]}</Tag>)}
            </div>
          </div>
        )}

        {together && (
          <div className="card p-4 bg-[linear-gradient(120deg,#E1F7F0,#FFFFFF)]">
            <b className="text-[14px] flex items-center gap-1.5"><Sparkles size={15} className="text-mint" />{user.nickname}{t('님과 함께할 수 있는 것')}</b>
            <div className="mt-2 space-y-1.5">
              {hosting.map((a) => <button key={a.id} onClick={() => nav(`/activities/${a.id}`)} className="w-full flex items-center gap-2 text-[13px] text-left press"><span>{CATEGORY_EMOJI[a.category]}</span><span className="flex-1 truncate">{a.title}</span><span className="text-[11px] text-primary font-semibold">{t('참가')}</span></button>)}
              {sharedOpps.map((o) => <button key={o.id} onClick={() => nav(`/opportunities/${o.id}`)} className="w-full flex items-center gap-2 text-[13px] text-left press"><span>🎪</span><span className="flex-1 truncate">{o.title}</span><span className="text-[11px] text-primary font-semibold">{t('같이 가기')}</span></button>)}
              {hosting.length === 0 && sharedOpps.length === 0 && <p className="text-[12px] text-ink-2">{t('아직 열린 활동은 없어요. 공통 관심사로 커피나 점심을 제안해보세요.')}</p>}
            </div>
            <div className="flex gap-2 mt-3">{(common.length ? common : user.interests).slice(0, 3).map((i) => <Button key={i} size="sm" variant="outline" onClick={() => { setPCat(i === 'meal' ? 'meal' : i === 'study' ? 'study' : i === 'exercise' ? 'exercise' : 'coffee'); setPropose(true); }}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]} {t('제안')}</Button>)}</div>
          </div>
        )}
        {view.full && see('prompts') && (user.prompts.length > 0 || user.voicePrompt || user.poll) && (
          <div className="space-y-2.5">
            {user.prompts.filter((p) => p.answer.trim()).map((p) => <PromptAnswerCard key={p.questionId} prompt={p} />)}
            {user.voicePrompt && <div className="card p-4"><div className="text-[12px] font-bold text-primary flex items-center gap-1"><Mic size={12} />{questionById(user.voicePrompt.questionId)?.text}</div><div className="mt-2 flex"><VoicePlayer duration={user.voicePrompt.durationSec} /></div></div>}
            {user.poll && <PollCard poll={user.poll} ownerName={user.nickname} myVote={user.poll.votes[v.me.id]} onVote={(i) => run(() => api.users.votePoll(user.id, v.me.id, i), t('투표했어요.'))} />}
          </div>
        )}

        {view.full && <div className="card p-4 space-y-3">
          <Block label={t('이번 학기 목표')} visible={see('goals') && user.goals.length > 0}><div className="flex flex-wrap gap-1.5">{user.goals.map((g) => <Tag key={g} tone={v.me.goals.includes(g) ? 'primary' : 'neutral'}>{GOAL_EMOJI[g]} {GOAL_LABELS[g]}</Tag>)}</div></Block>
          {(user.lookingFor.length > 0 || user.canOffer.length > 0) && <Block label={t('찾는 사람 · 제공할 수 있는 것')} visible><div className="text-[13px] text-ink-2 space-y-0.5">{user.lookingFor.length > 0 && <div>🔍 {user.lookingFor.map((r) => PERSON_ROLE_LABELS[r]).join(', ')}</div>}{user.canOffer.length > 0 && <div>🛠 {user.canOffer.map((r) => PERSON_ROLE_LABELS[r]).join(', ')}</div>}</div></Block>}
          {user.living && <Block label={t('생활권')} visible={see('living')}><p className="text-[13px] text-ink-2">{RESIDENCE_LABELS[user.living.residence]} · {user.living.zone}{v.me.living?.zone === user.living.zone && <span className="text-mint font-semibold ml-1">{t('같은 생활권')}</span>}</p></Block>}
          <Block label={t('관심사')} visible><div className="flex flex-wrap gap-1.5">{user.interests.map((i) => <Chip key={i} size="sm" active={common.includes(i)}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Chip>)}</div></Block>
          <Block label={t('하고 싶은 활동')} visible={see('freeTime')}>{user.nowWant && <div className="rounded-xl bg-primary-soft text-primary text-[13px] font-semibold px-3 py-2 mb-1.5">“{user.nowWant}”</div>}<p className="text-[13px] text-ink-2">{user.freeTime || t('아직 작성하지 않았어요')}</p></Block>
          <Block label={t('좋아하는 것')} visible={see('likes')}><p className="text-[13px] text-ink-2">{user.likes || '—'}</p></Block>
          <Block label={t('활동 가능한 시간')} visible={see('timetable') && user.timetable.length > 0 ? true : see('availability') && user.availability !== 'hidden'}>
            <p className="text-[13px] text-ink-2 flex items-center gap-1"><Clock size={13} className="text-ink-3" />{availabilityText(user, see('timetable')).text}</p>
            {see('timetable') && user.timetable.length > 0 && (() => { const fb = freeBlocks(user.timetable, todayIdx()); const ov = v.me.timetable.length ? overlapBlocks(freeBlocks(v.me.timetable, todayIdx()), fb) : []; return (
              <div className="mt-1.5 flex flex-wrap gap-1">{fb.map((b) => <Tag key={b.start} tone={ov.some((o) => o.start <= b.start && o.end >= b.end) ? 'mint' : 'neutral'}>{fmtBlock(b)}</Tag>)}<span className="text-[11px] text-ink-3 w-full">{t('오늘 공강 · 초록은 나와 겹치는 시간 · 전체 시간표와 강의실은 비공개')}</span></div>
            ); })()}
          </Block>
          <Block label={t('이용 목적')} visible={see('purposes')}><div className="flex flex-wrap gap-1.5">{user.purposes.map((p) => <Tag key={p}>{PURPOSE_LABELS[p]}</Tag>)}</div></Block>
          <Block label={t('지역')} visible><p className="text-[13px] text-ink-2 flex items-center gap-1"><MapPin size={13} className="text-ink-3" />{user.region} {t('근처')} <span className="text-ink-3 text-[11px]">{t('· 정확한 위치는 공개되지 않아요')}</span></p></Block>
          {see('height') && user.height && <Block label={t('키')} visible><p className="text-[13px] text-ink-2">{user.height}cm</p></Block>}
        </div>}

        {(see('posts') ? userPosts.length > 0 : true) && (
          <div className="card p-4">
            <div className="flex items-center justify-between"><b className="text-[14px]">{t('사진과 게시물')}</b>{!see('posts') && <VisibilityTag value={user.fieldVisibility.posts} />}</div>
            {see('posts') ? <div className="grid grid-cols-3 gap-1.5 mt-3">{userPosts.filter((p) => p.showOnProfile !== false).map((p) => <button key={p.id} onClick={() => nav('/community')}>{p.media[0] ? <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} className="aspect-square rounded-xl" size={30} /> : <span className="aspect-square rounded-xl bg-surface-2 grid place-items-center p-2 text-[11px] text-ink-2 line-clamp-4">{p.text}</span>}</button>)}
            {taggedPosts.map((p) => <button key={`tg_${p.id}`} onClick={() => nav('/community')} className="relative">{p.media[0] && <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} className="aspect-square rounded-xl" size={30} />}<span className="absolute bottom-1 left-1 rounded bg-black/40 text-white text-[9px] px-1">{t('함께')}</span></button>)}</div>
              : <p className="text-[12px] text-ink-3 mt-2 flex items-center gap-1"><Lock size={12} />{t('공개 범위에 포함되지 않아 볼 수 없어요.')}</p>}
          </div>
        )}

        {hosting.length > 0 && <div><h2 className="text-[15px] font-bold mb-2">{t('운영 중인 모임')}</h2><div className="space-y-2">{hosting.map((a) => <ActivityCard key={a.id} activity={a} variant="row" />)}</div></div>}
        {adminOrgs.length > 0 && <div><h2 className="text-[15px] font-bold mb-2">{t('운영 중인 조직')}</h2><div className="space-y-2">{adminOrgs.map((o) => <button key={o.id} onClick={() => nav(`/orgs/${o.id}`)} className="card w-full p-3 flex items-center gap-3 text-left press"><Avatar emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={40} className="!rounded-xl" /><b className="text-[14px]">{o.name}</b></button>)}</div></div>}
        {upcoming.filter((a) => a.hostId !== user.id).length > 0 && <div><h2 className="text-[15px] font-bold mb-2">{t('참여 예정인 공개 활동')}</h2><div className="space-y-2">{upcoming.filter((a) => a.hostId !== user.id).map((a) => <ActivityCard key={a.id} activity={a} variant="row" />)}</div></div>}
      </div>

      {/* 저장 · 관심 · 연결 — 가장 가벼운 저장이 먼저. 메시지는 보낼 수 있을 때만 조용히 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <div className="flex items-center gap-2">
          <ActionBar user={user} className="flex-1 min-w-0" />
          {msg.ok && <button onClick={openChat} className="h-11 w-11 shrink-0 rounded-full grid place-items-center text-primary bg-surface-2 press" aria-label={t('메시지')}><MessageCircle size={19} /></button>}
        </div>
        <p className="text-[11px] text-ink-3 mt-1.5 text-center">{t('저장은 나만 볼 수 있어요')}</p>
      </div>

      <BottomSheet open={propose} onClose={() => setPropose(false)} title={`${user.nickname}${t('님과 같이 해요')}`}>
        <p className="text-[12px] text-ink-3">{t('읽음 여부는 표시되지 않고, 48시간이 지나면 자동으로 만료돼요.')}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">{ALL_CATEGORIES.filter((c) => !['school_event', 'store_deal'].includes(c)).map((c) => <Chip key={c} size="sm" color={CATEGORY_COLORS[c]} active={pCat === c} onClick={() => setPCat(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</Chip>)}</div>
        <Input className="mt-3" placeholder={t('언제? 예: 오늘 18:00')} value={pWhen} onChange={(e) => setPWhen(e.target.value)} />
        <Textarea className="mt-2" placeholder={t('예: 신촌에서 커피 한 잔 어때요?')} value={pMsg} onChange={(e) => setPMsg(e.target.value)} />
        <Button full size="lg" className="mt-4" loading={busy} disabled={!pMsg.trim()} onClick={sendProposal}>{t('제안 보내기')}</Button>
      </BottomSheet>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={user.nickname}>
        <div className="space-y-1">
          <SheetItem icon={<CalendarPlus size={18} />} label={pendingProposal ? `${t('같이 해요')} · ${t('대기 중')}` : t('같이 해요')} onClick={() => { setMenu(false); if (!pendingProposal) setPropose(true); }} />
          {!msg.ok && <div className="px-3 py-2 text-[12px] text-ink-3 flex items-center gap-1"><Lock size={12} />{msg.reason}</div>}
          <SheetItem icon={<EyeOff size={18} />} label={t('추천에서 숨기기')} onClick={() => { setMenu(false); run(() => api.users.hide(v.me.id, 'person', user.id), t('추천에서 숨겼어요. 상대에게 알리지 않아요.')); }} />
          {outReq && <SheetItem icon={<X size={18} />} label={t('연결 요청 취소')} onClick={() => { setMenu(false); run(() => api.relationships.cancelFriendRequest(outReq.id), t('요청을 취소했어요.')); }} />}
          {friend && <SheetItem icon={<UserMinus size={18} />} label={t('연결 끊기')} onClick={() => { setMenu(false); run(() => api.relationships.unfriend(v.me.id, user.id), t('연결을 끊었어요.')); }} />}
          <SheetItem icon={<Flag size={18} />} label={t('사용자 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />
          <SheetItem icon={<Ban size={18} />} label={t('사용자 차단')} danger onClick={() => { setMenu(false); setBlockOpen(true); }} />
        </div>
      </BottomSheet>
      <BottomSheet open={mutualOpen} onClose={() => setMutualOpen(false)} title={`${t('공통 연결')} ${mutualUsers.length}${t('명')}`}>
        <div className="space-y-1">
          {mutualShown.map((m) => <button key={m.id} onClick={() => { setMutualOpen(false); nav(`/users/${m.id}`); }} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left press hover:bg-surface-2"><Avatar emoji={m.avatar.emoji} hue={m.avatar.hue} url={m.avatar.url} size={36} /><span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold truncate">{m.nickname}</span><SchoolBadge user={m} size="sm" /></span><ChevronRight size={16} className="text-ink-3" /></button>)}
          {mutualHidden > 0 && <PrivacyNote text={`${t('외')} ${mutualHidden}${t('명은 경로에 이름을 보이지 않게 설정했어요')}`} className="px-2 pt-2" />}
        </div>
        <p className="mt-3 text-[12px] text-ink-3">{t('공통 연결에게 "연결해줄 수 있나요?"라고 부탁해볼 수도 있어요.')}</p>
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="user" targetId={user.id} />
      <Dialog open={blockOpen} onClose={() => setBlockOpen(false)} title={`${user.nickname}${t('님을 차단할까요?')}`} description={t('서로의 프로필, 활동, 게시물이 보이지 않고 메시지를 주고받을 수 없어요. 상대에게 알림이 가지 않아요.')}>
        <Button variant="outline" full onClick={() => setBlockOpen(false)}>{t('취소')}</Button>
        <Button variant="danger" full onClick={async () => { setBlockOpen(false); await run(() => api.relationships.block(v.me.id, user.id), t('차단했어요.')); nav(-1); }}>{t('차단')}</Button>
      </Dialog>
    </div>
  );
}

/** 사진 여러 장 + 위쪽 흰 바, 이름은 사진 위에 */
function PhotoHero({ user }: { user: User }) {
  const [pi, setPi] = useState(0);
  const photos = user.photos?.length ? user.photos : user.avatar.url ? [user.avatar.url] : [];
  const tap = (e: React.MouseEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); const x = e.clientX - r.left; if (photos.length < 2) return; setPi((p) => (x < r.width / 2 ? (p - 1 + photos.length) % photos.length : (p + 1) % photos.length)); };
  return (
    <div className="relative h-[400px] bg-ink text-white select-none" onClick={tap} style={{ background: `linear-gradient(135deg, hsl(${user.avatar.hue} 60% 75%), hsl(${(user.avatar.hue + 40) % 360} 55% 60%))` }}>
      {photos.length ? <img src={assetUrl(photos[pi])} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} /> : <span className="absolute inset-0 grid place-items-center text-[120px]">{user.avatar.emoji}</span>}
      <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgba(0,0,0,.5),rgba(0,0,0,0))]" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-[linear-gradient(to_top,rgba(20,14,10,.9),rgba(20,14,10,.3)_60%,rgba(0,0,0,0))]" />
      {photos.length > 1 && <div className="absolute top-[60px] inset-x-4 flex gap-1">{photos.map((_, i) => <span key={i} className={cn('h-[3px] flex-1 rounded-full', i === pi ? 'bg-white' : 'bg-white/40')} />)}</div>}
      {user.avatar.photoType !== 'face' && <span className="absolute top-[72px] left-4 rounded-full bg-black/35 backdrop-blur text-[11px] px-2.5 py-1">{user.avatar.photoType === 'masked' ? t('얼굴 비공개') : t('뒷모습')}</span>}
    </div>
  );
}

function Block({ label, visible, children }: { label: string; visible: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-ink-3 mb-1">{label}</div>
      {visible ? children : <p className="text-[12px] text-ink-3 flex items-center gap-1"><Lock size={12} />{t('비공개 항목이에요')}</p>}
    </div>
  );
}

