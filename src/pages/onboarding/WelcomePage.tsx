import { useEffect, useRef, useState } from 'react';
import { t, lang, setLang } from '@core/i18n';
import { CalendarDays, Coffee, Users } from 'lucide-react';
import { Btn, Wordmark, TONE } from '@/components/ha';
import { cn } from '@core/lib/cn';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@core/store/useAppStore';
import { api, apiMode } from '@core/api';
import { takeReturnTo } from '@/lib/returnTo';
import { pendingSignIn } from './LoginPage';

export function WelcomePage() {
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const login = async (schoolId?: string) => {
    setBusy(true);
    try {
      const user = await api.auth.loginDemo(schoolId);
      await setCurrentUser(user);
      nav(takeReturnTo(), { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };

  // 친구에게 보내는 링크: /welcome?demo=berkeley | ucmerced → 그 학교 데모 계정으로 바로 들어간다
  const [params] = useSearchParams();
  const autoDemo = useRef(false);
  useEffect(() => {
    const d = params.get('demo');
    if (autoDemo.current || !d) return;
    autoDemo.current = true;
    void login(d === 'ucmerced' || d === 'merced' ? 's_ucmerced' : 's_berkeley');
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  // S002 is a full screen now (/login). Old links (/welcome?signin=1, push notifications, the iPhone app) still land there
  if (params.get('signin') === '1' || (!params.get('demo') && pendingSignIn())) return <Navigate to="/login" replace />;
  const start = () => nav(apiMode === 'remote' ? '/start/goals' : '/onboarding/basic');

  /* S001 Welcome (PDF p.4) — 말 한 줄 + 떠 있는 칩 세 개 + Get Started / Sign In */
  return (
    <div className="min-h-full flex flex-col bg-bg px-6">
      <div className="h-14 flex items-center justify-end">
        <button onClick={() => setLang(lang === 'en' ? 'ko' : 'en')} className="text-[13px] text-ink-2 font-medium press">{lang === 'en' ? 'English' : '한국어'}</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center pt-6">
        <Wordmark size={52} dot />
        <h1 className="mt-8 text-[30px] font-extrabold leading-[1.15] tracking-[-0.03em]">{lang === 'en' ? <>Your college life,<br />all in one place.</> : <>대학 생활을<br />한곳에서.</>}</h1>
        {/* 무엇을 하는 앱인지 한 문장으로 — 사람 + 약속 (ux-sim 2026-11-06: "Pretty vague") */}
        <p className="mt-4 text-[15px] text-ink-2 leading-relaxed text-balance break-keep max-w-[300px]">{lang === 'en' ? 'Make plans with people on campus — lunch, events, study.' : '캠퍼스 사람들과 약속을 잡아요 — 점심, 행사, 공부.'}</p>
        {/* PDF 의 떠 있는 칩 세 개 — 앱이 하는 일(주간 일정 · 좋은 만남 · 커뮤니티) */}
        <div className="relative w-full max-w-[320px] h-[190px] mt-8" aria-hidden>
          <span className={cn('absolute left-2 top-2 -rotate-[4deg] h-12 px-4 rounded-2xl flex items-center gap-2 text-[14px] font-semibold border border-line', TONE.ice)}><CalendarDays size={18} />{lang === 'en' ? 'Your week' : '나의 한 주'}</span>
          <span className={cn('absolute right-0 top-[56px] rotate-[5deg] h-12 px-4 rounded-2xl flex items-center gap-2 text-[14px] font-semibold border border-line', TONE.peach)}><Coffee size={18} />{lang === 'en' ? 'Good company' : '좋은 사람들'}</span>
          <span className={cn('absolute left-6 top-[122px] -rotate-[2deg] h-12 px-4 rounded-2xl flex items-center gap-2 text-[14px] font-semibold border border-line', TONE.rose)}><Users size={18} />{lang === 'en' ? 'Your communities' : '나의 커뮤니티'}</span>
        </div>
      </div>
      <div className="pb-8 pt-4 safe-bottom">
        <Btn full size="lg" onClick={start} disabled={busy}>{lang === 'en' ? 'Get Started' : '시작하기'}</Btn>
        <button onClick={() => nav('/login')} className="block mx-auto mt-4 h-10 px-4 text-[15px] font-semibold text-sel-fg press">{lang === 'en' ? 'Sign In' : '로그인'}</button>
        <button onClick={() => nav('/guest/explore/events')} className="block mx-auto h-9 px-4 text-[13px] font-medium text-ink-3 press">{lang === 'en' ? 'Look around first' : '가입 없이 둘러보기'}</button>
        {apiMode !== 'remote' && <button onClick={() => login()} className="block mx-auto text-[12px] text-ink-3 underline">{t('로그인 (데모 계정)')}</button>}
        <p className="text-center text-[12px] text-ink-3 mt-3"><Link to="/terms" className="press">Terms</Link> · <Link to="/privacy" className="press">Privacy</Link></p>
      </div>

    </div>
  );
}
