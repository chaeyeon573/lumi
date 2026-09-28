import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { tw } from '@/tw';
import { Button, C } from '@/ui';

/** 홈·탭 공용 섹션 머리 — 제목 + 오른쪽 "전체보기 >" (웹 HomePage Section) */
export function HSection({ title, action, onAction, children, sub }: { title: string; action?: string; onAction?: () => void; children: ReactNode; sub?: string }) {
  return (
    <View style={tw`mt-6`}>
      <View style={tw`flex-row items-end justify-between mb-2`}>
        <Text numberOfLines={1} style={tw`flex-1 text-[18px] font-bold text-primary mr-2`}>{title}</Text>
        {action ? <Pressable onPress={onAction} hitSlop={6} style={tw`flex-row items-center`}><Text style={tw`text-[12px] font-semibold text-primary`}>{action}</Text><ChevronRight size={14} color={C.primary} /></Pressable> : null}
      </View>
      {sub ? <Text style={tw`-mt-1 mb-2 text-[12px] text-ink-3`}>{sub}</Text> : null}
      {children}
    </View>
  );
}

/** 테두리 카드 안의 행 목록 (divide-y) */
export function CardList({ children }: { children: ReactNode }) {
  return <View style={tw`rounded-[24px] border border-line bg-white overflow-hidden`}>{children}</View>;
}

/** 아이콘 · 제목/부제 · > 한 줄 */
export function Row({ icon, color, title, sub, right, onPress, last }: { icon: ReactNode; color: string; title: string; sub: string; right?: ReactNode; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={tw`flex-row items-center px-3.5 py-3 ${last ? '' : 'border-b border-line'}`}>
      <View style={[tw`h-10 w-10 rounded-xl items-center justify-center`, { backgroundColor: `${color}1A` }]}>{typeof icon === 'string' ? <Text style={tw`text-[18px]`}>{icon}</Text> : icon}</View>
      <View style={tw`flex-1 min-w-0 mx-3`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{title}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{sub}</Text></View>
      {right ?? <ChevronRight size={16} color={C.ink3} />}
    </Pressable>
  );
}

/** 섹션 안의 작은 빈 상태 — 행동 하나만 */
export function SmallEmpty({ emoji, title, description, action, onAction }: { emoji?: string; title: string; description?: string; action: string; onAction: () => void }) {
  return (
    <View style={tw`rounded-[24px] border border-line bg-white items-center px-5 py-6`}>
      {emoji ? <Text style={tw`text-[26px]`}>{emoji}</Text> : null}
      <Text style={tw`mt-1 text-[15px] font-semibold text-ink-2 text-center`}>{title}</Text>
      {description ? <Text style={tw`mt-1 text-[12px] text-ink-3 text-center`}>{description}</Text> : null}
      <View style={tw`mt-3`}><Button size="sm" variant="outline" onPress={onAction}>{action}</Button></View>
    </View>
  );
}
