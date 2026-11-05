import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Check,
  BookOpen,
  Compass,
  Users,
  CalendarDays,
} from 'lucide-react-native';
import { BRAND } from '@core/brand';
import { api, apiMode, type RegisterInput } from '@core/api';
import type {
  Course,
  Goal,
  Interest,
  Organization,
  ProfileField,
  School,
  Stage,
  Visibility,
} from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { getPlatform } from '@core/platform';
import { Button, C } from '@/ui';
import { WeekGrid } from '@/components/WeekGrid';
import { s, Pills } from '@/lumi/Screens';
import { back, replace } from '@/nav';
import { openLegal } from '@/legal';

const goals = [
  'Find events & opportunities',
  'Plan my classes',
  'Explore clubs & groups',
  'Meet new people',
  'Campus life',
];
const featureNames = [
  'Classes & Schedule',
  'Events & Opportunities',
  'Clubs & Groups',
  'Social',
];
// An expressly labeled illustration, never stored as a user's schedule.
const previewCourses: Course[] = [0, 1, 2, 3, 4].map((day) => ({
  id: `preview-${day}`,
  name: ['Class', 'Seminar', 'Class', 'Study', 'Lab'][day],
  day,
  start: day % 2 ? '11:00' : '09:00',
  end: day % 2 ? '12:30' : '10:30',
  hue: [225, 32, 250, 190, 225][day],
}));
export function ValuePreview({
  initialFeature = 'Classes & Schedule',
}: {
  initialFeature?: string;
}) {
  const [feature, setFeature] = useState(initialFeature);
  return (
    <>
      <View style={[s.wrap, { marginTop: 8, marginBottom: 18 }]}>
        {featureNames.map((name, i) => {
          const Icon = [BookOpen, Compass, Users, CalendarDays][i];
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: feature === name }}
              onPress={() => setFeature(name)}
              style={[
                s.pill,
                { width: '48%', flexGrow: 1 },
                feature === name && s.selected,
              ]}
            >
              <View style={s.row}>
                <Icon size={16} color={C.link} />
                <Text
                  style={{
                    fontSize: 11,
                    color: C.ink,
                    fontWeight: '600',
                    flexShrink: 1,
                  }}
                >
                  {name}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={[s.card, { minHeight: 270, backgroundColor: C.surface2 }]}>
        <Text style={[s.heading, { marginBottom: 18 }]}>{feature}</Text>
        {feature === 'Classes & Schedule' ? (
          <WeekGrid courses={previewCourses} h0={8} h1={16} px={23} />
        ) : feature === 'Events & Opportunities' ? (
          ['Internships', 'Research', 'Hackathons', 'Campus events'].map(
            (name) => (
              <View
                key={name}
                style={[
                  s.row,
                  {
                    paddingVertical: 13,
                    borderBottomWidth: 1,
                    borderColor: C.line,
                  },
                ]}
              >
                <Compass size={18} color={C.link} />
                <Text style={s.label}>{name}</Text>
              </View>
            ),
          )
        ) : feature === 'Clubs & Groups' ? (
          [
            'Student Clubs',
            'Greek Life',
            'Research Labs',
            'Cultural Groups',
          ].map((name) => (
            <View key={name} style={[s.row, { paddingVertical: 13 }]}>
              <Users size={18} color={C.link} />
              <Text style={s.label}>{name}</Text>
            </View>
          ))
        ) : (
          <>
            <Pills
              values={['For You', 'Meetups', 'People', 'Feed']}
              value="For You"
              onChange={() => {}}
            />
            <Text style={[s.heading, { marginTop: 30 }]}>
              A little company.
            </Text>
            <Text style={[s.sub, { marginTop: 8 }]}>
              Coffee · Study · Workout · Lunch
            </Text>
            <View
              style={[
                s.pill,
                {
                  backgroundColor: C.primary,
                  alignSelf: 'flex-start',
                  marginTop: 20,
                },
              ]}
            >
              <Text style={{ color: 'white', fontSize: 13 }}>
                Start a Meetup
              </Text>
            </View>
          </>
        )}
        <Text style={{ marginTop: 18, fontSize: 10, color: C.ink3 }}>
          Illustration · not live campus data
        </Text>
      </View>
    </>
  );
}
const toggle = (xs: string[], x: string) =>
  xs.includes(x) ? xs.filter((v) => v !== x) : [...xs, x];
export default function OnboardingScreen() {
  return <OnboardingFlow />;
}
export function OnboardingFlow({
  onExit,
  embedded = false,
}: {
  onExit?: () => void;
  embedded?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [selectedGoals, setGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [school, setSchool] = useState<School>();
  const [role, setRole] = useState('Undergraduate');
  const [year, setYear] = useState('');
  const [degree, setDegree] = useState("Master's");
  const [orgType, setOrgType] = useState('Student Clubs');
  const [orgQuery, setOrgQuery] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [followed, setFollowed] = useState<string[]>([]);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [birthYear, setBirthYear] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const setCurrentUser = useAppStore((st) => st.setCurrentUser);
  useEffect(() => {
    let active = true;
    api.schools
      .search(query)
      .then((r) => {
        if (active) setSchools(r);
      })
      .catch(() => {
        if (active) setError('Could not load universities. Try again.');
      });
    return () => {
      active = false;
    };
  }, [query]);
  useEffect(() => {
    if (step !== 4) return;
    let active = true;
    api
      .publicContent()
      .then((r) => {
        if (active)
          setOrgs(
            r.organizations.filter(
              (o) => o.verified && o.schoolId === school?.id,
            ),
          );
      })
      .catch(() => {
        /* optional communities may be unavailable before login */
      });
    return () => {
      active = false;
    };
  }, [step, school?.id]);
  const next = () => {
    setError('');
    setStep((n) => n + 1);
  };
  const verify = async () => {
    if (!school) return;
    setBusy(true);
    setError('');
    try {
      if (sent) {
        const r = await api.schools.verifyCode(email.trim(), code.trim());
        setVerified(r.ok);
        if (r.ok) setHint('Email verified');
        else setError('Check your code and try again.');
      } else {
        const r = await api.schools.sendVerificationCode(
          email.trim(),
          school.id,
        );
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
      !nickname.trim() ||
      !verified ||
      !/^\d{4}$/.test(birthYear) ||
      Number(birthYear) < 1900 ||
      Number(birthYear) > new Date().getFullYear() - 13
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
      const stage: Stage =
        role === 'Graduate'
          ? degree === 'PhD'
            ? 'phd'
            : 'masters'
          : role === 'Alumni'
            ? 'alumni'
            : 'undergrad';
      const goalMap: Record<string, Goal> = {
        'Find events & opportunities': 'internship',
        'Explore clubs & groups': 'join_club',
        'Meet new people': 'friends',
        'Campus life': 'hobby',
      };
      const input: RegisterInput = {
        nickname: nickname.trim(),
        email: email.trim(),
        birthYear: Number(birthYear),
        gender: 'private',
        avatar: { emoji: '👤', hue: 225, photoType: 'masked' },
        schoolId: school.id,
        role:
          role === 'Graduate'
            ? 'graduate'
            : role === 'Alumni'
              ? 'alumni'
              : 'undergraduate',
        department: '',
        year: year ? Number(year) : new Date().getFullYear(),
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
        stage,
        prompts: [],
        goals: selectedGoals.map((g) => goalMap[g]).filter(Boolean),
        locationPermission: 'undecided',
        notifications: false,
        gradYear: role === 'Alumni' && year ? Number(year) : undefined,
      };
      const user = await api.auth.register(input);
      await api.users.update(user.id, {
        academicYear: academicYear
          ? (Number(academicYear[0]) as 1 | 2 | 3 | 4)
          : undefined,
        interestedOrgIds: followed,
        membershipVisibility: 'private',
        classmateOptIn: false,
      });
      for (const id of followed)
        await api.relationships.toggleFollow(user.id, id, 'org');
      getPlatform().setItem('lumi.goals', JSON.stringify(selectedGoals));
      await setCurrentUser(user);
      if (!embedded) replace('/');
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
  const types: Record<string, string> = {
    'Student Clubs': 'club',
    'Greek Life': 'greek',
    'Research Labs': 'lab',
    'Major / Department': 'department',
    Sports: 'club',
    'Cultural Groups': 'club',
    Residence: 'community',
    'Co-op': 'community',
  };
  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: C.bg }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => (step ? setStep(step - 1) : (onExit ?? back)())}
          style={{ padding: 8 }}
        >
          <ChevronLeft size={23} color={C.ink} />
        </Pressable>
        <Text style={[s.sub, { flex: 1 }]}>
          {BRAND.name} · {step + 1} of 6
        </Text>
        {step === 3 || step === 4 ? (
          <Pressable accessibilityRole="button" onPress={next}>
            <Text style={s.link}>Skip</Text>
          </Pressable>
        ) : null}
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 22,
            paddingTop: 4,
            paddingBottom: 30,
          }}
        >
          <Text style={[s.title, { marginBottom: 20 }]}>{titles[step]}</Text>
          {step === 0 && (
            <>
              <Text style={[s.sub, { marginBottom: 20 }]}>
                Choose what sounds like you. You can change this later.
              </Text>
              {goals.map((g) => (
                <Pressable
                  key={g}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selectedGoals.includes(g) }}
                  onPress={() => setGoals(toggle(selectedGoals, g))}
                  style={[
                    s.card,
                    s.row,
                    selectedGoals.includes(g) && s.selected,
                  ]}
                >
                  <Text style={[s.label, { flex: 1 }]}>{g}</Text>
                  {selectedGoals.includes(g) && (
                    <Check size={18} color={C.link} />
                  )}
                </Pressable>
              ))}
            </>
          )}
          {step === 1 && (
            <ValuePreview
              initialFeature={
                selectedGoals.includes('Plan my classes')
                  ? featureNames[0]
                  : selectedGoals.includes('Find events & opportunities')
                    ? featureNames[1]
                    : selectedGoals.includes('Explore clubs & groups')
                      ? featureNames[2]
                      : selectedGoals.includes('Meet new people')
                        ? featureNames[3]
                        : featureNames[0]
              }
            />
          )}
          {step === 2 && (
            <>
              <TextInput
                accessibilityLabel="Search universities"
                style={s.input}
                placeholder="Search universities"
                value={query}
                onChangeText={setQuery}
              />
              {schools.slice(0, 5).map((u) => (
                <Pressable
                  key={u.id}
                  onPress={() => {
                    setSchool(u);
                    setVerified(false);
                    setSent(false);
                  }}
                  style={[s.card, s.row, school?.id === u.id && s.selected]}
                >
                  <Text style={[s.label, { flex: 1 }]}>{u.name}</Text>
                  {school?.id === u.id && <Check size={18} color={C.link} />}
                </Pressable>
              ))}
              <Text style={[s.sub, { marginVertical: 14 }]}>
                Student status
              </Text>
              <Pills
                values={['Undergraduate', 'Graduate', 'Alumni']}
                value={role}
                onChange={setRole}
              />
              {role === 'Undergraduate' && (
                <>
                  <Text style={[s.sub, { marginTop: 16 }]}>
                    Year (optional)
                  </Text>
                  <Pills
                    values={['1st', '2nd', '3rd', '4th+']}
                    value={academicYear}
                    onChange={setAcademicYear}
                  />
                </>
              )}
              {role === 'Graduate' && (
                <View style={{ marginTop: 14 }}>
                  <Pills
                    values={["Master's", 'PhD']}
                    value={degree}
                    onChange={setDegree}
                  />
                </View>
              )}
              {role === 'Alumni' && (
                <TextInput
                  accessibilityLabel="Graduation year"
                  style={s.input}
                  placeholder="Graduation year (optional)"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={year}
                  onChangeText={setYear}
                />
              )}
            </>
          )}
          {step === 3 && (
            <>
              <Text style={[s.sub, { marginBottom: 20 }]}>
                Optional. Choose the content you'd like to discover.
              </Text>
              <View style={s.wrap}>
                {[
                  ['Internships', 'networking'],
                  ['Research', 'research'],
                  ['Hackathons', 'startup'],
                  ['Scholarships', 'study'],
                  ['Campus events', 'exhibition'],
                  ['Communities', 'club'],
                  ['Recreation', 'exercise'],
                  ['Dining', 'meal'],
                ].map(([name, id]) => (
                  <Pressable
                    key={id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: interests.includes(id) }}
                    style={[s.pill, interests.includes(id) && s.selected]}
                    onPress={() => setInterests(toggle(interests, id))}
                  >
                    <Text style={s.label}>{name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {step === 4 && (
            <>
              <Text style={[s.sub, { marginBottom: 14 }]}>
                Follow your interests. Membership is verified separately.
              </Text>
              <Pills
                values={Object.keys(types)}
                value={orgType}
                onChange={setOrgType}
              />
              <TextInput
                accessibilityLabel="Search organizations"
                style={s.input}
                value={orgQuery}
                onChangeText={setOrgQuery}
                placeholder="Search organizations"
              />
              {orgs
                .filter(
                  (o) =>
                    o.type === types[orgType] &&
                    o.name.toLowerCase().includes(orgQuery.toLowerCase()),
                )
                .map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => setFollowed(toggle(followed, o.id))}
                    style={[s.card, followed.includes(o.id) && s.selected]}
                  >
                    <Text style={s.label}>{o.name}</Text>
                    <Text style={s.sub}>
                      {followed.includes(o.id)
                        ? 'Selected to follow'
                        : 'Follow'}
                    </Text>
                  </Pressable>
                ))}
              {!orgs.length && (
                <Text style={[s.sub, { marginTop: 20 }]}>
                  No verified organization directory is connected for this
                  university yet. You can add communities later.
                </Text>
              )}
            </>
          )}
          {step === 5 && (
            <>
              <TextInput
                accessibilityLabel="Your name"
                placeholder="Your name"
                value={nickname}
                onChangeText={setNickname}
                style={s.input}
                maxLength={40}
              />
              <TextInput
                accessibilityLabel="Birth year"
                placeholder="Birth year (private)"
                value={birthYear}
                onChangeText={setBirthYear}
                keyboardType="number-pad"
                maxLength={4}
                style={s.input}
              />
              <TextInput
                accessibilityLabel="School email"
                placeholder="School email"
                value={email}
                editable={!verified}
                onChangeText={(value) => {
                  setEmail(value);
                  setSent(false);
                  setVerified(false);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                style={s.input}
              />
              {sent && !verified && (
                <TextInput
                  accessibilityLabel="Verification code"
                  value={code}
                  onChangeText={setCode}
                  placeholder="Verification code"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={s.input}
                />
              )}
              <Button
                variant="outline"
                disabled={verified || !email.includes('@')}
                loading={busy}
                onPress={verify}
              >
                {verified
                  ? 'Email verified'
                  : sent
                    ? 'Verify email'
                    : 'Send code'}
              </Button>
              {!!hint && (
                <Text style={[s.sub, { marginTop: 10 }]}>
                  {apiMode === 'mock' ? 'Local development code: 123456' : hint}
                </Text>
              )}
              <Text style={[s.sub, { marginTop: 24 }]}>
                Your timetable, housing and group memberships start private. Add
                optional profile details whenever you're ready.
              </Text>
              <View style={[s.row, { marginTop: 14 }]}>
                <Pressable onPress={() => openLegal('terms')}>
                  <Text style={s.link}>Terms</Text>
                </Pressable>
                <Pressable onPress={() => openLegal('privacy')}>
                  <Text style={s.link}>Privacy</Text>
                </Pressable>
              </View>
            </>
          )}
          {!!error && (
            <Text
              accessibilityRole="alert"
              style={{ color: C.danger, marginVertical: 12 }}
            >
              {error}
            </Text>
          )}
          <View style={{ marginTop: 24 }}>
            <Button
              full
              size="lg"
              onPress={step === 5 ? finish : next}
              loading={busy}
              disabled={(step === 2 && !school) || (step === 5 && !verified)}
            >
              {step === 5 ? 'Get Started' : 'Continue'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
