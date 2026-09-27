import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { t } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, EmptyState, Tag } from '@/components/ui';
import { PostCard } from '@/components/cards/PostCard';
import { SponsoredRow } from '@/components/cards/SponsoredRow';
import { BoostSheet } from '@/components/social/BoostSheet';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { isBoosted } from '@core/lib/monetization';
import { formatDate } from '@core/lib/format';

/** /feed/:id — 게시물 상세 (댓글 펼침). 내 글이면 Boost */
export function PostDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const all = useAppStore((s) => s.posts);
  const [boost, setBoost] = useState(false);
  const post = v.visiblePosts.find((p) => p.id === id) ?? all.find((p) => p.id === id && p.sponsored);
  if (!post) {
    return (
      <div className="min-h-full bg-bg">
        <TopBar back title={t('게시물')} />
        <EmptyState emoji="🫥" title={t('글을 찾을 수 없어요')} action={<Button size="sm" onClick={() => nav('/feed')}>{t('피드')}</Button>} />
      </div>
    );
  }
  const mine = post.authorId === v.me.id && !post.sponsored;
  const boosted = isBoosted(post);
  return (
    <div className="min-h-full pb-8 bg-bg">
      <TopBar back title={t('게시물')} right={mine ? <Button size="sm" className="mr-1" variant={boosted ? 'secondary' : 'primary'} icon={<Rocket size={14} />} onClick={() => setBoost(true)}>{t('부스트')}</Button> : undefined} />
      <div className="px-4 pt-3 space-y-3">
        {boosted && post.boost && (
          <div className="rounded-2xl bg-gold-soft px-4 py-2.5 text-[12px] flex items-center gap-2">
            <Tag tone="gold">{t('부스트됨')}</Tag>
            <span className="text-ink-2 truncate">{post.boost.tier === 'cross' ? t('크로스 네트워크 부스트') : t('커뮤니티 부스트')} · ~{formatDate(post.boost.until)}</span>
          </div>
        )}
        {post.sponsored ? <SponsoredRow post={post} expanded onClick={() => { /* 상세에서는 접지 않는다 */ }} /> : <PostCard post={post} openComments />}
      </div>
      {mine && <BoostSheet open={boost} onClose={() => setBoost(false)} postId={post.id} />}
    </div>
  );
}
