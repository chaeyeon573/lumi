import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Organization } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { scoreClubs } from '@core/lib/foryou';
import { Btn, Chip, ChipRow, EmptyCard, EmptyState, InfoNote } from '@/components/ha';
import { ClubItem, ExploreControls, MoreButton } from './ExploreItems';
import { CLUB_KINDS, clubKindOf, clubMatches, clubSub, PAGE, sortClubs } from './exploreData';
import { useExploreParams } from './EventsList';

const en = lang === 'en';

/** my relation to a group — admin / member / applied / following (lib/orgjoin order) */
export function relationOf(o: Organization, me: string, following: boolean) {
  return o.adminIds.includes(me) ? 'admin' as const : o.memberIds.includes(me) ? 'member' as const : o.applicantIds.includes(me) ? 'applied' as const : following ? 'following' as const : '' as const;
}

/**
 * Explore · Clubs (PDF S019) — the school's clubs, Greek chapters, labs and co-ops as RowCards.
 * Search + sort chips + kind chips (Student Clubs default, like the PDF). "Create a group" (S026) sits on the count line.
 */
export function ClubsList() {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const { q, sort, type, set } = useExploreParams();
  const orgs = useAppStore((s) => s.organizations);
  const opportunities = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [q, sort, type]);
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const all = type === 'all';
  const kind = clubKindOf(type);

  // the school's groups (school offices are not clubs) + anything I'm in from elsewhere
  const mine = (o: Organization) => o.memberIds.includes(me.id) || o.adminIds.includes(me.id) || o.followerIds.includes(me.id);
  const base = useMemo(() => orgs.filter((o) => o.type !== 'department' && (o.schoolId === mySchool || mine(o))), [orgs, mySchool, me.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const scores = useMemo(() => scoreClubs({ opportunities, opportunityIntents: intents, organizations: orgs, relationships, schools }, me, base), [opportunities, intents, orgs, relationships, schools, me, base]);
  const matching = useMemo(() => base.filter((o) => clubMatches(o, q)), [base, q]);
  const list = useMemo(() => sortClubs(matching.filter((o) => all || kind.types.includes(o.type)), sort, (o) => scores.get(o.id)?.score ?? -1), [matching, all, kind, sort, scores]);
  const elsewhere = q && !all ? matching.length - list.length : 0;

  return (
    <div>
      <ExploreControls placeholder={en ? 'Search clubs' : '동아리 검색'} q={q} onQ={(x) => set({ q: x })} sort={sort} onSort={(s) => set({ sort: s })}>
        <ChipRow>
          {CLUB_KINDS.map((k) => <Chip key={k.key} size="sm" active={!all && kind.key === k.key} onClick={() => set({ type: k.key === 'club' ? '' : k.key })}>{k.label}</Chip>)}
          {all && <Chip size="sm" active onClick={() => set({ type: '' })}>{en ? 'All groups' : '전체'}</Chip>}
        </ChipRow>
      </ExploreControls>
      <div className="flex items-center justify-between -mt-1 mb-2">
        <span className="text-[12.5px] text-ink-3">{en ? `${list.length} group${list.length === 1 ? '' : 's'}` : `${list.length}개`}</span>
        <Btn variant="link" size="sm" icon={<Plus size={15} />} onClick={() => nav('/orgs/new')}>{en ? 'Create a group' : '그룹 만들기'}</Btn>
      </div>
      {base.length === 0 ? (
        <EmptyState icon={<Users size={30} />} tone="mint" title={en ? 'No groups here yet' : '아직 단체가 없어요'} sub={en ? 'Start one — classmates can follow or ask to join.' : '하나 만들어 보세요 — 다른 학생이 팔로우하거나 가입을 요청할 수 있어요.'}
          action={{ label: en ? 'Create a group' : '그룹 만들기', onClick: () => nav('/orgs/new') }} />
      ) : list.length === 0 ? (
        <EmptyCard title={en ? 'No groups match that' : '맞는 단체가 없어요'}
          sub={elsewhere > 0 ? (en ? `${elsewhere} match in other kinds.` : `다른 종류에 ${elsewhere}개 있어요.`) : q ? (en ? `Nothing for “${q}”.` : `“${q}” 검색 결과가 없어요.`) : undefined}
          secondary={elsewhere > 0 ? { label: en ? 'Search all groups' : '전체에서 찾기', onClick: () => set({ type: 'all' }) } : { label: en ? 'Clear search' : '검색 지우기', onClick: () => set({ q: '' }) }} />
      ) : (
        <div className="space-y-3">
          {list.slice(0, shown).map((o) => <ClubItem key={o.id} o={o} sub={clubSub(o, relationOf(o, me.id, v.isFollowing(o.id)))} onClick={() => nav(`/orgs/${o.id}`)} />)}
        </div>
      )}
      <MoreButton left={list.length - shown} onClick={() => setShown((n) => n + PAGE)} />
      {list.length > 0 && <InfoNote className="mt-4">{en ? 'Followed is different from verified membership.' : '팔로우는 회원 인증과 달라요.'}</InfoNote>}
    </div>
  );
}
