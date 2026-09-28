import { useState } from 'react';
import { t, lang, setLang } from '@core/i18n';
import { useNavigate } from 'react-router-dom';
import { Button, BottomSheet, Field, Input } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { api, apiMode } from '@core/api';
import { localeContext } from '@core/lib/locale-context';
import { legalUrl } from '@core/lib/legal';
import { ArrowRight, GraduationCap, Sparkles, Briefcase, Globe } from 'lucide-react';

/** 데모 계정 버튼 — mock 모드이거나 VITE_SHOW_DEMO=1 로 빌드한 경우만 (스토어 빌드에는 숨김) */
const SHOW_DEMO = apiMode === 'mock' || import.meta.env.VITE_SHOW_DEMO === '1';

/**
 * 1. Welcome — "같은 대학에서, 더 넓은 세상으로."
 * 5초 안에 정체성이 느껴져야 한다: 검증된 학교 관계망 → 관심사·활동 → 직업·지역 → 더 넓은 관계.
 */
export function WelcomePage() {
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const ctx = localeContext();
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
    { Icon: GraduationCap, label: t('내 학교'), cls: 'bg-primary text-white' },
    { Icon: Sparkles, label: t('관심사·활동'), cls: 'bg-primary-soft text-primary' },
    { Icon: Briefcase, label: t('직업·지역'), cls: 'bg-accent-soft text-primary' },
    { Icon: Globe, label: t('더 넓은 관계'), cls: 'bg-surface-2 text-ink-2' },
  ];

  return (
    <div className="min-h-full flex flex-col relative bg-white">
      <div className="absolute top-4 right-4 flex rounded-full bg-surface-2 p-0.5 text-[12px] font-bold">
        <button onClick={() => lang !== 'ko' && setLang('ko')} className={`px-3 h-7 rounded-full ${lang === 'ko' ? 'bg-primary text-white' : 'text-ink-2'}`}>한국어</button>
        <button onClick={() => lang !== 'en' && setLang('en')} className={`px-3 h-7 rounded-full ${lang === 'en' ? 'bg-primary text-white' : 'text-ink-2'}`}>English</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-7 pt-16 text-center">
        <div className="font-display text-[46px] font-extrabold tracking-tight leading-none" style={{ color: 'var(--ink)' }}>AroundU</div>
        <h1 className="mt-7 font-display text-[28px] font-bold text-ink leading-tight text-balance">{ctx.tagline}</h1>
        <p className="mt-3 text-[14px] text-ink-2 leading-relaxed text-balance">{ctx.subtitle}</p>
        <div className="mt-8 flex items-center justify-center gap-1 flex-wrap px-2">
          {pills.map((p, i) => (
            <span key={p.label} className="contents">
              <span className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold ${p.cls}`}><p.Icon size={12} />{p.label}</span>
              {i < pills.length - 1 && <ArrowRight size={12} className="text-ink-3" />}
            </span>
          ))}
        </div>
      </div>
      <div className="px-6 pb-10 space-y-2.5 safe-bottom">
        <Button full size="lg" onClick={() => nav('/onboarding/school')}>{t('시작하기')}</Button>
        <button type="button" onClick={() => setEmailOpen(true)} className="w-full h-11 text-[13px] text-ink-2 press">
          {t('이미 계정이 있나요?')} <span className="font-bold text-primary underline underline-offset-2">{t('로그인')}</span>
        </button>
        {SHOW_DEMO && <Button full size="lg" variant="ghost" onClick={login} loading={busy && !emailOpen}>{t('로그인 (데모 계정)')}</Button>}
        <p className="text-center text-[11px] text-ink-3 pt-1">{t('학교 인증을 거친 사람만 만나요. 정확한 위치는 절대 공개되지 않아요.')}</p>
        <p className="text-center text-[11px] text-ink-3">
          <a href={legalUrl('terms')} target="_blank" rel="noreferrer" className="underline underline-offset-2">{t('이용약관')}</a>
          <span className="mx-1.5">·</span>
          <a href={legalUrl('privacy')} target="_blank" rel="noreferrer" className="underline underline-offset-2">{t('개인정보처리방침')}</a>
        </p>
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
