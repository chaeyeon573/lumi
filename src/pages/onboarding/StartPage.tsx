import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, GraduationCap, CalendarDays, Users, Utensils, UsersRound, FlaskConical, Landmark, House, UserRound, Layers, Volleyball, Globe, Building2, Ellipsis, Search, Sparkles, Briefcase } from 'lucide-react';
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
/** 이름은 가입에 꼭 필요해서 맨 앞 한 화면 — 진행 막대는 시안의 4단계(목표 → 도움 → 학교·신분 → 커뮤니티)만 센다 */
type Step = 'name' | 'goals' | 'how' | 'school' | 'communities';
const STEPS: Step[] = ['name', 'goals', 'how', 'school', 'communities'];
const BAR: Step[] = ['goals', 'how', 'school', 'communities'];
const KEY = 'lumi.start.draft.v3';
type Ico = typeof Briefcase;

/** 1 · 목표 — 시안(2026-11-03) 5개, 제목 + 한 줄 설명. 저장은 기존 필드(goals·interests·purposes)에만 한다 */
const GOAL_OPTS: { key: string; Icon: Ico; title: string; sub: string; goals: Goal[]; interests: Interest[]; purposes: Purpose[] }[] = [
  { key: 'opps', Icon: GraduationCap, title: en ? 'Discover opportunities & events' : '기회·행사 찾기', sub: en ? 'Internships, research, scholarships, hackathons, talks, and more' : '인턴, 연구, 장학금, 해커톤, 강연 등', goals: ['internship', 'lab', 'scholarship', 'hackathon'], interests: ['research', 'networking'], purposes: [] },
  { key: 'classes', Icon: CalendarDays, title: en ? 'Plan my classes & schedule' : '수업·시간표 계획', sub: en ? 'Build your timetable and find classmates' : '시간표를 만들고 같은 수업 친구 찾기', goals: [], interests: ['study'], purposes: ['study'] },
  { key: 'involved', Icon: Users, title: en ? 'Get involved in communities' : '커뮤니티 참여', sub: en ? 'Clubs, Greek life, co-ops, research labs' : '동아리, 그릭 라이프, 코업, 연구실', goals: ['join_club'], interests: ['club'], purposes: ['club'] },
  { key: 'easier', Icon: Utensils, title: en ? 'Make campus life easier' : '캠퍼스 생활 편하게', sub: en ? 'Dining, RSF, and campus resources' : '학식, RSF, 캠퍼스 시설', goals: [], interests: ['exercise', 'meal'], purposes: [] },
  { key: 'people', Icon: UsersRound, title: en ? 'Meet new people' : '새 사람 만나기', sub: en ? 'Study, hang out, and make plans' : '같이 공부하고, 놀고, 약속 잡기', goals: ['friends'], interests: ['coffee'], purposes: ['friend'] },
];

/** 2 · 어떻게 도와주나 — 시안 카드 3장 (설명 + 그림) */
const HELPS: { Icon: Ico; Art: Ico[]; title: string; sub: string }[] = [
  { Icon: CalendarDays, Art: [Briefcase, Sparkles], title: en ? 'Discover Opportunities & Events' : '기회·행사 찾기', sub: en ? 'Find internships, research, scholarships, hackathons, talks, and campus events that fit your interests.' : '관심사에 맞는 인턴, 연구, 장학금, 해커톤, 강연, 캠퍼스 행사를 찾아요.' },
  { Icon: CalendarDays, Art: [CalendarDays, UsersRound], title: en ? 'Classes & Schedule' : '수업·시간표', sub: en ? 'Build your timetable, adjust your classes, and connect with classmates in the same courses.' : '시간표를 만들고 수업을 바꾸고, 같은 수업 듣는 친구와 연결돼요.' },
  { Icon: Users, Art: [Users, House], title: en ? 'Communities' : '커뮤니티', sub: en ? 'Explore and join clubs, Greek life, co-ops, and research groups.' : '동아리, 그릭 라이프, 코업, 연구 그룹을 둘러보고 참여해요.' },
];

const ROLES: { v: UniversityRole; Icon: Ico; en: string; ko: string; sub: (school: string) => string }[] = [
  { v: 'undergraduate', Icon: GraduationCap, en: 'Undergraduate', ko: '학부생', sub: () => (en ? 'Bachelor’s student' : '학사 과정') },
  { v: 'graduate', Icon: UserRound, en: 'Graduate', ko: '대학원생', sub: () => (en ? 'Master’s or PhD student' : '석사·박사 과정') },
  { v: 'alumni', Icon: UserRound, en: 'Alumni', ko: '졸업생', sub: (s) => (en ? `${s || 'University'} alum` : `${s || '학교'} 졸업생`) },
];

/** 학교 이름 아래 줄 — 시안처럼 정식 이름. 모르면 지역 */
const FULL_NAME: Record<string, string> = { 'UC Berkeley': 'University of California, Berkeley' };

/** 4 · 커뮤니티 — 시안 9개. 저장할 칸이 따로 없어 goals/interests 로 옮긴다 (가입 후 Clubs & Groups 추천에 쓰인다) */
const COMMUNITIES: { key: string; Icon: Ico; en: string; ko: string; goals: Goal[]; interests: Interest[] }[] = [
  { key: 'clubs', Icon: Users, en: 'Clubs', ko: '동아리', goals: ['join_club'], interests: ['club'] },
  { key: 'greek', Icon: Landmark, en: 'Fraternity / Sorority', ko: '프래터니티 / 소로리티', goals: ['join_club'], interests: ['club'] },
  { key: 'coop', Icon: House, en: 'Co-op Housing', ko: '코업 하우스', goals: [], interests: ['club'] },
  { key: 'lab', Icon: FlaskConical, en: 'Research Lab', ko: '연구실', goals: ['lab'], interests: ['research'] },
  { key: 'dept', Icon: Layers, en: 'Department / Major', ko: '학과 / 전공', goals: [], interests: ['networking'] },
  { key: 'sports', Icon: Volleyball, en: 'Sports / Recreation', ko: '스포츠 / 레크리에이션', goals: [], interests: ['exercise'] },
  { key: 'cultural', Icon: Globe, en: 'Cultural / Identity', ko: '문화 / 정체성', goals: ['join_club'], interests: ['club'] },
  { key: 'dorm', Icon: Building2, en: 'Residence Hall / Dorm', ko: '기숙사', goals: [], interests: ['meal'] },
  { key: 'none', Icon: Ellipsis, en: 'None for now', ko: '아직 없어요', goals: [], interests: [] },
];

interface Draft { nickname: string; birthYear: string; goalKeys: string[]; schoolId: string; role: UniversityRole | ''; communities: string[] }
const EMPTY: Draft = { nickname: '', birthYear: '', goalKeys: [], schoolId: '', role: '', communities: [] };
const uniq = <T,>(a: T[]) => [...new Set(a)];

/** 선택 줄 — 아이콘 + 제목 (+ 한 줄 설명) + 체크. square = 커뮤니티 체크박스 */
function Pick({ icon, title, sub, on, onClick, square }: { icon: React.ReactNode; title: string; sub?: string; on: boolean; onClick: () => void; square?: boolean }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={cn('w-full rounded-2xl border px-4 text-left flex items-center gap-3 press transition', sub ? 'py-3 min-h-[64px]' : 'h-14', on ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
      <span className="text-primary shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <b className="block text-[15px] font-semibold leading-snug">{title}</b>
        {sub && <span className="block text-[12.5px] text-ink-3 leading-snug mt-0.5">{sub}</span>}
      </span>
      <span className={cn('h-6 w-6 border-2 grid place-items-center shrink-0', square ? 'rounded-md' : 'rounded-full', on ? 'border-primary bg-primary text-white v2:text-on-primary' : 'border-line')}>{on && <Check size={14} />}</span>
    </button>
  );
}

/**
 * 첫 실행 (2026-11-03 사장님 시안 “Onboarding Flow”) — 이름 → ① 목표 → ② 어떻게 도와주나 → ③ 학교·신분 → ④ 커뮤니티 → Get Started.
 * 학교 이메일은 가입 뒤 설정(SchoolEmailCard)에서 붙인다 — 첫 실행을 시안의 4단계로 줄이려고 마지막 화면을 뺐다.
 */
export function StartPage() {
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const [step, setStep] = useState<Step>('name');
  const [d, setD] = useState<Draft>(() => { try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') }; } catch { return EMPTY; } });
  const [schools, setSchools] = useState<School[]>([]);
  const [q, setQ] = useState('');
  const [other, setOther] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* */ } }, [d]);
  useEffect(() => { void api.schools.search('').then(setSchools).catch(() => setSchools([])); }, []);
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const tog = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const idx = STEPS.indexOf(step);
  const go = (s: Step) => { setStep(s); window.scrollTo({ top: 0 }); };
  const next = () => go(STEPS[Math.min(idx + 1, STEPS.length - 1)]);

  const finish = async () => {
    setBusy(true);
    try {
      const gs = GOAL_OPTS.filter((g) => d.goalKeys.includes(g.key));
      const cs = COMMUNITIES.filter((c) => d.communities.includes(c.key));
      const goals = uniq([...gs.flatMap((g) => g.goals), ...cs.flatMap((c) => c.goals)]);
      const interests = uniq([...gs.flatMap((g) => g.interests), ...cs.flatMap((c) => c.interests)]);
      const purposes = uniq(gs.flatMap((g) => g.purposes));
      const role = d.role || 'undergraduate';
      // 입학 연도는 묻지 않는다 (가볍게) — 이전 흐름과 같은 기본값 올해, 프로필에서 고칠 수 있다
      const year = new Date().getFullYear();
      const user = await api.auth.register({
        nickname: d.nickname.trim(), birthYear: Number(d.birthYear), gender: 'private', avatar: { emoji: '🙂', hue: 210, photoType: 'face' },
        schoolId: d.schoolId, role, department: '', year,
        email: undefined, emailVerified: false, showSchool: true, showDepartment: true,
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
  const shownSchools = schools.filter((s) => !q.trim() || `${s.name} ${FULL_NAME[s.name] ?? ''} ${s.region}`.toLowerCase().includes(q.trim().toLowerCase()));
  const Head = ({ q: title, sub }: { q: string; sub?: string }) => <div><h2 className="text-[28px] font-extrabold leading-tight">{title}</h2>{sub && <p className="text-[15px] text-ink-3 mt-1.5">{sub}</p>}</div>;
  const skip = step === 'goals' ? () => { patch({ goalKeys: [] }); next(); } : undefined;
  const NextBtn = ({ ok, text, onClick }: { ok: boolean; text?: string; onClick?: () => void }) => (
    <>
      <Button full size="lg" loading={busy} disabled={!ok || busy} onClick={onClick ?? next}>{text ?? (en ? 'Continue' : '계속')}</Button>
      {/* Skip 은 버튼 아래 — 위 오른쪽은 디자인 전환 버튼 자리 */}
      {skip && <button onClick={skip} className="w-full h-10 -mt-2 text-[14px] font-semibold text-ink-3">{en ? 'Skip' : '건너뛰기'}</button>}
    </>
  );
  const barIdx = BAR.indexOf(step);

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <TopBar back onBack={idx > 0 ? () => go(STEPS[idx - 1]) : undefined}
        title={barIdx >= 0 ? <span className="flex gap-1.5 w-[160px]" aria-label={en ? `Step ${barIdx + 1} of ${BAR.length}` : `${BAR.length}단계 중 ${barIdx + 1}`}>{BAR.map((s2, i) => <span key={s2} className={cn('h-1 flex-1 rounded-full transition', i <= barIdx ? 'bg-primary' : 'bg-surface-2')} />)}</span> : undefined} />
      <div key={step} className="flex-1 px-5 pt-6 pb-8 space-y-5 animate-fade-in">
        {step === 'name' && (
          <>
            <Head q={en ? 'What should we call you?' : '뭐라고 불러드릴까요?'} sub={en ? 'This is how classmates see you.' : '같은 학교 학생들에게 보이는 이름이에요.'} />
            <Field label={en ? 'Name' : '이름'}><Input autoFocus maxLength={20} value={d.nickname} onChange={(e) => patch({ nickname: e.target.value })} placeholder={en ? 'e.g. Alex' : '예: 민지'} /></Field>
            <Field label={en ? 'Birth year' : '출생 연도'}><Input inputMode="numeric" maxLength={4} placeholder="2005" value={d.birthYear} onChange={(e) => patch({ birthYear: e.target.value.replace(/\D/g, '') })} /></Field>
            <p className="text-[12px] text-ink-3 -mt-3">{d.birthYear.length === 4 && !birthOk ? <span className="text-danger">{en ? 'Lumi is for college students 16 and older.' : 'Lumi는 만 16세 이상 대학생을 위한 앱이에요.'}</span> : (en ? 'Only to check you’re 16+. Never shown on your profile.' : '만 16세 이상인지 확인용이에요. 프로필에는 안 보여요.')}</p>
            <NextBtn ok={!!name && birthOk} />
          </>
        )}

        {step === 'goals' && (
          <>
            <Head q={en ? 'What brings you to Lumi?' : 'Lumi에서 뭘 하고 싶어요?'} sub={en ? 'Choose what you’d like to get out of your campus life. (Select any that apply)' : '캠퍼스 생활에서 얻고 싶은 걸 골라 주세요. (여러 개 가능)'} />
            <div className="space-y-2">{GOAL_OPTS.map((o) => <Pick key={o.key} icon={<o.Icon size={22} />} title={o.title} sub={o.sub} on={d.goalKeys.includes(o.key)} onClick={() => patch({ goalKeys: tog(d.goalKeys, o.key) })} />)}</div>
            <NextBtn ok={d.goalKeys.length > 0} />
          </>
        )}

        {step === 'how' && (
          <>
            <Head q={en ? 'Here’s how Lumi helps you.' : 'Lumi는 이렇게 도와줘요.'} sub={en ? 'The tools you need for your campus life, all in one place.' : '캠퍼스 생활에 필요한 걸 한곳에.'} />
            <div className="space-y-2.5">
              {HELPS.map((h) => (
                <div key={h.title} className="card rounded-[20px] p-4 flex gap-3 items-start">
                  <h.Icon size={22} className="text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <b className="block text-[16px] font-bold leading-tight">{h.title}</b>
                    <span className="block text-[13px] text-ink-3 leading-snug mt-1">{h.sub}</span>
                  </div>
                  {/* 그림 — 아이콘 두 개를 겹친 작은 일러스트 (가짜 데이터 없이) */}
                  <span aria-hidden className="relative h-16 w-16 shrink-0 self-center">
                    {h.Art.map((A, i) => (
                      <span key={i} className={cn('absolute grid place-items-center rounded-2xl', i === 0 ? 'left-0 top-0 h-12 w-12 bg-primary-soft text-primary' : 'right-0 bottom-0 h-9 w-9 bg-primary text-white v2:text-on-primary shadow')}><A size={i === 0 ? 24 : 17} strokeWidth={1.8} /></span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <NextBtn ok />
          </>
        )}

        {step === 'school' && (
          <>
            <Head q={en ? 'University & student status' : '학교와 신분'} sub={en ? 'Tell us a bit about your academic journey.' : '어디서 공부하는지 알려 주세요.'} />
            <h3 className="text-[17px] font-extrabold">{en ? 'Which university are you at?' : '어느 학교예요?'}</h3>
            <div className="relative -mt-2"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input className="pl-9" placeholder={en ? 'Search a university' : '학교 검색'} value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="space-y-2">
              {shownSchools.map((s) => (
                <Pick key={s.id} icon={<GraduationCap size={20} />} title={s.name} sub={FULL_NAME[s.name] ?? s.region} on={d.schoolId === s.id} onClick={() => { patch({ schoolId: s.id }); setOther(false); }} />
              ))}
              <Pick icon={<Ellipsis size={20} />} title={en ? 'Other' : '다른 학교'} sub={en ? 'Not open yet? Join the waitlist' : '아직 안 열렸어요? 대기 명단에 넣어 드려요'} on={other} onClick={() => { setOther(!other); if (!other) patch({ schoolId: '' }); }} />
            </div>
            {other && <ComingSoonSchools openNames={schools.map((s) => s.name)} />}
            {!other && (
              <>
                <h3 className="text-[17px] font-extrabold pt-1">{en ? 'What’s your role?' : '신분이 뭐예요?'}</h3>
                <div className="space-y-2 -mt-2">{ROLES.map((r) => <Pick key={r.v} icon={<r.Icon size={20} />} title={en ? r.en : r.ko} sub={r.sub(school?.name ?? '')} on={d.role === r.v} onClick={() => patch({ role: r.v })} />)}</div>
                <NextBtn ok={!!d.schoolId && !!d.role} />
              </>
            )}
          </>
        )}

        {step === 'communities' && (
          <>
            <Head q={en ? 'Your communities' : '나의 커뮤니티'} sub={en ? 'Which communities are you part of? Select all that apply. You can update this later.' : '어떤 커뮤니티에 속해 있어요? 모두 골라 주세요. 나중에 바꿀 수 있어요.'} />
            <div className="card rounded-[20px] divide-y divide-line">
              {COMMUNITIES.map((c) => { const on = d.communities.includes(c.key); return (
                <button key={c.key} onClick={() => patch({ communities: c.key === 'none' ? (on ? [] : ['none']) : tog(d.communities.filter((x) => x !== 'none'), c.key) })} aria-pressed={on} className="w-full flex items-center gap-3 px-4 h-[52px] text-left press">
                  <c.Icon size={20} className="text-primary shrink-0" /><b className="flex-1 text-[15px] font-semibold">{en ? c.en : c.ko}</b>
                  <span className={cn('h-5 w-5 rounded-md border-2 grid place-items-center shrink-0', on ? 'border-primary bg-primary text-white v2:text-on-primary' : 'border-line')}>{on && <Check size={13} />}</span>
                </button>
              ); })}
            </div>
            <NextBtn ok text={en ? 'Get Started' : '시작하기'} onClick={finish} />
            <p className="text-center text-[12px] text-ink-3 -mt-2">{en ? 'By starting Lumi you confirm you’re 16 or older and agree to the ' : 'Lumi를 시작하면 만 16세 이상이며 다음에 동의하는 것으로 봐요: '}<Link to="/terms" className="text-primary font-semibold underline">{en ? 'Terms of Use' : '이용약관'}</Link>{en ? ' and ' : ', '}<Link to="/privacy" className="text-primary font-semibold underline">{en ? 'Privacy Policy' : '개인정보처리방침'}</Link>. {en ? 'Add your school email anytime in Settings.' : '학교 이메일은 설정에서 언제든 추가할 수 있어요.'}</p>
          </>
        )}
      </div>
    </div>
  );
}
