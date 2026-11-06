import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, CalendarPlus, Compass, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '@core/api';
import { PLAN_LIMITS, PLUS_PRICE_LABEL, type CheckoutResult } from '@core/lib/plus';
import { Badge, Btn, IconTile, InfoNote, InfoRows, RowCard, cardCls } from '@/components/ha';
import { usePlus } from '@/hooks/usePlus';
import { isNativeShell } from '@/lib/native';
import { SubScreen, en } from '@/pages/profile/shared';

/**
 * Lumi+ (PDF S087) — what the extras are, the price, and one button. What Lumi+ is lives in @core/lib/plus.
 *   flag off (LUMI_PLUS unset — today): nothing is locked, the button reads "Coming soon" (disabled) and one quiet line
 *     says payments aren't open. Flag on: "Explore Lumi+" → Checkout (S088). Already a member: no button.
 * Safety never depends on Lumi+ — the third row says so and links to Privacy & safety.
 */
export function PlusPage() {
  const nav = useNavigate();
  const plus = usePlus();
  const lim = PLAN_LIMITS.plus;
  const cta = plus.active ? undefined : plus.enabled
    ? <Btn full size="lg" onClick={() => nav('/settings/plus/checkout')}>{en ? 'Explore Lumi+' : 'Lumi+ 살펴보기'}</Btn>
    : <Btn full size="lg" disabled>{en ? 'Coming soon' : '곧 열려요'}</Btn>;
  return (
    <SubScreen title="Lumi+" bigTitle={false} cta={cta}>
      <div className="flex flex-col items-center text-center pt-4 pb-7">
        <IconTile tone="lav" size={56}><Sparkles size={26} /></IconTile>
        <h1 className="ha-title mt-4 text-[34px]">Lumi+</h1>
        <p className="text-[15px] text-ink-2 mt-1.5">{en ? 'A few extras, on your terms.' : '필요한 만큼만, 몇 가지 더.'}</p>
        {plus.active
          ? <Badge tone="sel" className="mt-3">{en ? 'Lumi+ is on' : 'Lumi+ 사용 중'}</Badge>
          : <p className="text-[14px] font-semibold text-ink mt-3">{PLUS_PRICE_LABEL}</p>}
      </div>
      <div className="space-y-3">
        <RowCard tone="ice" icon={<Compass size={21} />} title={en ? 'More ways to discover' : '더 많은 찾기 조건'}
          sub={en ? 'Filter people by language, interests and communities' : '언어·관심사·커뮤니티로 사람 찾기'} onClick={() => nav('/social/people/filters')} />
        <RowCard tone="peach" icon={<Bookmark size={21} />} title={en ? 'Save what matters' : '저장한 사람 정리'}
          sub={en ? 'Folders and private notes for saved people' : '저장한 사람 폴더와 나만 보는 메모'} onClick={() => nav('/profile/saved-people')} />
        <RowCard tone="rose" icon={<CalendarPlus size={21} />} title={en ? 'Make more plans' : '더 많이 만들기'}
          sub={en ? `Up to ${lim.upcomingMeetups} upcoming meetups and ${lim.groups} groups` : `다가오는 모임 ${lim.upcomingMeetups}개, 그룹 ${lim.groups}개까지`} />
        <RowCard tone="mint" icon={<ShieldCheck size={21} />} title={en ? 'Your privacy stays yours' : '개인정보는 그대로'}
          sub={en ? 'Safety never depends on a paid plan' : '안전 기능은 유료 플랜과 상관없어요'} onClick={() => nav('/settings/safety')} />
      </div>
      <InfoNote className="mt-4">{en ? 'Pricing and terms are shown before any purchase.' : '결제 전에 가격과 약관을 먼저 보여드려요.'}</InfoNote>
      {!plus.enabled && plus.ready && (
        <p className="mt-3 text-[13px] text-ink-3 leading-snug">{en ? 'Payments aren’t open yet — for now these extras are free for everyone.' : '아직 결제를 받지 않아요 — 지금은 모두 무료로 쓸 수 있어요.'}</p>
      )}
    </SubScreen>
  );
}

/**
 * Checkout (PDF S088) — selected plan, payment method, cancel terms, Continue Securely.
 * There is no payment provider yet: Continue Securely asks the server, which answers 'unavailable' — the screen says
 * so and that nothing was charged. It never shows a success without a provider's confirmation (docs/LUMI_PLUS.md).
 */
export function CheckoutPage() {
  const nav = useNavigate();
  const plus = usePlus();
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const platform = isNativeShell() ? 'ios' : 'web';
  const go = async () => {
    setBusy(true); setAnswer(null);
    try {
      const r: CheckoutResult = await api.plus.checkout(platform);
      if (r.status === 'redirect') { window.location.assign(r.url); return; }
      // 'native' (Apple IAP) needs the app's StoreKit bridge, which doesn't exist yet — say so rather than pretend
      setAnswer(r.status === 'unavailable' ? r.message : (en ? 'Payments aren’t open yet. Nothing was charged.' : '아직 결제를 받지 않아요. 결제된 것은 없어요.'));
    } catch (e) {
      setAnswer(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };
  const method = !plus.payments.open
    ? (en ? 'Payments aren’t open yet' : '아직 결제를 받지 않아요')
    : platform === 'ios' ? (en ? 'Apple In-App Purchase' : 'Apple 앱 내 구입') : (en ? 'Card, through a secure checkout' : '카드 (안전한 결제 화면)');
  const cta = plus.active ? undefined : plus.enabled
    ? <Btn full size="lg" loading={busy} onClick={go}>{en ? 'Continue Securely' : '안전하게 계속'}</Btn>
    : <Btn full size="lg" disabled>{en ? 'Coming soon' : '곧 열려요'}</Btn>;
  return (
    <SubScreen title={en ? 'Checkout' : '결제'} cta={cta}>
      <div className={`${cardCls} p-4`}>
        <span className="block text-[11.5px] text-ink-3">{en ? 'Selected plan' : '고른 플랜'}</span>
        <span className="block text-[24px] font-extrabold tracking-[-0.02em] mt-0.5">Lumi+</span>
        <span className="block text-[14px] text-ink-2 mt-1">{PLUS_PRICE_LABEL} · {en ? 'renews monthly until you cancel' : '해지할 때까지 매달 갱신'}</span>
      </div>
      <InfoRows className="mt-3" rows={[
        { tone: 'ice', icon: <CreditCard size={20} />, label: en ? 'Payment' : '결제', value: en ? 'Choose a secure payment method' : '안전한 결제 수단 고르기', caption: method },
        { tone: 'mint', icon: <ShieldCheck size={20} />, label: en ? 'Your control' : '내 선택', value: en ? 'Cancel according to the shown terms' : '보여드린 약관대로 해지', caption: en ? 'See refund policy' : '환불 정책 보기', onClick: () => nav('/terms') },
      ]} />
      {plus.active && <p className="mt-4 text-[14px] text-ink-2">{en ? 'You already have Lumi+.' : '이미 Lumi+ 를 쓰고 있어요.'}</p>}
      {answer && <p role="status" className={`${cardCls} mt-4 p-4 text-[14px] text-ink-2 leading-snug`}>{answer}</p>}
      <InfoNote className="mt-4">{en ? 'Lumi+ starts only after your payment is confirmed.' : '결제가 확인된 뒤에만 Lumi+ 가 시작돼요.'}</InfoNote>
    </SubScreen>
  );
}
