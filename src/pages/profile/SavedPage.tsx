import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, Users } from 'lucide-react';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { ORG_TYPE_LABELS, OPP_TYPE_LABELS } from '@core/lib/labels';
import { formatDate, todayISO } from '@core/lib/format';
import type { Opportunity } from '@core/types';
import { CATEGORY_TONE, EmptyState, ListingCard, RowCard, SegTabs } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { SubScreen, en } from './shared';

type Tab = 'opportunities' | 'events' | 'clubs';

/** 지난 것은 보여 주지 않는다 (PRODUCT_TASTE: 마감된 것은 넣지 않는다) */
const open = (o: Opportunity, today: string) => (o.deadline ?? o.date ?? '9999-12-31') >= today;
const due = (o: Opportunity) => o.deadline ?? o.date ?? '9999';

/**
 * Saved (PDF S076) + 빈 상태 (S096) — SegTabs Opportunities · Events · Clubs (주소 ?tab=).
 * 책갈피한 공고·행사(opportunityIntents.saved — 본인만 보는 값)와 팔로우한 동아리. 책갈피를 다시 누르면 빠진다.
 */
export function SavedPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const intents = useAppStore((s) => s.opportunityIntents);
  const opportunities = useAppStore((s) => s.opportunities);
  const orgs = useAppStore((s) => s.organizations);
  const [params, setParams] = useSearchParams();
  const tab = (['opportunities', 'events', 'clubs'].includes(params.get('tab') ?? '') ? params.get('tab') : 'opportunities') as Tab;
  const me = v.me.id;
  const today = todayISO();
  const savedIds = new Set(intents.filter((i) => i.userId === me && i.saved).map((i) => i.opportunityId));
  const saved = opportunities.filter((o) => savedIds.has(o.id) && open(o, today)).sort((a, b) => due(a).localeCompare(due(b)));
  const listings = saved.filter((o) => (tab === 'events' ? o.type === 'event' : o.type !== 'event'));
  const clubs = orgs.filter((o) => o.followerIds.includes(me));
  const count = tab === 'clubs' ? clubs.length : listings.length;
  const explore = tab === 'clubs' ? '/explore/clubs' : tab === 'events' ? '/explore/events' : '/explore/opportunities';

  return (
    <SubScreen title={en ? 'Saved' : '저장'}>
      <SegTabs className="-mx-4 px-2 mb-4" value={tab} onChange={(k) => setParams({ tab: k }, { replace: true })}
        tabs={[{ key: 'opportunities', label: en ? 'Opportunities' : '기회' }, { key: 'events', label: en ? 'Events' : '행사' }, { key: 'clubs', label: en ? 'Clubs' : '동아리' }]} />
      {count === 0 && (
        <EmptyState icon={<Bookmark size={28} />} tone="sel" title={en ? 'Keep something for later' : '나중을 위해 담아 두세요'}
          sub={tab === 'clubs' ? (en ? 'Follow a club and it shows up here.' : '동아리를 팔로우하면 여기에 보여요.') : (en ? 'Bookmark a little inspiration for your next step.' : '다음 걸음을 위한 것을 책갈피해 두세요.')}
          action={{ label: en ? 'Explore' : '둘러보기', onClick: () => nav(explore) }} />
      )}
      <div className="space-y-3">
        {tab !== 'clubs' && listings.map((o) => (
          <ListingCard key={o.id} cover={o.cover.url ? o.cover : undefined} badge={OPP_TYPE_LABELS[o.type]} badgeTone={o.type === 'event' ? CATEGORY_TONE.events : CATEGORY_TONE.opportunities}
            title={o.title} meta={[o.deadline ? `${en ? 'Due' : '마감'} ${formatDate(o.deadline)}` : o.date ? formatDate(o.date) : '', o.host].filter(Boolean).join(' · ')}
            sourceUrl={o.sourceUrl || undefined} saved onSave={() => run(() => api.opportunities.toggleSave(o.id, me), en ? 'Removed from Saved' : '저장에서 뺐어요')}
            onClick={() => nav(`/opportunities/${o.id}`)} />
        ))}
        {tab === 'clubs' && clubs.map((o) => (
          <RowCard key={o.id} tone="rose" icon={<Users size={21} />} title={o.name} sub={[en ? 'Followed' : '팔로우', ORG_TYPE_LABELS[o.type]].join(' · ')} onClick={() => nav(`/orgs/${o.id}`)} />
        ))}
      </div>
    </SubScreen>
  );
}
