import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { api, apiMode } from '@core/api';
import type { School } from '@core/types';
import { birthYearProblem } from '@core/lib/signup';
import { Btn, FormField, TextInput } from '@/components/ha';
import { StepFrame, en, type StepProps } from './shared';

/**
 * S011 A little about you — name, birth year (owner-only, 16+), school e-mail + code, Get Started.
 * Get Started checks the code (`schools.verifyCode`) and then creates the account (`auth.register`); the server checks
 * both again (verified e-mail only, 16+). The draft keeps the e-mail and "code sent" so a trip to Mail loses nothing.
 */
export function AboutStep({ d, patch, school, finish, onUseId }: Omit<StepProps, 'next'> & { school?: School; finish: (email: string) => Promise<void>; onUseId: () => void }) {
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [hint, setHint] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<'' | 'send' | 'start'>('');
  const email = d.email.trim();
  const age = d.birthYear.length === 4 ? birthYearProblem(Number(d.birthYear)) : 'invalid';
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready = !!d.nickname.trim() && !age && emailOk && d.codeSent && (verified || code.length === 6);

  const sendCode = async () => {
    setBusy('send'); setErr(''); setHint('');
    try {
      const r = await api.schools.sendVerificationCode(email, d.schoolId);
      if (r.ok) { setHint(r.hint); patch({ codeSent: true }); } else setErr(r.hint);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(''); }
  };

  const start = async () => {
    setBusy('start'); setErr('');
    try {
      if (!verified) {
        const r = await api.schools.verifyCode(email, code.trim());
        if (!r.ok) { setErr(en ? 'That code didn’t match. Check the latest email and try again.' : '코드가 맞지 않아요. 가장 최근 메일의 코드를 확인해 주세요.'); setBusy(''); return; }
        setVerified(true);
      }
      await finish(email);
    } catch (e) { setErr((e as Error).message); setBusy(''); }
  };

  const taken = /already registered|이미 가입된/i.test(err);
  return (
    <StepFrame title={en ? 'A little about you' : '나에 대해 조금만'} sub={en ? 'Your timetable and housing start friends-only.' : '시간표와 사는 곳은 처음엔 친구에게만 보여요.'}
      cta={{ label: en ? 'Get Started' : '시작하기', onClick: start, disabled: !ready || !!busy, loading: busy === 'start' }}
      note={<p className="text-center text-[11.5px] text-ink-3 leading-snug">{en ? 'By starting Lumi you confirm you’re 16 or older and agree to the ' : 'Lumi를 시작하면 만 16세 이상이며 다음에 동의하는 것으로 봐요: '}<Link to="/terms" className="text-sel-fg font-semibold">{en ? 'Terms' : '이용약관'}</Link>{en ? ' and ' : ', '}<Link to="/privacy" className="text-sel-fg font-semibold">{en ? 'Privacy Policy' : '개인정보처리방침'}</Link>.</p>}>
      <div className="space-y-5">
        <NameBirthFields d={d} patch={patch} />
        <FormField label={en ? 'School email' : '학교 이메일'}>
          <div className="flex gap-2">
            <TextInput className="flex-1 min-w-0" icon={<Mail size={19} />} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              disabled={verified} placeholder={school?.emailDomain ? `you@${school.emailDomain}` : 'you@university.edu'} value={d.email}
              onChange={(e) => { patch({ email: e.target.value, codeSent: false }); setCode(''); setVerified(false); setHint(''); setErr(''); }} />
            {!verified && <Btn variant="outline" size="lg" className="!h-12 px-4" onClick={sendCode} loading={busy === 'send'} disabled={!emailOk || !!busy}>{d.codeSent ? (en ? 'Resend' : '다시 받기') : (en ? 'Send code' : '코드 받기')}</Btn>}
          </div>
        </FormField>
        <FormField label={en ? 'Verification code' : '인증 코드'}
          hint={hint || (apiMode === 'mock' ? (en ? 'Demo code: 123456' : '데모 인증 코드: 123456') : d.codeSent ? undefined : (en ? 'We’ll email a 6-digit code to your school address.' : '학교 이메일로 6자리 코드를 보내 드려요.'))}>
          <TextInput icon={<Lock size={19} />} inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={!d.codeSent || verified}
            placeholder={en ? 'Enter your code' : '코드 입력'} value={verified ? '••••••' : code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && ready && !busy) void start(); }} />
        </FormField>
        {err && (
          <p role="alert" className="text-[13px] text-danger leading-snug">
            {err}{taken && <> <Link to="/login" className="text-sel-fg font-semibold">{en ? 'Sign in' : '로그인'}</Link></>}
          </p>
        )}
        {/* e-mail first; when that can't work (no school address, the code never comes) a photo of the card instead (owner 2026-11-06) */}
        {!verified && (
          <p className="text-[13px] text-ink-3 leading-snug">
            {d.role === 'alumni' ? (en ? 'No school email anymore?' : '학교 이메일이 없어졌나요?') : (en ? 'Can’t use your school email?' : '학교 이메일을 쓸 수 없나요?')}{' '}
            <button type="button" onClick={onUseId} className="text-sel-fg font-semibold press">{d.role === 'alumni' ? (en ? 'Use your alumni card' : '졸업생 카드로 인증') : (en ? 'Use your student ID' : '학생증으로 인증')}</button>
          </p>
        )}
      </div>
    </StepFrame>
  );
}

/** Name + birth year (owner-only, 16+) — S011 and the student ID screen */
export function NameBirthFields({ d, patch }: Pick<StepProps, 'd' | 'patch'>) {
  const age = d.birthYear.length === 4 ? birthYearProblem(Number(d.birthYear)) : 'invalid';
  return (
    <>
      <FormField label={en ? 'Your name' : '이름'}>
        <TextInput maxLength={20} autoComplete="given-name" value={d.nickname} onChange={(e) => patch({ nickname: e.target.value })} placeholder={en ? 'First name or nickname' : '이름 또는 닉네임'} />
      </FormField>
      <FormField label={en ? 'Birth year' : '출생 연도'}
        hint={age === 'under_16' ? <span className="text-danger">{en ? 'Lumi is for college students 16 and older.' : 'Lumi는 만 16세 이상 대학생을 위한 앱이에요.'}</span>
          : d.birthYear.length === 4 && age ? <span className="text-danger">{en ? 'Check your birth year.' : '출생 연도를 확인해 주세요.'}</span>
          : (en ? 'Only you see this. It confirms you’re 16+.' : '나만 볼 수 있어요. 만 16세 이상인지 확인용이에요.')}>
        <TextInput inputMode="numeric" maxLength={4} value={d.birthYear} onChange={(e) => patch({ birthYear: e.target.value.replace(/\D/g, '') })} placeholder={en ? 'Private to you' : '나만 보여요'} />
      </FormField>
    </>
  );
}

/** name and birth year are filled in and the birth year passes the 16+ rule */
export const nameBirthOk = (d: Pick<StepProps['d'], 'nickname' | 'birthYear'>) => !!d.nickname.trim() && d.birthYear.length === 4 && !birthYearProblem(Number(d.birthYear));
