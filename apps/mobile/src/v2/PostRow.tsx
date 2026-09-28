import { Pressable, Text, View } from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { Post } from '@core/types';
import { POST_TYPE_LABELS, VISIBILITY_LABELS } from '@core/lib/labels';
import { relativeTime } from '@core/lib/format';
import { isBoosted } from '@core/lib/monetization';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { Avatar, Cover, Tag, C } from '@/ui';

/** 피드 게시물 한 줄 (웹 feed_PostRow) — 탭하면 상세(/feed/:id). 부스트 글은 태그, 공개 범위는 작은 글자(그룹 글은 그룹 이름) */
export function PostRow({ post: p, onPress, last }: { post: Post; onPress: () => void; last?: boolean }) {
  const v = useViewer();
  const author = v.userById(p.authorId);
  const org = p.orgId ? v.orgById(p.orgId) : undefined;
  const group = p.visibility === 'group' && p.groupId ? v.orgById(p.groupId) : undefined;
  const av = p.anonymous ? { emoji: '', hue: 210, url: undefined } : org ? org.logo : author?.avatar ?? { emoji: '', hue: 200, url: undefined };
  const name = p.anonymous ? t('익명') : org?.name ?? author?.nickname ?? '';
  const visLabel = p.visibility === 'group' ? (group?.name ?? VISIBILITY_LABELS.group) : VISIBILITY_LABELS[p.visibility];
  return (
    <Pressable onPress={onPress} style={tw`flex-row items-center py-3 ${last ? '' : 'border-b border-line'}`}>
      {p.anonymous ? <View style={tw`h-11 w-11 rounded-full bg-primary-soft items-center justify-center`}><Text style={tw`text-[13px] font-bold text-primary`}>?</Text></View> : <Avatar emoji={av.emoji} hue={av.hue} url={av.url} size={44} />}
      <View style={tw`flex-1 min-w-0 ml-3`}>
        <View style={tw`flex-row items-center`}>
          <Text numberOfLines={1} style={tw`text-[15px] font-semibold text-ink shrink`}>{name}</Text>
          {isBoosted(p) ? <View style={tw`ml-2`}><Tag tone="gold">{t('부스트됨')}</Tag></View> : null}
          {p.postType && p.postType !== 'story' ? <View style={tw`ml-2`}><Tag tone="primary">{POST_TYPE_LABELS[p.postType]}</Tag></View> : null}
          <View style={tw`flex-1`} /><Text style={tw`ml-2 text-[12px] text-ink-3`}>{relativeTime(p.createdAt)}</Text>
        </View>
        <Text numberOfLines={1} style={tw`text-[14px] text-ink-2 mt-0.5`}>{p.text}</Text>
        <View style={tw`flex-row items-center mt-1`}>
          <Heart size={12} color={C.ink3} /><Text style={tw`ml-1 mr-3 text-[12px] text-ink-3`}>{p.likeIds.length}</Text>
          <MessageCircle size={12} color={C.ink3} /><Text style={tw`ml-1 mr-3 text-[12px] text-ink-3`}>{p.comments.length}</Text>
          {visLabel ? <Text numberOfLines={1} style={tw`text-[11px] text-ink-3 max-w-[140px]`}>{visLabel}</Text> : null}
        </View>
      </View>
      {p.media[0] ? <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} size={56} style={tw`ml-3`} /> : null}
    </Pressable>
  );
}
