import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { BOOST_PRICES, BOOST_AUDIENCES } from '@core/lib/monetization';
import { networkLabel } from '@core/lib/network';
import { cn } from '@core/lib/cn';
import { BottomSheet, Button, Chip } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import type { BoostTier } from '@core/types';

/** 예상 도달 (모의) — 캠퍼스 3,000 · 크로스 12,000 × audiences/4 */
const REACH: Record<BoostTier, number> = { community: 3000, cross: 12000 };

/** '₩50,000–150,000' / '$38–110' → { min, max } */
function priceRange(tier: BoostTier) {
  const s = BOOST_PRICES[tier][lang === 'en' ? 'en' : 'ko'];
  const nums = (s.match(/[\d,]+/g) ?? []).map((x) => Number(x.replace(/,/g, '')));
  return { min: nums[0] ?? 0, max: nums[1] ?? nums[0] ?? 0 };
}
const money = (n: number) => (lang === 'en' ? `$${Math.round(n)}` : `₩${(Math.round(n / 1000) * 1000).toLocaleString('ko-KR')}`);

/** Post Boost (모의 결제) — Community(내 캠퍼스, 7일) / Cross-network(audience 1–4개, 가격은 개수에 비례) */
export function BoostSheet({ open, onClose, postId }: { open: boolean; onClose: () => void; postId: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [tier, setTier] = useState<BoostTier>('community');
  const [aud, setAud] = useState<string[]>([BOOST_AUDIENCES[0]]);
  const [busy, setBusy] = useState(false);
  const campus = v.me.affiliation.type === 'university' ? networkLabel(v.me, lang) : t('내 캠퍼스');
  const n = tier === 'community' ? 1 : Math.min(Math.max(aud.length, 1), 4);
  const r = priceRange(tier);
  const price = tier === 'community' ? r.min : r.min + ((r.max - r.min) * (n - 1)) / 3;
  const reach = tier === 'community' ? REACH.community : Math.round((REACH.cross * n) / 4);
  const toggle = (a: string) => setAud((s) => (s.includes(a) ? (s.length > 1 ? s.filter((x) => x !== a) : s) : s.length < 4 ? [...s, a] : s));
  const submit = async () => {
    setBusy(true);
    try {
      await run(() => api.posts.boost(postId, tier, tier === 'community' ? [campus] : aud), t('부스트 요청했어요.'));
      onClose();
    } catch { /* toast */ } finally { setBusy(false); }
  };
  const tiers: { key: BoostTier; title: string; sub: string }[] = [
    { key: 'community', title: t('커뮤니티 부스트'), sub: `${campus} · ${t('7일')}` },
    { key: 'cross', title: t('크로스 네트워크 부스트'), sub: t('대상 1–4개 선택') },
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title={t('부스트')} tall>
      <div className="space-y-2">
        {tiers.map((x) => { const on = tier === x.key; const p = BOOST_PRICES[x.key]; return (
          <button key={x.key} onClick={() => setTier(x.key)} className={cn('w-full rounded-2xl border-2 p-3.5 text-left', on ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-primary">{x.title}</span>
              <span className="h-5 px-2 rounded-full bg-accent-soft text-primary text-[11px] font-bold grid place-items-center shrink-0">{p.reach} {t('도달')}</span>
              <span className="ml-auto text-[13px] font-bold text-ink shrink-0">{lang === 'en' ? p.en : p.ko}</span>
            </div>
            <div className="text-[12px] text-ink-2 mt-0.5">{x.sub}</div>
          </button>
        ); })}
      </div>
      {tier === 'cross' && (
        <div className="mt-3 flex flex-wrap gap-2">{BOOST_AUDIENCES.map((a) => <Chip key={a} size="sm" active={aud.includes(a)} onClick={() => toggle(a)}>{a}</Chip>)}</div>
      )}
      <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 flex items-center justify-between text-[13px]">
        <span className="text-ink-2">{t('예상 도달')}</span>
        <b className="text-primary">≈ {reach.toLocaleString()}{t('명')}</b>
      </div>
      <Button full size="lg" className="mt-4" icon={<Rocket size={16} />} loading={busy} onClick={submit}>{lang === 'en' ? `Boost for ${money(price)}` : `${money(price)}에 부스트`}</Button>
      <p className="mt-2 text-center text-[11px] text-ink-3">{t('데모 — 실제 결제는 일어나지 않아요')}</p>
      <button onClick={() => { onClose(); nav('/pricing'); }} className="block w-full mt-1 text-center text-[11px] font-semibold text-primary">{t('가격 보기')}</button>
    </BottomSheet>
  );
}
