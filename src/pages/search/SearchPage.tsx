import { useState } from 'react';
import { t, lang } from '@core/i18n';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Input, Chip, EmptyState } from '@/components/ui';
import { PersonCard } from '@/components/cards/PersonCard';
import { ActivityCard } from '@/components/cards/ActivityCard';
import { OrgCard } from '@/components/cards/OrgCard';
import { OpportunityCard } from '@/components/cards/OpportunityCard';
import { PostRow } from '@/components/feed_PostRow';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { INTEREST_LABELS, ORG_TYPE_LABELS, topicLabel } from '@core/lib/labels';

type Tab = 'people' | 'groups' | 'events' | 'posts' | 'opportunities';

/** /search — 사람 | 그룹 | 이벤트 | 글 | 기회 (?tab=&q=) */
export function SearchPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'people') as Tab;
  const [q, setQ] = useState(params.get('q') ?? '');
  const sync = (next: { tab?: Tab; q?: string }) => {
    const tb = next.tab ?? tab; const qq = (next.q ?? q).trim();
    const p: Record<string, string> = {};
    if (tb !== 'people') p.tab = tb;
    if (qq) p.q = qq;
    setParams(p, { replace: true });
  };
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const opps = useAppStore((s) => s.opportunities);
  const norm = q.trim().toLowerCase();
  const has = (...xs: (string | undefined)[]) => !norm || xs.some((x) => (x ?? '').toLowerCase().includes(norm));

  const people = v.visibleUsers.filter((u) => has(u.nickname, u.bio, u.affiliation.type === 'university' ? u.affiliation.department : u.affiliation.companyName, ...u.interests.map((i) => INTEREST_LABELS[i])));
  const groups = orgs.filter((o) => has(o.name, o.description, ORG_TYPE_LABELS[o.type]));
  const events = v.visibleActivities.filter((a) => a.category !== 'store_deal' && has(a.title, a.description, a.place.name));
  const posts = v.visiblePosts.filter((p) => !p.sponsored && p.showOnFeed !== false && has(p.text, p.courseTag, ...p.tags, ...(p.topics ?? []).map(topicLabel))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const oppList = opps.filter((o) => has(o.title, o.host, o.description, ...o.tags));

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: 'people', label: t('사람'), n: people.length }, { key: 'groups', label: t('그룹'), n: groups.length }, { key: 'events', label: t('이벤트'), n: events.length },
    { key: 'posts', label: t('게시글'), n: posts.length }, { key: 'opportunities', label: lang === 'en' ? 'Opportunities' : '기회', n: oppList.length },
  ];

  return (
    <div className="min-h-full bg-bg">
      <TopBar back title={t('검색')} messages />
      <div className="px-4 pt-2 space-y-3">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input autoFocus className="pl-9" placeholder={t('사람, 그룹, 이벤트, 글 검색')} value={q} onChange={(e) => { setQ(e.target.value); sync({ q: e.target.value }); }} /></div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">{tabs.map((x) => <Chip key={x.key} active={tab === x.key} onClick={() => sync({ tab: x.key })}>{x.label} {x.n}</Chip>)}</div>
      </div>
      <div className="px-4 py-4 space-y-3">
        {tab === 'people' && (people.length ? people.map((u) => <PersonCard key={u.id} user={u} />) : <EmptyState emoji="🙋" title={t('검색 결과가 없어요')} description={t('다른 키워드로 찾아보세요.')} />)}
        {tab === 'groups' && (groups.length ? groups.map((o) => <OrgCard key={o.id} org={o} />) : <EmptyState emoji="🏛️" title={t('검색 결과가 없어요')} />)}
        {tab === 'events' && (events.length ? events.map((a) => <ActivityCard key={a.id} activity={a} variant="row" />) : <EmptyState emoji="🗓️" title={t('검색 결과가 없어요')} />)}
        {tab === 'posts' && (posts.length ? <div className="divide-y divide-line -my-3">{posts.map((p) => <PostRow key={p.id} post={p} onClick={() => nav(`/feed/${p.id}`)} />)}</div> : <EmptyState emoji="💬" title={t('검색 결과가 없어요')} />)}
        {tab === 'opportunities' && (oppList.length ? oppList.map((o) => <OpportunityCard key={o.id} o={o} variant="row" />) : <EmptyState emoji="✨" title={t('검색 결과가 없어요')} />)}
      </div>
    </div>
  );
}
