import { useMemo, useState, type ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Activity, Opportunity, Organization } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { formatDate, formatTime } from '@core/lib/format';
import { canGoTogether, socialSummary } from '@core/lib/withpeople';
import { Btn, FilterBar, ListingCard, MeetupCard, SearchField, cardCls, type Tone } from '@/components/ha';
import { cn } from '@core/lib/cn';
import { SampleTag } from '@/components/ui';
import { Faces, usePeopleSnap } from '@/components/together/PeopleLine';
import { GoTogetherSheet } from '@/components/together/GoTogetherSheet';
import { badgeLabel, badgeTone, listingMeta, listingWhere } from './exploreData';

const en = lang === 'en';

/**
 * search + one filter row under it — [Filters (n)] and the applied filters as × chips, the sort quietly on the right;
 * everything else is in the filter sheet (owner 2026-11-06: three chip rows were too much). PDF S017–S019, S089.
 */
export function ExploreControls({ placeholder, q, onQ, filters }: {
  placeholder: string; q: string; onQ: (q: string) => void; filters: ComponentProps<typeof FilterBar>;
}) {
  return (
    <div className="space-y-3 mb-4">
      <SearchField placeholder={placeholder} value={q} onChange={onQ} />
      <FilterBar {...filters} />
    </div>
  );
}

/** one listing: the PDF card, then — only when someone is actually there — who's going + one button */
export function ListingItem({ o, saved, onSave, onOpen, people = true }: { o: Opportunity; saved?: boolean; onSave?: () => void; onOpen: () => void; people?: boolean }) {
  return (
    <div>
      <ListingCard cover={o.cover?.url ? o.cover : undefined} badge={badgeLabel(o)} badgeTone={badgeTone(o)} title={o.title} line={o.description} meta={listingMeta(o)} where={listingWhere(o) || undefined}
        sourceUrl={o.sourceUrl || undefined} saved={saved} onSave={onSave} onClick={onOpen} />
      {people && <ListingPeople o={o} />}
    </div>
  );
}

/**
 * "Lily, Maya +1 going   [Go together]" under a card — real participants only, hidden when nobody is there
 * (PRODUCT_TASTE: no "Be the first" on every row). Same data as PeopleLine (lib/withpeople), in Harness A parts.
 */
export function ListingPeople({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  const { snap, me } = usePeopleSnap();
  const [sheet, setSheet] = useState(false);
  const s = useMemo(() => (me ? socialSummary(snap, me, o) : null), [snap, me, o]);
  if (!s || !me || s.first) return null;
  const go = s.kind === 'go' && canGoTogether(o);
  return (
    <div className="flex items-center gap-2.5 px-3 pt-2 min-w-0">
      <Faces people={s.faces} />
      <span className="flex-1 min-w-0 text-[12.5px] leading-snug text-ink-2 line-clamp-2">{s.sample && <SampleTag />}{s.text}</span>
      <Btn size="sm" variant="outline" className="h-8 px-3 text-[12px]" onClick={() => (go ? setSheet(true) : nav(`/opportunities/${o.id}?with=1`))}>
        {s.kind === 'go' && !go ? (en ? 'See who’s going' : '누가 가는지') : s.cta}
      </Btn>
      {go && <GoTogetherSheet o={o} open={sheet} onClose={() => setSheet(false)} />}
    </div>
  );
}

/** club tint by kind — clubs mint (CATEGORY_TONE), Greek rose, labs lavender, co-ops peach */
export const CLUB_TONE: Record<Organization['type'], Tone> = { club: 'mint', council: 'mint', greek: 'rose', lab: 'lav', coop: 'peach', department: 'ice' };

/**
 * a club row (owner 2026-11-06): a real logo only when there is one — otherwise text only: name, one line of what they do,
 * then kind · my relation. No icon block, no initials square
 */
export function ClubItem({ o, sub, onClick }: { o: Organization; sub: string; onClick: () => void }) {
  const line = o.description?.replace(/\s+/g, ' ').trim();
  return (
    <button onClick={onClick} className={cn(cardCls, 'w-full p-4 flex items-center gap-3.5 text-left press')}>
      {o.logo.url && <img src={/^(https?:|data:|\/)/.test(o.logo.url) ? o.logo.url : `/${o.logo.url}`} alt="" className="size-12 rounded-[14px] object-cover border border-line shrink-0" />}
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-bold leading-snug truncate">{o.name}</span>
        {line && <span className="block text-[13px] text-ink-2 leading-snug mt-0.5 truncate">{line}</span>}
        <span className="block text-[12.5px] text-ink-3 mt-0.5 truncate">{sub}</span>
      </span>
      <ChevronRight size={18} className="text-ink-3 shrink-0" />
    </button>
  );
}

export function MoreButton({ left, onClick }: { left: number; onClick: () => void }) {
  if (left <= 0) return null;
  return <Btn full variant="outline" className="mt-3" onClick={onClick}>{en ? `Show more (${left})` : `더 보기 (${left})`}</Btn>;
}

/**
 * A club's own event posted on Lumi (activities kind org_event) — PDF S024 MeetupCard: org badge, place · time,
 * the people actually going (host + approved), "View event".
 */
export function ClubEventItem({ a }: { a: Activity }) {
  const nav = useNavigate();
  const users = useAppStore((s) => s.users);
  const parts = useAppStore((s) => s.participations);
  const orgs = useAppStore((s) => s.organizations);
  const org = orgs.find((o) => o.id === a.orgId);
  const byId = (id: string) => users.find((u) => u.id === id);
  const people = [byId(a.hostId), ...parts.filter((p) => p.activityId === a.id && p.status === 'approved').map((p) => byId(p.userId))].filter((u): u is NonNullable<typeof u> => !!u);
  const time = a.startTime && a.startTime !== '00:00' ? formatTime(a.startTime) : '';
  return (
    <MeetupCard tone="ice" icon={<CalendarDays size={22} />} badge={org?.name ?? (en ? 'Club event' : '동아리 행사')} title={a.title}
      meta={[formatDate(a.date), time, a.place?.name].filter(Boolean).join(' · ')}
      people={people} footnote={people.length ? `${people.length} ${en ? 'going' : '명 참여'}` : undefined} action={en ? 'View event' : '행사 보기'} onClick={() => nav(`/activities/${a.id}`)} />
  );
}
