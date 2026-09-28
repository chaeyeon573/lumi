import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check, Plus, Users, ArrowRight, MapPin } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { CATEGORY_LABELS } from '@core/lib/labels';
import { tally, optionLabel, closesIn } from '@core/lib/together';
import { addDaysISO } from '@core/lib/format';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Screen, Avatar, Button, Empty, BottomSheet, Input, Field, C } from '@/ui';

/** Plan Together — 겹치는 시간에 표 던지기 (웹 TogetherPage 와 동일) */
export default function TogetherScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const polls = useAppStore((s) => s.timePolls);
  const poll = polls.find((p) => p.id === id);
  const me = v.me;
  const [sel, setSel] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [custom, setCustom] = useState({ date: addDaysISO(1), startTime: '18:00', endTime: '19:30' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (poll) setSel(poll.votes[me.id] ?? []); }, [poll?.id, poll?.votes[me.id]?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!poll) return <Screen title="Plan Together"><Empty title={t('투표를 찾을 수 없어요')} /></Screen>;
  const isHost = poll.hostId === me.id;
  if (!isHost && !poll.inviteeIds.includes(me.id)) return <Screen title="Plan Together"><Empty title={t('초대받은 사람만 볼 수 있어요')} /></Screen>;
  const { rows, best, voted, total } = tally(poll);
  const people = [poll.hostId, ...poll.inviteeIds].map((u) => v.userById(u)).filter(Boolean);
  const myVote = poll.votes[me.id];
  const dirty = JSON.stringify([...sel].sort()) !== JSON.stringify([...(myVote ?? [])].sort());
  const decided = poll.status === 'decided';
  const open = poll.status === 'open';
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const save = async () => { setBusy(true); try { await run(() => api.together.vote(poll.id, me.id, sel), t('되는 시간을 저장했어요.')); } catch { /* */ } finally { setBusy(false); } };
  const decide = async (optionId: string) => { setBusy(true); try { const res = await run(() => api.together.decide(poll.id, optionId), t('시간을 확정했어요. 활동과 그룹 채팅방이 만들어졌어요.')); nav(`/activities/${res.activity.id}`); } catch { setBusy(false); } };

  const footer = open ? (
    <View>
      <View style={tw`flex-row`}>
        {isHost && best ? (
          <Button full size="lg" variant="secondary" loading={busy} onPress={() => decide(best.option.id)}>{lang === 'en' ? `Confirm Meetup (${optionLabel(best.option)})` : `${optionLabel(best.option)} 확정`}</Button>
        ) : (
          <Button full size="lg" disabled={!dirty} loading={busy} onPress={save}>{myVote ? (dirty ? t('선택 저장') : t('투표 완료')) : lang === 'en' ? `I can do these ${sel.length}` : `이 ${sel.length}개 시간 돼요`}</Button>
        )}
      </View>
      <Text style={tw`mt-2 text-center text-[12px] text-ink-3`}>{isHost ? (lang === 'en' ? 'Everyone free at that time gets invited' : '그 시간에 가능한 사람만 초대돼요') : (lang === 'en' ? 'Only the times you pick are shared' : '고른 시간만 공유돼요')}</Text>
    </View>
  ) : undefined;

  return (
    <Screen title={lang === 'en' ? 'Plan Together' : '시간 정하기'} footer={footer}>
      <View style={tw`pt-3`}>
        <View style={tw`mb-5`}>
          <Text style={tw`text-[30px] font-bold text-ink leading-9`}>{poll.title}</Text>
          <View style={tw`mt-1.5 flex-row items-center`}><MapPin size={15} color={C.verify} /><Text style={tw`ml-1.5 text-[14px] text-ink-2`}>{poll.place?.name ?? CATEGORY_LABELS[poll.category]} · {lang === 'en' ? `${total} friends` : `${total}명`}{open ? <Text style={tw`text-ink-3`}> · {closesIn(poll.closesAt)}</Text> : null}</Text></View>
        </View>
        <View style={tw`rounded-2xl bg-surface-2 px-4 py-3.5 flex-row items-center mb-5`}>
          <View style={tw`flex-1 min-w-0`}><Text style={tw`text-[15px] font-semibold text-ink`}>{lang === 'en' ? 'Squad' : '멤버'}</Text><Text style={tw`text-[13px] text-ink-2`}>{lang === 'en' ? `${voted} of ${total} voted` : `${total}명 중 ${voted}명 투표`}</Text></View>
          <View style={tw`flex-row items-center`}>
            {people.slice(0, 4).map((u, i) => <View key={u!.id} style={[tw`rounded-full border-2 border-white`, { marginLeft: i === 0 ? 0 : -8, opacity: poll.votes[u!.id] ? 1 : 0.4 }]}><Avatar emoji={u!.avatar.emoji} hue={u!.avatar.hue} url={u!.avatar.url} size={36} /></View>)}
            {people.length > 4 && <View style={[tw`h-9 w-9 rounded-full bg-accent items-center justify-center border-2 border-white`, { marginLeft: -8 }]}><Text style={tw`text-[12px] font-bold text-primary`}>+{people.length - 4}</Text></View>}
          </View>
        </View>
        <View>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <Text style={tw`text-[14px] font-semibold text-ink`}>{lang === 'en' ? 'Overlapping Free Times' : '겹치는 시간'}</Text>
            {open && <Pressable onPress={() => setAddOpen(true)} style={tw`flex-row items-center`}><Plus size={13} color={C.verify} /><Text style={tw`ml-1 text-[13px] font-semibold text-verify`}>{t('시간 제안')}</Text></Pressable>}
          </View>
          {sorted.map(({ option: o, count }) => {
            const on = sel.includes(o.id); const isDecided = poll.decidedOptionId === o.id; const top = best?.option.id === o.id;
            const lit = on || isDecided;
            return (
              <Pressable key={o.id} disabled={!open} onPress={() => setSel((s) => on ? s.filter((x) => x !== o.id) : [...s, o.id])} style={tw`rounded-full pl-2 pr-2 py-2 flex-row items-center mb-3 ${lit ? 'bg-white border border-line' : 'bg-surface-2'}`}>
                <View style={tw`h-11 w-11 rounded-full items-center justify-center ${lit ? 'bg-primary' : 'bg-white'}`}>{lit ? <Check size={20} color={C.onPrimary} /> : <Plus size={18} color={C.ink3} />}</View>
                <View style={tw`flex-1 min-w-0 mx-3`}><Text numberOfLines={1} style={tw`text-[16px] font-semibold text-ink`}>{optionLabel(o)}</Text><Text style={tw`text-[13px] ${top ? 'text-verify' : 'text-ink-3'}`}>{lang === 'en' ? `${count} friends free` : `${count}명 가능`}{o.suggested ? ` · ${t('공강 겹침')}` : ''}</Text></View>
                <View style={tw`h-8 px-3 rounded-full flex-row items-center ${top ? 'bg-accent' : 'bg-white'}`}><Users size={13} color={top ? C.primary : C.ink2} /><Text style={tw`ml-1 text-[12px] font-bold ${top ? 'text-primary' : 'text-ink-2'}`}>{count}</Text></View>
              </Pressable>
            );
          })}
        </View>
        {decided && poll.activityId && <View style={tw`flex-row mt-2`}><Button full size="lg" icon={<ArrowRight size={18} color={C.onPrimary} />} onPress={() => nav(`/activities/${poll.activityId}`)}>{lang === 'en' ? 'Open the hangout' : '약속 열기'}</Button></View>}
      </View>
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title={t('시간 제안')}>
        <Field label={t('날짜')}><Input placeholder="YYYY-MM-DD" value={custom.date} onChangeText={(date) => setCustom({ ...custom, date })} /></Field>
        <View style={tw`flex-row`}>
          <View style={tw`flex-1 mr-2`}><Field label={t('시작')}><Input placeholder="HH:MM" value={custom.startTime} onChangeText={(startTime) => setCustom({ ...custom, startTime })} /></Field></View>
          <View style={tw`flex-1`}><Field label={t('종료')}><Input placeholder="HH:MM" value={custom.endTime} onChangeText={(endTime) => setCustom({ ...custom, endTime })} /></Field></View>
        </View>
        <View style={tw`flex-row`}><Button full disabled={custom.startTime >= custom.endTime} onPress={async () => { await run(() => api.together.addOption(poll.id, me.id, custom), t('시간을 추가했어요.')); setAddOpen(false); }}>{t('추가')}</Button></View>
      </BottomSheet>
    </Screen>
  );
}
