import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Plus, Trash2, Lock, Users, CalendarPlus, ChevronRight, Sparkles } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { Course } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { slotSuggestions } from '@core/lib/social';
import { DAY_LABELS, GRID_START, GRID_END, toMin, toHHMM, freeBlocks, overlapBlocks, statusNow, statusLabel, todayIdx, jsDayToIdx, fmtBlock, fmtHours, nowMin } from '@core/lib/timetable';
import { friendsOf } from '@core/lib/relations';
import { uid, addDaysISO } from '@core/lib/format';
import { CATEGORY_COLORS, CATEGORY_EMOJI } from '@core/lib/labels';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Screen, Button, BottomSheet, Field, Input, Tag, Empty, Loading, Avatar, Chip, C } from '@/ui';
import { OpenSlotSheet } from '@/components/OpenSlotSheet';
import { ClassSpaceContent } from '@/components/c_ClassSpace';
import { VisibilityPicker } from '@/components/c_VisibilityList';
import { HuePicker, ChipWrap, WrapItem } from '@/components/c_Form';

const HOUR_PX = 44;
const HUES = [220, 160, 15, 280, 45, 330, 120, 200, 60, 300];
const TIME_COL = 34;

const emptyCourse = (day: number): Course => ({ id: '', name: '', day, start: '10:00', end: '11:15', room: '', hue: HUES[Math.floor(Math.random() * HUES.length)] });

/** 시간표 — 주간 그리드 + 공강 열기 + 수업 추가/수정 (웹 TimetablePage 와 동일) */
export default function TimetableScreen() {
  const params = useLocalSearchParams<{ open?: string }>();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const participations = useAppStore((s) => s.participations);
  const orgs = useAppStore((s) => s.organizations);
  const me = v.me;
  const [editing, setEditing] = useState<Course | null>(null);
  const [slot, setSlot] = useState<{ day: number; block: { start: number; end: number } } | null>(null);
  const [space, setSpace] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openHandled = useRef(false);
  const today = todayIdx();
  const showWeekend = me.timetable.some((c) => c.day >= 5);
  const days = showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

  // 이번 주 참가 활동을 요일 블록으로
  const weekActs = useMemo(() => {
    const monday = new Date(); monday.setDate(monday.getDate() - today);
    const start = monday.toISOString().slice(0, 10); const end = addDaysISO(6, monday);
    return v.visibleActivities.filter((a) => a.date >= start && a.date <= end && (a.hostId === me.id || participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'approved')))
      .map((a) => ({ a, day: jsDayToIdx(new Date(a.date).getDay()) }));
  }, [v.visibleActivities, participations, me.id, today]);

  const now = statusNow(me.timetable);
  const myFree = freeBlocks(me.timetable, today);
  useEffect(() => {
    if (params.open && !openHandled.current && me.timetable.length) {
      openHandled.current = true;
      const nowM = nowMin();
      const b = myFree.find((x) => x.end > nowM) ?? myFree[0];
      if (b) setSlot({ day: today, block: { start: Math.max(b.start, nowM), end: b.end } });
    }
  }, [params.open]); // eslint-disable-line react-hooks/exhaustive-deps
  const friendIds = friendsOf(v.snap, me.id);
  const overlaps = friendIds.map((fid) => v.userById(fid)!).filter((f) => f && !!f.timetable?.length && v.canSeeField(f, 'timetable'))
    .map((f) => ({ f, blocks: overlapBlocks(myFree, freeBlocks(f.timetable ?? [], today)) })).filter((x) => x.blocks.length > 0);
  const bestBlock = overlaps.length ? overlaps.flatMap((o) => o.blocks).sort((a, b) => (b.end - b.start) - (a.end - a.start))[0] : null;

  const save = async () => {
    if (!editing || !editing.name.trim() || toMin(editing.start) >= toMin(editing.end)) return;
    setBusy(true);
    const course = { ...editing, id: editing.id || uid('c'), room: editing.room?.trim() || undefined };
    const next = editing.id ? me.timetable.map((c) => (c.id === course.id ? course : c)) : [...me.timetable, course];
    try { await run(() => api.users.update(me.id, { timetable: next }), editing.id ? t('수업을 수정했어요.') : t('수업을 추가했어요.')); setEditing(null); } catch { /* */ } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!editing?.id) return;
    setBusy(true);
    try { await run(() => api.users.update(me.id, { timetable: me.timetable.filter((c) => c.id !== editing.id) }), t('수업을 삭제했어요.')); setEditing(null); } catch { /* */ } finally { setBusy(false); }
  };

  /** 요일 칸 탭: 공강이면 활동 열기, 빈 칸이면 수업 추가 */
  const tapColumn = (d: number, y: number) => {
    const min = GRID_START * 60 + Math.floor(y / HOUR_PX) * 60;
    const fb = freeBlocks(me.timetable, d).find((b) => b.start <= min && min < b.end);
    if (fb && me.timetable.length) setSlot({ day: d, block: { start: Math.max(fb.start, Math.floor(min / 30) * 30), end: fb.end } });
    else setEditing({ ...emptyCourse(d), start: toHHMM(min), end: toHHMM(min + 75) });
  };

  if (status === 'loading') return <Screen title={t('시간표')}><Loading /></Screen>;
  if (status === 'error') return <Screen title={t('시간표')}><Empty title={error ?? t('문제가 발생했어요.')} action={<Button size="sm" onPress={() => init()}>{t('다시 시도')}</Button>} /></Screen>;

  const headerRight = (
    <View style={tw`flex-row items-center`}>
      <VisibilityPicker compact value={me.fieldVisibility.timetable} onChange={(vis) => run(() => api.users.update(me.id, { fieldVisibility: { ...me.fieldVisibility, timetable: vis } }))} options={['public', 'school', 'friends', 'private']} label={t('공강 시간 공개 범위')} />
      <Pressable onPress={() => setEditing(emptyCourse(today < 5 ? today : 0))} style={tw`ml-1 h-9 px-3 rounded-full flex-row items-center`}><Plus size={15} color={C.primary} /><Text style={tw`ml-1 text-[13px] font-semibold text-primary`}>{t('수업')}</Text></Pressable>
    </View>
  );

  const upcomingFree = myFree.filter((b) => b.end > nowMin());

  return (
    <Screen title={t('시간표')} right={headerRight}>
      <View style={tw`pt-3`}>
        {me.timetable.length > 0 && (
          <View style={[tw`rounded-[24px] border border-line p-3.5 flex-row items-center mb-3`, { backgroundColor: now.kind === 'in_class' ? '#FFF4DE' : '#E1F7F0' }]}>
            <View style={tw`h-2.5 w-2.5 rounded-full ${now.kind === 'in_class' ? 'bg-gold' : 'bg-mint'}`} />
            <View style={tw`flex-1 min-w-0 mx-3`}>
              <Text style={tw`text-[14px] font-bold text-ink`}>{lang === 'en' ? `${DAY_LABELS[today]} · ${statusLabel(now)}` : `${DAY_LABELS[today]}요일 · ${statusLabel(now)}`}</Text>
              <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{now.kind === 'in_class' ? `${now.course.name}${now.course.room ? ` · ${now.course.room}` : ''}` : now.kind === 'free' && now.next ? `${t('다음 수업 ')}${now.next.start} ${now.next.name}` : t('오늘 남은 시간은 자유예요')}</Text>
            </View>
            <Tag>{me.timetable.length}{t('개 수업')}</Tag>
          </View>
        )}

        {me.timetable.length > 0 && upcomingFree.length > 0 && (
          <View style={tw`rounded-[24px] border border-line bg-white p-3.5 mb-3`}>
            <Text style={tw`text-[13px] font-bold text-ink`}>{t('오늘 공강에 끼워 넣을 수 있는 것')}</Text>
            <View style={tw`mt-2`}>
              {upcomingFree.slice(0, 3).map((b) => { const sg = slotSuggestions({ ...v.snap, organizations: orgs }, me, v.visibleActivities, b, today, (u) => v.canSeeField(u, 'timetable')); return (
                <Pressable key={b.start} onPress={() => setSlot({ day: today, block: b })} style={tw`flex-row items-center rounded-xl bg-surface-2 px-3 py-2.5 mb-1.5`}>
                  <Text style={tw`text-[12px] font-bold text-mint`}>{fmtBlock(b)}</Text>
                  <Text numberOfLines={1} style={tw`flex-1 mx-3 text-[12px] text-ink-2`}>{lang === 'en' ? `${sg.people.length} free · ${sg.acts.length} nearby` : `시간 맞는 사람 ${sg.people.length}명 · 근처 활동 ${sg.acts.length}개`}</Text>
                  <Text style={tw`text-[11px] font-bold text-primary`}>{t('열기')}</Text>
                </Pressable>
              ); })}
            </View>
          </View>
        )}

        {me.timetable.length === 0 ? (
          <Empty title={t('시간표가 비어 있어요')} description={t('수업을 추가하면 공강 시간에 맞는 친구와 활동을 추천해요. 강의실과 전체 시간표는 다른 사람에게 공개되지 않아요.')}
            action={<Button icon={<Plus size={16} color="#fff" />} onPress={() => setEditing(emptyCourse(today < 5 ? today : 0))}>{t('첫 수업 추가')}</Button>} />
        ) : (
          <View style={tw`rounded-[24px] border border-line bg-white overflow-hidden mb-3`}>
            <View style={tw`flex-row`}>
              <View style={{ width: TIME_COL }} />
              {days.map((d) => <View key={d} style={tw`flex-1 items-center py-2`}><Text style={tw`text-[12px] font-bold ${d === today ? 'text-primary' : 'text-ink-3'}`}>{DAY_LABELS[d]}</Text></View>)}
            </View>
            <View style={[tw`flex-row border-t border-line`, { height: hours.length * HOUR_PX }]}>
              <View style={{ width: TIME_COL }}>{hours.map((h, i) => <Text key={h} style={[tw`absolute right-1.5 text-[10px] text-ink-3`, { top: i * HOUR_PX + 2 }]}>{h}</Text>)}</View>
              {days.map((d) => (
                <Pressable key={d} onPress={(e) => tapColumn(d, e.nativeEvent.locationY)} style={[tw`flex-1 border-l border-line`, d === today ? { backgroundColor: 'rgba(210,228,255,0.3)' } : null]}>
                  {hours.map((h, i) => <View key={h} pointerEvents="none" style={[tw`absolute left-0 right-0 border-t border-line`, { top: i * HOUR_PX, opacity: 0.7 }]} />)}
                  {me.timetable.filter((c) => c.day === d).map((c) => (
                    <Pressable key={c.id} onPress={() => setSpace(c.name)} style={[tw`absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 overflow-hidden`, { top: (toMin(c.start) - GRID_START * 60) / 60 * HOUR_PX, height: (toMin(c.end) - toMin(c.start)) / 60 * HOUR_PX - 2, backgroundColor: `hsl(${c.hue}, 80%, 90%)`, borderLeftWidth: 3, borderLeftColor: `hsl(${c.hue}, 70%, 55%)` }]}>
                      <Text numberOfLines={2} style={[tw`text-[10px] font-bold leading-[12px]`, { color: `hsl(${c.hue}, 60%, 30%)` }]}>{c.name}</Text>
                      {c.room ? <Text numberOfLines={1} style={tw`text-[9px] text-ink-3`}>{c.room}</Text> : null}
                    </Pressable>
                  ))}
                  {weekActs.filter((x) => x.day === d).map(({ a }) => (
                    <Pressable key={a.id} onPress={() => nav(`/activities/${a.id}`)} style={[tw`absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 overflow-hidden`, { top: Math.max(0, (toMin(a.startTime) - GRID_START * 60) / 60 * HOUR_PX), height: Math.max(22, (toMin(a.endTime) - toMin(a.startTime)) / 60 * HOUR_PX - 2), borderWidth: 2, borderStyle: 'dashed', borderColor: CATEGORY_COLORS[a.category], backgroundColor: `${CATEGORY_COLORS[a.category]}18` }]}>
                      <Text numberOfLines={2} style={[tw`text-[10px] font-bold leading-[12px]`, { color: CATEGORY_COLORS[a.category] }]}>{CATEGORY_EMOJI[a.category]} {a.title}</Text>
                    </Pressable>
                  ))}
                </Pressable>
              ))}
            </View>
            <View style={tw`px-3 py-2 flex-row items-center border-t border-line`}>
              <View style={tw`flex-row items-center mr-3`}><View style={[tw`h-2.5 w-2.5 rounded-sm bg-primary-soft mr-1`, { borderLeftWidth: 2, borderLeftColor: C.primary }]} /><Text style={tw`text-[11px] text-ink-3`}>{t('수업')}</Text></View>
              <View style={tw`flex-row items-center`}><View style={[tw`h-2.5 w-2.5 rounded-sm mr-1`, { borderWidth: 2, borderStyle: 'dashed', borderColor: C.mint }]} /><Text style={tw`text-[11px] text-ink-3`}>{t('참가 활동')}</Text></View>
              <Text numberOfLines={2} style={tw`flex-1 ml-3 text-right text-[11px] text-ink-3`}>{t('수업을 탭하면 수업 공간 · 공강은 활동 열기 · 빈 칸은 수업 추가')}</Text>
            </View>
          </View>
        )}

        {me.timetable.length > 0 && (
          <View style={tw`rounded-[24px] border border-line bg-white p-4 mb-3`}>
            <View style={tw`flex-row items-center`}><Users size={15} color={C.primary} /><Text style={tw`ml-1.5 text-[14px] font-bold text-ink`}>{t('오늘 공강이 겹치는 친구')}</Text></View>
            {overlaps.length === 0 ? (
              <Text style={tw`text-[12px] text-ink-3 mt-2`}>{friendIds.length === 0 ? t('친구를 추가하면 공강이 겹치는 시간을 알려드려요.') : t('오늘은 겹치는 공강이 없어요. 친구가 시간표를 공개하면 여기에 보여요.')}</Text>
            ) : (
              <>
                <View style={tw`mt-2 rounded-xl bg-primary-soft px-3 py-2.5 flex-row items-center`}>
                  <Sparkles size={14} color={C.primary} />
                  <Text style={tw`ml-2 flex-1 text-[13px] text-ink`}>{(() => { const n = overlaps.filter((o) => o.blocks.some((b) => bestBlock && b.start <= bestBlock.start && b.end >= bestBlock.end)).length; return lang === 'en' ? <><Text style={tw`font-bold`}>{n}</Text> friend{n === 1 ? '' : 's'} free at <Text style={tw`font-bold`}>{bestBlock && fmtBlock(bestBlock)}</Text>. Start something?</> : <><Text style={tw`font-bold`}>{bestBlock && fmtBlock(bestBlock)}</Text>에 시간이 맞는 친구가 <Text style={tw`font-bold`}>{n}명</Text> 있어요. 활동을 만들어볼까요?</>; })()}</Text>
                </View>
                <View style={tw`mt-2`}>
                  {overlaps.map(({ f, blocks }, i) => (
                    <Pressable key={f.id} onPress={() => nav(`/users/${f.id}`)} style={tw`flex-row items-center py-2.5 ${i < overlaps.length - 1 ? 'border-b border-line' : ''}`}>
                      <Avatar emoji={f.avatar.emoji} hue={f.avatar.hue} url={f.avatar.url} size={36} />
                      <View style={tw`flex-1 min-w-0 mx-3`}><Text style={tw`text-[13px] font-bold text-ink`}>{f.nickname}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{blocks.map((b) => `${fmtBlock(b)} (${fmtHours(b)})`).join(' · ')}</Text></View>
                      <ChevronRight size={16} color={C.ink3} />
                    </Pressable>
                  ))}
                </View>
                {bestBlock && <View style={tw`flex-row mt-2`}><Button full size="sm" icon={<CalendarPlus size={15} color="#fff" />} onPress={() => nav(`/create/activity?kind=personal&start=${toHHMM(bestBlock.start)}&end=${toHHMM(Math.min(bestBlock.end, bestBlock.start + 90))}`)}>{fmtBlock({ start: bestBlock.start, end: Math.min(bestBlock.end, bestBlock.start + 90) })} {t('활동 만들기')}</Button></View>}
              </>
            )}
          </View>
        )}

        <View style={tw`flex-row items-start px-1`}><Lock size={12} color={C.ink3} style={tw`mt-0.5`} /><Text style={tw`ml-1.5 flex-1 text-[11px] text-ink-3`}>{t('다른 사용자에게는 전체 시간표가 아닌 공강 여부만 보여요. 강의실은 어떤 설정에서도 공개되지 않아요.')}</Text></View>
      </View>

      <BottomSheet open={!!space} onClose={() => setSpace(null)} title={space ?? ''} tall>
        {space && <ClassSpaceContent courseName={space} onClose={() => setSpace(null)} onEdit={() => { const c = me.timetable.find((x) => x.name === space); setSpace(null); if (c) setEditing(c); }} />}
      </BottomSheet>
      <OpenSlotSheet open={!!slot} onClose={() => setSlot(null)} day={slot?.day ?? today} block={slot?.block ?? null} />
      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? t('수업 수정') : t('수업 추가')} tall>
        {editing && (
          <View>
            <Field label={t('과목명')}><Input autoFocus placeholder={t('예: 데이터베이스')} value={editing.name} onChangeText={(name) => setEditing({ ...editing, name })} /></Field>
            <Field label={t('요일')}><ChipWrap>{DAY_LABELS.map((d, i) => <WrapItem key={d}><Chip size="sm" active={editing.day === i} onPress={() => setEditing({ ...editing, day: i })}>{d}{t('요일')}</Chip></WrapItem>)}</ChipWrap></Field>
            <View style={tw`flex-row`}>
              <View style={tw`flex-1 mr-2`}><Field label={t('시작')}><Input placeholder="HH:MM" value={editing.start} onChangeText={(start) => setEditing({ ...editing, start })} /></Field></View>
              <View style={tw`flex-1`}><Field label={t('종료')}><Input placeholder="HH:MM" value={editing.end} onChangeText={(end) => setEditing({ ...editing, end })} /></Field></View>
            </View>
            <View style={tw`flex-row`}>
              <View style={tw`flex-1 mr-2`}><Field label={t('강의실 (나만 보기)')}><Input placeholder={t('예: 공학관 B103')} value={editing.room ?? ''} onChangeText={(room) => setEditing({ ...editing, room })} /></Field></View>
              <View style={tw`flex-1`}><Field label={t('교수 (선택)')}><Input value={editing.professor ?? ''} onChangeText={(professor) => setEditing({ ...editing, professor })} /></Field></View>
            </View>
            <Field label={t('색상')}><HuePicker hues={HUES} value={editing.hue} onChange={(hue) => setEditing({ ...editing, hue })} /></Field>
            <View style={tw`flex-row`}>
              {editing.id ? <><Button variant="danger" icon={<Trash2 size={16} color={C.danger} />} onPress={remove} loading={busy}>{t('삭제')}</Button><View style={tw`w-2`} /></> : null}
              <Button full loading={busy} disabled={!editing.name.trim() || toMin(editing.start) >= toMin(editing.end)} onPress={save}>{editing.id ? t('수정') : t('추가')}</Button>
            </View>
          </View>
        )}
      </BottomSheet>
    </Screen>
  );
}
