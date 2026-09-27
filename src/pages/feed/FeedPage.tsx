import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Image, HelpCircle, UsersRound } from 'lucide-react';
import { t } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Chip, Button, CardSkeleton, EmptyState, ErrorState, Avatar, Segmented } from '@/components/ui';
import { VISIBILITY_ICONS } from '@/components/ui/VisibilityPicker';
import { SponsoredRow } from '@/components/cards/SponsoredRow';
import { PostRow } from '@/components/feed_PostRow';
import { injectSponsored, isPlus } from '@core/lib/monetization';
import { feedForYou, feedCampus, feedFollowing, POST_VISIBILITIES } from '@core/lib/feed';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ALL_POST_TYPES, POST_TYPE_LABELS, VISIBILITY_LABELS } from '@core/lib/labels';
import type { Post, PostType } from '@core/types';

type Tab = 'foryou' | 'campus' | 'following';
type CampusScope = 'students' | 'all';

/** Feed — 컴포저 + 추천 | 내 학교 | 팔로잉 (행 목록, 탭하면 상세). 무엇을 올릴지는 AroundU가 정하지 않는다 */
export function FeedPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'foryou') as Tab;
  const setTab = (tb: Tab) => setParams(tb === 'foryou' ? {} : { tab: tb }, { replace: true });
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const options: { value: Tab; label: string }[] = [{ value: 'foryou', label: t('추천') }, { value: 'campus', label: t('내 학교') }, { value: 'following', label: t('팔로잉') }];
  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader />
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4">
          <Composer />
          <Segmented className="mt-3" value={tab} onChange={setTab} options={options} />
          <div className="pt-2"><FeedList tab={tab} /></div>
        </div>
      )}
    </div>
  );
}

function ComposerAction({ icon, label, to, className }: { icon: React.ReactNode; label: string; to: string; className?: string }) {
  const nav = useNavigate();
  return <button onClick={() => nav(to)} className={`h-8 px-3 rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2 flex items-center gap-1 press shrink-0 ${className ?? ''}`}>{icon}{label}</button>;
}

/** "무슨 일이 있나요?" 컴포저 — 글 + 사진 + 공개 범위. 종류 칩(질문·같이할 사람)은 보조 */
function Composer() {
  const nav = useNavigate();
  const v = useViewer();
  return (
    <div className="card p-3">
      <button onClick={() => nav('/create/post')} className="w-full flex items-center gap-3 text-left">
        <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={40} />
        <span className="flex-1 h-10 rounded-full bg-surface-2 px-4 flex items-center text-[14px] text-ink-3 truncate">{t('무슨 일이 있나요?')}</span>
      </button>
      <div className="mt-2.5 flex gap-2 overflow-x-auto hide-scrollbar pl-[52px] -mr-3 pr-3">
        <ComposerAction icon={<Image size={14} />} label={t('사진')} to="/create/post?photo=1" />
        {POST_VISIBILITIES.map((vis) => { const I = VISIBILITY_ICONS[vis]; return <ComposerAction key={vis} icon={<I size={13} />} label={VISIBILITY_LABELS[vis]} to={`/create/post?vis=${vis}`} />; })}
      </div>
      <div className="mt-2 flex gap-2 pl-[52px]">
        <ComposerAction icon={<HelpCircle size={13} />} label={POST_TYPE_LABELS.question} to="/create/post?type=question" className="!bg-transparent border border-line !h-7 text-ink-3" />
        <ComposerAction icon={<UsersRound size={13} />} label={POST_TYPE_LABELS.together} to="/create/post?type=together" className="!bg-transparent border border-line !h-7 text-ink-3" />
      </div>
    </div>
  );
}

function FeedList({ tab }: { tab: Tab }) {
  const nav = useNavigate();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const allPosts = useAppStore((s) => s.posts);
  const [type, setType] = useState<PostType | 'all' | 'anon'>('all');
  const [scope, setScope] = useState<CampusScope>('all');
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

  const row = (p: Post) => p.sponsored
    ? <SponsoredRow key={p.id} post={p} expanded={false} onClick={() => nav(`/feed/${p.id}`)} />
    : <PostRow key={p.id} post={p} onClick={() => nav(`/feed/${p.id}`)} />;

  const emptyTitle = tab === 'following' ? t('팔로우한 사람·그룹의 글이 아직 없어요') : tab === 'campus' ? t('우리 학교 글이 아직 없어요') : t('아직 올라온 것이 없어요');

  return (
    <div>
      {tab === 'campus' && (
        <div className="pt-2">
          <Segmented className="max-w-[240px]" value={scope} onChange={setScope} options={[{ value: 'students', label: t('재학생만') }, { value: 'all', label: t('학교 전체') }]} />
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 py-2">
            <Chip size="sm" active={type === 'all'} onClick={() => setType('all')}>{t('전체')}</Chip>
            {ALL_POST_TYPES.filter((x) => x !== 'news').map((pt) => <Chip key={pt} size="sm" active={type === pt} onClick={() => setType(pt)}>{POST_TYPE_LABELS[pt]}</Chip>)}
            <Chip size="sm" active={type === 'anon'} onClick={() => setType('anon')}>{t('익명')}</Chip>
          </div>
        </div>
      )}
      {posts.length === 0
        ? <EmptyState emoji="" title={emptyTitle} action={<Button onClick={() => nav('/create/post')}>{t('게시물 작성')}</Button>} />
        : <div className="divide-y divide-line">{posts.map(row)}</div>}
      {!isPlus(v.me) && <a href="mailto:ads@aroundu.app" className="block text-center py-4 text-[11px] text-ink-3">{t('여기에 광고하기')} · ads@aroundu.app</a>}
    </div>
  );
}
