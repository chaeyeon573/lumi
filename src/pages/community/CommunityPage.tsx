import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowRight, PenSquare, Heart, MessageCircle } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Chip, Button, CardSkeleton, EmptyState, ErrorState, Avatar, Cover } from '@/components/ui';
import { PostCard } from '@/components/cards/PostCard';
import { SponsoredRow } from '@/components/cards/SponsoredRow';
import { injectSponsored } from '@core/lib/monetization';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { opportunityScore, daysUntil, isTogetherType, dday } from '@core/lib/recommend';
import { ALL_POST_TYPES, POST_TYPE_LABELS, OPP_TYPE_LABELS } from '@core/lib/labels';
import { relativeTime } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { OpportunityType, OrganizationType, PostType, Post } from '@core/types';

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
  const organic = v.visiblePosts.filter((p) => p.showOnFeed !== false && !p.sponsored)
    .filter((p) => type === 'all' ? true : type === 'anon' ? p.anonymous : p.postType === type && !p.anonymous)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ads = useAppStore((s) => s.posts).filter((p) => p.sponsored);
  // 전체 탭에서만 4개마다 스폰서 글 하나 (Plus 사용자는 광고 없음)
  const posts = type === 'all' ? injectSponsored(organic, ads, v.me) : organic;
  const row = (p: Post) => {
    if (p.sponsored) return <SponsoredRow key={p.id} post={p} expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)} />;
    const author = v.userById(p.authorId); const org = p.orgId ? v.orgById(p.orgId) : undefined;
    const av = p.anonymous ? { emoji: '', hue: 210 } : org ? org.logo : author?.avatar ?? { emoji: '', hue: 200 };
    const name = p.anonymous ? t('익명') : org?.name ?? author?.nickname ?? '';
    if (open === p.id) return <div key={p.id} onClick={() => setOpen(null)}><PostCard post={p} /></div>;
    return (
      <button key={p.id} onClick={() => setOpen(p.id)} className="w-full flex items-center gap-3 py-3 text-left press">
        {p.anonymous ? <span className="h-11 w-11 rounded-full bg-primary-soft grid place-items-center text-primary text-[13px] font-bold">?</span> : <Avatar emoji={av.emoji} hue={av.hue} url={av.url} size={44} />}
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2"><span className="text-[15px] font-semibold text-ink truncate">{name}</span>{p.postType && p.postType !== 'story' && <span className="h-6 px-2.5 rounded-full bg-accent-soft text-primary text-[11px] font-semibold shrink-0">{POST_TYPE_LABELS[p.postType]}</span>}<span className="text-[12px] text-ink-3 ml-auto shrink-0">{relativeTime(p.createdAt)}</span></span>
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
      {v.me.plan !== 'plus' && <a href="mailto:ads@aroundu.app" className="block text-center py-4 text-[11px] text-ink-3">{t('여기에 광고하기')} · ads@aroundu.app</a>}
    </div>
  );
}

type Sub = 'foryou' | 'saved' | OpportunityType;
function OpportunitiesTab() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const sub = (params.get('sub') ?? 'foryou') as Sub;
  const setSub = (s: Sub) => setParams(s === 'foryou' ? { tab: 'opportunities' } : { tab: 'opportunities', sub: s }, { replace: true });
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const v = useViewer();
  const me = v.me;
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const scored = useMemo(() => opps.filter((o) => !isTogetherType(o.type) || (o.type === 'hackathon' && !o.rolesNeeded)).filter((o) => !o.schoolId || o.schoolId === mySchool).filter((o) => !o.deadline || daysUntil(o.deadline) >= 0).map((o) => ({ o, ...opportunityScore(me, o, intents) })), [opps, intents, me, mySchool]);
  const list = sub === 'foryou' ? [...scored].sort((a, b) => b.score - a.score) : sub === 'saved' ? scored.filter((x) => intents.some((i) => i.opportunityId === x.o.id && i.userId === me.id && (i.saved || i.intent !== 'interested'))) : scored.filter((x) => x.o.type === sub);
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">
        <Chip active={sub === 'foryou'} onClick={() => setSub('foryou')}>{t('전체')}</Chip>
        {(['scholarship', 'internship', 'lab', 'hackathon', 'exchange'] as OpportunityType[]).map((ty) => <Chip key={ty} active={sub === ty} onClick={() => setSub(ty)}>{OPP_TYPE_LABELS[ty]}</Chip>)}
        <Chip active={sub === 'saved'} onClick={() => setSub('saved')}>{t('저장')}</Chip>
      </div>
      {list.length === 0 ? <EmptyState emoji="" title={t('아직 등록된 기회가 없어요')} /> : (
        <div className="divide-y divide-line">{list.map(({ o }) => (
          <button key={o.id} onClick={() => nav(`/opportunities/${o.id}`)} className="w-full flex items-center gap-3 py-3.5 text-left press">
            <span className="h-11 w-11 rounded-full bg-primary-soft text-primary grid place-items-center text-[12px] font-bold shrink-0">{OPP_TYPE_LABELS[o.type].slice(0, 2)}</span>
            <span className="flex-1 min-w-0"><span className="flex items-center gap-2"><span className="text-[15px] font-semibold text-ink truncate">{o.title}</span><span className="h-6 px-2.5 rounded-full bg-accent-soft text-primary text-[11px] font-semibold shrink-0">{OPP_TYPE_LABELS[o.type]}</span></span><span className="block text-[13px] text-ink-3 truncate mt-0.5">{o.host}{o.deadline ? ` · ${dday(o.deadline)}` : ''}</span></span>
            <ArrowRight size={20} className="text-primary shrink-0" />
          </button>
        ))}</div>
      )}
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
  const list = orgs.filter((o) => chip === 'mine' ? mine(o) : (o.schoolId === mySchool || mine(o)) && (chip === 'all' || o.type === chip)).sort((a, b) => Number(!!b.recruitment?.open) - Number(!!a.recruitment?.open));
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">{CLUB_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>{c.label}</Chip>)}</div>
      {list.length === 0 ? <EmptyState emoji="" title={t('아직 조직이 없어요')} /> : (
        <div className="divide-y divide-line">{list.map((o) => (
          <button key={o.id} onClick={() => nav(`/orgs/${o.id}`)} className="w-full flex items-center gap-3 py-3.5 text-left press">
            <Avatar emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={44} />
            <span className="flex-1 min-w-0"><span className="flex items-center gap-2"><span className="text-[15px] font-semibold text-ink truncate">{o.name}</span>{o.recruitment?.open && <span className="h-6 px-2.5 rounded-full bg-accent-soft text-primary text-[11px] font-semibold shrink-0">{t('모집 중')}</span>}</span><span className="block text-[13px] text-ink-3 truncate mt-0.5">{o.memberIds.length + o.followerIds.length}{lang === 'en' ? ' members' : '명'}</span></span>
            <span className="h-9 w-9 rounded-full grid place-items-center text-primary">{o.recruitment?.open ? <Plus size={20} /> : <ArrowRight size={20} />}</span>
          </button>
        ))}</div>
      )}
    </div>
  );
}
