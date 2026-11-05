import { useEffect, useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, UserPlus, MessageCircle, MoreHorizontal, Clock, MapPin, Flag, Ban, Sparkles, Users, CalendarPlus, Check, Lock, Mic } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { INTEREST_EMOJI, INTEREST_LABELS, PURPOSE_LABELS, CATEGORY_EMOJI, GOAL_EMOJI, GOAL_LABELS, PERSON_ROLE_LABELS, RESIDENCE_LABELS } from '@core/lib/labels';
import { commonInterests } from '@core/lib/relations';
import { todayISO } from '@core/lib/format';
import type { ActivityCategory, ProfilePrompt, User } from '@core/types';
import { questionById } from '@core/data/prompts';
import { availabilityText, freeBlocks, todayIdx, fmtBlock, overlapBlocks } from '@core/lib/timetable';
import { matchReasons, shareableReasons } from '@core/lib/recommend';
import { isAlumniStage } from '@core/lib/network';
import { tw } from '@/tw';
import { WeekGrid } from '@/components/WeekGrid';
import { useViewer } from '@/viewer';
import { nav, replace, back } from '@/nav';
import { Screen, Avatar, Tag, Button, BottomSheet, Chip, Cover, Empty, IconBtn, img, C } from '@/ui';
import { SheetItem } from '@/components/PostCard';
import { ReportSheet } from '@/components/a_ReportSheet';
import { ProposeSheet } from '@/components/a_ProposeSheet';
import { VoicePlayer, PollCard } from '@/components/a_Prompts';
import { affiliationText, VerifiedBadge, VisibilityTag, Dialog, ActivityRow } from '@/components/a_shared';
import { BigPromptCard, NoteSheet, MutualLine, MutualSheet, NoteBubble } from '@/v2/PromptParts';
import { HelpSeekTags } from '@/v2/HelpSeek';

const W = Dimensions.get('window').width;

/** 사람 상세 (웹 PersonPage) — ?propose=1&cat=coffee&opp=… 로 열면 제안 시트가 바로 열린다 */
export default function PersonScreen() {
  const { id, propose: proposeParam, cat, opp, tab } = useLocalSearchParams<{ id: string; propose?: string; cat?: string; opp?: string; tab?: string }>();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const orgs = useAppStore((s) => s.organizations);
  const proposals = useAppStore((s) => s.proposals);
  const oppsAll = useAppStore((s) => s.opportunities);
  const user = v.userById(id!);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [propose, setPropose] = useState(proposeParam === '1');
  const [pCat, setPCat] = useState<ActivityCategory>((cat as ActivityCategory) || 'coffee');
  const [noteFor, setNoteFor] = useState<ProfilePrompt | null>(null);
  const [mutualOpen, setMutualOpen] = useState(false);
  const isMe = !!user && user.id === v.me.id;
  useEffect(() => { if (isMe) replace('/profile'); }, [isMe]);

  if (isMe) return null;
  if (!user || user.suspended) return <Screen title={t('프로필')}><Empty title={`🙈 ${t('사용자를 찾을 수 없어요')}`} /></Screen>;
  if (user.deleted) return <Screen title={t('프로필')}><Empty title={`👤 ${t('탈퇴한 사용자예요')}`} description={t('계정이 삭제되어 프로필을 볼 수 없고, 연결하거나 메시지를 보낼 수 없어요.')} /></Screen>;
  if (v.hasBlocked(user.id)) return <Screen title={t('프로필')}><Empty title={`🚫 ${t('차단한 사용자예요')}`} description={t('차단을 해제하면 프로필을 다시 볼 수 있어요.')} action={<Button variant="outline" onPress={() => run(() => api.relationships.unblock(v.me.id, user.id), t('차단을 해제했어요.'))}>{t('차단 해제')}</Button>} /></Screen>;
  if (v.isBlocked(user.id)) return <Screen title={t('프로필')}><Empty title={`🙈 ${t('사용자를 찾을 수 없어요')}`} /></Screen>;

  const liked = v.iLike(user.id);
  const mutual = v.isMutual(user.id);
  const following = v.isFollowing(user.id);
  const friend = v.isFriend(user.id);
  const outReq = v.pendingOut(user.id);
  const inReq = v.pendingIn(user.id);
  const conn = v.connection(user.id);
  const msg = v.canMessage(user.id);
  const common = commonInterests(v.me, user);
  const see = (f: Parameters<typeof v.canSeeField>[1]) => v.canSeeField(user, f);
  /** 졸업생이 보거나 졸업생을 볼 때는 시간표·공강·학기 목표·생활권을 보여주지 않는다 */
  const alumniView = isAlumniStage(v.me) || isAlumniStage(user);
  const ownerAlumni = isAlumniStage(user);
  const seeTT = see('timetable') && !alumniView;
  /** Hinge식 — 질문 답변 카드 사이사이에 사진. 첫 사진은 맨 위 */
  const answered = see('prompts') ? user.prompts.filter((p) => p.answer.trim()) : [];
  const photos = user.photos?.length ? user.photos : user.avatar.url ? [user.avatar.url] : [];
  const interleave = answered.length > 0 && photos.length > 1;
  const between = interleave ? photos.slice(1) : [];
  const upcoming = v.visibleActivities.filter((a) => a.visibility === 'public' && a.date >= todayISO() && (a.hostId === user.id || v.snap.participations.some((p) => p.activityId === a.id && p.userId === user.id && p.status === 'approved')));
  const hosting = v.visibleActivities.filter((a) => a.hostId === user.id && a.date >= todayISO());
  const userPosts = v.visiblePosts.filter((p) => p.authorId === user.id && p.authorType === 'user' && !p.anonymous);
  const taggedPosts = v.visiblePosts.filter((p) => p.authorId !== user.id && (p.taggedUserIds ?? []).includes(user.id) && (p.tagApprovedIds ?? []).includes(user.id) && p.media.length > 0);
  const together = tab === 'together';
  const sharedOpps = v.snap.opportunityIntents.filter((i) => i.userId === user.id).map((i) => oppsAll.find((o) => o.id === i.opportunityId)).filter((o): o is NonNullable<typeof o> => !!o && o.date !== undefined && o.date >= todayISO());
  const adminOrgs = orgs.filter((o) => o.adminIds.includes(user.id));
  const pendingProposal = proposals.find((p) => p.fromId === v.me.id && p.toId === user.id && p.status === 'pending');
  const reasons = shareableReasons(matchReasons(v.me, user, v.snap, seeTT));
  const connLabel = { friend: t('친구'), activity: t('같은 활동 참가자'), proposal: t('활동 제안 수락'), matched: t('서로 관심'), none: '' }[conn];

  const like = async () => {
    const res = await run(() => api.relationships.toggleLike(v.me.id, user.id));
    if (res.mutual) showToast(t('서로 관심이 있어요. 이제 메시지를 보낼 수 있어요.'), 'success');
  };
  const openChat = async () => {
    try { const res = await run(() => api.chats.openDirect(v.me.id, user.id)); nav(`/chats/${res.room.id}`); } catch { /* toast */ }
  };
  const tile = (W - 32 - 32 - 12) / 3; // 화면 - 화면 여백 - 카드 패딩 - 간격

  const footer = (
    <View>
      <View style={[tw`flex-row`, { gap: 8 }]}>
        <Pressable onPress={like} style={[tw`h-[52px] w-[52px] rounded-2xl items-center justify-center`, { backgroundColor: liked ? C.primary : C.tint }]}><Star size={22} color={liked ? C.onPrimary : C.primary} fill={liked ? C.onPrimary : 'none'} /></Pressable>
        <Button size="lg" variant={following ? 'secondary' : 'outline'} onPress={() => run(() => api.relationships.toggleFollow(v.me.id, user.id, 'user'))}>{following ? t('팔로잉') : t('팔로우')}</Button>
        {friend ? <Button size="lg" variant="secondary" icon={<Check size={16} color={C.primary} />} disabled>{t('친구')}</Button>
          : outReq ? <Button size="lg" variant="outline" onPress={() => run(() => api.relationships.cancelFriendRequest(outReq.id), t('요청을 취소했어요.'))}>{t('요청 취소')}</Button>
          : <Button size="lg" variant="outline" icon={<UserPlus size={16} color={C.ink2} />} onPress={() => run(() => api.relationships.sendFriendRequest(v.me.id, user.id), t('친구 요청을 보냈어요.'))}>{t('친구 요청')}</Button>}
        {msg.ok ? <Button size="lg" full icon={<MessageCircle size={18} color={C.onPrimary} />} onPress={openChat}>{t('메시지')}</Button>
          : <Button size="lg" full icon={<CalendarPlus size={18} color={C.onPrimary} />} onPress={() => setPropose(true)} disabled={!!pendingProposal}>{pendingProposal ? t('제안 대기 중') : t('활동 제안')}</Button>}
      </View>
      {!msg.ok && <View style={tw`flex-row items-center justify-center mt-2`}><Lock size={11} color={C.ink3} /><Text style={tw`ml-1 text-[11px] text-ink-3`}>{msg.reason}</Text></View>}
    </View>
  );

  return (
    <Screen title="" right={<IconBtn onPress={() => setMenu(true)}><MoreHorizontal size={20} color={C.ink2} /></IconBtn>} footer={footer}>
      <PhotoHero user={user} photos={interleave ? photos.slice(0, 1) : photos} />
      <View style={tw`-mt-8`}>
        <View style={tw`card p-4`}>
          <View style={tw`flex-row items-center flex-wrap`}>{user.affiliation.type === 'university' && user.affiliation.emailVerified && <VerifiedBadge kind="school" size={16} label />}{user.identityVerified && <VerifiedBadge kind="identity" size={16} label />}</View>
          <View style={tw`mt-2`}><MutualLine user={user} big onPress={() => setMutualOpen(true)} /></View>
          {mutual && <View style={[tw`mt-3 rounded-xl px-3 py-2.5 flex-row items-center`, { backgroundColor: C.tint }]}><Star size={15} color={C.ink} fill={C.ink} /><Text style={tw`ml-2 text-[13px] font-semibold text-ink shrink`}>{t('서로 관심이 있어요. 이제 메시지를 보낼 수 있어요.')}</Text></View>}
          {conn !== 'none' && !mutual && <View style={tw`mt-2 flex-row`}><Tag tone="mint">✓ {connLabel}</Tag></View>}
          {inReq && (
            <View style={tw`mt-3 rounded-xl bg-primary-soft px-3 py-2.5 flex-row items-center`}>
              <Text style={tw`flex-1 text-[13px] font-semibold text-primary`}>{user.nickname}{t('님이 친구 요청을 보냈어요')}</Text>
              <Button size="sm" variant="outline" onPress={() => run(() => api.relationships.respondFriendRequest(inReq.id, false))}>{t('거절')}</Button><View style={tw`w-2`} /><Button size="sm" onPress={() => run(() => api.relationships.respondFriendRequest(inReq.id, true), t('친구가 되었어요!'))}>{t('수락')}</Button>
            </View>
          )}
          {inReq?.note ? <NoteBubble note={inReq.note} /> : null}
          {see('bio') && user.bio ? <Text style={tw`text-[14px] text-ink-2 leading-6 mt-3`}>{user.bio}</Text> : null}
          {reasons.length > 0 && <View style={tw`mt-3 rounded-xl bg-surface-2 px-3 py-2.5`}>{reasons.slice(0, 4).map((r) => <View key={r.text} style={tw`flex-row items-start mb-1`}><Check size={12} color={C.primary} style={{ marginTop: 2 }} /><Text style={tw`ml-1.5 text-[12px] text-ink-2 shrink`}>{r.text}</Text></View>)}</View>}
          {common.length > 0 && (
            <View style={[tw`mt-3 flex-row flex-wrap`, { gap: 6 }]}>
              <Tag tone="primary">✨ {t('공통 관심사')} {common.map((i) => INTEREST_LABELS[i]).join(', ')}</Tag>
            </View>
          )}
        </View>

        {together && (
          <View style={[tw`mt-3 rounded-[20px] border border-line p-4`, { backgroundColor: C.okSoft }]}>
            <View style={tw`flex-row items-center`}><Sparkles size={15} color={C.mint} /><Text style={tw`ml-1.5 text-[14px] font-bold text-ink`}>{user.nickname}{t('님과 함께할 수 있는 것')}</Text></View>
            <View style={tw`mt-2`}>
              {hosting.map((a) => <Pressable key={a.id} onPress={() => nav(`/activities/${a.id}`)} style={tw`flex-row items-center mb-1.5`}><Text style={tw`text-[13px]`}>{CATEGORY_EMOJI[a.category]}</Text><Text numberOfLines={1} style={tw`flex-1 mx-2 text-[13px] text-ink`}>{a.title}</Text><Text style={tw`text-[11px] text-primary font-semibold`}>{t('참가')}</Text></Pressable>)}
              {sharedOpps.map((o) => <Pressable key={o.id} onPress={() => nav(`/opportunities/${o.id}`)} style={tw`flex-row items-center mb-1.5`}><Text style={tw`text-[13px]`}>🎪</Text><Text numberOfLines={1} style={tw`flex-1 mx-2 text-[13px] text-ink`}>{o.title}</Text><Text style={tw`text-[11px] text-primary font-semibold`}>{t('같이 가기')}</Text></Pressable>)}
              {hosting.length === 0 && sharedOpps.length === 0 && <Text style={tw`text-[12px] text-ink-2`}>{t('아직 참여할 수 있는 모임이 없어요. 겹치는 관심사로 커피나 점심을 제안해 보세요.')}</Text>}
            </View>
            <View style={[tw`flex-row flex-wrap mt-3`, { gap: 8 }]}>{(common.length ? common : user.interests).slice(0, 3).map((i) => <Button key={i} size="sm" variant="outline" onPress={() => { setPCat(i === 'meal' ? 'meal' : i === 'study' ? 'study' : i === 'exercise' ? 'exercise' : 'coffee'); setPropose(true); }}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]} {t('제안')}</Button>)}</View>
          </View>
        )}

        {see('prompts') && (answered.length > 0 || user.voicePrompt || user.poll) && (
          <View style={tw`mt-3`}>
            {answered.map((p, i) => (
              <View key={p.questionId}>
                <View style={tw`mb-2.5`}><BigPromptCard prompt={p} onNote={() => setNoteFor(p)} /></View>
                {between[i] ? <InlinePhoto url={between[i]} /> : null}
              </View>
            ))}
            {between.slice(answered.length).map((url) => <InlinePhoto key={url} url={url} />)}
            {user.voicePrompt && <View style={tw`card p-4 mb-2.5`}><View style={tw`flex-row items-center`}><Mic size={12} color={C.primary} /><Text style={tw`ml-1 text-[12px] font-bold text-primary`}>{questionById(user.voicePrompt.questionId)?.text}</Text></View><View style={tw`mt-2 flex-row`}><VoicePlayer duration={user.voicePrompt.durationSec} /></View></View>}
            {user.poll && <PollCard poll={user.poll} ownerName={user.nickname} myVote={user.poll.votes[v.me.id]} onVote={(i) => run(() => api.users.votePoll(user.id, v.me.id, i), t('투표했어요.'))} />}
          </View>
        )}

        <View style={tw`mt-3 card p-4`}>
          {ownerAlumni ? null : <Block label={t('이번 학기 목표')} visible={see('goals') && user.goals.length > 0}><View style={[tw`flex-row flex-wrap`, { gap: 6 }]}>{user.goals.map((g) => <Tag key={g} tone={v.me.goals.includes(g) ? 'primary' : 'neutral'}>{GOAL_EMOJI[g]} {GOAL_LABELS[g]}</Tag>)}</View></Block>}
          {user.helpWith?.length || user.seeking?.length ? <Block label={t('도와줄 수 있어요 · 찾고 있어요')} visible><HelpSeekTags helpWith={user.helpWith} seeking={user.seeking} highlight={v.me.seeking ?? []} /></Block> : null}
          {(user.lookingFor.length > 0 || user.canOffer.length > 0) && <Block label={t('찾는 사람 · 제공할 수 있는 것')} visible><View>{user.lookingFor.length > 0 && <Text style={tw`text-[13px] text-ink-2`}>🔍 {user.lookingFor.map((r) => PERSON_ROLE_LABELS[r]).join(', ')}</Text>}{user.canOffer.length > 0 && <Text style={tw`text-[13px] text-ink-2 mt-0.5`}>🛠 {user.canOffer.map((r) => PERSON_ROLE_LABELS[r]).join(', ')}</Text>}</View></Block>}
          {user.living && !ownerAlumni && <Block label={t('생활권')} visible={see('living')}><Text style={tw`text-[13px] text-ink-2`}>{RESIDENCE_LABELS[user.living.residence]} · {user.living.zone}{v.me.living?.zone === user.living.zone && <Text style={tw`text-mint font-semibold`}> {t('같은 생활권')}</Text>}</Text></Block>}
          <Block label={t('관심사')} visible><View style={tw`flex-row flex-wrap`}>{user.interests.map((i) => <View key={i} style={tw`mb-2`}><Chip size="sm" active={common.includes(i)}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Chip></View>)}</View></Block>
          <Block label={t('하고 싶은 활동')} visible={see('freeTime')}>{user.nowWant ? <View style={tw`rounded-xl bg-primary-soft px-3 py-2 mb-1.5`}><Text style={tw`text-primary text-[13px] font-semibold`}>“{user.nowWant}”</Text></View> : null}<Text style={tw`text-[13px] text-ink-2`}>{user.freeTime || t('아직 작성하지 않았어요')}</Text></Block>
          <Block label={t('좋아하는 것')} visible={see('likes')}><Text style={tw`text-[13px] text-ink-2`}>{user.likes || '—'}</Text></Block>
          <Block label={t('활동 가능한 시간')} visible={seeTT && user.timetable.length > 0 ? true : see('availability') && user.availability !== 'hidden'}>
            <View style={tw`flex-row items-center`}><Clock size={13} color={C.ink3} /><Text style={tw`ml-1 text-[13px] text-ink-2`}>{availabilityText(user, seeTT).text}</Text></View>
            {seeTT && user.timetable.length > 0 && (() => { const fb = freeBlocks(user.timetable, todayIdx()); const ov = v.me.timetable.length ? overlapBlocks(freeBlocks(v.me.timetable, todayIdx()), fb) : []; return (
              <View>
                <View style={[tw`mt-1.5 flex-row flex-wrap`, { gap: 4 }]}>{fb.map((b) => <Tag key={b.start} tone={ov.some((o) => o.start <= b.start && o.end >= b.end) ? 'mint' : 'neutral'}>{fmtBlock(b)}</Tag>)}</View>
                <View style={tw`mt-3`}><WeekGrid courses={user.timetable} /></View>
                <Text style={tw`mt-1.5 text-[11px] text-ink-3`}>{t('오늘 공강 · 초록은 나와 겹치는 시간 · 강의실은 비공개')}</Text>
              </View>
            ); })()}
          </Block>
          <Block label={t('이용 목적')} visible={see('purposes')}><View style={[tw`flex-row flex-wrap`, { gap: 6 }]}>{user.purposes.map((p) => <Tag key={p}>{PURPOSE_LABELS[p]}</Tag>)}</View></Block>
          <Block label={t('지역')} visible><View style={tw`flex-row items-center flex-wrap`}><MapPin size={13} color={C.ink3} /><Text style={tw`ml-1 text-[13px] text-ink-2`}>{user.region} {t('근처')} <Text style={tw`text-ink-3 text-[11px]`}>{t('· 정확한 위치는 공개되지 않아요')}</Text></Text></View></Block>
          {see('height') && user.height ? <Block label={t('키')} visible last><Text style={tw`text-[13px] text-ink-2`}>{user.height}cm</Text></Block> : null}
        </View>

        {(see('posts') ? userPosts.length > 0 : true) && (
          <View style={tw`mt-3 card p-4`}>
            <View style={tw`flex-row items-center justify-between`}><Text style={tw`text-[14px] font-bold text-ink`}>{t('사진과 게시물')}</Text>{!see('posts') && <VisibilityTag value={user.fieldVisibility.posts} />}</View>
            {see('posts') ? (
              <View style={[tw`flex-row flex-wrap mt-3`, { gap: 6 }]}>
                {userPosts.filter((p) => p.showOnProfile !== false).map((p) => <Pressable key={p.id} onPress={() => nav('/community')}>{p.media[0] ? <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} size={tile} radius={12} /> : <View style={[tw`rounded-xl bg-surface-2 items-center justify-center p-2`, { width: tile, height: tile }]}><Text numberOfLines={4} style={tw`text-[11px] text-ink-2 text-center`}>{p.text}</Text></View>}</Pressable>)}
                {taggedPosts.map((p) => <Pressable key={`tg_${p.id}`} onPress={() => nav('/community')}>{p.media[0] && <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} size={tile} radius={12} />}<View style={[tw`absolute bottom-1 left-1 rounded px-1`, { backgroundColor: 'rgba(0,0,0,0.4)' }]}><Text style={tw`text-white text-[9px]`}>{t('함께')}</Text></View></Pressable>)}
              </View>
            ) : <View style={tw`flex-row items-center mt-2`}><Lock size={12} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-3`}>{t('공개 범위에 포함되지 않아 볼 수 없어요.')}</Text></View>}
          </View>
        )}

        {hosting.length > 0 && <View style={tw`mt-3`}><Text style={tw`text-[15px] font-bold text-ink mb-2`}>{t('운영 중인 모임')}</Text>{hosting.map((a) => <ActivityRow key={a.id} activity={a} />)}</View>}
        {adminOrgs.length > 0 && <View style={tw`mt-3`}><Text style={tw`text-[15px] font-bold text-ink mb-2`}>{t('운영 중인 조직')}</Text>{adminOrgs.map((o) => <Pressable key={o.id} onPress={() => nav(`/orgs/${o.id}`)} style={tw`card p-3 flex-row items-center mb-2`}><Avatar emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={40} style={{ borderRadius: 12 }} /><Text style={tw`ml-3 text-[14px] font-bold text-ink`}>{o.name}</Text></Pressable>)}</View>}
        {upcoming.filter((a) => a.hostId !== user.id).length > 0 && <View style={tw`mt-3`}><Text style={tw`text-[15px] font-bold text-ink mb-2`}>{t('참여 예정인 공개 활동')}</Text>{upcoming.filter((a) => a.hostId !== user.id).map((a) => <ActivityRow key={a.id} activity={a} />)}</View>}
      </View>

      <NoteSheet user={user} prompt={noteFor} onClose={() => setNoteFor(null)} />
      <MutualSheet user={user} open={mutualOpen} onClose={() => setMutualOpen(false)} />
      <ProposeSheet open={propose} onClose={() => setPropose(false)} user={user} category={pCat} onCategory={setPCat} oppId={opp} />

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={user.nickname}>
        {friend && <SheetItem icon={<Users size={18} color={C.ink} />} label={t('친구 끊기')} onPress={() => { setMenu(false); run(() => api.relationships.unfriend(v.me.id, user.id), t('친구를 끊었어요.')); }} />}
        <SheetItem icon={<Flag size={18} color={C.danger} />} label={t('사용자 신고')} danger onPress={() => { setMenu(false); setReport(true); }} />
        <SheetItem icon={<Ban size={18} color={C.danger} />} label={t('사용자 차단')} danger onPress={() => { setMenu(false); setBlockOpen(true); }} />
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="user" targetId={user.id} />
      <Dialog open={blockOpen} onClose={() => setBlockOpen(false)} title={`${user.nickname}${t('님을 차단할까요?')}`} description={t('서로의 프로필, 활동, 게시물이 보이지 않고 메시지를 주고받을 수 없어요. 상대에게 알림이 가지 않아요.')}>
        <Button variant="outline" full onPress={() => setBlockOpen(false)}>{t('취소')}</Button><View style={tw`w-2`} />
        <Button variant="danger" full onPress={async () => { setBlockOpen(false); await run(() => api.relationships.block(v.me.id, user.id), t('차단했어요.')); back(); }}>{t('차단')}</Button>
      </Dialog>
    </Screen>
  );
}

/** 질문 카드 사이의 사진 한 장 */
function InlinePhoto({ url }: { url: string }) {
  return <View style={tw`mb-2.5 rounded-[24px] overflow-hidden`}><Image source={img(url)} style={{ width: '100%', height: Math.round(W * 1.05) }} contentFit="cover" transition={150} /></View>;
}

/** 사진 여러 장, 이름은 사진 위에 — 좌/우 탭으로 넘김 (질문 카드 사이에 사진을 둘 때는 첫 장만) */
function PhotoHero({ user, photos }: { user: User; photos: string[] }) {
  const [pi, setPi] = useState(0);
  const tap = (x: number) => { if (photos.length < 2) return; setPi((p) => (x < W / 2 ? (p - 1 + photos.length) % photos.length : (p + 1) % photos.length)); };
  return (
    <Pressable onPress={(e) => tap(e.nativeEvent.locationX)} style={[tw`-mx-4 h-[440px] overflow-hidden`, { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: `hsl(${user.avatar.hue}, 60%, 75%)` }]}>
      {photos.length ? <Image source={img(photos[pi])} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={150} /> : <View style={tw`absolute inset-0 items-center justify-center`}><Text style={{ fontSize: 120 }}>{user.avatar.emoji}</Text></View>}
      <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 128 }} />
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(20,14,10,0.3)', 'rgba(20,14,10,0.9)']} locations={[0, 0.4, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 242 }} />
      {photos.length > 1 && <View style={[tw`absolute top-3 left-4 right-4 flex-row`, { gap: 4 }]}>{photos.map((_, i) => <View key={i} style={[tw`h-[3px] flex-1 rounded-full`, { backgroundColor: i === pi ? C.onPrimary : 'rgba(255,255,255,0.4)' }]} />)}</View>}
      {user.avatar.photoType !== 'face' && <View style={[tw`absolute top-6 left-4 rounded-full px-2.5 py-1`, { backgroundColor: 'rgba(0,0,0,0.35)' }]}><Text style={tw`text-white text-[11px]`}>{user.avatar.photoType === 'masked' ? t('얼굴 비공개') : t('뒷모습')}</Text></View>}
      <View pointerEvents="none" style={tw`absolute left-0 right-0 bottom-0 p-5 pb-12`}>
        <View style={[tw`flex-row items-end`, { gap: 8 }]}><Text style={tw`text-[40px] font-bold text-white leading-[44px]`}>{user.nickname}</Text><Text style={tw`text-[22px] text-white opacity-80 pb-1`}>{new Date().getFullYear() - user.birthYear + 1}</Text></View>
        <Text style={tw`mt-1.5 text-[13px] text-white opacity-90`}>{affiliationText(user)}</Text>
      </View>
    </Pressable>
  );
}

function Block({ label, visible, children, last }: { label: string; visible: boolean; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={tw`${last ? '' : 'mb-3'}`}>
      <Text style={tw`text-[11px] font-semibold text-ink-3 mb-1`}>{label}</Text>
      {visible ? children : <View style={tw`flex-row items-center`}><Lock size={12} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-3`}>{t('비공개 항목이에요')}</Text></View>}
    </View>
  );
}
