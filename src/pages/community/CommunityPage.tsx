import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PenSquare, Heart, MessageCircle } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Chip, Button, CardSkeleton, EmptyState, ErrorState, Avatar, Cover } from '@/components/ui';
import { PostCard } from '@/components/cards/PostCard';
import { SampleTag } from '@/components/ui/SampleTag';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ALL_POST_TYPES, POST_TYPE_LABELS } from '@core/lib/labels';
import { relativeTime } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { PostType, Post } from '@core/types';
import { likeCount } from '@core/lib/privacy';
import { BrowseTab } from './BrowseTab';
import { TodaysQuestion, QuietInvite, MeanwhileThisWeek } from '@/components/together/FeedExtras';

/** 이보다 글이 적으면 피드가 조용하다 — 초대 카드와 맨 아래 "이번 주" 하나를 보여준다 */
const QUIET_POSTS = 5;

type Tab = 'feed' | 'opportunities';

/** 캠퍼스 — 피드 | 찾기 (동아리·수업·인턴·연구·장학금·해커톤·행사를 한 줄의 칩으로) */
export function CommunityPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  // 예전 "동아리" 탭 링크 (?tab=clubs, ?tab=clubs&mine=1) → 찾기 › 동아리 칩
  const legacyClubs = params.get('tab') === 'clubs';
  useEffect(() => {
    if (legacyClubs) setParams({ tab: 'opportunities', sub: 'clubs', ...(params.get('mine') ? { kind: 'mine' } : {}) }, { replace: true });
  }, [legacyClubs]); // eslint-disable-line react-hooks/exhaustive-deps
  const tab: Tab = params.get('tab') === 'opportunities' || legacyClubs ? 'opportunities' : 'feed';
  const setTab = (tb: Tab) => setParams(tb === 'feed' ? {} : { tab: tb }, { replace: true });
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const tabs: [Tab, string][] = [['feed', t('피드')], ['opportunities', lang === 'en' ? 'Browse' : '찾기']];
  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader right={tab === 'feed' ? <button onClick={() => nav('/create/post')} aria-label={t('글쓰기')} className="h-11 w-11 rounded-full grid place-items-center text-ink-2"><PenSquare size={21} /></button> : undefined} />
      <div className="px-4 flex gap-7 border-b border-line">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn('h-11 text-[16px] font-semibold border-b-[3px] -mb-px transition', tab === k ? 'border-accent text-primary' : 'border-transparent text-ink-2')}>{l}</button>)}</div>
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4 pt-4">
          {tab === 'feed' && <FeedTab />}
          {tab === 'opportunities' && !legacyClubs && <BrowseTab />}
        </div>
      )}
    </div>
  );
}

/** 피드는 사람만 — 공고를 자동으로 글처럼 올리지 않는다. 맨 위 오늘의 질문, 조용하면 초대 + 맨 아래 이번 주 하나 */
function FeedTab() {
  const nav = useNavigate();
  const v = useViewer();
  const [type, setType] = useState<PostType | 'all' | 'anon'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const feed = v.visiblePosts.filter((p) => p.showOnFeed !== false);
  const quiet = feed.length < QUIET_POSTS;
  const posts = feed
    .filter((p) => type === 'all' ? true : type === 'anon' ? p.anonymous : p.postType === type && !p.anonymous)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const row = (p: Post) => {
    const author = v.userById(p.authorId); const org = p.orgId ? v.orgById(p.orgId) : undefined;
    const av = p.anonymous ? { emoji: '', hue: 210 } : org ? org.logo : author?.avatar ?? { emoji: '', hue: 200 };
    const name = p.anonymous ? t('익명') : org?.name ?? author?.nickname ?? '';
    if (open === p.id) return <div key={p.id} onClick={() => setOpen(null)}><PostCard post={p} /></div>;
    return (
      <button key={p.id} onClick={() => setOpen(p.id)} className="w-full flex items-center gap-3 py-3 text-left press">
        {p.anonymous ? <span className="h-11 w-11 rounded-full bg-primary-soft grid place-items-center text-primary text-[13px] font-bold">?</span> : <Avatar emoji={av.emoji} hue={av.hue} url={av.url} size={44} />}
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">{/* 이름이 먼저 — 긴 종류 태그(“Looking for people to join”)가 이름을 “Et…”로 자르지 않게 태그가 줄어든다 */}<span className="text-[15px] font-semibold text-primary truncate shrink-0 max-w-[55%]">{author?.sample && <SampleTag />}{name}</span>{p.postType && p.postType !== 'story' && <span className="h-6 leading-6 px-2.5 rounded-full bg-accent-soft text-primary text-[11px] font-semibold min-w-0 truncate">{POST_TYPE_LABELS[p.postType]}</span>}<span className="text-[12px] text-ink-3 ml-auto shrink-0">{relativeTime(p.createdAt)}</span></span>
          <span className="block text-[14px] text-ink-2 truncate mt-0.5">{p.text}</span>
          <span className="flex items-center gap-3 text-[12px] text-ink-3 mt-1"><span className="flex items-center gap-1"><Heart size={12} />{likeCount(p)}</span><span className="flex items-center gap-1"><MessageCircle size={12} />{p.comments.length}</span></span>
        </span>
        {p.media[0] && <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} className="h-14 w-14 rounded-2xl shrink-0" size={20} />}
      </button>
    );
  };
  return (
    <div>
      <TodaysQuestion />
      {/* 글이 하나도 없으면 칩 줄·"아직 없어요" 없이 아래 초대 카드 하나만 (빈 문구가 두 번 겹쳤다). 글쓰기는 위 연필 버튼 */}
      {feed.length > 0 && <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2"><Chip active={type === 'all'} onClick={() => setType('all')}>{t('전체')}</Chip>{ALL_POST_TYPES.filter((x) => x !== 'news').map((pt) => <Chip key={pt} active={type === pt} onClick={() => setType(pt)}>{POST_TYPE_LABELS[pt]}</Chip>)}<Chip active={type === 'anon'} onClick={() => setType('anon')}>{t('익명')}</Chip></div>}
      {feed.length === 0 ? null : posts.length === 0 ? <EmptyState emoji="" title={t('아직 올라온 것이 없어요')} action={<Button onClick={() => nav('/create/post')}>{t('게시물 작성')}</Button>} /> : <div className="divide-y divide-line">{posts.map(row)}</div>}
      {quiet && <QuietInvite />}
      {quiet && <MeanwhileThisWeek />}
    </div>
  );
}
