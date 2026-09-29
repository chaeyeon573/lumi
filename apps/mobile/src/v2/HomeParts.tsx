import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { t } from '@core/i18n';
import { tw } from '@/tw';
import { Button, CardFrame, C } from '@/ui';

/** 홈·탭 공용 섹션 머리 — 제목 20/700 + 오른쪽 "전체보기 >" (링크 파랑). 섹션 사이 28 (웹 HomePage Section) */
export function HSection({ title, action, onAction, children, sub }: { title: string; action?: string; onAction?: () => void; children: ReactNode; sub?: string }) {
  return (
    <View style={tw`mt-7`}>
      <View style={tw`flex-row items-end justify-between mb-3`}>
        <Text numberOfLines={2} style={[tw`flex-1 text-[20px] font-bold text-ink mr-2`, { letterSpacing: -0.4 }]}>{title}</Text>
        {action ? <Pressable onPress={onAction} hitSlop={6} style={tw`flex-row items-center`}><Text style={tw`text-[13px] font-semibold text-verify`}>{action}</Text><ChevronRight size={14} color={C.verify} /></Pressable> : null}
      </View>
      {sub ? <Text style={tw`-mt-2 mb-3 text-[12px] text-ink-3`}>{sub}</Text> : null}
      {children}
    </View>
  );
}

/**
 * 섹션 줄이기 — 한 화면 섹션은 3개까지. 나머지는 "더 보기" 카드 하나로 접고, 누르면 그 자리에서 펼친다 (기능은 그대로).
 * titles 는 접힌 섹션 이름 (빈 문자열은 빠진다). 웹 HomePage MoreSections 와 같다.
 */
export function MoreSections({ titles, children, top = 28 }: { titles: string[]; children: ReactNode; top?: number }) {
  const [open, setOpen] = useState(false);
  const names = titles.filter(Boolean);
  if (names.length === 0 && !open) return null;
  if (open) return <>{children}<Pressable onPress={() => setOpen(false)} style={tw`mt-4 h-10 rounded-full items-center justify-center`}><Text style={tw`text-[13px] font-semibold text-ink-3`}>{t('접기')}</Text></Pressable></>;
  return (
    <Pressable onPress={() => setOpen(true)} style={{ marginTop: top }}>
      <CardFrame flexDirection="row" alignItems="center" paddingHorizontal={16} paddingVertical={14}>
        <View style={tw`flex-1 min-w-0`}>
          <Text style={tw`text-[14px] font-semibold text-ink`}>{t('더 보기')}</Text>
          <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{names.join(' · ')}</Text>
        </View>
        <ChevronDown size={18} color={C.ink3} />
      </CardFrame>
    </Pressable>
  );
}

/** 테두리 카드 안의 행 목록 (divide-y) — 카드 규칙: 반경 20 · 1px 선 · 옅은 그림자 */
export function CardList({ children }: { children: ReactNode }) {
  return <CardFrame padding={0} overflow="hidden">{children}</CardFrame>;
}

/** 아이콘 · 제목/부제 · > 한 줄 */
export function Row({ icon, color, title, sub, right, onPress, last }: { icon: ReactNode; color: string; title: string; sub: string; right?: ReactNode; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={tw`flex-row items-center px-4 py-3 ${last ? '' : 'border-b border-line'}`}>
      <View style={[tw`h-10 w-10 rounded-xl items-center justify-center`, { backgroundColor: `${color}1A` }]}>{typeof icon === 'string' ? <Text style={tw`text-[18px]`}>{icon}</Text> : icon}</View>
      <View style={tw`flex-1 min-w-0 mx-3`}><Text numberOfLines={1} style={tw`text-[15px] font-semibold text-ink`}>{title}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{sub}</Text></View>
      {right ?? <ChevronRight size={16} color={C.ink3} />}
    </Pressable>
  );
}

/** 섹션 안의 작은 빈 상태 — 이모지 1 · 제목 15/700 · 설명 13 · 버튼 하나 */
export function SmallEmpty({ emoji, title, description, action, onAction }: { emoji?: string; title: string; description?: string; action: string; onAction: () => void }) {
  return (
    <CardFrame alignItems="center" paddingHorizontal={20} paddingVertical={24}>
      {emoji ? <Text style={tw`text-[26px]`}>{emoji}</Text> : null}
      <Text style={tw`mt-1 text-[15px] font-bold text-ink-2 text-center`}>{title}</Text>
      {description ? <Text style={tw`mt-1 text-[13px] text-ink-3 text-center`}>{description}</Text> : null}
      <View style={tw`mt-3`}><Button size="sm" variant="outline" onPress={onAction}>{action}</Button></View>
    </CardFrame>
  );
}
