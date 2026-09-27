import { useState } from 'react';
import { t, lang, setLang } from '@core/i18n';
import { useNavigate } from 'react-router-dom';
import { Button, BottomSheet, Field, Input } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { api, apiMode } from '@core/api';
import { Mail, ArrowRight, GraduationCap, Sparkles, MapPin } from 'lucide-react';

/** 1. Splash — "Start with your university. Expand your circle." */
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

  const login = async () => {
    setBusy(true);
    try {
      const user = await api.auth.loginDemo();
      await setCurrentUser(user);
      nav('/', { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };

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

  const pills = [
    { Icon: GraduationCap, label: t('내 학교') },
    { Icon: Sparkles, label: t('내 관심사') },
    { Icon: MapPin, label: t('내 도시') },
  ];

  return (
    <div className="min-h-full flex flex-col relative bg-white">
      <div className="absolute top-4 right-4 flex rounded-full bg-surface-2 p-0.5 text-[12px] font-bold">
        <button onClick={() => lang !== 'ko' && setLang('ko')} className={`px-3 h-7 rounded-full ${lang === 'ko' ? 'bg-primary text-white' : 'text-ink-2'}`}>한국어</button>
        <button onClick={() => lang !== 'en' && setLang('en')} className={`px-3 h-7 rounded-full ${lang === 'en' ? 'bg-primary text-white' : 'text-ink-2'}`}>English</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-7 pt-16 text-center">
        <div className="font-display text-[46px] font-extrabold tracking-tight text-primary leading-none">AroundU</div>
        <h1 className="mt-7 font-display text-[28px] font-bold text-primary leading-tight">
          {lang === 'en' ? <>Start with your university.<br />Expand your circle.</> : <>학교에서 시작해,<br />서클을 넓히세요.</>}
        </h1>
        <p className="mt-3 text-[15px] text-ink-2 leading-relaxed">{lang === 'en' ? 'Find opportunities. Meet people. Make friends.' : t('기회를 찾고, 사람을 만나고, 친구를 만드세요.')}</p>
        <div className="mt-8 flex items-center justify-center gap-1.5 flex-wrap">
          {pills.map((p, i) => (
            <span key={p.label} className="contents">
              <span className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold ${i === 0 ? 'bg-primary text-white' : i === 1 ? 'bg-primary-soft text-primary' : 'bg-accent-soft text-primary'}`}><p.Icon size={13} />{p.label}</span>
              {i < pills.length - 1 && <ArrowRight size={14} className="text-ink-3" />}
            </span>
          ))}
        </div>
      </div>
      <div className="px-6 pb-10 space-y-2.5 safe-bottom">
        <Button full size="lg" onClick={() => nav('/onboarding/account')}>{t('회원가입')}</Button>
        <Button full size="lg" variant="outline" icon={<Mail size={16} />} onClick={() => setEmailOpen(true)}>{t('이메일로 로그인')}</Button>
        <Button full size="lg" variant="ghost" onClick={login} loading={busy && !emailOpen}>{t('로그인 (데모 계정)')}</Button>
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
