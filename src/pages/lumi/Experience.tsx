import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  Compass,
  Users,
  Coffee,
  Bookmark,
  MessageCircle,
  Search,
  Settings,
} from 'lucide-react';
import { api } from '@core/api';
import { BRAND, SOCIAL_KEYS, SOCIAL_TABS, type SocialTab } from '@core/brand';
import {
  currentOpportunities,
  verifiedMemberships,
} from '@core/lib/content-truth';
import { friendsOf } from '@core/lib/relations';
import { TEXT_PROMPTS } from '@core/data/prompts';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui';
import type { Opportunity } from '@core/types';
const cls = 'border border-line rounded-2xl bg-surface p-4 mb-3';
const button =
  'inline-flex items-center justify-center min-h-10 rounded-full px-4 bg-primary text-white text-[13px] font-semibold';
function Section({
  title,
  to,
  children,
}: {
  title: string;
  to?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {to && (
          <Link className="text-link text-xs font-semibold" to={to}>
            See all ›
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="py-10 px-4 text-center">
      <MessageCircle size={30} className="text-link mx-auto mb-4" />
      <h2 className="font-bold text-lg mb-2">{title}</h2>
      <p className="text-sm text-ink-2 leading-6">{detail}</p>
    </div>
  );
}
function Pills({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={v === value}
          className={`rounded-full px-3 py-2 text-xs font-semibold border ${v === value ? 'bg-tint text-link border-link' : 'border-line text-ink-2'}`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
function useContent() {
  const v = useViewer();
  const orgs = useAppStore((st) => st.organizations);
  const items = useAppStore((st) => st.opportunities);
  const demo = v.me.id === 'u_me' || v.me.dataOrigin === 'demo';
  const school =
    v.me.affiliation.type === 'university'
      ? v.me.affiliation.schoolId
      : undefined;
  return {
    ...v,
    demo,
    orgs: orgs.filter(
      (o) =>
        (!o.schoolId || o.schoolId === school) &&
        (demo || o.verified || o.type === 'community'),
    ),
    items: currentOpportunities(items, demo).filter(
      (o) => !o.schoolId || o.schoolId === school,
    ),
  };
}
function Shell({ children }: { children: ReactNode }) {
  const v = useContent();
  return (
    <>
      <AppHeader search />
      <main className="px-4 pb-8">
        {v.demo && (
          <p className="text-[11px] text-ink-2 bg-tint rounded-xl p-2 mb-3">
            Demo · sample people and content, not real activity
          </p>
        )}
        {children}
      </main>
    </>
  );
}
function OpportunityCard({ item }: { item: Opportunity }) {
  const v = useViewer();
  const run = useAppStore((st) => st.run);
  const saved = useAppStore((st) =>
    st.opportunityIntents.some(
      (i) => i.opportunityId === item.id && i.userId === v.me.id && i.saved,
    ),
  );
  const [busy, setBusy] = useState(false);
  return (
    <article className={cls}>
      <div className="flex gap-3">
        <Link to={`/opportunities/${item.id}`} className="flex-1">
          <p className="text-link text-[10px] uppercase font-bold mb-2">
            {item.type.replaceAll('_', ' ')}
          </p>
          <h3 className="font-semibold text-sm">{item.title}</h3>
          <p className="text-xs text-ink-2 mt-1">
            {item.host} · {item.deadline || item.date || 'See source'}
          </p>
        </Link>
        <button
          aria-label={saved ? 'Unsave opportunity' : 'Save opportunity'}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await run(() => api.opportunities.toggleSave(item.id, v.me.id));
            } catch {
              /* toast */
            } finally {
              setBusy(false);
            }
          }}
        >
          <Bookmark size={19} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-xs text-link mt-3"
      >
        {item.sourceLabel || 'Original source'} ↗
      </a>
    </article>
  );
}
const entries = [
  {
    label: 'Events',
    Icon: CalendarDays,
    to: '/explore?category=Events',
    color: 'bg-[#F0EFFA]',
  },
  {
    label: 'Opportunities',
    Icon: Compass,
    to: '/explore?category=Opportunities',
    color: 'bg-[#FFF6E9]',
  },
  {
    label: 'Clubs & Groups',
    Icon: Users,
    to: '/explore?category=Clubs',
    color: 'bg-[#EDF5FC]',
  },
  {
    label: 'Meetups',
    Icon: Coffee,
    to: '/social?section=meetups',
    color: 'bg-[#FCF0F1]',
  },
];
export function LumiHome() {
  const v = useContent();
  return (
    <Shell>
      <h1 className="text-[26px] font-bold tracking-tight leading-8 mb-5">
        What's happening
        <br />
        on campus?
      </h1>
      <div className="grid grid-cols-2 gap-3">
        {entries.map(({ label, Icon, to, color }) => (
          <Link
            to={to}
            key={label}
            className={`${color} rounded-2xl border border-line p-4`}
          >
            <Icon size={24} className="text-link mb-3" />
            <span className="text-sm font-semibold">{label}</span>
          </Link>
        ))}
      </div>
      <Section title="Campus picks" to="/explore">
        {v.items.length ? (
          v.items
            .slice(0, 3)
            .map((o) => <OpportunityCard key={o.id} item={o} />)
        ) : (
          <div className={cls}>
            <h3 className="text-sm font-semibold">Your campus, at a glance</h3>
            <p className="text-sm text-ink-2 leading-6 mt-2">
              Verified events and opportunities will appear as campus sources
              are connected.
            </p>
          </div>
        )}
      </Section>
      <Section title="Your week" to="/schedule">
        <Link to="/schedule" className={`${cls} flex items-center gap-3`}>
          <BookOpen size={24} className="text-link" />
          <span className="text-sm flex-1">
            {v.me.timetable.length
              ? `${v.me.timetable.length} scheduled classes`
              : 'Make room for what matters.'}
          </span>
          <span className="text-link text-xs">Add Classes +</span>
        </Link>
      </Section>
      <Section title="My Communities" to="/explore?category=Clubs">
        {v.orgs
          .filter(
            (o) =>
              o.memberIds.includes(v.me.id) || o.followerIds.includes(v.me.id),
          )
          .map((o) => (
            <Link
              key={o.id}
              to={`/orgs/${o.id}`}
              className={`${cls} block text-sm`}
            >
              {o.name}
              <span className="text-xs text-ink-2 block mt-1">
                {o.memberIds.includes(v.me.id) ? 'Member' : 'Followed'}
              </span>
            </Link>
          ))}
        <Link className="text-sm text-link" to="/explore?category=Clubs">
          Find clubs and groups ›
        </Link>
      </Section>
      <Section title="Start something small">
        <div className="flex gap-2">
          <Link to="/meet/create" className={button}>
            Create Meetup
          </Link>
          <Link
            to="/create/post?type=question"
            className="text-sm p-3 text-link"
          >
            Ask a Question
          </Link>
        </div>
      </Section>
      <Section title="Campus life">
        <p className="text-sm text-ink-2">
          Recreation and dining: verified campus hours and menus are not
          connected yet.
        </p>
      </Section>
    </Shell>
  );
}
export function LumiExplore() {
  const v = useContent();
  const [p, setP] = useSearchParams();
  const category = p.get('category') || 'Events';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('Recommended');
  const [orgType, setOrgType] = useState('All');
  const q = query.toLowerCase();
  let items = v.items.filter(
    (o) =>
      (category !== 'Events' ||
        ['event', 'hackathon', 'activity'].includes(o.type)) &&
      `${o.title} ${o.host}`.toLowerCase().includes(q),
  );
  if (sort === 'Newest')
    items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === 'Ending soon')
    items = [...items].sort((a, b) =>
      (a.deadline || a.date || '9999').localeCompare(
        b.deadline || b.date || '9999',
      ),
    );
  const orgs = v.orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(q) &&
      (orgType === 'All' ||
        o.type ===
          (
            {
              'Student Clubs': 'club',
              'Greek Life': 'greek',
              'Research Labs': 'lab',
              Communities: 'community',
            } as Record<string, string>
          )[orgType]),
  );
  return (
    <Shell>
      <h1 className="text-[26px] font-bold mb-4">Explore</h1>
      <Pills
        values={['Events', 'Opportunities', 'Clubs']}
        value={category}
        onChange={(value) => setP({ category: value })}
      />
      <label className="flex items-center border border-line rounded-xl px-3 my-4">
        <Search size={17} />
        <input
          className="flex-1 p-3 bg-transparent text-sm min-w-0 outline-none"
          aria-label="Search campus content"
          placeholder={`Search ${category.toLowerCase()}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <Pills
        values={
          category === 'Clubs'
            ? [
                'All',
                'Student Clubs',
                'Greek Life',
                'Research Labs',
                'Communities',
              ]
            : ['Recommended', 'Newest', 'Ending soon']
        }
        value={category === 'Clubs' ? orgType : sort}
        onChange={category === 'Clubs' ? setOrgType : setSort}
      />
      <div className="mt-5">
        {category === 'Clubs'
          ? orgs.map((o) => (
              <Link key={o.id} to={`/orgs/${o.id}`} className={`${cls} block`}>
                <h2 className="text-sm font-semibold">{o.name}</h2>
                <p className="text-xs text-ink-2 mt-1">
                  {o.type} · View organization
                </p>
              </Link>
            ))
          : items.map((o) => <OpportunityCard key={o.id} item={o} />)}
        {(category === 'Clubs' ? orgs.length : items.length) === 0 && (
          <Empty
            title={
              query
                ? 'No matches yet'
                : `No verified ${category.toLowerCase()} yet`
            }
            detail="Try another category. Current listings will appear when verified campus sources are connected."
          />
        )}
      </div>
    </Shell>
  );
}
export function LumiSocial() {
  const v = useContent();
  const [p, setP] = useSearchParams();
  const section = p.get('section') as SocialTab;
  const tab = SOCIAL_KEYS.includes(section) ? section : 'for-you';
  const [q, setQ] = useState('');
  const [year, setYear] = useState('All');
  const [scope, setScope] = useState('All');
  const nav = useNavigate();
  const people = v.visibleUsers.filter(
    (u) =>
      u.nickname.toLowerCase().includes(q.toLowerCase()) &&
      (year === 'All' ||
        (year === 'Graduate' || year === 'Alumni'
          ? u.affiliation.type === 'university' &&
            u.affiliation.role === (year === 'Graduate' ? 'graduate' : 'alumni')
          : u.academicYear === Number(year[0]))),
  );
  const today = new Date().toISOString().slice(0, 10);
  const meets = v.visibleActivities.filter(
    (a) =>
      a.date >= today &&
      (scope !== 'My Groups' ||
        v.orgs.some(
          (o) => o.id === a.orgId && o.memberIds.includes(v.me.id),
        )) &&
      (scope !== 'My Classes' ||
        v.me.timetable.some((c) => c.name === a.courseName)),
  );
  const posts = v.visiblePosts.filter(
    (post) =>
      !post.sponsored &&
      (scope !== 'My School' ||
        (v.me.affiliation.type === 'university' &&
          (v.userById(post.authorId)?.affiliation as { schoolId?: string })
            ?.schoolId === v.me.affiliation.schoolId)),
  );
  return (
    <Shell>
      <h1 className="text-[26px] font-bold mb-3">Social</h1>
      <div
        role="tablist"
        className="grid grid-cols-4 border-b border-line mb-5"
      >
        {SOCIAL_KEYS.map((key, i) => (
          <button
            role="tab"
            aria-selected={tab === key}
            key={key}
            onClick={() => {
              setScope('All');
              setP({ section: key });
            }}
            className={`py-3 text-xs font-semibold ${tab === key ? 'border-b-2 border-primary text-primary' : 'text-ink-3'}`}
          >
            {SOCIAL_TABS[i]}
          </button>
        ))}
      </div>
      {tab === 'for-you' && (
        <>
          <h2 className="text-lg font-bold">
            A little company goes a long way.
          </h2>
          <p className="text-sm text-ink-2 my-3">
            Make a plan. Find your people.
          </p>
          <div className="flex gap-2">
            <Link to="/meet/create" className={button}>
              Start a Meetup
            </Link>
            <button
              onClick={() => setP({ section: 'people' })}
              className="px-4 text-sm text-link"
            >
              Find People
            </button>
          </div>
          <Section title="What would you like to do together?">
            <div className="flex flex-wrap gap-2">
              {[
                ['Coffee', 'coffee'],
                ['Study', 'study'],
                ['Workout', 'exercise'],
                ['Lunch', 'meal'],
                ['Hangout', 'etc'],
              ].map(([label, cat]) => (
                <Link
                  key={cat}
                  className="border border-line rounded-full px-3 py-2 text-xs"
                  to={`/meet/create?category=${cat}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </Section>
          <Section title="Your campus">
            <Link
              to="/create/post?type=question"
              className={`${cls} block text-sm`}
            >
              Ask a Question →
            </Link>
            <div className="flex gap-4 text-link text-sm">
              <Link to="/profile/groups">My Groups</Link>
              <Link to="/schedule">My Classes</Link>
            </div>
          </Section>
        </>
      )}
      {tab === 'meetups' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">Better together</h2>
            <Link to="/meet/create" className={button}>
              Create
            </Link>
          </div>
          <Pills
            values={['All', 'My Groups', 'My Classes']}
            value={scope}
            onChange={setScope}
          />
          <div className="mt-4">
            {meets.map((a) => (
              <Link
                key={a.id}
                to={`/activities/${a.id}`}
                className={`${cls} block`}
              >
                <h3 className="text-sm font-semibold">{a.title}</h3>
                <p className="text-xs text-ink-2 mt-1">
                  {a.date} · {a.startTime}
                </p>
              </Link>
            ))}
            {!meets.length && (
              <Empty
                title="Make the first plan"
                detail="Coffee, a study session, a little time together."
              />
            )}
          </div>
          <Link to="/meet/tables" className="text-sm text-link">
            Small Tables ›
          </Link>
        </>
      )}
      {tab === 'people' && (
        <>
          <input
            aria-label="Search people"
            placeholder="Search people"
            className="w-full rounded-xl border border-line p-3 mb-3 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Pills
            values={['All', '1st', '2nd', '3rd', '4th+', 'Graduate', 'Alumni']}
            value={year}
            onChange={setYear}
          />
          <div className="flex gap-4 my-4 text-xs text-link">
            <Link to="/ai">Ask AI</Link>
            <Link to="/people/ask">Ask Network</Link>
            <Link to="/people/advanced">More filters</Link>
          </div>
          {people.map((u) => (
            <Link
              to={`/users/${u.id}`}
              key={u.id}
              className={`${cls} flex gap-3 items-center`}
            >
              <Avatar {...u.avatar} size={42} />
              <span className="text-sm font-semibold">{u.nickname}</span>
            </Link>
          ))}
          {!people.length && (
            <Empty
              title="Good company starts somewhere"
              detail="Invite a friend or explore your classes and communities."
            />
          )}
          <div className="flex gap-4 text-sm text-link">
            <Link to="/schedule">My Classes</Link>
            <Link to="/explore?category=Clubs">My Communities</Link>
          </div>
        </>
      )}
      {tab === 'feed' && (
        <>
          <Pills
            values={['All', 'My School']}
            value={scope}
            onChange={setScope}
          />
          <div className="mt-4">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => nav(`/feed/${post.id}`)}
                className={`${cls} text-left w-full`}
              >
                <h3 className="font-semibold text-sm">
                  {post.anonymous
                    ? 'Anonymous'
                    : v.userById(post.authorId)?.nickname || 'Campus'}
                </h3>
                <p className="text-sm mt-3 leading-6">{post.text}</p>
              </button>
            ))}
            {!posts.length && (
              <Empty
                title="Be the first to share"
                detail="A question, an update, or something you're working on."
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/create/post" className={button}>
              Share Something
            </Link>
            <Link
              to="/create/post?type=question"
              className="text-sm text-link p-3"
            >
              Ask a Question
            </Link>
            <Link
              to="/meet/create?category=study"
              className="text-sm text-link p-3"
            >
              Find Study Buddies
            </Link>
          </div>
        </>
      )}
    </Shell>
  );
}
export function LumiProfile() {
  const v = useContent();
  const orgs = verifiedMemberships(v.orgs, v.me.id);
  const [section, setSection] = useState('Upcoming');
  const today = new Date().toISOString().slice(0, 10);
  const acts = v.visibleActivities.filter(
    (a) =>
      (a.hostId === v.me.id ||
        v.myParticipation(a.id)?.status === 'approved') &&
      (section === 'Created'
        ? a.hostId === v.me.id
        : section === 'Past'
          ? a.date < today
          : a.date >= today),
  );
  return (
    <Shell>
      <div className="flex gap-4 items-center mt-4">
        <Avatar {...v.me.avatar} size={72} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{v.me.nickname}</h1>
          <p className="text-sm text-ink-2 mt-1">
            {v.me.affiliation.type === 'university'
              ? v.me.affiliation.schoolName
              : ''}
          </p>
          <p className="text-xs text-ink-2 mt-1">
            {v.me.affiliation.type === 'university'
              ? v.me.affiliation.role
              : ''}
          </p>
        </div>
        <Link to="/settings" aria-label="Settings">
          <Settings size={20} />
        </Link>
      </div>
      <p className="text-sm text-ink-2 mt-4">{v.me.bio}</p>
      <div className="flex gap-3 my-4">
        <Link to="/profile/edit" className={button}>
          Edit Profile
        </Link>
        <button
          className="text-sm text-link"
          onClick={() =>
            navigator
              .share?.({
                title: BRAND.name,
                text: `${v.me.nickname} on ${BRAND.name}`,
              })
              .catch(() => {})
          }
        >
          Share Profile
        </button>
      </div>
      <div className="flex gap-6 text-sm">
        <Link to="/profile/groups">{orgs.length} Groups</Link>
        <Link to="/profile/friends">
          {friendsOf(v.snap, v.me.id).length} Friends
        </Link>
      </div>
      <Section title="Get to know me" to="/profile/prompts">
        {v.me.prompts.slice(0, 3).map((p) => (
          <div key={p.questionId} className={cls}>
            <p className="text-xs text-ink-2">
              {TEXT_PROMPTS.find((q) => q.id === p.questionId)?.text ||
                'A little about me'}
            </p>
            <p className="text-sm font-semibold mt-2">{p.answer}</p>
          </div>
        ))}
        {!v.me.prompts.length && (
          <Link className="text-sm text-link" to="/profile/prompts">
            Add an optional prompt answer +
          </Link>
        )}
      </Section>
      <Section title="My Communities" to="/profile/groups">
        {v.orgs
          .filter(
            (o) =>
              o.memberIds.includes(v.me.id) || o.followerIds.includes(v.me.id),
          )
          .map((o) => (
            <Link
              key={o.id}
              to={`/orgs/${o.id}`}
              className={`${cls} block text-sm`}
            >
              {o.name}
              <span className="block text-xs text-ink-2 mt-1">
                {o.memberIds.includes(v.me.id) ? 'Member' : 'Followed'}
              </span>
            </Link>
          ))}
        <p className="text-xs text-ink-2">
          Followed and Member are separate. Membership display starts private.
        </p>
      </Section>
      <Section title="My Events & Meetups">
        <Pills
          values={['Upcoming', 'Past', 'Created']}
          value={section}
          onChange={setSection}
        />
        <div className="mt-3">
          {acts.map((a) => (
            <Link
              key={a.id}
              to={`/activities/${a.id}`}
              className={`${cls} block text-sm`}
            >
              {a.title} · {a.date}
            </Link>
          ))}
          {!acts.length && (
            <p className="text-sm text-ink-2">Your plans will appear here.</p>
          )}
        </div>
      </Section>
      <Section title="Saved" to="/saved-content">
        <p className="text-sm text-ink-2">
          Your bookmarked opportunities and events.
        </p>
      </Section>
      <Section title="My Posts">
        {v.visiblePosts
          .filter((p) => p.authorId === v.me.id)
          .map((p) => (
            <Link
              key={p.id}
              to={`/feed/${p.id}`}
              className={`${cls} block text-sm`}
            >
              {p.text}
            </Link>
          ))}
      </Section>
      <Link to="/profile/discovery" className="block text-sm text-link mt-6">
        Discovery & privacy ›
      </Link>
      <Link to="/settings/privacy" className="block text-sm text-link mt-6">
        Privacy & Safety ›
      </Link>
    </Shell>
  );
}
export function LumiSaved() {
  const v = useContent();
  const intents = useAppStore((st) => st.opportunityIntents);
  const items = v.items.filter((o) =>
    intents.some(
      (i) => i.userId === v.me.id && i.opportunityId === o.id && i.saved,
    ),
  );
  return (
    <Shell>
      <h1 className="text-2xl font-bold mb-4">Saved</h1>
      {items.map((o) => (
        <OpportunityCard key={o.id} item={o} />
      ))}
      {!items.length && (
        <Empty
          title="Keep something for later"
          detail="Your saved current opportunities and events will appear here."
        />
      )}
    </Shell>
  );
}

export function LumiPrivacy() {
  const v = useViewer();
  const run = useAppStore((st) => st.run);
  const [classmateOptIn, setClassmates] = useState(
    v.me.classmateOptIn === true,
  );
  const [visibility, setVisibility] = useState(
    v.me.membershipVisibility || 'private',
  );
  const [languages, setLanguages] = useState(
    v.me.spokenLanguages?.join(', ') || '',
  );
  const [origin, setOrigin] = useState(v.me.countryOfOrigin || '');
  const [busy, setBusy] = useState(false);
  return (
    <Shell>
      <h1 className="text-2xl font-bold mb-5">Discovery & privacy</h1>
      <label className="flex gap-3 text-sm mb-5">
        <input
          type="checkbox"
          checked={classmateOptIn}
          onChange={(e) => setClassmates(e.target.checked)}
        />
        Allow classmate discovery (timetable visibility still applies)
      </label>
      <p className="text-sm mb-3">Membership display</p>
      <Pills
        values={['private', 'friends', 'school', 'public']}
        value={visibility}
        onChange={(value) => setVisibility(value as typeof visibility)}
      />
      <label className="block text-sm mt-5">
        Spoken languages (optional)
        <input
          className="w-full border border-line rounded-xl p-3 mt-2"
          value={languages}
          onChange={(e) => setLanguages(e.target.value)}
        />
      </label>
      <label className="block text-sm mt-5">
        Country of origin (optional, separate from language)
        <input
          className="w-full border border-line rounded-xl p-3 mt-2"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
      </label>
      <p className="text-xs text-ink-2 my-5">
        Language and origin are never inferred. Memberships start private.
      </p>
      <button
        className={button}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await run(
              () =>
                api.users.update(v.me.id, {
                  classmateOptIn,
                  membershipVisibility: visibility,
                  spokenLanguages: languages
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                  countryOfOrigin: origin.trim() || undefined,
                }),
              'Privacy saved',
            );
          } catch {
            /* toast */
          } finally {
            setBusy(false);
          }
        }}
      >
        Save privacy
      </button>
    </Shell>
  );
}
