import { Heart, MessageCircle } from 'lucide-react';
import { t } from '@core/i18n';
import type { Post } from '@core/types';
import { Avatar, Cover, Tag } from '@/components/ui';
import { VISIBILITY_ICONS } from '@/components/ui/VisibilityPicker';
import { useViewer } from '@/hooks/useViewer';
import { POST_TYPE_LABELS, VISIBILITY_LABELS } from '@core/lib/labels';
import { relativeTime } from '@core/lib/format';
import { isBoosted } from '@core/lib/monetization';

/** 피드·검색 공용 게시물 한 줄 — 탭하면 상세(/feed/:id)로. 부스트 글은 Boosted 태그, 공개 범위는 작은 태그(그룹 글은 그룹 이름) */
export function PostRow({ post: p, onClick }: { post: Post; onClick: () => void }) {
  const v = useViewer();
  const author = v.userById(p.authorId);
  const org = p.orgId ? v.orgById(p.orgId) : undefined;
  const group = p.visibility === 'group' && p.groupId ? v.orgById(p.groupId) : undefined;
  const av = p.anonymous ? { emoji: '', hue: 210 } : org ? org.logo : author?.avatar ?? { emoji: '', hue: 200 };
  const name = p.anonymous ? t('익명') : org?.name ?? author?.nickname ?? '';
  const VisIcon = VISIBILITY_ICONS[p.visibility];
  const visLabel = p.visibility === 'group' ? (group?.name ?? VISIBILITY_LABELS.group) : VISIBILITY_LABELS[p.visibility];
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left press">
      {p.anonymous ? <span className="h-11 w-11 rounded-full bg-primary-soft grid place-items-center text-primary text-[13px] font-bold shrink-0">?</span> : <Avatar emoji={av.emoji} hue={av.hue} url={av.url} size={44} />}
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-ink truncate">{name}</span>
          {isBoosted(p) && <Tag tone="gold" className="h-5 shrink-0">{t('부스트됨')}</Tag>}
          {p.postType && p.postType !== 'story' && <span className="h-6 px-2.5 rounded-full bg-accent-soft text-primary text-[11px] font-semibold shrink-0">{POST_TYPE_LABELS[p.postType]}</span>}
          <span className="text-[12px] text-ink-3 ml-auto shrink-0">{relativeTime(p.createdAt)}</span>
        </span>
        <span className="block text-[14px] text-ink-2 truncate mt-0.5">{p.text}</span>
        <span className="flex items-center gap-3 text-[12px] text-ink-3 mt-1">
          <span className="flex items-center gap-1"><Heart size={12} />{p.likeIds.length}</span>
          <span className="flex items-center gap-1"><MessageCircle size={12} />{p.comments.length}</span>
          <span className="flex items-center gap-1 min-w-0 text-[11px]"><VisIcon size={11} className="shrink-0" /><span className="truncate max-w-[120px]">{visLabel}</span></span>
        </span>
      </span>
      {p.media[0] && <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} className="h-14 w-14 rounded-2xl shrink-0" size={20} />}
    </button>
  );
}
