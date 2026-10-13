import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowRight, PenSquare, Heart, MessageCircle, Star } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { AskBar } from '@/components/ai/AskBar';
import { Chip, Button, CardSkeleton, EmptyState, ErrorState, Avatar, Cover } from '@/components/ui';
import { PostCard } from '@/components/cards/PostCard';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import { daysUntil, isTogetherType } from '@core/lib/recommend';
import { scoreListings, scoreClubs, whyLine, limitRepeats } from '@core/lib/foryou';
import { ALL_POST_TYPES, POST_TYPE_LABELS, OPP_TYPE_LABELS, OPP_TYPE_EMOJI } from '@core/lib/labels';
import { FIELDS, REGIONS, audienceOf, badgeOf, fieldOf, isGradStudent, isTalk, locationOf, regionsOf, spreadByHost, type Region } from '@core/lib/listings';
import { api } from '@core/api';
import { relativeTime } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { Opportunity, OpportunityType, OrganizationType, PostType, Post } from '@core/types';

type Tab = 'feed' | 'opportunities' | 'clubs';

/** 캠퍼스 — 피드 | 공고 | 단체 (Pastel Breeze, 행 목록) */
export function CommunityPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'feed') as Tab;
  const setTab = (tb: Tab) => setParams(tb === 'feed' ? {} : { tab: tb }, { replace: true });
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const tabs: [Tab, string][] = [['feed', t('피드')], ['opportunities', t('공고')], ['clubs', lang === 'en' ? 'Clubs & Greek' : t('단체')]];
  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader right={tab === 'feed' ? <button onClick={() => nav('/create/post')} aria-label={t('글쓰기')} className="h-11 w-11 rounded-full grid place-items-center text-ink-2"><PenSquare size={21} /></button> : undefined} />
      <div className="px-4 flex gap-7 border-b border-line">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn('h-11 text-[16px] font-semibold border-b-[3px] -mb-px transition', tab === k ? 'border-accent text-primary' : 'border-transparent text-ink-2')}>{l}</button>)}</div>
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4 pt-4">
          <AskBar className="mb-4" />
          {tab === 'feed' && <FeedTab />}
          {tab === 'opportunities' && <OpportunitiesTab />}
          {tab === 'clubs' && <ClubsTab />}
        </div>
      )}
    </div>
  );
}

function FeedTab() {
  const nav = useNavigate();
  const v = useViewer();
  const [type, setType] = useState<PostType | 'all' | 'anon'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const posts = v.visiblePosts.filter((p) => p.showOnFeed !== false)
    .filter((p) => type === 'all' ? true : type === 'anon' ? p.anonymous : p.postType === type && !p.anonymous)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const row = (p: Post) => {
    const author = v.userById(p.authorId); const org = p.orgId ? v.orgById(p.orgId) : undefined;
    const av = p.anonymous ? { emoji: '', hue: 210 } : org ? org.logo : author?.avatar ?? { emoji: '', hue: 200 };
    const name = p.anonymous ? t('익명') : org?.name ?? author?.nickname ?? '';
    if (open === p.id) return <div key={p.id} onClick={() => setOpen(null)}><PostCard post={p} /></div>;
    return (
      <button key={p.id} onClick={() => setOpen(p.id)} className="w-full flex items-center gap-3 py-3 text-left press">
        {p.anonymous ? <span className="h-11 w-11 rounded-full bg-primary-soft grid place-items-center text-primary text-[13px] font-bold">?</span> : <Avatar emoji={av.emoji} hue={av.hue} url={av.url} size={44} />}
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2"><span className="text-[15px] font-semibold text-primary truncate">{name}</span>{p.postType && p.postType !== 'story' && <span className="h-6 px-2.5 rounded-full bg-accent-soft text-primary text-[11px] font-semibold shrink-0">{POST_TYPE_LABELS[p.postType]}</span>}<span className="text-[12px] text-ink-3 ml-auto shrink-0">{relativeTime(p.createdAt)}</span></span>
          <span className="block text-[14px] text-ink-2 truncate mt-0.5">{p.text}</span>
          <span className="flex items-center gap-3 text-[12px] text-ink-3 mt-1"><span className="flex items-center gap-1"><Heart size={12} />{p.likeIds.length}</span><span className="flex items-center gap-1"><MessageCircle size={12} />{p.comments.length}</span></span>
        </span>
        {p.media[0] && <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} className="h-14 w-14 rounded-2xl shrink-0" size={20} />}
      </button>
    );
  };
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2"><Chip active={type === 'all'} onClick={() => setType('all')}>{t('전체')}</Chip>{ALL_POST_TYPES.filter((x) => x !== 'news').map((pt) => <Chip key={pt} active={type === pt} onClick={() => setType(pt)}>{POST_TYPE_LABELS[pt]}</Chip>)}<Chip active={type === 'anon'} onClick={() => setType('anon')}>{t('익명')}</Chip></div>
      {posts.length === 0 ? <EmptyState emoji="" title={t('아직 올라온 것이 없어요')} action={<Button onClick={() => nav('/create/post')}>{t('게시물 작성')}</Button>} /> : <div className="divide-y divide-line">{posts.map(row)}</div>}
    </div>
  );
}

type Sub = 'foryou' | 'saved' | 'funding' | 'talks' | 'phd' | OpportunityType;
type Sort = 'foryou' | 'deadline' | 'newest';
const PAGE = 30;
const en = lang === 'en';
const BADGE_TONE = { urgent: 'bg-danger text-white', soon: 'bg-danger/10 text-danger', normal: 'bg-primary-soft text-primary', muted: 'bg-surface-2 text-ink-3' } as const;

function OpportunitiesTab() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const sub = (params.get('sub') ?? 'foryou') as Sub;
  const field = params.get('field') ?? '';
  const region = params.get('region') ?? '';
  const sort = (params.get('sort') ?? 'foryou') as Sort;
  const setQ = (p: Record<string, string>) => { const next = new URLSearchParams(params); next.set('tab', 'opportunities'); for (const [k, v] of Object.entries(p)) { if (v) next.set(k, v); else next.delete(k); } setParams(next, { replace: true }); };
  const setSub = (s: Sub) => setQ({ sub: s === 'foryou' ? '' : s, field: '', region: '', sort: '' });
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const run = useAppStore((s) => s.run);
  const v = useViewer();
  const me = v.me;
  const [shown, setShown] = useState(PAGE);
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const savedIds = useMemo(() => new Set(intents.filter((i) => i.userId === me.id && (i.saved || i.intent !== 'interested')).map((i) => i.opportunityId)), [intents, me.id]);
  const orgs = useAppStore((s) => s.organizations);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  // For you — 화면과 Ask Lumi가 같은 엔진(lib/foryou)으로 매긴다. 지원했거나 대상이 아닌 것은 맨 뒤로
  const scored = useMemo(() => {
    const rows = opps.filter((o) => !isTogetherType(o.type) || (o.type === 'hackathon' && !o.rolesNeeded)).filter((o) => !o.schoolId || o.schoolId === mySchool).filter((o) => !o.deadline || daysUntil(o.deadline) >= 0);
    const sc = scoreListings({ opportunities: opps, opportunityIntents: intents, organizations: orgs, relationships, schools }, me, rows);
    return rows.map((o) => { const r = sc.get(o.id); return { o, score: r?.score ?? -1, reasons: r?.reasons ?? [] }; });
  }, [opps, intents, orgs, relationships, schools, me, mySchool]);

  const grad = isGradStudent(me);
  // 세미나·강연 — 행사라서 위 목록(정보성 공고)에는 없다. 내 전공 단어가 들어간 것을 먼저
  const talks = useMemo(() => {
    if (sub !== 'talks') return [];
    const dept = me.affiliation.type === 'university' ? me.affiliation.department.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3) : [];
    return opps.filter((o) => isTalk(o) && (!o.schoolId || o.schoolId === mySchool) && o.date && daysUntil(o.date) >= 0)
      .map((o) => ({ o, score: dept.some((w) => `${o.title} ${o.host}`.toLowerCase().includes(w)) ? 1 : 0 }))
      .sort((a, b) => b.score - a.score || (a.o.date ?? '').localeCompare(b.o.date ?? '') || (a.o.startTime ?? '').localeCompare(b.o.startTime ?? '')).map((x) => x.o);
  }, [opps, sub, me, mySchool]);

  const list = useMemo(() => {
    if (sub === 'talks') return talks;
    const fits = (o: Opportunity) => audienceOf(o) !== (grad ? 'undergrad' : 'grad');
    let rows = sub === 'saved' ? scored.filter((x) => savedIds.has(x.o.id))
      : sub === 'foryou' ? scored
      : sub === 'funding' ? scored.filter((x) => x.o.type === 'scholarship' && fits(x.o))
      : sub === 'phd' ? scored.filter((x) => x.o.type === 'internship' && audienceOf(x.o) === 'grad')
      : sub === 'scholarship' || sub === 'lab' ? scored.filter((x) => x.o.type === sub && fits(x.o))
      : scored.filter((x) => x.o.type === sub);
    if (field) rows = rows.filter((x) => (x.o.field ?? fieldOf(x.o.title)) === field);
    if (region) rows = rows.filter((x) => regionsOf(x.o).includes(region as Region));
    const due = (o: Opportunity) => o.deadline ?? o.date ?? '9999';
    const posted = (o: Opportunity) => o.postedAt ?? o.createdAt;
    const sorted = [...rows].sort((a, b) => sort === 'deadline' ? due(a.o).localeCompare(due(b.o)) : sort === 'newest' ? posted(b.o).localeCompare(posted(a.o)) : b.score - a.score || due(a.o).localeCompare(due(b.o)));
    return sort === 'deadline' ? sorted.map((x) => x.o) : spreadByHost(sorted.map((x) => x.o));
  }, [scored, sub, field, region, sort, savedIds, talks, grad]);

  // 보이는 순서대로 — 같은 이유는 두 번까지만
  const whyOf = useMemo(() => {
    const byId = new Map(scored.map((x) => [x.o.id, x.reasons]));
    const rows = list.slice(0, shown);
    const kept = limitRepeats(rows.map((o) => byId.get(o.id) ?? []));
    return new Map(rows.map((o, i) => [o.id, whyLine(kept[i], 1)]));
  }, [scored, list, shown]);
  const savedList = useMemo(() => scored.filter((x) => savedIds.has(x.o.id)).map((x) => x.o).sort((a, b) => (a.deadline ?? a.date ?? '9999').localeCompare(b.deadline ?? b.date ?? '9999')), [scored, savedIds]);
  const toggleSave = (o: Opportunity) => run(() => api.opportunities.toggleSave(o.id, me.id), savedIds.has(o.id) ? undefined : (en ? 'Saved — it’s at the top of Notices now.' : '저장했어요 — 공고 맨 위에서 볼 수 있어요.'));
  const showFilters = sub === 'internship' || sub === 'foryou' || sub === 'phd';

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">
        <Chip active={sub === 'foryou'} onClick={() => setSub('foryou')}>{t('전체')}</Chip>
        {grad
          ? ([['funding', en ? 'Funding' : '펀딩'], ['talks', en ? 'Talks & seminars' : '세미나·강연'], ['phd', en ? 'PhD/MS internships' : '대학원 인턴'], ['lab', en ? 'Research & TA' : '연구·TA'], ['internship', OPP_TYPE_LABELS.internship], ['hackathon', OPP_TYPE_LABELS.hackathon]] as [Sub, string][]).map(([k, l]) => <Chip key={k} active={sub === k} onClick={() => setSub(k)}>{l}</Chip>)
          : (['internship', 'scholarship', 'lab', 'hackathon', 'exchange'] as OpportunityType[]).map((ty) => <Chip key={ty} active={sub === ty} onClick={() => setSub(ty)}>{OPP_TYPE_LABELS[ty]}</Chip>)}
        <Chip active={sub === 'saved'} onClick={() => setSub('saved')}><Star size={13} className="inline -mt-0.5 mr-1" fill={sub === 'saved' ? 'currentColor' : 'none'} />{en ? 'Saved' : '저장'}{savedIds.size ? ` ${savedIds.size}` : ''}</Chip>
      </div>

      {sub !== 'saved' && savedList.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5"><b className="text-[13px] flex items-center gap-1"><Star size={13} className="text-gold" fill="currentColor" />{en ? 'Your saved' : '저장한 공고'}</b><button onClick={() => setSub('saved')} className="text-[12px] text-primary font-semibold">{en ? 'See all' : '모두 보기'}</button></div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">{savedList.slice(0, 10).map((o) => { const b = badgeOf(o, en); return (
            <button key={o.id} onClick={() => nav(`/opportunities/${o.id}`)} className="shrink-0 w-[200px] rounded-2xl bg-surface border border-line p-3 text-left press">
              <span className={cn('inline-flex h-5 px-2 rounded-full text-[10px] font-bold items-center', BADGE_TONE[b.tone])}>{b.text}</span>
              <span className="block text-[13px] font-semibold text-primary mt-1.5 line-clamp-2 leading-snug">{o.title}</span>
              <span className="block text-[11px] text-ink-3 truncate mt-0.5">{o.host}</span>
            </button>); })}</div>
        </div>
      )}

      {showFilters && (
        <div className="space-y-2 mb-2">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4">
            {(['foryou', 'deadline', 'newest'] as Sort[]).map((k) => <Chip key={k} size="sm" active={sort === k} onClick={() => setQ({ sort: k === 'foryou' ? '' : k })}>{{ foryou: en ? 'For you' : '추천순', deadline: en ? 'Deadline soon' : '마감 임박', newest: en ? 'Newest' : '최신' }[k]}</Chip>)}
            <span className="w-px bg-line shrink-0 mx-1" />
            <select value={region} onChange={(e) => setQ({ region: e.target.value })} className={cn('h-8 rounded-full px-3 text-[12px] font-semibold shrink-0', region ? 'bg-primary text-white' : 'bg-surface-2 text-ink-2')}>
              <option value="">{en ? 'Any location' : '지역 전체'}</option>{REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {(sub === 'internship' || sub === 'phd') && <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4">
            <Chip size="sm" active={!field} onClick={() => setQ({ field: '' })}>{en ? 'All fields' : '전체 분야'}</Chip>
            {FIELDS.filter((f) => f !== 'Other').map((f) => <Chip key={f} size="sm" active={field === f} onClick={() => setQ({ field: field === f ? '' : f })}>{f}</Chip>)}
          </div>}
        </div>
      )}

      <div className="text-[12px] text-ink-3 mb-1">{en ? `${list.length} listings` : `${list.length}개`}</div>
      {list.length === 0 ? <EmptyState emoji="" title={sub === 'saved' ? (en ? 'Tap ☆ on a listing to save it here' : '공고의 ☆ 를 누르면 여기에 모여요') : t('아직 등록된 기회가 없어요')} /> : (
        <div className="divide-y divide-line">{list.slice(0, shown).map((o) => {
          const b = badgeOf(o, en); const loc = o.type === 'internship' ? locationOf(o) : o.place?.name ?? ''; const saved = savedIds.has(o.id);
          return (
            <div key={o.id} className="flex items-start gap-3 py-3">
              <button onClick={() => nav(`/opportunities/${o.id}`)} className="flex-1 min-w-0 flex items-start gap-3 text-left press">
                <span className="h-10 w-10 rounded-xl bg-primary-soft grid place-items-center text-[18px] shrink-0">{OPP_TYPE_EMOJI[o.type]}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-primary leading-snug line-clamp-2">{o.title}</span>
                  <span className="block text-[13px] text-ink-2 truncate mt-0.5">{o.host}{loc ? ` · ${loc}` : ''}</span>
                  <span className="flex items-center gap-1.5 mt-1 overflow-hidden">
                    <span className={cn('h-5 px-2 rounded-full text-[11px] font-bold inline-flex items-center whitespace-nowrap shrink-0', BADGE_TONE[b.tone])}>{b.text}</span>
                    {o.type === 'internship' ? <span className="h-5 px-2 rounded-full bg-surface-2 text-ink-2 text-[11px] font-semibold inline-flex items-center whitespace-nowrap truncate">{o.field ?? fieldOf(o.title)}</span> : <span className="h-5 px-2 rounded-full bg-surface-2 text-ink-2 text-[11px] font-semibold inline-flex items-center whitespace-nowrap truncate">{OPP_TYPE_LABELS[o.type]}</span>}
                    {o.remote && <span className="h-5 px-2 rounded-full bg-accent-soft text-primary text-[11px] font-semibold inline-flex items-center">Remote</span>}
                  </span>
                  {sort === 'foryou' && whyOf.get(o.id) && <span className="block text-[12px] text-ink-3 truncate mt-1">✨ {whyOf.get(o.id)}</span>}
                </span>
              </button>
              <button onClick={() => toggleSave(o)} aria-label={saved ? (en ? 'Remove from saved' : '저장 취소') : (en ? 'Save listing' : '공고 저장')} className={cn('h-10 w-10 rounded-full grid place-items-center shrink-0 press', saved ? 'text-gold' : 'text-ink-3')}><Star size={21} fill={saved ? 'currentColor' : 'none'} /></button>
            </div>
          );
        })}</div>
      )}
      {list.length > shown && <Button full variant="outline" className="mt-3" onClick={() => setShown((n) => n + PAGE)}>{en ? `Show more (${list.length - shown})` : `더 보기 (${list.length - shown})`}</Button>}
    </div>
  );
}

const CLUB_CHIPS: { key: OrganizationType | 'all' | 'mine'; label: string }[] = [
  { key: 'all', label: t('전체') }, { key: 'mine', label: t('내 조직') }, { key: 'club', label: t('동아리') }, { key: 'council', label: t('학회·학생회') }, { key: 'lab', label: t('연구실') }, { key: 'greek', label: 'Greek' },
];
function ClubsTab() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const [chip, setChip] = useState<typeof CLUB_CHIPS[number]['key']>(params.get('mine') ? 'mine' : 'all');
  const mySchool = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const mine = (o: typeof orgs[number]) => o.memberIds.includes(v.me.id) || o.adminIds.includes(v.me.id) || o.followerIds.includes(v.me.id);
  const opportunities = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  const filtered = useMemo(() => orgs.filter((o) => chip === 'mine' ? mine(o) : (o.schoolId === mySchool || mine(o)) && (chip === 'all' || o.type === chip)), [orgs, chip, mySchool, v.me.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // 내 관심사대로 — 화면과 Ask Lumi가 같은 엔진(lib/foryou)을 쓴다
  const sc = useMemo(() => scoreClubs({ opportunities, opportunityIntents: intents, organizations: orgs, relationships, schools }, v.me, filtered), [opportunities, intents, orgs, relationships, schools, v.me, filtered]);
  const list = filtered.map((o) => ({ o, r: sc.get(o.id) })).sort((a, b) => (b.r?.score ?? -1) - (a.r?.score ?? -1) || Number(!!b.o.recruitment?.open) - Number(!!a.o.recruitment?.open)).map((x) => x.o);
  const clubWhy = useMemo(() => { const kept = limitRepeats(list.map((o) => sc.get(o.id)?.reasons ?? [])); return new Map(list.map((o, i) => [o.id, whyLine(kept[i], 1)])); }, [list, sc]);
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">{CLUB_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>{c.label}</Chip>)}</div>
      {list.length === 0 ? <EmptyState emoji="" title={t('아직 조직이 없어요')} /> : (
        <div className="divide-y divide-line">{list.map((o) => (
          <button key={o.id} onClick={() => nav(`/orgs/${o.id}`)} className="w-full flex items-center gap-3 py-3.5 text-left press">
            <Avatar emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={44} />
            <span className="flex-1 min-w-0"><span className="flex items-center gap-2"><span className="text-[15px] font-semibold text-primary truncate">{o.name}</span>{o.recruitment?.open && <span className="h-6 px-2.5 rounded-full bg-accent-soft text-primary text-[11px] font-semibold shrink-0">{t('모집 중')}</span>}</span><span className="block text-[13px] text-ink-3 truncate mt-0.5">{orgSubtitle(o)}</span>{chip !== 'mine' && clubWhy.get(o.id) ? <span className="block text-[12px] text-ink-3 truncate mt-0.5">✨ {clubWhy.get(o.id)}</span> : null}</span>
            <span className="h-9 w-9 rounded-full grid place-items-center text-primary">{o.recruitment?.open ? <Plus size={20} /> : <ArrowRight size={20} />}</span>
          </button>
        ))}</div>
      )}
    </div>
  );
}

/** 동아리 목록 한 줄 설명 — 학교 공식 목록에서 가져온 동아리는 우리 앱 회원이 0명이라 숫자 대신 종류·소개를 보여준다 */
function orgSubtitle(o: { type: keyof typeof ORG_TYPE_LABELS; parent?: string; description: string; memberIds: string[]; followerIds: string[] }) {
  const n = o.memberIds.length + o.followerIds.length;
  if (n > 0) return lang === 'en' ? `${n} on Lumi` : `Lumi에 ${n}명`;
  const desc = o.description.replace(/\s+/g, ' ').trim();
  return [ORG_TYPE_LABELS[o.type], o.parent, desc].filter(Boolean).join(' · ');
}
