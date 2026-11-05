import { useState } from 'react';
import { Check, Lock, Mail } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { BottomSheet } from '@/components/ui';
import { Btn, FormField, RowCard, TextInput } from '@/components/ha';

const en = lang === 'en';

/** 계정 보안 › 학교 이메일 — 가입 때 건너뛴 사람이 나중에 붙인다 (다른 기기에서 이메일 코드로 로그인) */
export function SchoolEmailCard() {
  const v = useViewer();
  const init = useAppStore((s) => s.init);
  const showToast = useAppStore((s) => s.showToast);
  const me = v.me;
  const aff = me.affiliation.type === 'university' ? me.affiliation : null;
  const schools = useAppStore((s) => s.schools);
  const domain = aff ? schools.find((s) => s.id === aff.schoolId)?.emailDomain : undefined;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  if (!aff) return null;

  const send = async () => {
    setBusy(true); setHint('');
    try { const r = await api.schools.sendVerificationCode(email.trim(), aff.schoolId); setHint(r.hint); setSent(r.ok); } catch (e) { setHint((e as Error).message); } finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true);
    try {
      const r = await api.schools.verifyCode(email.trim(), code.trim());
      if (!r.ok) { setHint(en ? 'That code didn’t match. Check the latest email.' : '코드가 맞지 않아요.'); return; }
      await api.auth.attachEmail(email.trim());
      setOpen(false); showToast(en ? 'School email saved — you can sign in with it on any device.' : '학교 이메일을 저장했어요 — 어느 기기에서든 이 이메일로 로그인할 수 있어요.', 'success');
      await init();
    } catch (e) { setHint((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <>
      <RowCard tone="ice" icon={<Mail size={21} />} title={en ? 'School email' : '학교 이메일'}
        sub={aff.emailVerified ? (en ? 'Verified — sign in with it on any device' : '인증됨 — 어느 기기에서든 로그인') : (en ? 'Add it so you can sign back in on a new phone' : '추가하면 폰을 바꿔도 다시 로그인할 수 있어요')}
        right={aff.emailVerified ? <Check size={18} className="text-ok shrink-0" /> : undefined}
        onClick={aff.emailVerified ? undefined : () => setOpen(true)} />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={en ? 'Add your school email' : '학교 이메일 추가'}>
        <div className="space-y-4 pb-2">
          <FormField label={en ? 'School email' : '학교 이메일'}>
            <div className="flex gap-2">
              <TextInput className="flex-1" icon={<Mail size={18} />} type="email" inputMode="email" autoComplete="email" placeholder={domain ? `you@${domain}` : 'you@school.edu'} value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); setCode(''); }} />
              <Btn variant="outline" size="lg" className="h-12 px-4" loading={busy && !sent} disabled={!email.includes('@')} onClick={send}>{sent ? (en ? 'Resend' : '다시') : (en ? 'Send code' : '코드 받기')}</Btn>
            </div>
          </FormField>
          {sent && <FormField label={en ? 'Verification code' : '인증 코드'}><TextInput icon={<Lock size={18} />} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></FormField>}
          {hint && <p className="text-[12.5px] text-ink-2">{hint}</p>}
          <Btn full size="lg" loading={busy && sent} disabled={!sent || code.length !== 6} onClick={confirm}>{en ? 'Verify and save' : '인증하고 저장'}</Btn>
        </div>
      </BottomSheet>
    </>
  );
}
