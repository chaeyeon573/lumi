import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Users, Flag, Ban, CalendarPlus, UserMinus, UserX } from 'lucide-react';
import { lang } from '@core/i18n';
import { api, type Patch } from '@core/api';
import { Avatar, BottomSheet, Dialog } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { BackHeader, Btn, Chip, ChipRow, RowCard, SectionHeader, InfoNote, EmptyState, cardCls } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { questionById } from '@core/data/prompts';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import { MeetupItem, notOver } from '@/components/social/MeetupBits';
import { commonGround, personMeta } from '@/components/people/PeopleBits';

const en = lang === 'en';
type PlanTab = 'upcoming' | 'past' | 'created';

/**
 * 공개 프로필 (PDF S054) — 얼굴 · 이름 · 학교 · "Design · Second-year" · 한 줄, [Add Friend][Message], 그룹·함께 아는 친구 수,
 * Get to know me, 함께 가진 것, My Communities, My Events & Meetups (보이는 확정된 약속만).
 * 큰 사진·하트·나이 없음 (PRODUCT_TASTE). 공개 범위 밖 항목은 서버가 보내지 않는다 — 없는 것은 그리지 않는다.
 */
export function PersonPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const parts = useAppStore((s) => s.participations);
  const user = v.userById(id!);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [tab, setTab] = useState<PlanTab>('upcoming');
  const [busy, setBusy] = useState(false);
  const plans = useMemo(() => {
    if (!user) return { upcoming: [], past: [], created: [] };
    const confirmed = (aid: string) => parts.some((p) => p.activityId === aid && p.userId === user.id && p.status === 'approved');
    const theirs = v.visibleActivities.filter((a) => a.hostId === user.id || confirmed(a.id));
    const byDate = (x: typeof theirs) => [...x].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
    return {
      upcoming: byDate(theirs.filter((a) => notOver(a))),
      past: byDate(theirs.filter((a) => !notOver(a))).reverse().slice(0, 6),
      created: byDate(theirs.filter((a) => a.hostId === user.id && notOver(a))),
    };
  }, [user, parts, v.visibleActivities]);

  // 예전 주소 ?propose=1 (다른 화면의 "같이하기") → 모임 제안 화면
  if (user && params.get('propose')) { const q = new URLSearchParams(params); q.delete('propose'); return <Navigate to={`/users/${user.id}/suggest${q.toString() ? `?${q}` : ''}`} replace />; }
  if (user && user.id === v.me.id) return <Navigate to="/profile" replace />;
  if (!user || v.isBlocked(user.id) && !v.hasBlocked(user.id)) return <div className="min-h-full bg-bg"><BackHeader /><EmptyState icon={<UserX size={30} />} title={en ? 'This profile isn’t available' : '볼 수 없는 프로필이에요'} /></div>;
  if (v.hasBlocked(user.id)) return (
    <div className="min-h-full bg-bg"><BackHeader />
      <EmptyState icon={<Ban size={30} />} title={en ? 'You blocked this person' : '차단한 사람이에요'} sub={en ? 'Unblock to see their profile again.' : '차단을 풀면 프로필을 다시 볼 수 있어요.'}
        action={{ label: en ? 'Unblock' : '차단 해제', onClick: () => run(() => api.relationships.unblock(v.me.id, user.id), en ? 'Unblocked.' : '차단을 해제했어요.') }} />
    </div>
  );

  const act = async (fn: () => Promise<Patch>, ok?: string) => { setBusy(true); try { await run(fn, ok); } catch { /* toast */ } finally { setBusy(false); } };
  const openChat = async () => { setBusy(true); try { const r = await run(() => api.chats.openDirect(v.me.id, user.id)); nav(`/chats/${r.room.id}`); } catch { /* toast */ } finally { setBusy(false); } };
  const friend = v.isFriend(user.id); const out = v.pendingOut(user.id); const inc = v.pendingIn(user.id);
  const msg = v.canMessage(user.id);
  const suggest = () => nav(`/users/${user.id}/suggest`);
  const school = user.affiliation.type === 'university' ? user.affiliation.schoolName : user.affiliation.companyName;
  const bio = v.canSeeField(user, 'bio') ? user.bio?.trim() : '';
  const prompt = v.canSeeField(user, 'prompts') ? (user.prompts ?? []).find((p) => p.answer.trim()) : undefined;
  const groups = orgs.filter((o) => o.memberIds.includes(user.id) || o.adminIds.includes(user.id));
  const followed = orgs.filter((o) => o.followerIds.includes(user.id) && !groups.includes(o));
  const mutual = user.mutualFriendCount ?? 0;
  const common = commonGround(v.me, user, { rosters: v.snap.classRosters, orgs });

  // 버튼 두 개 — primary 는 하나
  const first = friend ? (msg.ok ? <Btn full loading={busy} onClick={openChat}>{en ? 'Message' : '메시지'}</Btn> : <Btn full onClick={suggest}>{en ? 'Suggest a meetup' : '모임 제안'}</Btn>)
    : inc ? <Btn full loading={busy} onClick={() => act(() => api.relationships.respondFriendRequest(inc.id, true), en ? 'You’re friends now.' : '친구가 되었어요!')}>{en ? 'Accept' : '수락'}</Btn>
    : out ? <Btn full variant="outline" loading={busy} onClick={() => act(() => api.relationships.cancelFriendRequest(out.id), en ? 'Request canceled.' : '요청을 취소했어요.')}>{en ? 'Requested' : '요청함'}</Btn>
    : <Btn full loading={busy} onClick={() => act(() => api.relationships.sendFriendRequest(v.me.id, user.id), en ? 'Friend request sent.' : '친구 요청을 보냈어요.')}>{en ? 'Add Friend' : '친구 추가'}</Btn>;
  const primaryUsed = !(out && !friend);
  const second = friend ? (msg.ok ? <Btn full variant="outline" onClick={suggest}>{en ? 'Suggest a meetup' : '모임 제안'}</Btn> : <Btn full variant="outline" disabled>{en ? 'Friends' : '친구'}</Btn>)
    : msg.ok ? <Btn full variant={primaryUsed ? 'outline' : 'primary'} loading={busy} onClick={openChat}>{en ? 'Message' : '메시지'}</Btn>
    : <Btn full variant={primaryUsed ? 'outline' : 'primary'} onClick={suggest}>{en ? 'Suggest a meetup' : '모임 제안'}</Btn>;
  const list = plans[tab];

  return (
    <div className="min-h-full bg-bg pb-10">
      <BackHeader onMore={() => setMenu(true)} />
      <div className="px-4">
        <div className="flex items-center gap-4 pt-1">
          <Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={88} />
          <div className="min-w-0">
            <h1 className="ha-title truncate">{user.nickname}</h1>
            {school && <p className="text-[13.5px] text-ink-3 mt-1 truncate">{school}</p>}
            <p className="text-[13.5px] text-ink-3 truncate">{[user.sample ? (en ? 'Sample profile' : '예시 프로필') : '', personMeta(user)].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {bio && <p className="text-[15px] text-ink mt-4 leading-snug">{bio}</p>}
        <div className="grid grid-cols-2 gap-3 mt-4">{first}{second}</div>
        {!msg.ok && !friend && <p className="text-[12.5px] text-ink-3 mt-2">{msg.reason}</p>}
        <div className="flex gap-5 mt-4 text-[14px] text-ink-2 empty:hidden">
          {groups.length > 0 && <span><b className="text-ink">{groups.length}</b> {en ? (groups.length === 1 ? 'Group' : 'Groups') : '그룹'}</span>}
          {mutual > 0 && <span><b className="text-ink">{mutual}</b> {en ? (mutual === 1 ? 'mutual friend' : 'mutual friends') : '함께 아는 친구'}</span>}
          {friend && <span className="text-sel-fg font-semibold">{en ? 'Friends' : '친구'}</span>}
        </div>

        {prompt && (
          <section className="mt-7">
            <SectionHeader title={en ? 'Get to know me' : '나를 소개해요'} />
            <div className={`${cardCls} p-5`}>
              <p className="text-[12.5px] text-ink-3">{questionById(prompt.questionId)?.text}</p>
              <p className="text-[18px] font-bold leading-snug mt-1.5">{prompt.answer}</p>
            </div>
          </section>
        )}
        {common.length > 0 && (
          <section className="mt-7">
            <SectionHeader title={en ? 'Something in common' : '함께 가진 것'} />
            <ChipRow wrap>{common.map((c) => <Chip key={c.kind}>{c.text}</Chip>)}</ChipRow>
          </section>
        )}
        {(groups.length > 0 || followed.length > 0) && (
          <section className="mt-7">
            <SectionHeader title={en ? 'My Communities' : '커뮤니티'} />
            <div className="space-y-3">
              {[...groups, ...followed].slice(0, 4).map((o) => (
                <RowCard key={o.id} tone="rose" icon={<Users size={20} />} title={o.name} sub={[groups.includes(o) ? (o.adminIds.includes(user.id) ? (en ? 'Officer' : '운영진') : (en ? 'Member' : '회원')) : (en ? 'Followed' : '팔로우'), ORG_TYPE_LABELS[o.type]].join(' · ')} onClick={() => nav(`/orgs/${o.id}`)} />
              ))}
            </div>
          </section>
        )}
        <section className="mt-7">
          <SectionHeader title={en ? 'My Events & Meetups' : '모임과 행사'} />
          <ChipRow>
            {([['upcoming', en ? 'Upcoming' : '예정'], ['past', en ? 'Past' : '지난'], ['created', en ? 'Created' : '만든']] as const).map(([k, l]) => <Chip key={k} active={tab === k} onClick={() => setTab(k)}>{l}</Chip>)}
          </ChipRow>
          <div className="space-y-3 mt-3">{list.map((a) => <MeetupItem key={a.id} a={a} />)}</div>
          <p className="text-[13px] text-ink-3 mt-3">{list.length ? (en ? 'Visible, confirmed plans only.' : '나에게 보이는 확정된 약속만.') : (en ? 'Nothing here you can see — visible, confirmed plans only.' : '보이는 확정된 약속이 없어요.')}</p>
        </section>
        <InfoNote className="mt-6">{en ? 'Only what they chose to share with you is shown.' : '이 사람이 나에게 보여 주기로 한 것만 보여요.'}</InfoNote>
      </div>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={user.nickname}>
        <div className="space-y-1">
          <SheetItem icon={<CalendarPlus size={18} />} label={en ? 'Suggest a meetup' : '모임 제안'} onClick={() => { setMenu(false); suggest(); }} />
          {friend && <SheetItem icon={<UserMinus size={18} />} label={en ? 'Remove friend' : '친구 끊기'} onClick={() => { setMenu(false); void act(() => api.relationships.unfriend(v.me.id, user.id), en ? 'Removed.' : '친구를 끊었어요.'); }} />}
          <SheetItem icon={<Flag size={18} />} label={en ? 'Report' : '신고'} danger onClick={() => { setMenu(false); setReport(true); }} />
          <SheetItem icon={<Ban size={18} />} label={en ? 'Block' : '차단'} danger onClick={() => { setMenu(false); setBlockOpen(true); }} />
        </div>
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="user" targetId={user.id} />
      <Dialog open={blockOpen} onClose={() => setBlockOpen(false)} title={en ? `Block ${user.nickname}?` : `${user.nickname}님을 차단할까요?`} description={en ? 'You won’t see each other’s profiles, plans or posts, and you can’t message. They aren’t notified.' : '서로의 프로필·약속·글이 안 보이고 메시지를 주고받을 수 없어요. 상대에게 알림은 가지 않아요.'}>
        <Btn variant="outline" full onClick={() => setBlockOpen(false)}>{en ? 'Cancel' : '취소'}</Btn>
        <Btn variant="danger" full onClick={async () => { setBlockOpen(false); try { await run(() => api.relationships.block(v.me.id, user.id), en ? 'Blocked.' : '차단했어요.'); nav(-1); } catch { /* toast */ } }}>{en ? 'Block' : '차단'}</Btn>
      </Dialog>
    </div>
  );
}
