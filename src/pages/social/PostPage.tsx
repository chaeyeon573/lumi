import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, Flag, Lock } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { Avatar } from '@/components/ui';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { BackHeader, PageTitle, EmptyState, cardCls } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { relativeTime } from '@core/lib/format';
import { FeedPost } from '@/components/social/FeedPost';

const en = lang === 'en';

/**
 * 글과 답글 (PDF S052) — 글 카드, "Replies", 아래 답글 칸.
 * 익명 글의 답글은 서버가 글쓴이 id 를 지운다 — 글쓴이가 단 답글만 "Author", 나머지는 "Anonymous".
 */
export function PostPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const p = v.visiblePosts.find((x) => x.id === id);
  if (!p) return (
    <div className="min-h-full bg-bg"><BackHeader title={en ? 'Post & replies' : '글과 답글'} />
      <EmptyState icon={<Lock size={30} />} title={en ? 'This post isn’t available' : '볼 수 없는 글이에요'} sub={en ? 'It was deleted, or it’s shared with a smaller group.' : '삭제됐거나 일부에게만 공개된 글이에요.'} action={{ label: en ? 'Back to Feed' : '피드로', onClick: () => nav('/social/feed') }} />
    </div>
  );
  const anon = !!p.anonymous;
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try { await run(() => api.posts.comment(p.id, v.me.id, text.trim())); setText(''); } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Post & replies' : '글과 답글'} />
      <PageTitle title={en ? 'Post & replies' : '글과 답글'} className="pb-3" />
      <div className="px-4 pb-6 flex-1">
        <FeedPost post={p} open={false} />
        <h2 className="ha-h2 mt-6 mb-3">{en ? 'Replies' : '답글'}</h2>
        <div className="space-y-3">
          {p.comments.map((c) => {
            const u = anon ? undefined : v.userById(c.authorId);
            const name = anon ? (c.byAuthor || (!!c.authorId && c.authorId === p.authorId) ? (en ? 'Author' : '글쓴이') : (en ? 'Anonymous' : '익명')) : u?.nickname ?? (en ? 'Someone' : '누군가');
            return (
              <div key={c.id} className={`${cardCls} p-4 flex gap-3`}>
                <button onClick={() => u && nav(u.id === v.me.id ? '/profile' : `/users/${u.id}`)} className="shrink-0" tabIndex={u ? 0 : -1}><Avatar emoji={anon ? '?' : u?.avatar.emoji ?? ''} hue={anon ? 260 : u?.avatar.hue ?? 200} url={anon ? undefined : u?.avatar.url} size={40} /></button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><b className="text-[14.5px] truncate">{name}</b><span className="text-[12px] text-ink-3 shrink-0">{relativeTime(c.createdAt)}</span><span className="flex-1" />
                    {c.authorId !== v.me.id && <button onClick={() => setReport(c.id)} aria-label={en ? 'Report reply' : '답글 신고'} className="text-ink-3 press"><Flag size={14} /></button>}</div>
                  <p className="text-[14px] text-ink-2 mt-0.5 whitespace-pre-wrap">{c.text}</p>
                </div>
              </div>
            );
          })}
          {!p.comments.length && <p className="text-[13.5px] text-ink-3">{en ? 'No replies yet.' : '아직 답글이 없어요.'}</p>}
        </div>
      </div>
      <form onSubmit={send} className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-line px-4 pt-3 pb-4 safe-bottom">
        <div className="h-[52px] rounded-full bg-surface border border-line flex items-center gap-2.5 pl-2 pr-1.5 focus-within:border-sel-line">
          <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={34} />
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={en ? 'Add a reply…' : '답글 달기…'} className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-ink-3" />
          <button type="submit" disabled={!text.trim() || busy} aria-label={en ? 'Send reply' : '답글 보내기'} className="h-10 w-10 rounded-full grid place-items-center text-sel-fg press disabled:opacity-40"><Send size={20} /></button>
        </div>
      </form>
      <ReportSheet open={!!report} onClose={() => setReport(null)} targetType="comment" targetId={report ?? ''} />
    </div>
  );
}
