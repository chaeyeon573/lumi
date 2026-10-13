import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, GraduationCap, Heart, Sparkles } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import type { AiCard, AiProfileDraft } from '@core/api/types';
import type { Goal, Interest, Purpose, Role, School } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { dday } from '@core/lib/recommend';
import { cn } from '@core/lib/cn';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { TopBar } from '@/components/layout/TopBar';
import { useAiEnabled } from '@/hooks/useAiEnabled';
import { DEFAULT_FV } from './OnboardingPage';
import { takeReturnTo } from '@/lib/returnTo';

const en = lang === 'en';
type Step = 'school' | 'goals' | 'vibe' | 'friday' | 'meet' | 'major' | 'preview' | 'name' | 'email';
const STEPS: Step[] = ['school', 'goals', 'vibe', 'friday', 'meet', 'major', 'preview', 'name', 'email'];
const KEY = 'aroundu.start.draft';

interface Opt<T> { v: T; emoji: string; en: string; ko: string }
const label = (o: { en: string; ko: string }) => (en ? o.en : o.ko);

/** 질문 하나하나가 프로필의 어느 칸을 채우는지 — 답은 재미있게, 저장은 기존 필드 그대로 */
const GOAL_OPTS: Opt<Goal>[] = [
  { v: 'friends', emoji: '🙌', en: 'Make new friends', ko: '새 친구 만들기' },
  { v: 'internship', emoji: '💼', en: 'Land an internship', ko: '인턴 붙기' },
  { v: 'lab', emoji: '🔬', en: 'Get into research', ko: '연구 시작하기' },
  { v: 'hackathon', emoji: '💡', en: 'Win a hackathon', ko: '해커톤 나가기' },
  { v: 'scholarship', emoji: '🎓', en: 'Find funding', ko: '장학금·펀딩 찾기' },
  { v: 'join_club', emoji: '🎸', en: 'Join a club', ko: '동아리 들어가기' },
  { v: 'startup', emoji: '🚀', en: 'Build something', ko: '뭔가 만들어 보기' },
  { v: 'lunch', emoji: '🍱', en: 'Never eat alone', ko: '혼밥 탈출' },
];
const VIBE_OPTS: Opt<Interest>[] = [
  { v: 'coffee', emoji: '☕', en: 'Café hopping', ko: '카페 투어' },
  { v: 'study', emoji: '📚', en: 'Library grind', ko: '도서관 각' },
  { v: 'exercise', emoji: '🏃', en: 'Gym or a run', ko: '운동' },
  { v: 'walk', emoji: '🌳', en: 'Long walks', ko: '산책' },
  { v: 'exhibition', emoji: '🎨', en: 'A show or museum', ko: '공연·전시' },
  { v: 'meal', emoji: '🍜', en: 'Trying new food', ko: '맛집 탐방' },
  { v: 'cycling', emoji: '🚴', en: 'Bike ride', ko: '자전거' },
  { v: 'shopping', emoji: '🛍️', en: 'Thrifting', ko: '쇼핑' },
];
const FRIDAY_OPTS: (Opt<Purpose> & { likes: string })[] = [
  { v: 'friend', emoji: '🎉', en: 'Out with people', ko: '사람들이랑 밖에', likes: 'going out with friends' },
  { v: 'hobby', emoji: '🎮', en: 'Cozy night in', ko: '집에서 쉬기', likes: 'cozy nights in' },
  { v: 'study', emoji: '📖', en: 'Still at the library', ko: '아직 도서관', likes: 'late-night study sessions' },
  { v: 'networking', emoji: '🎤', en: 'At a talk or mixer', ko: '강연·네트워킹', likes: 'talks and mixers' },
  { v: 'club', emoji: '🎸', en: 'At a club thing', ko: '동아리 모임', likes: 'club nights' },
];
const MEET_OPTS: Opt<Role>[] = [
  { v: 'friend', emoji: '🤝', en: 'New friends', ko: '새 친구' },
  { v: 'study_partner', emoji: '📚', en: 'Study buddies', ko: '스터디 메이트' },
  { v: 'teammate', emoji: '🧩', en: 'Project teammates', ko: '프로젝트 팀원' },
  { v: 'cofounder', emoji: '🚀', en: 'A co-founder', ko: '공동 창업자' },
  { v: 'senior', emoji: '🧭', en: 'Upperclassmen who’ve been there', ko: '먼저 해 본 선배' },
];
const YEARS = [{ v: 1, en: 'Freshman', ko: '1학년' }, { v: 2, en: 'Sophomore', ko: '2학년' }, { v: 3, en: 'Junior', ko: '3학년' }, { v: 4, en: 'Senior', ko: '4학년' }, { v: 5, en: 'Grad student', ko: '대학원생' }];
const AVATARS = ['🙂', '😎', '🧑‍💻', '👩‍🎨', '🧑‍🔬', '🏃', '🎸', '📚', '☕', '🌱', '🚀', '🧗', '🐱', '🦊', '🎧', '🍜'];

const Q: Record<Exclude<Step, 'school' | 'preview' | 'name' | 'email'>, { q: string; sub: string }> = en ? {
  goals: { q: 'This semester, you’re mostly here to…', sub: 'Pick up to 3.' },
  vibe: { q: 'Your perfect free afternoon?', sub: 'Pick up to 3.' },
  friday: { q: 'Friday night, you’re…', sub: 'Be honest.' },
  meet: { q: 'Who’d you love to meet?', sub: 'Pick any.' },
  major: { q: 'What do you study?', sub: 'So we can show classes, talks and people in your field.' },
} : {
  goals: { q: '이번 학기, 제일 하고 싶은 건?', sub: '최대 3개' },
  vibe: { q: '완벽한 공강 오후는?', sub: '최대 3개' },
  friday: { q: '금요일 밤, 나는…', sub: '솔직하게' },
  meet: { q: '어떤 사람을 만나고 싶어요?', sub: '여러 개 골라도 돼요' },
  major: { q: '전공이 뭐예요?', sub: '내 분야의 수업·강연·사람을 보여드려요.' },
};

interface Draft { schoolId: string; text: string; department: string; yearInSchool: number; goals: Goal[]; interests: Interest[]; purposes: Purpose[]; lookingFor: Role[]; canOffer: Role[]; bio: string; likes: string; freeTime: string; nickname: string; birthYear: string; savedOrgIds: string[]; avatar: string; bioEdited: boolean; email: string }
const EMPTY: Draft = { schoolId: '', text: '', department: '', yearInSchool: 0, goals: [], interests: [], purposes: [], lookingFor: [], canOffer: [], bio: '', likes: '', freeTime: '', nickname: '', birthYear: '', savedOrgIds: [], avatar: '🙂', bioEdited: false, email: '' };

/** 답으로 만든 한 줄 소개 — 사용자가 고칠 수 있다 */
function draftBio(d: Draft) {
  const yr = YEARS.find((y) => y.v === d.yearInSchool);
  const who = [yr ? label(yr) : '', d.department].filter(Boolean).join(en ? ' in ' : ' ');
  const goals = d.goals.slice(0, 2).map((g) => label(GOAL_OPTS.find((o) => o.v === g)!).toLowerCase());
  const into = d.interests.slice(0, 2).map((i) => label(VIBE_OPTS.find((o) => o.v === i)!).toLowerCase());
  if (en) return [who && `${who}.`, goals.length && `Here to ${goals.join(' and ')}.`, into.length && `Ask me about ${into.join(' or ')}.`].filter(Boolean).join(' ');
  return [who && `${who}.`, goals.length && `이번 학기 목표: ${goals.join(', ')}.`, into.length && `좋아하는 것: ${into.join(', ')}.`].filter(Boolean).join(' ');
}

/** 큰 선택 카드 — 이모지 + 짧은 말 */
function Pick({ emoji, text, on, onClick }: { emoji: string; text: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('rounded-2xl border-2 px-3 py-3.5 text-left flex items-center gap-2.5 press transition', on ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
      <span className="text-[26px] leading-none">{emoji}</span>
      <span className={cn('flex-1 text-[14px] font-semibold leading-snug', on ? 'text-primary' : 'text-ink')}>{text}</span>
      {on && <Check size={18} className="text-primary shrink-0" />}
    </button>
  );
}

/**
 * 첫 실행 — 학교 → 짧은 퀴즈 4개(목표·공강 취향·금요일 밤·만나고 싶은 사람) → 전공 → 프로필 미리보기 → 이름.
 * 퀴즈 답이 goals / interests / purposes / lookingFor / likes 를 채우고, 미리보기에서 소개 문장을 고칠 수 있다.
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
  const upTo3 = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : arr.length >= 3 ? [...arr.slice(1), v] : [...arr, v]);
  const tog = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const idx = STEPS.indexOf(step);
  const go = (s: Step) => { setStep(s); window.scrollTo({ top: 0 }); };
  const next = () => go(STEPS[Math.min(idx + 1, STEPS.length - 1)]);
  const bio = d.bioEdited ? d.bio : d.bio || draftBio(d);

  const fill = async () => {
    setBusy(true);
    try {
      const r = await api.ai.profileDraft(d.text, d.schoolId);
      const p: AiProfileDraft = r.draft;
      patch({
        department: p.department || d.department, yearInSchool: p.role === 'graduate' ? 5 : p.yearInSchool || d.yearInSchool,
        goals: [...new Set([...d.goals, ...p.goals])].slice(0, 4), interests: [...new Set([...d.interests, ...p.interests])].slice(0, 5),
        purposes: [...new Set([...d.purposes, ...p.purposes])], lookingFor: [...new Set([...d.lookingFor, ...p.lookingFor])], canOffer: p.canOffer,
        bio: p.bio || d.bio, likes: p.likes || d.likes, freeTime: p.freeTime || d.freeTime, bioEdited: !!p.bio,
      });
      setSuggest(r.suggestions);
      next();
    } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

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
      const yr = d.yearInSchool || 1;
      const thisYear = new Date().getFullYear();
      const user = await api.auth.register({
        nickname: d.nickname.trim(), birthYear: Number(d.birthYear), gender: 'private', avatar: { emoji: d.avatar, hue: 210, photoType: 'face' },
        schoolId: d.schoolId, role: yr >= 5 ? 'graduate' : 'undergraduate', department: d.department.trim(), year: yr >= 5 ? thisYear : thisYear - yr + 1,
        email: withEmail && verified ? d.email.trim() : undefined, emailVerified: withEmail && verified, showSchool: true, showDepartment: true,
        interests: d.interests, purposes: d.purposes.length ? d.purposes : ['friend'], bio: bio.slice(0, 200), likes: d.likes, freeTime: d.freeTime, availability: 'after18',
        fieldVisibility: DEFAULT_FV, prompts: [], goals: d.goals, lookingFor: d.lookingFor, canOffer: d.canOffer, meetPreference: [], interestedOrgIds: d.savedOrgIds,
        locationPermission: 'undecided', notifications: true,
      });
      sessionStorage.removeItem(KEY);
      await setCurrentUser(user);
      nav(takeReturnTo(), { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };

  const birth = Number(d.birthYear);
  const birthOk = birth >= 1950 && birth <= new Date().getFullYear() - 15;
  const school = schools.find((s) => s.id === d.schoolId);
  const Head = ({ q, sub }: { q: string; sub: string }) => <div><h2 className="text-[26px] font-extrabold leading-tight">{q}</h2><p className="text-[14px] text-ink-3 mt-1">{sub}</p></div>;
  const NextBtn = ({ ok, text }: { ok: boolean; text?: string }) => <Button full size="lg" disabled={!ok} onClick={next}>{text ?? (en ? 'Next' : '다음')}</Button>;

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <TopBar back onBack={idx > 0 ? () => go(STEPS[idx - 1]) : undefined} title={<span className="text-[15px] text-ink-3">{idx + 1} / {STEPS.length}</span>} />
      <div className="h-1 mx-4 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} /></div>
      <div key={step} className="flex-1 px-5 pt-6 pb-8 space-y-5 animate-fade-in">
        {step === 'school' && (
          <>
            <Head q={en ? 'Which school do you go to?' : '어느 학교에 다니세요?'} sub={en ? 'You’ll see events, clubs and classes from your campus.' : '우리 캠퍼스의 행사·동아리·수업을 보여드려요.'} />
            <div className="space-y-2.5">
              {schools.map((s) => (
                <button key={s.id} onClick={() => { patch({ schoolId: s.id }); window.setTimeout(() => go('goals'), 180); }} className={cn('w-full rounded-2xl border-2 px-4 py-4 flex items-center gap-3 text-left press', d.schoolId === s.id ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
                  <span className="h-11 w-11 rounded-xl bg-surface-2 text-primary grid place-items-center"><GraduationCap size={20} /></span>
                  <span className="flex-1"><b className="block text-[16px] text-primary">{s.name}</b><span className="text-[12px] text-ink-3">{s.region}</span></span>
                  {d.schoolId === s.id && <Check size={20} className="text-primary" />}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'goals' && (
          <>
            <Head {...Q.goals} />
            <div className="grid grid-cols-2 gap-2.5">{GOAL_OPTS.map((o) => <Pick key={o.v} emoji={o.emoji} text={label(o)} on={d.goals.includes(o.v)} onClick={() => patch({ goals: upTo3(d.goals, o.v) })} />)}</div>
            <NextBtn ok={d.goals.length > 0} />
          </>
        )}

        {step === 'vibe' && (
          <>
            <Head {...Q.vibe} />
            <div className="grid grid-cols-2 gap-2.5">{VIBE_OPTS.map((o) => <Pick key={o.v} emoji={o.emoji} text={label(o)} on={d.interests.includes(o.v)} onClick={() => patch({ interests: upTo3(d.interests, o.v) })} />)}</div>
            <NextBtn ok={d.interests.length > 0} />
          </>
        )}

        {step === 'friday' && (
          <>
            <Head {...Q.friday} />
            <div className="space-y-2.5">{FRIDAY_OPTS.map((o) => (
              <Pick key={o.v} emoji={o.emoji} text={label(o)} on={d.purposes[0] === o.v} onClick={() => { patch({ purposes: [o.v, ...(o.v === 'friend' ? [] : ['friend' as Purpose])], likes: o.likes }); window.setTimeout(next, 220); }} />
            ))}</div>
          </>
        )}

        {step === 'meet' && (
          <>
            <Head {...Q.meet} />
            <div className="space-y-2.5">{MEET_OPTS.map((o) => <Pick key={o.v} emoji={o.emoji} text={label(o)} on={d.lookingFor.includes(o.v)} onClick={() => patch({ lookingFor: tog(d.lookingFor, o.v) })} />)}</div>
            <NextBtn ok={d.lookingFor.length > 0} />
          </>
        )}

        {step === 'major' && (
          <>
            <Head {...Q.major} />
            <Field label={en ? 'Major' : '전공'}><Input value={d.department} onChange={(e) => patch({ department: e.target.value })} placeholder={en ? 'e.g. Computer Science' : '예: 컴퓨터공학'} /></Field>
            <Field label={en ? 'Year' : '학년'}><div className="flex flex-wrap gap-2">{YEARS.map((y) => (
              <button key={y.v} onClick={() => patch({ yearInSchool: y.v })} className={cn('h-11 px-4 rounded-full border-2 text-[14px] font-semibold press', d.yearInSchool === y.v ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink')}>{label(y)}</button>
            ))}</div></Field>
            {ai && (
              <div className="rounded-2xl bg-primary-soft p-3.5 space-y-2">
                <b className="text-[14px] flex items-center gap-1.5 text-primary"><Sparkles size={15} />{en ? 'Anything else? (optional)' : '더 하고 싶은 말? (선택)'}</b>
                <p className="text-[12px] text-ink-2">{en ? 'Write a line or paste your résumé — we’ll fill in the rest and pick clubs and listings for you.' : '한 줄을 쓰거나 이력서를 붙여넣으면 나머지를 채우고 동아리·공고를 골라드려요.'}</p>
                <Textarea rows={3} value={d.text} onChange={(e) => patch({ text: e.target.value })} placeholder={en ? 'e.g. into climbing and fintech, want a summer internship' : '예: 클라이밍이랑 핀테크 좋아함, 여름 인턴 찾는 중'} className="bg-surface" />
                {d.text.trim().length >= 10 && <Button full variant="primary" icon={<Sparkles size={16} />} loading={busy} onClick={fill}>{busy ? (en ? 'Reading…' : '읽는 중…') : (en ? 'Use this' : '이걸로 채우기')}</Button>}
              </div>
            )}
            <NextBtn ok={d.yearInSchool > 0} />
          </>
        )}

        {step === 'preview' && (
          <>
            <Head q={en ? 'Here’s your profile ✨' : '이렇게 보여요 ✨'} sub={en ? 'Tweak anything. Classmates see this on your card.' : '마음대로 고치세요. 같은 학교 학생들에게 보이는 카드예요.'} />
            <div className="rounded-3xl bg-primary text-white p-5 shadow-[0_16px_36px_-8px_rgba(15,43,72,.35)]">
              <div className="flex items-center gap-3">
                <span className="h-14 w-14 rounded-2xl bg-white/15 grid place-items-center text-[30px]">{d.avatar}</span>
                <div className="min-w-0"><b className="block text-[18px] truncate">{d.nickname || (en ? 'You' : '나')}</b><span className="block text-[13px] text-accent truncate">{[d.department, label(YEARS.find((y) => y.v === d.yearInSchool) ?? { en: '', ko: '' }), school?.name].filter(Boolean).join(' · ')}</span></div>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-white/90">{bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {d.goals.map((g) => { const o = GOAL_OPTS.find((x) => x.v === g); return o && <span key={g} className="h-7 px-2.5 rounded-full bg-white/15 text-[12px] font-semibold flex items-center gap-1">{o.emoji} {label(o)}</span>; })}
                {d.interests.map((i) => { const o = VIBE_OPTS.find((x) => x.v === i); return o && <span key={i} className="h-7 px-2.5 rounded-full bg-accent-soft text-primary text-[12px] font-semibold flex items-center gap-1">{o.emoji} {label(o)}</span>; })}
              </div>
            </div>
            <Field label={en ? 'Pick an avatar' : '아바타'}><div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => patch({ avatar: a })} className={cn('h-11 w-11 rounded-xl text-[22px] grid place-items-center press', d.avatar === a ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2')}>{a}</button>)}</div></Field>
            <Field label={en ? 'Your one-liner' : '한 줄 소개'}><Textarea rows={3} maxLength={200} value={bio} onChange={(e) => patch({ bio: e.target.value, bioEdited: true })} /></Field>
            {suggest && (suggest.clubs.length > 0 || suggest.listings.length > 0) && (
              <div className="space-y-2">
                <div><b className="text-[15px] flex items-center gap-1.5"><Sparkles size={15} className="text-primary" />{en ? 'Picked for you' : '추천'}</b><p className="text-[12px] text-ink-3">{en ? 'Tap ♡ to save clubs — you’ll find everything in Campus after you join.' : '♡ 를 누르면 동아리가 저장돼요.'}</p></div>
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
            <NextBtn ok text={en ? 'Looks good' : '좋아요'} />
          </>
        )}

        {step === 'name' && (
          <>
            <Head q={en ? 'Last one — what should we call you?' : '마지막! 뭐라고 불러드릴까요?'} sub={en ? 'A first name or nickname. This is how classmates will see you.' : '같은 학교 학생들에게 보이는 이름이에요.'} />
            <Field label={en ? 'Name' : '이름'}><Input autoFocus maxLength={20} value={d.nickname} onChange={(e) => patch({ nickname: e.target.value })} /></Field>
            <Field label={en ? 'Birth year' : '출생 연도'}><Input inputMode="numeric" maxLength={4} placeholder="2005" value={d.birthYear} onChange={(e) => patch({ birthYear: e.target.value.replace(/\D/g, '') })} /></Field>
            <NextBtn ok={!!d.nickname.trim() && birthOk} />
          </>
        )}

        {step === 'email' && (
          <>
            <Head q={en ? 'Save your account with your school email' : '학교 이메일로 계정을 지켜요'} sub={en ? 'So you can sign back in on a new phone or after clearing your browser. We only send a 6-digit code — no spam.' : '폰을 바꾸거나 브라우저를 지워도 다시 들어올 수 있어요. 6자리 코드만 보내요.'} />
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
            <Button full size="lg" loading={busy && verified} disabled={!verified} onClick={() => finish(true)}>{en ? 'Start Lumi' : 'Lumi 시작하기'}</Button>
            <button onClick={() => finish(false)} disabled={busy} className="w-full h-10 text-[13px] font-semibold text-ink-3">{en ? 'Skip for now' : '나중에 할게요'}</button>
          </>
        )}
      </div>
    </div>
  );
}
