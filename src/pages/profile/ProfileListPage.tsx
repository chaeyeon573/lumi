import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { friendsOf, followersOf, followingOf } from '@core/lib/relations';
import { EmptyState, InfoNote, SearchField, SegTabs } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { PersonRow, matches, usersOf } from './PeopleBits';
import { SubScreen, en } from './shared';

type List = 'friends' | 'followers' | 'following';

/**
 * Friends & followers (PDF S075) — 한 화면, SegTabs Friends · Followers · Following (주소 /profile/friends|followers|following 이 탭).
 * SearchField, PersonCards + Message (메시지를 보낼 수 있는 사람만), "Friends are mutually confirmed. Followers are a separate list."
 * 팔로우한 동아리는 My Communities 에 있다 — 여기는 사람만.
 */
export function ProfileListPage() {
  const { list: raw } = useParams();
  const list: List = raw === 'followers' || raw === 'following' ? raw : 'friends';
  const nav = useNavigate();
  const v = useViewer();
  const [q, setQ] = useState('');
  const ids = list === 'friends' ? friendsOf(v.snap, v.me.id) : list === 'followers' ? followersOf(v.snap, v.me.id) : followingOf(v.snap, v.me.id);
  const all = usersOf(ids, v.userById);
  const people = all.filter((u) => matches(u, q));
  const empty = {
    friends: [en ? 'No friends yet' : '아직 친구가 없어요', en ? 'Friends are people who accepted your request — or you theirs.' : '요청을 서로 수락하면 친구가 돼요.'],
    followers: [en ? 'No followers yet' : '아직 팔로워가 없어요', en ? 'People who follow you show up here.' : '나를 팔로우한 사람이 여기에 보여요.'],
    following: [en ? 'Not following anyone yet' : '아직 팔로우한 사람이 없어요', en ? 'People you follow show up here.' : '내가 팔로우한 사람이 여기에 보여요.'],
  }[list];

  return (
    <SubScreen title={en ? 'Friends & followers' : '친구와 팔로워'}>
      <SegTabs className="-mx-4 px-2 mb-4" value={list} onChange={(k) => nav(`/profile/${k}`, { replace: true })}
        tabs={[{ key: 'friends', label: en ? 'Friends' : '친구' }, { key: 'followers', label: en ? 'Followers' : '팔로워' }, { key: 'following', label: en ? 'Following' : '팔로잉' }]} />
      {all.length > 0 && <SearchField className="mb-3" placeholder={en ? 'Search your people' : '내 사람 찾기'} value={q} onChange={setQ} />}
      {all.length === 0
        ? <EmptyState className="pt-4" icon={<UserPlus size={28} />} tone="rose" title={empty[0]} sub={empty[1]} />
        : <div className="space-y-3">{people.map((u) => <PersonRow key={u.id} user={u} action="message" />)}</div>}
      {all.length > 0 && people.length === 0 && <p className="text-[14px] text-ink-3 text-center py-6">{en ? 'No one matches that search.' : '찾는 사람이 없어요.'}</p>}
      <InfoNote className="mt-4">{en ? 'Friends are mutually confirmed. Followers are a separate list.' : '친구는 서로 수락한 사이예요. 팔로워는 따로예요.'}</InfoNote>
    </SubScreen>
  );
}
