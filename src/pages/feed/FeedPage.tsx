import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Image, HelpCircle, BarChart3 } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Chip, Button, CardSkeleton, EmptyState, ErrorState, Avatar, Segmented } from '@/components/ui';
import { SponsoredRow } from '@/components/cards/SponsoredRow';
import { PostRow } from '@/components/feed_PostRow';
import { injectSponsored } from '@core/lib/monetization';
import { feedForYou, feedCampus, feedFollowing } from '@core/lib/feed';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ALL_POST_TYPES, POST_TYPE_LABELS } from '@core/lib/labels';
import type { Post, PostType } from '@core/types';

type Tab = 'foryou' | 'campus' | 'following';

/** Feed — 컴포저 + For You | Campus | Following (행 목록, 탭하면 상세) */
export function FeedPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'foryou') as Tab;
  const setTab = (tb: Tab) => setParams(tb === 'foryou' ? {} : { tab: tb }, { replace: true });
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const options: { value: Tab; label: string }[] = [{ value: 'foryou', label: t('추천') }, { value: 'campus', label: t('캠퍼스') }, { value: 'following', label: t('팔로잉') }];
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

function ComposerAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  const nav = useNavigate();
  return <button onClick={() => nav(to)} className="h-8 px-3 rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2 flex items-center gap-1 press">{icon}{label}</button>;
}

/** "What's happening?" 컴포저 — 탭하면 글쓰기, 질문은 ?type=question */
function Composer() {
  const nav = useNavigate();
  const v = useViewer();
  return (
    <div className="card p-3">
      <button onClick={() => nav('/create/post')} className="w-full flex items-center gap-3 text-left">
        <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={40} />
        <span className="flex-1 h-10 rounded-full bg-surface-2 px-4 flex items-center text-[14px] text-ink-3 truncate">{t('무슨 일이 있나요?')}</span>
      </button>
      <div className="mt-2.5 flex gap-2 pl-[52px]">
        <ComposerAction icon={<Image size={14} />} label={lang === 'en' ? 'Photo' : '사진'} to="/create/post" />
        <ComposerAction icon={<HelpCircle size={14} />} label={lang === 'en' ? 'Question' : '질문'} to="/create/post?type=question" />
        <ComposerAction icon={<BarChart3 size={14} />} label={t('투표')} to="/create/post" />
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
  const organic = useMemo(() => v.visiblePosts.filter((p) => p.showOnFeed !== false && !p.sponsored), [v]);
  const ads = useMemo(() => allPosts.filter((p) => p.sponsored), [allPosts]);
  // For You·Campus 에만 4개마다 스폰서 글 (Plus 는 광고 없음). Following 은 순수 팔로우 글만
  const posts = useMemo(() => {
    if (tab === 'following') return feedFollowing(organic, v.me, v.snap.relationships, orgs);
    if (tab === 'campus') {
      const campus = feedCampus(organic, v.me, v.users, orgs).filter((p) => type === 'all' ? true : type === 'anon' ? !!p.anonymous : p.postType === type && !p.anonymous);
      return type === 'all' ? injectSponsored(campus, ads, v.me) : campus;
    }
    return injectSponsored(feedForYou(organic, v.me, v.users, v.snap.relationships, orgs), ads, v.me);
  }, [tab, type, organic, ads, orgs, v]);

  const row = (p: Post) => p.sponsored
    ? <SponsoredRow key={p.id} post={p} expanded={false} onClick={() => nav(`/feed/${p.id}`)} />
    : <PostRow key={p.id} post={p} onClick={() => nav(`/feed/${p.id}`)} />;

  return (
    <div>
      {tab === 'campus' && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 py-2">
          <Chip active={type === 'all'} onClick={() => setType('all')}>{t('전체')}</Chip>
          {ALL_POST_TYPES.filter((x) => x !== 'news').map((pt) => <Chip key={pt} active={type === pt} onClick={() => setType(pt)}>{POST_TYPE_LABELS[pt]}</Chip>)}
          <Chip active={type === 'anon'} onClick={() => setType('anon')}>{t('익명')}</Chip>
        </div>
      )}
      {posts.length === 0
        ? <EmptyState emoji="" title={t('아직 올라온 것이 없어요')} action={<Button onClick={() => nav('/create/post')}>{t('게시물 작성')}</Button>} />
        : <div className="divide-y divide-line">{posts.map(row)}</div>}
      {v.me.plan !== 'plus' && <a href="mailto:ads@aroundu.app" className="block text-center py-4 text-[11px] text-ink-3">{t('여기에 광고하기')} · ads@aroundu.app</a>}
    </div>
  );
}
