import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Inbox, MessageCircle, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { relativeTime } from '@core/lib/format';
import { CATEGORY_LABELS } from '@core/lib/labels';
import { proposalWhen } from '@core/lib/plans';
import type { ChatRoom } from '@core/types';
import { Avatar } from '@/components/ui';
import { Btn, EmptyState, IconTile, InfoNote, PersonCard, RowCard, SearchField, SegTabs } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { cn } from '@core/lib/cn';
import { SubScreen } from '@/pages/profile/shared';

const en = lang === 'en';
type Tab = 'all' | 'direct' | 'groups' | 'requests';

/** 예전 주소의 탭 (?tab=activity · org) 은 Groups 로 */
function tabOf(raw: string | null): Tab {
  if (raw === 'direct' || raw === 'requests') return raw;
  if (raw === 'groups' || raw === 'activity' || raw === 'org') return 'groups';
  return 'all';
}
const last = (r: ChatRoom) => r.messages[r.messages.length - 1];

/**
 * Messages (PDF S068) — SearchField, SegTabs All · Direct · Groups (주소 ?tab=), 줄: 얼굴 · 이름 · 마지막 메시지 · 시각.
 * 처음엔 늘 All — 예전엔 Direct 가 기본이라, 모임에 들어가 그룹 채팅이 생긴 직후 빈 Direct 탭이 열렸다 (AI 사용자 테스트).
 * 받은 친구 요청·만남 제안은 탭 대신 맨 위 한 줄 → ?tab=requests.
 */
export function ChatInboxPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const rooms = useAppStore((s) => s.chatRooms);
  const proposals = useAppStore((s) => s.proposals);
  const requests = useAppStore((s) => s.relationships.friendRequests);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const tab = tabOf(params.get('tab'));
  const me = v.me;
  const inProposals = proposals.filter((p) => p.toId === me.id && p.status === 'pending');
  const inRequests = requests.filter((r) => r.toId === me.id && r.status === 'pending');
  const reqCount = inProposals.length + inRequests.length;
  const unread = (r: ChatRoom) => r.messages.filter((m) => m.senderId !== me.id && !m.system && new Date(m.createdAt) > new Date(r.lastReadAt[me.id] ?? 0)).length;
  const nameOf = (r: ChatRoom) => (r.type === 'direct' ? v.userById(r.memberIds.find((m) => m !== me.id) ?? '')?.nickname : undefined) ?? r.title ?? (en ? 'Group chat' : '그룹 채팅');
  const mine = rooms.filter((r) => r.memberIds.includes(me.id)).sort((a, b) => (last(b)?.createdAt ?? b.createdAt).localeCompare(last(a)?.createdAt ?? a.createdAt));
  const s = q.trim().toLowerCase();
  const list = mine.filter((r) => (tab === 'all' || (tab === 'direct' ? r.type === 'direct' : r.type !== 'direct'))
    && (!s || nameOf(r).toLowerCase().includes(s) || r.messages.some((m) => !m.system && m.text.toLowerCase().includes(s))));
  const setTab = (k: string) => setParams(k === 'all' ? {} : { tab: k }, { replace: true });

  if (tab === 'requests') return (
    <SubScreen title={en ? 'Requests' : '받은 요청'}>
      {reqCount === 0 && <EmptyState icon={<Inbox size={28} />} tone="rose" title={en ? 'No requests right now' : '받은 요청이 없어요'} />}
      <div className="space-y-3">
        {inRequests.map((r) => { const u = v.userById(r.fromId); if (!u) return null; return (
          <PersonCard key={r.id} avatar={u.avatar} name={u.nickname} meta={en ? `Friend request · ${relativeTime(r.createdAt)}` : `친구 요청 · ${relativeTime(r.createdAt)}`} onClick={() => nav(`/users/${u.id}`)}
            action={<div className="flex gap-2">
              <Btn size="sm" variant="outline" onClick={() => run(() => api.relationships.respondFriendRequest(r.id, false))}>{en ? 'Decline' : '거절'}</Btn>
              <Btn size="sm" variant="outline" className="border-sel-line text-sel-fg" onClick={() => run(() => api.relationships.respondFriendRequest(r.id, true), en ? `You and ${u.nickname} are friends` : `${u.nickname}님과 친구가 되었어요`)}>{en ? 'Accept' : '수락'}</Btn>
            </div>} />
        ); })}
        {inProposals.map((p) => { const u = v.userById(p.fromId); if (!u) return null; return (
          <PersonCard key={p.id} avatar={u.avatar} name={u.nickname} meta={`${CATEGORY_LABELS[p.category]} · ${proposalWhen(p.when)}`} bio={`“${p.message}”`} onClick={() => nav(`/users/${u.id}`)}
            action={<div className="flex gap-2">
              <Btn size="sm" variant="outline" onClick={() => run(() => api.proposals.respond(p.id, false))}>{en ? 'Not now' : '다음에'}</Btn>
              <Btn size="sm" variant="outline" className="border-sel-line text-sel-fg" onClick={async () => { await run(() => api.proposals.respond(p.id, true), en ? 'Accepted — say hi!' : '수락했어요. 인사해 보세요!').catch(() => {}); setTab('direct'); }}>{en ? 'Sounds good' : '좋아요'}</Btn>
            </div>} />
        ); })}
      </div>
      {reqCount > 0 && <InfoNote className="mt-4">{en ? 'Declining doesn’t notify them.' : '거절해도 상대에게 알림이 가지 않아요.'}</InfoNote>}
    </SubScreen>
  );

  return (
    <SubScreen title={en ? 'Messages' : '메시지'}>
      <SearchField placeholder={en ? 'Search messages' : '메시지 찾기'} value={q} onChange={setQ} />
      <SegTabs className="-mx-4 px-2 mt-3" value={tab} onChange={setTab}
        tabs={[{ key: 'all', label: en ? 'All' : '전체' }, { key: 'direct', label: en ? 'Direct' : '1:1' }, { key: 'groups', label: en ? 'Groups' : '그룹' }]} />
      {reqCount > 0 && <RowCard className="mt-4" tone="rose" icon={<Inbox size={21} />} title={en ? `${reqCount} ${reqCount === 1 ? 'request' : 'requests'}` : `받은 요청 ${reqCount}`} sub={en ? 'Friend requests and meetup ideas' : '친구 요청과 만남 제안'} onClick={() => setTab('requests')} />}
      {list.length === 0 ? (
        s ? <p className="text-[14px] text-ink-3 text-center py-10">{en ? 'No messages match that.' : '찾는 대화가 없어요.'}</p>
          : <EmptyState icon={<MessageCircle size={28} />} title={en ? 'No messages yet' : '아직 대화가 없어요'}
              sub={tab === 'groups' ? (en ? 'Join a meetup and its group chat opens here.' : '모임에 들어가면 그룹 채팅이 여기에 열려요.') : (en ? 'Chats open once you’re connected — a friend, an accepted request or a meetup together.' : '친구가 되거나, 요청을 수락하거나, 같은 모임에 들어가면 대화가 열려요.')}
              action={{ label: tab === 'groups' ? (en ? 'Browse meetups' : '모임 보기') : (en ? 'Find people' : '사람 찾기'), onClick: () => nav(tab === 'groups' ? '/social/meetups' : '/social/people') }} />
      ) : (
        <div className="divide-y divide-line mt-1">
          {list.map((r) => {
            const other = r.type === 'direct' ? v.userById(r.memberIds.find((m) => m !== me.id) ?? '') : undefined;
            const lm = last(r);
            const n = unread(r);
            return (
              <button key={r.id} onClick={() => nav(`/chats/${r.id}`)} className="w-full flex items-center gap-3.5 py-4 text-left press">
                {other ? <Avatar emoji={other.avatar.emoji} hue={other.avatar.hue} url={other.avatar.url} size={48} />
                  : <IconTile tone={r.type === 'org' ? 'mint' : 'rose'} size={48} className="rounded-full">{r.type === 'org' ? <Building2 size={21} /> : <Users size={21} />}</IconTile>}
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-bold truncate">{nameOf(r)}</span>
                  <span className={cn('block text-[13.5px] truncate mt-0.5', n > 0 ? 'text-ink' : 'text-ink-3')}>{lm ? (lm.senderId === me.id && !lm.system ? `${en ? 'You' : '나'}: ${lm.text}` : lm.text) : (en ? 'Say hi' : '인사해 보세요')}</span>
                </span>
                <span className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[12px] text-ink-3">{lm ? relativeTime(lm.createdAt) : ''}</span>
                  {other?.sample && <span className="text-[11px] text-ink-3">{en ? 'Sample' : '예시'}</span>}
                  {n > 0 && <span className="h-2.5 w-2.5 rounded-full bg-sel" aria-label={en ? 'Unread' : '안 읽음'} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </SubScreen>
  );
}
