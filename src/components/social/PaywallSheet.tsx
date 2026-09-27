import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { PLANS, FREE_SWIPES_PER_DAY } from '@core/lib/monetization';
import { cn } from '@core/lib/cn';
import { BottomSheet, Button } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';

/** PRD "Expand your circle" 혜택 목록 */
const PERKS = [
  t('대학 밖 무제한 발견'),
  t('여러 학교의 졸업생'),
  t('학교 간 사람 검색·고급 필터'),
  t('여러 학교를 한 번에 검색'),
  t('다른 도시의 네트워크'),
  t('더 많은 소개 요청'),
  t('저장한 검색·발견 알림'),
  t('광고 없는 피드'),
];

/** AroundU+ 페이월 — 모의 결제 (실제 과금 없음). reason='limit' 이면 하루 요청 한도(30) 초과 문구를 위에 보여준다 */
export function PaywallSheet({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: 'limit' }) {
  const v = useViewer();
  const nav = useNavigate();
  const run = useAppStore((s) => s.run);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [busy, setBusy] = useState(false);
  const plans = PLANS[lang === 'en' ? 'en' : 'ko'];
  const subscribe = async () => {
    setBusy(true);
    try { await run(() => api.users.setPlan(v.me.id, 'plus'), t('AroundU+ 시작!')); onClose(); } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="AroundU+" tall>
      {reason === 'limit' && (
        <div className="rounded-2xl bg-gold-soft px-4 py-3 mb-4">
          <div className="text-[14px] font-bold">{lang === 'en' ? `You've used all ${FREE_SWIPES_PER_DAY} requests for today` : `오늘 요청 ${FREE_SWIPES_PER_DAY}개를 다 썼어요`}</div>
          <div className="text-[12px] text-ink-2 mt-0.5">{lang === 'en' ? `You get ${FREE_SWIPES_PER_DAY} more tomorrow. AroundU+ is unlimited.` : `내일 다시 ${FREE_SWIPES_PER_DAY}개가 채워져요. AroundU+ 는 무제한이에요.`}</div>
        </div>
      )}
      <div className="flex items-center gap-2"><Sparkles size={18} className="text-primary" /><span className="font-display text-[22px] font-bold text-primary">{t('서클을 넓히세요')}</span></div>
      <p className="text-[13px] text-ink-2 mt-1">{t('대학·도시·커뮤니티를 넘어 사람을 발견하세요.')}</p>
      <ul className="mt-3 space-y-1.5">{PERKS.map((p) => <li key={p} className="flex items-center gap-3 text-[14px]"><span className="h-6 w-6 rounded-full bg-accent-soft grid place-items-center text-primary shrink-0"><Check size={14} /></span>{p}</li>)}</ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(['yearly', 'monthly'] as const).map((k) => { const p = plans[k]; const on = period === k; return (
          <button key={k} onClick={() => setPeriod(k)} className={cn('rounded-2xl border-2 p-3.5 text-left', on ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
            <div className="flex items-center gap-2 text-[12px] font-bold text-ink-3">{p.label}{'badge' in p && <span className="h-5 px-2 rounded-full bg-primary text-white text-[10px] font-bold grid place-items-center">{p.badge}</span>}</div>
            <div className="mt-1 text-[20px] font-extrabold text-primary">{p.price}<span className="text-[12px] font-medium text-ink-3">{p.per}</span></div>
          </button>
        ); })}
      </div>
      <Button full size="lg" className="mt-4" loading={busy} onClick={subscribe} icon={<Sparkles size={16} />}>{t('AroundU+ 써보기')}</Button>
      <p className="mt-2 text-center text-[12px] font-semibold text-primary">{t('무료 체험 7일')}</p>
      <p className="mt-1 text-center text-[11px] text-ink-3">{t('데모 — 실제 결제는 일어나지 않아요')} · <button onClick={() => { onClose(); nav('/pricing'); }} className="underline underline-offset-2">{t('가격 보기')}</button></p>
    </BottomSheet>
  );
}
