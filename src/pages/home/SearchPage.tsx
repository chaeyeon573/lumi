import { useState } from 'react';
import { t } from '@core/i18n';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Input, Segmented, EmptyState } from '@/components/ui';
import { PersonCard } from '@/components/cards/PersonCard';
import { ActivityCard } from '@/components/cards/ActivityCard';
import { OrgCard } from '@/components/cards/OrgCard';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { INTEREST_LABELS } from '@core/lib/labels';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'activities') as 'activities' | 'people' | 'orgs';
  const [q, setQ] = useState('');
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const norm = q.trim().toLowerCase();
  const acts = v.visibleActivities.filter((a) => !norm || a.title.toLowerCase().includes(norm) || a.description.toLowerCase().includes(norm) || a.place.name.toLowerCase().includes(norm));
  const people = v.visibleUsers.filter((u) => !norm || u.nickname.includes(norm) || (u.affiliation.type === 'university' && !!u.affiliation.department?.includes(norm)) || !!u.interests?.some((i) => INTEREST_LABELS[i].includes(norm)));
  const orgList = orgs.filter((o) => !norm || o.name.toLowerCase().includes(norm) || o.description.includes(norm));
  return (
    <div className="min-h-full">
      <TopBar back title={t('검색')} messages />
      <div className="px-4 pt-2 space-y-3">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input autoFocus className="pl-9" placeholder={t('사람, 활동, 동아리 검색')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Segmented value={tab} onChange={(t) => setParams({ tab: t })} options={[{ value: 'activities', label: `${t('활동 ')}${acts.length}` }, { value: 'people', label: `${t('사람 ')}${people.length}` }, { value: 'orgs', label: `${t('조직 ')}${orgList.length}` }]} />
      </div>
      <div className="px-4 py-4 space-y-3">
        {tab === 'activities' && (acts.length ? acts.map((a) => <ActivityCard key={a.id} activity={a} variant="row" />) : <EmptyState emoji="🗓️" title={t('검색 결과가 없어요')} description={t('다른 키워드로 찾아보세요.')} />)}
        {tab === 'people' && (people.length ? people.map((u) => <PersonCard key={u.id} user={u} />) : <EmptyState emoji="🙋" title={t('검색 결과가 없어요')} />)}
        {tab === 'orgs' && (orgList.length ? orgList.map((o) => <OrgCard key={o.id} org={o} />) : <EmptyState emoji="🏛️" title={t('검색 결과가 없어요')} />)}
      </div>
    </div>
  );
}
