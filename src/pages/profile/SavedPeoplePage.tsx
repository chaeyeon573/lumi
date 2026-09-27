import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, FolderInput, Lock, MoreHorizontal, Pencil, Plus, Search, Trash2, UserX } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { ID, SavedList, User } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { TopBar } from '@/components/layout/TopBar';
import { BottomSheet, Button, Chip, Dialog, Input, PrivacyNote, Section, SectionEmpty, Segmented, Toggle } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import { PersonRow } from '@/components/cards/PersonRow';
import { useViewer } from '@/hooks/useViewer';
import { useSectionState } from '@/hooks/useSectionState';

type Sort = 'recent' | 'name';

/**
 * 저장한 사람 (/profile/saved) — 나만 보는 목록. 보기 → 저장 → 나중에 연결.
 * 탭: 전체 · 내가 만든 목록들 / 검색 · 정렬 / 사람마다 ⋯ (목록으로 옮기기 · 저장 해제) / 목록마다 ⋯ (이름 바꾸기 · 삭제 · 알림)
 */
export function SavedPeoplePage() {
  const nav = useNavigate();
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
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
  const removeList = async () => {
    if (!active) return;
    setConfirmDelete(false); setListMenu(false);
    try { await run(() => api.users.deleteSavedList(me.id, active.id), t('목록을 삭제했어요. 사람은 전체에 그대로 있어요.')); setTab('all'); } catch { /* */ }
  };

  const menuUser = personMenu ? v.userById(personMenu) : undefined;
  const menuList = personMenu ? listOf(personMenu) : undefined;

  return (
    <div className="min-h-full pb-8">
      <TopBar back title={t('저장한 사람')} />
      <div className="px-4 pt-2 space-y-3">
        <PrivacyNote text={t('저장 목록은 나만 볼 수 있어요. 상대에게 알리지 않아요.')} className="px-1" />

        {/* ── 탭: 전체 · 목록들 · + 새 목록 ── */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 py-1">
          <Chip size="sm" active={tab === 'all'} onClick={() => setTab('all')}>{t('전체')} {savedIds.length}</Chip>
          {lists.map((l) => <Chip key={l.id} size="sm" active={tab === l.id} onClick={() => setTab(l.id)}>{l.notify && <Bell size={11} />}{l.name} {l.memberIds.filter((id) => savedIds.includes(id)).length}</Chip>)}
          <Chip size="sm" onClick={() => setNameSheet({ mode: 'create', value: '' })} className="!bg-white border-dashed !border-line text-primary"><Plus size={12} />{t('새 목록')}</Chip>
        </div>

        {active && (
          <div className="flex items-center gap-2 px-1">
            <span className="flex-1 min-w-0 text-[13px] font-bold text-primary truncate">{active.name}</span>
            {active.notify && <span className="text-[11px] text-verify font-semibold flex items-center gap-1"><Bell size={11} />{t('알림 켜짐')}</span>}
            <button onClick={() => setListMenu(true)} className="h-8 w-8 rounded-full grid place-items-center text-ink-2 press hover:bg-surface-2" aria-label={t('목록 설정')}><MoreHorizontal size={18} /></button>
          </div>
        )}

        {/* ── 검색 · 정렬 ── */}
        {inTab.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input className="h-9 pl-8 rounded-full text-[13px]" placeholder={t('이름·학교 검색')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <Segmented className="w-[150px] shrink-0 !p-0.5" value={sort} onChange={setSort} options={[{ value: 'recent', label: t('최근') }, { value: 'name', label: t('이름') }]} />
          </div>
        )}

        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry}
          empty={inTab.length === 0 ? (
            active
              ? <SectionEmpty emoji="🗂️" title={t('이 목록은 비어 있어요')} description={t('전체 탭에서 사람 옆 ⋯ › 목록으로 옮기기')} action={<Button size="sm" variant="secondary" onClick={() => setTab('all')}>{t('전체 보기')}</Button>} />
              : <SectionEmpty emoji="🔖" title={t('아직 저장한 사람이 없어요')} description={t('프로필이나 추천 카드의 🔖 저장을 누르면 여기에 모여요. 나중에 편할 때 연결하세요.')} action={<Button size="sm" onClick={() => nav('/people')}>{t('추천 보러 가기')}</Button>} />
          ) : people.length === 0 && gone.length === 0 ? <SectionEmpty emoji="🔍" title={t('검색 결과가 없어요')} action={<Button size="sm" variant="ghost" onClick={() => setQ('')}>{t('검색 지우기')}</Button>} /> : false}>
          <div className="space-y-2">
            {people.map((u) => (
              <div key={u.id}>
                <PersonRow user={u} actions onMore={() => setPersonMenu(u.id)} />
                {tab === 'all' && listOf(u.id) && <div className="mt-1 ml-3 text-[11px] text-ink-3 flex items-center gap-1"><FolderInput size={11} />{listOf(u.id)!.name}</div>}
              </div>
            ))}
            {gone.map((id) => (
              <div key={id} className="flex items-center gap-3 rounded-[20px] border border-dashed border-line bg-surface-2/60 p-3 opacity-80">
                <span className="h-11 w-11 rounded-full bg-line grid place-items-center text-ink-3 shrink-0"><UserX size={18} /></span>
                <span className="flex-1 min-w-0 text-[13px] text-ink-3">{t('더 이상 볼 수 없는 프로필')}</span>
                <Button size="sm" variant="outline" onClick={() => unsave(id)}>{t('저장 해제')}</Button>
              </div>
            ))}
          </div>
        </Section>
        {inTab.length > 0 && <p className="text-center text-[11px] text-ink-3 flex items-center justify-center gap-1 pt-1"><Lock size={11} />{t('저장은 나만 볼 수 있어요. 나중에 편할 때 연결하세요.')}</p>}
      </div>

      {/* 사람 ⋯ */}
      <BottomSheet open={!!personMenu} onClose={() => setPersonMenu(null)} title={menuUser?.nickname ?? ''}>
        <div className="text-[11px] font-bold text-ink-3 px-1 mb-1">{t('목록으로 옮기기')}</div>
        {lists.length === 0 ? (
          <button onClick={() => { setPersonMenu(null); setNameSheet({ mode: 'create', value: '' }); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[14px] text-primary font-semibold flex items-center gap-2 press hover:bg-surface-2"><Plus size={16} />{t('새 목록 만들기')}</button>
        ) : (
          <div className="space-y-0.5">
            {lists.map((l) => <button key={l.id} onClick={() => personMenu && move(personMenu, l.id)} className="w-full text-left px-3 py-2.5 rounded-xl text-[14px] flex items-center gap-2 press hover:bg-surface-2"><FolderInput size={16} className="text-ink-3" /><span className="flex-1">{l.name}</span>{menuList?.id === l.id && <Check size={16} className="text-primary" />}</button>)}
            {menuList && <button onClick={() => personMenu && move(personMenu, null)} className="w-full text-left px-3 py-2.5 rounded-xl text-[14px] text-ink-2 flex items-center gap-2 press hover:bg-surface-2"><FolderInput size={16} className="text-ink-3" />{t('목록에서 빼기 (전체에만 두기)')}</button>}
          </div>
        )}
        <div className="border-t border-line mt-2 pt-2">
          <SheetItem icon={<Trash2 size={18} />} label={t('저장 해제')} danger onClick={() => personMenu && unsave(personMenu)} />
        </div>
      </BottomSheet>

      {/* 목록 ⋯ */}
      <BottomSheet open={listMenu && !!active} onClose={() => setListMenu(false)} title={active?.name ?? ''}>
        {active && (
          <div className="space-y-1">
            <div className="px-1"><Toggle label={t('상태가 바뀌면 알려주기')} description={t('이 목록 사람의 상태가 바뀌면 알려줘요')} checked={active.notify} onChange={(val) => run(() => api.users.updateSavedList(me.id, active.id, { notify: val }), val ? t('알림을 켰어요') : t('알림을 껐어요')).catch(() => undefined)} /></div>
            <SheetItem icon={<Pencil size={18} />} label={t('이름 바꾸기')} onClick={() => { setListMenu(false); setNameSheet({ mode: 'rename', value: active.name }); }} />
            <SheetItem icon={<Trash2 size={18} />} label={t('목록 삭제')} danger onClick={() => setConfirmDelete(true)} />
          </div>
        )}
      </BottomSheet>

      {/* 새 목록 / 이름 바꾸기 */}
      <BottomSheet open={!!nameSheet} onClose={() => setNameSheet(null)} title={nameSheet?.mode === 'rename' ? t('이름 바꾸기') : t('새 목록')}>
        <Input autoFocus maxLength={20} placeholder={t('예: 창업 얘기해볼 사람')} value={nameSheet?.value ?? ''} onChange={(e) => setNameSheet((s) => (s ? { ...s, value: e.target.value } : s))} onKeyDown={(e) => { if (e.key === 'Enter' && nameSheet?.value.trim()) submitName(); }} />
        <p className="mt-1.5 text-[11px] text-ink-3">{t('목록 이름도 나만 볼 수 있어요')}</p>
        <Button full size="lg" className={cn('mt-4')} loading={busy} disabled={!nameSheet?.value.trim()} onClick={submitName}>{nameSheet?.mode === 'rename' ? t('저장') : t('만들기')}</Button>
      </BottomSheet>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('이 목록을 삭제할까요?')} description={t('목록만 사라지고, 저장한 사람은 전체에 그대로 남아요.')}>
        <Button variant="outline" full onClick={() => setConfirmDelete(false)}>{t('취소')}</Button>
        <Button variant="danger" full onClick={removeList}>{t('삭제')}</Button>
      </Dialog>
    </div>
  );
}
