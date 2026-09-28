import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, BadgeCheck, CalendarCheck, Flag, Trash2 } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { Post } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { relativeTime } from '@core/lib/format';
import { POST_TYPE_LABELS, topicLabel } from '@core/lib/labels';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Avatar, Cover, Button, BottomSheet, Input, C } from '@/ui';

/** 게시물 카드 (펼친 상태): 작성자 · 본문 · 공감/댓글/저장 · 댓글 */
export function PostCard({ post: p }: { post: Post }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const author = v.userById(p.authorId);
  const org = p.orgId ? v.orgById(p.orgId) : undefined;
  const liked = p.likeIds.includes(v.me.id);
  const saved = p.savedIds.includes(v.me.id);
  const [comments, setComments] = useState(false);
  const [menu, setMenu] = useState(false);
  const [text, setText] = useState('');
  const isMine = p.authorId === v.me.id;
  const anon = !!p.anonymous;
  const name = anon ? t('익명') : org?.name ?? author?.nickname ?? '';
  const avatar = anon ? { emoji: '🫥', hue: 220 } : org ? org.logo : author?.avatar ?? { emoji: '👤', hue: 200 };
  const goAuthor = () => { if (anon) return; nav(org ? `/orgs/${org.id}` : `/users/${p.authorId}`); };
  const tags = [...(p.topics ?? []).map((k) => `#${topicLabel(k)}`), ...(p.courseTag ? [`📚${p.courseTag}`] : []), ...p.tags.map((tg) => `#${tg}`)];

  return (
    <View style={tw`card overflow-hidden mb-3`}>
      <View style={tw`flex-row items-center px-3.5 py-3`}>
        <Pressable onPress={goAuthor}><Avatar emoji={avatar.emoji} hue={avatar.hue} url={avatar.url} size={36} /></Pressable>
        <View style={tw`flex-1 min-w-0 ml-2.5`}>
          <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[15px] font-bold text-ink`}>{name}</Text>{org?.verified ? <BadgeCheck size={13} color={C.gold} style={tw`ml-1`} /> : null}</View>
          <Text style={tw`text-[12px] text-ink-3`}>{relativeTime(p.createdAt)}{p.postType && p.postType !== 'story' ? ` · ${POST_TYPE_LABELS[p.postType]}` : ''}</Text>
        </View>
        <Pressable onPress={() => setMenu(true)} hitSlop={8}><MoreHorizontal size={18} color={C.ink3} /></Pressable>
      </View>
      {p.media[0] ? <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} size={999} radius={0} style={{ width: '100%', height: 240 }} /> : null}
      <View style={tw`px-3.5 pt-2.5 pb-3.5`}>
        <Text style={tw`${p.media.length ? 'text-[15px]' : 'text-[17px]'} text-ink leading-6`}>{p.text}</Text>
        {tags.length ? <Text style={tw`mt-1 text-[12px] text-primary`}>{tags.join(' ')}</Text> : null}
        <View style={tw`flex-row items-center mt-2 -ml-1`}>
          <Pressable onPress={() => run(() => api.posts.toggleLike(p.id, v.me.id))} style={tw`h-9 px-2 flex-row items-center`}><Heart size={20} color={liked ? C.danger : C.ink2} fill={liked ? C.danger : 'none'} /><Text style={tw`ml-1 text-[13px] font-semibold text-ink-2`}>{p.likeIds.length}</Text></Pressable>
          <Pressable onPress={() => setComments((c) => !c)} style={tw`h-9 px-2 flex-row items-center`}><MessageCircle size={20} color={C.ink2} /><Text style={tw`ml-1 text-[13px] font-semibold text-ink-2`}>{p.comments.length}</Text></Pressable>
          <View style={tw`flex-1`} />
          <Pressable onPress={() => run(() => api.posts.toggleSave(p.id, v.me.id), saved ? undefined : t('저장했어요'))} style={tw`h-9 px-2`}><Bookmark size={20} color={saved ? C.primary : C.ink2} fill={saved ? C.primary : 'none'} /></Pressable>
        </View>
        {comments && (
          <View style={tw`mt-2 border-t border-line pt-3`}>
            {p.comments.length === 0 ? <Text style={tw`text-[12px] text-ink-3`}>{t('첫 댓글을 남겨보세요.')}</Text> : null}
            {p.comments.map((c) => { const u = v.userById(c.authorId); return (
              <View key={c.id} style={tw`flex-row mb-2`}><Avatar emoji={anon ? '🫥' : (u?.avatar.emoji ?? '👤')} hue={anon ? 220 : (u?.avatar.hue ?? 200)} url={anon ? undefined : u?.avatar.url} size={24} /><Text style={tw`flex-1 ml-2 text-[13px] text-ink`}><Text style={tw`font-bold`}>{anon ? (c.authorId === p.authorId ? t('글쓴이') : t('익명')) : u?.nickname} </Text>{c.text}<Text style={tw`text-ink-3 text-[11px]`}>  {relativeTime(c.createdAt)}</Text></Text></View>
            ); })}
            <View style={tw`flex-row items-center mt-1`}>
              <Input placeholder={t('댓글 달기…')} value={text} onChangeText={setText} style={tw`flex-1 h-10`} />
              <View style={tw`w-2`} /><Button size="sm" disabled={!text.trim()} onPress={async () => { await run(() => api.posts.comment(p.id, v.me.id, text.trim())); setText(''); }}>{t('게시')}</Button>
            </View>
          </View>
        )}
      </View>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={t('게시물')}>
        {p.relatedActivityId ? <SheetItem icon={<CalendarCheck size={18} color={C.ink} />} label={t('관련 활동 확인')} onPress={() => { setMenu(false); nav(`/activities/${p.relatedActivityId}`); }} /> : null}
        {!isMine ? <SheetItem icon={<Flag size={18} color={C.danger} />} label={t('게시물 신고')} danger onPress={() => { setMenu(false); run(() => api.reports.create(v.me.id, 'post', p.id, t('부적절한 게시물')), t('신고가 접수됐어요.')); }} /> : null}
        {isMine ? <SheetItem icon={<Trash2 size={18} color={C.danger} />} label={t('삭제')} danger onPress={async () => { setMenu(false); await run(() => api.posts.remove(p.id), t('게시물을 삭제했어요.')); }} /> : null}
      </BottomSheet>
    </View>
  );
}

export function SheetItem({ icon, label, onPress, danger }: { icon: React.ReactNode; label: string; onPress: () => void; danger?: boolean }) {
  return <Pressable onPress={onPress} style={tw`flex-row items-center rounded-xl px-3 h-12`}>{icon}<Text style={tw`ml-3 text-[14px] font-semibold ${danger ? 'text-danger' : 'text-ink'}`}>{label}</Text></Pressable>;
}
