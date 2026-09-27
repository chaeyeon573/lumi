import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, Search, Layers, Bell, UserPlus, Wand2, GraduationCap } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Tag } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { isPlus, FREE_SWIPES_PER_DAY } from '@core/lib/monetization';
import { PlanToggle, PLUS_PERKS, type PlanPeriod } from '@/components/social/PaywallSheet';

const ICONS = [Layers, Search, Bell, UserPlus, Wand2];

/** /plus — AroundU+ 설명. 무료로 할 수 있는 것을 먼저, 유료는 "찾는 기능"만 */
export function PlusPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const plus = isPlus(v.me);
  const [period, setPeriod] = useState<PlanPeriod>('yearly');
  const [busy, setBusy] = useState(false);
  const example = lang === 'en' ? 'e.g. San Francisco + AI + Founder + Berkeley/Stanford/MIT' : '예: 서울 + AI + Founder + 연세대/서울대/KAIST';
  const free = [t('추천 사람 보기'), t('타학교 사람 보기'), t('동문 보기'), t('기본 검색'), `${t('기본 연결 요청')} ${FREE_SWIPES_PER_DAY}/${t('일')}`, t('모임·그룹 참가'), t('피드'), t('메시지')];
  const cancel = async () => { setBusy(true); try { await run(() => api.users.setPlan(v.me.id, 'free'), t('AroundU+ 구독을 해지했어요.')); } catch { /* toast */ } finally { setBusy(false); } };

  return (
    <div className="min-h-full bg-bg pb-10">
      <TopBar back title="AroundU+" />
      <div className="px-4 space-y-4">
        <div className="rounded-[28px] bg-[linear-gradient(135deg,#D2E4FF,#BFF4FF)] p-5">
          <div className="flex items-center gap-2"><Sparkles size={18} className="text-primary" /><span className="font-display text-[24px] font-bold text-primary leading-tight">{t('더 정확한 사람을 더 빠르게')}</span></div>
          <p className="text-[13px] text-ink-2 mt-2 leading-relaxed">{t('사람을 만나는 데는 돈을 받지 않아요. 원하는 사람을 더 빠르고 정교하게 찾는 기능만 AroundU+ 예요.')}</p>
          {plus && <Tag tone="primary" className="mt-3"><Check size={11} />{t('이용 중')}</Tag>}
        </div>

        <div className="space-y-2">
          {PLUS_PERKS().map((p, i) => { const Icon = ICONS[i]; return (
            <div key={p.title} className="card p-4 flex items-start gap-3">
              <span className="h-10 w-10 rounded-2xl bg-primary-soft text-primary grid place-items-center shrink-0"><Icon size={18} /></span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold">{p.title}</div>
                <div className="text-[12px] text-ink-2 mt-0.5">{p.desc}</div>
                {i === 0 && <div className="text-[11px] text-ink-3 mt-1">{example}</div>}
              </div>
            </div>
          ); })}
        </div>

        <div className="rounded-[24px] border border-line bg-white p-4">
          <div className="text-[14px] font-bold">{t('무료로 할 수 있는 것')}</div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">{free.map((f) => <li key={f} className="text-[13px] text-ink-2 flex items-center gap-1.5"><Check size={13} className="text-mint shrink-0" />{f}</li>)}</ul>
        </div>

        {plus ? (
          <Button full size="lg" variant="outline" loading={busy} onClick={cancel}>{t('구독 관리')} · {t('해지')}</Button>
        ) : (
          <>
            <PlanToggle period={period} onChange={setPeriod} />
            <Button full size="lg" icon={<Sparkles size={16} />} onClick={() => nav(`/plus/checkout?period=${period}`)}>{t('구독 시작하기')}</Button>
          </>
        )}
        <p className="text-center text-[12px] text-ink-2 flex items-center justify-center gap-1.5"><GraduationCap size={14} className="text-primary" />{t('학생과 졸업생 모두 같은 기준 · 졸업했다고 유료가 되지 않아요')}</p>
        <p className="text-center text-[11px] text-ink-3">{t('데모 — 실제 결제는 일어나지 않아요')} · <button onClick={() => nav('/pricing')} className="underline underline-offset-2">{t('가격 보기')}</button></p>
      </div>
    </div>
  );
}
