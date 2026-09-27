import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, CreditCard, Check, Search, Lock } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Field, Input, EmptyState } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { PLANS } from '@core/lib/monetization';
import type { PlanPeriod } from '@/components/social/PaywallSheet';

const fmtCard = (s: string) => s.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const fmtExpiry = (s: string) => { const d = s.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

/** /plus/checkout?period=monthly|yearly — 모의 결제. 완료하면 plan='plus' */
export function CheckoutPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const period: PlanPeriod = params.get('period') === 'monthly' ? 'monthly' : 'yearly';
  const plan = PLANS[lang === 'en' ? 'en' : 'ko'][period];
  const [name, setName] = useState(v.me.nickname);
  const [number, setNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/29');
  const [cvc, setCvc] = useState('123');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const ready = name.trim() && number.replace(/\s/g, '').length >= 12 && expiry.length >= 4 && cvc.length >= 3;
  const pay = async () => {
    setBusy(true);
    try { await run(() => api.users.setPlan(v.me.id, 'plus')); setDone(true); } catch { /* toast */ } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="min-h-full bg-bg">
        <TopBar title="AroundU+" />
        <EmptyState emoji="" title={t('이제 복수 조건 검색을 쓸 수 있어요')} description={t('상세 조건 · 검색 저장 · 새 사람 알림 · 무제한 연결 요청도 함께 열렸어요.')}
          action={<div className="flex flex-col gap-2"><Button icon={<Search size={16} />} onClick={() => nav('/people?tab=search', { replace: true })}>{t('찾기로 가기')}</Button><Button variant="ghost" size="sm" onClick={() => nav('/people', { replace: true })}>{t('추천 보기')}</Button></div>} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-bg pb-10">
      <TopBar back title={t('결제')} />
      <div className="px-4 space-y-4">
        <div className="rounded-[24px] bg-primary text-white p-4 flex items-center gap-3">
          <span className="h-10 w-10 rounded-2xl bg-white/15 grid place-items-center"><Sparkles size={18} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-accent font-semibold">AroundU+ · {plan.label}</div>
            <div className="text-[22px] font-extrabold leading-tight">{plan.price}<span className="text-[12px] font-medium opacity-80">{plan.per}</span></div>
          </div>
          <button onClick={() => nav(`/plus/checkout?period=${period === 'yearly' ? 'monthly' : 'yearly'}`, { replace: true })} className="h-8 px-3 rounded-full bg-white/15 text-[12px] font-semibold press">{t('변경')}</button>
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-[14px] font-bold"><CreditCard size={16} className="text-primary" />{t('카드 정보')}</div>
          <Field label={t('이름')}><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="cc-name" /></Field>
          <Field label={t('카드 번호')}><Input inputMode="numeric" value={number} onChange={(e) => setNumber(fmtCard(e.target.value))} placeholder="0000 0000 0000 0000" autoComplete="cc-number" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('유효기간')}><Input inputMode="numeric" value={expiry} onChange={(e) => setExpiry(fmtExpiry(e.target.value))} placeholder="MM/YY" autoComplete="cc-exp" /></Field>
            <Field label="CVC"><Input inputMode="numeric" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" autoComplete="cc-csc" /></Field>
          </div>
        </div>

        <Button full size="lg" loading={busy} disabled={!ready} onClick={pay} icon={<Lock size={16} />}>{t('결제하기')} · {plan.price}{plan.per}</Button>
        <p className="text-center text-[11px] text-ink-3 flex items-center justify-center gap-1"><Check size={11} />{t('데모 — 실제 결제는 일어나지 않아요')}</p>
      </div>
    </div>
  );
}
