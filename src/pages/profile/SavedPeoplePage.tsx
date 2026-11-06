import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, FolderPlus, Pencil } from 'lucide-react';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { commonInterests } from '@core/lib/relations';
import { SAVED_PEOPLE_LIMITS, type SavedPeopleView } from '@core/lib/savedpeople';
import type { ID, User } from '@core/types';
import { BottomSheet } from '@/components/ui';
import { Badge, Btn, Chip, ChipRow, ChoiceChips, EmptyState, FormField, InfoNote, RowCard, SearchField, TextArea, TextInput } from '@/components/ha';
import { PlusLock } from '@/components/plus/PlusLock';
import { usePlus } from '@/hooks/usePlus';
import { useViewer } from '@/hooks/useViewer';
import { PersonRow, matches, usersOf } from './PeopleBits';
import { SubScreen, en } from './shared';

type Filter = 'all' | 'campus' | 'interests';

/**
 * Saved people (PDF S077) — 내가 관심(♥)으로 담아 둔 사람 (relationships.likes, 상대에게 알리지 않는 목록. 예전 /profile/likes).
 * SearchField, 칩 All · Same campus · Shared interests, PersonCards + Add Friend / Message.
 * 폴더와 나만 보는 메모 (Lumi+ — LUMI_PLUS 가 꺼져 있으면 모두에게 열림): 폴더 칩으로 고르고, 카드 아래 칸에서 폴더·메모를 바꾼다.
 * 메모는 서버의 본인 전용 묶음에만 있다 (server/savedpeople.ts) — 상대에게도, 다른 누구에게도 가지 않는다.
 */
export function SavedPeoplePage() {
  const v = useViewer();
  const nav = useNavigate();
  const plus = usePlus();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const me = v.me;
  const school = me.affiliation.type === 'university' ? me.affiliation.schoolId : undefined;
  const all = usersOf(v.snap.relationships.likes.filter((l) => l.fromId === me.id).map((l) => l.toId), v.userById);
  const book = useSavedBook(all.length > 0 && plus.ready && !plus.locked);
  const [folder, setFolder] = useState<ID | ''>('');
  const [editing, setEditing] = useState<User | null>(null);
  const [folderSheet, setFolderSheet] = useState<'new' | 'rename' | null>(null);
  const current = book.view?.folders.find((f) => f.id === folder);
  const keep = (u: User) => filter === 'all' || (filter === 'campus' ? u.affiliation.type === 'university' && !!school && u.affiliation.schoolId === school : commonInterests(me, u).length > 0);
  const people = all.filter((u) => keep(u) && matches(u, q) && (!current || book.view?.entries[u.id]?.folderId === current.id));
  const footer = (u: User) => {
    if (!book.view) return undefined;
    const e = book.view.entries[u.id];
    const f = e?.folderId ? book.view.folders.find((x) => x.id === e.folderId) : undefined;
    return (
      <button onClick={() => setEditing(u)} className="w-full flex items-start gap-2 text-left press">
        <span className="flex-1 min-w-0">
          {f && <Badge tone="peach" className="mr-2 align-middle">{f.name}</Badge>}
          <span className={`text-[13.5px] leading-snug ${e?.note ? 'text-ink-2' : 'text-ink-3'}`}>{e?.note ?? (en ? 'Add a private note' : '나만 보는 메모 쓰기')}</span>
        </span>
        <Pencil size={15} className="text-ink-3 shrink-0 mt-0.5" />
      </button>
    );
  };
  return (
    <SubScreen title={en ? 'Saved people' : '저장한 사람'}>
      {all.length === 0 ? (
        <EmptyState icon={<Bookmark size={28} />} tone="rose" title={en ? 'No one saved yet' : '아직 저장한 사람이 없어요'}
          sub={en ? 'People you save from their profile show up here. Only you see this list.' : '프로필에서 저장한 사람이 여기에 보여요. 나만 볼 수 있어요.'} />
      ) : <>
        <SearchField className="mb-3" placeholder={en ? 'Search people' : '사람 찾기'} value={q} onChange={setQ} />
        <ChoiceChips className="mb-3" value={filter} onChange={setFilter} wrap={false}
          options={[{ value: 'all', label: en ? 'All' : '전체' }, { value: 'campus', label: en ? 'Same campus' : '같은 학교' }, { value: 'interests', label: en ? 'Shared interests' : '같은 관심사' }]} />
        {plus.locked ? (
          <RowCard className="mb-4" tone="peach" icon={<FolderPlus size={20} />} title={en ? 'Folders and private notes' : '폴더와 나만 보는 메모'}
            sub={en ? 'Organize the people you saved' : '저장한 사람을 정리해요'} right={<PlusLock />} onClick={() => nav('/settings/plus')} />
        ) : book.view && (
          <div className="mb-4">
            <ChipRow>
              <Chip size="sm" active={!current} onClick={() => setFolder('')}>{en ? 'All folders' : '모든 폴더'}</Chip>
              {book.view.folders.map((f) => <Chip key={f.id} size="sm" active={current?.id === f.id} onClick={() => setFolder(f.id)}>{f.name} <span className="opacity-70">{f.count}</span></Chip>)}
              {book.view.folders.length < SAVED_PEOPLE_LIMITS.folders && <Chip size="sm" icon={<FolderPlus size={14} />} onClick={() => setFolderSheet('new')}>{en ? 'New folder' : '새 폴더'}</Chip>}
            </ChipRow>
            {current && (
              <div className="flex gap-1 mt-1">
                <Btn variant="link" size="sm" onClick={() => setFolderSheet('rename')}>{en ? 'Rename' : '이름 바꾸기'}</Btn>
                <Btn variant="link" size="sm" onClick={() => { void book.run(() => api.savedPeople.removeFolder(current.id)).then((ok) => { if (ok) setFolder(''); }); }}>{en ? 'Delete folder' : '폴더 지우기'}</Btn>
              </div>
            )}
          </div>
        )}
        <div className="space-y-3">{people.map((u) => <PersonRow key={u.id} user={u} action="friend" footer={footer(u)} />)}</div>
        {people.length === 0 && <p className="text-[14px] text-ink-3 text-center py-6">{current ? (en ? 'No one in this folder yet.' : '이 폴더에 아직 아무도 없어요.') : (en ? 'No one here with that filter.' : '조건에 맞는 사람이 없어요.')}</p>}
      </>}
      <InfoNote className="mt-4">{book.view ? (en ? 'They aren’t told. Folders and notes are only for you.' : '상대에게 알리지 않아요. 폴더와 메모는 나만 봐요.') : (en ? 'They aren’t told — unless they save you too.' : '상대에게 알리지 않아요 — 서로 저장했을 때만 알려요.')}</InfoNote>

      {editing && book.view && <EntrySheet user={editing} view={book.view} onClose={() => setEditing(null)}
        onSave={(input) => book.run(() => api.savedPeople.setEntry(editing.id, input)).then((ok) => { if (ok) setEditing(null); })} />}
      {folderSheet && <FolderSheet initial={folderSheet === 'rename' ? current?.name ?? '' : ''} rename={folderSheet === 'rename'} onClose={() => setFolderSheet(null)}
        onSave={(name) => book.run(() => (folderSheet === 'rename' && current ? api.savedPeople.renameFolder(current.id, name) : api.savedPeople.createFolder(name))).then((ok) => { if (ok) setFolderSheet(null); })} />}
    </SubScreen>
  );
}

/** my folders and notes from the server (only mine — server/savedpeople.ts). run() shows the server's reason on failure */
function useSavedBook(on: boolean) {
  const [view, setView] = useState<SavedPeopleView | null>(null);
  const showToast = useAppStore((s) => s.showToast);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    api.savedPeople.view().then((r) => { if (alive) setView(r); }).catch(() => { /* the list still works without folders */ });
    return () => { alive = false; };
  }, [on]);
  const run = async (fn: () => Promise<SavedPeopleView>) => {
    try { setView(await fn()); return true; } catch (e) { showToast(e instanceof Error ? e.message : String(e), 'error'); return false; }
  };
  return { view: on ? view : null, run };
}

function EntrySheet({ user, view, onClose, onSave }: { user: User; view: SavedPeopleView; onClose: () => void; onSave: (input: { folderId: ID | null; note: string | null }) => Promise<void> }) {
  const e = view.entries[user.id];
  const [folderId, setFolderId] = useState<ID | ''>(e?.folderId ?? '');
  const [note, setNote] = useState(e?.note ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <BottomSheet open onClose={onClose} title={user.nickname}>
      {view.folders.length > 0 && (
        <FormField label={en ? 'Folder' : '폴더'} className="mb-4">
          <ChipRow wrap>
            <Chip size="sm" active={!folderId} onClick={() => setFolderId('')}>{en ? 'None' : '없음'}</Chip>
            {view.folders.map((f) => <Chip key={f.id} size="sm" active={folderId === f.id} onClick={() => setFolderId(f.id)}>{f.name}</Chip>)}
          </ChipRow>
        </FormField>
      )}
      <FormField label={en ? 'Private note' : '나만 보는 메모'} hint={`${note.length}/${SAVED_PEOPLE_LIMITS.note}`}>
        <TextArea value={note} maxLength={SAVED_PEOPLE_LIMITS.note} onChange={(ev) => setNote(ev.target.value)} placeholder={en ? 'Where you met, what to talk about next time' : '어디서 만났는지, 다음에 할 이야기'} />
      </FormField>
      <InfoNote className="mt-3">{en ? `Only you can see this. ${user.nickname} is never told.` : `나만 볼 수 있어요. ${user.nickname} 님에게 알리지 않아요.`}</InfoNote>
      <Btn full size="lg" className="mt-4" loading={busy} onClick={async () => { setBusy(true); await onSave({ folderId: folderId || null, note: note.trim() || null }); setBusy(false); }}>{en ? 'Save' : '저장'}</Btn>
    </BottomSheet>
  );
}

function FolderSheet({ initial, rename, onClose, onSave }: { initial: string; rename: boolean; onClose: () => void; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <BottomSheet open onClose={onClose} title={rename ? (en ? 'Rename folder' : '폴더 이름 바꾸기') : (en ? 'New folder' : '새 폴더')}>
      <TextInput autoFocus value={name} maxLength={SAVED_PEOPLE_LIMITS.folderName} onChange={(e) => setName(e.target.value)} placeholder={en ? 'e.g. Study partners' : '예: 스터디 친구'} />
      <Btn full size="lg" className="mt-4" loading={busy} disabled={!name.trim()} onClick={async () => { setBusy(true); await onSave(name.trim()); setBusy(false); }}>{rename ? (en ? 'Save' : '저장') : (en ? 'Create Folder' : '폴더 만들기')}</Btn>
    </BottomSheet>
  );
}
