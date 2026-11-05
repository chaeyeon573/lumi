import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Flag, Trash2 } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Post } from '@core/types';
import { Avatar, BottomSheet, Cover } from '@/components/ui';
import { cardCls } from '@/components/ha';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { relativeTime } from '@core/lib/format';
import { likeCount } from '@core/lib/privacy';
import { cn } from '@core/lib/cn';

const en = lang === 'en';

/** 글 종류 → 한 줄 (PDF "Campus question") */
const TYPE_LINE: Record<string, string> = en
  ? { question: 'Campus question', info: 'Tip', review: 'Review', together: 'Looking for company', news: 'Update', story: 'Post' }
  : { question: '질문', info: '팁', review: '후기', together: '같이할 사람', news: '소식', story: '글' };
export const postTypeLine = (p: Post) => TYPE_LINE[p.postType ?? 'story'] ?? TYPE_LINE.story;

/** 글쓴이 — 익명은 이름 대신 "Anonymous" + 학교, 동아리 글은 동아리 */
export function usePostAuthor(p: Post) {
  const v = useViewer();
  const author = v.userById(p.authorId);
  const org = p.orgId ? v.orgById(p.orgId) : undefined;
  const anon = !!p.anonymous;
  const name = anon ? (en ? 'Anonymous' : '익명') : org?.name ?? author?.nickname ?? (en ? 'Someone' : '누군가');
  const avatar = anon ? { emoji: '?', hue: 260 } : org ? org.logo : author?.avatar ?? { emoji: '', hue: 200 };
  const to = anon ? undefined : org ? `/orgs/${org.id}` : p.authorId ? `/users/${p.authorId}` : undefined;
  return { author, org, anon, name, avatar, to, sample: !!author?.sample };
}

/**
 * 피드 글 카드 (PDF S040·S052): 얼굴 · 이름 · "Campus question · 2h" · ···, 글, 사진(있을 때만), ♡ 💬 … 책갈피.
 * 누르면 글과 답글 화면(/posts/:id). 공감 수·답글 수는 실제 숫자만.
 */
export function FeedPost({ post: p, open = true, className }: { post: Post; open?: boolean; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const a = usePostAuthor(p);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const mine = p.authorId === v.me.id;
  const liked = p.likeIds.includes(v.me.id);
  const saved = p.savedIds.includes(v.me.id);
  const go = () => { if (open) nav(`/posts/${p.id}`); };
  const meta = [postTypeLine(p), a.sample ? (en ? 'Sample post' : '예시 글') : relativeTime(p.createdAt)].join(' · ');
  return (
    <article className={cn(cardCls, 'p-4', className)}>
      <div className="flex items-center gap-3">
        <button onClick={() => a.to && nav(a.to)} className="shrink-0" aria-label={a.name} tabIndex={a.to ? 0 : -1}><Avatar emoji={a.avatar.emoji} hue={a.avatar.hue} url={a.avatar.url} size={40} /></button>
        <button onClick={go} className="flex-1 min-w-0 text-left">
          <span className="block text-[14.5px] font-bold truncate">{a.name}</span>
          <span className="block text-[12px] text-ink-3 truncate">{meta}</span>
        </button>
        <button onClick={() => setMenu(true)} aria-label={en ? 'More' : '더 보기'} className="h-9 w-9 -mr-2 grid place-items-center text-ink-3 press"><MoreHorizontal size={20} /></button>
      </div>
      <button onClick={go} className="block w-full text-left mt-3">
        <p className="text-[15px] leading-snug whitespace-pre-wrap line-clamp-6">{p.text}</p>
        {p.media[0]?.url && <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} className="mt-3 h-[180px] w-full rounded-[14px]" size={40} />}
      </button>
      <div className="flex items-center gap-1 mt-3 -ml-2">
        <button onClick={() => run(() => api.posts.toggleLike(p.id, v.me.id))} aria-pressed={liked} aria-label={en ? 'Like' : '공감'}
          className={cn('h-9 px-2 rounded-full flex items-center gap-1.5 text-[13px] font-semibold press', liked ? 'text-sel-fg' : 'text-ink-2')}>
          <Heart size={19} fill={liked ? 'currentColor' : 'none'} />{likeCount(p) > 0 && likeCount(p)}
        </button>
        <button onClick={() => nav(`/posts/${p.id}`)} aria-label={en ? 'Replies' : '답글'} className="h-9 px-2 rounded-full flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 press">
          <MessageCircle size={19} />{p.comments.length > 0 && p.comments.length}
        </button>
        <span className="flex-1" />
        <button onClick={() => run(() => api.posts.toggleSave(p.id, v.me.id), saved ? undefined : (en ? 'Saved.' : '저장했어요.'))} aria-pressed={saved} aria-label={en ? 'Save' : '저장'}
          className={cn('h-9 w-9 grid place-items-center press', saved ? 'text-sel-fg' : 'text-ink-2')}><Bookmark size={19} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={en ? 'Post' : '글'}>
        <div className="space-y-1">
          {!mine && <SheetItem icon={<Flag size={18} />} label={en ? 'Report post' : '글 신고'} danger onClick={() => { setMenu(false); setReport(true); }} />}
          {mine && <SheetItem icon={<Trash2 size={18} />} label={en ? 'Delete' : '삭제'} danger onClick={async () => { setMenu(false); try { await run(() => api.posts.remove(p.id), en ? 'Post deleted.' : '글을 삭제했어요.'); if (!open) nav('/social/feed', { replace: true }); } catch { /* toast */ } }} />}
        </div>
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="post" targetId={p.id} />
    </article>
  );
}
