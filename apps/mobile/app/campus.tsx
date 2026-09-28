import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Plus, ArrowRight, PenSquare, Heart, MessageCircle } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { opportunityScore, daysUntil, isTogetherType, dday } from '@core/lib/recommend';
import { ALL_POST_TYPES, POST_TYPE_LABELS, OPP_TYPE_LABELS } from '@core/lib/labels';
import { relativeTime } from '@core/lib/format';
import type { OpportunityType, OrganizationType, PostType, Post } from '@core/types';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Screen, IconBtn, UnderlineTabs, Chip, ChipRow, ListRow, Avatar, Cover, Tag, Button, Empty, C } from '@/ui';
import { PostCard } from '@/components/PostCard';
import { SponsoredRow } from '@/components/SponsoredRow';
import { injectSponsored } from '@core/lib/monetization';
import { Linking } from 'react-native';

type Tab = 'feed' | 'opportunities' | 'clubs';

/** 캠퍼스 — 피드 | 공고 | 단체 (Pastel Breeze, 행 목록). v2 부터 탭이 아니라 피드·모임·프로필에서 들어오는 화면 */
export default function CampusScreen() {
  const params = useLocalSearchParams<{ tab?: string; sub?: string; mine?: string }>();
  const [tab, setTab] = useState<Tab>((params.tab as Tab) || 'feed');
  useEffect(() => { if (params.tab) setTab(params.tab as Tab); }, [params.tab]);
  const tabs: [Tab, string][] = [['feed', t('피드')], ['opportunities', t('공고')], ['clubs', lang === 'en' ? 'Clubs & Greek' : t('단체')]];
  return (
    <Screen title={t('캠퍼스')} right={tab === 'feed' ? <IconBtn onPress={() => nav('/create/post')}><PenSquare size={21} color={C.ink2} /></IconBtn> : undefined} sub={<UnderlineTabs value={tab} onChange={setTab} options={tabs} />}>
      <View style={tw`pt-4`}>
        {tab === 'feed' && <FeedTab />}
        {tab === 'opportunities' && <OpportunitiesTab initial={params.sub} />}
        {tab === 'clubs' && <ClubsTab mine={!!params.mine} />}
      </View>
    </Screen>
  );
}

function FeedTab() {
  const v = useViewer();
  const [type, setType] = useState<PostType | 'all' | 'anon'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const organic = v.visiblePosts.filter((p) => p.showOnFeed !== false && !p.sponsored)
    .filter((p) => type === 'all' ? true : type === 'anon' ? p.anonymous : p.postType === type && !p.anonymous)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ads = useAppStore((s) => s.posts).filter((p) => p.sponsored);
  // 전체 탭에서만 4개마다 스폰서 글 하나 (Plus 사용자는 광고 없음)
  const posts = type === 'all' ? injectSponsored(organic, ads, v.me) : organic;
  const row = (p: Post, i: number) => {
    if (p.sponsored) return <SponsoredRow key={p.id} post={p} expanded={open === p.id} onPress={() => setOpen(open === p.id ? null : p.id)} last={i === posts.length - 1} />;
    const author = v.userById(p.authorId); const org = p.orgId ? v.orgById(p.orgId) : undefined;
    const av = p.anonymous ? { emoji: '', hue: 210 } : org ? org.logo : author?.avatar ?? { emoji: '', hue: 200 };
    const name = p.anonymous ? t('익명') : org?.name ?? author?.nickname ?? '';
    if (open === p.id) return <Pressable key={p.id} onPress={() => setOpen(null)}><PostCard post={p} /></Pressable>;
    return (
      <Pressable key={p.id} onPress={() => setOpen(p.id)} style={tw`flex-row items-center py-3 ${i === posts.length - 1 ? '' : 'border-b border-line'}`}>
        {p.anonymous ? <View style={tw`h-11 w-11 rounded-full bg-primary-soft items-center justify-center`}><Text style={tw`text-[13px] font-bold text-primary`}>?</Text></View> : <Avatar emoji={av.emoji} hue={av.hue} url={av.url} size={44} />}
        <View style={tw`flex-1 min-w-0 ml-3`}>
          <View style={tw`flex-row items-center`}>
            <Text numberOfLines={1} style={tw`text-[15px] font-semibold text-primary shrink`}>{name}</Text>
            {p.postType && p.postType !== 'story' ? <View style={tw`ml-2`}><Tag tone="primary">{POST_TYPE_LABELS[p.postType]}</Tag></View> : null}
            <View style={tw`flex-1`} /><Text style={tw`text-[12px] text-ink-3`}>{relativeTime(p.createdAt)}</Text>
          </View>
          <Text numberOfLines={1} style={tw`text-[14px] text-ink-2 mt-0.5`}>{p.text}</Text>
          <View style={tw`flex-row items-center mt-1`}><Heart size={12} color={C.ink3} /><Text style={tw`ml-1 mr-3 text-[12px] text-ink-3`}>{p.likeIds.length}</Text><MessageCircle size={12} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-3`}>{p.comments.length}</Text></View>
        </View>
        {p.media[0] ? <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} size={56} style={tw`ml-3`} /> : null}
      </Pressable>
    );
  };
  return (
    <View>
      <View style={tw`mb-2`}><ChipRow><Chip active={type === 'all'} onPress={() => setType('all')}>{t('전체')}</Chip>{ALL_POST_TYPES.filter((x) => x !== 'news').map((pt) => <Chip key={pt} active={type === pt} onPress={() => setType(pt)}>{POST_TYPE_LABELS[pt]}</Chip>)}<Chip active={type === 'anon'} onPress={() => setType('anon')}>{t('익명')}</Chip></ChipRow></View>
      {posts.length === 0 ? <Empty title={t('아직 올라온 것이 없어요')} action={<Button onPress={() => nav('/create/post')}>{t('게시물 작성')}</Button>} /> : posts.map(row)}
      {v.me.plan !== 'plus' && <Pressable onPress={() => Linking.openURL('mailto:ads@aroundu.app')} style={tw`items-center py-4`}><Text style={tw`text-[11px] text-ink-3`}>{t('여기에 광고하기')} · ads@aroundu.app</Text></Pressable>}
    </View>
  );
}

type Sub = 'foryou' | 'saved' | OpportunityType;
function OpportunitiesTab({ initial }: { initial?: string }) {
  const [sub, setSub] = useState<Sub>((initial as Sub) || 'foryou');
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const v = useViewer();
  const me = v.me;
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const scored = useMemo(() => opps.filter((o) => !isTogetherType(o.type) || (o.type === 'hackathon' && !o.rolesNeeded)).filter((o) => !o.schoolId || o.schoolId === mySchool).filter((o) => !o.deadline || daysUntil(o.deadline) >= 0).map((o) => ({ o, ...opportunityScore(me, o, intents) })), [opps, intents, me, mySchool]);
  const list = sub === 'foryou' ? [...scored].sort((a, b) => b.score - a.score) : sub === 'saved' ? scored.filter((x) => intents.some((i) => i.opportunityId === x.o.id && i.userId === me.id && (i.saved || i.intent !== 'interested'))) : scored.filter((x) => x.o.type === sub);
  return (
    <View>
      <View style={tw`mb-2`}><ChipRow>
        <Chip active={sub === 'foryou'} onPress={() => setSub('foryou')}>{t('전체')}</Chip>
        {(['scholarship', 'internship', 'lab', 'hackathon', 'exchange'] as OpportunityType[]).map((ty) => <Chip key={ty} active={sub === ty} onPress={() => setSub(ty)}>{OPP_TYPE_LABELS[ty]}</Chip>)}
        <Chip active={sub === 'saved'} onPress={() => setSub('saved')}>{t('저장')}</Chip>
      </ChipRow></View>
      {list.length === 0 ? <Empty title={t('아직 등록된 기회가 없어요')} /> : list.map(({ o }, i) => (
        <ListRow key={o.id} onPress={() => nav(`/opportunities/${o.id}`)} last={i === list.length - 1}
          left={<View style={tw`h-11 w-11 rounded-full bg-primary-soft items-center justify-center`}><Text style={tw`text-[12px] font-bold text-primary`}>{OPP_TYPE_LABELS[o.type].slice(0, 2)}</Text></View>}
          title={o.title} badge={<Tag tone="primary">{OPP_TYPE_LABELS[o.type]}</Tag>} sub={`${o.host}${o.deadline ? ` · ${dday(o.deadline)}` : ''}`} right={<ArrowRight size={20} color={C.primary} />} />
      ))}
    </View>
  );
}

const CLUB_CHIPS: { key: OrganizationType | 'all' | 'mine'; label: string }[] = [
  { key: 'all', label: t('전체') }, { key: 'mine', label: t('내 조직') }, { key: 'club', label: t('동아리') }, { key: 'council', label: t('학회·학생회') }, { key: 'lab', label: t('연구실') }, { key: 'greek', label: 'Greek' },
];
function ClubsTab({ mine: mineOnly }: { mine: boolean }) {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const [chip, setChip] = useState<typeof CLUB_CHIPS[number]['key']>(mineOnly ? 'mine' : 'all');
  const mySchool = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const mine = (o: typeof orgs[number]) => o.memberIds.includes(v.me.id) || o.adminIds.includes(v.me.id) || o.followerIds.includes(v.me.id);
  const list = orgs.filter((o) => chip === 'mine' ? mine(o) : (o.schoolId === mySchool || mine(o)) && (chip === 'all' || o.type === chip)).sort((a, b) => Number(!!b.recruitment?.open) - Number(!!a.recruitment?.open));
  return (
    <View>
      <View style={tw`mb-2`}><ChipRow>{CLUB_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onPress={() => setChip(c.key)}>{c.label}</Chip>)}</ChipRow></View>
      {list.length === 0 ? <Empty title={t('아직 조직이 없어요')} /> : list.map((o, i) => (
        <ListRow key={o.id} onPress={() => nav(`/orgs/${o.id}`)} last={i === list.length - 1}
          left={<Avatar emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={44} />}
          title={o.name} badge={o.recruitment?.open ? <Tag tone="primary">{t('모집 중')}</Tag> : undefined} sub={`${o.memberIds.length + o.followerIds.length}${lang === 'en' ? ' members' : '명'}`}
          right={o.recruitment?.open ? <Plus size={20} color={C.primary} /> : <ArrowRight size={20} color={C.primary} />} />
      ))}
    </View>
  );
}
