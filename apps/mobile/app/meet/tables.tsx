import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Bookmark, Clock, EyeOff, MapPin, Plus, RefreshCw, Users } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { Activity } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { getPlatform } from '@core/platform';
import { recommendSmallTables, type SmallTableRec } from '@core/lib/meet';
import { placeLabel } from '@core/lib/relations';
import { formatDateTime, todayISO } from '@core/lib/format';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Button, Cover, Tag, C } from '@/ui';
import { JoinButton } from '@/components/JoinButton';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { SubTitle, UndoBar } from '@/v2/Network';
import { Row } from '@/v2/Forms';

/** 관심 둔 작은 모임 — 이 기기에만 저장 (나만 봄, 주최자에게 알리지 않음) */
const INTERESTED_KEY = 'aroundu.tables.interested';
function readInterested(): string[] {
  try { const v = JSON.parse(getPlatform().getItem(INTERESTED_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
function writeInterested(ids: string[]) { try { getPlatform().setItem(INTERESTED_KEY, JSON.stringify(ids)); } catch { /* 저장 불가 — 화면 상태만 유지 */ } }
const PAGE = 5;

/** /meet/tables — Small Table 추천 (웹 SmallTablesPage). 1:1 커피챗 대신 4~6명이 모이는 작은 모임 */
export default function SmallTablesScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const participations = useAppStore((s) => s.participations);
  const s = useSectionState('small-tables');
  const [offset, setOffset] = useState(0);
  const [interested, setInterested] = useState<string[]>(readInterested);
  const [lastHidden, setLastHidden] = useState<Activity | null>(null);

  const recs = useMemo(() => recommendSmallTables(v.visibleActivities, v.me, v.users, participations, 20), [v, participations]);
  const rotated = recs.length ? [...recs.slice(offset % recs.length), ...recs.slice(0, offset % recs.length)].slice(0, PAGE) : [];
  const recIds = new Set(recs.map((r) => r.a.id));
  const saved = interested.map((id) => v.visibleActivities.find((a) => a.id === id)).filter((a): a is Activity => !!a && !recIds.has(a.id));

  const toggleInterest = (id: string) => {
    const on = interested.includes(id);
    const next = on ? interested.filter((x) => x !== id) : [id, ...interested];
    setInterested(next); writeInterested(next);
    showToast(on ? t('관심을 거뒀어요') : t('관심 둔 모임에 담았어요 · 주최자에게 알리지 않아요'), 'success');
  };
  const hide = async (a: Activity) => { try { await run(() => api.users.hide(v.me.id, 'activity', a.id), t('이 모임을 숨겼어요')); setLastHidden(a); } catch { /* toast */ } };
  const undo = async () => {
    if (!lastHidden) return;
    const a = lastHidden;
    try { await run(() => api.users.hide(v.me.id, 'activity', a.id, true), t('다시 보이게 했어요')); setLastHidden(null); } catch { /* toast */ }
  };
  const more = () => { setOffset((o) => o + Math.min(3, Math.max(1, recs.length - 1))); showToast(t('새 추천을 보여드려요')); };

  return (
    <View style={tw`flex-1 bg-white`}>
      <Screen title={t('작은 모임')}>
        <View style={tw`pt-3`}>
          <View style={tw`rounded-[24px] bg-primary-soft p-4`}>
            <View style={tw`flex-row items-center`}><Users size={16} color={C.primary} /><Text style={tw`ml-2 text-[15px] font-bold text-primary`}>{t('작은 모임 · 4~6명')}</Text></View>
            <Text style={tw`text-[13px] text-ink-2 mt-1`}>{t('4~6명이 모이는 작은 모임이 1:1보다 편해요')}</Text>
          </View>

          <View style={tw`mt-4`}>
            <Section loading={s.loading} error={s.error} onRetry={s.retry} skeleton={<SectionSkeleton count={3} />}
              empty={recs.length === 0 && (
                <SectionEmpty emoji="🍽️" title={t('지금 맞는 작은 모임이 없어요')} description={t('직접 열면 비슷한 사람에게 먼저 보여드려요')} action={
                  <View style={tw`flex-row flex-wrap justify-center`}>
                    <View style={tw`m-1`}><Button size="sm" icon={<Plus size={14} color={C.onPrimary} />} onPress={() => nav('/meet/create?small=1')}>{t('작은 모임 만들기')}</Button></View>
                    <View style={tw`m-1`}><Button size="sm" variant="outline" onPress={() => nav('/profile/wants')}>{t('찾는 활동 조정')}</Button></View>
                  </View>
                } />
              )}>
              {rotated.map((r) => <TableCard key={r.a.id} r={r} interested={interested.includes(r.a.id)} onInterest={() => toggleInterest(r.a.id)} onHide={() => hide(r.a)} />)}
              {recs.length > PAGE - 2 ? <Row><Button full variant="outline" icon={<RefreshCw size={15} color={C.ink2} />} onPress={more}>{t('새 추천 보기')}</Button></Row> : null}
            </Section>
          </View>

          {saved.length > 0 ? (
            <View style={tw`mt-5`}>
              <SubTitle>{`🔖 ${t('관심 둔 작은 모임')}`}</SubTitle>
              {saved.map((a) => <SavedRow key={a.id} a={a} onRemove={() => toggleInterest(a.id)} />)}
            </View>
          ) : null}
          <View style={tw`mt-3 pb-16 items-center`}><PrivacyNote text={t('참여 전에는 이름 대신 관심사가 겹치는 사람 수만 보여요')} /></View>
        </View>
      </Screen>
      {lastHidden ? <UndoBar text={`${t('숨겼어요')} · ${lastHidden.title}`} onUndo={undo} /> : null}
    </View>
  );
}

/** 추천 카드 — 제목 · n/정원 · 일시 · 지역 · 이유 · 겹치는 사람(아바타만) · [자세히] [관심] [참여] [숨기기] */
function TableCard({ r, interested, onInterest, onHide }: { r: SmallTableRec; interested: boolean; onInterest: () => void; onHide: () => void }) {
  const v = useViewer();
  const { a, reasons, filled, sharedPeople } = r;
  const mine = v.myParticipation(a.id);
  const place = placeLabel(a, v.me, mine?.status === 'approved');
  const closed = filled >= a.capacity || a.date < todayISO();
  const others = sharedPeople.filter((u) => u.id !== v.me.id);
  return (
    <View style={tw`mb-3 rounded-[24px] border border-line bg-white p-3.5`}>
      <Pressable onPress={() => nav(`/activities/${a.id}`)} style={tw`flex-row items-start`}>
        <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} size={56} />
        <View style={tw`flex-1 min-w-0 ml-3`}>
          <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`shrink text-[15px] font-bold text-ink`}>{a.title}</Text>{closed ? <View style={tw`ml-1.5`}><Tag>{t('모집이 끝났어요')}</Tag></View> : null}</View>
          <View style={tw`mt-0.5 flex-row items-center`}><Clock size={11} color={C.ink2} /><Text numberOfLines={1} style={tw`ml-1 text-[12px] text-ink-2`}>{formatDateTime(a.date, a.startTime)}</Text></View>
          <View style={tw`flex-row items-center`}><MapPin size={11} color={C.ink3} /><Text numberOfLines={1} style={tw`ml-1 text-[12px] text-ink-3`}>{place.name}{place.approximate ? ` · ${t('대략')}` : ''}</Text></View>
        </View>
        <View style={tw`ml-2 h-7 px-2.5 rounded-full bg-primary-soft justify-center`}><Text style={tw`text-[12px] font-bold text-primary`}>{filled}/{a.capacity}{t('명')}</Text></View>
      </Pressable>
      {reasons.length ? <View style={tw`mt-2.5 flex-row flex-wrap`}>{reasons.map((x) => <View key={x} style={tw`h-6 px-2 mr-1 mb-1 rounded-full bg-accent-soft justify-center`}><Text style={tw`text-[11px] font-bold text-primary`}>{x}</Text></View>)}</View> : null}
      {others.length > 0 ? (
        <View style={tw`mt-1.5 flex-row items-center`}>
          <View style={tw`flex-row`}>{others.slice(0, 3).map((u, i) => <Avatar key={u.id} emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={26} style={[tw`border-2 border-white`, i > 0 ? { marginLeft: -8 } : null]} />)}</View>
          <Text style={tw`ml-2 text-[12px] text-ink-2`}>{t('관심사 겹침')} {others.length}{t('명')}</Text>
        </View>
      ) : null}
      <View style={tw`mt-3 flex-row items-center`}>
        <Button size="sm" variant="outline" onPress={() => nav(`/activities/${a.id}`)}>{t('자세히')}</Button>
        <View style={tw`w-1.5`} />
        <Button size="sm" variant={interested ? 'primary' : 'secondary'} icon={<Bookmark size={13} color={interested ? C.onPrimary : C.primary} fill={interested ? C.onPrimary : 'none'} />} onPress={onInterest}>{t('관심 두기')}</Button>
        <View style={tw`flex-1`} />
        <JoinButton activity={a} size="sm" label={t('참여하기')} />
        <Pressable onPress={onHide} accessibilityLabel={t('숨기기')} style={tw`ml-1 h-9 w-9 rounded-full items-center justify-center`}><EyeOff size={16} color={C.ink3} /></Pressable>
      </View>
    </View>
  );
}

function SavedRow({ a, onRemove }: { a: Activity; onRemove: () => void }) {
  const v = useViewer();
  const filled = v.approvedCount(a.id) + 1;
  const past = a.date < todayISO();
  const closed = past || filled >= a.capacity;
  return (
    <View style={tw`mb-2 rounded-[20px] border border-line bg-white px-3 py-2.5 flex-row items-center ${closed ? 'opacity-80' : ''}`}>
      <Pressable onPress={() => nav(`/activities/${a.id}`)} style={tw`flex-1 min-w-0 flex-row items-center`}>
        <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} size={36} radius={12} />
        <View style={tw`flex-1 min-w-0 ml-2.5`}>
          <Text numberOfLines={1} style={tw`text-[13px] font-semibold text-ink`}>{a.title}</Text>
          <Text numberOfLines={1} style={tw`text-[11px] text-ink-3`}>{formatDateTime(a.date, a.startTime)} · {filled}/{a.capacity}</Text>
        </View>
      </Pressable>
      {closed ? <View style={tw`ml-1`}><Tag>{past ? t('지난 모임이에요') : t('모집이 끝났어요')}</Tag></View> : null}
      <Pressable onPress={onRemove} style={tw`px-1.5 ml-1`}><Text style={tw`text-[12px] font-semibold text-ink-3`}>{t('빼기')}</Text></Pressable>
    </View>
  );
}
