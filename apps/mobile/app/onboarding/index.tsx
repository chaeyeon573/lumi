import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, GraduationCap, Search, ShieldCheck, Plus, Trash2, Sparkles, ChevronRight, ChevronLeft, ChevronDown, Mail, Briefcase, Upload, BadgeCheck } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { RegisterInput } from '@core/api';
import { api, apiMode } from '@core/api';
import type { Course, Interest, School, Stage, Visibility, ProfileField, Goal, VerificationMethod, Wants, PeopleWant, ActivityWant, Research, OpenTo, Purpose } from '@core/types';
import { STAGE_ROLE, ALUMNI_VERIFICATIONS } from '@core/types';
import { peopleWantOptions, activityWantOptions, PEOPLE_WANT_LABELS, PEOPLE_WANT_EMOJI, ACTIVITY_WANT_LABELS, ACTIVITY_WANT_EMOJI, openToFromWants } from '@core/lib/wants';
import type { StageKind } from '@core/lib/stage';
import { ONBOARDING_INTERESTS, INTEREST_EMOJI, INTEREST_LABELS, ALL_GOALS, GOAL_EMOJI, GOAL_LABELS } from '@core/lib/labels';
import { localeContext, type VerificationOption } from '@core/lib/locale-context';
import { useAppStore } from '@core/store/useAppStore';
import { getPlatform } from '@core/platform';
import { uid } from '@core/lib/format';
import { DAY_LABELS, toMin } from '@core/lib/timetable';
import { verificationLabel } from '@core/lib/network';
import { DEMO_TIMETABLE as DEMO_TIMETABLE_KO } from '@core/data/seed';
import { DEMO_TIMETABLE as DEMO_TIMETABLE_EN } from '@core/data/seed.en';
import { tw } from '@/tw';
import { back, replace } from '@/nav';
import { Avatar, BottomSheet, Button, Chip, Field, IconBtn, Input, Segmented, C } from '@/ui';
import { ResearchFields } from '@/v2/ResearchFields';
import { CityPicker, Heading, Row, Wrap, WChip } from '@/v2/Forms';
import { openLegal } from '@/legal';

/**
 * 온보딩 (웹 OnboardingPage) — 한 화면 안에서 단계를 넘긴다 (뒤로가기 = 이전 단계).
 * 2 school → 3 verify → 4 stage → 5 basic → 6 interests → 7 region → 8 wants → (대학원생 9 research) → 시간표(재학생) | 현재 직업(졸업생)
 */
const STEPS = ['school', 'verify', 'stage', 'basic', 'interests', 'region', 'wants', 'research', 'schedule', 'career'] as const;
type Step = typeof STEPS[number];
const TOTAL = 9;
const STEP_NO: Record<Step, number> = { school: 2, verify: 3, stage: 4, basic: 5, interests: 6, region: 7, wants: 8, research: 9, schedule: 9, career: 9 };
const isGradLike = (s?: Stage) => s === 'masters' || s === 'phd';
const isAlumniLike = (s?: Stage) => s === 'alumni' || s === 'professional';
const kindOfStage = (s?: Stage): StageKind => (isAlumniLike(s) ? 'alumni' : isGradLike(s) ? 'grad' : 'undergrad');
const FIRSTRUN_KEY = 'aroundu.firstrun';
const EMOJIS = ['🙂', '😎', '🧑‍💻', '👩‍🎨', '🧑‍🔬', '🏃', '🎸', '📚', '🌱', '🎨', '🚀', '🧗', '☕', '🐱', '🦊', '🎧'];
const HUES = [220, 160, 15, 280, 45, 330, 120, 200, 60, 300];
const DEFAULT_FV: Record<ProfileField, Visibility> = { bio: 'school', likes: 'school', freeTime: 'school', height: 'private', availability: 'school', preferredPartner: 'private', purposes: 'school', interests: 'public', posts: 'school', prompts: 'public', timetable: 'friends', goals: 'school', living: 'friends' };
const MAX_INTERESTS = 5;
const THIS_YEAR = new Date().getFullYear();
const entryYearOf = (stage: Stage | undefined, gradYear: number) => (isAlumniLike(stage) ? gradYear : stage === 'phd' ? gradYear - 5 : stage === 'masters' ? gradYear - 2 : gradYear - 4);
/** Open To → 기존 purposes 호환 (웹 purposesFromOpenTo) */
function purposesFromOpenTo(openTo: OpenTo[]): Purpose[] {
  const out = new Set<Purpose>();
  openTo.forEach((o) => out.add(o === 'coffee' || o === 'activities' ? 'friend' : o === 'research' ? 'study' : 'networking'));
  return out.size ? [...out] : ['any'];
}

type Draft = RegisterInput & { avatarType: 'face' | 'masked' | 'back'; email: string; codeSent: boolean; schoolName: string; emailDomain: string; wants: Wants; /** 이용약관·개인정보처리방침 동의 (필수, 기본 프로필 단계) */ agreedTerms: boolean };
const initial: Draft = {
  nickname: '', birthYear: 2003, gender: 'private', avatar: { emoji: '🙂', hue: 210, photoType: 'face' }, avatarType: 'face', agreedTerms: false,
  schoolId: '', schoolName: '', emailDomain: '', role: 'undergraduate', department: '', year: THIS_YEAR, emailVerified: false, showSchool: true, showDepartment: true, email: '', codeSent: false,
  stage: 'undergrad', career: {}, openTo: [], homeCity: '', activityCity: '', gradYear: THIS_YEAR + 2, verification: undefined, wants: { people: [], activities: [] },
  interests: [], purposes: [], bio: '', likes: '', freeTime: '', height: undefined, availability: 'after18', preferredPartner: undefined,
  fieldVisibility: DEFAULT_FV, prompts: [], voicePrompt: undefined, poll: undefined, timetable: [], goals: [], lookingFor: [], canOffer: [], living: undefined, meetPreference: [], locationPermission: 'undecided', notifications: true,
};
/** 세션 동안만 기억하는 초안 (웹 sessionStorage 와 같은 수명) */
let memoryDraft: { form: Draft; history: Step[] } | null = null;

/** 로그아웃 상태의 시작 화면에서 띄운 경우 — 가입이 끝나면 루트 레이아웃이 알아서 홈을 보여주므로 라우터를 건드리지 않는다 */
const FlowCtx = createContext<{ embedded: boolean; goBasic: () => void }>({ embedded: false, goBasic: () => {} });

/** 라우트 /onboarding (설정 › 데모 도구 › 새 계정으로 시작하기) */
export default function OnboardingScreen() {
  return <OnboardingFlow />;
}

/** 온보딩 흐름 — onExit: 첫 단계에서 뒤로 (없으면 라우터 back). embedded: 시작 화면(로그아웃 상태)에서 띄움 */
export function OnboardingFlow({ onExit, embedded = false }: { onExit?: () => void; embedded?: boolean }) {
  const [form, setForm] = useState<Draft>(() => memoryDraft?.form ?? initial);
  const [history, setHistory] = useState<Step[]>(() => memoryDraft?.history ?? ['school']);
  useEffect(() => { memoryDraft = { form, history }; }, [form, history]);
  const patch = (p: Partial<Draft>) => setForm((f) => ({ ...f, ...p }));
  const alumni = isAlumniLike(form.stage);
  const grad = isGradLike(form.stage);
  // 단계 가드 — 상태가 바뀌면 맞지 않는 단계는 건너뛴다 (웹 Navigate 와 같음)
  const raw = history[history.length - 1];
  const step: Step = raw === 'research' && !grad ? (alumni ? 'career' : 'schedule') : raw === 'schedule' && alumni ? 'career' : raw === 'career' && !alumni ? 'schedule' : raw;
  const go = (s: Step) => setHistory((h) => [...h, s]);
  const prev = () => { if (history.length > 1) setHistory((h) => h.slice(0, -1)); else (onExit ?? back)(); };
  const n = grad && step === 'schedule' ? 10 : STEP_NO[step];
  const total = grad ? 10 : TOTAL;
  const titles: Record<Step, string> = { school: t('학교 선택'), verify: t('학교 인증하기'), stage: t('현재 상태'), basic: t('기본 프로필'), interests: t('관심사'), region: t('지역'), wants: t('찾는 것'), research: t('연구'), schedule: t('시간표'), career: t('현재 직업') };
  const props = { form, patch };

  return (
    <FlowCtx.Provider value={{ embedded, goBasic: () => setHistory((h) => [...h, 'basic']) }}>
    <SafeAreaView edges={['top', 'bottom']} style={tw`flex-1 bg-white`}>
      <View style={tw`h-14 pl-1 pr-3 flex-row items-center`}>
        <IconBtn onPress={prev}><ChevronLeft size={26} color={C.primary} /></IconBtn>
        <Text numberOfLines={1} style={tw`flex-1 ml-1 text-[15px] font-bold text-ink`}>{titles[step]} <Text style={tw`font-medium text-ink-3`}>{n}/{total}</Text></Text>
      </View>
      <View style={tw`px-4 pt-1`}><View style={tw`h-1.5 rounded-full bg-line overflow-hidden`}><View style={[tw`h-full bg-primary`, { width: `${(n / total) * 100}%` }]} /></View></View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tw`flex-1`}>
        <ScrollView key={step} contentContainerStyle={tw`px-4 pt-5 pb-10`} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 'school' && <SchoolStep {...props} next={() => go('verify')} />}
          {step === 'verify' && <VerifyStep {...props} next={() => go('stage')} />}
          {step === 'stage' && <StageStep {...props} next={() => go('basic')} />}
          {step === 'basic' && <BasicStep {...props} next={() => go('interests')} />}
          {step === 'interests' && <InterestsStep {...props} next={() => go('region')} />}
          {step === 'region' && <RegionStep {...props} next={() => go('wants')} />}
          {step === 'wants' && <WantsStep {...props} next={() => go(alumni ? 'career' : grad ? 'research' : 'schedule')} />}
          {step === 'research' && <ResearchStep {...props} next={() => go('schedule')} />}
          {step === 'schedule' && <ScheduleStep {...props} />}
          {step === 'career' && <CareerStep {...props} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </FlowCtx.Provider>
  );
}

type StepProps = { form: Draft; patch: (p: Partial<Draft>) => void; next?: () => void };
const Next = ({ onPress, disabled, children, loading, variant }: { onPress?: () => void; disabled?: boolean; children?: ReactNode; loading?: boolean; variant?: 'primary' | 'outline' }) => (
  <Row style={tw`mt-5`}><Button full size="lg" variant={variant} disabled={disabled} loading={loading} onPress={onPress}>{children ?? t('다음')}</Button></Row>
);

/** 가입 실행 — 재학생은 schedule, 졸업생은 career 마지막 화면에서 호출 */
function useFinish(form: Draft) {
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const { embedded, goBasic } = useContext(FlowCtx);
  const [busy, setBusy] = useState(false);
  const finish = async (override: Partial<RegisterInput> = {}) => {
    // 약관 동의 없이는 계정을 만들지 않는다 (기본 프로필 단계로 돌려보냄)
    if (!form.agreedTerms) { showToast(t('이용약관과 개인정보처리방침에 동의해주세요.'), 'error'); goBasic(); return; }
    setBusy(true);
    try {
      const { avatarType: _a, codeSent: _c, schoolName: _s, emailDomain: _d, agreedTerms: _t, ...input } = form;
      const alumni = isAlumniLike(input.stage);
      const openTo = openToFromWants(form.wants);
      const career = alumni ? { ...(input.career ?? {}), city: input.career?.city || input.homeCity || undefined } : undefined;
      const hasCareer = !!career && Object.values(career).some(Boolean);
      const user = await api.auth.register({
        ...input,
        email: input.email.trim() || undefined,
        role: STAGE_ROLE[input.stage ?? 'undergrad'],
        year: entryYearOf(input.stage, input.gradYear ?? THIS_YEAR),
        preferredPartner: input.preferredPartner || undefined,
        homeCity: input.homeCity?.trim() || undefined,
        activityCity: input.activityCity?.trim() || undefined,
        openTo,
        purposes: purposesFromOpenTo(openTo),
        wants: form.wants,
        research: isGradLike(input.stage) && input.research?.field?.trim() ? input.research : undefined,
        career: hasCareer ? career : undefined,
        timetable: alumni ? [] : input.timetable,
        ...override,
      });
      memoryDraft = null;
      try { getPlatform().setItem(FIRSTRUN_KEY, '1'); } catch { /* */ }
      await setCurrentUser(user);
      if (!embedded) replace('/');
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };
  return { finish, busy };
}

/** 카드 목록 한 행 (학교 · 인증 방법) */
function PickRow({ active, done, icon, title, sub, onPress, disabled, first }: { active?: boolean; done?: boolean; icon: ReactNode; title: string; sub: string; onPress: () => void; disabled?: boolean; first?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={tw`px-4 py-3 flex-row items-center ${first ? '' : 'border-t border-line'} ${disabled ? 'opacity-50' : ''} ${done ? 'bg-mint-soft' : active ? 'bg-primary-soft' : ''}`}>
      <View style={tw`h-10 w-10 rounded-full items-center justify-center ${done ? 'bg-mint' : active ? 'bg-primary' : 'bg-surface-2'}`}>{icon}</View>
      <View style={tw`flex-1 min-w-0 mx-3`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{title}</Text><Text numberOfLines={2} style={tw`text-[12px] text-ink-3`}>{sub}</Text></View>
      {done ? null : active ? <Check size={18} color={C.primary} /> : <ChevronRight size={16} color={C.ink3} />}
    </Pressable>
  );
}
const Box = ({ children }: { children: ReactNode }) => <View style={tw`card overflow-hidden`}>{children}</View>;

// ─── 2. 학교 선택 ──────────────────────────────────────────────────────────────
function SchoolStep({ form, patch, next }: StepProps) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    let alive = true;
    setSearching(true);
    api.schools.search(q).then((r) => { if (alive) { setResults(r); setSearching(false); } }).catch(() => { if (alive) setSearching(false); });
    return () => { alive = false; };
  }, [q]);
  const select = (s: School) => {
    const changed = s.id !== form.schoolId;
    patch({ schoolId: s.id, schoolName: s.name, emailDomain: s.emailDomain, ...(changed ? { emailVerified: false, verification: undefined, codeSent: false } : {}) });
  };
  return (
    <>
      <Heading title={t('학교를 선택해주세요')} sub={t('검증된 학교에서 시작해요. 같은 학교 사람들부터 가볍게 만나요.')} />
      <View style={tw`h-12 mb-3 px-3.5 rounded-2xl border border-input-line flex-row items-center`}><Search size={16} color={C.ink3} /><Input style={tw`flex-1 h-11 border-0 px-2`} placeholder={t('학교명 또는 지역')} value={q} onChangeText={setQ} /></View>
      <Box>
        {searching && results.length === 0 ? <Text style={tw`px-4 py-3 text-[12px] text-ink-3`}>{t('검색 중…')}</Text> : null}
        {!searching && results.length === 0 ? <Text style={tw`px-4 py-3 text-[12px] text-ink-3`}>{t('검색 결과가 없어요')}</Text> : null}
        {results.map((s, i) => { const active = form.schoolId === s.id; return (
          <PickRow key={s.id} first={i === 0} active={active} icon={<GraduationCap size={18} color={active ? C.onPrimary : C.primary} />} title={s.name} sub={`${s.region} · @${s.emailDomain}`} onPress={() => select(s)} />
        ); })}
      </Box>
      <Next disabled={!form.schoolId} onPress={next} />
    </>
  );
}

// ─── 3. 학교 인증 — 재학생 / 졸업생 방법. 하나 이상 완료해야 진행 ──────────────
function VerifyStep({ form, patch, next }: StepProps) {
  const ctx = localeContext();
  const options = useMemo(() => ctx.verifications(form.emailDomain || 'school.edu'), [ctx, form.emailDomain]);
  const [picked, setPicked] = useState<VerificationMethod | null>(form.verification ?? null);
  const [instant, setInstant] = useState<VerificationOption | null>(null);
  const [code, setCode] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const showToast = useAppStore((s) => s.showToast);
  const done = !!form.verification;

  const complete = (method: VerificationMethod) => {
    const alum = ALUMNI_VERIFICATIONS.includes(method);
    patch({ verification: method, emailVerified: true, ...(alum && !isAlumniLike(form.stage) ? { stage: 'alumni', role: 'alumni' } : {}) });
    setInstant(null);
    showToast(t('학교 인증이 완료되었어요!'), 'success');
  };
  const pick = (o: VerificationOption) => { if (done) return; setPicked(o.method); if (o.demo === 'instant') setInstant(o); };
  const sendCode = async () => {
    setBusy(true);
    try { const r = await api.schools.sendVerificationCode(form.email.trim(), form.schoolId); setHint(r.hint); if (r.ok) patch({ codeSent: true }); else showToast(r.hint, 'error'); }
    catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const verify = async () => {
    if (!picked) return;
    setBusy(true);
    try { const r = await api.schools.verifyCode(form.email.trim(), code.trim()); if (r.ok) complete(picked); else showToast(t('인증 코드가 올바르지 않아요.'), 'error'); }
    catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const group = (label: string, list: VerificationOption[]) => (
    <View style={tw`mt-4`}>
      <Text style={tw`px-1 mb-2 text-[12px] font-bold text-ink-3`}>{label}</Text>
      <Box>{list.map((o, i) => { const active = picked === o.method; const fin = form.verification === o.method; return (
        <PickRow key={o.method} first={i === 0} active={active} done={fin} disabled={done && !fin} icon={fin ? <Check size={18} color={C.onPrimary} /> : o.demo === 'code' ? <Mail size={17} color={active ? C.onPrimary : C.primary} /> : <Upload size={17} color={active ? C.onPrimary : C.primary} />} title={o.title} sub={o.desc} onPress={() => pick(o)} />
      ); })}</Box>
    </View>
  );
  const codeCard = picked && !done && options.find((o) => o.method === picked && o.demo === 'code');

  return (
    <>
      <Heading title={t('학교를 인증해주세요')} sub={t('AroundU는 인증된 사람만 만나요. 방법을 하나 골라 완료하면 프로필에 ✓ 배지가 붙어요.')} />
      <View style={tw`card p-3.5 flex-row items-center`}>
        <View style={tw`h-10 w-10 rounded-full bg-primary-soft items-center justify-center`}><GraduationCap size={18} color={C.primary} /></View>
        <View style={tw`flex-1 min-w-0 mx-3`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{form.schoolName}</Text><Text style={tw`text-[12px] text-ink-3`}>@{form.emailDomain}</Text></View>
        {done ? <BadgeCheck size={20} color={C.verify} /> : null}
      </View>
      {done ? (
        <View style={tw`mt-4 rounded-2xl bg-mint-soft px-4 py-3.5 flex-row items-center`}><Check size={16} color={C.mint} /><Text style={tw`ml-2 text-[14px] font-semibold text-mint`}>{verificationLabel(form.verification!, lang)} · {t('완료')}</Text></View>
      ) : (
        <>
          {group(t('재학생'), options.filter((o) => o.for === 'student'))}
          {codeCard ? (
            <View style={tw`mt-3 card p-4`}>
              <Field label={t('학교 이메일')} hint={hint || `@${form.emailDomain}${t(' 이메일로 인증 코드를 보내드려요.')}`}>
                <Row><Input style={tw`flex-1`} keyboardType="email-address" autoCapitalize="none" placeholder={`id@${form.emailDomain}`} value={form.email} onChangeText={(email) => patch({ email, codeSent: false })} /><View style={tw`w-2`} /><Button variant="secondary" onPress={sendCode} loading={busy && !form.codeSent} disabled={!form.email.includes('@')}>{t('코드 전송')}</Button></Row>
              </Field>
              {form.codeSent ? (
                <Field label={t('인증 코드')} hint={apiMode === 'mock' ? t('데모 인증 코드: 123456') : undefined}>
                  <Row><Input style={tw`flex-1`} keyboardType="number-pad" placeholder="123456" value={code} onChangeText={setCode} maxLength={6} autoFocus /><View style={tw`w-2`} /><Button onPress={verify} loading={busy} disabled={code.trim().length < 6}>{t('확인')}</Button></Row>
                </Field>
              ) : null}
            </View>
          ) : null}
          {group(t('졸업생'), options.filter((o) => o.for === 'alumni'))}
        </>
      )}
      <View style={tw`mt-4 rounded-2xl bg-surface-2 px-3.5 py-3 flex-row`}><ShieldCheck size={16} color={C.mint} /><Text style={tw`ml-2 flex-1 text-[12px] text-ink-2`}>{t('인증이 완료되면 AroundU의 모든 기능을 이용할 수 있습니다.')}</Text></View>
      <Next disabled={!done} onPress={next} />

      <BottomSheet open={!!instant} onClose={() => setInstant(null)} title={t('데모: 즉시 인증')}>
        {instant ? (
          <View>
            <View style={tw`flex-row items-center`}><View style={tw`h-11 w-11 rounded-2xl bg-primary-soft items-center justify-center`}><Upload size={20} color={C.primary} /></View><View style={tw`flex-1 ml-3`}><Text style={tw`text-[15px] font-bold text-ink`}>{instant.title}</Text><Text style={tw`text-[12px] text-ink-3`}>{instant.desc}</Text></View></View>
            <Text style={tw`mt-4 text-[13px] text-ink-2`}>{t('실제 서비스에서는 학교 시스템 또는 서류 확인을 거쳐요. 데모에서는 바로 완료 처리돼요.')}</Text>
            <Row style={tw`mt-4`}><Button full size="lg" icon={<Check size={16} color={C.onPrimary} />} onPress={() => complete(instant.method)}>{t('인증 완료')}</Button></Row>
          </View>
        ) : null}
      </BottomSheet>
    </>
  );
}

// ─── 4. 현재 상태 — 학부생 / 대학원생(석사·박사) / 졸업생 ───────────────────────
function StageStep({ form, patch, next }: StepProps) {
  const isGrad = isGradLike(form.stage);
  const cards: { key: string; emoji: string; title: string; sub: string; active: boolean; stage: Stage }[] = [
    { key: 'undergrad', emoji: '🎓', title: t('학부생'), sub: t('학부 재학 중'), active: form.stage === 'undergrad', stage: 'undergrad' },
    { key: 'grad', emoji: '📘', title: t('대학원생'), sub: t('석사 · 박사 과정'), active: isGrad, stage: 'masters' },
    { key: 'alumni', emoji: '🧑‍💼', title: t('졸업생'), sub: t('졸업 후에도 관계망은 그대로예요'), active: isAlumniLike(form.stage), stage: 'alumni' },
  ];
  const setStage = (s: Stage) => patch({ stage: s, role: STAGE_ROLE[s], gradYear: isAlumniLike(s) ? Math.min(form.gradYear ?? THIS_YEAR, THIS_YEAR) : Math.max(form.gradYear ?? THIS_YEAR + 1, THIS_YEAR + 1) });
  return (
    <>
      <Heading title={t('지금 어떤 상태인가요?')} sub={t('상태에 따라 홈과 추천이 달라져요. 언제든 프로필에서 바꿀 수 있어요.')} />
      {cards.map((c) => (
        <View key={c.key} style={tw`mb-2.5 rounded-[22px] border ${c.active ? 'border-primary bg-primary-soft' : 'border-line bg-white'}`}>
          <Pressable onPress={() => { if (!(c.key === 'grad' && isGrad)) setStage(c.stage); }} style={tw`p-4 flex-row items-center`}>
            <View style={tw`h-11 w-11 rounded-2xl items-center justify-center ${c.active ? 'bg-primary' : 'bg-surface-2'}`}><Text style={tw`text-[22px]`}>{c.emoji}</Text></View>
            <View style={tw`flex-1 min-w-0 mx-3`}><Text style={tw`text-[15px] font-bold text-ink`}>{c.title}</Text><Text style={tw`text-[12px] text-ink-3`}>{c.sub}</Text></View>
            {c.active ? <Check size={18} color={C.primary} /> : null}
          </Pressable>
          {c.key === 'grad' && isGrad ? <View style={tw`px-4 pb-4`}><Segmented<'masters' | 'phd'> value={form.stage as 'masters' | 'phd'} onChange={setStage} options={[['masters', t('석사')], ['phd', t('박사')]]} /></View> : null}
        </View>
      ))}
      <Next onPress={next} />
    </>
  );
}

// ─── 5. 기본 프로필 — 아바타 · 이름 · 전공 · 졸업연도 · 생년 · 이메일 ───────────
function YearChips({ years, value, onChange }: { years: number[]; value?: number; onChange: (y: number) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4`} contentContainerStyle={tw`px-4 py-1`}>{years.map((y) => <Chip key={y} size="sm" active={value === y} onPress={() => onChange(y)}>{y}</Chip>)}</ScrollView>;
}
function BasicStep({ form, patch, next }: StepProps) {
  const ctx = localeContext();
  const alumni = isAlumniLike(form.stage);
  const gradYears = alumni ? Array.from({ length: 40 }, (_, i) => THIS_YEAR - i) : Array.from({ length: 6 }, (_, i) => THIS_YEAR + i);
  const birthYears = Array.from({ length: 40 }, (_, i) => THIS_YEAR - 17 - i);
  const valid = form.nickname.trim().length >= 2 && form.email.includes('@') && !!form.avatar.emoji && !!form.gradYear && form.agreedTerms;
  const majors = ctx.majors.filter((m) => !form.department || m.toLowerCase().includes(form.department.toLowerCase())).slice(0, 6);
  return (
    <>
      <Heading title={t('기본 프로필을 만들어요')} sub={t('직함이 아니라 사람이 먼저예요. 이름·전공·졸업연도만 있으면 돼요.')} />
      <Field label={`${t('아바타')} *`} hint={t('얼굴 공개를 권장하지만 마스크, 가면, 뒷모습 사진도 괜찮아요. (데모에서는 이모지로 대체)')}>
        <View style={tw`flex-row items-center mb-3`}>
          <Avatar emoji={form.avatar.emoji} hue={form.avatar.hue} size={72} style={tw`rounded-3xl`} />
          <View style={tw`flex-1 ml-4`}>
            <Segmented<Draft['avatarType']> value={form.avatarType} onChange={(v) => patch({ avatarType: v, avatar: { ...form.avatar, photoType: v } })} options={[['face', t('얼굴')], ['masked', t('마스크·가면')], ['back', t('뒷모습')]]} />
            <View style={tw`mt-2 flex-row flex-wrap`}>{HUES.map((h) => <Pressable key={h} onPress={() => patch({ avatar: { ...form.avatar, hue: h } })} accessibilityLabel={t('배경 색상')} style={tw`mr-1 mb-1 rounded-full ${form.avatar.hue === h ? 'border-2 border-primary' : ''}`}><Avatar emoji="" hue={h} size={22} /></Pressable>)}</View>
          </View>
        </View>
        <View style={tw`flex-row flex-wrap -mx-0.5`}>{EMOJIS.map((e) => <View key={e} style={tw`w-1/8 p-0.5`}><Pressable onPress={() => patch({ avatar: { ...form.avatar, emoji: e } })} style={tw`h-10 rounded-xl items-center justify-center ${form.avatar.emoji === e ? 'bg-primary-soft border-2 border-primary' : 'bg-surface-2'}`}><Text style={tw`text-[20px]`}>{e}</Text></Pressable></View>)}</View>
      </Field>
      <Field label={`${t('이름 또는 닉네임')} *`}><Input placeholder={t('예: 하늘')} value={form.nickname} onChangeText={(nickname) => patch({ nickname })} maxLength={12} /></Field>
      <Field label={t('전공')} hint={t('선택이지만 적으면 같은 전공 사람을 더 잘 찾아요.')}>
        <Input placeholder={ctx.majors[0]} value={form.department} onChangeText={(department) => patch({ department })} />
        {majors.length && !ctx.majors.includes(form.department) ? <View style={tw`mt-2`}><Wrap>{majors.map((m) => <WChip key={m} onPress={() => patch({ department: m })}>{m}</WChip>)}</Wrap></View> : null}
      </Field>
      <Field label={`${alumni ? t('졸업 연도') : t('졸업 예정 연도')} *`}><YearChips years={gradYears} value={form.gradYear} onChange={(gy) => patch({ gradYear: gy, year: entryYearOf(form.stage, gy) })} /></Field>
      <Field label={`${t('생년')} *`}><YearChips years={birthYears} value={form.birthYear} onChange={(birthYear) => patch({ birthYear })} /></Field>
      <Field label={`${t('이메일')} *`} hint={form.emailVerified && form.email ? t('인증에 쓴 이메일이에요. 로그인에 쓰여요.') : t('로그인에 쓰여요. 프로필에는 보이지 않아요.')}>
        <Input keyboardType="email-address" autoCapitalize="none" placeholder={`you@${form.emailDomain || 'school.edu'}`} value={form.email} onChangeText={(email) => patch({ email })} />
      </Field>
      <TermsConsent checked={form.agreedTerms} onChange={(agreedTerms) => patch({ agreedTerms })} />
      <Next disabled={!valid} onPress={next} />
    </>
  );
}

/** 이용약관·개인정보처리방침 동의 (필수) — App Store 1.2 (UGC) */
function TermsConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const link = (page: 'terms' | 'privacy', label: string) => <Text onPress={() => openLegal(page)} accessibilityRole="link" style={tw`font-semibold text-primary underline`}>{label}</Text>;
  const terms = link('terms', t('이용약관'));
  const privacy = link('privacy', t('개인정보처리방침'));
  return (
    <View style={tw`rounded-2xl border border-line bg-white px-3.5 py-3`}>
      <View style={tw`flex-row items-start`}>
        <Pressable onPress={() => onChange(!checked)} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={t('이용약관과 개인정보처리방침에 동의해요 (필수)')}
          style={tw`h-5 w-5 mt-0.5 rounded-md items-center justify-center ${checked ? 'bg-primary' : 'border-2 border-line bg-white'}`}>
          {checked ? <Check size={14} color={C.onPrimary} /> : null}
        </Pressable>
        <Text onPress={() => onChange(!checked)} style={tw`flex-1 ml-2.5 text-[13px] text-ink leading-5`}>{lang === 'en' ? <>I agree to the {terms} and {privacy} (required)</> : <>{terms}과 {privacy}에 동의해요 (필수)</>}</Text>
      </View>
      <Text style={tw`mt-1.5 ml-[30px] text-[12px] text-ink-3`}>{t('괴롭힘·혐오·스팸은 무관용으로 처리해요')}</Text>
    </View>
  );
}

// ─── 6. 관심사 (최대 5) + 목표(접힘) ───────────────────────────────────────────
function InterestsStep({ form, patch, next }: StepProps) {
  const [more, setMore] = useState(form.goals.length > 0);
  const full = form.interests.length >= MAX_INTERESTS;
  const toggleInterest = (i: Interest) => {
    if (form.interests.includes(i)) return patch({ interests: form.interests.filter((x) => x !== i) });
    if (full) return;
    patch({ interests: [...form.interests, i] });
  };
  const toggleGoal = (g: Goal) => patch({ goals: form.goals.includes(g) ? form.goals.filter((x) => x !== g) : [...form.goals, g] });
  return (
    <>
      <Heading title={t('관심사를 골라주세요')} sub={t('최대 5개. 사람·모임·피드 추천의 기준이 돼요.')} />
      <View style={tw`flex-row items-center justify-between mb-1.5`}><Text style={tw`text-[12px] font-bold text-ink-3`}>{t('관심사')} *</Text><Text style={tw`text-[12px] font-bold ${full ? 'text-primary' : 'text-ink-3'}`}>{form.interests.length}/{MAX_INTERESTS}</Text></View>
      <Wrap>{ONBOARDING_INTERESTS.map((i) => { const on = form.interests.includes(i); return <View key={i} style={tw`mb-2 ${!on && full ? 'opacity-40' : ''}`}><Chip active={on} onPress={() => toggleInterest(i)}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Chip></View>; })}</Wrap>
      <Pressable onPress={() => setMore((m) => !m)} style={tw`mt-3 flex-row items-center`}><ChevronDown size={15} color={C.primary} style={more ? { transform: [{ rotate: '180deg' }] } : undefined} /><Text style={tw`ml-1 text-[13px] font-semibold text-primary`}>{t('더 알려주기')}</Text><Text style={tw`text-[13px] text-ink-3`}> · {t('선택')}</Text></Pressable>
      {more ? <View style={tw`mt-3`}><Field label={t('이번 학기 목표')} hint={t('선택 사항 — 나중에 프로필에서 바꿀 수 있어요')}><Wrap>{ALL_GOALS.map((g) => <View key={g} style={tw`mb-2`}><Chip active={form.goals.includes(g)} onPress={() => toggleGoal(g)}>{GOAL_EMOJI[g]} {GOAL_LABELS[g]}</Chip></View>)}</Wrap></Field></View> : null}
      <Next disabled={form.interests.length === 0} onPress={next} />
    </>
  );
}

// ─── 7. 지역 — 거주 도시 + 주로 활동하는 지역(선택) ──────────────────────────────
function RegionStep({ form, patch, next }: StepProps) {
  const ctx = localeContext();
  const [showActivity, setShowActivity] = useState(!!form.activityCity);
  return (
    <>
      <Heading title={t('어디에서 지내나요?')} sub={t('같은 지역 사람과 모임을 먼저 보여드려요. 졸업 후에도 지역이 관계망을 이어줘요.')} />
      <Field label={`${t('거주 도시')} *`} hint={ctx.cityHint}><CityPicker value={form.homeCity ?? ''} onChange={(v) => patch({ homeCity: v })} placeholder={t('도시 검색')} cities={ctx.cities} /></Field>
      {showActivity
        ? <Field label={t('주로 활동하는 지역 (선택)')} hint={t('학교·직장이 있는 곳이 다르면 적어주세요.')}><CityPicker value={form.activityCity ?? ''} onChange={(v) => patch({ activityCity: v })} placeholder={t('도시 검색')} cities={ctx.cities} /></Field>
        : <Pressable onPress={() => setShowActivity(true)} style={tw`flex-row items-center`}><Plus size={15} color={C.primary} /><Text style={tw`ml-1 text-[13px] font-semibold text-primary`}>{t('주로 활동하는 지역 (선택)')}</Text></Pressable>}
      <Next disabled={!form.homeCity?.trim()} onPress={next} />
    </>
  );
}

// ─── 8. 무엇을 찾고 있나요? — 어떤 사람 · 어떤 활동 (단계별로 먼저 보여줄 답이 다르다) ─────
function WantsStep({ form, patch, next }: StepProps) {
  const w = form.wants;
  const kind = kindOfStage(form.stage);
  const toggleP = (p: PeopleWant) => patch({ wants: { ...w, people: w.people.includes(p) ? w.people.filter((x) => x !== p) : [...w.people, p] } });
  const toggleA = (a: ActivityWant) => patch({ wants: { ...w, activities: w.activities.includes(a) ? w.activities.filter((x) => x !== a) : [...w.activities, a] } });
  const valid = w.people.length > 0 && w.activities.length > 0;
  return (
    <>
      <Heading title={t('무엇을 찾고 있나요?')} sub={t('추천 사람·모임의 기준이 돼요. 각각 하나 이상 골라주세요.')} />
      <Field label={`${t('어떤 사람을 만나고 싶나요?')} * ${w.people.length}`}><Wrap>{peopleWantOptions(kind).map((p) => <View key={p} style={tw`mb-2`}><Chip active={w.people.includes(p)} onPress={() => toggleP(p)}>{PEOPLE_WANT_EMOJI[p]} {PEOPLE_WANT_LABELS[p]}</Chip></View>)}</Wrap></Field>
      <Field label={`${t('어떤 활동을 하고 싶나요?')} * ${w.activities.length}`}><Wrap>{activityWantOptions(kind).map((a) => <View key={a} style={tw`mb-2`}><Chip active={w.activities.includes(a)} onPress={() => toggleA(a)}>{ACTIVITY_WANT_EMOJI[a]} {ACTIVITY_WANT_LABELS[a]}</Chip></View>)}</Wrap></Field>
      <View style={tw`flex-row items-center`}><Sparkles size={13} color={C.primary} /><Text style={tw`ml-1.5 flex-1 text-[12px] text-ink-3`}>{t('언제든 프로필 › 추천 설정에서 바꿀 수 있어요.')}</Text></View>
      <Next disabled={!valid} onPress={next} />
    </>
  );
}

// ─── 9 (대학원생). 연구 — 분야 · 연구실 · N년차 · 세부 주제 · 지도교수(기본 비공개) ─────────
function ResearchStep({ form, patch, next }: StepProps) {
  const r: Partial<Research> = form.research ?? {};
  return (
    <>
      <Heading title={t('어떤 연구를 하고 있나요?')} sub={t('같은 분야 사람을 다른 학교 연구실까지 먼저 보여드려요. 분야만 적어도 충분해요.')} />
      <ResearchFields value={r} onChange={(research) => patch({ research: research as Research })} />
      <Next disabled={!r.field?.trim()} onPress={next} />
      <Row style={tw`mt-2`}><Button full size="lg" variant="outline" onPress={() => { patch({ research: undefined }); next?.(); }}>{t('나중에')}</Button></Row>
    </>
  );
}

// ─── 시간표 (재학생) — 수업 추가 / 샘플 / 불러오기(데모) / 나중에 ──────────────
function ScheduleStep({ form, patch }: StepProps) {
  const ctx = localeContext();
  const showToast = useAppStore((s) => s.showToast);
  const { finish, busy } = useFinish(form);
  const [draft, setDraft] = useState({ name: '', day: 0, start: '10:00', end: '11:15' });
  const timetable = form.timetable ?? [];
  const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
  const canAdd = draft.name.trim().length > 0 && HHMM.test(draft.start) && HHMM.test(draft.end) && toMin(draft.end) > toMin(draft.start);
  const addClass = () => {
    if (!canAdd) return;
    const c: Course = { id: uid('c'), name: draft.name.trim(), day: draft.day, start: draft.start, end: draft.end, hue: HUES[timetable.length % HUES.length] };
    patch({ timetable: [...timetable, c] });
    setDraft({ name: '', day: draft.day, start: draft.end, end: draft.end });
    showToast(t('수업을 추가했어요.'), 'success');
  };
  const loadSample = () => {
    patch({ timetable: (lang === 'en' ? DEMO_TIMETABLE_EN : DEMO_TIMETABLE_KO).map((c) => ({ ...c, id: uid('c') })) });
    showToast(t('샘플 시간표를 불러왔어요.'), 'success');
  };
  return (
    <>
      <Heading title={t('시간표를 설정해요')} sub={t('공강이 겹치는 사람을 찾고, 수업별 스터디에 들어갈 수 있어요. 강의실은 절대 공개되지 않아요.')} />
      <Box>
        {ctx.scheduleImport.map((label, i) => { const last = i === ctx.scheduleImport.length - 1; return (
          <Pressable key={label} onPress={() => { if (!last) showToast(t('데모에서는 직접 입력 또는 샘플 시간표를 써주세요.'), 'info'); }} style={tw`px-4 py-3 flex-row items-center ${i ? 'border-t border-line' : ''}`}>
            <View style={tw`h-9 w-9 rounded-xl bg-primary-soft items-center justify-center`}><Upload size={16} color={C.primary} /></View>
            <Text style={tw`flex-1 mx-3 text-[14px] font-semibold text-ink`}>{label}</Text>
            {!last ? <View style={tw`h-5 px-2 rounded-full bg-surface-2 justify-center`}><Text style={tw`text-[11px] font-bold text-ink-3`}>{t('준비 중')}</Text></View> : <ChevronDown size={16} color={C.ink3} />}
          </Pressable>
        ); })}
      </Box>
      <View style={tw`mt-3 card p-4`}>
        <View style={tw`flex-row items-center mb-3`}><Plus size={15} color={C.primary} /><Text style={tw`ml-1.5 text-[14px] font-bold text-ink`}>{t('수업 추가')}</Text></View>
        <Field label={t('수업 이름')}><Input placeholder={t('예: 데이터베이스')} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} /></Field>
        <Field label={t('요일')}><Wrap>{[0, 1, 2, 3, 4].map((d) => <WChip key={d} active={draft.day === d} onPress={() => setDraft({ ...draft, day: d })}>{DAY_LABELS[d]}</WChip>)}</Wrap></Field>
        <View style={tw`flex-row`}>
          <View style={tw`flex-1 mr-1`}><Field label={t('시작')}><Input placeholder="10:00" value={draft.start} onChangeText={(start) => setDraft({ ...draft, start })} /></Field></View>
          <View style={tw`flex-1 ml-1`}><Field label={t('종료')}><Input placeholder="11:15" value={draft.end} onChangeText={(end) => setDraft({ ...draft, end })} /></Field></View>
        </View>
        <Row><Button full variant="secondary" icon={<Plus size={15} color={C.primary} />} disabled={!canAdd} onPress={addClass}>{t('추가')}</Button></Row>
      </View>
      {timetable.length > 0 ? (
        <View style={tw`mt-3`}><Box>
          {timetable.map((c, i) => (
            <View key={c.id} style={tw`px-4 py-2.5 flex-row items-center ${i ? 'border-t border-line' : ''}`}>
              <Avatar emoji="" hue={c.hue} size={32} />
              <View style={tw`flex-1 min-w-0 mx-3`}><Text numberOfLines={1} style={tw`text-[14px] font-semibold text-ink`}>{c.name}</Text><Text style={tw`text-[12px] text-ink-3`}>{DAY_LABELS[c.day]} · {c.start}–{c.end}</Text></View>
              <Pressable onPress={() => patch({ timetable: timetable.filter((x) => x.id !== c.id) })} accessibilityLabel={t('삭제')} style={tw`h-9 w-9 rounded-full items-center justify-center`}><Trash2 size={16} color={C.ink3} /></Pressable>
            </View>
          ))}
        </Box></View>
      ) : null}
      <Row style={tw`mt-3`}><Button full variant="outline" icon={<Sparkles size={15} color={C.ink2} />} onPress={loadSample}>{t('샘플 시간표 불러오기')}</Button></Row>
      <Next onPress={() => finish()} loading={busy}>{t('시작하기')}</Next>
      <Row style={tw`mt-2`}><Button full size="lg" variant="outline" onPress={() => finish({ timetable: [] })} disabled={busy}>{t('나중에')}</Button></Row>
    </>
  );
}

// ─── 현재 직업 (졸업생) — 회사(선택) · 업종 · 직무 ───────────────────────────
function PickOrType({ options, value, onChange, placeholder }: { options: string[]; value: string; onChange: (v: string) => void; placeholder: string }) {
  const custom = !!value && !options.includes(value);
  return (
    <View>
      <Wrap>{options.map((o) => <View key={o} style={tw`mb-2`}><Chip active={value === o} onPress={() => onChange(value === o ? '' : o)}>{o}</Chip></View>)}</Wrap>
      <Input placeholder={placeholder} value={custom ? value : ''} onChangeText={onChange} />
    </View>
  );
}
function CareerStep({ form, patch }: StepProps) {
  const ctx = localeContext();
  const { finish, busy } = useFinish(form);
  const career = form.career ?? {};
  const set = (p: Partial<NonNullable<RegisterInput['career']>>) => patch({ career: { ...career, ...p } });
  return (
    <>
      <Heading title={t('지금 어떤 일을 하나요?')} sub={t('직함으로 시작하지 않아요. 같은 분야·같은 지역의 동문과 자연스럽게 이어지도록 쓰여요.')} />
      <Field label={t('회사 (선택)')}><Input placeholder={t('예: 스타트업, 연구소, 프리랜서')} value={career.company ?? ''} onChangeText={(company) => set({ company })} /></Field>
      <Field label={t('업종')} hint={t('하나만 골라도 돼요. 없으면 직접 적어주세요.')}><PickOrType options={ctx.industries} value={career.industry ?? ''} onChange={(industry) => set({ industry })} placeholder={t('직접 입력')} /></Field>
      <Field label={t('직무')}><PickOrType options={ctx.roles} value={career.role ?? ''} onChange={(role) => set({ role })} placeholder={t('직접 입력')} /></Field>
      <View style={tw`rounded-2xl bg-surface-2 px-3.5 py-3 flex-row`}><Briefcase size={16} color={C.primary} /><Text style={tw`ml-2 flex-1 text-[12px] text-ink-2`}>{t('모두 선택 사항이에요. 회사명은 프로필에 표시되고, 같은 분야 사람 추천에 쓰여요.')}</Text></View>
      <Next onPress={() => finish()} loading={busy}>{t('시작하기')}</Next>
    </>
  );
}
