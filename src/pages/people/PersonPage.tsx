import { useEffect, useState } from 'react';
import { t, lang } from '@core/i18n';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { UserPlus, UserMinus, MessageCircle, MoreHorizontal, Clock, MapPin, Flag, Ban, Sparkles, Users, CalendarPlus, Check, Lock, Mic, Briefcase, Bell } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, VerifiedBadge, Tag, Button, BottomSheet, Dialog, Textarea, Input, Chip, Cover, EmptyState, VisibilityTag } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { ActivityCard } from '@/components/cards/ActivityCard';
import { useViewer } from '@/hooks/useViewer';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { ReasonList } from '@/components/people_ReasonChips';
import { PaywallSheet, type PaywallReason } from '@/components/social/PaywallSheet';
import { personLine, cityOf, isAlumniStage } from '@core/lib/network';
import { PEOPLE_WANT_LABELS, ACTIVITY_WANT_LABELS, PEOPLE_WANT_EMOJI, ACTIVITY_WANT_EMOJI, hasWants } from '@core/lib/wants';
import { isPlus, swipesLeft } from '@core/lib/monetization';
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
  const [connecting, setConnecting] = useState(false);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  useEffect(() => { if (params.get('propose')) setParams({}, { replace: true }); }, [params, setParams]);

  if (user && user.id === v.me.id) return <Navigate to="/profile" replace />;
  if (!user) { return <div className="min-h-full"><TopBar back title={t('프로필')} /><EmptyState emoji="🙈" title={t('사용자를 찾을 수 없어요')} /></div>; }
  if (v.hasBlocked(user.id)) return <div className="min-h-full"><TopBar back title={t('프로필')} /><EmptyState emoji="🚫" title={t('차단한 사용자예요')} description={t('차단을 해제하면 프로필을 다시 볼 수 있어요.')} action={<Button variant="outline" onClick={() => run(() => api.relationships.unblock(v.me.id, user.id), t('차단을 해제했어요.'))}>{t('차단 해제')}</Button>} /></div>;
  if (v.isBlocked(user.id)) return <div className="min-h-full"><TopBar back title={t('프로필')} /><EmptyState emoji="🙈" title={t('사용자를 찾을 수 없어요')} /></div>;

  const following = v.isFollowing(user.id);
  const friend = v.isFriend(user.id);
  const outReq = v.pendingOut(user.id);
  const inReq = v.pendingIn(user.id);
  const conn = v.connection(user.id);
  const msg = v.canMessage(user.id);
  const common = commonInterests(v.me, user);
  const mutualF = mutualFriends(v.snap, v.me.id, user.id);
  const see = (f: Parameters<typeof v.canSeeField>[1]) => v.canSeeField(user, f);
  const upcoming = v.visibleActivities.filter((a) => a.visibility === 'public' && a.date >= todayISO() && (a.hostId === user.id || v.snap.participations.some((p) => p.activityId === a.id && p.userId === user.id && p.status === 'approved')));
  const hosting = v.visibleActivities.filter((a) => a.hostId === user.id && a.date >= todayISO());
  const userPosts = v.visiblePosts.filter((p) => p.authorId === user.id && p.authorType === 'user' && !p.anonymous);
  const taggedPosts = v.visiblePosts.filter((p) => p.authorId !== user.id && (p.taggedUserIds ?? []).includes(user.id) && (p.tagApprovedIds ?? []).includes(user.id) && p.media.length > 0);
  const together = params.get('tab') === 'together';
  const sharedOpps = v.snap.opportunityIntents.filter((i) => i.userId === user.id).map((i) => oppsAll.find((o) => o.id === i.opportunityId)).filter((o): o is NonNullable<typeof o> => !!o && o.date !== undefined && o.date >= todayISO());
  const adminOrgs = orgs.filter((o) => o.adminIds.includes(user.id));
  const pendingProposal = proposals.find((p) => p.fromId === v.me.id && p.toId === user.id && p.status === 'pending');
  const reasons = shareableReasons(matchReasons(v.me, user, v.snap, see('timetable')));
  const city = cityOf(user);
  const career = isAlumniStage(user) ? [user.career?.role, user.career?.company, user.career?.industry].filter(Boolean).join(' · ') : '';

  /** 연결 요청 — 하루 한도(무료 30회)는 API 가 강제. 한도 초과면 페이월 */
  const connect = async () => {
    if (!isPlus(v.me) && swipesLeft(v.me) <= 0) { setPaywall('limit'); return; }
    setConnecting(true);
    try { await run(() => api.relationships.sendFriendRequest(v.me.id, user.id), t('연결 요청을 보냈어요.')); }
    catch { if (!isPlus(v.me) && swipesLeft(useAppStore.getState().users.find((x) => x.id === v.me.id) ?? v.me) <= 0) setPaywall('limit'); }
    finally { setConnecting(false); }
  };
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
        <div className="card p-4">
          <h1 className="font-display text-[28px] leading-tight font-bold text-ink">{user.nickname}</h1>
          <SchoolBadge user={user} withYear size="lg" className="mt-1" />
          <div className="text-[14px] text-ink-2 mt-1">{personLine(user, lang)}</div>
          {career && <div className="text-[13px] text-ink-2 mt-0.5 flex items-center gap-1"><Briefcase size={13} className="text-ink-3" />{career}</div>}
          {city && <div className="text-[13px] text-ink-3 mt-0.5 flex items-center gap-1"><MapPin size={13} />{city}{user.activityCity && user.activityCity !== city ? ` · ${t('활동')} ${user.activityCity}` : ''}</div>}
          {user.interests.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{[...common, ...user.interests.filter((i) => !common.includes(i))].map((i) => <span key={i} className={cn('h-7 px-3 rounded-full text-[12px] font-semibold inline-flex items-center', common.includes(i) ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-ink-2')}>{INTEREST_LABELS[i]}</span>)}</div>}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {user.identityVerified && <VerifiedBadge kind="identity" size={16} label />}
            {conn !== 'none' && <Tag tone="mint"><Check size={11} />{{ friend: t('연결됨'), activity: t('같은 활동 참가자'), proposal: t('활동 제안 수락'), matched: t('연결됨') }[conn]}</Tag>}
            {mutualF.length > 0 && <Tag tone="primary"><Users size={11} /> {t('공통 연결')} {mutualF.length}{t('명')}</Tag>}
          </div>
          {inReq && (
            <div className="mt-3 rounded-xl bg-primary-soft px-3 py-2.5 flex items-center gap-2 text-[13px]"><span className="flex-1 font-semibold text-primary">{user.nickname}{t('님이 연결 요청을 보냈어요')}</span>
              <Button size="sm" variant="outline" onClick={() => run(() => api.relationships.respondFriendRequest(inReq.id, false))}>{t('거절')}</Button><Button size="sm" onClick={() => run(() => api.relationships.respondFriendRequest(inReq.id, true), `${user.nickname}${t('님과 연결되었어요.')}`)}>{t('수락')}</Button></div>
          )}
          {see('bio') && user.bio && <p className="text-[14px] text-ink-2 leading-relaxed mt-3">{user.bio}</p>}
        </div>

        <ReasonList reasons={reasons} title={t('우리의 공통점')} max={6} />
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
        {see('prompts') && (user.prompts.length > 0 || user.voicePrompt || user.poll) && (
          <div className="space-y-2.5">
            {user.prompts.filter((p) => p.answer.trim()).map((p) => <PromptAnswerCard key={p.questionId} prompt={p} />)}
            {user.voicePrompt && <div className="card p-4"><div className="text-[12px] font-bold text-primary flex items-center gap-1"><Mic size={12} />{questionById(user.voicePrompt.questionId)?.text}</div><div className="mt-2 flex"><VoicePlayer duration={user.voicePrompt.durationSec} /></div></div>}
            {user.poll && <PollCard poll={user.poll} ownerName={user.nickname} myVote={user.poll.votes[v.me.id]} onVote={(i) => run(() => api.users.votePoll(user.id, v.me.id, i), t('투표했어요.'))} />}
          </div>
        )}

        <div className="card p-4 space-y-3">
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
        </div>

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

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <div className="flex gap-2">
          {friend ? <Button size="lg" className="flex-1" variant="secondary" icon={<Check size={16} />} disabled>{t('연결됨')}</Button>
            : outReq ? <Button size="lg" className="flex-1" variant="outline" onClick={() => run(() => api.relationships.cancelFriendRequest(outReq.id), t('요청을 취소했어요.'))}>{t('요청 취소')}</Button>
            : <Button size="lg" className="flex-1" icon={<UserPlus size={16} />} loading={connecting} onClick={connect}>{t('연결하기')}</Button>}
          <Button size="lg" variant={msg.ok ? 'secondary' : 'outline'} icon={msg.ok ? <MessageCircle size={18} /> : <Lock size={15} />} onClick={openChat} aria-label={t('메시지')}>{t('메시지')}</Button>
          <Button size="lg" variant="outline" icon={<CalendarPlus size={18} />} onClick={() => setPropose(true)} disabled={!!pendingProposal} aria-label={t('만남에 초대')}>{pendingProposal ? t('대기 중') : t('만남에 초대')}</Button>
        </div>
        {!msg.ok && <p className="text-[11px] text-ink-3 mt-2 text-center flex items-center justify-center gap-1"><Lock size={11} />{msg.reason}</p>}
      </div>
      <PaywallSheet open={!!paywall} onClose={() => setPaywall(null)} reason={paywall ?? undefined} />

      <BottomSheet open={propose} onClose={() => setPropose(false)} title={`${user.nickname}${t('님에게 활동 제안')}`}>
        <p className="text-[12px] text-ink-3">{t('읽음 여부는 표시되지 않고, 48시간이 지나면 자동으로 만료돼요.')}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">{ALL_CATEGORIES.filter((c) => !['school_event', 'store_deal'].includes(c)).map((c) => <Chip key={c} size="sm" color={CATEGORY_COLORS[c]} active={pCat === c} onClick={() => setPCat(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</Chip>)}</div>
        <Input className="mt-3" placeholder={t('언제? 예: 오늘 18:00')} value={pWhen} onChange={(e) => setPWhen(e.target.value)} />
        <Textarea className="mt-2" placeholder={t('예: 신촌에서 커피 한 잔 어때요?')} value={pMsg} onChange={(e) => setPMsg(e.target.value)} />
        <Button full size="lg" className="mt-4" loading={busy} disabled={!pMsg.trim()} onClick={sendProposal}>{t('제안 보내기')}</Button>
      </BottomSheet>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={user.nickname}>
        <div className="space-y-1">
          <SheetItem icon={following ? <Bell size={18} /> : <Bell size={18} className="text-ink-3" />} label={following ? t('팔로우 취소') : t('팔로우')} onClick={() => { setMenu(false); run(() => api.relationships.toggleFollow(v.me.id, user.id, 'user'), following ? t('팔로우를 취소했어요.') : t('팔로우했어요. 새 글을 피드에서 볼 수 있어요.')); }} />
          {friend && <SheetItem icon={<UserMinus size={18} />} label={t('연결 끊기')} onClick={() => { setMenu(false); run(() => api.relationships.unfriend(v.me.id, user.id), t('연결을 끊었어요.')); }} />}
          <SheetItem icon={<Flag size={18} />} label={t('사용자 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />
          <SheetItem icon={<Ban size={18} />} label={t('사용자 차단')} danger onClick={() => { setMenu(false); setBlockOpen(true); }} />
        </div>
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

