import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Users, CalendarPlus, Coffee } from 'lucide-react-native';
import type { ActivityCategory, Visibility } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { t, lang } from '@core/i18n';
import { DAY_LABELS, toHHMM, todayIdx } from '@core/lib/timetable';
import { slotSuggestions } from '@core/lib/social';
import { PLACE_PRESETS } from '@core/data/places';
import { addDaysISO } from '@core/lib/format';
import { CATEGORY_EMOJI, VISIBILITY_LABELS } from '@core/lib/labels';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { BottomSheet, Button, Chip, Avatar, Tag, C } from '@/ui';

const OPTIONS: { key: ActivityCategory | 'unknown'; label: string; emoji: string }[] = [
  { key: 'meal', label: t('점심'), emoji: '🍱' }, { key: 'coffee', label: t('커피'), emoji: '☕' }, { key: 'study', label: t('공부'), emoji: '📚' },
  { key: 'etc', label: t('산책'), emoji: '🚶' }, { key: 'exercise', label: t('운동'), emoji: '🏃' }, { key: 'unknown', label: t('아직 모르겠어요'), emoji: '🤷' },
];

/** 공강 = 활동 생성. 공강을 누르면 무엇을 할지 고르고 바로 사람을 찾는다 */
export function OpenSlotSheet({ open, onClose, day, block }: { open: boolean; onClose: () => void; day: number; block: { start: number; end: number } | null }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const [cat, setCat] = useState<ActivityCategory | 'unknown' | null>(null);
  const [vis, setVis] = useState<Visibility>('friends');
  const [busy, setBusy] = useState(false);
  if (!block) return null;
  const snap = { ...v.snap, organizations: orgs };
  const sug = slotSuggestions(snap, v.me, v.visibleActivities, block, day, (u) => v.canSeeField(u, 'timetable'));
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const place = (PLACE_PRESETS[schoolId] ?? PLACE_PRESETS[lang === 'en' ? 's_berkeley' : 's_yonsei'])[0];
  const dayLabel = lang === 'en' ? DAY_LABELS[day] : `${DAY_LABELS[day]}요일`;
  const range = `${toHHMM(block.start)}–${toHHMM(Math.min(block.end, block.start + 120))}`;
  const dateISO = addDaysISO((day - todayIdx() + 7) % 7);

  const create = async () => {
    if (!cat || cat === 'unknown') return;
    setBusy(true);
    const label = OPTIONS.find((o) => o.key === cat)!.label;
    try {
      const res = await run(() => api.activities.create(v.me.id, {
        kind: 'personal', category: cat, title: lang === 'en' ? `${label} together, ${dayLabel} ${range}?` : `${dayLabel} ${range} 공강 · ${label} 같이 할 사람?`,
        description: lang === 'en' ? `I'm free ${range}. Anyone up for ${label.toLowerCase()}?` : `${range} 공강이에요. ${label} 같이 하실 분!`,
        cover: { emoji: CATEGORY_EMOJI[cat], hue: 30 }, date: dateISO, startTime: toHHMM(block.start), endTime: toHHMM(Math.min(block.end, block.start + 120)),
        place, capacity: 4, fee: 0, joinPolicy: 'open', visibility: vis, openSlot: true,
      }), t('공강을 열었어요. 시간이 맞는 사람에게 보여요.'));
      onClose(); nav(`/activities/${res.activity.id}`);
    } catch { /* toast */ } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`${dayLabel} ${toHHMM(block.start)}–${toHHMM(block.end)} ${t('공강')}`} tall>
      <Text style={tw`text-[14px] font-bold text-ink`}>{t('이 시간에 무엇을 하고 싶어요?')}</Text>
      <View style={tw`flex-row flex-wrap mt-2`}>{OPTIONS.map((o) => <View key={o.key} style={tw`mb-2`}><Chip active={cat === o.key} onPress={() => setCat(o.key)}>{o.emoji} {o.label}</Chip></View>)}</View>
      {(sug.people.length > 0 || sug.acts.length > 0) && (
        <View style={tw`mt-3 rounded-2xl bg-surface-2 p-3.5`}>
          <View style={tw`flex-row items-center`}><Users size={14} color={C.primary} /><Text style={tw`ml-1.5 text-[13px] font-bold text-ink`}>{t('이 시간에 시간이 맞는 사람')}</Text></View>
          {sug.people.slice(0, 4).map((p) => (
            <Pressable key={p.u.id} onPress={() => { onClose(); nav(`/users/${p.u.id}?propose=1`); }} style={tw`flex-row items-center mt-2`}>
              <Avatar emoji={p.u.avatar.emoji} hue={p.u.avatar.hue} url={p.u.avatar.url} size={30} />
              <Text numberOfLines={1} style={tw`flex-1 mx-2.5 text-[12px] text-ink`}><Text style={tw`font-bold`}>{p.u.nickname}</Text> · {p.status}{p.want ? <Text style={tw`text-ink-3`}> · {p.want}</Text> : null}</Text>
              <Tag>{p.why}</Tag>
            </Pressable>
          ))}
          {sug.acts.slice(0, 3).map((a) => (
            <Pressable key={a.id} onPress={() => { onClose(); nav(`/activities/${a.id}`); }} style={tw`flex-row items-center mt-2`}>
              <View style={tw`h-[30px] w-[30px] rounded-lg bg-primary-soft items-center justify-center`}><Text>{a.cover.emoji}</Text></View>
              <Text numberOfLines={1} style={tw`flex-1 ml-2.5 text-[12px] text-ink`}><Text style={tw`font-bold`}>{a.title}</Text> · {a.startTime} {a.place.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {cat && cat !== 'unknown' && (
        <View style={tw`mt-4`}>
          <Text style={tw`text-[14px] font-bold text-ink mb-2`}>{t('같이 할 사람을 찾아볼까요? 누구에게 보일지 골라주세요.')}</Text>
          <View style={tw`flex-row flex-wrap`}>{(['friends', 'department', 'school', 'public'] as Visibility[]).map((k) => <View key={k} style={tw`mb-2`}><Chip size="sm" active={vis === k} onPress={() => setVis(k)}>{VISIBILITY_LABELS[k]}</Chip></View>)}</View>
        </View>
      )}
      {cat === 'unknown' && <View style={tw`mt-4 rounded-xl bg-primary-soft px-3 py-2.5`}><Text style={tw`text-[13px] text-ink-2`}>{t('괜찮아요. 위 사람들에게 커피 한 잔 제안해보거나, 나중에 다시 열어보세요.')}</Text></View>}
      <View style={tw`flex-row mt-4`}>
        <Button variant="outline" icon={<Coffee size={16} color={C.ink2} />} onPress={() => { onClose(); nav('/discover'); }}>{t("Who's free?")}</Button>
        <View style={tw`w-2`} />
        <Button full icon={<CalendarPlus size={16} color={C.onPrimary} />} disabled={!cat || cat === 'unknown'} loading={busy} onPress={create}>{t('공강 열기')}</Button>
      </View>
    </BottomSheet>
  );
}
