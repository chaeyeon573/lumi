import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Users, Building2, Inbox, MessageCircle, Check, X, Search, Plus } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { whosFree } from '@core/lib/social';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { displayAvatar, displayName } from '@core/lib/deleted';
import { relativeTime } from '@core/lib/format';
import { CATEGORY_EMOJI, CATEGORY_LABELS } from '@core/lib/labels';
import type { ChatRoom } from '@core/types';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Empty, Button, Tag, Chip, Loading, C } from '@/ui';
import { ErrorState } from '@/components/b_States';
import { NoteBubble } from '@/v2/PromptParts';
import { isAlumniStage } from '@core/lib/network';

type Tab = 'direct' | 'activity' | 'org' | 'requests';
const last = (r: ChatRoom) => r.messages[r.messages.length - 1];

/** 메시지 인박스 — 개인 / 활동 / 단체 / 요청 (웹 ChatInboxPage) */
export default function ChatInboxScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>((params.tab as Tab) ?? 'direct');
  useEffect(() => { if (params.tab) setTab(params.tab as Tab); }, [params.tab]);
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
  // 공강 기반 "지금 시간 되는 사람"은 재학생에게만 (졸업생에게는 시간표가 없다)
  const free = useMemo(() => (isAlumniStage(me) ? [] : whosFree(snap, me, (u) => v.canSeeField(u, 'timetable'))), [snap, me, v]);

  const avatarOf = (id: string) => { const u = v.userById(id); return { emoji: u?.avatar.emoji ?? '👤', hue: u?.avatar.hue ?? 200, url: u?.avatar.url }; };

  return (
    <Screen title={lang === 'en' ? 'Direct Messages' : t('메시지')}>
      <View style={tw`pt-2`}>
        <Pressable onPress={() => nav('/search?tab=people')} style={tw`h-12 rounded-full bg-surface-2 flex-row items-center px-4`}><Search size={18} color={C.ink3} /><Text style={tw`ml-2 text-[15px] text-ink-3`}>{lang === 'en' ? 'Search chats or mutuals…' : '대화·친구 검색'}</Text></Pressable>
        {tab === 'direct' && free.length > 0 && (
          <View style={tw`mt-4`}>
            <View style={tw`flex-row items-center justify-between mb-2`}><Text style={tw`text-[12px] font-bold tracking-wide text-ink-3 uppercase`}>{lang === 'en' ? 'Free right now' : '지금 시간 되는 사람'}</Text><Text style={tw`text-[13px] text-verify`}>{free.length}{lang === 'en' ? ' around campus' : '명'}</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4`} contentContainerStyle={tw`px-4`}>
              {free.slice(0, 8).map((p) => (
                <Pressable key={p.u.id} onPress={() => nav(`/users/${p.u.id}?propose=1&cat=${p.category ?? 'coffee'}`)} style={tw`items-center w-[64px] mr-4`}>
                  <View><Avatar emoji={p.u.avatar.emoji} hue={p.u.avatar.hue} url={p.u.avatar.url} size={60} /><View style={tw`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-accent border-2 border-white`} /></View>
                  <Text numberOfLines={1} style={tw`mt-1.5 text-[12px] text-primary`}>{p.u.nickname}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => nav('/create/activity?kind=personal&now=1')} style={tw`items-center w-[64px]`}><View style={tw`h-[60px] w-[60px] rounded-full bg-surface-2 items-center justify-center`}><Plus size={22} color={C.primary} /></View><Text style={tw`mt-1.5 text-[12px] text-ink-3`}>{lang === 'en' ? 'You' : '나'}</Text></Pressable>
            </ScrollView>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4 mt-4`} contentContainerStyle={tw`px-4`}>
          {([['direct', t('개인')], ['activity', t('활동')], ['org', t('단체')], ['requests', reqCount ? `${t('요청 ')}${reqCount}` : t('요청')]] as [Tab, string][]).map(([k, l]) => <Chip key={k} size="sm" active={tab === k} onPress={() => setTab(k)}>{l}</Chip>)}
        </ScrollView>
      </View>
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && tab !== 'requests' && (
        <View style={tw`py-3`}>
          {list.length === 0 ? (
            <Empty
              title={tab === 'direct' ? t('아직 개인 채팅이 없어요') : tab === 'activity' ? t('참가 중인 활동 채팅이 없어요') : t('조직 채팅이 없어요')}
              description={tab === 'direct' ? t('친구 요청 수락, 상호 관심, 활동 참가 승인 중 하나가 성립하면 대화를 시작할 수 있어요.') : tab === 'activity' ? t('활동에 참가하면 그룹 채팅방이 열려요.') : t('동아리·조직에 가입하거나 팔로우해보세요.')}
              action={<Button variant="outline" onPress={() => nav(tab === 'direct' ? '/people' : tab === 'activity' ? '/meet' : '/meet?tab=groups')}>{t('둘러보기')}</Button>} />
          ) : (
            <View>
              {list.map((r, idx) => {
                const other = r.type === 'direct' ? v.userById(r.memberIds.find((m) => m !== me.id)!) : undefined;
                const org = r.orgId ? v.orgById(r.orgId) : undefined;
                const lm = last(r);
                const n = unread(r);
                const avatar = (other ? displayAvatar(other) : undefined) ?? org?.logo ?? { emoji: r.type === 'activity' ? '🗓️' : '🏛️', hue: 220 };
                return (
                  <Pressable key={r.id} onPress={() => nav(`/chats/${r.id}`)} style={tw`flex-row items-center py-3.5 ${idx === 0 ? '' : 'border-t border-line'}`}>
                    {r.type === 'direct' ? <Avatar emoji={avatar.emoji} hue={avatar.hue} url={avatar.url} size={52} /> : <View style={tw`h-[52px] w-[52px] rounded-full bg-primary items-center justify-center`}>{r.type === 'activity' ? <Users size={20} color={C.onPrimary} /> : <Building2 size={20} color={C.onPrimary} />}</View>}
                    <View style={tw`flex-1 min-w-0 flex-row items-center ml-3`}>
                      <Text numberOfLines={1} style={tw`text-[16px] font-semibold text-ink max-w-[45%]`}>{other ? displayName(other) : r.title}</Text>
                      <Text numberOfLines={1} style={tw`ml-2 text-[15px] shrink ${n > 0 ? 'text-ink' : 'text-ink-2'}`}>· {lm?.text ?? t('대화를 시작해보세요')}</Text>
                    </View>
                    <Text style={tw`ml-2 text-[12px] text-ink-3`}>{lm ? relativeTime(lm.createdAt) : ''}</Text>
                    {n > 0 && <View style={tw`ml-2 h-2.5 w-2.5 rounded-full bg-accent`} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
      {status === 'ready' && tab === 'requests' && (
        <View style={tw`py-3`}>
          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center mb-2`}><Inbox size={15} color={C.ink} /><Text style={tw`ml-1.5 text-[14px] font-bold text-ink`}>{t('받은 활동 제안')} {inProposals.length}</Text></View>
            {inProposals.length === 0 ? <View style={tw`card p-4`}><Text style={tw`text-[13px] text-ink-3`}>{t('받은 제안이 없어요.')}</Text></View> : inProposals.map((p) => { const u = v.userById(p.fromId); const a = avatarOf(p.fromId); return (
              <View key={p.id} style={tw`card p-3.5 mb-2`}>
                <Pressable onPress={() => nav(`/users/${p.fromId}`)} style={tw`flex-row items-center`}><Avatar emoji={a.emoji} hue={a.hue} url={a.url} size={40} /><View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-bold text-ink`}>{u?.nickname}</Text><Text style={tw`text-[12px] text-ink-3`}>{CATEGORY_EMOJI[p.category]} {CATEGORY_LABELS[p.category]} · {p.when}</Text></View><Tag>{relativeTime(p.createdAt)}</Tag></Pressable>
                <View style={tw`mt-2 rounded-xl bg-surface-2 px-3 py-2`}><Text style={tw`text-[13px] text-ink`}>“{p.message}”</Text></View>
                <View style={tw`flex-row mt-3`}><Button full variant="outline" icon={<X size={15} color={C.ink2} />} onPress={() => run(() => api.proposals.respond(p.id, false))}>{t('이번에는 어려워요')}</Button><View style={tw`w-2`} /><Button full icon={<Check size={15} color={C.onPrimary} />} onPress={async () => { await run(() => api.proposals.respond(p.id, true), t('제안을 수락했어요. 대화를 시작해요!')); setTab('direct'); }}>{t('좋아요')}</Button></View>
              </View>
            ); })}
          </View>
          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center mb-2`}><Users size={15} color={C.ink} /><Text style={tw`ml-1.5 text-[14px] font-bold text-ink`}>{t('받은 친구 요청')} {inRequests.length}</Text></View>
            {inRequests.length === 0 ? <View style={tw`card p-4`}><Text style={tw`text-[13px] text-ink-3`}>{t('받은 친구 요청이 없어요.')}</Text></View> : inRequests.map((q) => { const u = v.userById(q.fromId); const a = avatarOf(q.fromId); return (
              <View key={q.id} style={tw`card p-3.5 mb-2`}>
                <View style={tw`flex-row items-center`}>
                  <Pressable onPress={() => nav(`/users/${q.fromId}`)}><Avatar emoji={a.emoji} hue={a.hue} url={a.url} size={40} /></Pressable>
                  <View style={tw`flex-1 min-w-0 ml-3`}><Text style={tw`text-[14px] font-bold text-ink`}>{u?.nickname}</Text><Text style={tw`text-[12px] text-ink-3`}>{relativeTime(q.createdAt)}</Text></View>
                  <Button size="sm" variant="outline" onPress={() => run(() => api.relationships.respondFriendRequest(q.id, false))}>{t('거절')}</Button>
                  <View style={tw`w-2`} />
                  <Button size="sm" onPress={() => run(() => api.relationships.respondFriendRequest(q.id, true), `${u?.nickname}${t('님과 친구가 되었어요!')}`)}>{t('수락')}</Button>
                </View>
                <NoteBubble note={q.note} />
              </View>
            ); })}
            <Text style={tw`text-[11px] text-ink-3 mt-1`}>{t('거절해도 상대에게 알림이 가지 않아요.')}</Text>
          </View>
          {(outProposals.length > 0 || outRequests.length > 0) && (
            <View>
              <View style={tw`flex-row items-center mb-2`}><MessageCircle size={15} color={C.ink} /><Text style={tw`ml-1.5 text-[14px] font-bold text-ink`}>{t('보낸 요청')}</Text></View>
              <View style={tw`card`}>
                {outRequests.map((q, i) => { const u = v.userById(q.toId); const a = avatarOf(q.toId); return <View key={q.id} style={tw`flex-row items-center px-3.5 py-3 ${i === 0 ? '' : 'border-t border-line'}`}><Avatar emoji={a.emoji} hue={a.hue} url={a.url} size={36} /><Text style={tw`flex-1 ml-3 text-[13px] text-ink`}><Text style={tw`font-bold`}>{u?.nickname}</Text>{t('님에게 친구 요청')}</Text><Tag>{t('대기 중')}</Tag></View>; })}
                {outProposals.map((p, i) => { const u = v.userById(p.toId); const a = avatarOf(p.toId); return <View key={p.id} style={tw`flex-row items-center px-3.5 py-3 ${i === 0 && outRequests.length === 0 ? '' : 'border-t border-line'}`}><Avatar emoji={a.emoji} hue={a.hue} url={a.url} size={36} /><Text style={tw`flex-1 ml-3 text-[13px] text-ink`}><Text style={tw`font-bold`}>{u?.nickname}</Text>{t('님에게')} {CATEGORY_LABELS[p.category]} {t('제안')}</Text>{p.status === 'pending' ? <Tag>{t('대기 중')}</Tag> : <Tag tone="neutral">{t('이번 활동은 성사되지 않았어요')}</Tag>}</View>; })}
              </View>
              <Text style={tw`text-[11px] text-ink-3 mt-1`}>{t('읽음 여부와 거절 사유는 표시되지 않아요.')}</Text>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
