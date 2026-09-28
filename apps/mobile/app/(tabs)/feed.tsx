import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image as ImageIcon, School } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { injectSponsored, isPlus } from '@core/lib/monetization';
import { feedForYou, feedCampus, feedFollowing } from '@core/lib/feed';
import { ALL_POST_TYPES, POST_TYPE_LABELS } from '@core/lib/labels';
import { stageKind, composerPrompts, composerPlaceholder, campusScopes, defaultCampusScope, campusTabLabel, type CampusScope } from '@core/lib/stage';
import type { Post, PostType } from '@core/types';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { TabScreen, AppHeader, Segmented, Chip, ChipRow, Avatar, Button, Empty, C } from '@/ui';
import { SponsoredRow } from '@/components/SponsoredRow';
import { PostRow } from '@/v2/PostRow';

type Tab = 'foryou' | 'campus' | 'following';

/** Feed — 컴포저 + 추천 | 내 학교 | 팔로잉 (웹 FeedPage). 행 목록, 탭하면 상세. 무엇을 올릴지는 AroundU가 정하지 않는다 */
export default function FeedScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: Tab = params.tab === 'campus' || params.tab === 'following' ? params.tab : 'foryou';
  const setTab = (tb: Tab) => router.setParams({ tab: tb === 'foryou' ? '' : tb } as never);
  const v = useViewer();
  const kind = stageKind(v.me);
  return (
    <TabScreen header={<AppHeader />}>
      <Composer />
      <View style={tw`mt-3`}><Segmented<Tab> value={tab} onChange={setTab} options={[['foryou', t('추천')], ['campus', campusTabLabel(kind)], ['following', t('팔로잉')]]} /></View>
      <View style={tw`pt-2`}><FeedList tab={tab} /></View>
    </TabScreen>
  );
}

function ComposerAction({ icon, label, to, outline }: { icon: React.ReactNode; label: string; to: string; outline?: boolean }) {
  return (
    <Pressable onPress={() => nav(to)} style={tw`${outline ? 'h-7 border border-line bg-white' : 'h-8 bg-surface-2'} px-3 mr-2 rounded-full flex-row items-center`}>
      {icon}<Text style={tw`ml-1 text-[12px] font-semibold text-ink-2`}>{label}</Text>
    </Pressable>
  );
}

/**
 * 컴포저 — 글 + 사진. 아래 칩은 단계별 시작점(학부생: 수업 질문·같이 밥 / 대학원생: 연구 질문·리딩 그룹·학회 / 졸업생: 근황·후배 질문·이번에 가요).
 * 쓰는 걸 강요하지 않는 보조 칩이다. 칩 → 글쓰기(type · topic 미리 채움)
 */
function Composer() {
  const v = useViewer();
  const kind = stageKind(v.me);
  return (
    <View style={tw`rounded-[24px] border border-line bg-white p-3`}>
      <Pressable onPress={() => nav('/create/post')} style={tw`flex-row items-center`}>
        <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={40} />
        <View style={tw`flex-1 ml-3 h-10 rounded-full bg-surface-2 px-4 justify-center`}><Text numberOfLines={1} style={tw`text-[14px] text-ink-3`}>{composerPlaceholder(kind)}</Text></View>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mt-2.5 -mr-3`} contentContainerStyle={tw`pl-[52px] pr-3 items-center`}>
        <ComposerAction icon={<ImageIcon size={14} color={C.ink2} />} label={t('사진')} to="/create/post?photo=1" />
        <ComposerAction icon={<School size={13} color={C.ink2} />} label={t('캠퍼스')} to="/community" />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mt-2 -mr-3`} contentContainerStyle={tw`pl-[52px] pr-3 items-center`} accessibilityLabel={t('이런 글은 어때요?')}>
        {composerPrompts(kind).map((p) => <ComposerAction key={p.key} outline icon={<Text style={tw`text-[12px]`}>{p.emoji}</Text>} label={p.label} to={`/create/post?type=${p.postType}&topic=${p.key}`} />)}
      </ScrollView>
    </View>
  );
}

function FeedList({ tab }: { tab: Tab }) {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const allPosts = useAppStore((s) => s.posts);
  const [type, setType] = useState<PostType | 'all' | 'anon'>('all');
  const kind = stageKind(v.me);
  const [scope, setScope] = useState<CampusScope>(() => defaultCampusScope(kind));
  const organic = useMemo(() => v.visiblePosts.filter((p) => p.showOnFeed !== false && !p.sponsored), [v]);
  const ads = useMemo(() => allPosts.filter((p) => p.sponsored), [allPosts]);
  // 추천·내 학교에만 4개마다 스폰서 글 (Plus 는 광고 없음). 팔로잉은 순수 팔로우 글만
  const posts = useMemo(() => {
    if (tab === 'following') return feedFollowing(organic, v.me, v.snap.relationships, orgs);
    if (tab === 'campus') {
      const campus = feedCampus(organic, v.me, v.users, orgs, scope).filter((p) => type === 'all' ? true : type === 'anon' ? !!p.anonymous : p.postType === type && !p.anonymous);
      return type === 'all' ? injectSponsored(campus, ads, v.me) : campus;
    }
    return injectSponsored(feedForYou(organic, v.me, v.users, v.snap.relationships, orgs), ads, v.me);
  }, [tab, type, scope, organic, ads, orgs, v]);

  const row = (p: Post, i: number) => p.sponsored
    ? <SponsoredRow key={p.id} post={p} expanded={false} onPress={() => nav(`/feed/${p.id}`)} last={i === posts.length - 1} />
    : <PostRow key={p.id} post={p} onPress={() => nav(`/feed/${p.id}`)} last={i === posts.length - 1} />;

  const emptyTitle = tab === 'following' ? t('팔로우한 사람·그룹의 글이 아직 없어요') : tab === 'campus' ? (scope === 'alumni' ? t('동문 글이 아직 없어요') : scope === 'grads' ? t('대학원생 글이 아직 없어요') : t('우리 학교 글이 아직 없어요')) : t('아직 올라온 것이 없어요');

  return (
    <View>
      {tab === 'campus' && (
        <View style={tw`pt-2`}>
          <View style={{ maxWidth: kind === 'grad' ? 300 : 240 }}><Segmented<CampusScope> value={scope} onChange={setScope} options={campusScopes(kind).map((o) => [o.value, o.label])} /></View>
          <View style={tw`py-2`}><ChipRow>
            <Chip size="sm" active={type === 'all'} onPress={() => setType('all')}>{t('전체')}</Chip>
            {ALL_POST_TYPES.filter((x) => x !== 'news').map((pt) => <Chip key={pt} size="sm" active={type === pt} onPress={() => setType(pt)}>{POST_TYPE_LABELS[pt]}</Chip>)}
            <Chip size="sm" active={type === 'anon'} onPress={() => setType('anon')}>{t('익명')}</Chip>
          </ChipRow></View>
        </View>
      )}
      {posts.length === 0
        ? <Empty title={emptyTitle} action={<Button onPress={() => nav('/create/post')}>{t('게시물 작성')}</Button>} />
        : posts.map(row)}
      {!isPlus(v.me) && <Pressable onPress={() => Linking.openURL('mailto:ads@aroundu.app')} style={tw`items-center py-4`}><Text style={tw`text-[11px] text-ink-3`}>{t('여기에 광고하기')} · ads@aroundu.app</Text></Pressable>}
    </View>
  );
}
