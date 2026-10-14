import { useState } from 'react';
import { t } from '@core/i18n';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, CalendarCheck, Flag, Trash2, BadgeCheck, Users, Sparkles, Puzzle, Check } from 'lucide-react';
import type { Post } from '@core/types';
import { Avatar, Cover, Button, BottomSheet, Input } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { relativeTime } from '@core/lib/format';
import { POST_TYPE_LABELS, topicLabel, CATEGORY_EMOJI } from '@core/lib/labels';
import { isTeamActivity } from '@core/lib/discover';
import { cn } from '@core/lib/cn';
import { likeCount } from '@core/lib/privacy';
import { ReportSheet } from '@/components/cards/ReportSheet';

export function PostCard({ post: p, className }: { post: Post; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const activities = useAppStore((s) => s.activities);
  const author = v.userById(p.authorId);
  const org = p.orgId ? v.orgById(p.orgId) : undefined;
  const related = p.relatedActivityId ? activities.find((a) => a.id === p.relatedActivityId) : undefined;
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const relatedOpp = p.relatedOpportunityId ? opps.find((o) => o.id === p.relatedOpportunityId) : undefined;
  const myOppIntent = relatedOpp ? intents.find((i) => i.opportunityId === relatedOpp.id && i.userId === v.me.id) : undefined;
  const tagged = (p.taggedUserIds ?? []).map((id) => ({ id, u: v.userById(id), ok: (p.tagApprovedIds ?? []).includes(id) })).filter((x) => x.u);
  const iAmTagged = tagged.find((x) => x.id === v.me.id);
  const liked = p.likeIds.includes(v.me.id);
  const saved = p.savedIds.includes(v.me.id);
  const following = v.isFollowing(org ? org.id : p.authorId ?? '');
  const [comments, setComments] = useState(false);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [reportComment, setReportComment] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [slide, setSlide] = useState(0);
  const isMine = p.authorId === v.me.id;

  const anon = !!p.anonymous;
  const displayName = anon ? t('익명') : org?.name ?? author?.nickname ?? t('알 수 없음');
  const TextBlock = () => (<>
    <p className={cn('leading-relaxed mt-1', p.media.length ? 'text-[15px]' : 'text-[17px]')}>{p.text}</p>
    {tagged.filter((x) => x.ok || x.id === v.me.id || isMine).length > 0 && <div className="mt-1 text-[12px] text-ink-2 flex items-center gap-1 flex-wrap"><Users size={11} className="text-ink-3" />{t('함께:')} {tagged.filter((x) => x.ok || x.id === v.me.id || isMine).map((x) => <button key={x.id} onClick={() => nav(`/users/${x.id}`)} className="font-semibold">{x.u!.nickname}{!x.ok && <span className="text-ink-3 font-normal"> ({t('승인 대기')})</span>}</button>)}</div>}
    {(p.tags.length > 0 || p.topics?.length || p.courseTag) && <div className="mt-1 text-[12px] text-primary">{[...(p.topics ?? []).map((k) => `#${topicLabel(k)}`), ...(p.courseTag ? [`📚${p.courseTag}`] : []), ...p.tags.map((tg) => `#${tg}`)].join(' ')}</div>}
  </>);
  const avatar = anon ? { emoji: '🫥', hue: 220 } : org ? org.logo : author?.avatar ?? { emoji: '👤', hue: 200 };
  const goAuthor = () => { if (anon) return; nav(org ? `/orgs/${org.id}` : `/users/${p.authorId}`); };
  // 익명 글은 서버가 글쓴이 대신 학교명만 보낸다 (내 글이면 내 학교)
  const anonSchool = !anon ? '' : p.anonSchool ?? (author?.affiliation.type === 'university' && author.affiliation.showSchool ? author.affiliation.schoolName ?? '' : '');

  return (
    <article className={cn('card overflow-hidden', className)}>
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <button onClick={goAuthor}><Avatar emoji={avatar.emoji} hue={avatar.hue} url={avatar.url} size={36} /></button>
        <div className="flex-1 min-w-0">
          <button onClick={goAuthor} className="text-[15px] font-bold truncate flex items-center gap-1">{displayName}{org?.verified && <BadgeCheck size={13} className="text-gold" />}</button>
          <div className="text-[12px] text-ink-3">{anonSchool && <>{anonSchool} · </>}{relativeTime(p.createdAt)}{p.postType && p.postType !== 'story' && <> · {POST_TYPE_LABELS[p.postType]}</>}</div>
        </div>
        {!isMine && !anon && (
          <button onClick={() => run(() => api.relationships.toggleFollow(v.me.id, org ? org.id : p.authorId!, org ? 'org' : 'user'))}
            className={cn('h-8 px-3 rounded-lg text-[12px] font-bold press', following ? 'bg-surface-2 text-ink-3' : 'bg-primary-soft text-primary')}>{following ? t('팔로잉') : t('팔로우')}</button>
        )}
        <button onClick={() => setMenu(true)} className="h-8 w-8 grid place-items-center text-ink-3" aria-label={t('더보기')}><MoreHorizontal size={18} /></button>
      </div>
      {p.media.length > 0 && <div className="relative">
        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar" onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {p.media.map((m, i) => <Cover key={i} emoji={m.emoji} hue={m.hue} url={m.url} className="h-[260px] w-full shrink-0 snap-center" size={80} />)}
        </div>
        {p.media.length > 1 && (
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1">{p.media.map((_, i) => <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i === slide ? 'bg-white' : 'bg-white/50')} />)}</div>
        )}
      </div>}
      <div className="px-3.5 pt-2.5 pb-3.5">
        {p.media.length === 0 && <div className="mb-1"><TextBlock /></div>}
        <div className="flex items-center gap-1 -ml-2">
          <button onClick={() => run(() => api.posts.toggleLike(p.id, v.me.id))} className={cn('h-9 px-2 rounded-lg flex items-center gap-1 text-[13px] font-semibold press', liked ? 'text-heart' : 'text-ink-2')} aria-label={t('공감')}><Heart size={20} fill={liked ? 'currentColor' : 'none'} />{likeCount(p)}</button>
          <button onClick={() => setComments((c) => !c)} className="h-9 px-2 rounded-lg flex items-center gap-1 text-[13px] font-semibold text-ink-2 press"><MessageCircle size={20} />{p.comments.length}</button>
          <button onClick={() => showToast(t('링크를 복사했어요.'))} className="h-9 px-2 rounded-lg text-ink-2 press"><Share2 size={20} /></button>
          <span className="flex-1" />
          <button onClick={() => run(() => api.posts.toggleSave(p.id, v.me.id), saved ? undefined : t('저장했어요'))} className={cn('h-9 px-2 rounded-lg press', saved ? 'text-primary' : 'text-ink-2')}><Bookmark size={20} fill={saved ? 'currentColor' : 'none'} /></button>
        </div>
        {p.media.length > 0 && <TextBlock />}
        {iAmTagged && !iAmTagged.ok && (
          <div className="mt-3 rounded-xl bg-primary-soft px-3 py-2.5 text-[12px] flex items-center gap-2"><span className="flex-1">{t('함께한 사람으로 태그됐어요. 승인하면 내 프로필에도 보여요.')}</span><Button size="sm" variant="outline" onClick={() => run(() => api.posts.approveTag(p.id, v.me.id, false))}>{t('빼기')}</Button><Button size="sm" icon={<Check size={13} />} onClick={() => run(() => api.posts.approveTag(p.id, v.me.id, true), t('승인했어요.'))}>{t('승인')}</Button></div>
        )}
        {(related || relatedOpp || (!isMine && !anon)) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {related && <Button size="sm" variant="secondary" icon={isTeamActivity(related) ? <Puzzle size={14} /> : <CalendarCheck size={14} />} onClick={() => nav(`/activities/${related.id}`)}>{isTeamActivity(related) ? t('팀 참여 문의') : t('활동 자세히 보기')}</Button>}
            {relatedOpp && <Button size="sm" variant={myOppIntent ? 'secondary' : 'outline'} icon={<Sparkles size={14} />} onClick={() => run(() => api.opportunities.setIntent(relatedOpp.id, v.me.id, myOppIntent ? null : 'interested'), myOppIntent ? undefined : t('관심 표시했어요.'))}>{myOppIntent ? t('나도 관심 있어요 ✓') : t('나도 관심 있어요')}</Button>}
            {!isMine && !anon && !org && <Button size="sm" variant={p.recruitNext ? 'primary' : 'outline'} icon={<span>{related ? CATEGORY_EMOJI[related.category] : '☕'}</span>} onClick={() => nav(`/users/${p.authorId}?propose=1&cat=${related?.category ?? 'coffee'}`)}>{t('다음에는 같이하기')}</Button>}
          </div>
        )}
        {comments && (
          <div className="mt-3 border-t border-line pt-3 space-y-2">
            {p.comments.length === 0 && <p className="text-[12px] text-ink-3">{t('첫 댓글을 남겨보세요.')}</p>}
            {p.comments.map((c) => { const u = v.userById(c.authorId); const cAnon = anon; return (
              <div key={c.id} className="flex gap-2 text-[13px]"><Avatar emoji={cAnon ? '🫥' : (u?.avatar.emoji ?? '👤')} hue={cAnon ? 220 : (u?.avatar.hue ?? 200)} url={cAnon ? undefined : u?.avatar.url} size={24} /><div><b className="mr-1">{cAnon ? (c.byAuthor || (!!c.authorId && c.authorId === p.authorId) ? t('글쓴이') : t('익명')) : u?.nickname}</b>{c.text}<span className="text-ink-3 text-[11px] ml-1.5">{relativeTime(c.createdAt)}</span>{c.authorId !== v.me.id && <button onClick={() => setReportComment(c.id)} className="ml-1.5 align-middle text-ink-3" aria-label={t('신고하기')}><Flag size={11} /></button>}</div></div>
            ); })}
            <form className="flex gap-2 pt-1" onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; await run(() => api.posts.comment(p.id, v.me.id, text.trim())); setText(''); }}>
              <Input placeholder={t('댓글 달기…')} value={text} onChange={(e) => setText(e.target.value)} className="h-10" />
              <Button size="sm" className="h-10" type="submit" disabled={!text.trim()}>{t('게시')}</Button>
            </form>
          </div>
        )}
      </div>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={t('게시물')}>
        <div className="space-y-1">
          {related && <SheetItem icon={<CalendarCheck size={18} />} label={t('관련 활동 확인')} onClick={() => { setMenu(false); nav(`/activities/${related.id}`); }} />}
          {!isMine && <SheetItem icon={<Flag size={18} />} label={t('게시물 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />}
          {isMine && <SheetItem icon={<Trash2 size={18} />} label={t('삭제')} danger onClick={async () => { setMenu(false); await run(() => api.posts.remove(p.id), t('게시물을 삭제했어요.')); }} />}
        </div>
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="post" targetId={p.id} />
      <ReportSheet open={!!reportComment} onClose={() => setReportComment(null)} targetType="comment" targetId={reportComment ?? ''} />
    </article>
  );
}

export function SheetItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-3 rounded-xl px-3 h-12 text-[14px] font-semibold press hover:bg-surface-2', danger ? 'text-danger' : 'text-ink')}>
      {icon}{label}
    </button>
  );
}
