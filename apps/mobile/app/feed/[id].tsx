import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from '@/tw';
import { Screen, Empty } from '@/ui';
import { PostCard } from '@/components/PostCard';

/** 게시물 상세 (웹 /feed/:id PostDetailPage) — 모바일은 기존 PostCard(좋아요·댓글·신고)를 그대로 쓴다 */
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = useAppStore((s) => s.posts.find((p) => p.id === id));
  return (
    <Screen title={t('게시물')}>
      <View style={tw`pt-2`}>{post ? <PostCard post={post} /> : <Empty title={t('게시물을 찾을 수 없어요')} />}</View>
    </Screen>
  );
}
