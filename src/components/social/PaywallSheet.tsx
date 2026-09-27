import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Lock } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { PLANS, FREE_SWIPES_PER_DAY } from '@core/lib/monetization';
import { cn } from '@core/lib/cn';
import { BottomSheet, Button } from '@/components/ui';

export type PaywallReason = 'limit' | 'search' | 'save' | 'alert';
export type PlanPeriod = 'monthly' | 'yearly';

/** AroundU+ 5가지 — 사람을 만나는 건 무료, "더 빠르고 정확하게 찾는 기능"만 유료 */
export const PLUS_PERKS: () => { title: string; desc: string }[] = () => [
  { title: t('복수 조건 검색'), desc: t('조건을 2개 이상 겹쳐서 찾아요') },
  { title: t('상세 조건'), desc: t('업종 · 직무 · 회사 · 졸업연도 · 활동 지역') },
  { title: t('검색 저장 + 새 사람 알림'), desc: t('조건을 저장해두면 새 사람이 들어올 때 알려드려요') },
  { title: `${t('연결 요청')} ${FREE_SWIPES_PER_DAY} → ${t('무제한')}`, desc: t('하루 한도 없이 연결 요청을 보내요') },
  { title: t('고급 추천'), desc: t('찾는 사람 조건을 더 정교하게 반영한 추천') },
];

/** 요금제 토글 (월 / 연) — 페이월·Plus 페이지 공용 */
export function PlanToggle({ period, onChange }: { period: PlanPeriod; onChange: (p: PlanPeriod) => void }) {
  const plans = PLANS[lang === 'en' ? 'en' : 'ko'];
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['yearly', 'monthly'] as const).map((k) => { const p = plans[k]; const on = period === k; return (
        <button key={k} onClick={() => onChange(k)} className={cn('rounded-2xl border-2 p-3.5 text-left press', on ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
          <div className="flex items-center gap-2 text-[12px] font-bold text-ink-3">{p.label}{'badge' in p && <span className="h-5 px-2 rounded-full bg-primary text-white text-[10px] font-bold grid place-items-center">{p.badge}</span>}</div>
          <div className="mt-1 text-[20px] font-extrabold text-primary">{p.price}<span className="text-[12px] font-medium text-ink-3">{p.per}</span></div>
        </button>
      ); })}
    </div>
  );
}

const BANNER: Record<PaywallReason, () => string> = {
  limit: () => (lang === 'en' ? `You've used all ${FREE_SWIPES_PER_DAY} connection requests for today` : `오늘 연결 요청 ${FREE_SWIPES_PER_DAY}회를 다 썼어요`),
  search: () => t('조건 2개 이상·상세 조건은 AroundU+'),
  save: () => t('검색 저장과 새 사람 알림은 AroundU+'),
  alert: () => t('검색 저장과 새 사람 알림은 AroundU+'),
};

/** AroundU+ 페이월 — 결제는 /plus/checkout 에서(모의). reason 별로 위에 한 줄 배너 */
export function PaywallSheet({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: PaywallReason }) {
  const nav = useNavigate();
  const [period, setPeriod] = useState<PlanPeriod>('yearly');
  const go = (path: string) => { onClose(); nav(path); };
  return (
    <BottomSheet open={open} onClose={onClose} title="AroundU+" tall>
      {reason && (
        <div className="rounded-2xl bg-gold-soft px-4 py-3 mb-4 flex items-start gap-2">
          <Lock size={15} className="text-[#B57A0E] shrink-0 mt-0.5" />
          <div>
            <div className="text-[14px] font-bold">{BANNER[reason]()}</div>
            {reason === 'limit' && <div className="text-[12px] text-ink-2 mt-0.5">{lang === 'en' ? `You get ${FREE_SWIPES_PER_DAY} more tomorrow. AroundU+ has no limit.` : `내일 다시 ${FREE_SWIPES_PER_DAY}회가 채워져요. AroundU+ 는 무제한이에요.`}</div>}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2"><Sparkles size={18} className="text-primary" /><span className="font-display text-[22px] font-bold text-primary">{t('더 정확한 사람을 더 빠르게')}</span></div>
      <p className="text-[13px] text-ink-2 mt-1 leading-relaxed">{t('사람을 만나는 데는 돈을 받지 않아요. 원하는 사람을 더 빠르고 정교하게 찾는 기능만 AroundU+ 예요.')}</p>
      <ul className="mt-3 space-y-2">{PLUS_PERKS().map((p) => (
        <li key={p.title} className="flex items-start gap-3"><span className="h-6 w-6 rounded-full bg-accent-soft grid place-items-center text-primary shrink-0 mt-0.5"><Check size={14} /></span><div><div className="text-[14px] font-semibold">{p.title}</div><div className="text-[12px] text-ink-3">{p.desc}</div></div></li>
      ))}</ul>
      <div className="mt-4"><PlanToggle period={period} onChange={setPeriod} /></div>
      <Button full size="lg" className="mt-4" onClick={() => go(`/plus/checkout?period=${period}`)} icon={<Sparkles size={16} />}>{t('구독 시작하기')}</Button>
      <button onClick={() => go('/plus')} className="mt-2.5 w-full text-center text-[13px] font-semibold text-primary underline underline-offset-2 press">{t('자세히 보기')}</button>
      <p className="mt-2 text-center text-[11px] text-ink-3">{t('데모 — 실제 결제는 일어나지 않아요')} · <button onClick={() => go('/pricing')} className="underline underline-offset-2">{t('가격 보기')}</button></p>
    </BottomSheet>
  );
}
