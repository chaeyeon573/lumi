import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, GraduationCap, Briefcase, CalendarDays, Users, Coffee, FlaskConical, Trophy, Dumbbell, Landmark, House, UserRound } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import type { Goal, Interest, Purpose, School, UniversityRole } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { Button, Field, Input } from '@/components/ui';
import { TopBar } from '@/components/layout/TopBar';
import { DEFAULT_FV } from './OnboardingPage';
import { ComingSoonSchools } from './ComingSoonSchools';
import { takeReturnTo } from '@/lib/returnTo';

const en = lang === 'en';
type Step = 'name' | 'goals' | 'how' | 'school' | 'topics' | 'communities' | 'email';
const STEPS: Step[] = ['name', 'goals', 'how', 'school', 'topics', 'communities', 'email'];
const KEY = 'lumi.start.draft.v2';

/**
 * 목표 — 시안(2026-11-02) 그대로 5개 + Skip. 저장은 기존 필드(goals·interests·purposes)에만 한다.
 * “Make campus life easier” 는 맞는 goals 값이 없어 study 관심사로만 남긴다.
 */
const GOAL_OPTS: { key: string; Icon: typeof Briefcase; title: string; goals: Goal[]; interests: Interest[]; purposes: Purpose[] }[] = [
  { key: 'opps', Icon: Briefcase, title: en ? 'Discover opportunities' : '기회 찾기', goals: ['internship', 'lab', 'scholarship', 'hackathon'], interests: ['research'], purposes: [] },
  { key: 'classes', Icon: CalendarDays, title: en ? 'Plan my classes' : '수업 계획하기', goals: [], interests: ['study'], purposes: ['study'] },
  { key: 'involved', Icon: Users, title: en ? 'Join communities' : '커뮤니티 참여', goals: ['join_club'], interests: ['club'], purposes: ['club'] },
  { key: 'wellness', Icon: Dumbbell, title: en ? 'Campus life & wellness' : '캠퍼스 생활·건강', goals: [], interests: ['exercise', 'meal'], purposes: [] },
  { key: 'people', Icon: Coffee, title: en ? 'Meet new people' : '새 사람 만나기', goals: ['friends'], interests: ['coffee'], purposes: ['friend'] },
];

/** “Here’s what you get” — 시안처럼 아이콘 + 제목만 */
const HELPS = [
  { Icon: CalendarDays, title: en ? 'Classes & Schedule' : '수업·시간표' },
  { Icon: Briefcase, title: en ? 'Events & Opportunities' : '행사·기회' },
  { Icon: Users, title: en ? 'Communities' : '커뮤니티' },
  { Icon: Coffee, title: en ? 'Meet & Connect' : '만나고 연결하기' },
];

/** 관심 주제 — 시안 “What would you like to discover?” 8개. 저장은 goals/interests 로 (피드·For You 추천에 쓰인다) */
const TOPICS: { key: string; Icon: typeof Briefcase; en: string; ko: string; goals: Goal[]; interests: Interest[] }[] = [
  { key: 'jobs', Icon: Briefcase, en: 'Internships & Jobs', ko: '인턴·일자리', goals: ['internship'], interests: [] },
  { key: 'research', Icon: FlaskConical, en: 'Research', ko: '연구', goals: ['lab'], interests: ['research'] },
  { key: 'hack', Icon: Trophy, en: 'Hackathons & Competitions', ko: '해커톤·공모전', goals: ['hackathon'], interests: [] },
  { key: 'funding', Icon: GraduationCap, en: 'Scholarships & Funding', ko: '장학금·펀딩', goals: ['scholarship'], interests: [] },
  { key: 'events', Icon: CalendarDays, en: 'Campus Events', ko: '캠퍼스 행사', goals: [], interests: ['networking'] },
  { key: 'clubs', Icon: Users, en: 'Clubs & Communities', ko: '동아리·커뮤니티', goals: ['join_club'], interests: ['club'] },
  { key: 'sports', Icon: Dumbbell, en: 'Sports & Fitness', ko: '스포츠·운동', goals: [], interests: ['exercise'] },
  { key: 'food', Icon: Coffee, en: 'Food & Campus Life', ko: '맛집·캠퍼스 생활', goals: [], interests: ['meal'] },
];

const ROLES: { v: UniversityRole; Icon: typeof Briefcase; en: string; ko: string }[] = [{ v: 'undergraduate', Icon: GraduationCap, en: 'Undergraduate', ko: '학부생' }, { v: 'graduate', Icon: UserRound, en: 'Graduate', ko: '대학원생' }, { v: 'alumni', Icon: Users, en: 'Alumni', ko: '졸업생' }];

/** 커뮤니티 — 시안 목록. 저장할 칸이 따로 없어 goals/interests 로 옮긴다 (가입 후 Clubs & Groups 추천에 쓰인다) */
const COMMUNITIES: { key: string; Icon: typeof Briefcase; en: string; ko: string; goals: Goal[]; interests: Interest[] }[] = [
  { key: 'clubs', Icon: Users, en: 'Clubs', ko: '동아리', goals: ['join_club'], interests: ['club'] },
  { key: 'greek', Icon: Landmark, en: 'Fraternity / Sorority', ko: '프래터니티 / 소로리티', goals: ['join_club'], interests: ['club'] },
  { key: 'coop', Icon: House, en: 'Co-op Housing', ko: '코업 하우스', goals: [], interests: ['club'] },
  { key: 'lab', Icon: FlaskConical, en: 'Research Lab', ko: '연구실', goals: ['lab'], interests: ['research'] },
  { key: 'dept', Icon: GraduationCap, en: 'Department / Major', ko: '학과 / 전공', goals: [], interests: ['networking'] },
  { key: 'sports', Icon: Dumbbell, en: 'Sports / Recreation', ko: '스포츠 / 레크리에이션', goals: [], interests: ['exercise'] },
  { key: 'other', Icon: UserRound, en: 'Other', ko: '기타', goals: [], interests: [] },
];

interface Draft { nickname: string; birthYear: string; goalKeys: string[]; schoolId: string; role: UniversityRole | ''; yearInSchool: number; department: string; communities: string[]; topics: string[]; email: string }
const EMPTY: Draft = { nickname: '', birthYear: '', goalKeys: [], schoolId: '', role: '', yearInSchool: 0, department: '', communities: [], topics: [], email: '' };
const uniq = <T,>(a: T[]) => [...new Set(a)];

/** 선택 줄 — 아이콘 + 짧은 말 + 체크 (가볍게) */
function Pick({ icon, title, on, onClick }: { icon: React.ReactNode; title: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={cn('w-full rounded-2xl border px-4 h-14 text-left flex items-center gap-3 press transition', on ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
      <span className="text-primary shrink-0">{icon}</span>
      <b className="flex-1 min-w-0 text-[15px] font-semibold truncate">{title}</b>
      <span className={cn('h-6 w-6 rounded-full border-2 grid place-items-center shrink-0', on ? 'border-primary bg-primary text-white v2:text-on-primary' : 'border-line')}>{on && <Check size={14} />}</span>
    </button>
  );
}

/**
 * 첫 실행 (2026-11-02 사장님 시안, 글은 짧게) — 이름 → 목표 → 얻는 것 → 학교·신분 → 관심 주제 → 커뮤니티 → (학교 이메일) Get Started.
 */
export function StartPage() {
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const [step, setStep] = useState<Step>('name');
  const [d, setD] = useState<Draft>(() => { try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') }; } catch { return EMPTY; } });
  const [schools, setSchools] = useState<School[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* */ } }, [d]);
  useEffect(() => { void api.schools.search('').then(setSchools).catch(() => setSchools([])); }, []);
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const tog = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const idx = STEPS.indexOf(step);
  const go = (s: Step) => { setStep(s); window.scrollTo({ top: 0 }); };
  const next = () => go(STEPS[Math.min(idx + 1, STEPS.length - 1)]);

  // 학교 이메일 (선택) — 코드로 확인한 이메일만 계정에 붙인다. 브라우저를 지우거나 폰을 바꿔도 이메일 코드로 다시 들어온다
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [hint, setHint] = useState('');
  const sendCode = async () => {
    setBusy(true); setHint('');
    try { const r = await api.schools.sendVerificationCode(d.email.trim(), d.schoolId); setHint(r.hint); setCodeSent(r.ok); }
    catch (e) { setHint((e as Error).message); } finally { setBusy(false); }
  };
  const checkCode = async () => {
    setBusy(true);
    try { const r = await api.schools.verifyCode(d.email.trim(), code.trim()); if (r.ok) { setVerified(true); setHint(''); } else setHint(en ? 'That code didn’t match. Check the latest email and try again.' : '코드가 맞지 않아요. 가장 최근 메일의 코드를 확인해주세요.'); }
    catch (e) { setHint((e as Error).message); } finally { setBusy(false); }
  };

  const finish = async (withEmail: boolean) => {
    setBusy(true);
    try {
      const gs = GOAL_OPTS.filter((g) => d.goalKeys.includes(g.key));
      const cs = COMMUNITIES.filter((c) => d.communities.includes(c.key));
      const ts = TOPICS.filter((t) => d.topics.includes(t.key));
      const goals = uniq([...gs.flatMap((g) => g.goals), ...ts.flatMap((t) => t.goals), ...cs.flatMap((c) => c.goals)]);
      const interests = uniq([...gs.flatMap((g) => g.interests), ...ts.flatMap((t) => t.interests), ...cs.flatMap((c) => c.interests)]);
      const purposes = uniq(gs.flatMap((g) => g.purposes));
      const role = d.role || 'undergraduate';
      const thisYear = new Date().getFullYear();
      // 입학 연도는 묻지 않는다 (가볍게) — 이전 흐름과 같은 기본값 올해, 프로필에서 고칠 수 있다
      const year = thisYear;
      const user = await api.auth.register({
        nickname: d.nickname.trim(), birthYear: Number(d.birthYear), gender: 'private', avatar: { emoji: '🙂', hue: 210, photoType: 'face' },
        schoolId: d.schoolId, role, department: d.department.trim(), year,
        email: withEmail && verified ? d.email.trim() : undefined, emailVerified: withEmail && verified, showSchool: true, showDepartment: true,
        interests, purposes: purposes.length ? purposes : ['friend'], bio: '', likes: '', freeTime: '', availability: 'after18',
        fieldVisibility: DEFAULT_FV, prompts: [], goals, lookingFor: [], canOffer: [], meetPreference: [], interestedOrgIds: [],
        locationPermission: 'undecided', notifications: true,
      });
      sessionStorage.removeItem(KEY);
      await setCurrentUser(user);
      nav(takeReturnTo(), { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };

  const birth = Number(d.birthYear);
  // Lumi is 16+ (Terms of Use · /terms) — some freshmen start college at 16. Birth year only, so this is a floor, not proof
  const birthOk = birth >= 1950 && birth <= new Date().getFullYear() - 16;
  const school = schools.find((s) => s.id === d.schoolId);
  const name = d.nickname.trim();
  const Head = ({ q, sub }: { q: string; sub?: string }) => <div><h2 className="text-[26px] font-extrabold leading-tight">{q}</h2>{sub && <p className="text-[14px] text-ink-3 mt-1">{sub}</p>}</div>;
  const skip = step === 'goals' ? () => { patch({ goalKeys: [] }); next(); } : step === 'topics' ? () => { patch({ topics: [] }); next(); } : undefined;
  const NextBtn = ({ ok, text }: { ok: boolean; text?: string }) => (
    <>
      <Button full size="lg" disabled={!ok} onClick={next}>{text ?? (en ? 'Continue' : '계속')}</Button>
      {/* Skip 은 버튼 아래 — 위 오른쪽은 디자인 전환 버튼 자리 */}
      {skip && <button onClick={skip} className="w-full h-10 -mt-2 text-[14px] font-semibold text-ink-3">{en ? 'Skip' : '건너뛰기'}</button>}
    </>
  );

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <TopBar back onBack={idx > 0 ? () => go(STEPS[idx - 1]) : undefined}
        title={<span className="flex gap-1.5 w-[160px]">{STEPS.map((s2, i) => <span key={s2} className={cn('h-1 flex-1 rounded-full transition', i <= idx ? 'bg-primary' : 'bg-surface-2')} />)}</span>} />
      <div key={step} className="flex-1 px-5 pt-6 pb-8 space-y-5 animate-fade-in">
        {step === 'name' && (
          <>
            <Head q={en ? 'What should we call you?' : '뭐라고 불러드릴까요?'} sub={en ? 'This is how classmates see you.' : '같은 학교 학생들에게 보이는 이름이에요.'} />
            <Field label={en ? 'Name' : '이름'}><Input autoFocus maxLength={20} value={d.nickname} onChange={(e) => patch({ nickname: e.target.value })} placeholder={en ? 'e.g. Alex' : '예: 민지'} /></Field>
            <Field label={en ? 'Birth year' : '출생 연도'}><Input inputMode="numeric" maxLength={4} placeholder="2005" value={d.birthYear} onChange={(e) => patch({ birthYear: e.target.value.replace(/\D/g, '') })} /></Field>
            {d.birthYear.length === 4 && !birthOk && <p className="text-[12px] text-danger -mt-2">{en ? 'Lumi is for college students 16 and older.' : 'Lumi는 만 16세 이상 대학생을 위한 앱이에요.'}</p>}
            <NextBtn ok={!!name && birthOk} />
          </>
        )}

        {step === 'goals' && (
          <>
            <Head q={en ? `What brings you to Lumi, ${name}?` : `${name}님, Lumi에서 뭘 하고 싶어요?`} sub={en ? 'Select all that apply.' : '여러 개 골라도 돼요.'} />
            <div className="space-y-2">{GOAL_OPTS.map((o) => <Pick key={o.key} icon={<o.Icon size={20} />} title={o.title} on={d.goalKeys.includes(o.key)} onClick={() => patch({ goalKeys: tog(d.goalKeys, o.key) })} />)}</div>
            <NextBtn ok={d.goalKeys.length > 0} />
          </>
        )}

        {step === 'how' && (
          <>
            <Head q={en ? 'Here’s what you get' : '이런 걸 할 수 있어요'} />
            <div className="grid grid-cols-2 gap-2.5">
              {HELPS.map((h) => (
                <div key={h.title} className="card rounded-[20px] h-[140px] p-4 flex flex-col items-center justify-center gap-3 text-center">
                  <span className="h-14 w-14 rounded-2xl bg-primary-soft text-primary grid place-items-center"><h.Icon size={28} strokeWidth={1.7} /></span>
                  <b className="text-[15px] font-bold leading-tight">{h.title}</b>
                </div>
              ))}
            </div>
            <NextBtn ok />
          </>
        )}

        {step === 'school' && (
          <>
            <Head q={en ? 'Your university' : '학교'} />
            <div className="space-y-2">
              {schools.map((s) => (
                <Pick key={s.id} icon={<GraduationCap size={20} />} title={s.name} on={d.schoolId === s.id} onClick={() => patch({ schoolId: s.id })} />
              ))}
            </div>
            {d.schoolId && (
              <>
                <h3 className="text-[20px] font-extrabold pt-2">{en ? 'Your status' : '신분'}</h3>
                <div className="space-y-2">{ROLES.map((r) => <Pick key={r.v} icon={<r.Icon size={20} />} title={en ? r.en : r.ko} on={d.role === r.v} onClick={() => patch({ role: r.v })} />)}</div>
                <NextBtn ok={!!d.role} />
              </>
            )}
            <div className="pt-1"><ComingSoonSchools openNames={schools.map((s) => s.name)} /></div>
          </>
        )}

        {step === 'topics' && (
          <>
            <Head q={en ? 'What would you like to discover?' : '어떤 걸 찾아보고 싶어요?'} sub={en ? 'Pick a few.' : '몇 가지 골라 주세요.'} />
            <div className="grid grid-cols-2 gap-2.5">
              {TOPICS.map((t) => { const on = d.topics.includes(t.key); return (
                <button key={t.key} onClick={() => patch({ topics: tog(d.topics, t.key) })} aria-pressed={on} className={cn('rounded-[20px] border-2 p-3.5 h-[108px] flex flex-col justify-between text-left press transition', on ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
                  <span className="flex items-center justify-between w-full"><t.Icon size={19} className={on ? 'text-primary' : 'text-ink-2'} /><span className={cn('h-5 w-5 rounded-full border-2 grid place-items-center', on ? 'border-primary bg-primary text-white v2:text-on-primary' : 'border-line')}>{on && <Check size={12} />}</span></span>
                  <b className="text-[14px] font-semibold leading-snug">{en ? t.en : t.ko}</b>
                </button>
              ); })}
            </div>
            <NextBtn ok={d.topics.length > 0} />
          </>
        )}

        {step === 'communities' && (
          <>
            <Head q={en ? 'Your communities' : '나의 커뮤니티'} sub={en ? 'Select what you’re part of.' : '속한 곳을 골라 주세요.'} />
            <div className="card rounded-[20px] divide-y divide-line">
              {COMMUNITIES.map((c) => { const on = d.communities.includes(c.key); return (
                <button key={c.key} onClick={() => patch({ communities: tog(d.communities, c.key) })} aria-pressed={on} className="w-full flex items-center gap-3 px-4 h-[52px] text-left press">
                  <c.Icon size={20} className="text-primary shrink-0" /><b className="flex-1 text-[15px] font-semibold">{en ? c.en : c.ko}</b>
                  <span className={cn('h-5 w-5 rounded-md border-2 grid place-items-center shrink-0', on ? 'border-primary bg-primary text-white v2:text-on-primary' : 'border-line')}>{on && <Check size={13} />}</span>
                </button>
              ); })}
            </div>
            <NextBtn ok />
          </>
        )}

        {step === 'email' && (
          <>
            <Head q={en ? `You’re all set, ${name}!` : `준비 끝, ${name}님!`} sub={en ? 'Optional: add your school email to sign back in on any phone.' : '선택: 학교 이메일을 넣으면 어느 폰에서든 다시 들어올 수 있어요.'} />
            <Field label={en ? 'School email' : '학교 이메일'}>
              <div className="flex gap-2">
                <Input type="email" inputMode="email" autoComplete="email" disabled={verified} placeholder={school?.emailDomain ? `you@${school.emailDomain}` : 'you@school.edu'} value={d.email} onChange={(e) => { patch({ email: e.target.value }); setCodeSent(false); setVerified(false); setCode(''); }} />
                {!verified && <Button variant="secondary" loading={busy && !codeSent} disabled={!d.email.includes('@')} onClick={sendCode}>{codeSent ? (en ? 'Resend' : '다시 보내기') : (en ? 'Send code' : '코드 받기')}</Button>}
              </div>
            </Field>
            {codeSent && !verified && (
              <Field label={en ? '6-digit code' : '6자리 코드'}>
                <div className="flex gap-2">
                  <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
                  <Button loading={busy} disabled={code.length !== 6} onClick={checkCode}>{en ? 'Verify' : '확인'}</Button>
                </div>
              </Field>
            )}
            {hint && <p className="text-[12px] text-ink-2 -mt-2">{hint}</p>}
            {verified && <div className="rounded-xl bg-mint-soft text-mint text-[13px] font-semibold px-3 py-2.5 flex items-center gap-2"><Check size={16} />{en ? 'Verified — you’ll get a school badge too.' : '인증 완료 — 학교 인증 배지도 붙어요.'}</div>}
            <Button full size="lg" loading={busy} disabled={busy} onClick={() => finish(verified)}>{en ? 'Get Started' : '시작하기'}</Button>
            {!verified && <p className="text-center text-[12px] text-ink-3 -mt-2">{en ? 'You can add your school email later in Settings.' : '학교 이메일은 나중에 설정에서 추가할 수 있어요.'}</p>}
            <p className="text-center text-[12px] text-ink-3">{en ? 'By starting Lumi you confirm you’re 16 or older and agree to the ' : 'Lumi를 시작하면 만 16세 이상이며 다음에 동의하는 것으로 봐요: '}<Link to="/terms" className="text-primary font-semibold underline">{en ? 'Terms of Use' : '이용약관'}</Link>{en ? ' and ' : ', '}<Link to="/privacy" className="text-primary font-semibold underline">{en ? 'Privacy Policy' : '개인정보처리방침'}</Link>.</p>
          </>
        )}
      </div>
    </div>
  );
}
