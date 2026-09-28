import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Bell, Check, FolderInput, Lock, MoreHorizontal, Pencil, Plus, Search, Trash2, UserX } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { ID, SavedList, User } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, BottomSheet, Button, Chip, Input, Segmented, Toggle, useConfirm, C } from '@/ui';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, PrivacyNote } from '@/v2/SectionState';
import { PersonRow } from '@/v2/PersonRow';
import { Row } from '@/v2/Forms';

type Sort = 'recent' | 'name';

/**
 * 저장한 사람 (웹 SavedPeoplePage) — 나만 보는 목록. 보기 → 저장 → 나중에 연결.
 * 탭: 전체 · 내가 만든 목록들 / 검색 · 정렬 / 사람마다 ⋯ (목록으로 옮기기 · 저장 해제) / 목록마다 ⋯ (이름 바꾸기 · 삭제 · 알림)
 */
export default function SavedPeopleScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const lists = me.savedLists ?? [];
  const [tab, setTab] = useState<ID | 'all'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [personMenu, setPersonMenu] = useState<ID | null>(null);
  const [listMenu, setListMenu] = useState(false);
  const [nameSheet, setNameSheet] = useState<{ mode: 'create' | 'rename'; value: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { confirm, el: confirmEl } = useConfirm();
  const sec = useSectionState('saved-people');

  const active: SavedList | undefined = tab === 'all' ? undefined : lists.find((l) => l.id === tab);
  const savedIds = me.savedPeople ?? [];
  const inTab = active ? active.memberIds.filter((id) => savedIds.includes(id)) : savedIds;
  const listOf = (id: ID) => lists.find((l) => l.memberIds.includes(id));

  const { people, gone } = useMemo(() => {
    const order = [...inTab].reverse(); // 최근 저장이 위로
    const found: User[] = []; const missing: ID[] = [];
    for (const id of order) { const u = v.visibleUsers.find((x) => x.id === id); if (u) found.push(u); else missing.push(id); }
    const needle = q.trim().toLowerCase();
    const filtered = needle ? found.filter((u) => [u.nickname, u.affiliation.type === 'university' ? u.affiliation.schoolName : u.affiliation.companyName, u.affiliation.type === 'university' ? u.affiliation.department : ''].some((s) => s?.toLowerCase().includes(needle))) : found;
    const sorted = sort === 'name' ? [...filtered].sort((a, b) => a.nickname.localeCompare(b.nickname, lang === 'en' ? 'en' : 'ko')) : filtered;
    return { people: sorted, gone: needle ? [] : missing };
  }, [inTab, v.visibleUsers, q, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const unsave = async (id: ID) => {
    setPersonMenu(null);
    try {
      if (listOf(id)) await run(() => api.users.moveSaved(me.id, id, null));
      await run(() => api.users.toggleSavePerson(me.id, id), t('저장을 해제했어요'));
    } catch { /* toast by run */ }
  };
  const move = async (id: ID, listId: ID | null) => {
    setPersonMenu(null);
    const name = listId ? lists.find((l) => l.id === listId)?.name : null;
    await run(() => api.users.moveSaved(me.id, id, listId), name ? (lang === 'en' ? `Moved to ${name}` : `${name}(으)로 옮겼어요`) : t('목록에서 뺐어요')).catch(() => undefined);
  };
  const submitName = async () => {
    if (!nameSheet) return;
    setBusy(true);
    try {
      if (nameSheet.mode === 'create') {
        const before = new Set(lists.map((l) => l.id));
        await run(() => api.users.createSavedList(me.id, nameSheet.value), t('새 목록을 만들었어요'));
        const created = (useAppStore.getState().users.find((u) => u.id === me.id)?.savedLists ?? []).find((l) => !before.has(l.id));
        if (created) setTab(created.id);
      } else if (active) {
        await run(() => api.users.updateSavedList(me.id, active.id, { name: nameSheet.value }), t('이름을 바꿨어요'));
      }
      setNameSheet(null);
    } catch { /* toast by run */ } finally { setBusy(false); }
  };
  const removeList = () => {
    if (!active) return;
    setListMenu(false);
    confirm(t('이 목록을 삭제할까요?'), async () => {
      try { await run(() => api.users.deleteSavedList(me.id, active.id), t('목록을 삭제했어요. 사람은 전체에 그대로 있어요.')); setTab('all'); } catch { /* */ }
    });
  };

  const menuUser = personMenu ? v.userById(personMenu) : undefined;
  const menuList = personMenu ? listOf(personMenu) : undefined;
  const SheetBtn = ({ icon, label, onPress, danger, right }: { icon: ReactNode; label: string; onPress: () => void; danger?: boolean; right?: ReactNode }) => (
    <Pressable onPress={onPress} style={tw`h-12 px-3 rounded-xl flex-row items-center`}>{icon}<Text style={tw`ml-3 flex-1 text-[14px] font-semibold ${danger ? 'text-danger' : 'text-ink'}`}>{label}</Text>{right}</Pressable>
  );

  return (
    <Screen title={t('저장한 사람')}>
      <View style={tw`pt-2`}>
        <PrivacyNote text={t('저장 목록은 나만 볼 수 있어요. 상대에게 알리지 않아요.')} />

        {/* 1. 탭: 전체 · 목록들 · + 새 목록 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4 mt-2`} contentContainerStyle={tw`px-4 py-1 items-center`}>
          <Chip size="sm" active={tab === 'all'} onPress={() => setTab('all')}>{t('전체')} {savedIds.length}</Chip>
          {lists.map((l) => <Chip key={l.id} size="sm" active={tab === l.id} onPress={() => setTab(l.id)}>{l.notify ? '🔔 ' : ''}{l.name} {l.memberIds.filter((id) => savedIds.includes(id)).length}</Chip>)}
          <Pressable onPress={() => setNameSheet({ mode: 'create', value: '' })} style={[tw`h-8 px-3 rounded-full border border-line bg-white flex-row items-center`, { borderStyle: 'dashed' }]}><Plus size={12} color={C.primary} /><Text style={tw`ml-1 text-[12px] font-semibold text-primary`}>{t('새 목록')}</Text></Pressable>
        </ScrollView>

        {active ? (
          <View style={tw`mt-2 px-1 flex-row items-center`}>
            <Text numberOfLines={1} style={tw`flex-1 text-[13px] font-bold text-primary`}>{active.name}</Text>
            {active.notify ? <View style={tw`mr-2 flex-row items-center`}><Bell size={11} color={C.verify} /><Text style={tw`ml-1 text-[11px] font-semibold text-verify`}>{t('알림 켜짐')}</Text></View> : null}
            <Pressable onPress={() => setListMenu(true)} accessibilityLabel={t('목록 설정')} style={tw`h-8 w-8 rounded-full items-center justify-center`}><MoreHorizontal size={18} color={C.ink2} /></Pressable>
          </View>
        ) : null}

        {/* 2. 검색 · 정렬 */}
        {inTab.length > 0 ? (
          <View style={tw`mt-2 flex-row items-center`}>
            <View style={tw`flex-1 h-9 px-3 rounded-full border border-input-line flex-row items-center`}><Search size={14} color={C.ink3} /><TextInput style={tw`flex-1 ml-1.5 text-[13px] text-ink`} placeholderTextColor={C.ink3} placeholder={t('이름·학교 검색')} value={q} onChangeText={setQ} /></View>
            <View style={tw`ml-2 w-[140px]`}><Segmented<Sort> value={sort} onChange={setSort} options={[['recent', t('최근')], ['name', t('이름')]]} /></View>
          </View>
        ) : null}

        {/* 3. 사람 */}
        <View style={tw`mt-3`}>
          <Section loading={sec.loading} error={sec.error} onRetry={sec.retry}
            empty={inTab.length === 0 ? (
              active
                ? <SectionEmpty emoji="🗂️" title={t('이 목록은 비어 있어요')} description={t('전체 탭에서 사람 옆 ⋯ › 목록으로 옮기기')} action={<Button size="sm" variant="secondary" onPress={() => setTab('all')}>{t('전체 보기')}</Button>} />
                : <SectionEmpty emoji="🔖" title={t('아직 저장한 사람이 없어요')} description={t('프로필이나 추천 카드의 🔖 저장을 누르면 여기에 모여요. 나중에 편할 때 연결하세요.')} action={<Button size="sm" onPress={() => nav('/people')}>{t('추천 보러 가기')}</Button>} />
            ) : people.length === 0 && gone.length === 0 ? <SectionEmpty emoji="🔍" title={t('검색 결과가 없어요')} action={<Button size="sm" variant="outline" onPress={() => setQ('')}>{t('검색 지우기')}</Button>} /> : false}>
            {people.map((u) => (
              <View key={u.id} style={tw`mb-2`}>
                <PersonRow user={u} actions />
                <Pressable onPress={() => setPersonMenu(u.id)} accessibilityLabel={t('더보기')} hitSlop={6} style={tw`absolute top-1 right-1 h-7 w-7 rounded-full items-center justify-center`}><MoreHorizontal size={16} color={C.ink3} /></Pressable>
                {tab === 'all' && listOf(u.id) ? <View style={tw`mt-1 ml-3 flex-row items-center`}><FolderInput size={11} color={C.ink3} /><Text style={tw`ml-1 text-[11px] text-ink-3`}>{listOf(u.id)!.name}</Text></View> : null}
              </View>
            ))}
            {gone.map((id) => (
              <View key={id} style={[tw`mb-2 rounded-[20px] border border-line bg-surface-2 p-3 flex-row items-center opacity-80`, { borderStyle: 'dashed' }]}>
                <View style={tw`h-11 w-11 rounded-full bg-line items-center justify-center`}><UserX size={18} color={C.ink3} /></View>
                <Text style={tw`flex-1 mx-3 text-[13px] text-ink-3`}>{t('더 이상 볼 수 없는 프로필')}</Text>
                <Button size="sm" variant="outline" onPress={() => unsave(id)}>{t('저장 해제')}</Button>
              </View>
            ))}
          </Section>
        </View>
        {inTab.length > 0 ? <View style={tw`pt-1 flex-row items-center justify-center`}><Lock size={11} color={C.ink3} /><Text style={tw`ml-1 text-[11px] text-ink-3`}>{t('저장은 나만 볼 수 있어요. 나중에 편할 때 연결하세요.')}</Text></View> : null}
      </View>

      {/* 사람 ⋯ */}
      <BottomSheet open={!!personMenu} onClose={() => setPersonMenu(null)} title={menuUser?.nickname ?? ''}>
        <Text style={tw`px-1 mb-1 text-[11px] font-bold text-ink-3`}>{t('목록으로 옮기기')}</Text>
        {lists.length === 0
          ? <SheetBtn icon={<Plus size={16} color={C.primary} />} label={t('새 목록 만들기')} onPress={() => { setPersonMenu(null); setNameSheet({ mode: 'create', value: '' }); }} />
          : <>
            {lists.map((l) => <SheetBtn key={l.id} icon={<FolderInput size={16} color={C.ink3} />} label={l.name} onPress={() => personMenu && move(personMenu, l.id)} right={menuList?.id === l.id ? <Check size={16} color={C.primary} /> : undefined} />)}
            {menuList ? <SheetBtn icon={<FolderInput size={16} color={C.ink3} />} label={t('목록에서 빼기 (전체에만 두기)')} onPress={() => personMenu && move(personMenu, null)} /> : null}
          </>}
        <View style={tw`border-t border-line mt-2 pt-2`}><SheetBtn danger icon={<Trash2 size={18} color={C.danger} />} label={t('저장 해제')} onPress={() => personMenu && unsave(personMenu)} /></View>
      </BottomSheet>

      {/* 목록 ⋯ */}
      <BottomSheet open={listMenu && !!active} onClose={() => setListMenu(false)} title={active?.name ?? ''}>
        {active ? (
          <View>
            <View style={tw`px-1`}><Toggle label={t('상태가 바뀌면 알려주기')} description={t('이 목록 사람의 상태가 바뀌면 알려줘요')} checked={active.notify} onChange={(val) => { run(() => api.users.updateSavedList(me.id, active.id, { notify: val }), val ? t('알림을 켰어요') : t('알림을 껐어요')).catch(() => undefined); }} /></View>
            <SheetBtn icon={<Pencil size={18} color={C.ink} />} label={t('이름 바꾸기')} onPress={() => { setListMenu(false); setNameSheet({ mode: 'rename', value: active.name }); }} />
            <SheetBtn danger icon={<Trash2 size={18} color={C.danger} />} label={t('목록 삭제')} onPress={removeList} />
          </View>
        ) : null}
      </BottomSheet>

      {/* 새 목록 / 이름 바꾸기 */}
      <BottomSheet open={!!nameSheet} onClose={() => setNameSheet(null)} title={nameSheet?.mode === 'rename' ? t('이름 바꾸기') : t('새 목록')}>
        <Input autoFocus maxLength={20} placeholder={t('예: 창업 얘기해볼 사람')} value={nameSheet?.value ?? ''} onChangeText={(value) => setNameSheet((s) => (s ? { ...s, value } : s))} onSubmitEditing={() => { if (nameSheet?.value.trim()) submitName(); }} />
        <Text style={tw`mt-1.5 text-[11px] text-ink-3`}>{t('목록 이름도 나만 볼 수 있어요')}</Text>
        <Row style={tw`mt-4`}><Button full size="lg" loading={busy} disabled={!nameSheet?.value.trim()} onPress={submitName}>{nameSheet?.mode === 'rename' ? t('저장') : t('만들기')}</Button></Row>
      </BottomSheet>
      {confirmEl}
    </Screen>
  );
}
