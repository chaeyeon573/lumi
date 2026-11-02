import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, GraduationCap, Briefcase, CalendarDays, Ticket, Users, Search, Compass, Coffee } from 'lucide-react';
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
type Step = 'name' | 'goals' | 'how' | 'school' | 'communities' | 'email';
const STEPS: Step[] = ['name', 'goals', 'how', 'school', 'communities', 'email'];
const KEY = 'lumi.start.draft.v2';

/**
 * 목표 — 시안(2026-11-02) 그대로 5개 + Skip. 저장은 기존 필드(goals·interests·purposes)에만 한다.
 * “Make campus life easier” 는 맞는 goals 값이 없어 study 관심사로만 남긴다.
 */
const GOAL_OPTS: { key: string; Icon: typeof Briefcase; title: string; sub: string; goals: Goal[]; interests: Interest[]; purposes: Purpose[] }[] = [
  { key: 'opps', Icon: Briefcase, title: en ? 'Find opportunities' : '기회 찾기', sub: en ? 'Internships, research, scholarships' : '인턴·연구·장학금', goals: ['internship', 'lab', 'scholarship'], interests: ['research'], purposes: [] },
  { key: 'events', Icon: Ticket, title: en ? 'Discover campus events' : '캠퍼스 행사 찾기', sub: en ? 'Hackathons, talks, school events' : '해커톤·강연·학교 행사', goals: ['hackathon'], interests: ['networking'], purposes: ['networking'] },
  { key: 'involved', Icon: Users, title: en ? 'Get involved' : '활동 참여하기', sub: en ? 'Clubs, Greek life, co-ops' : '동아리·그릭 라이프·코업', goals: ['join_club'], interests: ['club'], purposes: ['club'] },
  { key: 'easier', Icon: CalendarDays, title: en ? 'Make campus life easier' : '캠퍼스 생활 편하게', sub: en ? 'Classes, schedule, RSF, dining' : '수업·시간표·RSF·식당', goals: [], interests: ['study'], purposes: ['study'] },
  { key: 'people', Icon: Coffee, title: en ? 'Meet new people' : '새 사람 만나기', sub: en ? 'Study, hang out, and make plans' : '같이 공부하고 놀고 약속 잡기', goals: ['friends'], interests: ['coffee'], purposes: ['friend'] },
];

/** “Here’s how Lumi helps you” — Communities 문구는 사장님 지정 그대로 */
const HELPS = [
  { Icon: CalendarDays, title: en ? 'Classes & Schedule' : '수업·시간표', sub: en ? 'Your classes, plans, RSF crowd and dining in one place' : '수업·약속·RSF 혼잡도·식당을 한곳에서', tone: 'bg-[#EEF2FF] text-[#4B63D8] v2:bg-[#1D2140] v2:text-[#9DB0FF]' },
  { Icon: Briefcase, title: en ? 'Opportunities' : '기회', sub: en ? 'Internships, research and scholarships, with deadlines' : '인턴·연구·장학금을 마감일과 함께', tone: 'bg-[#FFF4E5] text-[#D98A12] v2:bg-[#2E2416] v2:text-[#FFC266]' },
  { Icon: Ticket, title: en ? 'Campus Events' : '캠퍼스 행사', sub: en ? 'Hackathons, talks and what’s happening on campus' : '해커톤·강연·지금 캠퍼스에서 열리는 것', tone: 'bg-[#FDEEF2] text-[#D2476B] v2:bg-[#2D1820] v2:text-[#FF9AB5]' },
  { Icon: Users, title: en ? 'Communities' : '커뮤니티', sub: en ? 'Join clubs, Greek life, and other campus groups' : '동아리·그릭 라이프 등 캠퍼스 단체에 참여', tone: 'bg-[#E9F6F4] text-[#1F9A86] v2:bg-[#14292A] v2:text-[#6FE0CB]' },
];

const ROLES: { v: UniversityRole; en: string; ko: string }[] = [{ v: 'undergraduate', en: 'Undergraduate', ko: '학부생' }, { v: 'graduate', en: 'Graduate', ko: '대학원생' }, { v: 'alumni', en: 'Alumni', ko: '졸업생' }];
const YEARS = [{ v: 1, en: 'Freshman', ko: '1학년' }, { v: 2, en: 'Sophomore', ko: '2학년' }, { v: 3, en: 'Junior', ko: '3학년' }, { v: 4, en: 'Senior', ko: '4학년' }];

/** 커뮤니티 — 시안 목록. 저장할 칸이 따로 없어 goals/interests 로 옮긴다 (가입 후 Clubs & Groups 추천에 쓰인다) */
const COMMUNITIES: { key: string; emoji: string; en: string; ko: string; goals: Goal[]; interests: Interest[] }[] = [
  { key: 'clubs', emoji: '🎸', en: 'Clubs', ko: '동아리', goals: ['join_club'], interests: ['club'] },
  { key: 'greek', emoji: '🏛️', en: 'Fraternity / Sorority', ko: '프래터니티 / 소로리티', goals: ['join_club'], interests: ['club'] },
  { key: 'coop', emoji: '🏡', en: 'Co-op Housing', ko: '코업 하우스', goals: [], interests: ['club'] },
  { key: 'lab', emoji: '🔬', en: 'Research Lab', ko: '연구실', goals: ['lab'], interests: ['research'] },
  { key: 'dept', emoji: '🎓', en: 'Department / Major', ko: '학과 / 전공', goals: [], interests: ['networking'] },
  { key: 'sports', emoji: '🏃', en: 'Sports / Recreation', ko: '스포츠 / 레크리에이션', goals: [], interests: ['exercise'] },
  { key: 'culture', emoji: '🌏', en: 'Cultural / Identity', ko: '문화 / 정체성', goals: ['join_club'], interests: ['club'] },
  { key: 'dorm', emoji: '🛏️', en: 'Residence Hall / Dorm', ko: '기숙사', goals: [], interests: [] },
];

interface Draft { nickname: string; birthYear: string; goalKeys: string[]; schoolId: string; role: UniversityRole | ''; yearInSchool: number; department: string; communities: string[]; email: string }
const EMPTY: Draft = { nickname: '', birthYear: '', goalKeys: [], schoolId: '', role: '', yearInSchool: 0, department: '', communities: [], email: '' };
const uniq = <T,>(a: T[]) => [...new Set(a)];

/** 큰 선택 줄 — 아이콘/이모지 + 제목 + 설명 */
function Pick({ icon, title, sub, on, onClick }: { icon: React.ReactNode; title: string; sub?: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={cn('w-full rounded-2xl border-2 px-4 py-3.5 text-left flex items-center gap-3 press transition', on ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
      <span className={cn('h-10 w-10 rounded-xl grid place-items-center shrink-0 text-[20px]', on ? 'bg-primary text-white v2:text-on-primary' : 'bg-surface-2 text-primary')}>{icon}</span>
      <span className="flex-1 min-w-0"><b className="block text-[15px] font-bold leading-snug">{title}</b>{sub && <span className="block text-[12px] text-ink-3 mt-0.5">{sub}</span>}</span>
      <span className={cn('h-6 w-6 rounded-full border-2 grid place-items-center shrink-0', on ? 'border-primary bg-primary text-white v2:text-on-primary' : 'border-line')}>{on && <Check size={14} />}</span>
    </button>
  );
}

/**
 * 첫 실행 (2026-11-02 사장님 시안) — 이름 → 목표 → Lumi가 돕는 방법 → 학교·신분 → 커뮤니티 → (학교 이메일) Get Started.
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
      const goals = uniq([...gs.flatMap((g) => g.goals), ...cs.flatMap((c) => c.goals)]);
      const interests = uniq([...gs.flatMap((g) => g.interests), ...cs.flatMap((c) => c.interests)]);
      const purposes = uniq(gs.flatMap((g) => g.purposes));
      const role = d.role || 'undergraduate';
      const thisYear = new Date().getFullYear();
      // 입학 연도 — 학부생이 학년을 골랐을 때만 계산, 아니면 올해 (이전 흐름과 같은 기본값)
      const year = role === 'undergraduate' && d.yearInSchool ? thisYear - d.yearInSchool + 1 : thisYear;
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
  const NextBtn = ({ ok, text }: { ok: boolean; text?: string }) => <Button full size="lg" disabled={!ok} onClick={next}>{text ?? (en ? 'Continue' : '계속')}</Button>;

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <TopBar back onBack={idx > 0 ? () => go(STEPS[idx - 1]) : undefined} title={<span className="text-[15px] text-ink-3">{idx + 1} / {STEPS.length}</span>} />
      <div className="h-1 mx-4 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} /></div>
      <div key={step} className="flex-1 px-5 pt-6 pb-8 space-y-5 animate-fade-in">
        {step === 'name' && (
          <>
            <Head q={en ? 'What should we call you?' : '뭐라고 불러드릴까요?'} sub={en ? 'A first name or nickname. This is how classmates will see you.' : '같은 학교 학생들에게 보이는 이름이에요.'} />
            <Field label={en ? 'Name' : '이름'}><Input autoFocus maxLength={20} value={d.nickname} onChange={(e) => patch({ nickname: e.target.value })} placeholder={en ? 'e.g. Alex' : '예: 민지'} /></Field>
            <Field label={en ? 'Birth year' : '출생 연도'}><Input inputMode="numeric" maxLength={4} placeholder="2005" value={d.birthYear} onChange={(e) => patch({ birthYear: e.target.value.replace(/\D/g, '') })} /></Field>
            {d.birthYear.length === 4 && !birthOk && <p className="text-[12px] text-danger -mt-2">{en ? 'Lumi is for college students 16 and older.' : 'Lumi는 만 16세 이상 대학생을 위한 앱이에요.'}</p>}
            <NextBtn ok={!!name && birthOk} />
          </>
        )}

        {step === 'goals' && (
          <>
            <Head q={en ? `Nice to meet you, ${name}! What are your goals?` : `반가워요, ${name}님! 어떤 걸 하고 싶어요?`} sub={en ? 'Pick all that apply.' : '여러 개 골라도 돼요.'} />
            <div className="space-y-2.5">{GOAL_OPTS.map((o) => <Pick key={o.key} icon={<o.Icon size={19} />} title={o.title} sub={o.sub} on={d.goalKeys.includes(o.key)} onClick={() => patch({ goalKeys: tog(d.goalKeys, o.key) })} />)}</div>
            <NextBtn ok={d.goalKeys.length > 0} />
            <button onClick={() => { patch({ goalKeys: [] }); next(); }} className="w-full h-10 text-[14px] font-semibold text-ink-3">{en ? 'Skip' : '건너뛰기'}</button>
          </>
        )}

        {step === 'how' && (
          <>
            <Head q={en ? 'Here’s how Lumi helps you' : 'Lumi는 이렇게 도와줘요'} sub={en ? 'Everything for campus life, in one app.' : '캠퍼스 생활에 필요한 걸 한 앱에.'} />
            <div className="grid grid-cols-2 gap-2.5">
              {HELPS.map((h) => (
                <div key={h.title} className="card rounded-[20px] p-4 flex flex-col gap-2.5">
                  <span className={cn('h-11 w-11 rounded-2xl grid place-items-center', h.tone)}><h.Icon size={21} /></span>
                  <b className="text-[15px] font-bold leading-tight">{h.title}</b>
                  <span className="text-[12px] text-ink-3 leading-snug">{h.sub}</span>
                </div>
              ))}
            </div>
            <NextBtn ok />
          </>
        )}

        {step === 'school' && (
          <>
            <Head q={en ? 'Your university & student status' : '학교와 신분'} sub={en ? 'You’ll see events, clubs and classes from your campus.' : '우리 캠퍼스의 행사·동아리·수업을 보여드려요.'} />
            <div className="space-y-2.5">
              {schools.map((s) => (
                <button key={s.id} onClick={() => patch({ schoolId: s.id })} aria-pressed={d.schoolId === s.id} className={cn('w-full rounded-2xl border-2 px-4 py-4 flex items-center gap-3 text-left press', d.schoolId === s.id ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
                  <span className="h-11 w-11 rounded-xl bg-surface-2 text-primary grid place-items-center"><GraduationCap size={20} /></span>
                  <span className="flex-1"><b className="block text-[16px] text-primary">{s.name}</b><span className="text-[12px] text-ink-3">{s.region}</span></span>
                  {d.schoolId === s.id && <Check size={20} className="text-primary" />}
                </button>
              ))}
            </div>
            {d.schoolId && (
              <>
                <Field label={en ? 'I am a…' : '나는…'}><div className="grid grid-cols-3 gap-2">{ROLES.map((r) => (
                  <button key={r.v} onClick={() => patch({ role: r.v })} aria-pressed={d.role === r.v} className={cn('h-11 rounded-full border-2 text-[13px] font-semibold press', d.role === r.v ? 'border-primary bg-primary text-white v2:text-on-primary' : 'border-line bg-surface text-ink')}>{en ? r.en : r.ko}</button>
                ))}</div></Field>
                {d.role === 'undergraduate' && (
                  <Field label={en ? 'Year (optional)' : '학년 (선택)'}><div className="flex flex-wrap gap-2">{YEARS.map((y) => (
                    <button key={y.v} onClick={() => patch({ yearInSchool: d.yearInSchool === y.v ? 0 : y.v })} className={cn('h-10 px-4 rounded-full border-2 text-[13px] font-semibold press', d.yearInSchool === y.v ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink')}>{en ? y.en : y.ko}</button>
                  ))}</div></Field>
                )}
                {d.role && <Field label={en ? 'Major / department (optional)' : '전공 (선택)'}><Input value={d.department} onChange={(e) => patch({ department: e.target.value })} placeholder={en ? 'e.g. Computer Science' : '예: 컴퓨터공학'} /></Field>}
                <NextBtn ok={!!d.role} />
              </>
            )}
            <div className="pt-1">
              <p className="text-[13px] font-semibold text-ink-2 mb-2 flex items-center gap-1.5"><Search size={14} />{en ? 'Not at one of these schools?' : '다른 학교인가요?'}</p>
              <ComingSoonSchools openNames={schools.map((s) => s.name)} />
            </div>
          </>
        )}

        {step === 'communities' && (
          <>
            <Head q={en ? 'Your communities' : '나의 커뮤니티'} sub={en ? 'Which groups are you part of — or want to join? Pick any.' : '속해 있거나 들어가고 싶은 곳을 골라 주세요.'} />
            <div className="space-y-2.5">
              {COMMUNITIES.map((c) => <Pick key={c.key} icon={c.emoji} title={en ? c.en : c.ko} on={d.communities.includes(c.key)} onClick={() => patch({ communities: tog(d.communities, c.key) })} />)}
              <Pick icon={<Compass size={19} />} title={en ? 'None for now' : '아직 없어요'} on={false} onClick={() => { patch({ communities: [] }); next(); }} />
            </div>
            <NextBtn ok={d.communities.length > 0} />
          </>
        )}

        {step === 'email' && (
          <>
            <Head q={en ? `You’re all set, ${name}!` : `준비 끝, ${name}님!`} sub={en ? 'Save your account with your school email so you can sign back in on a new phone. We only send a 6-digit code — no spam.' : '학교 이메일로 계정을 지키면 폰을 바꿔도 다시 들어올 수 있어요. 6자리 코드만 보내요.'} />
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
