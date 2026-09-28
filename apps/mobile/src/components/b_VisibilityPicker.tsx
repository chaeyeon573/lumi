import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Globe, School, Users, UserCheck, Lock, Building2, ChevronRight, Heart, UsersRound } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { Visibility } from '@core/types';
import { VISIBILITY_LABELS, VISIBILITY_ORDER } from '@core/lib/labels';
import { visibilityDescription } from '@core/lib/relations';
import { tw } from '@/tw';
import { BottomSheet, C } from '@/ui';

export const VISIBILITY_ICONS: Record<Visibility, typeof Globe> = {
  public: Globe, school: School, department: Building2, friends: Users, followers: Heart, selected: UserCheck, private: Lock, group: UsersRound,
};

interface Props {
  value: Visibility;
  onChange: (v: Visibility) => void;
  options?: Visibility[];
  compact?: boolean;
  label?: string;
}

/** 공개 범위 선택 — compact 모드는 한 줄 버튼(시트 열림), 기본은 라디오 리스트 (웹 VisibilityPicker) */
export function VisibilityPicker({ value, onChange, options = VISIBILITY_ORDER, compact, label = t('공개 범위') }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = VISIBILITY_ICONS[value];
  if (compact) {
    return (
      <>
        <Pressable onPress={() => setOpen(true)} style={tw`flex-row items-center h-7 px-2 rounded-lg bg-surface-2`}>
          <Icon size={13} color={C.ink2} />
          <Text style={tw`mx-1 text-[12px] font-semibold text-ink-2`}>{VISIBILITY_LABELS[value]}</Text>
          <ChevronRight size={12} color={C.ink3} />
        </Pressable>
        <BottomSheet open={open} onClose={() => setOpen(false)} title={label}>
          <VisibilityList value={value} options={options} onChange={(v) => { onChange(v); setOpen(false); }} />
        </BottomSheet>
      </>
    );
  }
  return <VisibilityList value={value} options={options} onChange={onChange} />;
}

export function VisibilityList({ value, options, onChange }: { value: Visibility; options: Visibility[]; onChange: (v: Visibility) => void }) {
  return (
    <View>
      {options.map((v) => {
        const I = VISIBILITY_ICONS[v];
        const active = v === value;
        return (
          <Pressable key={v} onPress={() => onChange(v)} style={tw`flex-row items-center rounded-xl px-3.5 py-3 border mb-1.5 ${active ? 'border-primary bg-primary-soft' : 'border-line bg-white'}`}>
            <View style={tw`h-9 w-9 rounded-xl items-center justify-center ${active ? 'bg-primary' : 'bg-surface-2'}`}><I size={17} color={active ? C.onPrimary : C.ink2} /></View>
            <View style={tw`flex-1 ml-3`}>
              <Text style={tw`text-[14px] font-semibold text-ink`}>{VISIBILITY_LABELS[v]}</Text>
              <Text style={tw`text-[12px] text-ink-3`}>{visibilityDescription(v)}</Text>
            </View>
            <View style={tw`h-5 w-5 rounded-full border-2 items-center justify-center ${active ? 'border-primary' : 'border-line'}`}>{active ? <View style={tw`h-2.5 w-2.5 rounded-full bg-primary`} /> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function VisibilityTag({ value }: { value: Visibility }) {
  const Icon = VISIBILITY_ICONS[value];
  return <View style={tw`flex-row items-center`}><Icon size={12} color={C.ink3} /><Text style={tw`ml-1 text-[11px] font-semibold text-ink-3`}>{VISIBILITY_LABELS[value]}</Text></View>;
}
