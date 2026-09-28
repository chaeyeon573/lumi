import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { RotateCw, Lock } from 'lucide-react-native';
import { t } from '@core/i18n';
import { tw } from '@/tw';
import { C } from '@/ui';

const Bone = ({ w, h = 12, r = 6, style }: { w: number | `${number}%`; h?: number; r?: number; style?: object }) => <View style={[{ width: w, height: h, borderRadius: r, backgroundColor: C.surface2 }, style]} />;

/** 섹션 스켈레톤 — 카드 n개 (가로 스트립이면 horizontal) (웹 SectionSkeleton) */
export function SectionSkeleton({ count = 2, horizontal }: { count?: number; horizontal?: boolean }) {
  return (
    <View accessibilityLabel={t('불러오는 중')} style={horizontal ? tw`flex-row overflow-hidden` : undefined}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[tw`rounded-[20px] border border-line bg-white p-3 flex-row`, horizontal ? tw`w-[260px] mr-3` : tw`mb-2.5`]}>
          <Bone w={48} h={48} r={24} />
          <View style={tw`flex-1 ml-3 py-1`}><Bone w="66%" h={14} /><Bone w="50%" style={tw`mt-2`} /><Bone w="75%" h={20} r={10} style={tw`mt-2`} /></View>
        </View>
      ))}
    </View>
  );
}

/** 부분 오류 — 이 섹션만 실패했을 때. 나머지 화면은 그대로 쓴다 */
export function SectionError({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <View accessibilityRole="alert" style={[tw`rounded-[20px] border border-line bg-surface-2 px-4 py-3 flex-row items-center`, { borderStyle: 'dashed' }]}>
      <Text style={tw`flex-1 text-[13px] text-ink-2`}>{message ?? t('이 부분을 불러오지 못했어요.')}</Text>
      <Pressable onPress={onRetry} style={tw`h-8 px-3 rounded-full bg-white border border-line flex-row items-center`}><RotateCw size={13} color={C.primary} /><Text style={tw`ml-1 text-[12px] font-semibold text-primary`}>{t('다시 시도')}</Text></Pressable>
    </View>
  );
}

/** 빈 섹션 — 단순한 빈 화면 대신 다음 행동 하나 */
export function SectionEmpty({ title, description, action, emoji = '🌱' }: { title: string; description?: string; action?: ReactNode; emoji?: string }) {
  return (
    <View style={tw`rounded-[20px] bg-surface-2 px-4 py-4 items-center`}>
      {emoji ? <Text style={tw`text-[22px]`}>{emoji}</Text> : null}
      <Text style={tw`mt-1 text-[14px] font-semibold text-ink text-center`}>{title}</Text>
      {description ? <Text style={tw`mt-0.5 text-[12px] text-ink-3 text-center`}>{description}</Text> : null}
      {action ? <View style={tw`mt-2.5 items-center`}>{action}</View> : null}
    </View>
  );
}

/** 섹션 한 줄 래퍼 — loading/error/empty/content 를 순서대로 */
export function Section({ loading, error, onRetry, empty, skeleton, children }: { loading: boolean; error: string | null; onRetry: () => void; empty?: ReactNode | false; skeleton?: ReactNode; children: ReactNode }) {
  if (loading) return <>{skeleton ?? <SectionSkeleton />}</>;
  if (error) return <SectionError onRetry={onRetry} />;
  if (empty) return <>{empty}</>;
  return <>{children}</>;
}

/** 비공개 안내 — 공개 범위 때문에 가려진 정보 */
export function PrivacyNote({ text }: { text: string }) {
  return <View style={tw`flex-row items-center px-1 mt-1.5`}><Lock size={11} color={C.ink3} /><Text style={tw`ml-1.5 text-[11px] text-ink-3 shrink`}>{text}</Text></View>;
}
