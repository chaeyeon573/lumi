import { useEffect, useState } from 'react';
import { t, lang } from '@core/i18n';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Bell, Check, GraduationCap, MapPin, Search, ShieldCheck } from 'lucide-react';
import type { RegisterInput } from '@core/api';
import type { Availability, Gender, Interest, Purpose, School, UniversityRole, Visibility, ProfileField } from '@core/types';
import { Button, Chip, Field, Input, Textarea, Select, Segmented, Toggle, VisibilityPicker } from '@/components/ui';
import { TopBar } from '@/components/layout/TopBar';
import { ALL_AVAILABILITY, ALL_INTERESTS, ALL_PURPOSES, AVAILABILITY_LABELS, INTEREST_EMOJI, INTEREST_LABELS, PURPOSE_LABELS, ROLE_LABELS, GENDER_LABELS, ALL_GOALS, GOAL_EMOJI, GOAL_LABELS, ALL_MEET_PREFS, MEET_PREF_LABELS, MEET_PREF_EMOJI } from '@core/lib/labels';
import type { Goal, MeetPreference } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { PromptEditor, VoicePromptEditor, PollEditor } from '@/components/prompts/PromptComponents';
import { REQUIRED_TEXT_PROMPTS, promptsSatisfyRules, FIRST_PROMPT_ID } from '@core/data/prompts';

const STEPS = ['basic', 'school', 'interests', 'profile', 'prompts', 'permissions'] as const;
type Step = typeof STEPS[number];

const EMOJIS = ['🙂', '😎', '🧑‍💻', '👩‍🎨', '🧑‍🔬', '🏃', '🎸', '📚', '🌱', '🎨', '🚀', '🧗', '☕', '🐱', '🦊', '🎧'];
export const DEFAULT_FV: Record<ProfileField, Visibility> = { bio: 'school', likes: 'school', freeTime: 'school', height: 'private', availability: 'school', preferredPartner: 'private', purposes: 'school', interests: 'public', posts: 'school', prompts: 'public', timetable: 'friends', goals: 'school', living: 'friends' };

type Draft = RegisterInput & { avatarType: 'face' | 'masked' | 'back'; email: string; codeSent: boolean };
const initial: Draft = {
  nickname: '', birthYear: 2002, gender: 'private', avatar: { emoji: '🙂', hue: 210, photoType: 'face' }, avatarType: 'face',
  schoolId: '', role: 'undergraduate', department: '', year: 2022, emailVerified: false, showSchool: true, showDepartment: true, email: '', codeSent: false,
  interests: [], purposes: [], bio: '', likes: '', freeTime: '', height: undefined, availability: 'after18', preferredPartner: '',
  fieldVisibility: DEFAULT_FV, prompts: [{ questionId: FIRST_PROMPT_ID, answer: '' }], voicePrompt: undefined, poll: undefined, goals: [], lookingFor: [], canOffer: [], living: undefined, meetPreference: [], locationPermission: 'undecided', notifications: true,
};

const KEY = 'aroundu.onboarding.draft';

export function OnboardingPage() {
  const nav = useNavigate();
  const [form, setForm] = useState<Draft>(() => { try { return { ...initial, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') }; } catch { return initial; } });
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(form)); } catch { /* */ } }, [form]);
  const patch = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  const go = (step: Step) => nav(`/onboarding/${step}`);

  return (
    <Routes>
      <Route index element={<Navigate to="basic" replace />} />
      <Route path="basic" element={<Frame step="basic"><BasicStep form={form} patch={patch} next={() => go('school')} /></Frame>} />
      <Route path="school" element={<Frame step="school"><SchoolStep form={form} patch={patch} next={() => go('interests')} /></Frame>} />
      <Route path="interests" element={<Frame step="interests"><InterestsStep form={form} patch={patch} next={() => go('profile')} /></Frame>} />
      <Route path="profile" element={<Frame step="profile"><ProfileStep form={form} patch={patch} next={() => go('prompts')} /></Frame>} />
      <Route path="prompts" element={<Frame step="prompts"><PromptsStep form={form} patch={patch} next={() => go('permissions')} /></Frame>} />
      <Route path="permissions" element={<Frame step="permissions"><PermissionsStep form={form} patch={patch} /></Frame>} />
    </Routes>
  );
}

function Frame({ step, children }: { step: Step; children: React.ReactNode }) {
  const idx = STEPS.indexOf(step);
  const titles: Record<Step, string> = { basic: t('기본 정보'), school: t('학교 인증'), interests: t('관심사와 이용 목적'), profile: t('프로필 작성'), prompts: t('질문 답변'), permissions: t('권한 설정') };
  return (
    <div className="min-h-full flex flex-col">
      <TopBar back title={<span className="text-[15px]">{titles[step]} <span className="text-ink-3 font-medium">{idx + 1}/{STEPS.length}</span></span>} />
      <div className="px-4 pt-1"><div className="h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} /></div></div>
      <div className="flex-1 px-4 py-5 space-y-5">{children}</div>
    </div>
  );
}

type StepProps = { form: typeof initial; patch: (p: Partial<typeof initial>) => void; next?: () => void };

function BasicStep({ form, patch, next }: StepProps) {
  const valid = form.nickname.trim().length >= 2 && form.avatar.emoji;
  const years = Array.from({ length: 30 }, (_, i) => 2008 - i);
  return (
    <>
      <div><h2 className="text-[22px] font-extrabold">{t('반가워요! 기본 정보를 알려주세요')}</h2><p className="text-[13px] text-ink-3 mt-1">{t('이름 또는 닉네임, 생년, 성별, 프로필 사진 1장이 필요해요.')}</p></div>
      <Field label={t('이름 또는 닉네임')} required><Input placeholder={t('예: 하늘')} value={form.nickname} onChange={(e) => patch({ nickname: e.target.value })} maxLength={12} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('생년')} required><Select value={form.birthYear} onChange={(e) => patch({ birthYear: Number(e.target.value) })}>{years.map((y) => <option key={y} value={y}>{y}{t('년')}</option>)}</Select></Field>
        <Field label={t('성별')} required><Select value={form.gender} onChange={(e) => patch({ gender: e.target.value as Gender })}>{(Object.keys(GENDER_LABELS) as Gender[]).map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}</Select></Field>
      </div>
      <Field label={t('프로필 사진 1장')} required hint={t('얼굴 공개를 권장하지만 마스크, 가면, 뒷모습 사진도 괜찮아요. (데모에서는 이모지로 대체)')}>
        <div className="flex items-center gap-4 mb-3">
          <div className="h-20 w-20 rounded-3xl grid place-items-center text-4xl" style={{ background: `linear-gradient(135deg, hsl(${form.avatar.hue} 85% 88%), hsl(${(form.avatar.hue + 40) % 360} 80% 74%))` }}>{form.avatar.emoji}</div>
          <div className="flex-1">
            <Segmented value={form.avatarType} onChange={(v) => patch({ avatarType: v, avatar: { ...form.avatar, photoType: v } })} options={[{ value: 'face', label: t('얼굴') }, { value: 'masked', label: t('마스크·가면') }, { value: 'back', label: t('뒷모습') }]} />
            <input type="range" min={0} max={359} value={form.avatar.hue} onChange={(e) => patch({ avatar: { ...form.avatar, hue: Number(e.target.value) } })} className="w-full mt-3 accent-primary" aria-label={t('배경 색상')} />
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJIS.map((e) => <button key={e} type="button" onClick={() => patch({ avatar: { ...form.avatar, emoji: e } })} className={cn('h-10 rounded-xl text-xl grid place-items-center', form.avatar.emoji === e ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2')}>{e}</button>)}
        </div>
      </Field>
      <div className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] text-ink-2 flex gap-2"><ShieldCheck size={16} className="text-mint shrink-0" />{t('본인 인증은 가입 후 프로필에서 진행할 수 있어요. 인증 상태는 프로필에 배지로 표시돼요.')}</div>
      <Button full size="lg" disabled={!valid} onClick={next}>{t('다음')}</Button>
    </>
  );
}

function SchoolStep({ form, patch, next }: StepProps) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [searching, setSearching] = useState(false);
  const [code, setCode] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const showToast = useAppStore((s) => s.showToast);
  const school = results.find((s) => s.id === form.schoolId);
  const [selected, setSelected] = useState<School | null>(null);

  useEffect(() => {
    let alive = true;
    setSearching(true);
    api.schools.search(q).then((r) => { if (alive) { setResults(r); setSearching(false); } });
    return () => { alive = false; };
  }, [q]);
  useEffect(() => { if (school) setSelected(school); }, [school]);

  const sendCode = async () => {
    if (!selected) return;
    setBusy(true);
    const r = await api.schools.sendVerificationCode(form.email, selected.id);
    setBusy(false); setHint(r.hint);
    if (r.ok) patch({ codeSent: true });
  };
  const verify = async () => {
    setBusy(true);
    const r = await api.schools.verifyCode(form.email, code);
    setBusy(false);
    if (r.ok) { patch({ emailVerified: true }); showToast(t('학교 인증이 완료되었어요!'), 'success'); } else showToast(t('인증 코드가 올바르지 않아요.'), 'error');
  };
  const valid = !!selected && form.department.trim().length > 0;

  return (
    <>
      <div><h2 className="text-[22px] font-extrabold">{t('학교를 인증해주세요')}</h2><p className="text-[13px] text-ink-3 mt-1">{t('학교 이메일로 인증하면 프로필에 학교 인증 배지가 표시돼요.')}</p></div>
      <Field label={t('학교 검색')} required>
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input className="pl-9" placeholder={t('학교명 또는 지역')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {searching && results.length === 0 && <span className="text-[12px] text-ink-3">{t('검색 중…')}</span>}
          {results.map((s) => <Chip key={s.id} active={selected?.id === s.id} onClick={() => { setSelected(s); patch({ schoolId: s.id, emailVerified: false, codeSent: false }); }}>{s.name}</Chip>)}
        </div>
      </Field>
      {selected && (
        <>
          <Field label={t('구분')} required><Segmented value={form.role} onChange={(v) => patch({ role: v as UniversityRole })} options={(Object.keys(ROLE_LABELS) as UniversityRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))} /></Field>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label={t('학과 또는 전공')} required><Input placeholder={t('예: 경영학과')} value={form.department} onChange={(e) => patch({ department: e.target.value })} /></Field>
            <Field label={form.role === 'alumni' ? t('졸업 연도') : t('입학 연도')} required><Input type="number" value={form.year} onChange={(e) => patch({ year: Number(e.target.value) })} /></Field>
          </div>
          <Field label={t('학교 이메일 인증')} hint={hint || `@${selected.emailDomain}${t(' 이메일로 인증 코드를 보내드려요.')}`}>
            {form.emailVerified ? (
              <div className="flex items-center gap-2 rounded-xl bg-mint-soft text-mint px-3.5 h-11 text-[14px] font-semibold"><Check size={16} /> {t('인증 완료 · 학교 인증 배지가 부여돼요')}</div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2"><Input placeholder={`id@${selected.emailDomain}`} value={form.email} onChange={(e) => patch({ email: e.target.value })} /><Button variant="secondary" onClick={sendCode} loading={busy} disabled={!form.email}>{t('코드 전송')}</Button></div>
                {form.codeSent && <div className="flex gap-2"><Input placeholder={t('인증 코드 6자리')} value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} /><Button onClick={verify} loading={busy} disabled={code.length < 6}>{t('확인')}</Button></div>}
              </div>
            )}
          </Field>
          <div className="card px-4 divide-y divide-line">
            <Toggle label={t('학교명 공개')} description={t('프로필과 카드에 학교명을 표시해요')} checked={form.showSchool} onChange={(v) => patch({ showSchool: v })} />
            <Toggle label={t('학과 공개')} description={t('프로필과 카드에 학과를 표시해요')} checked={form.showDepartment} onChange={(v) => patch({ showDepartment: v })} />
          </div>
        </>
      )}
      <Button full size="lg" disabled={!valid} onClick={next}>{form.emailVerified ? t('다음') : t('나중에 인증하고 다음')}</Button>
    </>
  );
}

function InterestsStep({ form, patch, next }: StepProps) {
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <>
      <div><h2 className="text-[22px] font-extrabold">{t('무엇을 함께하고 싶나요?')}</h2><p className="text-[13px] text-ink-3 mt-1">{t('이번 학기 목표와 관심 활동을 여러 개 선택할 수 있어요. 나머지는 나중에 프로필에서 채워도 돼요.')}</p></div>
      <Field label={t('이번 학기에 하고 싶은 것')} required hint={t('추천의 기준이 돼요')}>
        <div className="flex flex-wrap gap-2">{ALL_GOALS.map((g) => <Chip key={g} active={form.goals.includes(g)} onClick={() => patch({ goals: toggle(form.goals, g) as Goal[] })}>{GOAL_EMOJI[g]} {GOAL_LABELS[g]}</Chip>)}</div>
      </Field>
      <Field label={t('어떤 사람을 만나고 싶어요?')} hint={t('선택하면 그 기준으로 먼저 추천해요')}>
        <div className="flex flex-wrap gap-2">{ALL_MEET_PREFS.map((p) => <Chip key={p} active={form.meetPreference!.includes(p)} onClick={() => patch({ meetPreference: toggle(form.meetPreference!, p) as MeetPreference[] })}>{MEET_PREF_EMOJI[p]} {MEET_PREF_LABELS[p]}</Chip>)}</div>
      </Field>
      <Field label={t('관심 활동')} required hint={`${form.interests.length}${t('개 선택')}`}>
        <div className="flex flex-wrap gap-2">{ALL_INTERESTS.map((i) => <Chip key={i} active={form.interests.includes(i)} onClick={() => patch({ interests: toggle(form.interests, i) as Interest[] })}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Chip>)}</div>
      </Field>
      <Field label={t('이용 목적')} required hint={t('상관없음을 고르면 모든 목적의 추천을 받아요')}>
        <div className="flex flex-wrap gap-2">{ALL_PURPOSES.map((p) => <Chip key={p} active={form.purposes.includes(p)} onClick={() => patch({ purposes: toggle(form.purposes, p) as Purpose[] })}>{PURPOSE_LABELS[p]}</Chip>)}</div>
      </Field>
      <Button full size="lg" disabled={form.interests.length === 0 || form.purposes.length === 0 || form.goals.length === 0} onClick={next}>{t('다음')}</Button>
    </>
  );
}

function ProfileStep({ form, patch, next }: StepProps) {
  const fv = (k: ProfileField) => <VisibilityPicker compact value={form.fieldVisibility[k]} onChange={(v) => patch({ fieldVisibility: { ...form.fieldVisibility, [k]: v } })} label={`${k}${t(' 공개 범위')}`} />;
  return (
    <>
      <div><h2 className="text-[22px] font-extrabold">{t('프로필을 작성해주세요')}</h2><p className="text-[13px] text-ink-3 mt-1">{t('모든 항목에 공개 범위를 따로 설정할 수 있어요.')}</p></div>
      <Field label={t('자기소개')} right={fv('bio')}><Textarea placeholder={t('어떤 사람인지 짧게 소개해주세요')} value={form.bio} onChange={(e) => patch({ bio: e.target.value })} maxLength={200} /></Field>
      <Field label={t('좋아하는 것')} right={fv('likes')}><Input placeholder={t('예: 스페셜티 커피, 전시, 러닝')} value={form.likes} onChange={(e) => patch({ likes: e.target.value })} /></Field>
      <Field label={t('자유시간에 하고 싶은 활동')} right={fv('freeTime')}><Input placeholder={t('예: 카페에서 코딩, 백양로 산책')} value={form.freeTime} onChange={(e) => patch({ freeTime: e.target.value })} /></Field>
      <Field label={t('활동 가능한 시간')} right={fv('availability')}>
        <div className="flex flex-wrap gap-2">{ALL_AVAILABILITY.map((a) => <Chip key={a} active={form.availability === a} onClick={() => patch({ availability: a as Availability })}>{AVAILABILITY_LABELS[a]}</Chip>)}</div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('키 (선택)')} right={fv('height')}><Input type="number" placeholder="cm" value={form.height ?? ''} onChange={(e) => patch({ height: e.target.value ? Number(e.target.value) : undefined })} /></Field>
        <Field label={t('이용 목적 공개')} right={fv('purposes')}><div className="h-11 flex items-center text-[13px] text-ink-3">{form.purposes.map((p) => PURPOSE_LABELS[p]).join(', ')}</div></Field>
      </div>
      <Field label={t('관심 있는 사람의 조건 (선택)')} right={fv('preferredPartner')}><Input placeholder={t('예: 창업이나 AI에 관심 있는 분')} value={form.preferredPartner ?? ''} onChange={(e) => patch({ preferredPartner: e.target.value })} /></Field>
      <Button full size="lg" onClick={next}>{t('다음')}</Button>
    </>
  );
}

function PromptsStep({ form, patch, next }: StepProps) {
  const answered = form.prompts.filter((p) => p.answer.trim()).length;
  const ok = promptsSatisfyRules(form.prompts);
  return (
    <>
      <div><h2 className="text-[22px] font-extrabold">{t('질문에 답해주세요')}</h2><p className="text-[13px] text-ink-3 mt-1">{lang === 'en' ? `${REQUIRED_TEXT_PROMPTS} written prompts are required. Answers appear on your card.` : `텍스트 질문 ${REQUIRED_TEXT_PROMPTS}개는 필수예요. 답은 프로필 카드에 그대로 보여요.`}</p></div>
      <Field label={`${t('텍스트 질문 (')}${answered}/${REQUIRED_TEXT_PROMPTS}${t(' 필수)')}`} required right={<VisibilityPicker compact value={form.fieldVisibility.prompts} onChange={(v) => patch({ fieldVisibility: { ...form.fieldVisibility, prompts: v } })} label={t('질문 답변 공개 범위')} />}>
        <PromptEditor value={form.prompts} onChange={(prompts) => patch({ prompts })} />
      </Field>
      <Field label={t('음성 질문 (선택)')} hint={t('30초 안에 목소리로 답해요.')}><VoicePromptEditor value={form.voicePrompt} onChange={(voicePrompt) => patch({ voicePrompt })} /></Field>
      <Field label={t('투표형 질문 (선택)')} hint={t('방문자가 한 표씩 던질 수 있어요.')}><PollEditor value={form.poll} onChange={(poll) => patch({ poll })} /></Field>
      <Button full size="lg" disabled={!ok} onClick={next}>{ok ? t('다음') : `${t('질문 ')}${REQUIRED_TEXT_PROMPTS - Math.min(answered, REQUIRED_TEXT_PROMPTS)}${t('개 더 답해주세요')}`}</Button>
    </>
  );
}

function PermissionsStep({ form, patch }: StepProps) {
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const finish = async () => {
    setBusy(true);
    try {
      const { avatarType: _a, codeSent: _c, ...input } = form;
      const user = await api.auth.register({ ...input, email: input.email.trim() || undefined, preferredPartner: input.preferredPartner || undefined });
      sessionStorage.removeItem(KEY);
      await setCurrentUser(user);
      nav('/', { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };
  return (
    <>
      <div><h2 className="text-[22px] font-extrabold">{t('마지막이에요')}</h2><p className="text-[13px] text-ink-3 mt-1">{t('주변 활동 추천과 알림을 위해 권한이 필요해요.')}</p></div>
      <div className="card p-4">
        <div className="flex items-start gap-3"><span className="h-11 w-11 rounded-2xl bg-primary-soft text-primary grid place-items-center shrink-0"><MapPin size={20} /></span>
          <div className="flex-1"><b className="text-[15px]">{t('위치 권한')}</b><p className="text-[12px] text-ink-3 mt-0.5 leading-relaxed">{t('위치는')} <b className="text-ink-2">{t('주변 활동 추천에만')}</b> {t('사용해요. 정확한 위치는 다른 사용자에게 절대 공개되지 않고, 지도에는 활동 장소만 표시돼요.')}</p></div></div>
        <Segmented className="mt-3" value={form.locationPermission} onChange={(v) => patch({ locationPermission: v })} options={[{ value: 'granted', label: t('허용') }, { value: 'denied', label: t('허용 안 함') }, { value: 'undecided', label: t('나중에') }]} />
      </div>
      <div className="card p-4">
        <div className="flex items-start gap-3"><span className="h-11 w-11 rounded-2xl bg-gold-soft text-[#B57A0E] grid place-items-center shrink-0"><Bell size={20} /></span>
          <div className="flex-1"><b className="text-[15px]">{t('알림 권한')}</b><p className="text-[12px] text-ink-3 mt-0.5">{t('참가 승인, 친구 요청 수락, 활동 시작 전 알림을 받아요.')}</p></div></div>
        <div className="px-1"><Toggle label={t('알림 허용')} checked={form.notifications} onChange={(v) => patch({ notifications: v })} /></div>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-ink-3"><GraduationCap size={14} />{form.emailVerified ? t('학교 인증 완료 — 배지가 표시돼요') : t('학교 인증은 프로필에서 나중에 완료할 수 있어요')}</div>
      <Button full size="lg" onClick={finish} loading={busy}>{t('AroundU 시작하기')}</Button>
    </>
  );
}
