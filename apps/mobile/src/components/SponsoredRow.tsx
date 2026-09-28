import { Linking, Pressable, Text, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { Post } from '@core/types';
import { tw } from '@/tw';
import { Cover, Tag, Button, C } from '@/ui';

/** 피드의 스폰서 글 — 접힌 행 / 펼친 딜 카드. 좋아요·댓글 없음 */
export function SponsoredRow({ post: p, expanded, onPress, last }: { post: Post; expanded: boolean; onPress: () => void; last?: boolean }) {
  const ad = p.sponsored!;
  const open = () => { if (ad.url) Linking.openURL(ad.url).catch(() => {}); };
  if (expanded) {
    return (
      <Pressable onPress={onPress} style={tw`my-2 card overflow-hidden`}>
        {p.media[0] ? <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} size={999} radius={0} style={{ width: '100%', height: 160 }} /> : null}
        <View style={tw`p-4`}>
          <View style={tw`flex-row items-center`}><Tag tone="gold">{t('광고')}</Tag><Text style={tw`ml-2 text-[12px] text-ink-3`}>{ad.advertiser}</Text></View>
          <Text style={tw`mt-2 text-[16px] font-bold text-ink`}>{p.text}</Text>
          {ad.deal ? <Text style={tw`mt-1 text-[13px] text-ink-2`}>{ad.deal}</Text> : null}
          <View style={tw`mt-3`}><Button variant="accent" icon={<ExternalLink size={15} color={C.primary} />} onPress={open}>{ad.cta}</Button></View>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} style={tw`flex-row items-center py-3 ${last ? '' : 'border-b border-line'}`}>
      {p.media[0] ? <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} size={44} radius={22} /> : <View style={tw`h-11 w-11 rounded-full bg-gold-soft`} />}
      <View style={tw`flex-1 min-w-0 ml-3`}>
        <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[15px] font-semibold text-ink shrink`}>{ad.advertiser}</Text><View style={tw`ml-2`}><Tag tone="gold">{t('광고')}</Tag></View></View>
        <Text numberOfLines={1} style={tw`text-[14px] text-ink-2 mt-0.5`}>{p.text}</Text>
      </View>
      <View style={tw`ml-3 h-8 px-3 rounded-full bg-accent justify-center`}><Text style={tw`text-[12px] font-semibold text-primary`}>{ad.cta}</Text></View>
    </Pressable>
  );
}
