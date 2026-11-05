import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Check,
  BookOpen,
  Compass,
  Users,
  CalendarDays,
} from 'lucide-react';
import { BRAND } from '@core/brand';
import { api, apiMode, type RegisterInput } from '@core/api';
import type {
  Goal,
  Interest,
  School,
  Organization,
  ProfileField,
  Visibility,
} from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
const button =
  'w-full rounded-full bg-primary text-white font-semibold text-sm py-3.5 mt-6 disabled:opacity-40';
const input =
  'w-full p-3 my-2 border border-line rounded-xl bg-surface-2 text-sm';
const goals = [
  'Find events & opportunities',
  'Plan my classes',
  'Explore clubs & groups',
  'Meet new people',
  'Campus life',
];
const features = [
  'Classes & Schedule',
  'Events & Opportunities',
  'Clubs & Groups',
  'Social',
];
const toggle = (xs: string[], x: string) =>
  xs.includes(x) ? xs.filter((v) => v !== x) : [...xs, x];
function Choices({
  values,
  selected,
  onChange,
}: {
  values: string[];
  selected: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <button
          type="button"
          key={v}
          aria-pressed={selected.includes(v)}
          onClick={() => onChange(v)}
          className={`rounded-xl px-4 py-3 text-sm border text-left ${selected.includes(v) ? 'bg-tint border-link text-link' : 'border-line'}`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
export function LumiOnboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [feature, setFeature] = useState(features[0]);
  const [query, setQuery] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [school, setSchool] = useState<School>();
  const [role, setRole] = useState('Undergraduate');
  const [degree, setDegree] = useState("Master's");
  const [year, setYear] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [orgType, setOrgType] = useState('Student Clubs');
  const [orgQuery, setOrgQuery] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [followed, setFollowed] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setCurrentUser = useAppStore((st) => st.setCurrentUser);
  useEffect(() => {
    let active = true;
    api.schools
      .search(query)
      .then((r) => {
        if (active) setSchools(r);
      })
      .catch(() => setError('Could not load universities.'));
    return () => {
      active = false;
    };
  }, [query]);
  useEffect(() => {
    api
      .publicContent()
      .then((r) => setOrgs(r.organizations))
      .catch(() => {});
  }, []);
  const next = () => {
    setError('');
    if (step === 0)
      setFeature(
        chosen.includes('Plan my classes')
          ? features[0]
          : chosen.includes(goals[0])
            ? features[1]
            : chosen.includes(goals[2])
              ? features[2]
              : chosen.includes(goals[3])
                ? features[3]
                : features[0],
      );
    setStep(step + 1);
  };
  const verify = async () => {
    if (!school) return;
    setBusy(true);
    setError('');
    try {
      if (sent) {
        const r = await api.schools.verifyCode(email, code);
        setVerified(r.ok);
        if (!r.ok) setError('Check your code.');
      } else {
        const r = await api.schools.sendVerificationCode(email, school.id);
        setSent(r.ok);
        setHint(r.hint);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const finish = async () => {
    if (
      !school ||
      !verified ||
      !name.trim() ||
      !/^\d{4}$/.test(birth) ||
      Number(birth) < 1900 ||
      Number(birth) > new Date().getFullYear() - 13
    ) {
      setError('Add your name, a valid birth year, and verify your email.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const fieldVisibility = Object.fromEntries(
        [
          'bio',
          'likes',
          'freeTime',
          'height',
          'availability',
          'preferredPartner',
          'purposes',
          'interests',
          'posts',
          'prompts',
          'timetable',
          'goals',
          'living',
        ].map((f) => [
          f,
          ['bio', 'interests', 'prompts'].includes(f) ? 'school' : 'private',
        ]),
      ) as Record<ProfileField, Visibility>;
      const map: Record<string, Goal> = {
        [goals[0]]: 'internship',
        [goals[2]]: 'join_club',
        [goals[3]]: 'friends',
        [goals[4]]: 'hobby',
      };
      const user = await api.auth.register({
        nickname: name.trim(),
        birthYear: Number(birth),
        email,
        schoolId: school.id,
        role:
          role === 'Graduate'
            ? 'graduate'
            : role === 'Alumni'
              ? 'alumni'
              : 'undergraduate',
        stage:
          role === 'Graduate'
            ? degree === 'PhD'
              ? 'phd'
              : 'masters'
            : role === 'Alumni'
              ? 'alumni'
              : 'undergrad',
        gender: 'private',
        avatar: { emoji: '👤', hue: 225, photoType: 'masked' },
        department: '',
        year: new Date().getFullYear(),
        emailVerified: true,
        showSchool: true,
        showDepartment: false,
        interests: interests as Interest[],
        purposes: [],
        bio: '',
        likes: '',
        freeTime: '',
        availability: 'hidden',
        fieldVisibility,
        prompts: [],
        goals: chosen.map((g) => map[g]).filter(Boolean),
        locationPermission: 'undecided',
        notifications: false,
      } satisfies RegisterInput);
      await api.users.update(user.id, {
        academicYear:
          role === 'Undergraduate' && year
            ? (Number(year[0]) as 1 | 2 | 3 | 4)
            : undefined,
        interestedOrgIds: followed,
        membershipVisibility: 'private',
        classmateOptIn: false,
      });
      for (const id of followed)
        await api.relationships.toggleFollow(user.id, id, 'org');
      await setCurrentUser(user);
      nav('/', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const titles = [
    'What would you like to do?',
    'What Lumi can do',
    'Your university',
    'Make it yours',
    'Your communities',
    'A little about you',
  ];
  const typeMap: Record<string, string> = {
    'Student Clubs': 'club',
    'Greek Life': 'greek',
    'Research Labs': 'lab',
    'Major / Department': 'department',
    'Co-op': 'community',
    'Cultural Groups': 'club',
    Residence: 'community',
  };
  return (
    <main className="px-5 pb-8">
      <header className="flex items-center py-4 gap-3">
        <button
          aria-label="Back"
          onClick={() => (step ? setStep(step - 1) : nav('/welcome'))}
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-xs text-ink-2 flex-1">
          {BRAND.name} · {step + 1} of 6
        </span>
        {[3, 4].includes(step) && (
          <button className="text-xs text-link" onClick={next}>
            Skip
          </button>
        )}
      </header>
      <h1 className="text-[26px] font-bold leading-8 mt-2 mb-5 tracking-tight">
        {titles[step]}
      </h1>
      {step === 0 && (
        <>
          <p className="text-sm text-ink-2 mb-5">
            Choose what sounds like you. Change it anytime.
          </p>
          <div className="space-y-3">
            {goals.map((g) => (
              <button
                key={g}
                aria-pressed={chosen.includes(g)}
                onClick={() => setChosen(toggle(chosen, g))}
                className={`w-full flex items-center text-left border rounded-2xl p-4 text-sm font-semibold ${chosen.includes(g) ? 'border-link bg-tint' : 'border-line'}`}
              >
                <span className="flex-1">{g}</span>
                {chosen.includes(g) && (
                  <Check size={17} className="text-link" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {features.map((f, i) => {
              const Icon = [BookOpen, Compass, Users, CalendarDays][i];
              return (
                <button
                  key={f}
                  aria-pressed={feature === f}
                  onClick={() => setFeature(f)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${feature === f ? 'bg-tint border-link' : 'border-line'}`}
                >
                  <Icon size={17} />
                  {f}
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-line bg-surface-2 p-4 min-h-80">
            <h2 className="font-bold mb-4">{feature}</h2>
            {feature === features[0] ? (
              <>
                <div className="grid grid-cols-[20px_repeat(5,1fr)] text-[10px] text-ink-2 text-center">
                  <span />
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-[20px_repeat(5,1fr)] h-60 mt-3">
                  <div className="flex flex-col justify-between text-[9px] text-ink-3">
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16].map((h) => (
                      <span key={h}>{h}</span>
                    ))}
                  </div>
                  {[0, 1, 2, 3, 4].map((d) => (
                    <div key={d} className="border-l border-line relative">
                      <div
                        className={`absolute mx-0.5 rounded-lg p-1 text-[9px] font-semibold ${d % 2 ? 'bg-[#F8E8DB]' : 'bg-[#E5E8FA]'}`}
                        style={{ top: d % 2 ? 78 : 28, height: 50 }}
                      >
                        {d === 4 ? 'Lab' : d % 2 ? 'Seminar' : 'Class'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : feature === features[3] ? (
              <>
                <Choices
                  values={['For You', 'Meetups', 'People', 'Feed']}
                  selected={['For You']}
                  onChange={() => {}}
                />
                <h3 className="font-bold text-lg mt-8">A little company.</h3>
                <p className="text-sm text-ink-2 mt-3">
                  Coffee · Study · Workout · Lunch
                </p>
              </>
            ) : (
              <div className="space-y-3">
                {(feature === features[1]
                  ? ['Internships', 'Research', 'Hackathons', 'Campus events']
                  : [
                      'Student Clubs',
                      'Greek Life',
                      'Research Labs',
                      'Cultural Groups',
                    ]
                ).map((x) => (
                  <div
                    key={x}
                    className="rounded-xl border border-line bg-white p-4 text-sm"
                  >
                    {x}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-ink-3 mt-4">
              Illustration · not live campus data
            </p>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <input
            aria-label="Search universities"
            className={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search universities"
          />
          {schools.slice(0, 5).map((u) => (
            <button
              className={`w-full p-4 border rounded-xl text-left text-sm mb-2 ${school?.id === u.id ? 'border-link bg-tint' : 'border-line'}`}
              key={u.id}
              onClick={() => {
                setSchool(u);
                setSent(false);
                setVerified(false);
              }}
            >
              {u.name}
            </button>
          ))}
          <p className="text-xs text-ink-2 my-3">Student status</p>
          <Choices
            values={['Undergraduate', 'Graduate', 'Alumni']}
            selected={[role]}
            onChange={setRole}
          />
          {role === 'Undergraduate' && (
            <div className="mt-4">
              <p className="text-xs text-ink-2 mb-2">Year (optional)</p>
              <Choices
                values={['1st', '2nd', '3rd', '4th+']}
                selected={[year]}
                onChange={setYear}
              />
            </div>
          )}
          {role === 'Graduate' && (
            <div className="mt-4">
              <Choices
                values={["Master's", 'PhD']}
                selected={[degree]}
                onChange={setDegree}
              />
            </div>
          )}
        </>
      )}
      {step === 3 && (
        <>
          <p className="text-sm text-ink-2 mb-5">
            Optional. Choose content you'd like to discover.
          </p>
          <Choices
            values={[
              'Internships',
              'Research',
              'Hackathons',
              'Scholarships',
              'Campus events',
              'Communities',
              'Recreation',
              'Dining',
            ]}
            selected={interests.map(
              (v) =>
                (
                  ({
                    networking: 'Internships',
                    research: 'Research',
                    startup: 'Hackathons',
                    study: 'Scholarships',
                    exhibition: 'Campus events',
                    club: 'Communities',
                    exercise: 'Recreation',
                    meal: 'Dining',
                  }) as Record<string, string>
                )[v],
            )}
            onChange={(v) => {
              const id = (
                {
                  Internships: 'networking',
                  Research: 'research',
                  Hackathons: 'startup',
                  Scholarships: 'study',
                  'Campus events': 'exhibition',
                  Communities: 'club',
                  Recreation: 'exercise',
                  Dining: 'meal',
                } as Record<string, string>
              )[v];
              setInterests(toggle(interests, id));
            }}
          />
        </>
      )}
      {step === 4 && (
        <>
          <p className="text-sm text-ink-2 mb-5">
            Follow interests. Membership is verified separately.
          </p>
          <Choices
            values={Object.keys(typeMap)}
            selected={[orgType]}
            onChange={setOrgType}
          />
          <input
            aria-label="Search organizations"
            className={input}
            placeholder="Search organizations"
            value={orgQuery}
            onChange={(e) => setOrgQuery(e.target.value)}
          />
          {orgs
            .filter(
              (o) =>
                o.schoolId === school?.id &&
                o.type === typeMap[orgType] &&
                o.name.toLowerCase().includes(orgQuery.toLowerCase()),
            )
            .map((o) => (
              <button
                key={o.id}
                className={input}
                onClick={() => setFollowed(toggle(followed, o.id))}
              >
                {o.name} {followed.includes(o.id) ? '· Selected to follow' : ''}
              </button>
            ))}
          {!orgs.length && (
            <p className="text-sm text-ink-2 mt-5 leading-6">
              No verified organization directory is connected for this
              university yet. Add communities later.
            </p>
          )}
        </>
      )}
      {step === 5 && (
        <>
          <input
            aria-label="Your name"
            className={input}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            aria-label="Birth year"
            className={input}
            placeholder="Birth year (private)"
            inputMode="numeric"
            maxLength={4}
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
          <input
            aria-label="School email"
            className={input}
            placeholder="School email"
            type="email"
            disabled={verified}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
              setVerified(false);
            }}
          />
          {sent && !verified && (
            <input
              aria-label="Verification code"
              className={input}
              placeholder="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
          <button
            disabled={busy || verified || !email.includes('@')}
            onClick={verify}
            className="border border-line rounded-full px-4 py-2 text-sm"
          >
            {verified ? 'Email verified' : sent ? 'Verify email' : 'Send code'}
          </button>
          <p className="text-xs text-ink-2 mt-3">
            {sent && apiMode === 'mock'
              ? 'Local development code: 123456'
              : hint}
          </p>
          <p className="text-sm text-ink-2 mt-6 leading-6">
            Your timetable, housing and memberships start private. Add optional
            details later.
          </p>
          <div className="flex gap-4 text-xs text-link mt-4">
            <a href="/terms" target="_blank">
              Terms
            </a>
            <a href="/privacy" target="_blank">
              Privacy
            </a>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-danger text-sm mt-4">
          {error}
        </p>
      )}
      <button
        className={button}
        disabled={busy || (step === 2 && !school) || (step === 5 && !verified)}
        onClick={step === 5 ? finish : next}
      >
        {busy ? 'Please wait…' : step === 5 ? 'Get Started' : 'Continue'}
      </button>
    </main>
  );
}
