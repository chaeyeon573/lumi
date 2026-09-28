/**
 * 폼 조각 — 웹 profile_CareerFields(ChipsWithText) · 온보딩 CityPicker · 추천 설정 WantGrid 의 모바일판.
 * 화면은 hex 색 대신 이것들과 ui.tsx 기본 부품만 쓴다.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MapPin, Plus, Search } from 'lucide-react-native';
import { t } from '@core/i18n';
import { tw } from '@/tw';
import { Chip, Field, Input, C } from '@/ui';

/** 가로 한 줄 — `full` 버튼(flex-1)을 담는 그릇 */
export const Row = ({ children, style }: { children: ReactNode; style?: object }) => <View style={[tw`flex-row items-center`, style]}>{children}</View>;
/** 칩 여러 줄 */
export const Wrap = ({ children }: { children: ReactNode }) => <View style={tw`flex-row flex-wrap`}>{children}</View>;
/** 줄바꿈되는 칩 (아래 여백 포함) */
export const WChip = ({ active, onPress, children, size = 'sm' }: { active?: boolean; onPress?: () => void; children: ReactNode; size?: 'sm' | 'md' }) => <View style={tw`mb-1.5`}><Chip size={size} active={active} onPress={onPress}>{children}</Chip></View>;

/** 큰 제목 + 한 줄 설명 (온보딩 단계 머리) */
export function Heading({ title, sub }: { title: string; sub?: string }) {
  return <View style={tw`mb-5`}><Text style={tw`text-[24px] font-bold text-ink`}>{title}</Text>{sub ? <Text style={tw`text-[13px] text-ink-3 mt-1.5`}>{sub}</Text> : null}</View>;
}

/** 칩 + 자유 입력 — 흔한 값은 탭 한 번, 아니면 직접 쓰기. 선택된 칩을 다시 누르면 비운다 */
export function ChipsWithText({ options, value, onChange, placeholder, hint, label }: { options: string[]; value: string; onChange: (next: string) => void; placeholder?: string; hint?: string; label?: string }) {
  const same = (o: string) => value.trim().toLowerCase() === o.toLowerCase();
  const body = (
    <View>
      <Wrap>{options.map((o) => <WChip key={o} active={same(o)} onPress={() => onChange(same(o) ? '' : o)}>{o}</WChip>)}</Wrap>
      <Input placeholder={placeholder ?? t('직접 입력')} value={value} onChangeText={onChange} style={tw`mt-1`} />
    </View>
  );
  return label ? <Field label={label} hint={hint}>{body}</Field> : body;
}

/** 도시 고르기 — 검색 + 칩 + 목록에 없으면 직접 추가 (정확한 주소는 받지 않는다) */
export function CityPicker({ value, onChange, placeholder, cities }: { value: string; onChange: (v: string) => void; placeholder: string; cities: string[] }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const list = needle ? cities.filter((c) => c.toLowerCase().includes(needle)) : cities;
  const custom = !!needle && !cities.some((c) => c.toLowerCase() === needle);
  const add = () => { if (q.trim()) { onChange(q.trim()); setQ(''); } };
  return (
    <View>
      <View style={tw`h-12 px-3.5 rounded-2xl border border-input-line bg-white flex-row items-center`}>
        <Search size={16} color={C.ink3} />
        <Input style={tw`flex-1 h-11 border-0 px-2`} placeholder={placeholder} value={q} onChangeText={setQ} onSubmitEditing={add} returnKeyType="done" />
      </View>
      <View style={tw`mt-2.5 flex-row flex-wrap`}>
        {value && !list.includes(value) ? <WChip size="md" active onPress={() => onChange('')}>📍 {value}</WChip> : null}
        {list.map((c) => <WChip key={c} size="md" active={value === c} onPress={() => onChange(value === c ? '' : c)}>{value === c ? '📍 ' : ''}{c}</WChip>)}
        {custom ? <View style={tw`mb-1.5`}><Pressable onPress={add} style={tw`h-9 px-4 mr-2 rounded-full bg-surface-2 flex-row items-center`}><Plus size={12} color={C.primary} /><Text style={tw`ml-1 text-[13px] font-semibold text-primary`}>{q.trim()}</Text></Pressable></View> : null}
      </View>
    </View>
  );
}

/** 큰 선택 카드 2열 (이모지 + 라벨) — 추천 설정 · 온보딩 "무엇을 찾나" */
export function WantGrid<T extends string>({ all, value, labels, emoji, onToggle }: { all: T[]; value: T[]; labels: Record<T, string>; emoji: Record<T, string>; onToggle: (k: T) => void }) {
  return (
    <View style={tw`flex-row flex-wrap -mx-1`}>
      {all.map((k) => {
        const active = value.includes(k);
        return (
          <View key={k} style={tw`w-1/2 p-1`}>
            <Pressable onPress={() => onToggle(k)} accessibilityState={{ selected: active }} style={tw`h-[60px] rounded-[20px] border px-3 flex-row items-center ${active ? 'bg-primary border-primary' : 'bg-white border-line'}`}>
              <Text style={tw`text-[20px]`}>{emoji[k]}</Text>
              <Text numberOfLines={2} style={tw`ml-2 flex-1 text-[13px] font-bold ${active ? 'text-white' : 'text-ink'}`}>{labels[k]}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

/** 라디오 행 (공개 범위 3단계 등) */
export function RadioRow({ on, title, desc, badge, onPress }: { on: boolean; title: string; desc?: string; badge?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} style={tw`mb-2 rounded-2xl border px-3.5 py-3 flex-row items-start ${on ? 'border-primary bg-primary-soft' : 'border-line bg-white'}`}>
      <View style={tw`mt-0.5 h-5 w-5 rounded-full border-2 items-center justify-center ${on ? 'border-primary' : 'border-line'}`}>{on ? <View style={tw`h-2.5 w-2.5 rounded-full bg-primary`} /> : null}</View>
      <View style={tw`flex-1 ml-3`}>
        <Text style={tw`text-[14px] font-semibold text-ink`}>{title}{badge ? <Text style={tw`text-[11px] font-bold text-verify`}>  {badge}</Text> : null}</Text>
        {desc ? <Text style={tw`text-[12px] text-ink-3 mt-0.5`}>{desc}</Text> : null}
      </View>
    </Pressable>
  );
}

/** 위치 핀 아이콘이 붙은 작은 줄 */
export const CityLine = ({ city }: { city: string }) => <View style={tw`flex-row items-center`}><MapPin size={11} color={C.ink3} /><Text style={tw`ml-0.5 text-[12px] text-ink-3`}>{city}</Text></View>;
