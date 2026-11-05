import { useState, type ReactNode } from 'react';
import {
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  CalendarDays,
  Compass,
  Users,
  Coffee,
  ArrowUpRight,
  Bookmark,
  Search,
  MessageCircle,
  Plus,
  Settings,
  ChevronRight,
  Utensils,
  Dumbbell,
} from 'lucide-react-native';
import { BRAND, SOCIAL_KEYS, SOCIAL_TABS, type SocialTab } from '@core/brand';
import { api, apiMode } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import {
  currentOpportunities,
  verifiedMemberships,
} from '@core/lib/content-truth';
import { friendsOf } from '@core/lib/relations';
import { TEXT_PROMPTS } from '@core/data/prompts';
import type { Activity, Opportunity, Organization } from '@core/types';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Avatar, AppHeader, Button, TabScreen, C } from '@/ui';
import { WeekGrid } from '@/components/WeekGrid';
import { PostRow } from '@/v2/PostRow';

export const s = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.7,
    color: C.ink,
    marginTop: 14,
    marginBottom: 8,
  },
  sub: { fontSize: 13, lineHeight: 20, color: C.ink2 },
  section: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: { fontSize: 17, fontWeight: '700', color: C.ink },
  card: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    backgroundColor: C.surface,
  },
  label: { color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  link: { color: C.link, fontSize: 12, fontWeight: '600' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minHeight: 36,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.line,
  },
  selected: { backgroundColor: C.tint, borderColor: C.link },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: C.ink,
    backgroundColor: C.surface2,
    fontSize: 14,
    marginVertical: 10,
  },
  empty: {
    paddingVertical: 30,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 10,
  },
});
export function Section({
  title,
  to,
  children,
}: {
  title: string;
  to?: string;
  children: ReactNode;
}) {
  return (
    <View>
      <View style={s.section}>
        <Text style={s.heading}>{title}</Text>
        {to && (
          <Pressable accessibilityRole="link" onPress={() => nav(to)}>
            <Text style={s.link}>See all ›</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}
export function Pills({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.wrap}>
      {values.map((v) => (
        <Pressable
          key={v}
          accessibilityRole="tab"
          accessibilityState={{ selected: v === value }}
          onPress={() => onChange(v)}
          style={[s.pill, v === value && s.selected]}
        >
          <Text
            style={[
              s.label,
              { fontSize: 12, color: v === value ? C.link : C.ink2 },
            ]}
          >
            {v}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Empty({
  title,
  detail,
  action,
  onPress,
  icon,
}: {
  title: string;
  detail?: string;
  action?: string;
  onPress?: () => void;
  icon?: ReactNode;
}) {
  return (
    <View style={s.empty}>
      {icon ?? <MessageCircle size={30} color={C.link} />}
      <Text style={[s.heading, { textAlign: 'center' }]}>{title}</Text>
      {detail && (
        <Text style={[s.sub, { textAlign: 'center', maxWidth: 280 }]}>
          {detail}
        </Text>
      )}
      {action && onPress && <Button onPress={onPress}>{action}</Button>}
    </View>
  );
}
export function DemoNotice() {
  const me = useViewer().me;
  if (apiMode !== 'mock' && me.dataOrigin !== 'demo' && me.id !== 'u_me')
    return null;
  return (
    <View
      style={{
        backgroundColor: C.tint,
        padding: 9,
        borderRadius: 10,
        marginVertical: 8,
      }}
    >
      <Text style={{ fontSize: 11, color: C.ink2 }}>
        {me.dataOrigin === 'demo' || me.id === 'u_me'
          ? 'Demo · sample people and content, not real activity'
          : 'Local mode · data stays on this device'}
      </Text>
    </View>
  );
}
const isDemo = (id: string, origin?: string) =>
  origin === 'demo' || id === 'u_me';
export function useContent() {
  const v = useViewer();
  const opportunities = useAppStore((st) => st.opportunities);
  const orgs = useAppStore((st) => st.organizations);
  const demo = isDemo(v.me.id, v.me.dataOrigin);
  const school =
    v.me.affiliation.type === 'university'
      ? v.me.affiliation.schoolId
      : undefined;
  return {
    ...v,
    demo,
    opportunities: currentOpportunities(opportunities, demo).filter(
      (o) => !o.schoolId || o.schoolId === school,
    ),
    orgs: orgs.filter(
      (o) =>
        (!o.schoolId || o.schoolId === school) &&
        (demo || o.verified || o.type === 'community'),
    ),
  };
}
export function OpportunityRow({ item }: { item: Opportunity }) {
  const v = useViewer();
  const run = useAppStore((st) => st.run);
  const saved = useAppStore((st) =>
    st.opportunityIntents.some(
      (i) => i.userId === v.me.id && i.opportunityId === item.id && i.saved,
    ),
  );
  const [busy, setBusy] = useState(false);
  return (
    <View style={s.card}>
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => nav(`/opportunities/${item.id}`)}
        >
          <Text
            style={{
              color: C.link,
              fontSize: 10,
              fontWeight: '700',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {item.type.replace(/_/g, ' ')}
          </Text>
          <Text style={s.label}>{item.title}</Text>
          <Text style={[s.sub, { marginTop: 4 }]}>
            {item.host}
            {item.deadline
              ? ` · Apply by ${item.deadline.slice(0, 10)}`
              : item.date
                ? ` · ${item.date}`
                : ''}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Unsave opportunity' : 'Save opportunity'}
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await run(() => api.opportunities.toggleSave(item.id, v.me.id));
            } catch {
              /* store toast */
            } finally {
              setBusy(false);
            }
          }}
        >
          <Bookmark
            size={20}
            color={C.primary}
            fill={saved ? C.primary : 'none'}
          />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(item.sourceUrl)}
        style={[s.row, { marginTop: 12 }]}
      >
        <Text style={s.link}>{item.sourceLabel || 'Original source'}</Text>
        <ArrowUpRight size={13} color={C.link} />
      </Pressable>
    </View>
  );
}
export function OrgRow({ org }: { org: Organization }) {
  const v = useViewer();
  const run = useAppStore((st) => st.run);
  const followed = org.followerIds.includes(v.me.id);
  const member = org.memberIds.includes(v.me.id);
  return (
    <View style={s.card}>
      <Pressable onPress={() => nav(`/orgs/${org.id}`)}>
        <Text style={s.label}>{org.name}</Text>
        <Text style={s.sub}>
          {org.type === 'greek'
            ? 'Greek Life'
            : org.type === 'lab'
              ? 'Research Lab'
              : org.type === 'community'
                ? 'Community'
                : 'Student organization'}
          {member ? ' · Member' : followed ? ' · Followed' : ''}
        </Text>
      </Pressable>
      <View style={{ marginTop: 12 }}>
        <Button
          variant="outline"
          onPress={async () => {
            try {
              await run(() =>
                api.relationships.toggleFollow(v.me.id, org.id, 'org'),
              );
            } catch {
              /* toast */
            }
          }}
        >
          {followed ? 'Unfollow' : 'Follow'}
        </Button>
      </View>
    </View>
  );
}
export function MeetupRow({ activity: a }: { activity: Activity }) {
  const v = useViewer();
  return (
    <Pressable onPress={() => nav(`/activities/${a.id}`)} style={s.card}>
      <View style={s.row}>
        <CalendarDays size={22} color={C.link} />
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{a.title}</Text>
          <Text style={s.sub}>
            {a.date} · {a.startTime} ·{' '}
            {a.visibility === 'public'
              ? a.place.name
              : a.place.area || 'Location in details'}
          </Text>
          <Text style={[s.link, { marginTop: 6 }]}>
            {a.hostId === v.me.id
              ? 'Your meetup'
              : v.myParticipation(a.id)?.status === 'approved'
                ? 'Joined'
                : a.joinPolicy === 'approval'
                  ? 'Request to join'
                  : 'View meetup'}{' '}
            ›
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
const shortcuts = [
  {
    label: 'Events',
    Icon: CalendarDays,
    to: '/explore?category=Events',
    tint: '#F0EFFA',
  },
  {
    label: 'Opportunities',
    Icon: Compass,
    to: '/explore?category=Opportunities',
    tint: '#FFF6E9',
  },
  {
    label: 'Clubs & Groups',
    Icon: Users,
    to: '/explore?category=Clubs',
    tint: '#EDF5FC',
  },
  {
    label: 'Meetups',
    Icon: Coffee,
    to: '/social?section=meetups',
    tint: '#FCF0F1',
  },
];
export function HomeScreen() {
  const v = useContent();
  const upcoming = v.visibleActivities.filter(
    (a) => a.date >= new Date().toISOString().slice(0, 10),
  );
  const followed = v.orgs.filter(
    (o) => o.followerIds.includes(v.me.id) || o.memberIds.includes(v.me.id),
  );
  return (
    <TabScreen header={<AppHeader search />}>
      <DemoNotice />
      <Text style={s.title}>What's happening{'\n'}on campus?</Text>
      <View style={[s.wrap, { marginTop: 12 }]}>
        {shortcuts.map(({ label, Icon, to, tint }) => (
          <Pressable
            key={label}
            onPress={() => nav(to)}
            style={{
              width: '48%',
              flexGrow: 1,
              padding: 16,
              backgroundColor: tint,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 16,
              gap: 10,
            }}
          >
            <Icon size={23} color={C.link} />
            <Text style={s.label}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Section title="Campus picks" to="/explore">
        {v.opportunities.length ? (
          v.opportunities
            .slice(0, 3)
            .map((o) => <OpportunityRow key={o.id} item={o} />)
        ) : (
          <View style={s.card}>
            <Text style={s.label}>Your campus, at a glance</Text>
            <Text style={[s.sub, { marginTop: 6 }]}>
              Verified events and opportunities will appear here as sources are
              connected.
            </Text>
            <Pressable
              onPress={() => nav('/explore')}
              style={{ marginTop: 12 }}
            >
              <Text style={s.link}>Explore your campus ›</Text>
            </Pressable>
          </View>
        )}
      </Section>
      <Section title="Your week" to="/schedule">
        <Pressable style={s.card} onPress={() => nav('/schedule')}>
          {v.me.timetable.length ? (
            <WeekGrid courses={v.me.timetable} h1={17} px={18} />
          ) : (
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <Text style={s.sub}>Make room for what matters.</Text>
              <Text style={s.link}>Add Classes +</Text>
            </View>
          )}
        </Pressable>
      </Section>
      <Section title="My Communities" to="/explore?category=Clubs">
        {followed.length ? (
          followed.slice(0, 2).map((o) => <OrgRow key={o.id} org={o} />)
        ) : (
          <Pressable
            style={s.card}
            onPress={() => nav('/explore?category=Clubs')}
          >
            <Text style={s.label}>Find your communities</Text>
            <Text style={s.sub}>
              Follow clubs and groups. Membership is separate.
            </Text>
          </Pressable>
        )}
      </Section>
      {upcoming.length > 0 && (
        <Section title="Upcoming meetups" to="/social?section=meetups">
          {upcoming.slice(0, 2).map((a) => (
            <MeetupRow key={a.id} activity={a} />
          ))}
        </Section>
      )}
      <Section title="Campus life">
        <View style={s.row}>
          <Button
            variant="outline"
            onPress={() => nav('/campus-life?category=recreation')}
            icon={<Dumbbell size={16} color={C.ink} />}
          >
            Recreation
          </Button>
          <Button
            variant="outline"
            onPress={() => nav('/campus-life?category=dining')}
            icon={<Utensils size={16} color={C.ink} />}
          >
            Dining
          </Button>
        </View>
      </Section>
      <Section title="Start something small">
        <View style={s.row}>
          <Button onPress={() => nav('/meet/create')}>Create Meetup</Button>
          <Button
            variant="outline"
            onPress={() => nav('/create/post?type=question')}
          >
            Ask a Question
          </Button>
        </View>
      </Section>
    </TabScreen>
  );
}
export function ExploreScreen() {
  const p = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState(
    p.category && ['Events', 'Opportunities', 'Clubs'].includes(p.category)
      ? p.category
      : 'Events',
  );
  const [sort, setSort] = useState('Recommended');
  const [query, setQuery] = useState('');
  const [orgType, setOrgType] = useState('All');
  const v = useContent();
  const q = query.toLowerCase();
  const eventTypes = ['event', 'hackathon', 'activity'];
  let items = v.opportunities.filter(
    (o) =>
      (category === 'Events' ? eventTypes.includes(o.type) : true) &&
      `${o.title} ${o.host} ${o.tags.join(' ')}`.toLowerCase().includes(q),
  );
  if (sort === 'Newest')
    items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === 'Ending soon')
    items = [...items].sort((a, b) =>
      (a.deadline || a.date || '9999').localeCompare(
        b.deadline || b.date || '9999',
      ),
    );
  const orgMap: Record<string, string> = {
    'Student Clubs': 'club',
    'Greek Life': 'greek',
    'Research Labs': 'lab',
    Organizations: 'department',
    Communities: 'community',
  };
  const orgs = v.orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(q) &&
      (orgType === 'All' || o.type === orgMap[orgType]),
  );
  return (
    <TabScreen header={<AppHeader search />}>
      <DemoNotice />
      <Text style={s.title}>Explore</Text>
      <Pills
        values={['Events', 'Opportunities', 'Clubs']}
        value={category}
        onChange={(next) => {
          setCategory(next);
          router.setParams({ category: next });
        }}
      />
      <View style={[s.row, s.input]}>
        <Search size={18} color={C.ink3} />
        <TextInput
          accessibilityLabel="Search campus content"
          placeholder={`Search ${category.toLowerCase()}`}
          value={query}
          onChangeText={setQuery}
          style={{ flex: 1, color: C.ink, minHeight: 44 }}
        />
      </View>
      <Pills
        values={
          category === 'Clubs'
            ? [
                'All',
                'Student Clubs',
                'Greek Life',
                'Research Labs',
                'Organizations',
                'Communities',
              ]
            : ['Recommended', 'Newest', 'Ending soon']
        }
        value={category === 'Clubs' ? orgType : sort}
        onChange={category === 'Clubs' ? setOrgType : setSort}
      />
      <View style={{ marginTop: 18 }}>
        {category === 'Clubs'
          ? orgs.map((o) => <OrgRow key={o.id} org={o} />)
          : items.map((o) => <OpportunityRow key={o.id} item={o} />)}
        {(category === 'Clubs' ? orgs.length : items.length) === 0 && (
          <Empty
            title={
              query
                ? 'No matches yet'
                : `No verified ${category.toLowerCase()} yet`
            }
            detail={
              query
                ? 'Try another search or category.'
                : category === 'Clubs'
                  ? 'Public organization sources are not connected yet. Following a group never grants private access.'
                  : 'Current listings will appear once a verified campus source is connected. We won’t fill this space with made-up listings.'
            }
          />
        )}
      </View>
    </TabScreen>
  );
}
export function SocialScreen() {
  const params = useLocalSearchParams<{ section?: SocialTab }>();
  const tab = SOCIAL_KEYS.includes(params.section as SocialTab)
    ? params.section!
    : 'for-you';
  const v = useContent();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('All');
  const [scope, setScope] = useState('All');
  const [language, setLanguage] = useState('');
  const [more, setMore] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const meets = v.visibleActivities.filter(
    (a) =>
      a.date >= today &&
      (scope !== 'My Groups' ||
        (a.orgId &&
          verifiedMemberships(v.orgs, v.me.id).some(
            (o) => o.id === a.orgId,
          ))) &&
      (scope !== 'My Classes' ||
        (a.courseName && v.me.timetable.some((c) => c.name === a.courseName))),
  );
  const people = v.visibleUsers.filter(
    (u) =>
      u.nickname.toLowerCase().includes(query.toLowerCase()) &&
      (!language ||
        u.spokenLanguages?.some((l) =>
          l.toLowerCase().includes(language.toLowerCase()),
        )) &&
      (year === 'All' ||
        (year === 'Graduate'
          ? u.affiliation.type === 'university' &&
            u.affiliation.role === 'graduate'
          : year === 'Alumni'
            ? u.affiliation.type === 'university' &&
              u.affiliation.role === 'alumni'
            : u.academicYear === Number(year[0]))),
  );
  const posts = v.visiblePosts.filter(
    (p) =>
      !p.sponsored &&
      p.showOnFeed !== false &&
      (scope !== 'My School' ||
        (v.userById(p.authorId)?.affiliation.type === 'university' &&
          v.me.affiliation.type === 'university' &&
          (v.userById(p.authorId)!.affiliation as { schoolId: string })
            .schoolId === v.me.affiliation.schoolId)),
  );
  return (
    <TabScreen header={<AppHeader search />}>
      <DemoNotice />
      <Text style={s.title}>Social</Text>
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderColor: C.line,
          marginBottom: 20,
        }}
      >
        {SOCIAL_KEYS.map((key, i) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            onPress={() => {
              setScope('All');
              router.setParams({ section: key });
            }}
            style={{
              flex: 1,
              paddingVertical: 13,
              alignItems: 'center',
              borderBottomWidth: tab === key ? 2 : 0,
              borderColor: C.primary,
            }}
          >
            <Text
              style={{
                color: tab === key ? C.primary : C.ink3,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              {SOCIAL_TABS[i]}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'for-you' && (
        <>
          <Text style={s.heading}>A little company goes a long way.</Text>
          <Text style={[s.sub, { marginTop: 8, marginBottom: 18 }]}>
            Make a plan. Find your people.
          </Text>
          <View style={s.row}>
            <Button onPress={() => nav('/meet/create')}>Start a Meetup</Button>
            <Button
              variant="outline"
              onPress={() => router.setParams({ section: 'people' })}
            >
              Find People
            </Button>
          </View>
          <Section title="What would you like to do together?">
            <View style={s.wrap}>
              {[
                ['Coffee', 'coffee'],
                ['Study', 'study'],
                ['Workout', 'exercise'],
                ['Lunch', 'meal'],
                ['Hangout', 'etc'],
              ].map(([name, cat]) => (
                <Pressable
                  key={name}
                  style={s.pill}
                  onPress={() => nav(`/meet/create?category=${cat}`)}
                >
                  <Text style={s.label}>{name}</Text>
                </Pressable>
              ))}
            </View>
          </Section>
          <Pressable
            style={[s.card, { marginTop: 24 }]}
            onPress={() => nav('/create/post?type=question')}
          >
            <Text style={s.label}>Ask your campus a question</Text>
            <Text style={s.sub}>Start a conversation →</Text>
          </Pressable>
          <View style={s.row}>
            <Button variant="ghost" onPress={() => nav('/profile/groups')}>
              My Groups
            </Button>
            <Button variant="ghost" onPress={() => nav('/schedule')}>
              My Classes
            </Button>
          </View>
          {meets.slice(0, 2).map((a) => (
            <MeetupRow key={a.id} activity={a} />
          ))}
          {posts.slice(0, 2).map((p) => (
            <PostRow key={p.id} post={p} onPress={() => nav(`/feed/${p.id}`)} />
          ))}
        </>
      )}
      {tab === 'meetups' && (
        <>
          <View
            style={[
              s.row,
              { justifyContent: 'space-between', marginBottom: 14 },
            ]}
          >
            <Text style={s.heading}>Better together</Text>
            <Button
              size="sm"
              onPress={() => nav('/meet/create')}
              icon={<Plus size={14} color="white" />}
            >
              Create
            </Button>
          </View>
          <Pills
            values={['All', 'My Groups', 'My Classes']}
            value={scope}
            onChange={setScope}
          />
          <View style={{ marginTop: 16 }}>
            {meets.length ? (
              meets.map((a) => <MeetupRow key={a.id} activity={a} />)
            ) : (
              <Empty
                title="Make the first plan"
                detail="A coffee, a study session, a little time together."
                action="Create Meetup"
                onPress={() => nav('/meet/create')}
                icon={<Coffee size={30} color={C.link} />}
              />
            )}
          </View>
          <Button variant="ghost" onPress={() => nav('/meet/tables')}>
            Small Tables
          </Button>
        </>
      )}
      {tab === 'people' && (
        <>
          <TextInput
            accessibilityLabel="Search people"
            placeholder="Search people"
            value={query}
            onChangeText={setQuery}
            style={s.input}
          />
          <Pills
            values={['All', '1st', '2nd', '3rd', '4th+', 'Graduate', 'Alumni']}
            value={year}
            onChange={setYear}
          />
          <Pressable
            onPress={() => setMore(!more)}
            style={{ paddingVertical: 14 }}
          >
            <Text style={s.link}>
              {more ? 'Fewer filters −' : 'More filters +'}
            </Text>
          </Pressable>
          {more && (
            <>
              <Text style={s.sub}>Spoken language (optional)</Text>
              <TextInput
                style={s.input}
                value={language}
                onChangeText={setLanguage}
                placeholder="e.g. Spanish"
                accessibilityLabel="Spoken language"
              />
              <Text style={s.sub}>
                Country of origin is a separate, optional profile field.
              </Text>
              <Button variant="ghost" onPress={() => nav('/people/advanced')}>
                Interests & community filters
              </Button>
              <Button variant="ghost" onPress={() => nav('/people/second')}>
                Connections
              </Button>
            </>
          )}
          <View style={s.row}>
            <Button variant="ghost" onPress={() => nav('/ai')}>
              Ask AI
            </Button>
            <Button variant="ghost" onPress={() => nav('/people/ask')}>
              Ask Network
            </Button>
          </View>
          {people.length ? (
            people.map((u) => (
              <Pressable
                style={[s.card, s.row]}
                key={u.id}
                onPress={() => nav(`/users/${u.id}`)}
              >
                <Avatar {...u.avatar} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>{u.nickname}</Text>
                  <Text style={s.sub}>
                    {u.affiliation.type === 'university' &&
                    u.affiliation.showSchool
                      ? u.affiliation.schoolName
                      : ''}
                  </Text>
                </View>
                <ChevronRight size={17} color={C.ink3} />
              </Pressable>
            ))
          ) : (
            <Empty
              title="Good company starts somewhere"
              detail="Invite a friend or explore your classes and communities."
              action="Invite Friends"
              onPress={() =>
                Share.share({
                  message:
                    'Join me on Lumi — your college life, all in one place.',
                })
              }
              icon={<Users size={30} color={C.link} />}
            />
          )}
          <View style={s.row}>
            <Button variant="outline" onPress={() => nav('/schedule')}>
              My Classes
            </Button>
            <Button
              variant="outline"
              onPress={() => nav('/explore?category=Clubs')}
            >
              My Communities
            </Button>
          </View>
        </>
      )}
      {tab === 'feed' && (
        <>
          <Pills
            values={['All', 'My School']}
            value={scope}
            onChange={setScope}
          />
          {posts.length ? (
            <View style={{ marginTop: 16 }}>
              {posts.map((p) => (
                <PostRow
                  key={p.id}
                  post={p}
                  onPress={() => nav(`/feed/${p.id}`)}
                />
              ))}
              <Button onPress={() => nav('/create/post')}>
                Share Something
              </Button>
            </View>
          ) : (
            <Empty
              title="Be the first to share"
              detail="A question, an update, or something you're working on."
              action="Share Something"
              onPress={() => nav('/create/post')}
              icon={<MessageCircle size={36} color={C.link} />}
            />
          )}
          <View style={[s.row, { justifyContent: 'center', flexWrap: 'wrap' }]}>
            <Button
              variant="outline"
              onPress={() => nav('/create/post?type=question')}
            >
              Ask a Question
            </Button>
            <Button
              variant="outline"
              onPress={() => nav('/meet/create?category=study')}
            >
              Find Study Buddies
            </Button>
          </View>
        </>
      )}
    </TabScreen>
  );
}
export function ProfileScreen() {
  const v = useContent();
  const [section, setSection] = useState('Upcoming');
  const memberships = verifiedMemberships(v.orgs, v.me.id);
  const friends = friendsOf(v.snap, v.me.id).length;
  const following = v.orgs.filter(
    (o) =>
      o.followerIds.includes(v.me.id) &&
      !memberships.some((m) => m.id === o.id),
  );
  const mine = v.visibleActivities.filter(
    (a) =>
      a.hostId === v.me.id || v.myParticipation(a.id)?.status === 'approved',
  );
  const today = new Date().toISOString().slice(0, 10);
  const activities = mine.filter((a) =>
    section === 'Created'
      ? a.hostId === v.me.id
      : section === 'Past'
        ? a.date < today
        : a.date >= today,
  );
  const posts = v.visiblePosts.filter((p) => p.authorId === v.me.id);
  return (
    <TabScreen
      header={
        <AppHeader
          right={
            <Pressable
              accessibilityLabel="Settings"
              onPress={() => nav('/settings')}
            >
              <Settings size={22} color={C.ink} />
            </Pressable>
          }
        />
      }
    >
      <DemoNotice />
      <View style={[s.row, { marginTop: 18, alignItems: 'flex-start' }]}>
        <Avatar {...v.me.avatar} size={74} />
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <Text style={[s.title, { marginTop: 0, marginBottom: 4 }]}>
            {v.me.nickname}
          </Text>
          <Text style={s.sub}>
            {v.me.affiliation.type === 'university'
              ? v.me.affiliation.schoolName
              : ''}
          </Text>
          <Text style={s.sub}>
            {v.me.affiliation.type === 'university'
              ? [
                  v.me.affiliation.department,
                  v.me.affiliation.role === 'graduate'
                    ? 'Graduate'
                    : v.me.affiliation.role === 'alumni'
                      ? 'Alumni'
                      : v.me.academicYear
                        ? `Year ${v.me.academicYear}`
                        : 'Undergraduate',
                ]
                  .filter(Boolean)
                  .join(' · ')
              : ''}
          </Text>
        </View>
      </View>
      {!!v.me.bio && <Text style={[s.sub, { marginTop: 14 }]}>{v.me.bio}</Text>}
      <View style={[s.row, { marginVertical: 16 }]}>
        <Button variant="outline" onPress={() => nav('/profile/edit')}>
          Edit Profile
        </Button>
        <Button
          variant="outline"
          onPress={() =>
            Share.share({ message: `${v.me.nickname} on ${BRAND.name}` })
          }
        >
          Share Profile
        </Button>
      </View>
      <View style={[s.row, { gap: 24 }]}>
        <Pressable onPress={() => nav('/profile/groups')}>
          <Text style={s.sub}>
            <Text style={s.label}>{memberships.length}</Text> Groups
          </Text>
        </Pressable>
        <Pressable onPress={() => nav('/profile/friends')}>
          <Text style={s.sub}>
            <Text style={s.label}>{friends}</Text> Friends
          </Text>
        </Pressable>
      </View>
      <Section title="Get to know me" to="/profile/prompts">
        {v.me.prompts.length ? (
          v.me.prompts.slice(0, 3).map((p) => (
            <View key={p.questionId} style={s.card}>
              <Text style={s.sub}>
                {TEXT_PROMPTS.find((q) => q.id === p.questionId)?.text ||
                  'A little about me'}
              </Text>
              <Text style={[s.label, { marginTop: 8 }]}>{p.answer}</Text>
            </View>
          ))
        ) : (
          <Pressable style={s.card} onPress={() => nav('/profile/prompts')}>
            <Text style={s.label}>A little more you</Text>
            <Text style={s.sub}>Add an optional prompt answer +</Text>
          </Pressable>
        )}
      </Section>
      <Section title="My Communities" to="/profile/groups">
        {memberships.map((o) => (
          <OrgRow key={o.id} org={o} />
        ))}
        {following.map((o) => (
          <OrgRow key={o.id} org={o} />
        ))}
        {!memberships.length && !following.length && (
          <Pressable
            onPress={() => nav('/explore?category=Clubs')}
            style={s.card}
          >
            <Text style={s.sub}>Find clubs and groups to follow ›</Text>
          </Pressable>
        )}
        <Text style={s.sub}>
          Followed and Member are different. Membership display is private by
          default.
        </Text>
      </Section>
      <Section title="My Events & Meetups">
        <Pills
          values={['Upcoming', 'Past', 'Created']}
          value={section}
          onChange={setSection}
        />
        <View style={{ marginTop: 12 }}>
          {activities.map((a) => (
            <MeetupRow key={a.id} activity={a} />
          ))}
          {!activities.length && (
            <Text style={s.sub}>Your plans will appear here.</Text>
          )}
        </View>
      </Section>
      <Section title="Saved" to="/profile/saved-content">
        <Text style={s.sub}>Your bookmarked opportunities and events.</Text>
        <Button variant="ghost" onPress={() => nav('/profile/saved')}>
          Saved People
        </Button>
      </Section>
      <Section title="My Posts">
        {posts.map((p) => (
          <PostRow key={p.id} post={p} onPress={() => nav(`/feed/${p.id}`)} />
        ))}
        {!posts.length && (
          <Text style={s.sub}>Share something when you're ready.</Text>
        )}
      </Section>
      <Section title="Your account">
        <Button variant="ghost" onPress={() => nav('/plans')}>
          My Plans
        </Button>
        <Button variant="ghost" onPress={() => nav('/plus')}>
          Lumi+
        </Button>
        <Button variant="ghost" onPress={() => nav('/profile/discovery')}>
          Discovery & privacy
        </Button>
        <Button variant="outline" onPress={() => nav('/settings/privacy')}>
          Privacy & Safety
        </Button>
      </Section>
    </TabScreen>
  );
}
