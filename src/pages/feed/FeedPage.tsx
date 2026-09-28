import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Image } from 'lucide-react';
import { t } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Chip, Button, CardSkeleton, EmptyState, ErrorState, Avatar, Segmented } from '@/components/ui';
import { SponsoredRow } from '@/components/cards/SponsoredRow';
import { PostRow } from '@/components/feed_PostRow';
import { injectSponsored, isPlus } from '@core/lib/monetization';
import { feedForYou, feedCampus, feedFollowing } from '@core/lib/feed';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ALL_POST_TYPES, POST_TYPE_LABELS } from '@core/lib/labels';
import type { Post, PostType } from '@core/types';
import { stageKind, composerPrompts, composerPlaceholder, campusScopes, defaultCampusScope, campusTabLabel, type CampusScope } from '@core/lib/stage';

type Tab = 'foryou' | 'campus' | 'following';

/** Feed — 컴포저 + 추천 | 내 학교 | 팔로잉 (행 목록, 탭하면 상세). 무엇을 올릴지는 AroundU가 정하지 않는다 */
export function FeedPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'foryou') as Tab;
  const setTab = (tb: Tab) => setParams(tb === 'foryou' ? {} : { tab: tb }, { replace: true });
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const v = useViewer();
  const kind = v.me ? stageKind(v.me) : 'undergrad';
  const options: { value: Tab; label: string }[] = [{ value: 'foryou', label: t('추천') }, { value: 'campus', label: campusTabLabel(kind) }, { value: 'following', label: t('팔로잉') }];
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

/**
 * 컴포저 — 글 + 사진 + 공개 범위. 아래 칩은 단계별 시작점(학부생: 수업 질문·같이 밥 / 대학원생: 연구 질문·리딩 그룹·학회 / 졸업생: 근황·후배 질문·이번에 가요).
 * 쓰는 걸 강요하지 않는 보조 칩이다.
 */
function Composer() {
  const nav = useNavigate();
  const v = useViewer();
  const kind = stageKind(v.me);
  return (
    <div className="card p-3">
      <button onClick={() => nav('/create/post')} className="w-full flex items-center gap-3 text-left">
        <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={40} />
        <span className="flex-1 h-10 rounded-full bg-surface-2 px-4 flex items-center text-[14px] text-ink-3 truncate">{composerPlaceholder(kind)}</span>
      </button>
      {/* 한 줄: 사진 + 단계별 시작점. 공개 범위는 글쓰기 화면에서 고른다 */}
      <div className="mt-2.5 flex gap-2 overflow-x-auto hide-scrollbar pl-[52px] -mr-3 pr-3" aria-label={t('이런 글은 어때요?')}>
        <ComposerAction icon={<Image size={14} />} label={t('사진')} to="/create/post?photo=1" />
        {composerPrompts(kind).map((p) => <ComposerAction key={p.key} icon={<span className="text-[12px]">{p.emoji}</span>} label={p.label} to={`/create/post?type=${p.postType}&topic=${p.key}`} />)}
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

  const row = (p: Post) => p.sponsored
    ? <SponsoredRow key={p.id} post={p} expanded={false} onClick={() => nav(`/feed/${p.id}`)} />
    : <PostRow key={p.id} post={p} onClick={() => nav(`/feed/${p.id}`)} />;

  const emptyTitle = tab === 'following' ? t('팔로우한 사람·그룹의 글이 아직 없어요') : tab === 'campus' ? (scope === 'alumni' ? t('동문 글이 아직 없어요') : scope === 'grads' ? t('대학원생 글이 아직 없어요') : t('우리 학교 글이 아직 없어요')) : t('아직 올라온 것이 없어요');

  return (
    <div>
      {tab === 'campus' && (
        <div className="pt-2">
          <Segmented className={kind === 'grad' ? 'w-full' : 'max-w-[260px]'} value={scope} onChange={setScope} options={campusScopes(kind)} />
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
