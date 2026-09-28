import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Lightbulb, Zap, Megaphone, Handshake, Newspaper, Calculator, Scale, Map, Rocket, ShieldCheck, Lock, ArrowUp } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Tag, CardSkeleton, ErrorState } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { t, lang } from '@core/i18n';
import { cn } from '@core/lib/cn';
import {
  L, SECTIONS, FREE_CORE, REVENUE_STREAMS, PLUS_PLANS, PLUS_NOTES, PLUS_PERKS, PRICE_ANCHORS, PLUS_REASON,
  BOOSTS, BOOST_REASON, PROMOTED, PROMOTED_ADDONS, CPM_ROWS, PROMOTED_REASON, EXPERIENCES, EXPERIENCE_INCLUDES, EXPERIENCE_REASON,
  SPONSORED, SPONSORED_REASON, UNIT_ROWS, UNIT_TOTAL, BOUNDARY, ROADMAP, WHY, FOOTNOTE,
  type Bi, type Price as PriceT, type PlusPlanId,
} from './pricing-data';

/** 섹션 앵커가 TopBar(56px) + 미니 내비(~48px) 아래에 멈추도록 */
const SCROLL_MT = 'scroll-mt-[108px]';
const CPM_MAX = 10000;

/** KO 는 ₩, EN 은 $ 를 크게 — 다른 통화는 작은 회색 */
function Price({ p, size = 'md', className }: { p: PriceT; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const main = lang === 'en' ? p.usd : p.krw;
  const alt = lang === 'en' ? p.krw : p.usd;
  const sz = { sm: 'text-[14px]', md: 'text-[18px]', lg: 'text-[26px]' }[size];
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 flex-wrap', className)}>
      <b className={cn('font-extrabold text-primary tabular-nums', sz)}>{main}</b>
      <span className="text-[11px] text-ink-3 tabular-nums">{alt}</span>
    </span>
  );
}

function SectionHead({ letter, icon, title, subtitle, right }: { letter: string; icon: ReactNode; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <span className="h-9 w-9 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-ink-3 tracking-wide">{letter}</div>
        <h2 className="font-display text-[19px] font-bold text-ink leading-tight">{title}</h2>
        {subtitle && <p className="text-[12px] text-ink-2 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** "왜 이 가격인가" — 투자자용 근거 상자 */
function Reason({ items }: { items: Bi[] }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3.5 mt-3">
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink-2 mb-1.5"><Lightbulb size={14} className="text-gold" />{t('가격 근거')}</div>
      <ul className="space-y-1.5">{items.map((r, i) => <li key={i} className="text-[12.5px] text-ink-2 leading-relaxed flex gap-2"><span className="text-ink-3 shrink-0">·</span><span>{L(r)}</span></li>)}</ul>
    </div>
  );
}

function Cell({ v, strong }: { v: string; strong?: boolean }) {
  if (v === '✓') return <span className="inline-flex justify-center"><span className="h-5 w-5 rounded-full bg-mint-soft text-mint grid place-items-center"><Check size={12} /></span></span>;
  if (v === '—') return <span className="text-ink-3">—</span>;
  return <span className={cn(strong && 'text-primary font-bold')}>{v}</span>;
}

/** 단순 div 그리드 표 — 첫 열은 왼쪽 정렬, 나머지는 가운데 */
function Table({ head, rows, cols = 'grid-cols-[1.7fr_1fr_1fr]', strongLast }: { head: string[]; rows: string[][]; cols?: string; strongLast?: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className={cn('grid text-[11px] font-bold text-ink-3 bg-surface-2 px-3.5 py-2', cols)}>{head.map((h, i) => <span key={i} className={i > 0 ? 'text-center' : ''}>{h}</span>)}</div>
      {rows.map((r, i) => (
        <div key={i} className={cn('grid px-3.5 py-2.5 text-[12.5px] border-t border-line items-center gap-1', cols)}>
          {r.map((c, j) => <span key={j} className={cn(j === 0 ? 'font-semibold text-ink pr-1 leading-snug' : 'text-center text-ink-2')}><Cell v={c} strong={strongLast && j === r.length - 1} /></span>)}
        </div>
      ))}
    </div>
  );
}

/** Pricing & business model — 투자자용 랜딩 페이지 (앱 셸 안, 모의 결제) */
export function PricingPage() {
  const nav = useNavigate();
  const v = useViewer();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const [planId, setPlanId] = useState<PlusPlanId>('semester');
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(SECTIONS[0].id);
  const navRef = useRef<HTMLDivElement>(null);

  // 스크롤 컨테이너는 window 가 아니라 #scroll-root — 현재 섹션을 추적해 칩을 켠다
  useEffect(() => {
    const root = document.getElementById('scroll-root');
    if (!root) return;
    const onScroll = () => {
      const limit = root.getBoundingClientRect().top + 120;
      let cur = SECTIONS[0].id;
      for (const s of SECTIONS) { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top <= limit) cur = s.id; }
      setActive(cur);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => root.removeEventListener('scroll', onScroll);
  }, []);
  // 켜진 칩이 미니 내비 안에서 보이도록 가로 스크롤
  useEffect(() => {
    const bar = navRef.current; const el = bar?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (bar && el) bar.scrollTo({ left: Math.max(0, el.offsetLeft - 16), behavior: 'smooth' });
  }, [active]);

  if (status === 'loading' || !v.me) return <div><TopBar back title={t('과금 구조')} /><CardSkeleton /></div>;
  if (status === 'error') return <div><TopBar back title={t('과금 구조')} /><ErrorState message={error ?? undefined} onRetry={init} /></div>;
  const me = v.me;
  const isPlus = me.plan === 'plus';
  const plan = PLUS_PLANS.find((p) => p.id === planId) ?? PLUS_PLANS[0];
  const en = lang === 'en';

  const demo = () => showToast(t('데모 — 실제 결제는 없어요'));
  const subscribe = async () => {
    setBusy(true);
    try { await run(() => api.users.setPlan(me.id, 'plus'), t('AroundU+ 시작!')); } catch { /* toast */ } finally { setBusy(false); }
  };
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const sec = (i: number) => SECTIONS[i];

  return (
    <div className="min-h-full pb-10">
      <TopBar back title={t('과금 구조')} />

      {/* Hero */}
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-1.5 mb-2"><Tag tone="gold" className="h-5">{t('투자자용')}</Tag><Tag className="h-5">{t('출시 제안가')}</Tag></div>
        <h1 className="font-display text-[24px] font-bold text-ink leading-tight">{t('가격과 비즈니스 모델')}</h1>
        <p className="text-[13px] text-ink-2 mt-1.5 leading-relaxed">
          {en ? 'Start with your university. Expand your circle. The trusted core is free; revenue comes from expansion, reach and institutions — and every price below comes with its reasoning.'
              : '학교에서 시작해 서클을 넓히세요. 믿을 수 있는 핵심은 무료, 매출은 확장·도달·기관에서 나와요. 아래 모든 가격에는 근거가 있어요.'}
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { big: en ? '$5.99' : '₩7,900', small: en ? 'AroundU+ / mo · ₩7,900' : 'AroundU+ / 월 · $5.99' },
            { big: '4%', small: en ? 'MAU → Plus assumed' : 'MAU 중 Plus 전환 가정' },
            { big: en ? '≈ ₩4.7M' : '≈ ₩4.7M', small: en ? 'per campus / month (≈ $3,500)' : '캠퍼스당 월 (≈ $3,500)' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl bg-primary-soft px-3 py-2.5"><div className="font-display text-[17px] font-extrabold text-ink tabular-nums leading-tight">{s.big}</div><div className="text-[10.5px] text-ink-2 mt-0.5 leading-snug">{s.small}</div></div>
          ))}
        </div>
      </div>

      {/* Sticky mini nav */}
      <div ref={navRef} className="sticky top-14 z-20 bg-bg/90 backdrop-blur border-b border-line/60 flex gap-1.5 overflow-x-auto hide-scrollbar px-4 py-2">
        {SECTIONS.map((s) => <span key={s.id} data-id={s.id} className="shrink-0"><Chip size="sm" active={active === s.id} onClick={() => jump(s.id)}>{s.letter !== '0' && <b className="opacity-70">{s.letter}</b>}{L(s.label)}</Chip></span>)}
      </div>

      <div className="px-4 pt-5 space-y-9">
        {/* 0. Principle */}
        <section id={sec(0).id} className={SCROLL_MT}>
          <SectionHead letter="0" icon={<ShieldCheck size={18} />} title={t('원칙')} subtitle={en ? 'The trusted core stays free. We charge for expansion, reach and institutional access.' : '믿을 수 있는 핵심은 무료. 확장·도달·기관 접근에만 과금해요.'} />
          <div className="card p-4">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-mint mb-2"><Lock size={13} />{t('무료 핵심')}<Tag tone="mint" className="h-5 ml-auto">{t('영원히 무료')}</Tag></div>
            <div className="flex flex-wrap gap-1.5">{FREE_CORE.map((f) => <span key={f.en} className="inline-flex items-center gap-1 rounded-full bg-mint-soft text-mint px-2.5 h-7 text-[12px] font-semibold"><Check size={12} />{L(f)}</span>)}</div>
          </div>
          <div className="text-[12px] font-bold text-ink-3 mt-4 mb-2">{t('수익원')}</div>
          <div className="space-y-2">
            {REVENUE_STREAMS.map((r) => (
              <div key={r.key} className="card p-3.5 flex gap-3">
                <span className="h-9 w-9 rounded-xl bg-accent-soft text-ink font-display text-[15px] font-extrabold grid place-items-center shrink-0">{r.key}</span>
                <div className="min-w-0 flex-1"><b className="text-[14px] block">{L(r.title)}</b><span className="text-[12px] text-ink-2">{L(r.desc)}</span><div className="mt-1.5"><Tag tone="primary" className="h-5">{L(r.product)}</Tag></div></div>
              </div>
            ))}
          </div>
        </section>

        {/* A. AroundU+ */}
        <section id={sec(1).id} className={SCROLL_MT}>
          <SectionHead letter="A" icon={<Sparkles size={18} />} title="AroundU+" subtitle={en ? 'Consumer subscription — the only recurring consumer revenue.' : '소비자 구독 — 유일한 반복 소비자 매출.'} right={isPlus ? <Tag tone="mint" className="h-6">{t('이미 AroundU+ 사용 중')}</Tag> : undefined} />
          <div className="text-[12px] font-bold text-ink-3 mb-2">{t('플랜 선택')}</div>
          <div className="grid grid-cols-3 gap-2">
            {PLUS_PLANS.map((p) => { const on = planId === p.id; return (
              <button key={p.id} onClick={() => setPlanId(p.id)} className={cn('relative rounded-2xl border-2 p-3 text-left press', on ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
                {p.recommended && <Tag tone="gold" className="absolute -top-2.5 left-2 h-5 text-[10px] px-1.5">{t('추천 플랜')}</Tag>}
                <div className="text-[12px] font-bold text-ink-3 mt-0.5">{L(p.name)}</div>
                {p.sub && <div className="text-[10.5px] text-ink-3">{L(p.sub)}</div>}
                <div className="mt-1 text-[17px] font-extrabold text-primary tabular-nums leading-tight">{en ? p.price.usd : p.price.krw}<span className="text-[10.5px] font-medium text-ink-3">{L(p.per)}</span></div>
                <div className="text-[10.5px] text-ink-3 tabular-nums">{en ? p.price.krw : p.price.usd}</div>
                {p.equiv && p.save && <div className="mt-1 text-[10.5px] font-semibold text-primary tabular-nums">{en ? p.equiv.usd : p.equiv.krw} · {en ? p.save.usd : p.save.krw}</div>}
              </button>
            ); })}
          </div>
          <div className="card p-4 mt-3">
            <div className="flex items-baseline justify-between gap-2"><b className="text-[15px]">{L(plan.name)}{plan.sub ? ` · ${L(plan.sub)}` : ''}</b><Price p={plan.price} /></div>
            {plan.equiv && plan.save && <div className="text-[12px] text-ink-2 mt-0.5 tabular-nums">{en ? plan.equiv.usd : plan.equiv.krw} · {en ? plan.equiv.krw : plan.equiv.usd} <Tag tone="primary" className="h-5 ml-1">{en ? plan.save.usd : plan.save.krw}</Tag></div>}
            <p className="text-[12.5px] text-ink-2 mt-2 leading-relaxed">{L(plan.why)}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">{PLUS_NOTES.map((n) => <span key={n.en} className="inline-flex items-center gap-1 rounded-full bg-surface-2 text-ink-2 px-2.5 h-6 text-[11px] font-semibold"><Check size={11} className="text-mint" />{L(n)}</span>)}</div>
            {isPlus
              ? <Button full size="lg" variant="outline" className="mt-4" onClick={() => nav('/settings')}>{t('설정에서 관리')}</Button>
              : <Button full size="lg" className="mt-4" loading={busy} icon={<Sparkles size={16} />} onClick={subscribe}>{t('7일 무료 체험 시작')}</Button>}
            <p className="mt-2 text-center text-[11px] text-ink-3">{t('데모 — 실제 결제는 없어요')}</p>
          </div>
          <div className="text-[12px] font-bold text-ink-3 mt-4 mb-2">{en ? 'Free vs Plus' : '무료 vs Plus'}</div>
          <Table head={[t('기능'), t('무료'), 'AroundU+']} rows={PLUS_PERKS.map((p) => [L(p.feature), L(p.free), L(p.plus)])} strongLast />
          <div className="card p-4 mt-3">
            <div className="text-[12px] font-bold text-ink-2 mb-2">{en ? 'Monthly price anchors (USD)' : '월 요금 앵커 (USD)'}</div>
            <div className="space-y-1.5">
              {PRICE_ANCHORS.map((a) => (
                <div key={a.name} className="flex items-center gap-2 text-[11.5px]">
                  <span className={cn('w-[120px] shrink-0 truncate', a.kind === 'us' ? 'font-bold text-primary' : 'text-ink-2')}>{a.name}</span>
                  <div className="flex-1 h-4 rounded-full bg-surface-2 overflow-hidden"><div className={cn('h-full rounded-full', a.kind === 'us' ? 'bg-primary' : a.kind === 'dating' ? 'bg-blush' : 'bg-accent')} style={{ width: `${Math.max(8, (a.usd / 40) * 100)}%` }} /></div>
                  <span className={cn('w-[48px] text-right tabular-nums', a.kind === 'us' ? 'font-bold text-primary' : 'text-ink-3')}>${a.usd.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[10.5px] text-ink-3">
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-blush" />{en ? 'Dating (romantic intent)' : '데이팅 (연애 의도)'}</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-accent" />{en ? 'Student media' : '학생 미디어 구독'}</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-primary" />AroundU+</span>
            </div>
          </div>
          <Reason items={PLUS_REASON} />
        </section>

        {/* B. Boosts */}
        <section id={sec(2).id} className={SCROLL_MT}>
          <SectionHead letter="B" icon={<Zap size={18} />} title={en ? 'Boosts' : '부스트'} subtitle={en ? 'Individual, one-off. Buy reach without subscribing.' : '개인 1회성. 구독 없이 도달만 살 수 있어요.'} />
          <div className="space-y-3">
            {BOOSTS.map((g) => (
              <div key={g.group.en} className="card overflow-hidden">
                <div className="px-4 pt-3.5 pb-2"><b className="text-[14px] block">{L(g.group)}</b>{g.meta && <span className="text-[12px] text-ink-2">{L(g.meta)}</span>}</div>
                <div className="divide-y divide-line border-t border-line">
                  {g.items.map((it) => (
                    <div key={it.name.en} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0"><span className="text-[13px] font-semibold block">{L(it.name)}</span>{it.desc && <span className="text-[11.5px] text-ink-3">{L(it.desc)}</span>}</div>
                      <Price p={it.price} size="sm" className="justify-end text-right" />{it.unit && <span className="text-[11px] text-ink-3 -ml-1">{L(it.unit)}</span>}
                      <Button size="sm" variant="outline" onClick={demo}>{t('구매')}</Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Reason items={BOOST_REASON} />
        </section>

        {/* C. Promoted Opportunity */}
        <section id={sec(3).id} className={SCROLL_MT}>
          <SectionHead letter="C" icon={<Megaphone size={18} />} title={en ? 'Promoted Opportunity' : '프로모티드 기회'} subtitle={en ? 'Companies, labs and programs reaching verified students.' : '기업·연구실·프로그램이 인증된 학생에게.'} />
          <div className="space-y-2">
            {PROMOTED.map((p) => (
              <div key={p.name.en} className={cn('relative rounded-[24px] border bg-white p-4 flex items-center gap-3', p.recommended ? 'border-primary' : 'border-line')}>
                {p.recommended && <Tag tone="gold" className="absolute -top-2.5 left-4 h-5 text-[10px] px-1.5">{t('추천 플랜')}</Tag>}
                <div className="flex-1 min-w-0"><b className="text-[14px] block">{L(p.name)}</b><span className="text-[12px] text-ink-2">{L(p.scope)}</span></div>
                <div className="flex flex-col items-end gap-1.5"><Price p={p.price} className="justify-end" /><Button size="sm" onClick={demo}>{t('구매')}</Button></div>
              </div>
            ))}
          </div>
          <div className="card p-4 mt-3">
            <div className="text-[12px] font-bold text-ink-2 mb-2">{t('추가 옵션')}</div>
            <div className="divide-y divide-line">{PROMOTED_ADDONS.map((a) => <div key={a.name.en} className="flex items-center justify-between py-2 text-[13px]"><span>{L(a.name)}</span><b className="text-primary tabular-nums">{L(a.price)}</b></div>)}</div>
          </div>
          <div className="card p-4 mt-3">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink-2 mb-2"><Calculator size={14} className="text-primary" />{t('CPM 검증')}</div>
            <div className="rounded-2xl bg-surface-2 px-3.5 py-3 text-[12.5px] tabular-nums leading-relaxed">
              <div><span className="text-ink-2">3,000 DAU × 5 {en ? 'imp/day' : '노출/일'} × 7 {en ? 'days' : '일'}</span> = <b>105,000 {en ? 'impressions' : '노출'}</b></div>
              <div><span className="text-ink-2">₩100,000 ÷ 105k × 1,000</span> ≈ <b className="text-primary">₩950 CPM</b></div>
            </div>
            <div className="space-y-2 mt-3">
              {CPM_ROWS.map((r) => (
                <div key={r.name.en} className="flex items-center gap-2 text-[11.5px]">
                  <span className={cn('w-[120px] shrink-0 truncate', r.us ? 'font-bold text-primary' : 'text-ink-2')}>{L(r.name)}</span>
                  <div className="flex-1 h-4 rounded-full bg-surface-2 overflow-hidden relative">
                    <div className={cn('absolute inset-y-0 left-0 rounded-full', r.us ? 'bg-primary' : 'bg-ink-3/45')} style={{ width: `${Math.max(6, (r.lo / CPM_MAX) * 100)}%` }} />
                    {r.hi > r.lo && <div className="absolute inset-y-0 bg-ink-3/20" style={{ left: `${(r.lo / CPM_MAX) * 100}%`, width: `${((r.hi - r.lo) / CPM_MAX) * 100}%` }} />}
                  </div>
                  <span className={cn('w-[86px] text-right tabular-nums', r.us ? 'font-bold text-primary' : 'text-ink-3')}>{r.lo === r.hi ? `₩${r.lo.toLocaleString()}` : `₩${r.lo.toLocaleString()}–${r.hi.toLocaleString()}`}</span>
                </div>
              ))}
            </div>
            <div className="text-[10.5px] text-ink-3 mt-2">{en ? 'CPM = cost per 1,000 impressions. Everytime and Instagram figures are public rate-card ranges.' : 'CPM = 노출 1,000회당 비용. 에브리타임·Instagram 수치는 공개 단가표 범위.'}</div>
          </div>
          <Reason items={PROMOTED_REASON} />
        </section>

        {/* D. Sponsored Experience */}
        <section id={sec(4).id} className={SCROLL_MT}>
          <SectionHead letter="D" icon={<Handshake size={18} />} title={en ? 'Sponsored Experience' : '스폰서 경험'} subtitle={en ? 'A company or institution runs a Meet. We bring the right students.' : '기업·기관이 Meet 를 열고, 우리는 맞는 학생을 데려와요.'} />
          <div className="card divide-y divide-line overflow-hidden">
            {EXPERIENCES.map((x) => (
              <div key={x.name.en} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><b className="text-[14px] block">{L(x.name)}</b><span className="text-[12px] text-ink-2">{L(x.who)}</span></div><Price p={x.price} size="sm" className="justify-end text-right shrink-0" /></div>
                <div className="mt-2"><Button size="sm" variant="outline" onClick={demo}>{t('문의하기')}</Button></div>
              </div>
            ))}
          </div>
          <div className="card p-4 mt-3">
            <div className="text-[12px] font-bold text-ink-2 mb-2">{t('포함 내용')}</div>
            <ul className="space-y-1.5">{EXPERIENCE_INCLUDES.map((i) => <li key={i.en} className="flex items-center gap-2.5 text-[13px]"><span className="h-5 w-5 rounded-full bg-accent-soft text-primary grid place-items-center shrink-0"><Check size={12} /></span>{L(i)}</li>)}</ul>
          </div>
          <Reason items={EXPERIENCE_REASON} />
        </section>

        {/* E. Sponsored Posts & Partner Deals */}
        <section id={sec(5).id} className={SCROLL_MT}>
          <SectionHead letter="E" icon={<Newspaper size={18} />} title={en ? 'Sponsored Posts & Partner Deals' : '스폰서 글 & 파트너 딜'} subtitle={en ? 'Native, labeled, scarce.' : '네이티브 · 라벨 · 희소.'} right={<Tag tone="primary" className="h-6 shrink-0">{t('배너 광고 없음')}</Tag>} />
          <div className="space-y-2">
            {SPONSORED.map((s) => (
              <div key={s.name.en} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><b className="text-[14px] block">{L(s.name)}</b><span className="text-[12px] text-ink-2">{L(s.desc)}</span></div>
                  <div className="text-right shrink-0"><Price p={s.price} className="justify-end" /><div className="text-[11px] text-ink-3 -mt-0.5">{L(s.unit)}</div></div>
                </div>
                {s.rule && <div className="mt-2 rounded-xl bg-gold-soft px-3 py-2 text-[11.5px] text-[#B57A0E] font-semibold">{L(s.rule)}</div>}
                <div className="mt-3"><Button size="sm" onClick={demo}>{t('구매')}</Button></div>
              </div>
            ))}
          </div>
          <Reason items={SPONSORED_REASON} />
        </section>

        {/* F. Unit economics */}
        <section id={sec(6).id} className={SCROLL_MT}>
          <SectionHead letter="F" icon={<Calculator size={18} />} title={en ? 'Unit economics' : '유닛 이코노믹스'} subtitle={en ? 'One campus with 5,000 MAU, one month.' : '캠퍼스 하나 · MAU 5,000 · 한 달.'} right={<Tag tone="gold" className="h-6 shrink-0">{t('예시')}</Tag>} />
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1.6fr_1fr] text-[11px] font-bold text-ink-3 bg-surface-2 px-3.5 py-2"><span>{en ? 'Line' : '항목'}</span><span className="text-right">{en ? 'Monthly' : '월'}</span></div>
            {UNIT_ROWS.map((r) => (
              <div key={r.name.en} className="grid grid-cols-[1.6fr_1fr] items-center px-3.5 py-2.5 border-t border-line">
                <div className="min-w-0"><b className="text-[13px] block">{L(r.name)}</b><span className="text-[11px] text-ink-3 tabular-nums">{L(r.calc)}</span></div>
                <div className="text-right"><b className="text-[13px] text-primary tabular-nums block">{r.krw}</b><span className="text-[10.5px] text-ink-3 tabular-nums">{r.usd}</span></div>
              </div>
            ))}
            <div className="grid grid-cols-[1.6fr_1fr] items-center px-3.5 py-3 border-t-2 border-line bg-surface-2">
              <b className="text-[13px]">{t('캠퍼스당 월 매출')}</b>
              <div className="text-right"><b className="font-display text-[18px] text-ink tabular-nums block leading-tight">{UNIT_TOTAL.perCampus.krw}</b><span className="text-[10.5px] text-ink-3 tabular-nums">{UNIT_TOTAL.perCampus.usd}</span></div>
            </div>
            <div className="grid grid-cols-[1.6fr_1fr] items-center px-3.5 py-3 border-t border-line bg-primary-soft">
              <div><b className="text-[13px] block">{t('20개 캠퍼스')}</b><span className="text-[11px] text-ink-2">{en ? '≈ ₩4.7M × 20' : '≈ ₩4.7M × 20'}</span></div>
              <div className="text-right"><b className="font-display text-[20px] text-ink tabular-nums block leading-tight">{UNIT_TOTAL.campuses20.krw}</b><span className="text-[10.5px] text-ink-2 tabular-nums">{UNIT_TOTAL.campuses20.usd} / {en ? 'month' : '월'}</span></div>
            </div>
          </div>
          <div className="flex items-start gap-2 mt-2.5 text-[11px] text-ink-3"><Scale size={13} className="shrink-0 mt-0.5" /><span>{t('가정이며 예측이 아니에요')} · {en ? 'FX ≈ ₩1,340 / $. Before store fees and VAT. Boosts are an order-of-magnitude estimate.' : 'FX ≈ ₩1,340 / $. 스토어 수수료·VAT 전. 부스트는 자릿수 추정.'}</span></div>
        </section>

        {/* G. Free vs Premium boundary */}
        <section id={sec(7).id} className={SCROLL_MT}>
          <SectionHead letter="G" icon={<Scale size={18} />} title={en ? 'Free vs Premium boundary' : '무료 vs 프리미엄 경계'} subtitle={en ? 'What never gets a paywall, and what does.' : '절대 페이월이 없는 것, 있는 것.'} />
          <Table head={[t('기능'), t('무료'), t('프리미엄')]} rows={BOUNDARY.map((b) => [L(b.feature), L(b.free), L(b.premium)])} strongLast />
        </section>

        {/* H. Roadmap */}
        <section id={sec(8).id} className={SCROLL_MT}>
          <SectionHead letter="H" icon={<Map size={18} />} title={en ? 'Roadmap' : '로드맵'} subtitle={en ? 'Revenue lines switch on as density grows.' : '밀도가 생기는 순서대로 수익원을 켜요.'} />
          <div className="relative pl-5">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-line" />
            <div className="space-y-3">
              {ROADMAP.map((r, i) => (
                <div key={r.phase.en} className="relative">
                  <span className={cn('absolute -left-5 top-4 h-[15px] w-[15px] rounded-full border-2 border-white', i === 0 ? 'bg-primary' : 'bg-accent')} />
                  <div className="card p-4">
                    <div className="flex items-center justify-between gap-2"><b className="text-[14px]">{L(r.phase)}</b><span className="text-[11px] text-ink-3">{L(r.when)}</span></div>
                    <div className="flex flex-wrap gap-1.5 mt-2">{r.items.map((it) => <Tag key={it.en} tone={i === 0 ? 'primary' : 'accent'} className="h-6">{L(it)}</Tag>)}</div>
                    <p className="text-[12px] text-ink-2 mt-2">{L(r.why)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* I. Why this works */}
        <section id={sec(9).id} className={SCROLL_MT}>
          <SectionHead letter="I" icon={<Rocket size={18} />} title={en ? 'Why this works' : '왜 이 모델이 되는가'} />
          <div className="space-y-2">
            {WHY.map((w, i) => (
              <div key={w.title.en} className="card p-4 flex gap-3">
                <span className="h-8 w-8 rounded-full bg-primary text-white font-display text-[14px] font-extrabold grid place-items-center shrink-0">{i + 1}</span>
                <div className="min-w-0"><b className="text-[14px] block">{L(w.title)}</b><p className="text-[12.5px] text-ink-2 mt-0.5 leading-relaxed">{L(w.desc)}</p></div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button full variant="outline" icon={<ArrowUp size={15} />} onClick={() => jump(sec(1).id)}>AroundU+</Button>
            <Button full onClick={() => nav('/people/beyond')}>{t('서클을 넓히세요')}</Button>
          </div>
        </section>

        <p className="text-[11px] text-ink-3 leading-relaxed border-t border-line pt-4">{L(FOOTNOTE)}</p>
      </div>
    </div>
  );
}
