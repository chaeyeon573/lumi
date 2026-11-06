import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Globe, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import type { ID, Interest, User } from '@core/types';
import { api } from '@core/api';
import { hasAdvancedFilter, matchesAdvanced, type AdvancedPeopleFilter } from '@core/lib/plus';
import { BottomSheet } from '@/components/ui';
import { BackHeader, PageTitle, SearchField, Chip, ChipRow, InfoNote, EmptyCard, BottomCTA, Btn, SelectField, LoadingCards } from '@/components/ha';
import { PlusLock } from '@/components/plus/PlusLock';
import { usePlus } from '@/hooks/usePlus';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ALL_INTERESTS, INTEREST_LABELS } from '@core/lib/labels';
import { commonInterests } from '@core/lib/relations';
import { myGroups } from '@core/lib/meetups';
import { PersonItem, YEAR_CHIPS, yearKey, type YearKey } from '@/components/people/PeopleBits';
import { CampusStart } from '@/components/people/CampusStart';
import { matchesPerson, usePeopleInCommon } from '@/pages/social/SocialPage';

const en = lang === 'en';

/** 사람 찾기 조건 — 주소에 담는다 (뒤로 가면 그대로) */
interface PeopleQuery { q: string; years: YearKey[]; language: string; interests: Interest[]; org: string; sameCampus: boolean; shared: boolean }
const readQuery = (p: URLSearchParams): PeopleQuery => ({
  q: p.get('q') ?? '', years: (p.get('y') ?? '').split(',').filter((x): x is YearKey => YEAR_CHIPS.some((c) => c.key === x)),
  language: p.get('lang') ?? '', interests: (p.get('i') ?? '').split(',').filter((x): x is Interest => (ALL_INTERESTS as string[]).includes(x)),
  org: p.get('org') ?? '', sameCampus: p.get('campus') === '1', shared: p.get('shared') === '1',
});
const writeQuery = (x: PeopleQuery) => {
  const p = new URLSearchParams();
  if (x.q.trim()) p.set('q', x.q.trim());
  if (x.years.length) p.set('y', x.years.join(','));
  if (x.language) p.set('lang', x.language);
  if (x.interests.length) p.set('i', x.interests.join(','));
  if (x.org) p.set('org', x.org);
  if (x.sameCampus) p.set('campus', '1');
  if (x.shared) p.set('shared', '1');
  return p;
};
const schoolOf = (u: User) => (u.affiliation.type === 'university' ? u.affiliation.schoolId : undefined);
/** 언어·관심사·커뮤니티 — Lumi+ 부분 (@core/lib/plus). 나머지(학년·같은 캠퍼스·같은 관심사·검색)는 무료 */
const advancedOf = (x: PeopleQuery): AdvancedPeopleFilter => ({ language: x.language || undefined, interests: x.interests.length ? x.interests : undefined, org: x.org || undefined });
const withoutAdvanced = (x: PeopleQuery): PeopleQuery => ({ ...x, language: '', interests: [], org: '' });

/**
 * Lumi+ 플래그가 켜져 있으면 언어·관심사·커뮤니티는 서버가 고른다 (Lumi+ 만 — 서버가 다른 사람은 거절한다).
 * 꺼져 있으면(지금) 예전처럼 이 기기에서. undefined = 서버에 묻는 중
 */
function useAdvancedIds(x: PeopleQuery, enabled: boolean, locked: boolean): Set<ID> | null | undefined {
  const adv = advancedOf(x);
  const key = enabled && !locked && hasAdvancedFilter(adv) ? JSON.stringify(adv) : '';
  const [got, setGot] = useState<{ key: string; ids: Set<ID> } | null>(null);
  useEffect(() => {
    if (!key) return;
    let alive = true;
    api.plus.matchPeople(JSON.parse(key) as AdvancedPeopleFilter).then((r) => { if (alive) setGot({ key, ids: new Set(r.ids) }); }).catch(() => { if (alive) setGot({ key, ids: new Set() }); });
    return () => { alive = false; };
  }, [key]);
  if (!key) return null;
  return got?.key === key ? got.ids : undefined;
}

/** 조건에 맞는지 — 상대가 보이게 한 항목만으로 (서버가 닫힌 항목은 보내지 않는다). serverIds 가 있으면 고급 조건은 서버 답으로 */
function usePeopleFilter(x: PeopleQuery, serverIds?: Set<ID> | null) {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const mySchool = schoolOf(v.me);
  const adv = advancedOf(x);
  return (u: User) => {
    if (x.years.length && !x.years.includes(yearKey(u) as YearKey)) return false;
    if (serverIds ? !serverIds.has(u.id) : !matchesAdvanced(u, adv, orgs)) return false;
    if (x.sameCampus && (!mySchool || schoolOf(u) !== mySchool)) return false;
    if (x.shared && !commonInterests(v.me, u).length) return false;
    if (x.q.trim() && !matchesPerson(u, x.q.trim().toLowerCase())) return false;
    return true;
  };
}

/**
 * People results (PDF S058) · Something in common (S061) — 검색, 칩 All statuses / Same campus / Shared interests, 사람 카드.
 * Something in common 은 같은 수업·같은 그룹·같은 관심사가 하나라도 있는 사람만 (@/components/people/PeopleBits commonGround).
 */
export function PeopleResultsPage({ mode = 'results' }: { mode?: 'results' | 'common' }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  // 검색어는 자기 상태로 (주소에 바로 묶으면 빠르게 친 글자가 사라진다), 나머지 조건은 주소에서
  const [text, setText] = useState(params.get('q') ?? '');
  const plus = usePlus();
  // Lumi+ 가 켜졌는데 없는 사람: 언어·관심사·커뮤니티 조건은 쓰지 않는다 (서버도 거절한다)
  const asked = { ...readQuery(params), q: text };
  const x = plus.locked ? withoutAdvanced(asked) : asked;
  const set = (p: Partial<PeopleQuery>) => { if (p.q !== undefined) setText(p.q); setParams(writeQuery({ ...x, ...p }), { replace: true }); };
  const ranked = usePeopleInCommon();
  const serverIds = useAdvancedIds(x, plus.enabled, plus.locked);
  const ok = usePeopleFilter(x, serverIds);
  const list = ranked.filter(({ u, common }) => (mode === 'results' || common.length > 0) && ok(u));
  const title = mode === 'common' ? (en ? 'Something in common' : '함께 가진 것') : (en ? 'People results' : '사람 찾기');
  const statusLabel = x.years.length ? YEAR_CHIPS.filter((c) => x.years.includes(c.key)).map((c) => c.label).join(', ') : (en ? 'All statuses' : '모든 학적');
  const anyFilter = x.years.length || x.language || x.interests.length || x.org || x.sameCampus || x.shared || x.q.trim();
  return (
    <div className="min-h-full bg-bg pb-8">
      <BackHeader title={title} />
      <PageTitle title={title} className="pb-3" />
      <div className="px-4">
        <SearchField placeholder={en ? 'Search people' : '사람 검색'} value={x.q} onChange={(q) => set({ q })} />
        <ChipRow className="mt-4">
          <Chip active={!x.years.length} onClick={() => nav(`/social/people/filters?${writeQuery(x)}`)}>{statusLabel}</Chip>
          <Chip active={x.sameCampus} onClick={() => set({ sameCampus: !x.sameCampus })}>{en ? 'Same campus' : '같은 캠퍼스'}</Chip>
          <Chip active={x.shared} onClick={() => set({ shared: !x.shared })}>{en ? 'Shared interests' : '같은 관심사'}</Chip>
          {(x.language || x.interests.length > 0 || x.org) && <Chip active onClick={() => nav(`/social/people/filters?${writeQuery(x)}`)}>{en ? 'More filters' : '조건'}</Chip>}
        </ChipRow>
        {serverIds === undefined ? <LoadingCards className="mt-4" /> : <div className="space-y-3 mt-4">
          {list.slice(0, 40).map(({ u, common }) => <PersonItem key={u.id} user={u} line={mode === 'common' ? common.map((c) => c.text).join(' · ') : common[0]?.text} lead={mode === 'common' ? 'common' : 'bio'} />)}
          {!list.length && (ranked.length
            ? <EmptyCard title={mode === 'common' ? (en ? 'Nothing in common yet' : '아직 겹치는 사람이 없어요') : (en ? 'No one matches that yet' : '아직 맞는 사람이 없어요')}
                sub={mode === 'common' ? (en ? 'Add your classes and interests — shared ones show up here.' : '수업과 관심사를 넣으면 겹치는 사람이 보여요.') : (en ? 'Try fewer filters.' : '조건을 줄여 보세요.')}
                secondary={anyFilter ? { label: en ? 'Clear filters' : '조건 지우기', onClick: () => { setText(''); setParams({}, { replace: true }); } } : { label: en ? 'Edit profile' : '프로필 수정', onClick: () => nav('/profile/edit') }} />
            : <CampusStart parts={['classes', 'invite']} />)}
        </div>}
        <InfoNote className="mt-5">{en ? 'Suggestions reflect registered people, not school rosters.' : '학교 명단이 아니라 Lumi 에 가입한 사람만 보여요.'}</InfoNote>
      </div>
    </div>
  );
}

/** FormField 과 같은 모양 — Lumi+ 가 잠겨 있으면 이름 옆에 자물쇠 + Lumi+ */
function Field({ label, locked, children }: { label: string; locked: boolean; children: ReactNode }) {
  return <div><div className="flex items-center justify-between gap-2 text-[13px] font-semibold text-ink mb-2"><span>{label}</span>{locked && <PlusLock />}</div>{children}</div>;
}

/**
 * People filters (PDF S059) — 학년·학적(1st–4th+ · Graduate · Alumni), 쓰는 언어(누가 공개했을 때만), 관심사, 그룹, Show Results.
 * 언어·관심사·커뮤니티는 Lumi+ (LUMI_PLUS 가 켜졌을 때만 잠긴다 — 꺼져 있으면 모두에게 열림, @core/lib/plus).
 * 대학교 칸은 지금 한 학교만 열려 있어 빼고 Same campus 칩으로 둔다. 국적은 고르지 않는다 (언어와 따로, 본인이 공개해도 거르는 데 쓰지 않는다).
 */
export function PeopleFiltersPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const plus = usePlus();
  const [picked, setX] = useState<PeopleQuery>(() => readQuery(params));
  // Lumi+ 플래그가 켜졌고 Lumi+ 가 없으면: 언어·관심사·커뮤니티는 자물쇠 (눌러도 고르지 않고 Lumi+ 화면으로)
  const x = plus.locked ? withoutAdvanced(picked) : picked;
  const [sheet, setSheet] = useState<'lang' | 'org' | null>(null);
  const ranked = usePeopleInCommon();
  const ok = usePeopleFilter(x);
  const gate = (fn: () => void) => () => (plus.locked ? nav('/settings/plus') : fn());
  const count = ranked.filter(({ u }) => ok(u)).length;
  const languages = useMemo(() => [...new Set([...(v.me.spokenLanguages ?? []), ...v.visibleUsers.flatMap((u) => u.spokenLanguages ?? [])].map((l) => l.trim()).filter(Boolean))].sort(), [v]);
  const groups = useMemo(() => myGroups(orgs, v.me.id), [orgs, v.me.id]);
  const tog = <T,>(arr: T[], y: T) => (arr.includes(y) ? arr.filter((z) => z !== y) : [...arr, y]);
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'People filters' : '사람 찾기 조건'} />
      <PageTitle title={en ? 'People filters' : '사람 찾기 조건'} className="pb-2" />
      <div className="px-4 pb-6 space-y-6">
        <section>
          <h2 className="ha-h2 mb-3">{en ? 'Year & status' : '학년·학적'}</h2>
          <ChipRow wrap>
            <Chip active={!x.years.length} onClick={() => setX({ ...x, years: [] })}>{en ? 'Any' : '전체'}</Chip>
            {YEAR_CHIPS.map((c) => <Chip key={c.key} active={x.years.includes(c.key)} onClick={() => setX({ ...x, years: tog(x.years, c.key) })}>{c.label}</Chip>)}
          </ChipRow>
        </section>
        {languages.length > 0 && (
          <Field locked={plus.locked} label={en ? 'Spoken language' : '쓰는 언어'}><SelectField icon={<Globe size={18} />} value={x.language} placeholder={en ? 'Optional' : '선택'} onClick={gate(() => setSheet('lang'))} className={plus.locked ? 'opacity-60' : undefined} /></Field>
        )}
        <Field locked={plus.locked} label={en ? 'Interests' : '관심사'}>
          <ChipRow wrap className={plus.locked ? 'opacity-60' : undefined}>{ALL_INTERESTS.filter((i) => i !== 'etc').map((i) => <Chip key={i} size="sm" active={x.interests.includes(i)} onClick={gate(() => setX({ ...x, interests: tog(x.interests, i) }))}>{INTEREST_LABELS[i]}</Chip>)}</ChipRow>
        </Field>
        {groups.length > 0 && (
          <Field locked={plus.locked} label={en ? 'Communities' : '커뮤니티'}><SelectField icon={<Users size={18} />} value={groups.find((o) => o.id === x.org)?.name} placeholder={en ? 'Visible shared communities' : '내 그룹 회원'} onClick={gate(() => setSheet('org'))} className={plus.locked ? 'opacity-60' : undefined} /></Field>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold">{en ? 'Same campus only' : '같은 캠퍼스만'}</span>
          <Chip active={x.sameCampus} onClick={() => setX({ ...x, sameCampus: !x.sameCampus })}>{x.sameCampus ? (en ? 'On' : '켜짐') : (en ? 'Off' : '꺼짐')}</Chip>
        </div>
        <InfoNote>{languages.length ? (en ? 'Language and country of origin are separate opt-in fields.' : '언어와 출신 나라는 각자 고른 경우에만 있는 따로인 항목이에요.') : (en ? 'Only what people chose to share is matched.' : '각자 공개한 것만으로 찾아요.')}</InfoNote>
      </div>
      <BottomCTA><Btn full size="lg" onClick={() => nav(`/social/people/results?${writeQuery(x)}`, { replace: true })}>{en ? `Show Results (${count})` : `${count}명 보기`}</Btn></BottomCTA>

      <BottomSheet open={sheet === 'lang'} onClose={() => setSheet(null)} title={en ? 'Spoken language' : '쓰는 언어'}>
        <div className="space-y-1">{['', ...languages].map((l) => (
          <button key={l || 'any'} onClick={() => { setX({ ...x, language: l }); setSheet(null); }} className="w-full flex items-center justify-between rounded-xl px-3 h-12 text-[15px] text-left press">
            {l || (en ? 'Any language' : '상관없음')}{x.language === l && <Check size={18} className="text-sel-fg" />}
          </button>
        ))}</div>
      </BottomSheet>
      <BottomSheet open={sheet === 'org'} onClose={() => setSheet(null)} title={en ? 'Communities' : '커뮤니티'}>
        <div className="space-y-1">{[{ id: '', name: en ? 'Any' : '상관없음' }, ...groups].map((o) => (
          <button key={o.id || 'any'} onClick={() => { setX({ ...x, org: o.id }); setSheet(null); }} className="w-full flex items-center justify-between rounded-xl px-3 h-12 text-[15px] text-left press">
            <span className="truncate">{o.name}</span>{x.org === o.id && <Check size={18} className="text-sel-fg" />}
          </button>
        ))}</div>
      </BottomSheet>
    </div>
  );
}
