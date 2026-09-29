/**
 * 도와줄 수 있어요 · 찾고 있어요 (웹 profile_TagInput + ProfilePage/PersonPage 카드의 모바일판).
 * User.helpWith / User.seeking — 짧은 태그 최대 5개, 20자. 저장 시 엔진 users.update 가 한 번 더 다듬는다.
 */
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { StageKind } from '@core/lib/stage';
import { tw } from '@/tw';
import { C } from '@/ui';

const MAX_TAGS = 5;
const MAX_LEN = 20;

/** 짧은 태그 입력 — 추천 태그를 누르면 바로 들어간다 */
export function TagInput({ value, onChange, suggestions = [], placeholder }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = (x: string) => { const v = x.trim().slice(0, MAX_LEN); if (!v || value.includes(v) || value.length >= MAX_TAGS) { setDraft(''); return; } onChange([...value, v]); setDraft(''); };
  const rest = suggestions.filter((s) => !value.includes(s)).slice(0, 6);
  return (
    <View>
      <View style={tw`flex-row flex-wrap items-center`}>
        {value.map((x) => (
          <View key={x} style={tw`h-8 pl-3 pr-1 mr-1.5 mb-1.5 rounded-full bg-primary-soft flex-row items-center`}>
            <Text style={tw`text-[12px] font-bold text-primary`}>{x}</Text>
            <Pressable onPress={() => onChange(value.filter((y) => y !== x))} accessibilityLabel={`${x} ${t('빼기')}`} hitSlop={4} style={tw`h-6 w-6 rounded-full items-center justify-center`}><X size={12} color={C.primary} /></Pressable>
          </View>
        ))}
        {value.length < MAX_TAGS ? (
          <TextInput value={draft} onChangeText={(s) => (s.endsWith(',') ? add(s.slice(0, -1)) : setDraft(s))} onSubmitEditing={() => add(draft)} onBlur={() => add(draft)}
            placeholder={placeholder ?? t('입력하고 Enter')} placeholderTextColor={C.ink3} maxLength={MAX_LEN} returnKeyType="done" blurOnSubmit={false}
            style={tw`h-8 min-w-[140px] flex-1 mb-1.5 rounded-full border border-line bg-surface px-3 text-[13px] text-ink`} />
        ) : null}
      </View>
      {rest.length > 0 && value.length < MAX_TAGS ? (
        <View style={tw`mt-1 flex-row flex-wrap`}>
          {rest.map((s) => (
            <Pressable key={s} onPress={() => add(s)} style={[tw`h-7 px-2.5 mr-1.5 mb-1.5 rounded-full border border-line flex-row items-center`, { borderStyle: 'dashed' }]}>
              <Plus size={11} color={C.ink2} /><Text style={tw`ml-1 text-[12px] text-ink-2`}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** 단계별 추천 태그 (웹 helpSuggestions 와 같다) */
export function helpSuggestions(kind: StageKind): { help: string[]; seek: string[] } {
  if (kind === 'alumni') return { help: [t('취업·이직 이야기'), t('창업'), t('이 도시 생활'), t('대학원 준비'), t('포트폴리오 피드백')], seek: [t('같은 업계 동문'), t('러닝 메이트'), t('공동창업자'), t('이 도시 친구')] };
  if (kind === 'grad') return { help: [t('논문 읽기'), t('데이터 분석'), t('대학원 진학 상담'), t('연구실 생활')], seek: [t('공동 연구'), t('같은 분야 연구자'), t('박사 진학 선배'), t('산업계 선배')] };
  return { help: [t('수업 정리'), t('동아리 소개'), t('학교 앞 맛집'), t('디자인 툴')], seek: [t('창업 팀원'), t('스터디 친구'), t('운동 메이트'), t('선배 조언')] };
}

/** 보기용 태그 두 줄 — "도와줄 수 있어요 [..]" / "찾고 있어요 [..]". highlight 에 든 도움 태그는 초록(내가 찾는 것과 맞음) */
export function HelpSeekTags({ helpWith = [], seeking = [], highlight = [] }: { helpWith?: string[]; seeking?: string[]; highlight?: string[] }) {
  return (
    <View>
      {helpWith.length > 0 ? (
        <View>
          <Text style={tw`text-[11px] font-bold text-ink-3 mb-1`}>{t('도와줄 수 있어요')}</Text>
          <View style={tw`flex-row flex-wrap`}>{helpWith.map((x) => { const hit = highlight.includes(x); return <View key={x} style={tw`h-7 px-3 mr-1.5 mb-1.5 rounded-full justify-center ${hit ? 'bg-mint-soft' : 'bg-accent-soft'}`}><Text style={tw`text-[12px] font-semibold ${hit ? 'text-mint' : 'text-primary'}`}>{x}</Text></View>; })}</View>
        </View>
      ) : null}
      {seeking.length > 0 ? (
        <View style={helpWith.length > 0 ? tw`mt-1.5` : undefined}>
          <Text style={tw`text-[11px] font-bold text-ink-3 mb-1`}>{t('찾고 있어요')}</Text>
          <View style={tw`flex-row flex-wrap`}>{seeking.map((x) => <View key={x} style={tw`h-7 px-3 mr-1.5 mb-1.5 rounded-full border border-line justify-center`}><Text style={tw`text-[12px] font-semibold text-ink`}>{x}</Text></View>)}</View>
        </View>
      ) : null}
    </View>
  );
}
