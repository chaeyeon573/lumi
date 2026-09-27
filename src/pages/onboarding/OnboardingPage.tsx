import { useEffect, useState } from 'react';
import { t, lang } from '@core/i18n';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Check, GraduationCap, Search, ShieldCheck, Plus, Trash2, Sparkles, MapPin } from 'lucide-react';
import type { RegisterInput } from '@core/api';
import type { Course, Interest, School, Stage, Visibility, ProfileField, Goal } from '@core/types';
import { STAGE_ROLE } from '@core/types';
import { Button, Chip, Field, Input, Select, Segmented } from '@/components/ui';
import { TopBar } from '@/components/layout/TopBar';
import { ALL_INTERESTS, INTEREST_EMOJI, INTEREST_LABELS, ALL_GOALS, GOAL_EMOJI, GOAL_LABELS } from '@core/lib/labels';
import { api, apiMode } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { uid } from '@core/lib/format';
import { DAY_LABELS, toMin } from '@core/lib/timetable';
import { STAGE_LABELS_KO, STAGE_LABELS_EN } from '@core/lib/network';
import { DEMO_TIMETABLE as DEMO_TIMETABLE_KO } from '@core/data/seed';
import { DEMO_TIMETABLE as DEMO_TIMETABLE_EN } from '@core/data/seed.en';
import { OpenToChips, purposesFromOpenTo } from '@/components/profile_OpenToChips';
import { CareerFields } from '@/components/profile_CareerFields';

/** PRD 온보딩 8화면 — 1 Splash(/welcome) 는 WelcomePage, 2~8 은 여기 */
const STEPS = ['account', 'school', 'verify', 'stage', 'interests', 'opento', 'schedule'] as const;
type Step = typeof STEPS[number];
const TOTAL = STEPS.length + 1;

const EMOJIS = ['🙂', '😎', '🧑‍💻', '👩‍🎨', '🧑‍🔬', '🏃', '🎸', '📚', '🌱', '🎨', '🚀', '🧗', '☕', '🐱', '🦊', '🎧'];
const HUES = [220, 160, 15, 280, 45, 330, 120, 200, 60, 300];
const DEFAULT_FV: Record<ProfileField, Visibility> = { bio: 'school', likes: 'school', freeTime: 'school', height: 'private', availability: 'school', preferredPartner: 'private', purposes: 'school', interests: 'public', posts: 'school', prompts: 'public', timetable: 'friends', goals: 'school', living: 'friends' };
const ALL_STAGES: Stage[] = ['undergrad', 'masters', 'phd', 'alumni', 'professional'];
const STAGE_EMOJI: Record<Stage, string> = { undergrad: '🎓', masters: '📘', phd: '🔬', alumni: '🧑‍💼', professional: '💼' };
const isAlumniLike = (s?: Stage) => s === 'alumni' || s === 'professional';

type Draft = RegisterInput & { avatarType: 'face' | 'masked' | 'back'; email: string; codeSent: boolean; schoolName: string; emailDomain: string };
const initial: Draft = {
  nickname: '', birthYear: 2003, gender: 'private', avatar: { emoji: '🙂', hue: 210, photoType: 'face' }, avatarType: 'face',
  schoolId: '', schoolName: '', emailDomain: '', role: 'undergraduate', department: '', year: new Date().getFullYear(), emailVerified: false, showSchool: true, showDepartment: true, email: '', codeSent: false,
  stage: 'undergrad', career: {}, openTo: [],
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

  return (
    <Routes>
      <Route index element={<Navigate to="/onboarding/account" replace />} />
      <Route path="basic" element={<Navigate to="/onboarding/account" replace />} />
      <Route path="account" element={<Frame step="account"><AccountStep form={form} patch={patch} next={() => go('school')} /></Frame>} />
      <Route path="school" element={<Frame step="school"><SchoolStep form={form} patch={patch} next={() => go('verify')} /></Frame>} />
      <Route path="verify" element={<Frame step="verify"><VerifyStep form={form} patch={patch} next={() => go('stage')} /></Frame>} />
      <Route path="stage" element={<Frame step="stage"><StageStep form={form} patch={patch} next={() => go('interests')} /></Frame>} />
      <Route path="interests" element={<Frame step="interests"><InterestsStep form={form} patch={patch} next={() => go('opento')} /></Frame>} />
      <Route path="opento" element={<Frame step="opento"><OpenToStep form={form} patch={patch} next={() => go('schedule')} /></Frame>} />
      <Route path="schedule" element={<Frame step="schedule"><ScheduleStep form={form} patch={patch} /></Frame>} />
      <Route path="*" element={<Navigate to="/onboarding/account" replace />} />
    </Routes>
  );
}

function Frame({ step, children }: { step: Step; children: React.ReactNode }) {
  const n = STEPS.indexOf(step) + 2;
  const titles: Record<Step, string> = { account: t('계정 만들기'), school: t('학교 선택'), verify: t('학교 인증'), stage: t('현재 단계'), interests: t('관심사'), opento: t('찾는 것'), schedule: t('시간표 설정') };
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <TopBar back title={<span className="text-[15px]">{titles[step]} <span className="text-ink-3 font-medium">{n}/{TOTAL}</span></span>} />
      <div className="px-4 pt-1"><div className="h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${(n / TOTAL) * 100}%` }} /></div></div>
      <div className="flex-1 px-4 py-5 space-y-5 pb-10">{children}</div>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub?: string }) {
  return <div><h2 className="font-display text-[24px] font-bold text-primary leading-tight">{title}</h2>{sub && <p className="text-[13px] text-ink-3 mt-1.5 leading-relaxed">{sub}</p>}</div>;
}

type StepProps = { form: Draft; patch: (p: Partial<Draft>) => void; next?: () => void };

/** 2. Login / Sign up — 닉네임 · 이메일 · 생년 · 아바타 */
function AccountStep({ form, patch, next }: StepProps) {
  const valid = form.nickname.trim().length >= 2 && form.email.includes('@') && !!form.avatar.emoji;
  const years = Array.from({ length: 30 }, (_, i) => 2010 - i);
  return (
    <>
      <Heading title={t('반가워요! 계정을 만들어요')} sub={t('닉네임, 이메일, 생년, 아바타만 있으면 돼요.')} />
      <Field label={t('이름 또는 닉네임')} required><Input placeholder={t('예: 하늘')} value={form.nickname} onChange={(e) => patch({ nickname: e.target.value })} maxLength={12} /></Field>
      <Field label={t('이메일')} required hint={t('로그인에 쓰여요. 학교 이메일이면 다음 단계 인증이 빨라요.')}><Input type="email" inputMode="email" placeholder="you@school.edu" value={form.email} onChange={(e) => patch({ email: e.target.value })} /></Field>
      <Field label={t('생년')} required><Select value={form.birthYear} onChange={(e) => patch({ birthYear: Number(e.target.value) })}>{years.map((y) => <option key={y} value={y}>{y}{t('년')}</option>)}</Select></Field>
      <Field label={t('아바타')} required hint={t('얼굴 공개를 권장하지만 마스크, 가면, 뒷모습 사진도 괜찮아요. (데모에서는 이모지로 대체)')}>
        <div className="flex items-center gap-4 mb-3">
          <div className="h-20 w-20 rounded-3xl grid place-items-center text-4xl shrink-0" style={{ background: `linear-gradient(135deg, hsl(${form.avatar.hue} 85% 88%), hsl(${(form.avatar.hue + 40) % 360} 80% 74%))` }}>{form.avatar.emoji}</div>
          <div className="flex-1">
            <Segmented value={form.avatarType} onChange={(v) => patch({ avatarType: v, avatar: { ...form.avatar, photoType: v } })} options={[{ value: 'face', label: t('얼굴') }, { value: 'masked', label: t('마스크·가면') }, { value: 'back', label: t('뒷모습') }]} />
            <input type="range" min={0} max={359} value={form.avatar.hue} onChange={(e) => patch({ avatar: { ...form.avatar, hue: Number(e.target.value) } })} className="w-full mt-3 accent-primary" aria-label={t('배경 색상')} />
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJIS.map((e) => <button key={e} type="button" onClick={() => patch({ avatar: { ...form.avatar, emoji: e } })} className={cn('h-10 rounded-xl text-xl grid place-items-center', form.avatar.emoji === e ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2')}>{e}</button>)}
        </div>
      </Field>
      <div className="rounded-2xl bg-surface-2 px-3.5 py-3 text-[12px] text-ink-2 flex gap-2"><ShieldCheck size={16} className="text-mint shrink-0" />{t('본인 인증은 가입 후 프로필에서 진행할 수 있어요. 인증 상태는 프로필에 배지로 표시돼요.')}</div>
      <Button full size="lg" disabled={!valid} onClick={next}>{t('다음')}</Button>
    </>
  );
}

/** 3. School selection */
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
  const select = (s: School) => patch({ schoolId: s.id, schoolName: s.name, emailDomain: s.emailDomain, emailVerified: false, codeSent: false });
  return (
    <>
      <Heading title={t('학교를 선택해주세요')} sub={t('학교에서 시작해요. 같은 학교 사람들이 내 네트워크가 돼요.')} />
      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input className="pl-9" placeholder={t('학교명 또는 지역')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="card divide-y divide-line">
        {searching && results.length === 0 && <div className="px-4 py-3 text-[12px] text-ink-3">{t('검색 중…')}</div>}
        {!searching && results.length === 0 && <div className="px-4 py-3 text-[12px] text-ink-3">{t('검색 결과가 없어요')}</div>}
        {results.map((s) => { const active = form.schoolId === s.id; return (
          <button key={s.id} type="button" onClick={() => select(s)} className="w-full flex items-center gap-3 px-4 py-3 text-left press">
            <span className={cn('h-10 w-10 rounded-full grid place-items-center', active ? 'bg-primary text-white' : 'bg-primary-soft text-primary')}><GraduationCap size={18} /></span>
            <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-ink truncate">{s.name}</span><span className="block text-[12px] text-ink-3 truncate">{s.region} · @{s.emailDomain}</span></span>
            {active && <Check size={18} className="text-primary" />}
          </button>
        ); })}
      </div>
      <Button full size="lg" disabled={!form.schoolId} onClick={next}>{t('다음')}</Button>
    </>
  );
}

/** 4. School verification — 이메일 코드 (mock: 123456), 나중에 인증 가능 */
function VerifyStep({ form, patch, next }: StepProps) {
  const [code, setCode] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const showToast = useAppStore((s) => s.showToast);
  const sendCode = async () => {
    setBusy(true);
    try {
      const r = await api.schools.sendVerificationCode(form.email.trim(), form.schoolId);
      setHint(r.hint);
      if (r.ok) patch({ codeSent: true }); else showToast(r.hint, 'error');
    } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true);
    try {
      const r = await api.schools.verifyCode(form.email.trim(), code.trim());
      if (r.ok) { patch({ emailVerified: true }); showToast(t('학교 인증이 완료되었어요!'), 'success'); } else showToast(t('인증 코드가 올바르지 않아요.'), 'error');
    } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <Heading title={t('학교 이메일을 인증해주세요')} sub={t('인증하면 프로필에 학교 인증 배지가 붙고, 같은 학교 사람들에게 더 잘 보여요.')} />
      <div className="card p-4 flex items-center gap-3"><span className="h-10 w-10 rounded-full bg-primary-soft text-primary grid place-items-center"><GraduationCap size={18} /></span><div className="flex-1 min-w-0"><b className="text-[14px] block truncate">{form.schoolName}</b><span className="text-[12px] text-ink-3">@{form.emailDomain}</span></div></div>
      {form.emailVerified ? (
        <div className="flex items-center gap-2 rounded-2xl bg-mint-soft text-mint px-3.5 h-12 text-[14px] font-semibold"><Check size={16} /> {t('인증 완료 · 학교 인증 배지가 부여돼요')}</div>
      ) : (
        <>
          <Field label={t('학교 이메일')} hint={hint || `@${form.emailDomain}${t(' 이메일로 인증 코드를 보내드려요.')}`}>
            <div className="flex gap-2"><Input type="email" placeholder={`id@${form.emailDomain}`} value={form.email} onChange={(e) => patch({ email: e.target.value, codeSent: false })} /><Button variant="secondary" onClick={sendCode} loading={busy && !form.codeSent} disabled={!form.email.includes('@')}>{t('코드 전송')}</Button></div>
          </Field>
          {form.codeSent && (
            <Field label={t('인증 코드')} hint={apiMode === 'mock' ? t('데모 인증 코드: 123456') : undefined}>
              <div className="flex gap-2"><Input inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} /><Button onClick={verify} loading={busy} disabled={code.trim().length < 6}>{t('확인')}</Button></div>
            </Field>
          )}
        </>
      )}
      <Button full size="lg" onClick={next}>{form.emailVerified ? t('다음') : t('나중에 인증하고 다음')}</Button>
    </>
  );
}

/** 5. Current stage — 학부 / 석사 / 박사 / 졸업생 / 직장인 (+ 학과·연도, 졸업생은 경력) */
function StageStep({ form, patch, next }: StepProps) {
  const labels = lang === 'en' ? STAGE_LABELS_EN : STAGE_LABELS_KO;
  const subs: Record<Stage, string> = { undergrad: t('학부 재학 중'), masters: t('석사 과정'), phd: t('박사 과정'), alumni: t('졸업했어요'), professional: t('일하고 있어요') };
  const alumni = isAlumniLike(form.stage);
  const valid = form.department.trim().length > 0;
  return (
    <>
      <Heading title={t('지금 어떤 단계인가요?')} sub={t('단계에 따라 홈과 추천이 달라져요. 학교 네트워크는 졸업 후에도 그대로예요.')} />
      <div className="grid grid-cols-2 gap-2.5">
        {ALL_STAGES.map((s) => { const active = form.stage === s; return (
          <button key={s} type="button" onClick={() => patch({ stage: s, role: STAGE_ROLE[s] })} aria-pressed={active}
            className={cn('rounded-[22px] border p-4 text-left press transition min-h-[92px] flex flex-col justify-between', active ? 'bg-primary text-white border-primary' : 'bg-white border-line text-ink', s === 'professional' && 'col-span-2 flex-row items-center gap-3')}>
            <span className="text-2xl">{STAGE_EMOJI[s]}</span>
            <span><span className="block text-[15px] font-bold leading-tight">{labels[s]}</span><span className={cn('block text-[12px] mt-0.5', active ? 'text-white/80' : 'text-ink-3')}>{subs[s]}</span></span>
          </button>
        ); })}
      </div>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field label={t('학과 또는 전공')} required><Input placeholder={t('예: 경영학과')} value={form.department} onChange={(e) => patch({ department: e.target.value })} /></Field>
        <Field label={alumni ? t('졸업 연도') : t('입학 연도')} required><Input type="number" inputMode="numeric" value={form.year} onChange={(e) => patch({ year: Number(e.target.value) })} /></Field>
      </div>
      {alumni && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2"><MapPin size={16} className="text-primary" /><b className="text-[14px]">{t('졸업 후 정보')}</b></div>
          <p className="text-[12px] text-ink-3">{t('도시·회사를 적으면 같은 도시의 졸업생과 더 잘 연결돼요. 모두 선택 사항이에요.')}</p>
          <CareerFields value={form.career ?? {}} onChange={(career) => patch({ career })} />
        </div>
      )}
      <Button full size="lg" disabled={!valid} onClick={next}>{t('다음')}</Button>
    </>
  );
}

/** 6. Interests (+ 목표 선택) */
function InterestsStep({ form, patch, next }: StepProps) {
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <>
      <Heading title={t('관심사를 골라주세요')} sub={t('여러 개 골라도 돼요. 사람·만남·그룹 추천의 기준이 돼요.')} />
      <Field label={t('관심 활동')} required hint={`${form.interests.length}${t('개 선택')}`}>
        <div className="flex flex-wrap gap-2">{ALL_INTERESTS.map((i) => <Chip key={i} active={form.interests.includes(i)} onClick={() => patch({ interests: toggle(form.interests, i) as Interest[] })}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Chip>)}</div>
      </Field>
      <Field label={t('이번 학기 목표')} hint={t('선택 사항 — 나중에 프로필에서 바꿀 수 있어요')}>
        <div className="flex flex-wrap gap-2">{ALL_GOALS.map((g) => <Chip key={g} active={form.goals.includes(g)} onClick={() => patch({ goals: toggle(form.goals, g) as Goal[] })}>{GOAL_EMOJI[g]} {GOAL_LABELS[g]}</Chip>)}</div>
      </Field>
      <Button full size="lg" disabled={form.interests.length === 0} onClick={next}>{t('다음')}</Button>
    </>
  );
}

/** 7. What are you looking for? — Open To (purposes 는 파생) */
function OpenToStep({ form, patch, next }: StepProps) {
  const openTo = form.openTo ?? [];
  return (
    <>
      <Heading title={t('무엇을 찾고 있나요?')} sub={t('지금 열려 있는 것을 골라주세요. 언제든 바꿀 수 있어요.')} />
      <OpenToChips big value={openTo} onChange={(next) => patch({ openTo: next, purposes: purposesFromOpenTo(next) })} />
      <Button full size="lg" disabled={openTo.length === 0} onClick={next}>{t('다음')}</Button>
    </>
  );
}

/** 8. Schedule setup — 첫 수업 추가 / 샘플 불러오기 / 건너뛰기 → 가입 */
function ScheduleStep({ form, patch }: StepProps) {
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ name: '', day: 0, start: '10:00', end: '11:15' });
  const timetable = form.timetable ?? [];
  const alumni = isAlumniLike(form.stage);
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

  const finish = async (skip = false) => {
    setBusy(true);
    try {
      const { avatarType: _a, codeSent: _c, schoolName: _s, emailDomain: _d, ...input } = form;
      const hasCareer = !!input.career && Object.values(input.career).some(Boolean);
      const user = await api.auth.register({
        ...input,
        email: input.email.trim() || undefined,
        preferredPartner: input.preferredPartner || undefined,
        purposes: input.purposes.length ? input.purposes : purposesFromOpenTo(input.openTo ?? []),
        career: isAlumniLike(input.stage) && hasCareer ? input.career : undefined,
        timetable: skip ? [] : timetable,
      });
      sessionStorage.removeItem(KEY);
      await setCurrentUser(user);
      nav('/', { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };

  return (
    <>
      <Heading title={t('시간표를 설정해요')} sub={alumni ? t('졸업생은 건너뛰어도 괜찮아요. 시간표는 공강이 겹치는 친구를 찾는 데 쓰여요.') : t('공강이 겹치는 친구를 찾고, 수업별 스터디 크루에 들어갈 수 있어요. 강의실은 절대 공개되지 않아요.')} />
      <div className="card p-4 space-y-3">
        <b className="text-[14px] flex items-center gap-1.5"><Plus size={15} className="text-primary" />{t('첫 수업 추가')}</b>
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
        <Button full size="lg" onClick={() => finish(false)} loading={busy}>{t('AroundU 시작하기')}</Button>
        <Button full size="lg" variant="ghost" onClick={() => finish(true)} disabled={busy}>{t('지금은 건너뛰기')}</Button>
      </div>
    </>
  );
}
