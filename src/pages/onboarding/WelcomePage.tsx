import { useEffect, useRef, useState } from 'react';
import { t, lang, setLang } from '@core/i18n';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, BottomSheet, Field, Input } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { api, apiMode } from '@core/api';
import { GraduationCap, MapPin, Users, Sparkles, Mail } from 'lucide-react';

export function WelcomePage() {
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState('');

  const login = async (schoolId?: string) => {
    setBusy(true);
    try {
      const user = await api.auth.loginDemo(schoolId);
      await setCurrentUser(user);
      nav('/', { replace: true });
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

  const sendCode = async () => {
    setBusy(true);
    try {
      const r = await api.schools.sendVerificationCode(email.trim(), '');
      setHint(r.hint);
      if (r.ok) setSent(true); else showToast(r.hint, 'error');
    } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const loginWithCode = async () => {
    setBusy(true);
    try {
      const user = await api.auth.loginWithCode(email.trim(), code.trim());
      await setCurrentUser(user);
      nav('/', { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };

  return (
    <div className="min-h-full flex flex-col relative bg-[linear-gradient(180deg,#EEF1FF_0%,#F6F7FB_45%)]">
      <div className="absolute top-4 right-4 flex rounded-full bg-white/80 backdrop-blur p-0.5 text-[12px] font-bold shadow-sm">
        <button onClick={() => lang !== 'ko' && setLang('ko')} className={`px-3 h-7 rounded-full ${lang === 'ko' ? 'bg-ink text-white' : 'text-ink-2'}`}>한국어</button>
        <button onClick={() => lang !== 'en' && setLang('en')} className={`px-3 h-7 rounded-full ${lang === 'en' ? 'bg-ink text-white' : 'text-ink-2'}`}>English</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16 text-center">
        <div className="relative">
          <div className="h-24 w-24 rounded-[28px] bg-primary grid place-items-center text-white shadow-[var(--shadow-float)]"><MapPin size={46} strokeWidth={2.4} /></div>
          <span className="absolute -right-3 -top-2 h-10 w-10 rounded-2xl bg-white shadow grid place-items-center text-xl">☕</span>
          <span className="absolute -left-4 bottom-0 h-10 w-10 rounded-2xl bg-white shadow grid place-items-center text-xl">📚</span>
        </div>
        <h1 className="mt-8 text-[30px] font-extrabold tracking-tight">Heetz</h1>
        <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">{t('학교와 주변에서 일어나는 활동을 발견하고')}<br />{t('사람·동아리·모임과 자연스럽게 연결되는 앱')}</p>
        <div className="mt-8 grid grid-cols-3 gap-2 w-full">
          {[{ Icon: Users, t: t('사람'), d: t('누구와') }, { Icon: Sparkles, t: t('활동'), d: t('무엇을') }, { Icon: MapPin, t: t('장소'), d: t('어디서') }].map((x) => (
            <div key={x.t} className="card p-3 flex flex-col items-center gap-1"><x.Icon size={20} className="text-primary" /><b className="text-[13px]">{x.t}</b><span className="text-[11px] text-ink-3">{x.d}</span></div>
          ))}
        </div>
        <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary-soft text-primary text-[12px] font-semibold px-3 h-8"><GraduationCap size={14} /> {t('대학생·대학원생·졸업생을 위한 서비스')}</div>
      </div>
      <div className="px-6 pb-10 space-y-2.5 safe-bottom">
        <Button full size="lg" onClick={() => nav(apiMode === 'remote' ? '/start' : '/onboarding/basic')}>{lang === 'en' ? 'Get started' : '시작하기'}</Button>
        <Button full size="lg" variant="outline" icon={<Mail size={16} />} onClick={() => setEmailOpen(true)}>{t('이메일로 로그인')}</Button>
        {apiMode === 'remote' ? (
          <div>
            <p className="text-center text-[12px] text-ink-3 pt-1 pb-1.5">{lang === 'en' ? 'Look around with a demo account' : '데모 계정으로 둘러보기'}</p>
            <div className="flex gap-2">
              <Button full variant="secondary" onClick={() => login('s_berkeley')} disabled={busy && !emailOpen}>UC Berkeley</Button>
              <Button full variant="secondary" onClick={() => login('s_ucmerced')} disabled={busy && !emailOpen}>UC Merced</Button>
            </div>
          </div>
        ) : <Button full size="lg" variant="ghost" onClick={() => login()} loading={busy && !emailOpen}>{t('로그인 (데모 계정)')}</Button>}
        <p className="text-center text-[11px] text-ink-3 pt-1">{t('정확한 위치는 다른 사용자에게 절대 공개되지 않아요.')}</p>
      </div>

      <BottomSheet open={emailOpen} onClose={() => setEmailOpen(false)} title={t('이메일로 로그인')}>
        <div className="space-y-4">
          <Field label={t('학교 이메일')} hint={hint || t('가입할 때 쓴 학교 이메일로 코드를 보내드려요.')}>
            <div className="flex gap-2">
              <Input type="email" autoFocus placeholder="you@school.edu" value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); }} />
              <Button variant="secondary" onClick={sendCode} loading={busy} disabled={!email.includes('@')}>{t('코드 받기')}</Button>
            </div>
          </Field>
          {sent && (
            <Field label={t('인증 코드')} hint={apiMode === 'mock' ? t('데모 인증 코드: 123456') : undefined}>
              <Input inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
          )}
          <Button full size="lg" onClick={loginWithCode} loading={busy} disabled={!sent || code.trim().length < 6}>{t('로그인')}</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
