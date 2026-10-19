import { useNavigate, useSearchParams } from 'react-router-dom';
import { t } from '@core/i18n';
import { Users, Building2, Inbox, MessageCircle, Check, X, Search, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { whosFree } from '@core/lib/social';
import { lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, EmptyState, Button, Tag, CardSkeleton, ErrorState, Chip } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { relativeTime } from '@core/lib/format';
import { CATEGORY_EMOJI, CATEGORY_LABELS } from '@core/lib/labels';
import type { ChatRoom } from '@core/types';
import { cn } from '@core/lib/cn';
import { SampleTag } from '@/components/ui/SampleTag';
import { proposalWhen } from '@core/lib/plans';

type Tab = 'direct' | 'activity' | 'org' | 'requests';

export function ChatInboxPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'direct') as Tab;
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const rooms = useAppStore((s) => s.chatRooms);
  const proposals = useAppStore((s) => s.proposals);
  const requests = useAppStore((s) => s.relationships.friendRequests);
  const me = v.me;
  const myRooms = rooms.filter((r) => r.memberIds.includes(me.id)).sort((a, b) => (last(b)?.createdAt ?? b.createdAt).localeCompare(last(a)?.createdAt ?? a.createdAt));
  const inProposals = proposals.filter((p) => p.toId === me.id && p.status === 'pending');
  const outProposals = proposals.filter((p) => p.fromId === me.id && p.status !== 'accepted');
  const inRequests = requests.filter((q) => q.toId === me.id && q.status === 'pending');
  const outRequests = requests.filter((q) => q.fromId === me.id && q.status === 'pending');
  const unread = (r: ChatRoom) => r.messages.filter((m) => m.senderId !== me.id && !m.system && new Date(m.createdAt) > new Date(r.lastReadAt[me.id] ?? 0)).length;

  const list = myRooms.filter((r) => r.type === tab);
  const reqCount = inProposals.length + inRequests.length;
  const orgs = useAppStore((s) => s.organizations);
  const snap = useMemo(() => ({ ...v.snap, organizations: orgs }), [v.snap, orgs]);
  const free = useMemo(() => whosFree(snap, me, (u) => v.canSeeField(u, 'timetable')), [snap, me, v]);

  return (
    <div className="min-h-full">
      <TopBar back title={lang === 'en' ? 'Direct Messages' : t('메시지')} bell />
      <div className="px-4 pt-2 space-y-4">
        <button onClick={() => nav('/search?tab=people')} className="w-full h-12 rounded-full bg-surface-2 flex items-center gap-2 px-4 text-[15px] text-ink-3"><Search size={18} />{lang === 'en' ? 'Search chats or mutuals…' : '대화·친구 검색'}</button>
        {tab === 'direct' && free.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-bold tracking-wide text-ink-3 uppercase">{lang === 'en' ? 'Free right now' : '지금 시간 되는 사람'}</span><span className="text-[13px] text-verify">{free.length}{lang === 'en' ? ' around campus' : '명'}</span></div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
              {free.slice(0, 8).map((p) => <button key={p.u.id} onClick={() => nav(`/users/${p.u.id}?propose=1&cat=${p.category ?? 'coffee'}`)} className="flex flex-col items-center gap-1.5 shrink-0 w-[64px]"><span className="relative"><Avatar emoji={p.u.avatar.emoji} hue={p.u.avatar.hue} url={p.u.avatar.url} size={60} /><span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-accent ring-2 ring-white" /></span><span className="text-[12px] text-primary truncate max-w-full">{p.u.nickname}</span>{p.u.sample && <SampleTag className="h-4 mr-0 px-1 text-[9px] -mt-1" />}</button>)}
              <button onClick={() => nav('/create/activity?kind=personal&now=1')} className="flex flex-col items-center gap-1.5 shrink-0 w-[64px]"><span className="h-[60px] w-[60px] rounded-full bg-surface-2 grid place-items-center text-primary"><Plus size={22} /></span><span className="text-[12px] text-ink-3">{lang === 'en' ? 'You' : '나'}</span></button>
            </div>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">{([['direct', t('개인')], ['activity', t('활동')], ['org', t('단체')], ['requests', reqCount ? `${t('요청 ')}${reqCount}` : t('요청')]] as [Tab, string][]).map(([k, l]) => <Chip key={k} size="sm" active={tab === k} onClick={() => setParams({ tab: k })}>{l}</Chip>)}</div>
      </div>
      {status === 'loading' && <CardSkeleton count={2} />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && tab !== 'requests' && (
        <div className="px-4 py-3">
          {list.length === 0 ? (
            <EmptyState emoji={tab === 'direct' ? '💬' : tab === 'activity' ? '🗓️' : '🏛️'}
              title={tab === 'direct' ? t('아직 개인 채팅이 없어요') : tab === 'activity' ? t('참가 중인 활동 채팅이 없어요') : t('조직 채팅이 없어요')}
              description={tab === 'direct' ? t('친구 요청 수락, 상호 관심, 활동 참가 승인 중 하나가 성립하면 대화를 시작할 수 있어요.') : tab === 'activity' ? t('활동에 참가하면 그룹 채팅방이 열려요.') : t('동아리·조직에 가입하거나 팔로우해보세요.')}
              action={<Button variant="outline" onClick={() => nav(tab === 'direct' ? '/' : tab === 'activity' ? '/discover' : '/community')}>{t('둘러보기')}</Button>} />
          ) : (
            <div className="divide-y divide-line">
              {list.map((r) => {
                const other = r.type === 'direct' ? v.userById(r.memberIds.find((m) => m !== me.id)!) : undefined;
                const org = r.orgId ? v.orgById(r.orgId) : undefined;
                const lm = last(r);
                const n = unread(r);
                const avatar = other?.avatar ?? org?.logo ?? { emoji: r.type === 'activity' ? '🗓️' : '🏛️', hue: 220 };
                return (
                  <button key={r.id} onClick={() => nav(`/chats/${r.id}`)} className="w-full flex items-center gap-3 py-3.5 text-left press">
                    {r.type === 'direct' ? <Avatar emoji={avatar.emoji} hue={avatar.hue} url={avatar.url} size={52} /> : <span className="h-[52px] w-[52px] rounded-full bg-primary text-white grid place-items-center shrink-0">{r.type === 'activity' ? <Users size={20} /> : <Building2 size={20} />}</span>}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {other?.sample && <SampleTag className="shrink-0 mr-0" />}<span className={cn('text-[16px] font-semibold text-primary truncate shrink-0 max-w-[45%]')}>{other?.nickname ?? r.title}</span>
                      <span className={cn('text-[15px] truncate', n > 0 ? 'text-ink' : 'text-ink-2')}>· {lm?.text ?? t('대화를 시작해보세요')}</span>
                    </div>
                    <span className="text-[12px] text-ink-3 shrink-0">{lm ? relativeTime(lm.createdAt) : ''}</span>
                    {n > 0 && <span className="h-2.5 w-2.5 rounded-full bg-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {status === 'ready' && tab === 'requests' && (
        <div className="px-4 py-3 space-y-4">
          {/* 받은 게 없으면 빈 칸 두 개(“0”) 대신 한 줄 */}
          {inProposals.length === 0 && inRequests.length === 0 && <div className="card p-4 text-[13px] text-ink-3">{t('받은 요청이 없어요.')}</div>}
          {inProposals.length > 0 && <section>
            <h2 className="text-[14px] font-bold mb-2 flex items-center gap-1.5"><Inbox size={15} />{t('받은 활동 제안')} {inProposals.length}</h2>
            {inProposals.map((p) => { const u = v.userById(p.fromId); return (
              <div key={p.id} className="card p-3.5 mb-2">
                <button onClick={() => nav(`/users/${p.fromId}`)} className="flex items-center gap-3 text-left w-full"><Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={40} /><div className="flex-1"><b className="text-[14px]">{u?.nickname}</b><div className="text-[12px] text-ink-3">{CATEGORY_EMOJI[p.category]} {CATEGORY_LABELS[p.category]} · {proposalWhen(p.when)}</div></div><Tag>{relativeTime(p.createdAt)}</Tag></button>
                <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-[13px]">“{p.message}”</p>
                <div className="flex gap-2 mt-3"><Button full variant="outline" icon={<X size={15} />} onClick={() => run(() => api.proposals.respond(p.id, false))}>{t('이번에는 어려워요')}</Button><Button full icon={<Check size={15} />} onClick={async () => { await run(() => api.proposals.respond(p.id, true), t('제안을 수락했어요. 대화를 시작해요!')); setParams({ tab: 'direct' }); }}>{t('좋아요')}</Button></div>
              </div>
            ); })}
          </section>}
          {inRequests.length > 0 && <section>
            <h2 className="text-[14px] font-bold mb-2 flex items-center gap-1.5"><Users size={15} />{t('받은 친구 요청')} {inRequests.length}</h2>
            {inRequests.map((q) => { const u = v.userById(q.fromId); return (
              <div key={q.id} className="card p-3.5 mb-2 flex items-center gap-3">
                <button onClick={() => nav(`/users/${q.fromId}`)}><Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={40} /></button>
                <div className="flex-1 min-w-0"><b className="text-[14px]">{u?.nickname}</b><div className="text-[12px] text-ink-3">{relativeTime(q.createdAt)}</div></div>
                <Button size="sm" variant="outline" onClick={() => run(() => api.relationships.respondFriendRequest(q.id, false))}>{t('거절')}</Button>
                <Button size="sm" onClick={() => run(() => api.relationships.respondFriendRequest(q.id, true), `${u?.nickname}${t('님과 친구가 되었어요!')}`)}>{t('수락')}</Button>
              </div>
            ); })}
            <p className="text-[11px] text-ink-3 mt-1">{t('거절해도 상대에게 알림이 가지 않아요.')}</p>
          </section>}
          {(outProposals.length > 0 || outRequests.length > 0) && (
            <section>
              <h2 className="text-[14px] font-bold mb-2 flex items-center gap-1.5"><MessageCircle size={15} />{t('보낸 요청')}</h2>
              <div className="card divide-y divide-line">
                {outRequests.map((q) => { const u = v.userById(q.toId); return <div key={q.id} className="flex items-center gap-3 px-3.5 py-3"><Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={36} /><div className="flex-1 text-[13px]"><b>{u?.nickname}</b>{t('님에게 친구 요청')}</div><Tag>{t('대기 중')}</Tag></div>; })}
                {outProposals.map((p) => { const u = v.userById(p.toId); return <div key={p.id} className="flex items-center gap-3 px-3.5 py-3"><Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={36} /><div className="flex-1 text-[13px]"><b>{u?.nickname}</b>{t('님에게')} {CATEGORY_LABELS[p.category]} {t('제안')}</div>{p.status === 'pending' ? <Tag>{t('대기 중')}</Tag> : <Tag tone="neutral">{t('이번 활동은 성사되지 않았어요')}</Tag>}</div>; })}
              </div>
              <p className="text-[11px] text-ink-3 mt-1">{t('읽음 여부와 거절 사유는 표시되지 않아요.')}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function last(r: ChatRoom) { return r.messages[r.messages.length - 1]; }
