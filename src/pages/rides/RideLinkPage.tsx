import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui';
import { SampleTag } from '@/components/ui/SampleTag';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { setReturnTo } from '@/lib/returnTo';
import { clock, dayLabel, RIDE_KIND_EMOJI, RIDE_KIND_LABELS, type RideTeaser } from '@core/lib/rides';
import { lang } from '@core/i18n';

const L = (en: string, ko: string) => (lang === 'en' ? en : ko);

/**
 * /r/<id> — the shareable link. Signed in → the ride itself. Signed out → a teaser
 * (destination, time, seats, host first name) and "sign in with your school account to join".
 * Pickup spot, note and riders are never shown here — the server doesn't even send them.
 */
export function RideLinkPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const status = useAppStore((s) => s.status);
  const me = useAppStore((s) => s.currentUserId);
  const [teaser, setTeaser] = useState<RideTeaser | null | undefined>(undefined);
  const signedOut = status === 'ready' && !me;

  useEffect(() => {
    if (!signedOut) return;
    let alive = true;
    api.rides.teaser(id).then((x) => { if (alive) setTeaser(x); }).catch(() => { if (alive) setTeaser(null); });
    return () => { alive = false; };
  }, [id, signedOut]);

  if (me) return <Navigate to={`/rides/${id}`} replace />;
  const signIn = () => { setReturnTo(`/rides/${id}`); nav('/welcome'); };
  const seats = teaser ? (teaser.seatsLeft === null ? L('Looking for a ride', '탈 차를 찾아요') : teaser.seatsLeft === 0 ? L('Full', '마감') : L(`${teaser.seatsLeft} seat${teaser.seatsLeft === 1 ? '' : 's'} left`, `${teaser.seatsLeft}자리 남음`)) : '';

  return (
    <div className="min-h-full bg-bg px-5 pt-10 pb-10 flex flex-col">
      <div className="flex items-center gap-2 text-[15px] font-extrabold text-ink"><span className="h-8 w-8 rounded-xl bg-primary text-on-primary grid place-items-center text-[15px]">📍</span>Lumi</div>
      {teaser === undefined ? (
        <div className="mt-10 h-48 rounded-[26px] bg-surface-2 animate-pulse" />
      ) : teaser === null ? (
        <div className="mt-10">
          <h1 className="font-display text-[26px] font-extrabold text-ink leading-tight">{L("This ride isn't available anymore", '더 이상 볼 수 없는 라이드예요')}</h1>
          <p className="text-[14px] text-ink-2 mt-2">{L('It may have been cancelled. Sign in to find other rides from your campus.', '취소됐을 수 있어요. 로그인하면 우리 학교의 다른 라이드를 찾을 수 있어요.')}</p>
          <Button full size="lg" className="mt-6" onClick={() => { setReturnTo('/rides'); nav('/welcome'); }}>{L('Sign in with your school email', '학교 이메일로 로그인')}</Button>
        </div>
      ) : (
        <>
          <div className="mt-8 text-[11.5px] font-extrabold tracking-[0.12em] uppercase text-primary v2:text-pink-300">{teaser.schoolName ? `${teaser.schoolName} · ` : ''}{L('Ride share', '같이 타기')}</div>
          <h1 className="font-display text-[30px] leading-[1.08] font-extrabold text-ink mt-2">{teaser.sample && <SampleTag />}{teaser.kind === 'looking' ? L(`Looking for a ride to ${teaser.to}`, `${teaser.to} 가는 차 찾아요`) : L(`Ride to ${teaser.to}`, `${teaser.to} 같이 타기`)}</h1>
          <div className="card mt-5 p-4 space-y-3">
            <div className="flex items-center justify-between"><span className="text-[13px] text-ink-3">{L('When', '언제')}</span><b className="text-[15px] text-ink">{dayLabel(teaser.date)} · {clock(teaser.start)}{teaser.end !== teaser.start ? `–${clock(teaser.end)}` : ''}</b></div>
            <div className="flex items-center justify-between"><span className="text-[13px] text-ink-3">{L('Seats', '자리')}</span><b className="text-[15px] text-ink">{teaser.status === 'closed' ? L('Closed', '모집 마감') : seats}</b></div>
            <div className="flex items-center justify-between"><span className="text-[13px] text-ink-3">{L('Posted by', '올린 사람')}</span><b className="text-[15px] text-ink">{teaser.hostFirstName} · {RIDE_KIND_EMOJI[teaser.kind]} {RIDE_KIND_LABELS[teaser.kind]}</b></div>
          </div>
          <div className="mt-3 rounded-[20px] bg-surface-2 p-4 flex gap-3">
            <Lock size={18} className="text-ink-2 shrink-0 mt-0.5" />
            <p className="text-[13px] text-ink-2 leading-snug">{L(`Students only. Sign in with your ${teaser.schoolName || 'school'} email to see the pickup spot, who's riding and the cost split — and to join.`, `학생 전용이에요. ${teaser.schoolName || '학교'} 이메일로 로그인하면 탑승 장소, 함께 타는 사람, 비용 나눔을 보고 함께 탈 수 있어요.`)}</p>
          </div>
          <Button full size="lg" className="mt-6" onClick={signIn}>{L('Sign in to join', '로그인하고 같이 타기')}</Button>
          <p className="mt-4 flex gap-2 text-[12px] text-ink-3 leading-snug"><ShieldCheck size={15} className="shrink-0 text-mint" />{L('Rides meet at public campus spots and only verified students can join.', '캠퍼스의 공개된 장소에서 만나고, 인증된 학생만 탈 수 있어요.')}</p>
        </>
      )}
    </div>
  );
}
