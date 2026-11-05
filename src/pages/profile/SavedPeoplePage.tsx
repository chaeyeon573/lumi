import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { commonInterests } from '@core/lib/relations';
import type { User } from '@core/types';
import { ChoiceChips, EmptyState, InfoNote, SearchField } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { PersonRow, matches, usersOf } from './PeopleBits';
import { SubScreen, en } from './shared';

type Filter = 'all' | 'campus' | 'interests';

/**
 * Saved people (PDF S077) — 내가 관심(♥)으로 담아 둔 사람 (relationships.likes, 상대에게 알리지 않는 목록. 예전 /profile/likes).
 * SearchField, 칩 All · Same campus · Shared interests, PersonCards + Add Friend / Message.
 */
export function SavedPeoplePage() {
  const v = useViewer();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const me = v.me;
  const school = me.affiliation.type === 'university' ? me.affiliation.schoolId : undefined;
  const all = usersOf(v.snap.relationships.likes.filter((l) => l.fromId === me.id).map((l) => l.toId), v.userById);
  const keep = (u: User) => filter === 'all' || (filter === 'campus' ? u.affiliation.type === 'university' && !!school && u.affiliation.schoolId === school : commonInterests(me, u).length > 0);
  const people = all.filter((u) => keep(u) && matches(u, q));
  return (
    <SubScreen title={en ? 'Saved people' : '저장한 사람'}>
      {all.length === 0 ? (
        <EmptyState icon={<Bookmark size={28} />} tone="rose" title={en ? 'No one saved yet' : '아직 저장한 사람이 없어요'}
          sub={en ? 'People you save from their profile show up here. Only you see this list.' : '프로필에서 저장한 사람이 여기에 보여요. 나만 볼 수 있어요.'} />
      ) : <>
        <SearchField className="mb-3" placeholder={en ? 'Search people' : '사람 찾기'} value={q} onChange={setQ} />
        <ChoiceChips className="mb-4" value={filter} onChange={setFilter} wrap={false}
          options={[{ value: 'all', label: en ? 'All' : '전체' }, { value: 'campus', label: en ? 'Same campus' : '같은 학교' }, { value: 'interests', label: en ? 'Shared interests' : '같은 관심사' }]} />
        <div className="space-y-3">{people.map((u) => <PersonRow key={u.id} user={u} action="friend" />)}</div>
        {people.length === 0 && <p className="text-[14px] text-ink-3 text-center py-6">{en ? 'No one here with that filter.' : '조건에 맞는 사람이 없어요.'}</p>}
      </>}
      <InfoNote className="mt-4">{en ? 'They aren’t told — unless they save you too.' : '상대에게 알리지 않아요 — 서로 저장했을 때만 알려요.'}</InfoNote>
    </SubScreen>
  );
}
