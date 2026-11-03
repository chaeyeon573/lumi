import { recruitmentLabel } from '@core/lib/orglinks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowRight, Star, Check, CalendarDays, Search } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { Chip, Button, EmptyState, Avatar, Input } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ORG_TYPE_LABELS, OPP_TYPE_LABELS, OPP_TYPE_EMOJI } from '@core/lib/labels';
import { daysUntil } from '@core/lib/recommend';
import { forYou, scoreListings, scoreClubs, whyLine, limitRepeats, type Reason } from '@core/lib/foryou';
import { FIELDS, REGIONS, audienceOf, badgeOf, categoriesOf, eventKindsOf, isGradStudent, listingField, workAuthLabel, locationOf, orgLinker, regionsOf, spreadByHost, type Category, type EventKind, type Region } from '@core/lib/listings';
import { COURSE_HUES, meetingsLabel, clashesWith, coursesFromCatalog, hasCatalogCourse } from '@core/lib/timetable';
import { api } from '@core/api';
import type { CatalogCourse } from '@core/api/types';
import { formatTime } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { RideSeasonBanner } from '@/components/rides/RideBits';
import type { Opportunity, Organization } from '@core/types';
import { PeopleLine } from '@/components/together/PeopleLine';
import { WatchSeatsButton } from '@/components/seats/SeatWatch';

/**
 * 캠퍼스 › 찾기 — 동아리·수업·인턴·연구·장학금·해커톤·행사를 한 줄의 칩으로.
 * 칸은 type이 아니라 categoriesOf()로 나눈다 → 한 공고가 여러 칸에 들어갈 수 있다 (연구 장학금은 연구·장학금 둘 다).
 * URL: ?tab=opportunities&sub=<칩>&kind=<작은 칩> (+ 인턴: field·region·sort, 수업: dept)
 */
export type BrowseChip = 'foryou' | 'clubs' | 'classes' | 'internship' | 'research' | 'scholarship' | 'hackathon' | 'event' | 'free_food' | 'startup' | 'exchange' | 'saved';
const CHIP_KEYS: BrowseChip[] = ['foryou', 'clubs', 'classes', 'internship', 'research', 'scholarship', 'hackathon', 'event', 'free_food', 'startup', 'exchange', 'saved'];
/** 예전 링크 (?sub=lab, ?sub=talks …) */
const LEGACY: Record<string, { sub: BrowseChip; kind?: string }> = { lab: { sub: 'research' }, funding: { sub: 'scholarship' }, talks: { sub: 'event', kind: 'talk' }, phd: { sub: 'internship', kind: 'phd' } };
export function readBrowseParams(params: URLSearchParams): { sub: BrowseChip; kind: string } {
  const raw = params.get('sub') ?? 'foryou';
  const legacy = LEGACY[raw];
  if (legacy) return { sub: legacy.sub, kind: params.get('kind') ?? legacy.kind ?? '' };
  return { sub: (CHIP_KEYS as string[]).includes(raw) ? (raw as BrowseChip) : 'foryou', kind: params.get('kind') ?? '' };
}

type Sort = 'foryou' | 'deadline' | 'newest';
const PAGE = 30;
const en = lang === 'en';
const isIntlOk = (o: Opportunity) => o.tags.some((t) => /^international students$/i.test(t));
const BADGE_TONE = { urgent: 'bg-danger text-white', soon: 'bg-danger/10 text-danger', normal: 'bg-primary-soft text-primary', muted: 'bg-surface-2 text-ink-3' } as const;
const EVENT_KIND_LABEL: Record<EventKind, string> = { talk: en ? 'Talks' : '세미나·강연', social: en ? 'Social' : '소셜', career: en ? 'Career' : '커리어', free_food: en ? 'Free food' : '무료 음식' };
const CLUB_KINDS: { key: '' | Organization['type'] | 'mine'; label: string }[] = [
  { key: '', label: t('전체') }, { key: 'club', label: t('동아리') }, { key: 'greek', label: 'Greek' }, { key: 'coop', label: lang === 'en' ? 'Co-ops' : '코업 하우스' }, { key: 'lab', label: t('연구실') }, { key: 'council', label: t('학회·학생회') }, { key: 'mine', label: t('내 조직') },
];

type Row = { o: Opportunity; score: number; reasons: Reason[]; cats: Category[] };
/** 보이는 순서대로 이유 한 줄 — 같은 이유 문장은 위에서부터 두 번까지만 (limitRepeats) */
const whyLines = <T,>(items: T[], reasonsOf: (x: T) => Reason[]) => limitRepeats(items.map(reasonsOf)).map((rs) => whyLine(rs, 1));

/** only: 이 칩만 보인다(Explore › Events/Opportunities/Clubs) · defaultSub: sub 가 없을 때 · extras=false: Saved·Rides 칩 숨김 */
export function BrowseTab({ only, defaultSub, extras = true }: { only?: BrowseChip[]; defaultSub?: BrowseChip; extras?: boolean } = {}) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const parsed = readBrowseParams(params);
  const sub: BrowseChip = !params.get('sub') && defaultSub ? defaultSub : parsed.sub;
  const { kind } = parsed;
  const field = params.get('field') ?? '';
  const intlOnly = params.get('intl') === '1';
  const region = params.get('region') ?? '';
  const sort = (params.get('sort') ?? 'foryou') as Sort;
  const setQ = (p: Record<string, string>) => { const next = new URLSearchParams(params); if (!only) next.set('tab', 'opportunities'); for (const [k, v] of Object.entries(p)) { if (v) next.set(k, v); else next.delete(k); } setParams(next, { replace: true }); };
  const setSub = (s: BrowseChip) => setQ({ sub: s === (defaultSub ?? 'foryou') ? '' : s, kind: '', field: '', region: '', sort: '', dept: '', mine: '', intl: '' });

  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const orgs = useAppStore((s) => s.organizations);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  const run = useAppStore((s) => s.run);
  const me = useViewer().me;
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const grad = isGradStudent(me);
  const snap = useMemo(() => ({ opportunities: opps, opportunityIntents: intents, organizations: orgs, relationships, schools }), [opps, intents, orgs, relationships, schools]);
  const savedIds = useMemo(() => new Set(intents.filter((i) => i.userId === me.id && (i.saved || i.intent !== 'interested')).map((i) => i.opportunityId)), [intents, me.id]);

  // 목록에 올릴 공고 — 우리 학교·전체 대상, 아직 지원할 수 있는 것 (마감이 있으면 마감, 없으면 행사 날짜 기준).
  // 해커톤은 시작일(date)이 지나도 제출 마감 전이면 남는다. 가벼운 활동(activity)과 동아리 모집 글(club)은 Discover·동아리에서
  const rows = useMemo<Row[]>(() => {
    const base = opps.filter((o) => o.type !== 'activity' && o.type !== 'club')
      .filter((o) => !o.schoolId || o.schoolId === mySchool)
      .filter((o) => (o.deadline ? daysUntil(o.deadline) >= 0 : !o.date || daysUntil(o.date) >= 0));
    const sc = scoreListings(snap, me, base);
    return base.map((o) => { const r = sc.get(o.id); return { o, score: r?.score ?? -1, reasons: r?.reasons ?? [], cats: categoriesOf(o) }; });
  }, [opps, snap, me, mySchool]);
  // 칩 숫자는 목록에 실제로 뜨는 것만 — 마감됐거나 내려간 공고까지 세면 'Saved 1' 을 눌렀는데 빈 목록이 나온다
  const savedOpen = useMemo(() => rows.filter((r) => savedIds.has(r.o.id)).length, [rows, savedIds]);
  const counts = useMemo(() => { const c: Partial<Record<Category, number>> = {}; for (const r of rows) for (const k of r.cats) c[k] = (c[k] ?? 0) + 1; return c; }, [rows]);
  const toggleSave = (o: Opportunity) => run(() => api.opportunities.toggleSave(o.id, me.id), savedIds.has(o.id) ? undefined : (en ? 'Saved — find it under ☆ Saved.' : '저장했어요 — ☆ 저장에서 볼 수 있어요.'));

  const L = (e: string, k: string) => (en ? e : k);
  const chips: [BrowseChip, string][] = [
    ['foryou', L('For you', '추천')], ['clubs', L('Clubs', '동아리')], ['classes', L('Classes', '수업')], ['internship', OPP_TYPE_LABELS.internship],
    ['research', grad ? L('Research & TA', '연구·TA') : L('Research & RA', '연구·RA')], ['scholarship', grad ? L('Funding', '펀딩') : OPP_TYPE_LABELS.scholarship],
    ['hackathon', L('Hackathons', '해커톤·공모전')], ['event', L('Events', '행사')], ['free_food', L('Free food', '무료 음식')],
    ...(counts.startup || sub === 'startup' ? [['startup', L('Startups', '창업')] as [BrowseChip, string]] : []),
    ...(counts.exchange || sub === 'exchange' ? [['exchange', L('Study abroad', '교환학생')] as [BrowseChip, string]] : []),
  ].filter(([k]) => !only || only.includes(k as BrowseChip)) as [BrowseChip, string][];

  // 링크로 들어왔을 때 고른 칩이 화면 밖에 있지 않게
  const rowRef = useRef<HTMLDivElement>(null);
  const activeIdx = sub === 'saved' ? chips.length : chips.findIndex(([k]) => k === sub);
  useEffect(() => {
    const el = rowRef.current?.children[activeIdx] as HTMLElement | undefined;
    const row = rowRef.current;
    if (el && row) row.scrollTo({ left: Math.max(0, row.scrollLeft + el.getBoundingClientRect().left - row.getBoundingClientRect().left - (row.clientWidth - el.offsetWidth) / 2), behavior: 'smooth' });
  }, [activeIdx]);
  return (
    <div>
{(chips.length > 1 || extras) &&       <div ref={rowRef} className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2" aria-label={L('Browse by category', '종류별로 보기')}>
        {chips.map(([k, l]) => <Chip key={k} active={sub === k} onClick={() => setSub(k)}>{l}</Chip>)}
        {extras && <Chip active={sub === 'saved'} onClick={() => setSub('saved')}><Star size={13} className="inline -mt-0.5 mr-1" fill={sub === 'saved' ? 'currentColor' : 'none'} />{L('Saved', '저장')}{savedOpen ? ` ${savedOpen}` : ''}</Chip>}
        {extras && !only && <Chip onClick={() => nav('/rides')}>🚗 {L('Rides', '같이 타기')}</Chip>}
      </div>}
      {sub === 'foryou' && !only && <RideSeasonBanner className="mb-3" />}
      {sub === 'foryou' && <ForYouList rows={rows} savedIds={savedIds} toggleSave={toggleSave} onSaved={() => setSub('saved')} />}
      {sub === 'clubs' && <ClubsList kind={params.get('mine') ? 'mine' : kind} setKind={(k) => setQ({ kind: k, mine: '' })} rows={rows} />}
      {sub === 'classes' && <ClassesList dept={params.get('dept') ?? ''} setDept={(d) => setQ({ dept: d })} />}
      {sub !== 'foryou' && sub !== 'clubs' && sub !== 'classes' && (
        <ListingList sub={sub} kind={kind} field={field} intlOnly={intlOnly} region={region} sort={sort} setQ={setQ} rows={rows} grad={grad} savedIds={savedIds} toggleSave={toggleSave} nav={nav} />
      )}
    </div>
  );
}

// ─── For you — 공고와 동아리를 섞은 추천 (lib/foryou, Ask Lumi와 같은 엔진) ──────
function ForYouList({ rows, savedIds, toggleSave, onSaved }: { rows: Row[]; savedIds: Set<string>; toggleSave: (o: Opportunity) => void; onSaved: () => void }) {
  const nav = useNavigate();
  const me = useViewer().me;
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const orgs = useAppStore((s) => s.organizations);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  const [shown, setShown] = useState(PAGE);
  const listable = useMemo(() => new Set(rows.map((r) => r.o.id)), [rows]);
  const recs = useMemo(() => forYou({ opportunities: opps, opportunityIntents: intents, organizations: orgs, relationships, schools }, me)
    .filter((r) => r.kind === 'club' || listable.has(r.id)), [opps, intents, orgs, relationships, schools, me, listable]);
  const visible = recs.slice(0, shown);
  const why = useMemo(() => whyLines(visible, (r) => r.reasons), [recs, shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const saved = useMemo(() => rows.filter((r) => savedIds.has(r.o.id)).map((r) => r.o).sort((a, b) => (a.deadline ?? a.date ?? '9999').localeCompare(b.deadline ?? b.date ?? '9999')), [rows, savedIds]);
  return (
    <div>
      {saved.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5"><b className="text-[13px] flex items-center gap-1"><Star size={13} className="text-gold" fill="currentColor" />{en ? 'Your saved' : '저장한 공고'}</b><button onClick={onSaved} className="text-[12px] text-primary font-semibold">{en ? 'See all' : '모두 보기'}</button></div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">{saved.slice(0, 10).map((o) => { const b = badgeOf(o, en); return (
            <button key={o.id} onClick={() => nav(`/opportunities/${o.id}`)} className="shrink-0 w-[200px] rounded-2xl bg-surface border border-line p-3 text-left press">
              <span className={cn('inline-flex h-5 px-2 rounded-full text-[10px] font-bold items-center', BADGE_TONE[b.tone])}>{b.text}</span>
              <span className="block text-[13px] font-semibold text-primary mt-1.5 line-clamp-2 leading-snug">{o.title}</span>
              <span className="block text-[11px] text-ink-3 truncate mt-0.5">{o.host}</span>
            </button>); })}</div>
        </div>
      )}
      <div className="text-[12px] text-ink-3 mb-1">{en ? 'Clubs, listings and events picked for you' : '나에게 맞는 동아리·공고·행사'}</div>
      {recs.length === 0 ? <EmptyState emoji="" title={t('아직 등록된 기회가 없어요')} /> : (
        <div className="divide-y divide-line">{visible.map((r, i) => r.kind === 'club'
          ? <ClubRow key={r.id} o={r.item} why={why[i]} />
          : <ListingRow key={r.id} o={r.item} why={why[i]} saved={savedIds.has(r.id)} toggleSave={toggleSave} />)}</div>
      )}
      {recs.length > shown && <Button full variant="outline" className="mt-3" onClick={() => setShown((n) => n + PAGE)}>{en ? 'Show more' : '더 보기'}</Button>}
    </div>
  );
}

// ─── 공고 칸 (인턴·연구·장학금·해커톤·행사·무료 음식·창업·교환·저장) ─────────────
function ListingList({ sub, kind, field, intlOnly, region, sort, setQ, rows, grad, savedIds, toggleSave, nav }: {
  sub: Exclude<BrowseChip, 'foryou' | 'clubs' | 'classes'>; kind: string; field: string; intlOnly: boolean; region: string; sort: Sort; setQ: (p: Record<string, string>) => void;
  rows: Row[]; grad: boolean; savedIds: Set<string>; toggleSave: (o: Opportunity) => void; nav: ReturnType<typeof useNavigate>;
}) {
  const me = useViewer().me;
  const orgs = useAppStore((s) => s.organizations);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [sub, kind, field, intlOnly, region, sort]);
  const isEvents = sub === 'event' || sub === 'free_food';
  // 대학원생에게는 학부생 대상 공고를, 학부생에게는 대학원생 대상을 빼고 (장학금·연구)
  const fits = (o: Opportunity) => audienceOf(o) !== (grad ? 'undergrad' : 'grad');
  const inChip = useMemo(() => rows.filter((r) => sub === 'saved' ? savedIds.has(r.o.id)
    : r.cats.includes(sub) && ((sub !== 'research' && sub !== 'scholarship') || fits(r.o))), [rows, sub, savedIds, grad]); // eslint-disable-line react-hooks/exhaustive-deps
  const eventKinds = useMemo(() => {
    if (sub !== 'event') return [] as EventKind[];
    const has = new Set(inChip.flatMap((r) => eventKindsOf(r.o)));
    return (['talk', 'social', 'career', 'free_food'] as EventKind[]).filter((k) => has.has(k));
  }, [inChip, sub]);
  // 분야별 개수 — 지역·PhD 고르기는 반영하고 분야 고르기는 빼고 센다(칩마다 ‘이 분야를 누르면 몇 개’)
  const fieldCounts = useMemo(() => {
    const m = new Map<string, number>();
    if (sub !== 'internship') return m;
    for (const r of inChip) {
      if (kind === 'phd' && audienceOf(r.o) !== 'grad') continue;
      if (region && !regionsOf(r.o).includes(region as Region)) continue;
      if (intlOnly && r.o.workAuth !== 'intl_ok') continue;
      const f = listingField(r.o); m.set(f, (m.get(f) ?? 0) + 1);
    }
    return m;
  }, [inChip, sub, kind, region, intlOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => {
    let xs = inChip;
    if (sub === 'event' && kind) xs = xs.filter((r) => eventKindsOf(r.o).includes(kind as EventKind));
    if (sub === 'internship' && kind === 'phd') xs = xs.filter((r) => audienceOf(r.o) === 'grad');
    // 유학생 가능 — 공식 페이지에 유학생·‘모든 대학원생’ 이라고 적힌 것만 이 태그를 단다(짐작하지 않는다)
    if ((sub === 'scholarship' || sub === 'research') && kind === 'intl') xs = xs.filter((r) => isIntlOk(r.o));
    if (field) xs = xs.filter((r) => listingField(r.o) === field);
    if (sub === 'internship' && intlOnly) xs = xs.filter((r) => r.o.workAuth === 'intl_ok');
    if (region) xs = xs.filter((r) => regionsOf(r.o).includes(region as Region));
    const when = (o: Opportunity) => `${o.date ?? o.deadline ?? '9999'} ${o.startTime ?? ''}`;
    if (isEvents) {
      // 행사는 날짜순. 세미나는 내 전공 단어가 들어간 것을 먼저
      const dept = me.affiliation.type === 'university' ? me.affiliation.department.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3) : [];
      const mine = (o: Opportunity) => (kind === 'talk' && dept.some((w) => `${o.title} ${o.host}`.toLowerCase().includes(w)) ? 0 : 1);
      return [...xs].sort((a, b) => mine(a.o) - mine(b.o) || when(a.o).localeCompare(when(b.o))).map((r) => r.o);
    }
    const due = (o: Opportunity) => o.deadline ?? o.date ?? '9999';
    const posted = (o: Opportunity) => o.postedAt ?? o.createdAt;
    if (sub === 'saved') return [...xs].sort((a, b) => due(a.o).localeCompare(due(b.o))).map((r) => r.o);
    const sorted = [...xs].sort((a, b) => sort === 'deadline' ? due(a.o).localeCompare(due(b.o)) : sort === 'newest' ? posted(b.o).localeCompare(posted(a.o)) : b.score - a.score || due(a.o).localeCompare(due(b.o)));
    return sort === 'deadline' ? sorted.map((r) => r.o) : spreadByHost(sorted.map((r) => r.o));
  }, [inChip, sub, kind, field, intlOnly, region, sort, isEvents, me]);
  const whyOf = useMemo(() => {
    const byId = new Map(rows.map((r) => [r.o.id, r.reasons]));
    const vis = list.slice(0, shown);
    const lines = whyLines(vis, (o) => byId.get(o.id) ?? []);
    return new Map(vis.map((o, i) => [o.id, lines[i]]));
  }, [rows, list, shown]);
  const hostOrg = useMemo(() => orgLinker(orgs), [orgs]);
  const labs = useMemo(() => (sub === 'research' ? orgs.filter((o) => o.type === 'lab' && o.schoolId === (me.affiliation.type === 'university' ? me.affiliation.schoolId : '')) : []), [sub, orgs, me]);
  const showSort = sub === 'internship' || sub === 'research' || sub === 'scholarship' || sub === 'hackathon';
  const intlCount = (sub === 'scholarship' || sub === 'research') ? inChip.filter((r) => isIntlOk(r.o)).length : 0;
  // 인턴: 공고 본문에 CPT/OPT·유학생 가능이라고 적힌 것 (workAuth)
  const intlJobs = sub === 'internship' ? inChip.filter((r) => r.o.workAuth === 'intl_ok').length : 0;

  return (
    <div>
      {sub === 'internship' && intlJobs > 0 && <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">
        <Chip size="sm" active={!intlOnly} onClick={() => setQ({ intl: '' })}>{en ? 'Any work status' : '전체'}</Chip>
        <Chip size="sm" active={intlOnly} onClick={() => setQ({ intl: intlOnly ? '' : '1' })}>{en ? `Int’l students OK ${intlJobs}` : `유학생 가능 ${intlJobs}`}</Chip>
      </div>}
      {sub === 'internship' && grad && <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">
        <Chip size="sm" active={kind !== 'phd'} onClick={() => setQ({ kind: '' })}>{en ? 'All internships' : '전체 인턴'}</Chip>
        <Chip size="sm" active={kind === 'phd'} onClick={() => setQ({ kind: 'phd' })}>{en ? 'PhD/MS internships' : '대학원 인턴'}</Chip>
      </div>}
      {intlCount > 0 && <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">
        <Chip size="sm" active={kind !== 'intl'} onClick={() => setQ({ kind: '' })}>{en ? 'All' : '전체'}</Chip>
        <Chip size="sm" active={kind === 'intl'} onClick={() => setQ({ kind: 'intl' })}>{en ? `International students OK ${intlCount}` : `유학생 가능 ${intlCount}`}</Chip>
      </div>}
      {eventKinds.length > 0 && <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">
        <Chip size="sm" active={!kind} onClick={() => setQ({ kind: '' })}>{en ? 'All events' : '전체 행사'}</Chip>
        {eventKinds.map((k) => <Chip key={k} size="sm" active={kind === k} onClick={() => setQ({ kind: kind === k ? '' : k })}>{EVENT_KIND_LABEL[k]}</Chip>)}
      </div>}
      {showSort && (
        <div className="space-y-2 mb-2">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4">
            {(['foryou', 'deadline', 'newest'] as Sort[]).map((k) => <Chip key={k} size="sm" active={sort === k} onClick={() => setQ({ sort: k === 'foryou' ? '' : k })}>{{ foryou: en ? 'For you' : '추천순', deadline: en ? 'Deadline soon' : '마감 임박', newest: en ? 'Newest' : '최신' }[k]}</Chip>)}
            {sub === 'internship' && <>
              <span className="w-px bg-line shrink-0 mx-1" />
              <select value={region} onChange={(e) => setQ({ region: e.target.value })} aria-label={en ? 'Location' : '지역'} className={cn('h-8 rounded-full px-3 text-[12px] font-semibold shrink-0', region ? 'bg-primary text-white' : 'bg-surface-2 text-ink-2')}>
                <option value="">{en ? 'Any location' : '지역 전체'}</option>{REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </>}
          </div>
          {/* 분야는 한눈에 — 옆으로 넘기는 한 줄 대신 줄바꿈해서 모두, 개수와 함께. 공고가 없는 분야는 흐리게(눌러도 0개) */}
          {sub === 'internship' && <div className="flex flex-wrap gap-1.5">
            <Chip size="sm" active={!field} onClick={() => setQ({ field: '' })}>{en ? 'All fields' : '전체 분야'} {[...fieldCounts.values()].reduce((a, b) => a + b, 0)}</Chip>
            {FIELDS.map((f) => { const n = fieldCounts.get(f) ?? 0; return <Chip key={f} size="sm" active={field === f} className={cn(!n && field !== f && 'opacity-45')} onClick={() => setQ({ field: field === f ? '' : f })}>{f} <span className="opacity-70">{n}</span></Chip>; })}
          </div>}
        </div>
      )}

      <div className="text-[12px] text-ink-3 mb-1">{isEvents ? (en ? `${list.length} upcoming` : `다가오는 행사 ${list.length}개`) : (en ? `${list.length} listing${list.length === 1 ? '' : 's'}` : `${list.length}개`)}</div>
      {list.length === 0 ? <EmptyState emoji="" title={sub === 'saved' ? (en ? 'Tap ☆ on a listing to save it here' : '공고의 ☆ 를 누르면 여기에 모여요') : isEvents ? (en ? 'Nothing coming up here yet' : '다가오는 행사가 아직 없어요') : t('아직 등록된 기회가 없어요')} /> : (
        <div className="divide-y divide-line">{list.slice(0, shown).map((o) => {
          const club = isEvents ? hostOrg(o) : undefined;
          return <ListingRow key={o.id} o={o} why={!isEvents && sub !== 'saved' && sort === 'foryou' ? whyOf.get(o.id) ?? '' : ''} saved={savedIds.has(o.id)} toggleSave={toggleSave} club={club} onClub={club ? () => nav(`/orgs/${club.id}`) : undefined} showType={!isEvents} />;
        })}</div>
      )}
      {list.length > shown && <Button full variant="outline" className="mt-3" onClick={() => setShown((n) => n + PAGE)}>{en ? `Show more (${list.length - shown})` : `더 보기 (${list.length - shown})`}</Button>}
      {labs.length > 0 && <div className="mt-4"><b className="text-[13px]">{en ? 'Labs on Lumi' : 'Lumi의 연구실'}</b><div className="divide-y divide-line">{labs.map((o) => <ClubRow key={o.id} o={o} why="" />)}</div></div>}
    </div>
  );
}

function ListingRow({ o, why, saved, toggleSave, club, onClub, showType = true }: { o: Opportunity; why: string; saved: boolean; toggleSave: (o: Opportunity) => void; club?: Organization; onClub?: () => void; showType?: boolean }) {
  const nav = useNavigate();
  const b = badgeOf(o, en);
  const loc = o.type === 'internship' ? locationOf(o) : o.place?.name ?? '';
  // 다른 화면(활동·Discover)과 같은 '10 AM' 꼴 — 자정(00:00)은 시각 없는 행사
  const time = o.type === 'event' && o.startTime && o.startTime !== '00:00' ? formatTime(o.startTime) : '';
  return (
    <div className="py-3">
    <div className="flex items-start gap-3">
      <button onClick={() => nav(`/opportunities/${o.id}`)} className="flex-1 min-w-0 flex items-start gap-3 text-left press">
        <span className="h-10 w-10 rounded-xl bg-primary-soft grid place-items-center text-[18px] shrink-0">{OPP_TYPE_EMOJI[o.type]}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-primary leading-snug line-clamp-2">{o.title}</span>
          <span className="block text-[13px] text-ink-2 truncate mt-0.5">{o.host}{loc ? ` · ${loc}` : ''}</span>
          <span className="flex items-center gap-1.5 mt-1 overflow-hidden">
            <span className={cn('h-5 px-2 rounded-full text-[11px] font-bold inline-flex items-center whitespace-nowrap shrink-0', BADGE_TONE[b.tone])}>{b.text}{time ? ` · ${time}` : ''}</span>
            {o.tags.includes('free food') && <span className="h-5 px-2 rounded-full bg-accent-soft text-primary text-[11px] font-semibold inline-flex items-center whitespace-nowrap shrink-0">{en ? 'Free food' : '무료 음식'}</span>}
            {showType && <span className="h-5 px-2 rounded-full bg-surface-2 text-ink-2 text-[11px] font-semibold inline-flex items-center whitespace-nowrap truncate">{o.type === 'internship' ? listingField(o) : OPP_TYPE_LABELS[o.type]}</span>}
            {o.type === 'internship' && (() => { const w = workAuthLabel(o, en); return w && <span className={cn('h-5 px-2 rounded-full text-[11px] font-semibold inline-flex items-center whitespace-nowrap', w.tone === 'good' ? 'bg-verify/10 text-verify v2:bg-lime-900/60 v2:text-lime-400' : 'bg-surface-2 text-ink-3')}>{w.text}</span>; })()}
            {o.remote && <span className="h-5 px-2 rounded-full bg-accent-soft text-primary text-[11px] font-semibold inline-flex items-center">Remote</span>}
          </span>
          {why && <span className="block text-[12px] text-ink-3 truncate mt-1">{why}</span>}
        </span>
      </button>
      {club && onClub
        ? <button onClick={onClub} aria-label={en ? `Open ${club.name}` : `${club.name} 페이지`} className="h-10 w-10 rounded-full grid place-items-center shrink-0 press"><Avatar emoji={club.logo.emoji} hue={club.logo.hue} url={club.logo.url} size={28} /></button>
        : <button onClick={() => toggleSave(o)} aria-label={saved ? (en ? 'Remove from saved' : '저장 취소') : (en ? 'Save listing' : '공고 저장')} className={cn('h-10 w-10 rounded-full grid place-items-center shrink-0 press', saved ? 'text-gold' : 'text-ink-3')}><Star size={21} fill={saved ? 'currentColor' : 'none'} /></button>}
    </div>
      {/* 모든 공고는 사람으로 이어진다 — 누가 가는지/저장했는지 + 같이 가기·같이 준비·팀원 찾기 */}
      <PeopleLine o={o} className="pl-[52px]" />
    </div>
  );
}

// ─── 동아리 (Club · Greek · 연구실 · 학생회 · 내 조직) ─────────────────────────
function ClubsList({ kind, setKind, rows }: { kind: string; setKind: (k: string) => void; rows: Row[] }) {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const opportunities = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [kind]);
  const mySchool = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const mine = (o: Organization) => o.memberIds.includes(v.me.id) || o.adminIds.includes(v.me.id) || o.followerIds.includes(v.me.id);
  const filtered = useMemo(() => orgs.filter((o) => kind === 'mine' ? mine(o) : (o.schoolId === mySchool || mine(o)) && (!kind || o.type === kind)), [orgs, kind, mySchool, v.me.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // 내 관심사대로 — 화면과 Ask Lumi가 같은 엔진(lib/foryou)을 쓴다
  const sc = useMemo(() => scoreClubs({ opportunities, opportunityIntents: intents, organizations: orgs, relationships, schools }, v.me, filtered), [opportunities, intents, orgs, relationships, schools, v.me, filtered]);
  const list = useMemo(() => filtered.map((o) => ({ o, r: sc.get(o.id) })).sort((a, b) => (b.r?.score ?? -1) - (a.r?.score ?? -1) || Number(!!recruitmentLabel(b.o.recruitment)?.open) - Number(!!recruitmentLabel(a.o.recruitment)?.open)).map((x) => x.o), [filtered, sc]);
  const clubWhy = useMemo(() => { const vis = list.slice(0, shown); const lines = whyLines(vis, (o) => sc.get(o.id)?.reasons ?? []); return new Map(vis.map((o, i) => [o.id, lines[i]])); }, [list, sc, shown]);
  // 이 동아리의 다가오는 모임·행사 (학교 행사 목록에서 이름으로 잇는다)
  const upcoming = useMemo(() => {
    const link = orgLinker(orgs); const m = new Map<string, Opportunity[]>();
    for (const r of rows) if (r.o.type === 'event') { const org = link(r.o); if (org) (m.get(org.id) ?? m.set(org.id, []).get(org.id)!).push(r.o); }
    return m;
  }, [orgs, rows]);
  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">{CLUB_KINDS.map((c) => <Chip key={c.key} size="sm" active={kind === c.key} onClick={() => setKind(c.key)}>{c.label}</Chip>)}</div>
      <div className="text-[12px] text-ink-3 mb-1">{en ? `${list.length} groups` : `${list.length}개`}</div>
      {list.length === 0 ? <EmptyState emoji="" title={t('아직 조직이 없어요')} /> : (
        <div className="divide-y divide-line">{list.slice(0, shown).map((o) => <ClubRow key={o.id} o={o} why={kind !== 'mine' ? clubWhy.get(o.id) ?? '' : ''} events={upcoming.get(o.id)} />)}</div>
      )}
      {list.length > shown && <Button full variant="outline" className="mt-3" onClick={() => setShown((n) => n + PAGE)}>{en ? `Show more (${list.length - shown})` : `더 보기 (${list.length - shown})`}</Button>}
    </div>
  );
}

function ClubRow({ o, why, events }: { o: Organization; why: string; events?: Opportunity[] }) {
  const nav = useNavigate();
  const next = events?.slice().sort((a, b) => `${a.date}`.localeCompare(`${b.date}`))[0];
  return (
    <button onClick={() => nav(`/orgs/${o.id}`)} className="w-full flex items-center gap-3 py-3.5 text-left press">
      <Avatar emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={44} />
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2"><span className="text-[15px] font-semibold text-primary truncate">{o.name}</span>{(() => { const r = recruitmentLabel(o.recruitment); return r && <span className={`h-6 px-2.5 rounded-full text-[11px] font-semibold shrink-0 truncate max-w-[45%] ${r.open ? 'bg-accent-soft text-primary' : 'bg-surface-2 text-ink-3'}`}>{r.text}</span>; })()}</span>
        <span className="block text-[13px] text-ink-3 truncate mt-0.5">{orgSubtitle(o)}</span>
        {next && <span className="flex items-center gap-1 text-[12px] text-primary truncate mt-0.5"><CalendarDays size={12} className="shrink-0" />{badgeOf(next, en).text} · {next.title}{events!.length > 1 ? (en ? ` · +${events!.length - 1} more` : ` 외 ${events!.length - 1}개`) : ''}</span>}
        {why && <span className="block text-[12px] text-ink-3 truncate mt-0.5">{why}</span>}
      </span>
      <span className="h-9 w-9 rounded-full grid place-items-center text-primary">{recruitmentLabel(o.recruitment)?.open ? <Plus size={20} /> : <ArrowRight size={20} />}</span>
    </button>
  );
}

/** 동아리 목록 한 줄 설명 — 학교 공식 목록에서 가져온 동아리는 우리 앱 회원이 0명이라 숫자 대신 종류·소개를 보여준다 */
function orgSubtitle(o: { name: string; type: keyof typeof ORG_TYPE_LABELS; parent?: string; description: string; memberIds: string[]; followerIds: string[] }) {
  const n = o.memberIds.length + o.followerIds.length;
  if (n > 0) return lang === 'en' ? `${n} on Lumi` : `Lumi에 ${n}명`;
  // 한 줄에 무엇을 하는 곳인지가 보이게 — 소개 먼저('Our mission is to …' 같은 머리말은 뺀다), 소개가 없을 때만 종류·학교 분류
  const esc = o.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const desc = o.description.replace(/\s+/g, ' ').trim()
    // 'The X (ABC) program aims to …' 처럼 이름을 되풀이하는 머리말
    .replace(new RegExp(`^(the )?${esc}( \\([^)]{1,15}\\))?,?( (program|club|organization|society))?( (is|aims|seeks|strives|exists))?( (a|an|to))? `, 'i'), '')
    .replace(/^(our|the|its) (mission|purpose|goal|aim)( of [^,]{1,60})? is to /i, '')
    // 사명문 꼴 'To provide …' → 'Provide …' (동사로 시작)
    .replace(/^to (?=[a-z]+ )/i, '');
  if (desc) return desc.charAt(0).toUpperCase() + desc.slice(1);
  return [ORG_TYPE_LABELS[o.type], o.parent].filter(Boolean).join(' · ');
}

// ─── 수업 — 이번 학기 수업 목록 (학과 + 검색) → 내 시간표에 추가 ─────────────────
function ClassesList({ dept, setDept }: { dept: string; setDept: (d: string) => void }) {
  const nav = useNavigate();
  const me = useViewer().me;
  const run = useAppStore((s) => s.run);
  const schoolId = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const [q, setQText] = useState('');
  const [depts, setDepts] = useState<{ name: string; count: number }[] | null>(null);
  const [list, setList] = useState<CatalogCourse[] | null>(null);
  const [busy, setBusy] = useState('');
  useEffect(() => { if (!schoolId) return; api.catalog.departments(schoolId).then(setDepts).catch(() => setDepts([])); }, [schoolId]);
  useEffect(() => {
    if (!schoolId) { setList([]); return; }
    let alive = true; setList(null);
    const h = setTimeout(() => { api.catalog.courses(schoolId, q, dept).then((r) => { if (alive) setList(r); }).catch(() => { if (alive) setList([]); }); }, 200);
    return () => { alive = false; clearTimeout(h); };
  }, [schoolId, q, dept]);
  const add = async (c: CatalogCourse) => {
    // 시간표 화면과 같은 규칙 (lib/timetable coursesFromCatalog) — 요일별로 펼쳐서 내 시간표 뒤에 붙인다
    const names = new Set(me.timetable.map((x) => x.name));
    const rows = coursesFromCatalog(c, COURSE_HUES[names.size % COURSE_HUES.length]);
    const clash = clashesWith(me.timetable, c)[0];
    setBusy(c.id);
    try {
      await run(() => api.users.update(me.id, { timetable: [...me.timetable, ...rows] }),
        clash ? (en ? `Added ${c.code} — it overlaps with ${clash.name}.` : `${c.code} 추가 — ${clash.name}과 시간이 겹쳐요.`) : (en ? `Added ${c.code} to your timetable.` : `${c.code}을 시간표에 넣었어요.`));
    } catch { /* run이 토스트로 알린다 */ } finally { setBusy(''); }
  };
  if (!schoolId) return <EmptyState emoji="" title={en ? 'Add your school to browse its classes' : '학교를 등록하면 수업 목록을 볼 수 있어요'} />;
  return (
    <div>
      <div className="space-y-2 mb-2">
        {depts && depts.length > 1 && (
          <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label={en ? 'Department' : '학과'} className={cn('w-full h-11 rounded-xl px-3 text-[14px] font-semibold border', dept ? 'bg-primary-soft text-primary border-primary/30' : 'bg-surface text-ink-2 border-line')}>
            <option value="">{en ? `All departments (${depts.length})` : `전체 학과 (${depts.length})`}</option>
            {depts.map((d) => <option key={d.name} value={d.name}>{d.name} · {d.count}</option>)}
          </select>
        )}
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" /><Input className="pl-9" placeholder={dept ? (en ? `Search in ${dept}…` : `${dept} 안에서 검색…`) : t('수업 이름이나 과목 코드로 검색')} value={q} onChange={(e) => setQText(e.target.value)} /></div>
      </div>
      <div className="flex items-center justify-between text-[12px] text-ink-3 mb-1">
        <span>{list === null ? (en ? 'Loading…' : '불러오는 중…') : dept ? (en ? `${list.length} classes in ${dept}` : `${dept} 수업 ${list.length}개`) : q ? (en ? `${list.length} matches` : `${list.length}개 찾음`) : (en ? 'Pick a department or search' : '학과를 고르거나 검색하세요')}</span>
        <button onClick={() => nav('/timetable')} className="text-primary font-semibold">{en ? `My timetable${me.timetable.length ? ` (${new Set(me.timetable.map((x) => x.name)).size})` : ''}` : `내 시간표${me.timetable.length ? ` (${new Set(me.timetable.map((x) => x.name)).size})` : ''}`}</button>
      </div>
      {list && list.length === 0 ? <EmptyState emoji="" title={q ? t('검색 결과가 없어요. 직접 입력할 수 있어요.') : (en ? 'No classes for this term yet' : '이번 학기 수업이 아직 없어요')} /> : (
        <div className="divide-y divide-line">{(list ?? []).slice(0, dept ? 400 : 60).map((c) => {
          const added = hasCatalogCourse(me.timetable, c);
          return (
            <div key={c.id} className="flex items-start gap-3 py-3">
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold text-primary leading-snug">{c.code} <span className="font-medium text-ink-2">{c.title}</span></span>
                <span className="block text-[12px] text-ink-3 mt-0.5">{c.meetings.length ? meetingsLabel(c.meetings) : t('시간 미정')}{c.location ? ` · ${c.location}` : ''}</span>
                {(c.instructor || c.units) && <span className="block text-[12px] text-ink-3 truncate">{[c.instructor, c.units ? (en ? `${c.units} units` : `${c.units}학점`) : ''].filter(Boolean).join(' · ')}</span>}
                {(c.syllabusUrl || c.url) && <a href={c.syllabusUrl ?? c.url} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-primary underline">{c.syllabusUrl ? t('실라버스') : t('과목 정보')}</a>}
                <WatchSeatsButton course={c} className="mt-1.5 flex w-fit" />
              </span>
              {added
                ? <span className="h-9 px-3 rounded-full bg-surface-2 text-ink-2 text-[12px] font-semibold inline-flex items-center gap-1 shrink-0"><Check size={14} />{en ? 'Added' : '추가됨'}</span>
                : <Button size="sm" variant="secondary" className="shrink-0" disabled={!c.meetings.length || !!busy} loading={busy === c.id} icon={<Plus size={14} />} onClick={() => add(c)}>{c.meetings.length ? (en ? 'Add' : '추가') : (en ? 'Time TBA' : '시간 미정')}</Button>}
            </div>
          );
        })}</div>
      )}
    </div>
  );
}
