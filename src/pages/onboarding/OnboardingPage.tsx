import { useEffect, useMemo, useState } from 'react';
import { t, lang } from '@core/i18n';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Check, GraduationCap, Search, ShieldCheck, Plus, Trash2, Sparkles, MapPin, ChevronRight, ChevronDown, Mail, Briefcase, Upload, BadgeCheck } from 'lucide-react';
import type { RegisterInput } from '@core/api';
import type { Course, Interest, School, Stage, Visibility, ProfileField, Goal, VerificationMethod, Wants, PeopleWant, ActivityWant, Research } from '@core/types';
import { STAGE_ROLE, ALUMNI_VERIFICATIONS } from '@core/types';
import { peopleWantOptions, activityWantOptions } from '@core/lib/wants';
import type { StageKind } from '@core/lib/stage';
import { ResearchFields } from '@/components/profile_ResearchFields';
import { Button, Chip, Field, Input, Select, Segmented, BottomSheet } from '@/components/ui';
import { TopBar } from '@/components/layout/TopBar';
import { ONBOARDING_INTERESTS, INTEREST_EMOJI, INTEREST_LABELS, ALL_GOALS, GOAL_EMOJI, GOAL_LABELS } from '@core/lib/labels';
import { PEOPLE_WANT_LABELS, PEOPLE_WANT_EMOJI, ACTIVITY_WANT_LABELS, ACTIVITY_WANT_EMOJI, openToFromWants } from '@core/lib/wants';
import { localeContext, type VerificationOption } from '@core/lib/locale-context';
import { api, apiMode } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { getPlatform } from '@core/platform';
import { cn } from '@core/lib/cn';
import { uid } from '@core/lib/format';
import { DAY_LABELS, toMin } from '@core/lib/timetable';
import { verificationLabel } from '@core/lib/network';
import { DEMO_TIMETABLE as DEMO_TIMETABLE_KO } from '@core/data/seed';
import { DEMO_TIMETABLE as DEMO_TIMETABLE_EN } from '@core/data/seed.en';
import { purposesFromOpenTo } from '@/components/profile_OpenToChips';
import { legalUrl } from '@core/lib/legal';

/**
 * 온보딩 9화면 — 1 Welcome(/welcome) 은 WelcomePage, 2~9 는 여기.
 * 2 school → 3 verify → 4 stage → 5 basic → 6 interests → 7 region → 8 wants → 9 schedule(재학생) | career(졸업생)
 */
const STEPS = ['school', 'verify', 'stage', 'basic', 'interests', 'region', 'wants', 'research', 'schedule', 'career'] as const;
type Step = typeof STEPS[number];
const TOTAL = 9;
/** 대학원생은 8 wants 다음에 9 연구 → 10 시간표(선택) */
const STEP_NO: Record<Step, number> = { school: 2, verify: 3, stage: 4, basic: 5, interests: 6, region: 7, wants: 8, research: 9, schedule: 9, career: 9 };
const isGradLike = (s?: Stage) => s === 'masters' || s === 'phd';
const kindOfStage = (s?: Stage): StageKind => (s === 'alumni' || s === 'professional' ? 'alumni' : isGradLike(s) ? 'grad' : 'undergrad');
export const FIRSTRUN_KEY = 'aroundu.firstrun';

const EMOJIS = ['🙂', '😎', '🧑‍💻', '👩‍🎨', '🧑‍🔬', '🏃', '🎸', '📚', '🌱', '🎨', '🚀', '🧗', '☕', '🐱', '🦊', '🎧'];
const HUES = [220, 160, 15, 280, 45, 330, 120, 200, 60, 300];
const DEFAULT_FV: Record<ProfileField, Visibility> = { bio: 'school', likes: 'school', freeTime: 'school', height: 'private', availability: 'school', preferredPartner: 'private', purposes: 'school', interests: 'public', posts: 'school', prompts: 'public', timetable: 'friends', goals: 'school', living: 'friends' };
const MAX_INTERESTS = 5;
const THIS_YEAR = new Date().getFullYear();
const isAlumniLike = (s?: Stage) => s === 'alumni' || s === 'professional';
/** 입학연도 추정 — 졸업(예정)연도에서 과정 길이를 뺀다 (affiliation.year 용) */
const entryYearOf = (stage: Stage | undefined, gradYear: number) => (isAlumniLike(stage) ? gradYear : stage === 'phd' ? gradYear - 5 : stage === 'masters' ? gradYear - 2 : gradYear - 4);

type Draft = RegisterInput & { avatarType: 'face' | 'masked' | 'back'; email: string; codeSent: boolean; schoolName: string; emailDomain: string; wants: Wants; /** 이용약관·개인정보처리방침 동의 (필수, 기본 프로필 단계) */ agreedTerms: boolean };
const initial: Draft = {
  nickname: '', birthYear: 2003, gender: 'private', avatar: { emoji: '🙂', hue: 210, photoType: 'face' }, avatarType: 'face', agreedTerms: false,
  schoolId: '', schoolName: '', emailDomain: '', role: 'undergraduate', department: '', year: THIS_YEAR, emailVerified: false, showSchool: true, showDepartment: true, email: '', codeSent: false,
  stage: 'undergrad', career: {}, openTo: [], homeCity: '', activityCity: '', gradYear: THIS_YEAR + 2, verification: undefined, wants: { people: [], activities: [] },
  interests: [], purposes: [], bio: '', likes: '', freeTime: '', height: undefined, availability: 'after18', preferredPartner: undefined,
  fieldVisibility: DEFAULT_FV, prompts: [], voicePrompt: undefined, poll: undefined, timetable: [], goals: [], lookingFor: [], canOffer: [], living: undefined, meetPreference: [], locationPermission: 'undecided', notifications: true,
};

const KEY = 'aroundu.onboarding.draft';

export function OnboardingPage() {
  const nav = useNavigate();
  const [form, setForm] = useState<Draft>(() => { try { return { ...initial, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') }; } catch { return initial; } });
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(form)); } catch { /* */ } }, [form]);
  const patch = (p: Partial<Draft>) => setForm((f) => ({ ...f, ...p }));
  const go = (step: Step) => nav(`/onboarding/${step}`);
  const alumni = isAlumniLike(form.stage);
  const grad = isGradLike(form.stage);

  return (
    <Routes>
      <Route index element={<Navigate to="/onboarding/school" replace />} />
      {/* 옛 경로 — 링크가 404 나지 않도록 */}
      <Route path="account" element={<Navigate to="/onboarding/basic" replace />} />
      <Route path="opento" element={<Navigate to="/onboarding/wants" replace />} />
      <Route path="school" element={<Frame step="school"><SchoolStep form={form} patch={patch} next={() => go('verify')} /></Frame>} />
      <Route path="verify" element={<Frame step="verify"><VerifyStep form={form} patch={patch} next={() => go('stage')} /></Frame>} />
      <Route path="stage" element={<Frame step="stage"><StageStep form={form} patch={patch} next={() => go('basic')} /></Frame>} />
      <Route path="basic" element={<Frame step="basic"><BasicStep form={form} patch={patch} next={() => go('interests')} /></Frame>} />
      <Route path="interests" element={<Frame step="interests"><InterestsStep form={form} patch={patch} next={() => go('region')} /></Frame>} />
      <Route path="region" element={<Frame step="region"><RegionStep form={form} patch={patch} next={() => go('wants')} /></Frame>} />
      <Route path="wants" element={<Frame step="wants" grad={grad}><WantsStep form={form} patch={patch} next={() => go(alumni ? 'career' : grad ? 'research' : 'schedule')} /></Frame>} />
      <Route path="research" element={!grad ? <Navigate to={alumni ? '/onboarding/career' : '/onboarding/schedule'} replace /> : <Frame step="research" grad><ResearchStep form={form} patch={patch} next={() => go('schedule')} /></Frame>} />
      <Route path="schedule" element={alumni ? <Navigate to="/onboarding/career" replace /> : <Frame step="schedule" grad={grad}><ScheduleStep form={form} patch={patch} /></Frame>} />
      <Route path="career" element={!alumni ? <Navigate to="/onboarding/schedule" replace /> : <Frame step="career"><CareerStep form={form} patch={patch} /></Frame>} />
      <Route path="*" element={<Navigate to="/onboarding/school" replace />} />
    </Routes>
  );
}

function Frame({ step, grad, children }: { step: Step; grad?: boolean; children: React.ReactNode }) {
  const n = grad && step === 'schedule' ? 10 : STEP_NO[step];
  const total = grad ? 10 : TOTAL;
  const titles: Record<Step, string> = { school: t('학교 선택'), verify: t('학교 인증하기'), stage: t('현재 상태'), basic: t('기본 프로필'), interests: t('관심사'), region: t('지역'), wants: t('찾는 것'), research: t('연구'), schedule: t('시간표'), career: t('현재 직업') };
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <TopBar back title={<span className="text-[15px]">{titles[step]} <span className="text-ink-3 font-medium">{n}/{total}</span></span>} />
      <div className="px-4 pt-1"><div className="h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${(n / total) * 100}%` }} /></div></div>
      <div className="flex-1 px-4 py-5 space-y-5 pb-10">{children}</div>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub?: string }) {
  return <div><h2 className="font-display text-[24px] font-bold text-ink leading-tight">{title}</h2>{sub && <p className="text-[13px] text-ink-3 mt-1.5 leading-relaxed">{sub}</p>}</div>;
}

type StepProps = { form: Draft; patch: (p: Partial<Draft>) => void; next?: () => void };

/** 가입 실행 — 재학생은 schedule, 졸업생은 career 마지막 화면에서 호출 */
function useFinish(form: Draft) {
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const finish = async (override: Partial<RegisterInput> = {}) => {
    // 약관 동의 없이는 계정을 만들지 않는다 (기본 프로필 단계로 돌려보냄)
    if (!form.agreedTerms) { showToast(t('이용약관과 개인정보처리방침에 동의해주세요.'), 'error'); nav('/onboarding/basic'); return; }
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
      sessionStorage.removeItem(KEY);
      try { getPlatform().setItem(FIRSTRUN_KEY, '1'); } catch { /* */ }
      await setCurrentUser(user);
      nav('/', { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };
  return { finish, busy };
}

// ─── 2. 학교 선택 ──────────────────────────────────────────────────────────────
function SchoolStep({ form, patch, next }: StepProps) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    let alive = true;
    setSearching(true);
    api.schools.search(q).then((r) => { if (alive) { setResults(r); setSearching(false); } });
    return () => { alive = false; };
  }, [q]);
  const select = (s: School) => {
    const changed = s.id !== form.schoolId;
    patch({ schoolId: s.id, schoolName: s.name, emailDomain: s.emailDomain, ...(changed ? { emailVerified: false, verification: undefined, codeSent: false } : {}) });
  };
  return (
    <>
      <Heading title={t('학교를 선택해주세요')} sub={t('검증된 학교에서 시작해요. 같은 학교 사람들부터 가볍게 만나요.')} />
      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input className="pl-9" placeholder={t('학교명 또는 지역')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="card divide-y divide-line">
        {searching && results.length === 0 && <div className="px-4 py-3 text-[12px] text-ink-3">{t('검색 중…')}</div>}
        {!searching && results.length === 0 && <div className="px-4 py-3 text-[12px] text-ink-3">{t('검색 결과가 없어요')}</div>}
        {results.map((s) => { const active = form.schoolId === s.id; return (
          <button key={s.id} type="button" onClick={() => select(s)} className="w-full flex items-center gap-3 px-4 py-3 text-left press">
            <span className={cn('h-10 w-10 rounded-full grid place-items-center shrink-0', active ? 'bg-primary text-white' : 'bg-primary-soft text-primary')}><GraduationCap size={18} /></span>
            <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-ink truncate">{s.name}</span><span className="block text-[12px] text-ink-3 truncate">{s.region} · @{s.emailDomain}</span></span>
            {active ? <Check size={18} className="text-primary shrink-0" /> : <ChevronRight size={16} className="text-ink-3 shrink-0" />}
          </button>
        ); })}
      </div>
      <Button full size="lg" disabled={!form.schoolId} onClick={next}>{t('다음')}</Button>
    </>
  );
}

// ─── 3. 학교 인증 — 재학생 / 졸업생 방법 카드. 하나 이상 완료해야 진행 ──────────
function VerifyGroup({ label, list, picked, finished: done, onPick }: { label: string; list: VerificationOption[]; picked: VerificationMethod | null; finished?: VerificationMethod; onPick: (o: VerificationOption) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-[12px] font-bold text-ink-3 px-1">{label}</div>
      {list.map((o) => {
        const active = picked === o.method;
        const finished = done === o.method;
        return (
          <button key={o.method} type="button" onClick={() => onPick(o)} aria-pressed={active} disabled={!!done && !finished}
            className={cn('w-full flex items-center gap-3 rounded-[20px] border p-3.5 text-left press transition', finished ? 'bg-mint-soft border-mint/40' : active ? 'bg-primary-soft border-primary' : 'bg-white border-line', !!done && !finished && 'opacity-50')}>
            <span className={cn('h-10 w-10 rounded-full grid place-items-center shrink-0', finished ? 'bg-mint text-white' : active ? 'bg-primary text-white' : 'bg-surface-2 text-primary')}>{finished ? <Check size={18} /> : o.demo === 'code' ? <Mail size={17} /> : <Upload size={17} />}</span>
            <span className="flex-1 min-w-0"><span className="block text-[14px] font-bold text-ink">{o.title}</span><span className="block text-[12px] text-ink-3 leading-snug">{o.desc}</span></span>
            {!finished && <ChevronRight size={16} className="text-ink-3 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

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
  const pick = (o: VerificationOption) => {
    if (done) return;
    setPicked(o.method);
    if (o.demo === 'instant') setInstant(o);
  };
  const sendCode = async () => {
    setBusy(true);
    try {
      const r = await api.schools.sendVerificationCode(form.email.trim(), form.schoolId);
      setHint(r.hint);
      if (r.ok) patch({ codeSent: true }); else showToast(r.hint, 'error');
    } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const verify = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      const r = await api.schools.verifyCode(form.email.trim(), code.trim());
      if (r.ok) complete(picked); else showToast(t('인증 코드가 올바르지 않아요.'), 'error');
    } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const group = (label: string, list: VerificationOption[]) => <VerifyGroup label={label} list={list} picked={picked} finished={form.verification} onPick={pick} />;

  const codeCard = picked && !done && options.find((o) => o.method === picked && o.demo === 'code');

  return (
    <>
      <Heading title={t('학교를 인증해주세요')} sub={t('AroundU는 인증된 사람만 만나요. 방법을 하나 골라 완료하면 프로필에 ✓ 배지가 붙어요.')} />
      <div className="card p-3.5 flex items-center gap-3"><span className="h-10 w-10 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0"><GraduationCap size={18} /></span><div className="flex-1 min-w-0"><b className="text-[14px] block truncate">{form.schoolName}</b><span className="text-[12px] text-ink-3">@{form.emailDomain}</span></div>{done && <BadgeCheck size={20} className="text-verify" />}</div>

      {done ? (
        <div className="rounded-2xl bg-mint-soft text-mint px-4 py-3.5 text-[14px] font-semibold flex items-center gap-2"><Check size={16} />{verificationLabel(form.verification!, lang)} · {t('완료')}</div>
      ) : (
        <>
          {group(t('재학생'), options.filter((o) => o.for === 'student'))}
          {codeCard && (
            <div className="card p-4 space-y-3">
              <Field label={t('학교 이메일')} hint={hint || `@${form.emailDomain}${t(' 이메일로 인증 코드를 보내드려요.')}`}>
                <div className="flex gap-2"><Input type="email" inputMode="email" placeholder={`id@${form.emailDomain}`} value={form.email} onChange={(e) => patch({ email: e.target.value, codeSent: false })} /><Button variant="secondary" onClick={sendCode} loading={busy && !form.codeSent} disabled={!form.email.includes('@')}>{t('코드 전송')}</Button></div>
              </Field>
              {form.codeSent && (
                <Field label={t('인증 코드')} hint={apiMode === 'mock' ? t('데모 인증 코드: 123456') : undefined}>
                  <div className="flex gap-2"><Input inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} autoFocus /><Button onClick={verify} loading={busy} disabled={code.trim().length < 6}>{t('확인')}</Button></div>
                </Field>
              )}
            </div>
          )}
          {group(t('졸업생'), options.filter((o) => o.for === 'alumni'))}
        </>
      )}

      <div className="rounded-2xl bg-surface-2 px-3.5 py-3 text-[12px] text-ink-2 flex gap-2"><ShieldCheck size={16} className="text-mint shrink-0" />{t('인증이 완료되면 AroundU의 모든 기능을 이용할 수 있습니다.')}</div>
      <Button full size="lg" disabled={!done} onClick={next}>{t('다음')}</Button>

      <BottomSheet open={!!instant} onClose={() => setInstant(null)} title={t('데모: 즉시 인증')}>
        {instant && (
          <div className="space-y-4">
            <div className="flex items-center gap-3"><span className="h-11 w-11 rounded-2xl bg-primary-soft text-primary grid place-items-center"><Upload size={20} /></span><div><b className="text-[15px] block">{instant.title}</b><span className="text-[12px] text-ink-3">{instant.desc}</span></div></div>
            <p className="text-[13px] text-ink-2 leading-relaxed">{t('실제 서비스에서는 학교 시스템 또는 서류 확인을 거쳐요. 데모에서는 바로 완료 처리돼요.')}</p>
            <Button full size="lg" icon={<Check size={16} />} onClick={() => complete(instant.method)}>{t('인증 완료')}</Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}

// ─── 4. 현재 상태 — 학부생 / 대학원생(석사·박사) / 졸업생 ───────────────────────
function StageStep({ form, patch, next }: StepProps) {
  const isGrad = form.stage === 'masters' || form.stage === 'phd';
  const cards: { key: 'undergrad' | 'grad' | 'alumni'; emoji: string; title: string; sub: string; active: boolean; stage: Stage }[] = [
    { key: 'undergrad', emoji: '🎓', title: t('학부생'), sub: t('학부 재학 중'), active: form.stage === 'undergrad', stage: 'undergrad' },
    { key: 'grad', emoji: '📘', title: t('대학원생'), sub: t('석사 · 박사 과정'), active: isGrad, stage: 'masters' },
    { key: 'alumni', emoji: '🧑‍💼', title: t('졸업생'), sub: t('졸업 후에도 관계망은 그대로예요'), active: isAlumniLike(form.stage), stage: 'alumni' },
  ];
  const setStage = (s: Stage) => patch({ stage: s, role: STAGE_ROLE[s], gradYear: isAlumniLike(s) ? Math.min(form.gradYear ?? THIS_YEAR, THIS_YEAR) : Math.max(form.gradYear ?? THIS_YEAR + 1, THIS_YEAR + 1) });
  return (
    <>
      <Heading title={t('지금 어떤 상태인가요?')} sub={t('상태에 따라 홈과 추천이 달라져요. 언제든 프로필에서 바꿀 수 있어요.')} />
      <div className="space-y-2.5">
        {cards.map((c) => (
          <div key={c.key} className={cn('rounded-[22px] border transition', c.active ? 'border-primary bg-primary-soft/40' : 'border-line bg-white')}>
            <button type="button" onClick={() => setStage(c.stage)} aria-pressed={c.active} className="w-full flex items-center gap-3 p-4 text-left press">
              <span className={cn('h-11 w-11 rounded-2xl grid place-items-center text-2xl shrink-0', c.active ? 'bg-primary text-white' : 'bg-surface-2')}>{c.emoji}</span>
              <span className="flex-1 min-w-0"><span className="block text-[15px] font-bold text-ink">{c.title}</span><span className="block text-[12px] text-ink-3">{c.sub}</span></span>
              {c.active && <Check size={18} className="text-primary shrink-0" />}
            </button>
            {c.key === 'grad' && isGrad && (
              <div className="px-4 pb-4"><Segmented value={form.stage as 'masters' | 'phd'} onChange={(v) => setStage(v)} options={[{ value: 'masters', label: t('석사') }, { value: 'phd', label: t('박사') }]} /></div>
            )}
          </div>
        ))}
      </div>
      <Button full size="lg" onClick={next}>{t('다음')}</Button>
    </>
  );
}

// ─── 5. 기본 프로필 — 아바타 · 이름 · 전공 · 졸업연도 · 생년 · 이메일 ───────────
function BasicStep({ form, patch, next }: StepProps) {
  const ctx = localeContext();
  const alumni = isAlumniLike(form.stage);
  const gradYears = alumni ? Array.from({ length: 40 }, (_, i) => THIS_YEAR - i) : Array.from({ length: 6 }, (_, i) => THIS_YEAR + i);
  const birthYears = Array.from({ length: 40 }, (_, i) => THIS_YEAR - 17 - i);
  const valid = form.nickname.trim().length >= 2 && form.email.includes('@') && !!form.avatar.emoji && !!form.gradYear && form.agreedTerms;
  return (
    <>
      <Heading title={t('기본 프로필을 만들어요')} sub={t('직함이 아니라 사람이 먼저예요. 이름·전공·졸업연도만 있으면 돼요.')} />
      <Field label={t('아바타')} required hint={t('얼굴 공개를 권장하지만 마스크, 가면, 뒷모습 사진도 괜찮아요. (데모에서는 이모지로 대체)')}>
        <div className="flex items-center gap-4 mb-3">
          <div className="h-[72px] w-[72px] rounded-3xl grid place-items-center text-4xl shrink-0" style={{ background: `linear-gradient(135deg, hsl(${form.avatar.hue} 85% 88%), hsl(${(form.avatar.hue + 40) % 360} 80% 74%))` }}>{form.avatar.emoji}</div>
          <div className="flex-1">
            <Segmented value={form.avatarType} onChange={(v) => patch({ avatarType: v, avatar: { ...form.avatar, photoType: v } })} options={[{ value: 'face', label: t('얼굴') }, { value: 'masked', label: t('마스크·가면') }, { value: 'back', label: t('뒷모습') }]} />
            <input type="range" min={0} max={359} value={form.avatar.hue} onChange={(e) => patch({ avatar: { ...form.avatar, hue: Number(e.target.value) } })} className="w-full mt-3 accent-primary" aria-label={t('배경 색상')} />
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJIS.map((e) => <button key={e} type="button" onClick={() => patch({ avatar: { ...form.avatar, emoji: e } })} className={cn('h-10 rounded-xl text-xl grid place-items-center', form.avatar.emoji === e ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2')}>{e}</button>)}
        </div>
      </Field>
      <Field label={t('이름 또는 닉네임')} required><Input placeholder={t('예: 하늘')} value={form.nickname} onChange={(e) => patch({ nickname: e.target.value })} maxLength={12} /></Field>
      <Field label={t('전공')} hint={t('선택이지만 적으면 같은 전공 사람을 더 잘 찾아요.')}>
        <Input list="ob-majors" placeholder={ctx.majors[0]} value={form.department} onChange={(e) => patch({ department: e.target.value })} />
        <datalist id="ob-majors">{ctx.majors.map((m) => <option key={m} value={m} />)}</datalist>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={alumni ? t('졸업 연도') : t('졸업 예정 연도')} required>
          <Select value={form.gradYear} onChange={(e) => { const gy = Number(e.target.value); patch({ gradYear: gy, year: entryYearOf(form.stage, gy) }); }}>{gradYears.map((y) => <option key={y} value={y}>{y}</option>)}</Select>
        </Field>
        <Field label={t('생년')} required><Select value={form.birthYear} onChange={(e) => patch({ birthYear: Number(e.target.value) })}>{birthYears.map((y) => <option key={y} value={y}>{y}</option>)}</Select></Field>
      </div>
      <Field label={t('이메일')} required hint={form.emailVerified && form.email ? t('인증에 쓴 이메일이에요. 로그인에 쓰여요.') : t('로그인에 쓰여요. 프로필에는 보이지 않아요.')}>
        <Input type="email" inputMode="email" placeholder={`you@${form.emailDomain || 'school.edu'}`} value={form.email} onChange={(e) => patch({ email: e.target.value })} />
      </Field>
      <TermsConsent checked={form.agreedTerms} onChange={(agreedTerms) => patch({ agreedTerms })} />
      <Button full size="lg" disabled={!valid} onClick={next}>{t('다음')}</Button>
    </>
  );
}

/** 이용약관·개인정보처리방침 동의 (필수) — App Store 1.2 (UGC) */
function TermsConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const link = (page: 'terms' | 'privacy', label: string) => <a href={legalUrl(page)} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">{label}</a>;
  const terms = link('terms', t('이용약관'));
  const privacy = link('privacy', t('개인정보처리방침'));
  return (
    <div className="rounded-2xl border border-line bg-surface px-3.5 py-3">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={t('이용약관과 개인정보처리방침에 동의해요 (필수)')} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
        <span className="text-[13px] text-ink leading-snug">{lang === 'en' ? <>I agree to the {terms} and {privacy} (required)</> : <>{terms}과 {privacy}에 동의해요 (필수)</>}</span>
      </label>
      <p className="mt-1.5 pl-[30px] text-[12px] text-ink-3">{t('괴롭힘·혐오·스팸은 무관용으로 처리해요')}</p>
    </div>
  );
}

// ─── 6. 관심사 (최대 5) + 목표(접힘) ───────────────────────────────────────────
function InterestsStep({ form, patch, next }: StepProps) {
  const [more, setMore] = useState(form.goals.length > 0);
  const toggleInterest = (i: Interest) => {
    if (form.interests.includes(i)) return patch({ interests: form.interests.filter((x) => x !== i) });
    if (form.interests.length >= MAX_INTERESTS) return;
    patch({ interests: [...form.interests, i] });
  };
  const toggleGoal = (g: Goal) => patch({ goals: form.goals.includes(g) ? form.goals.filter((x) => x !== g) : [...form.goals, g] });
  const full = form.interests.length >= MAX_INTERESTS;
  return (
    <>
      <Heading title={t('관심사를 골라주세요')} sub={t('최대 5개. 사람·모임·피드 추천의 기준이 돼요.')} />
      <Field label={t('관심사')} required right={<span className={cn('text-[12px] font-bold', full ? 'text-primary' : 'text-ink-3')}>{form.interests.length}/{MAX_INTERESTS}</span>}>
        <div className="flex flex-wrap gap-2">
          {ONBOARDING_INTERESTS.map((i) => { const on = form.interests.includes(i); return <Chip key={i} active={on} onClick={() => toggleInterest(i)} className={cn(!on && full && 'opacity-40')}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Chip>; })}
        </div>
      </Field>
      <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1 text-[13px] font-semibold text-primary press"><ChevronDown size={15} className={cn('transition', more && 'rotate-180')} />{t('더 알려주기')}<span className="text-ink-3 font-medium">· {t('선택')}</span></button>
      {more && (
        <Field label={t('이번 학기 목표')} hint={t('선택 사항 — 나중에 프로필에서 바꿀 수 있어요')}>
          <div className="flex flex-wrap gap-2">{ALL_GOALS.map((g) => <Chip key={g} active={form.goals.includes(g)} onClick={() => toggleGoal(g)}>{GOAL_EMOJI[g]} {GOAL_LABELS[g]}</Chip>)}</div>
        </Field>
      )}
      <Button full size="lg" disabled={form.interests.length === 0} onClick={next}>{t('다음')}</Button>
    </>
  );
}

// ─── 7. 지역 — 거주 도시 + 주로 활동하는 지역(선택) ──────────────────────────────
function CityPicker({ value, onChange, placeholder, cities }: { value: string; onChange: (v: string) => void; placeholder: string; cities: string[] }) {
  const [q, setQ] = useState('');
  const list = q.trim() ? cities.filter((c) => c.toLowerCase().includes(q.trim().toLowerCase())) : cities;
  const custom = q.trim() && !cities.some((c) => c.toLowerCase() === q.trim().toLowerCase());
  return (
    <div className="space-y-2.5">
      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input className="pl-9" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) { onChange(q.trim()); setQ(''); } }} /></div>
      <div className="flex flex-wrap gap-2">
        {value && !list.includes(value) && <Chip active onClick={() => onChange('')}><MapPin size={12} />{value}</Chip>}
        {list.map((c) => <Chip key={c} active={value === c} onClick={() => onChange(value === c ? '' : c)}>{value === c && <MapPin size={12} />}{c}</Chip>)}
        {custom && <Chip onClick={() => { onChange(q.trim()); setQ(''); }}><Plus size={12} />{q.trim()}</Chip>}
      </div>
    </div>
  );
}

function RegionStep({ form, patch, next }: StepProps) {
  const ctx = localeContext();
  const [showActivity, setShowActivity] = useState(!!form.activityCity);
  return (
    <>
      <Heading title={t('어디에서 지내나요?')} sub={t('같은 지역 사람과 모임을 먼저 보여드려요. 졸업 후에도 지역이 관계망을 이어줘요.')} />
      <Field label={t('거주 도시')} required hint={ctx.cityHint}>
        <CityPicker value={form.homeCity ?? ''} onChange={(v) => patch({ homeCity: v })} placeholder={t('도시 검색')} cities={ctx.cities} />
      </Field>
      {showActivity ? (
        <Field label={t('주로 활동하는 지역 (선택)')} hint={t('학교·직장이 있는 곳이 다르면 적어주세요.')}>
          <CityPicker value={form.activityCity ?? ''} onChange={(v) => patch({ activityCity: v })} placeholder={t('도시 검색')} cities={ctx.cities} />
        </Field>
      ) : (
        <button type="button" onClick={() => setShowActivity(true)} className="flex items-center gap-1 text-[13px] font-semibold text-primary press"><Plus size={15} />{t('주로 활동하는 지역 (선택)')}</button>
      )}
      <Button full size="lg" disabled={!form.homeCity?.trim()} onClick={next}>{t('다음')}</Button>
    </>
  );
}

// ─── 8. 무엇을 찾고 있나요? — 어떤 사람 · 어떤 활동 ─────────────────────────────
function WantsStep({ form, patch, next }: StepProps) {
  const w = form.wants;
  // 단계마다 먼저 보여줄 답이 다르다 (대학원생: 같은 연구 분야 · 졸업생: 같은 지역·분야)
  const kind = kindOfStage(form.stage);
  const peopleOpts = peopleWantOptions(kind);
  const activityOpts = activityWantOptions(kind);
  const toggleP = (p: PeopleWant) => patch({ wants: { ...w, people: w.people.includes(p) ? w.people.filter((x) => x !== p) : [...w.people, p] } });
  const toggleA = (a: ActivityWant) => patch({ wants: { ...w, activities: w.activities.includes(a) ? w.activities.filter((x) => x !== a) : [...w.activities, a] } });
  const valid = w.people.length > 0 && w.activities.length > 0;
  return (
    <>
      <Heading title={t('무엇을 찾고 있나요?')} sub={t('추천 사람·모임의 기준이 돼요. 각각 하나 이상 골라주세요.')} />
      <Field label={t('어떤 사람을 만나고 싶나요?')} required right={<span className="text-[12px] text-ink-3">{w.people.length}</span>}>
        <div className="flex flex-wrap gap-2">{peopleOpts.map((p) => <Chip key={p} active={w.people.includes(p)} onClick={() => toggleP(p)}>{PEOPLE_WANT_EMOJI[p]} {PEOPLE_WANT_LABELS[p]}</Chip>)}</div>
      </Field>
      <Field label={t('어떤 활동을 하고 싶나요?')} required right={<span className="text-[12px] text-ink-3">{w.activities.length}</span>}>
        <div className="flex flex-wrap gap-2">{activityOpts.map((a) => <Chip key={a} active={w.activities.includes(a)} onClick={() => toggleA(a)}>{ACTIVITY_WANT_EMOJI[a]} {ACTIVITY_WANT_LABELS[a]}</Chip>)}</div>
      </Field>
      <p className="text-[12px] text-ink-3 flex items-center gap-1.5"><Sparkles size={13} className="text-primary" />{t('언제든 프로필 › 추천 설정에서 바꿀 수 있어요.')}</p>
      <Button full size="lg" disabled={!valid} onClick={next}>{t('다음')}</Button>
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
      <div className="space-y-2 pt-2">
        <Button full size="lg" disabled={!r.field?.trim()} onClick={next}>{t('다음')}</Button>
        <Button full size="lg" variant="ghost" onClick={() => { patch({ research: undefined }); next?.(); }}>{t('나중에')}</Button>
      </div>
    </>
  );
}

// ─── 9a. 시간표 (재학생) — 수업 추가 / 샘플 / 불러오기(데모) / 나중에 ──────────────
function ScheduleStep({ form, patch }: StepProps) {
  const ctx = localeContext();
  const showToast = useAppStore((s) => s.showToast);
  const { finish, busy } = useFinish(form);
  const [draft, setDraft] = useState({ name: '', day: 0, start: '10:00', end: '11:15' });
  const timetable = form.timetable ?? [];
  const canAdd = draft.name.trim().length > 0 && toMin(draft.end) > toMin(draft.start);

  const addClass = () => {
    if (!canAdd) return;
    const c: Course = { id: uid('c'), name: draft.name.trim(), day: draft.day, start: draft.start, end: draft.end, hue: HUES[timetable.length % HUES.length] };
    patch({ timetable: [...timetable, c] });
    setDraft({ name: '', day: draft.day, start: draft.end, end: draft.end });
    showToast(t('수업을 추가했어요.'), 'success');
  };
  const loadSample = () => {
    const sample = (lang === 'en' ? DEMO_TIMETABLE_EN : DEMO_TIMETABLE_KO).map((c) => ({ ...c, id: uid('c') }));
    patch({ timetable: sample });
    showToast(t('샘플 시간표를 불러왔어요.'), 'success');
  };

  return (
    <>
      <Heading title={t('시간표를 설정해요')} sub={t('공강이 겹치는 사람을 찾고, 수업별 스터디에 들어갈 수 있어요. 강의실은 절대 공개되지 않아요.')} />
      <div className="card divide-y divide-line">
        {ctx.scheduleImport.map((label, i) => (
          <button key={label} type="button" onClick={() => (i === ctx.scheduleImport.length - 1 ? undefined : showToast(t('데모에서는 직접 입력 또는 샘플 시간표를 써주세요.'), 'info'))} className="w-full flex items-center gap-3 px-4 py-3 text-left press">
            <span className="h-9 w-9 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0"><Upload size={16} /></span>
            <span className="flex-1 text-[14px] font-semibold text-ink">{label}</span>
            {i < ctx.scheduleImport.length - 1 ? <span className="text-[11px] font-bold text-ink-3 rounded-full bg-surface-2 px-2 h-5 inline-flex items-center">{t('준비 중')}</span> : <ChevronDown size={16} className="text-ink-3" />}
          </button>
        ))}
      </div>
      <div className="card p-4 space-y-3">
        <b className="text-[14px] flex items-center gap-1.5"><Plus size={15} className="text-primary" />{t('수업 추가')}</b>
        <Field label={t('수업 이름')}><Input placeholder={t('예: 데이터베이스')} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label={t('요일')}><Select value={draft.day} onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}>{[0, 1, 2, 3, 4].map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}</Select></Field>
          <Field label={t('시작')}><Input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></Field>
          <Field label={t('종료')}><Input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></Field>
        </div>
        <Button full variant="secondary" icon={<Plus size={15} />} disabled={!canAdd} onClick={addClass}>{t('추가')}</Button>
      </div>
      {timetable.length > 0 && (
        <div className="card divide-y divide-line">
          {timetable.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="h-8 w-8 rounded-full shrink-0" style={{ background: `hsl(${c.hue} 75% 80%)` }} />
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-ink truncate">{c.name}</span><span className="block text-[12px] text-ink-3">{DAY_LABELS[c.day]} · {c.start}–{c.end}</span></span>
              <button type="button" onClick={() => patch({ timetable: timetable.filter((x) => x.id !== c.id) })} aria-label={t('삭제')} className="h-9 w-9 rounded-full grid place-items-center text-ink-3 press"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
      <Button full variant="outline" icon={<Sparkles size={15} />} onClick={loadSample}>{t('샘플 시간표 불러오기')}</Button>
      <div className="space-y-2 pt-2">
        <Button full size="lg" onClick={() => finish()} loading={busy}>{t('시작하기')}</Button>
        <Button full size="lg" variant="ghost" onClick={() => finish({ timetable: [] })} disabled={busy}>{t('나중에')}</Button>
      </div>
    </>
  );
}

// ─── 9b. 현재 직업 (졸업생) — 회사(선택) · 업종 · 직무 ───────────────────────────
function PickOrType({ options, value, onChange, placeholder }: { options: string[]; value: string; onChange: (v: string) => void; placeholder: string }) {
  const custom = !!value && !options.includes(value);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{options.map((o) => <Chip key={o} active={value === o} onClick={() => onChange(value === o ? '' : o)}>{o}</Chip>)}</div>
      <Input placeholder={placeholder} value={custom ? value : ''} onChange={(e) => onChange(e.target.value)} />
    </div>
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
      <Field label={t('회사 (선택)')}><Input placeholder={t('예: 스타트업, 연구소, 프리랜서')} value={career.company ?? ''} onChange={(e) => set({ company: e.target.value })} /></Field>
      <Field label={t('업종')} hint={t('하나만 골라도 돼요. 없으면 직접 적어주세요.')}>
        <PickOrType options={ctx.industries} value={career.industry ?? ''} onChange={(v) => set({ industry: v })} placeholder={t('직접 입력')} />
      </Field>
      <Field label={t('직무')}>
        <PickOrType options={ctx.roles} value={career.role ?? ''} onChange={(v) => set({ role: v })} placeholder={t('직접 입력')} />
      </Field>
      <div className="rounded-2xl bg-surface-2 px-3.5 py-3 text-[12px] text-ink-2 flex gap-2"><Briefcase size={16} className="text-primary shrink-0" />{t('모두 선택 사항이에요. 회사명은 프로필에 표시되고, 같은 분야 사람 추천에 쓰여요.')}</div>
      <Button full size="lg" onClick={() => finish()} loading={busy}>{t('시작하기')}</Button>
    </>
  );
}
