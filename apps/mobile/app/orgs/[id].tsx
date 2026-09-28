import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Users, Megaphone, CalendarDays, Bell, MessageCircle, ExternalLink, ShieldCheck, PenSquare, Crown } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import { relativeTime, todayISO } from '@core/lib/format';
import { isTeamActivity } from '@core/lib/discover';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Screen, Avatar, Button, Cover, Tag, Empty, Chip, ChipRow, C } from '@/ui';
import { PostCard } from '@/components/PostCard';
import { ActivityRow, TeamCard, OppRow } from '@/components/a_shared';
import { OrgPostTypeSheet } from '@/components/a_OrgPostTypeSheet';

type Tab = 'about' | 'posts' | 'events' | 'recruit' | 'members';

/** 조직 페이지: 소개 | 게시물 | 행사 | 모집 | 멤버 (웹 OrgPage) */
export default function OrgScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [tab, setTab] = useState<Tab>((tabParam as Tab) || 'about');
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const schools = useAppStore((s) => s.schools);
  const rooms = useAppStore((s) => s.chatRooms);
  const opps = useAppStore((s) => s.opportunities);
  const [post, setPost] = useState(false);
  const org = orgs.find((o) => o.id === id);
  if (!org) return <Screen title={t('조직')}><Empty title={`🏛️ ${t('조직을 찾을 수 없어요')}`} /></Screen>;
  const school = schools.find((s) => s.id === org.schoolId);
  const following = v.isFollowing(org.id);
  const isMember = org.memberIds.includes(v.me.id);
  const isAdmin = org.adminIds.includes(v.me.id);
  const isApplicant = org.applicantIds.includes(v.me.id);
  const today = todayISO();
  const orgActs = v.visibleActivities.filter((a) => a.orgId === org.id && a.date >= today);
  const events = orgActs.filter((a) => !isTeamActivity(a));
  const recruits = orgActs.filter(isTeamActivity);
  const orgOpps = opps.filter((o) => o.orgId === org.id);
  const posts = v.visiblePosts.filter((p) => p.orgId === org.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const room = rooms.find((r) => r.orgId === org.id && r.memberIds.includes(v.me.id));
  const tabs: { key: Tab; label: string; n?: number }[] = [
    { key: 'about', label: t('소개') }, { key: 'posts', label: t('게시물'), n: posts.length }, { key: 'events', label: t('행사'), n: events.length }, { key: 'recruit', label: t('모집'), n: recruits.length + orgOpps.length + (org.recruitment?.open ? 1 : 0) }, { key: 'members', label: t('멤버'), n: org.memberIds.length },
  ];
  const members = [...org.adminIds, ...org.memberIds.filter((m) => !org.adminIds.includes(m))];
  const card = tw`card p-4`;

  return (
    <Screen title={org.name} right={isAdmin ? <Button size="sm" variant="outline" icon={<PenSquare size={15} color={C.ink2} />} onPress={() => setPost(true)}>{t('올리기')}</Button> : undefined}>
      <View style={tw`-mx-4`}><Cover emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={140} radius={0} style={{ width: '100%', height: 140 }} /></View>
      <View style={tw`-mt-8`}>
        <View style={card}>
          <View style={tw`flex-row items-start`}>
            <Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={64} style={[tw`-mt-10`, { borderRadius: 16, borderWidth: 4, borderColor: C.surface }]} />
            <View style={tw`flex-1 min-w-0 ml-3`}>
              <View style={tw`flex-row items-center`}><Text style={tw`text-[18px] font-extrabold text-ink leading-6 shrink`}>{org.name}</Text>{org.verified && <BadgeCheck size={18} color={C.gold} style={{ marginLeft: 4 }} />}</View>
              <Text style={tw`text-[12px] text-ink-3 mt-0.5`}>{school?.name}{org.parent ? ` · ${org.parent}` : ''} · {ORG_TYPE_LABELS[org.type]}</Text>
            </View>
          </View>
          <View style={[tw`flex-row items-center flex-wrap mt-3`, { gap: 12 }]}>
            <View style={tw`flex-row items-center`}><Users size={13} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-2`}>{t('팔로워')} <Text style={tw`font-bold`}>{org.followerIds.length}</Text></Text></View>
            <Text style={tw`text-[12px] text-ink-2`}>{t('회원')} <Text style={tw`font-bold`}>{org.memberIds.length}</Text></Text>
            {org.verified ? <Tag tone="gold">✓ {t('공식 인증')}</Tag> : <Tag>{t('미인증')}</Tag>}
            {org.recruitment?.open && <Tag tone="primary">{t('모집 중')}</Tag>}
          </View>
          <View style={[tw`flex-row mt-4`, { gap: 8 }]}>
            <Button full variant={following ? 'secondary' : 'outline'} icon={<Bell size={16} color={following ? C.primary : C.ink2} />} onPress={() => run(() => api.relationships.toggleFollow(v.me.id, org.id, 'org'), following ? undefined : t('팔로우했어요. 새 행사 알림을 받아요.'))}>{following ? t('팔로잉') : t('팔로우')}</Button>
            {isMember ? <Button full variant="secondary" disabled>{isAdmin ? t('운영진') : t('회원')}</Button> : isApplicant ? <Button full variant="outline" disabled>{t('지원 완료')}</Button> :
              <Button full onPress={() => run(() => api.orgs.apply(org.id, v.me.id), t('지원서를 보냈어요.'))}>{org.recruitment?.open ? t('가입 지원') : t('가입 문의')}</Button>}
            {room && <Button variant="outline" icon={<MessageCircle size={16} color={C.ink2} />} onPress={() => nav(`/chats/${room.id}`)}>{''}</Button>}
          </View>
        </View>

        <View style={tw`mt-3`}><ChipRow>{tabs.map((tb) => <Chip key={tb.key} size="sm" active={tab === tb.key} onPress={() => setTab(tb.key)}>{tb.label}{tb.n ? ` ${tb.n}` : ''}</Chip>)}</ChipRow></View>

        {tab === 'about' && (
          <View style={tw`mt-3`}>
            <View style={card}>
              <Text style={tw`text-[14px] text-ink-2 leading-6`}>{org.description}</Text>
              {(org.links?.length || org.dues || org.joinProcess || org.policyNote) ? (
                <View style={tw`mt-3 border-t border-line pt-3`}>
                  {org.links && org.links.length > 0 && <View style={[tw`flex-row flex-wrap mb-2`, { gap: 6 }]}>{org.links.map((l) => <Pressable key={l.url} onPress={() => Linking.openURL(l.url)} style={tw`flex-row items-center h-8 px-3 rounded-lg bg-surface-2`}><ExternalLink size={12} color={C.ink2} /><Text style={tw`ml-1 text-[12px] font-semibold text-ink-2`}>{l.label}</Text></Pressable>)}</View>}
                  {org.joinProcess ? <Text style={tw`text-[13px] text-ink mb-2`}><Text style={tw`text-ink-3`}>{t('가입 절차')} · </Text>{org.joinProcess}</Text> : null}
                  {org.dues ? <Text style={tw`text-[13px] text-ink mb-2`}><Text style={tw`text-ink-3`}>{t('회비')} · </Text>{org.dues}</Text> : null}
                  {org.policyNote ? <View style={tw`rounded-xl bg-gold-soft px-3 py-2 flex-row`}><ShieldCheck size={14} color={C.goldInk} style={{ marginTop: 2 }} /><Text style={tw`ml-2 text-[12px] text-ink-2 shrink`}><Text style={tw`font-bold`}>{t('학교 정책 안내')}</Text> · {org.policyNote}</Text></View> : null}
                </View>
              ) : null}
            </View>
            <View style={[card, tw`mt-3`]}>
              <Text style={tw`text-[14px] font-bold text-ink`}>{t('사진과 영상')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mt-3`} contentContainerStyle={{ gap: 8 }}>{org.gallery.map((g, i) => <View key={i} style={tw`w-[120px]`}><Cover emoji={g.emoji} hue={g.hue} url={g.url} size={120} radius={12} /><Text style={tw`text-[11px] text-ink-3 mt-1 text-center`}>{g.caption}</Text></View>)}</ScrollView>
            </View>
            <View style={[card, tw`mt-3`]}>
              <View style={tw`flex-row items-center`}><CalendarDays size={15} color={C.primary} /><Text style={tw`ml-1.5 text-[14px] font-bold text-ink`}>{t('정기 활동')}</Text></View>
              <View style={tw`mt-2`}>{org.regularActivities.map((r) => <View key={r} style={tw`flex-row mb-1.5`}><Text style={tw`text-[13px] text-primary`}>•</Text><Text style={tw`ml-2 text-[13px] text-ink-2 shrink`}>{r}</Text></View>)}</View>
            </View>
            <View style={[card, tw`mt-3`]}>
              <Text style={tw`text-[14px] font-bold text-ink`}>{t('공지사항')}</Text>
              {org.notices.length === 0 && <Text style={tw`text-[13px] text-ink-3 mt-2`}>{t('공지가 없어요.')}</Text>}
              <View style={tw`mt-2`}>{org.notices.map((n) => <View key={n.id} style={tw`mb-3`}><Text style={tw`text-[13px] font-semibold text-ink`}>{n.title}</Text><Text style={tw`text-[12px] text-ink-2`}>{n.body}</Text><Text style={tw`text-[11px] text-ink-3`}>{relativeTime(n.createdAt)}</Text></View>)}</View>
            </View>
          </View>
        )}
        {tab === 'posts' && <View style={tw`mt-3`}>{posts.length === 0 ? <Empty title={`📝 ${t('아직 게시물이 없어요')}`} description={isAdmin ? t('소식을 올리면 Feed에도 함께 보여요.') : undefined} action={isAdmin ? <Button size="sm" onPress={() => setPost(true)}>{t('소식 올리기')}</Button> : undefined} /> : posts.map((p) => <PostCard key={p.id} post={p} />)}</View>}
        {tab === 'events' && <View style={tw`mt-3`}>{events.length === 0 ? <Empty title={`🎪 ${t('예정된 행사가 없어요')}`} description={t('행사를 올리면 발견 › 활동에도 보여요.')} action={isAdmin ? <Button size="sm" onPress={() => nav(`/create/activity?kind=org_event&org=${org.id}&cat=performance`)}>{t('행사 만들기')}</Button> : undefined} /> : events.map((a) => <ActivityRow key={a.id} activity={a} />)}</View>}
        {tab === 'recruit' && (
          <View style={tw`mt-3`}>
            {org.recruitment && (
              <View style={[tw`rounded-[20px] border border-line p-4 mb-3`, { backgroundColor: C.warnSoft }]}>
                <View style={tw`flex-row items-center`}><Megaphone size={16} color={C.goldInk} /><Text style={tw`ml-2 text-[14px] font-bold text-ink shrink`}>{org.recruitment.title}</Text>{org.recruitment.open && <View style={tw`ml-2`}><Tag tone="primary">{t('모집 중')}</Tag></View>}</View>
                <Text style={tw`text-[12px] text-ink-2 mt-1`}>{t('모집 기간 ·')} {org.recruitment.period}</Text>
                {!isMember && !isApplicant && org.recruitment.open && <View style={tw`flex-row mt-3`}><Button size="sm" onPress={() => run(() => api.orgs.apply(org.id, v.me.id), t('지원서를 보냈어요.'))}>{t('가입 지원')}</Button></View>}
              </View>
            )}
            {recruits.map((a) => <TeamCard key={a.id} activity={a} />)}
            {orgOpps.map((o) => <OppRow key={o.id} o={o} />)}
            {!org.recruitment && recruits.length === 0 && orgOpps.length === 0 && <Empty title={`📣 ${t('진행 중인 모집이 없어요')}`} action={isAdmin ? <Button size="sm" onPress={() => nav(`/create/activity?kind=org_event&org=${org.id}&team=1&cat=club`)}>{t('부원 모집 올리기')}</Button> : undefined} />}
          </View>
        )}
        {tab === 'members' && (
          <View style={tw`mt-3 card overflow-hidden`}>
            {members.map((mid) => { const u = v.userById(mid); return u && (
              <Pressable key={mid} onPress={() => nav(`/users/${mid}`)} style={tw`flex-row items-center px-3.5 py-3 border-b border-line`}>
                <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} />
                <View style={tw`flex-1 min-w-0 ml-3`}><View style={tw`flex-row items-center`}><Text style={tw`text-[13px] font-bold text-ink`}>{u.nickname}</Text>{org.adminIds.includes(mid) && <Crown size={12} color={C.gold} style={{ marginLeft: 4 }} />}</View><Text numberOfLines={1} style={tw`text-[11px] text-ink-3`}>{u.affiliation.type === 'university' && u.affiliation.showDepartment ? u.affiliation.department : ''}</Text></View>
                {org.adminIds.includes(mid) && <Tag tone="gold">{t('운영진')}</Tag>}
              </Pressable>); })}
            <Text style={tw`px-3.5 py-3 text-[12px] text-ink-3`}>{t('팔로워')} {org.followerIds.length} · {t('회원 목록은 조직 설정에 따라 비공개일 수 있어요.')}</Text>
          </View>
        )}
      </View>
      <OrgPostTypeSheet open={post} onClose={() => setPost(false)} org={org} />
    </Screen>
  );
}
