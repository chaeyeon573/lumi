import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { User } from '@core/types';
import { tw } from '@/tw';
import { Avatar, C } from '@/ui';

/** 칩을 줄바꿈으로 나열 (웹 flex-wrap gap) */
export function ChipWrap({ children }: { children: ReactNode }) {
  return <View style={tw`flex-row flex-wrap -mb-2`}>{children}</View>;
}
/** ChipWrap 안의 항목 (아래 여백) */
export function WrapItem({ children }: { children: ReactNode }) {
  return <View style={tw`mb-2`}>{children}</View>;
}

/** 아바타가 들어간 친구 선택 칩 */
export function FriendChip({ user, active, onPress }: { user: User; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={tw`h-8 pl-1.5 pr-3 rounded-full flex-row items-center mr-2 border ${active ? 'bg-tint border-primary' : 'bg-white border-line'}`}>
      <Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={20} />
      <Text style={tw`ml-1.5 text-[12px] font-semibold ${active ? 'text-primary' : 'text-ink-2'}`}>{user.nickname}</Text>
    </Pressable>
  );
}
/** 친구 목록 다중 선택 */
export function FriendChips({ friends, selected, onToggle }: { friends: User[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <ChipWrap>
      {friends.map((f) => <WrapItem key={f.id}><FriendChip user={f} active={selected.includes(f.id)} onPress={() => onToggle(f.id)} /></WrapItem>)}
      {friends.length === 0 && <Text style={tw`text-[12px] text-ink-3 mb-2`}>{t('친구가 없어요')}</Text>}
    </ChipWrap>
  );
}

/** 라디오 행 (웹의 joinPolicy 선택 버튼) */
export function RadioRow({ label, active, onPress, sub }: { label: string; active: boolean; onPress: () => void; sub?: string }) {
  return (
    <Pressable onPress={onPress} style={tw`rounded-xl px-3.5 min-h-[44px] py-2 flex-row items-center justify-between border mb-1.5 ${active ? 'border-primary bg-primary-soft' : 'border-line bg-white'}`}>
      <View style={tw`flex-1 mr-2`}><Text style={tw`text-[14px] font-medium text-ink`}>{label}</Text>{sub ? <Text style={tw`text-[12px] text-ink-3`}>{sub}</Text> : null}</View>
      <View style={tw`h-4 w-4 rounded-full border-2 ${active ? 'border-primary bg-primary' : 'border-line'}`} />
    </Pressable>
  );
}

/** 색상 선택 (hue 원형 버튼) */
export function HuePicker({ hues, value, onChange }: { hues: number[]; value: number; onChange: (h: number) => void }) {
  return (
    <View style={tw`flex-row flex-wrap`}>
      {hues.map((h) => (
        <Pressable key={h} onPress={() => onChange(h)} style={[tw`h-7 w-7 rounded-full mr-1.5 mb-1.5 items-center justify-center`, { backgroundColor: `hsl(${h}, 75%, 70%)`, borderWidth: value === h ? 2 : 0, borderColor: C.ink }]}>
          {value === h ? <Check size={14} color={C.ink} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

/** 웹 <select> 대체: 항목 목록 중 하나 선택 (빈 값 포함) */
export function SelectChips<T extends string>({ value, options, onChange, emptyLabel }: { value: T | ''; options: [T, string][]; onChange: (v: T | '') => void; emptyLabel?: string }) {
  const all: [T | '', string][] = emptyLabel !== undefined ? [['', emptyLabel], ...options] : options;
  return (
    <ChipWrap>
      {all.map(([k, l]) => (
        <WrapItem key={k || '__empty'}>
          <Pressable onPress={() => onChange(k)} style={tw`h-8 px-3 rounded-full items-center justify-center mr-2 border ${value === k ? 'bg-tint border-primary' : 'bg-white border-line'}`}>
            <Text numberOfLines={1} style={tw`text-[12px] font-semibold ${value === k ? 'text-primary' : 'text-ink-2'}`}>{l}</Text>
          </Pressable>
        </WrapItem>
      ))}
    </ChipWrap>
  );
}
