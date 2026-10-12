import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, GraduationCap, Heart, Sparkles } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import type { AiCard, AiProfileDraft } from '@core/api/types';
import type { Goal, Interest, Purpose, Role, School } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { ALL_GOALS, ALL_INTERESTS, GOAL_EMOJI, GOAL_LABELS, INTEREST_EMOJI, INTEREST_LABELS } from '@core/lib/labels';
import { dday } from '@core/lib/recommend';
import { cn } from '@core/lib/cn';
import { Button, Chip, Field, Input, Textarea } from '@/components/ui';
import { TopBar } from '@/components/layout/TopBar';
import { useAiEnabled } from '@/hooks/useAiEnabled';
import { DEFAULT_FV } from './OnboardingPage';

type Step = 'school' | 'about' | 'name';
const STEPS: Step[] = ['school', 'about', 'name'];
const GOALS = ALL_GOALS.filter((g) => g !== 'dating');
const YEARS: { v: number; label: string }[] = [{ v: 1, label: 'Freshman' }, { v: 2, label: 'Sophomore' }, { v: 3, label: 'Junior' }, { v: 4, label: 'Senior' }, { v: 5, label: 'Grad student' }];
const KEY = 'aroundu.start.draft';

const L = lang === 'en' ? {
  schoolQ: 'Which school do you go to?', schoolSub: 'You’ll see events, clubs and classes from your campus.',
  aboutQ: 'Tell us a bit about you', aboutSub: 'We use this to pick events, clubs and people for you. You can change it anytime.',
  freePlaceholder: 'e.g. CS sophomore, into startups and climbing, looking for a summer internship and people to study with',
  fill: 'Fill it in for me', filling: 'Reading…', or: 'Or pick below',
  major: 'Major', majorPh: 'e.g. Computer Science', year: 'Year', goals: 'This semester I want to…', interests: 'I’m into…',
  picked: 'Picked for you', pickedSub: 'Tap ♡ to save clubs — you’ll find everything in Campus after you join.',
  nameQ: 'What should we call you?', nameSub: 'This is how classmates will see you. Use a first name or nickname.',
  name: 'Name', birth: 'Birth year', start: 'Start AroundU', next: 'Next', step: 'Step',
} : {
  schoolQ: '어느 학교에 다니세요?', schoolSub: '우리 캠퍼스의 행사·동아리·수업을 보여드려요.',
  aboutQ: '어떤 사람인지 알려주세요', aboutSub: '행사·동아리·사람 추천에 써요. 언제든 바꿀 수 있어요.',
  freePlaceholder: '예: 컴공 2학년, 창업이랑 클라이밍 좋아하고 여름 인턴이랑 같이 공부할 사람 찾는 중',
  fill: '이걸로 채워줘', filling: '읽는 중…', or: '아니면 아래에서 고르세요',
  major: '전공', majorPh: '예: 컴퓨터공학', year: '학년', goals: '이번 학기에 하고 싶은 것', interests: '관심 있는 것',
  picked: '추천', pickedSub: '♡ 를 누르면 동아리가 저장돼요. 가입 후 Campus 탭에서 모두 볼 수 있어요.',
  nameQ: '뭐라고 불러드릴까요?', nameSub: '같은 학교 학생들에게 보이는 이름이에요.',
  name: '이름', birth: '출생 연도', start: 'AroundU 시작하기', next: '다음', step: '단계',
};

interface Draft { schoolId: string; text: string; department: string; yearInSchool: number; goals: Goal[]; interests: Interest[]; purposes: Purpose[]; lookingFor: Role[]; canOffer: Role[]; bio: string; likes: string; freeTime: string; nickname: string; birthYear: string; savedOrgIds: string[] }
const EMPTY: Draft = { schoolId: '', text: '', department: '', yearInSchool: 0, goals: [], interests: [], purposes: [], lookingFor: [], canOffer: [], bio: '', likes: '', freeTime: '', nickname: '', birthYear: '', savedOrgIds: [] };

/**
 * 첫 실행 — 학교 고르기 → 몇 가지 질문 (자기소개 한두 줄을 쓰면 AI 가 채운다) → 이름.
 * 긴 가입 양식(/onboarding)은 나중에 프로필에서 채우게 두고, 여기서는 앱을 바로 쓸 만큼만 묻는다.
 */
export function StartPage() {
  const nav = useNavigate();
  const ai = useAiEnabled();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const [step, setStep] = useState<Step>('school');
  const [d, setD] = useState<Draft>(() => { try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') }; } catch { return EMPTY; } });
  const [schools, setSchools] = useState<School[]>([]);
  const [busy, setBusy] = useState(false);
  const [suggest, setSuggest] = useState<{ clubs: AiCard[]; listings: AiCard[] } | null>(null);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* */ } }, [d]);
  useEffect(() => { void api.schools.search('').then(setSchools).catch(() => setSchools([])); }, []);
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const tog = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const idx = STEPS.indexOf(step);

  const fill = async () => {
    setBusy(true);
    try {
      const r = await api.ai.profileDraft(d.text, d.schoolId);
      const p: AiProfileDraft = r.draft;
      patch({
        department: p.department || d.department, yearInSchool: p.role === 'graduate' ? 5 : p.yearInSchool || d.yearInSchool,
        goals: p.goals.length ? p.goals : d.goals, interests: p.interests.length ? p.interests : d.interests, purposes: p.purposes,
        lookingFor: p.lookingFor, canOffer: p.canOffer, bio: p.bio, likes: p.likes, freeTime: p.freeTime,
      });
      setSuggest(r.suggestions);
    } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const finish = async () => {
    setBusy(true);
    try {
      const yr = d.yearInSchool || 1;
      const thisYear = new Date().getFullYear();
      const user = await api.auth.register({
        nickname: d.nickname.trim(), birthYear: Number(d.birthYear), gender: 'private', avatar: { emoji: '🙂', hue: 210, photoType: 'face' },
        schoolId: d.schoolId, role: yr >= 5 ? 'graduate' : 'undergraduate', department: d.department.trim(), year: yr >= 5 ? thisYear : thisYear - yr + 1,
        emailVerified: false, showSchool: true, showDepartment: true,
        interests: d.interests, purposes: d.purposes.length ? d.purposes : ['friend'], bio: d.bio, likes: d.likes, freeTime: d.freeTime, availability: 'after18',
        fieldVisibility: DEFAULT_FV, prompts: [], goals: d.goals, lookingFor: d.lookingFor, canOffer: d.canOffer, meetPreference: [], interestedOrgIds: d.savedOrgIds,
        locationPermission: 'undecided', notifications: true,
      });
      sessionStorage.removeItem(KEY);
      await setCurrentUser(user);
      nav('/', { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };

  const birth = Number(d.birthYear);
  const birthOk = birth >= 1950 && birth <= new Date().getFullYear() - 15;
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <TopBar back onBack={idx > 0 ? () => setStep(STEPS[idx - 1]) : undefined} title={<span className="text-[15px]">{L.step} {idx + 1}/{STEPS.length}</span>} />
      <div className="h-1 mx-4 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} /></div>
      <div className="flex-1 px-5 pt-5 pb-8 space-y-5">
        {step === 'school' && (
          <>
            <div><h2 className="text-[24px] font-extrabold leading-tight">{L.schoolQ}</h2><p className="text-[14px] text-ink-3 mt-1">{L.schoolSub}</p></div>
            <div className="space-y-2.5">
              {schools.map((s) => (
                <button key={s.id} onClick={() => patch({ schoolId: s.id })} className={cn('w-full rounded-2xl border px-4 py-4 flex items-center gap-3 text-left press', d.schoolId === s.id ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
                  <span className="h-11 w-11 rounded-xl bg-surface-2 text-primary grid place-items-center"><GraduationCap size={20} /></span>
                  <span className="flex-1"><b className="block text-[16px] text-primary">{s.name}</b><span className="text-[12px] text-ink-3">{s.region}</span></span>
                  {d.schoolId === s.id && <Check size={20} className="text-primary" />}
                </button>
              ))}
            </div>
            <Button full size="lg" disabled={!d.schoolId} onClick={() => setStep('about')}>{L.next}</Button>
          </>
        )}

        {step === 'about' && (
          <>
            <div><h2 className="text-[24px] font-extrabold leading-tight">{L.aboutQ}</h2><p className="text-[14px] text-ink-3 mt-1">{L.aboutSub}</p></div>
            {ai && (
              <div className="rounded-2xl bg-primary-soft p-3 space-y-2">
                <Textarea rows={3} value={d.text} onChange={(e) => patch({ text: e.target.value })} placeholder={L.freePlaceholder} className="bg-surface" />
                <Button full variant="primary" icon={<Sparkles size={16} />} loading={busy} disabled={d.text.trim().length < 10} onClick={fill}>{busy ? L.filling : L.fill}</Button>
              </div>
            )}
            {ai && <p className="text-center text-[12px] text-ink-3">{L.or}</p>}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label={L.major}><Input value={d.department} onChange={(e) => patch({ department: e.target.value })} placeholder={L.majorPh} /></Field>
              <Field label={L.year}><select value={d.yearInSchool} onChange={(e) => patch({ yearInSchool: Number(e.target.value) })} className="h-11 rounded-xl bg-surface-2 px-3 text-[14px]"><option value={0}>—</option>{YEARS.map((y) => <option key={y.v} value={y.v}>{y.label}</option>)}</select></Field>
            </div>
            <Field label={L.goals}><div className="flex flex-wrap gap-2">{GOALS.map((g) => <Chip key={g} active={d.goals.includes(g)} onClick={() => patch({ goals: tog(d.goals, g) })}>{GOAL_EMOJI[g]} {GOAL_LABELS[g]}</Chip>)}</div></Field>
            <Field label={L.interests}><div className="flex flex-wrap gap-2">{ALL_INTERESTS.map((i) => <Chip key={i} active={d.interests.includes(i)} onClick={() => patch({ interests: tog(d.interests, i) })}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Chip>)}</div></Field>
            {suggest && (suggest.clubs.length > 0 || suggest.listings.length > 0) && (
              <div className="space-y-2">
                <div><b className="text-[15px] flex items-center gap-1.5"><Sparkles size={15} className="text-primary" />{L.picked}</b><p className="text-[12px] text-ink-3">{L.pickedSub}</p></div>
                {suggest.clubs.map((c) => c.kind === 'club' && (
                  <div key={c.id} className="rounded-2xl bg-surface border border-line px-3.5 py-3 flex items-center gap-3">
                    <span className="flex-1 min-w-0"><b className="block text-[14px] text-primary truncate">{c.name}</b><span className="block text-[12px] text-ink-3 truncate">{c.summary}</span></span>
                    <button onClick={() => patch({ savedOrgIds: tog(d.savedOrgIds, c.id) })} aria-label="Save" className={cn('h-9 w-9 rounded-full grid place-items-center shrink-0', d.savedOrgIds.includes(c.id) ? 'bg-primary text-white' : 'bg-surface-2 text-primary')}><Heart size={16} fill={d.savedOrgIds.includes(c.id) ? 'currentColor' : 'none'} /></button>
                  </div>
                ))}
                {suggest.listings.map((c) => c.kind === 'listing' && (
                  <div key={c.id} className="rounded-2xl bg-surface border border-line px-3.5 py-3 flex items-center gap-3">
                    <span className="flex-1 min-w-0"><b className="block text-[14px] text-primary truncate">{c.title}</b><span className="block text-[12px] text-ink-3 truncate">{c.host}</span></span>
                    {c.deadline && <span className="h-6 px-2 rounded-full bg-surface-2 text-ink-2 text-[11px] font-bold shrink-0 grid place-items-center">{dday(c.deadline)}</span>}
                  </div>
                ))}
              </div>
            )}
            <Button full size="lg" disabled={d.goals.length === 0 || d.interests.length === 0} onClick={() => setStep('name')}>{L.next}</Button>
          </>
        )}

        {step === 'name' && (
          <>
            <div><h2 className="text-[24px] font-extrabold leading-tight">{L.nameQ}</h2><p className="text-[14px] text-ink-3 mt-1">{L.nameSub}</p></div>
            <Field label={L.name}><Input autoFocus maxLength={20} value={d.nickname} onChange={(e) => patch({ nickname: e.target.value })} /></Field>
            <Field label={L.birth}><Input inputMode="numeric" maxLength={4} placeholder="2005" value={d.birthYear} onChange={(e) => patch({ birthYear: e.target.value.replace(/\D/g, '') })} /></Field>
            <Button full size="lg" loading={busy} disabled={!d.nickname.trim() || !birthOk} onClick={finish}>{L.start}</Button>
          </>
        )}
      </div>
    </div>
  );
}
