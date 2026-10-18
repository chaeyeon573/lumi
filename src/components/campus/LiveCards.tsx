import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Utensils, Star, ChevronRight } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { fmtClock } from '@core/lib/campusclock';
import { crowdLevel, CROWD_LABELS } from '@core/lib/gym';
import { agoLabel, campusLive, type CampusNow } from '@/lib/campusLive';

/** Discover 맨 위 작은 카드 두 장 — 지금 연 식당 + 메뉴 하나 · 체육관 % (학교가 지원할 때만) */
export function LiveCards({ className }: { className?: string }) {
  const nav = useNavigate();
  const [now, setNow] = useState<CampusNow | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => campusLive.now().then((r) => { if (alive) setNow(r); }).catch(() => { /* 서버 없음·오류 — 카드를 숨긴다 */ });
    load(); const h = setInterval(load, 120_000);
    return () => { alive = false; clearInterval(h); };
  }, []);
  if (!now || (!now.dining && !now.gym)) return null;
  const d = now.dining; const g = now.gym;
  const gymMain = g?.spaces.find((s) => /rsf|weight/i.test(s.name)) ?? g?.spaces[0];
  const live = gymMain?.status === 'live' && gymMain.percent != null;
  // 운영 시간을 알 때 문 닫은 시간이면 0% 를 ‘Quiet’ 로 보이지 않는다 — “Closed · opens 8 AM” / “Closed for today”
  const closed = gymMain?.open === false;
  const opensAt = closed && gymMain?.hours && Date.now() < Date.parse(gymMain.hours.open) ? new Date(gymMain.hours.open).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).replace(':00', '') : null;
  return (
    <div className={cn('grid grid-cols-2 gap-2.5', className)}>
      {d && (
        <button onClick={() => nav(d.highlight ? `/dining?loc=${encodeURIComponent(d.highlight.locationId)}` : '/dining')} className="card rounded-[20px] p-3.5 text-left press flex flex-col min-h-[124px]" aria-label="Dining now">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3"><Utensils size={13} />Dining now<ChevronRight size={13} className="ml-auto" /></span>
          {!d.available ? <span className="mt-2 text-[13px] text-ink-3">Menus unavailable right now</span> : (
            <>
              <span className="mt-1.5 text-[14px] font-bold leading-snug line-clamp-2">
                {d.open?.length ? `${d.open.slice(0, 2).map((o) => o.name).join(', ')}${d.open.length > 2 ? ` +${d.open.length - 2}` : ''} open` : d.next ? `${d.next.name} opens ${fmtClock(d.next.opensAt)}` : 'Closed for today'}
              </span>
              {d.highlight && <span className="mt-auto pt-1.5 text-[12px] text-ink-2 leading-snug line-clamp-2">{d.highlight.favorite && <Star size={11} className="inline -mt-0.5 mr-0.5 fill-current text-[#B57A0E] v2:text-lime-400" />}<b className="font-semibold">{d.highlight.dish}</b> · {d.highlight.location}, {d.highlight.meal.toLowerCase()}</span>}
            </>
          )}
        </button>
      )}
      {g && (
        <button onClick={() => nav('/gym')} className="card rounded-[20px] p-3.5 text-left press flex flex-col min-h-[124px]" aria-label="Gym now">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3"><Dumbbell size={13} />Gym now<ChevronRight size={13} className="ml-auto" /></span>
          {gymMain ? (
            <>
              <span className="mt-1 text-[12px] text-ink-2 truncate">{gymMain.name}</span>
              {closed ? <span className="font-display text-[24px] font-bold leading-none mt-1.5">Closed</span>
                : live ? <span className="font-display text-[30px] font-bold leading-none mt-1 tabular-nums">{gymMain.percent}%</span> : <span className="mt-1 text-[14px] font-bold text-ink-3">Unavailable</span>}
              <span className="mt-auto pt-1.5 text-[12px] text-ink-3">{closed ? (opensAt ? `Opens ${opensAt}` : 'Closed for today') : live ? `${CROWD_LABELS[crowdLevel(gymMain.percent!)]} · ${agoLabel(gymMain.updatedAt)}` : 'Live count not readable now'}</span>
            </>
          ) : <span className="mt-2 text-[13px] text-ink-3">Crowd meter unavailable</span>}
        </button>
      )}
    </div>
  );
}
