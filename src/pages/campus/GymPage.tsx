import { useEffect, useState } from 'react';
import { Bell, BellRing, Clock, Dumbbell, WifiOff } from 'lucide-react';
import { lang } from '@core/i18n';
import { CampusHead, CampusSource } from './CampusSource';
import { BottomSheet } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { campusClock, fmtClock } from '@core/lib/campusclock';
import { CROWD_LABELS, DAY_SHORT, GYM_USUAL_MIN_DAYS, crowdLevel, type CrowdLevel, type GymSpaceView } from '@core/lib/gym';
import { agoLabel, campusLive, type GymAlertView, type GymResponse } from '@/lib/campusLive';
import { Badge, Btn, Chip, ChipRow, EmptyState, ErrorScreen, IconTile, LoadingCards, Switch, TextCard, cardCls, type Tone } from '@/components/ha';

const en = lang === 'en';
/** crowd level → badge tint and meter colour (tokens only) */
const LEVEL_TONE: Record<CrowdLevel, Tone> = { quiet: 'mint', moderate: 'ice', busy: 'peach', packed: 'rose' };
const LEVEL_BAR: Record<CrowdLevel, string> = { quiet: 'bg-ok', moderate: 'bg-t-ice-fg', busy: 'bg-gold', packed: 'bg-danger' };
const daysLabel = (days: number[]) => {
  const k = [...days].sort().join(',');
  return k === '1,2,3,4,5' ? 'Weekdays' : k === '0,6' ? 'Weekends' : k === '0,1,2,3,4,5,6' ? 'Every day' : days.map((d) => DAY_SHORT[d]).join(' ');
};
const hourLabel = (h: number) => (h === 0 || h === 24 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`);

/**
 * Recreation (PDF S015) — the live RSF crowd meter (owner 2026-11-05: "RSF … 꼭 넣어야 해").
 * Per space: crowd %, people / capacity, today's hourly bars with the usual line, and "tell me when it's under X%".
 * Nothing is shown as live unless the reading is fresh; the "No live occupancy" note appears only when no space is live.
 */
export function GymPage() {
  const [data, setData] = useState<GymResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<GymSpaceView | null>(null);
  const [tick, setTick] = useState(0);
  const load = () => campusLive.gym().then((r) => { setData(r); setError(null); }).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); const h = setInterval(() => { load(); setTick((x) => x + 1); }, 60_000); return () => clearInterval(h); }, []);
  const title = en ? 'Recreation' : '체육관';

  if (error && !data) return <div className="min-h-full bg-bg"><CampusHead title={title} /><ErrorScreen message={error} onRetry={load} /></div>;
  if (!data) return <div className="min-h-full bg-bg"><CampusHead title={title} /><LoadingCards count={2} className="px-4" /></div>;
  if (!data.supported) return (
    <div className="min-h-full bg-bg"><CampusHead title={title} />
      <EmptyState icon={<Dumbbell size={30} />} tone="mint" title={en ? 'Gym crowd isn’t here for your school yet' : '우리 학교 체육관 혼잡도는 아직 없어요'} sub={en ? 'Lumi shows the UC Berkeley RSF crowd meter for now.' : '지금은 UC Berkeley RSF 혼잡도만 보여요.'} />
    </div>
  );

  const anyLive = data.spaces.some((s) => s.status === 'live');
  return (
    <div className="min-h-full pb-10 bg-bg">
      <CampusHead title={title} />
      <div className="px-4 space-y-3" data-tick={tick}>
        {data.spaces.length === 0 && (
          <TextCard title={<span className="flex items-center gap-2"><WifiOff size={18} className="text-ink-3" />{en ? 'Crowd meter unavailable' : '혼잡도를 읽을 수 없어요'}</span>}>
            {en ? 'We couldn’t read the crowd meter yet. Try again in a few minutes.' : '아직 혼잡도를 읽지 못했어요. 몇 분 뒤에 다시 보세요.'}
          </TextCard>
        )}
        {data.spaces.map((s) => <SpaceCard key={s.id} s={s} alert={data.alerts.find((a) => a.displayId === s.id)} onAlert={() => setEditing(s)} />)}
        {/* S015 — 공식 출처 카드. "라이브 값 없음" 각주는 혼잡도를 실제로 못 읽을 때만 */}
        <CampusSource url={data.source?.url} label={data.source ? 'RecWell' : undefined}
          text={data.source?.attribution ?? (en ? 'Hours and facility information come from the official recreation page.' : '운영 시간과 시설 정보는 공식 페이지에서 와요.')}
          unavailableNote={anyLive ? null : (en ? 'No live occupancy is shown without a verified feed.' : '확인된 피드가 없으면 실시간 인원을 보여주지 않아요.')} />
      </div>
      <AlertSheet space={editing} alert={editing ? data.alerts.find((a) => a.displayId === editing.id) : undefined} onClose={() => setEditing(null)} onSaved={(alerts) => setData({ ...data, alerts })} />
    </div>
  );
}

function SpaceCard({ s, alert, onAlert }: { s: GymSpaceView; alert?: GymAlertView; onAlert: () => void }) {
  const live = s.status === 'live' && s.percent != null;
  const level = live ? crowdLevel(s.percent!) : null;
  // 공식 운영 시간을 알 때만 (RSF) — 닫힌 시간엔 0% 를 'Quiet' 대신 'Closed'
  const closed = s.open === false;
  const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).replace(':00', '');
  const hoursLine = s.hours ? `${en ? 'Today' : '오늘'} ${clock(s.hours.open)}–${clock(s.hours.close)}` : s.hours === null ? (en ? 'Closed today' : '오늘 휴무') : '';
  return (
    <section className={cn(cardCls, 'p-4')}>
      <div className="flex items-center gap-3">
        <IconTile tone="mint" size={40}><Dumbbell size={20} /></IconTile>
        <h2 className="flex-1 min-w-0 text-[16px] font-bold leading-snug">{s.name}</h2>
        {closed ? <Badge tone="neutral">{en ? 'Closed' : '닫힘'}</Badge> : live ? <Badge tone={LEVEL_TONE[level!]}>{CROWD_LABELS[level!]}</Badge> : <Badge tone="neutral">{en ? 'Unavailable' : '읽을 수 없음'}</Badge>}
      </div>
      {live && !closed ? (
        <>
          <div className="mt-3 flex items-end gap-2.5">
            <span className="text-[52px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">{s.percent}%</span>
            <span className="pb-1.5 text-[13.5px] text-ink-2">{s.count} / {s.capacity} {en ? 'people' : '명'}</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent} aria-label={`${s.name} ${s.percent}% full`}>
            <div className={cn('h-full rounded-full', LEVEL_BAR[level!])} style={{ width: `${Math.min(100, s.percent!)}%` }} />
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">{hoursLine && <>{hoursLine} · </>}{en ? 'Updated' : '갱신'} {agoLabel(s.updatedAt)}{s.usualNow != null ? (en ? ` · usually ${s.usualNow}% now` : ` · 평소 ${s.usualNow}%`) : ''}</p>
        </>
      ) : (
        <div className="mt-3 rounded-2xl bg-surface-2 px-3.5 py-3 flex items-start gap-2.5">
          {closed ? <Clock size={16} className="text-ink-3 mt-0.5 shrink-0" /> : <WifiOff size={16} className="text-ink-3 mt-0.5 shrink-0" />}
          <p className="text-[13px] text-ink-2 leading-snug">{closed
            ? (en ? `Closed right now${hoursLine ? ` · ${hoursLine}` : ''}.` : `지금은 닫혀 있어요${hoursLine ? ` · ${hoursLine}` : ''}.`)
            : (en ? `The live count is unavailable right now${s.updatedAt ? ` — last reading ${agoLabel(s.updatedAt)}` : ''}. We don’t show old numbers as live.` : `지금은 실시간 인원을 읽을 수 없어요${s.updatedAt ? ` — 마지막 ${agoLabel(s.updatedAt)}` : ''}. 오래된 숫자를 실시간처럼 보여주지 않아요.`)}</p>
        </div>
      )}
      <TodayChart s={s} />
      <button onClick={onAlert} className="mt-4 w-full flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3 text-left press">
        {alert?.enabled ? <BellRing size={18} className="text-sel-fg shrink-0" /> : <Bell size={18} className="text-ink-3 shrink-0" />}
        <span className="flex-1 min-w-0 text-[13.5px] leading-snug">{alert
          ? <><b className="font-semibold">{en ? `Under ${alert.below}%` : `${alert.below}% 미만`}</b> · {daysLabel(alert.days)} · {fmtClock(alert.start)}–{fmtClock(alert.end)}{alert.enabled ? '' : (en ? ' (off)' : ' (꺼짐)')}</>
          : <span className="text-ink-2">{en ? 'Tell me when it’s under X%' : 'X% 미만이면 알려줘'}</span>}</span>
        <span className="text-[13px] font-semibold text-sel-fg">{alert ? (en ? 'Edit' : '수정') : (en ? 'Set' : '설정')}</span>
      </button>
    </section>
  );
}

/** today's average % per hour + the usual line for this weekday (after a week of readings) */
function TodayChart({ s }: { s: GymSpaceView }) {
  const [sel, setSel] = useState<number | null>(null);
  const bars = s.today;
  const hasToday = bars.some((b) => b.percent != null);
  const hasUsual = bars.some((b) => b.usual != null);
  const nowHour = Math.floor(campusClock().min / 60);
  const W = 320, H = 100, top = 6, bottom = 18;
  const max = Math.max(100, ...bars.map((b) => Math.max(b.percent ?? 0, b.usual ?? 0)));
  const bw = W / bars.length;
  const y = (p: number) => top + (H - top - bottom) * (1 - p / max);
  const usualPts = bars.map((b, i) => (b.usual != null ? `${i * bw + bw / 2},${y(b.usual)}` : null));
  const segs: string[][] = []; let cur: string[] = [];
  usualPts.forEach((p) => { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } }); if (cur.length) segs.push(cur);
  const picked = sel != null ? bars[sel] : null;
  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 text-[11.5px] text-ink-3 mb-1.5">
        <span className="flex items-center gap-1.5 font-semibold text-ink-2"><span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-t-mint-fg" />{en ? 'Today' : '오늘'}</span>
        {hasUsual && <span className="flex items-center gap-1.5"><svg width="16" height="4" aria-hidden><line x1="1" y1="2" x2="15" y2="2" className="stroke-ink-3" strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" /></svg>{en ? 'Usually' : '평소'} ({DAY_SHORT[campusClock().weekday]})</span>}
        <span className="flex-1" />
        {picked && <span className="text-ink-2 tabular-nums">{hourLabel(picked.hour)}: {picked.percent != null ? `${picked.percent}%` : (en ? 'no data' : '기록 없음')}{picked.usual != null ? (en ? ` · usually ${picked.usual}%` : ` · 평소 ${picked.usual}%`) : ''}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${s.name} today by hour`} onMouseLeave={() => setSel(null)}>
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="stroke-line" strokeWidth={1} />
        <line x1={0} x2={W} y1={y(50)} y2={y(50)} className="stroke-line" strokeWidth={1} strokeDasharray="2 3" />
        <text x={W - 1} y={y(50) - 3} textAnchor="end" className="fill-ink-3" fontSize={8}>50%</text>
        {bars.map((b, i) => {
          const x = i * bw + 1.5; const w = bw - 3;
          const on = sel === i || (sel == null && b.hour === nowHour);
          return (
            <g key={b.hour} onMouseEnter={() => setSel(i)} onClick={() => setSel(i)}>
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {b.percent != null && <rect x={x} y={y(b.percent)} width={w} height={Math.max(2, y(0) - y(b.percent))} rx={3} className={cn(on ? 'fill-sel' : 'fill-t-mint-fg', on ? 'opacity-100' : 'opacity-80')}><title>{`${hourLabel(b.hour)}: ${b.percent}%`}</title></rect>}
              {b.hour % 3 === 0 && <text x={i * bw + bw / 2} y={H - 4} textAnchor="middle" className="fill-ink-3" fontSize={9}>{hourLabel(b.hour)}</text>}
            </g>
          );
        })}
        {segs.map((pts, i) => <polyline key={i} points={pts.join(' ')} fill="none" className="stroke-ink-3" strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />)}
      </svg>
      {!hasToday && <p className="text-[12px] text-ink-3 -mt-1">{en ? 'No readings yet today.' : '오늘은 아직 기록이 없어요.'}</p>}
      {!hasUsual && <p className="text-[12px] text-ink-3 mt-1">{en ? `A “usually” line appears after a week of readings (${Math.min(s.historyDays, GYM_USUAL_MIN_DAYS)}/${GYM_USUAL_MIN_DAYS} days).` : `일주일 기록이 모이면 ‘평소’ 선이 보여요 (${Math.min(s.historyDays, GYM_USUAL_MIN_DAYS)}/${GYM_USUAL_MIN_DAYS}일).`}</p>}
    </div>
  );
}

const TIMES = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
const selectCls = 'flex-1 h-12 rounded-2xl bg-surface border border-line px-3 text-[15px] text-ink focus:outline-none focus:border-sel-line';

/** "Tell me when it's under X%" — per space, days and a time window; at most once a day, only from a live reading */
function AlertSheet({ space, alert, onClose, onSaved }: { space: GymSpaceView | null; alert?: GymAlertView; onClose: () => void; onSaved: (a: GymAlertView[]) => void }) {
  const showToast = useAppStore((s) => s.showToast);
  const [below, setBelow] = useState(30);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState('06:00');
  const [end, setEnd] = useState('10:00');
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!space) return;
    setBelow(alert?.below ?? 30); setDays(alert?.days ?? [1, 2, 3, 4, 5]); setStart(alert?.start ?? '06:00'); setEnd(alert?.end ?? '10:00'); setEnabled(alert?.enabled ?? true);
  }, [space, alert]);
  const save = async () => {
    if (!space) return; setBusy(true);
    try { const r = await campusLive.setGymAlert({ displayId: space.id, below, days, start, end, enabled }); onSaved(r.alerts); showToast(enabled ? (en ? `We’ll tell you when ${space.name} is under ${below}%` : `${space.name}이 ${below}% 미만이면 알려 드릴게요`) : (en ? 'Alert paused' : '알림을 껐어요'), 'success'); onClose(); }
    catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!space) return; setBusy(true);
    try { const r = await campusLive.removeGymAlert(space.id); onSaved(r.alerts); showToast(en ? 'Alert removed' : '알림을 지웠어요', 'info'); onClose(); }
    catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={!!space} onClose={onClose} title={space ? (en ? `Alert for ${space.name}` : `${space.name} 알림`) : ''}>
      <div className="space-y-5 pb-2">
        <div>
          <div className="flex items-baseline justify-between"><span className="text-[13px] font-semibold">{en ? 'Tell me when it’s under' : '이 아래로 내려가면 알려줘'}</span><span className="text-[28px] font-extrabold tabular-nums">{below}%</span></div>
          <input type="range" min={5} max={95} step={5} value={below} onChange={(e) => setBelow(Number(e.target.value))} className="w-full accent-[var(--color-sel)]" aria-label={en ? 'Crowd level' : '혼잡도'} />
          {space?.capacity ? <p className="text-[12.5px] text-ink-3">{en ? `About ${Math.round((space.capacity * below) / 100)} of ${space.capacity} people` : `${space.capacity}명 중 약 ${Math.round((space.capacity * below) / 100)}명`}</p> : null}
        </div>
        <div>
          <p className="text-[13px] font-semibold mb-2">{en ? 'Days' : '요일'}</p>
          <ChipRow wrap>{DAY_SHORT.map((d, i) => <Chip key={d} size="sm" active={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}>{d}</Chip>)}</ChipRow>
        </div>
        <div>
          <p className="text-[13px] font-semibold mb-2">{en ? 'Between' : '시간'}</p>
          <div className="flex items-center gap-2">
            <select value={start} onChange={(e) => setStart(e.target.value)} aria-label={en ? 'From' : '부터'} className={selectCls}>{TIMES.slice(0, 48).map((t) => <option key={t} value={t}>{fmtClock(t)}</option>)}</select>
            <span className="text-ink-3 text-[13px]">{en ? 'to' : '~'}</span>
            <select value={end} onChange={(e) => setEnd(e.target.value)} aria-label={en ? 'To' : '까지'} className={selectCls}>{TIMES.slice(1).map((t) => <option key={t} value={t}>{t === '24:00' ? (en ? 'Midnight' : '자정') : fmtClock(t)}</option>)}</select>
          </div>
          <p className="text-[12.5px] text-ink-3 mt-2">{en ? 'At most once a day per alert, and only from a live reading.' : '알림마다 하루 한 번까지, 실시간 값으로만.'}</p>
        </div>
        <div className="flex items-center justify-between"><span className="text-[14px] font-semibold">{en ? 'Alert on' : '알림 켜기'}</span><Switch checked={enabled} onChange={setEnabled} label={en ? 'Alert on' : '알림 켜기'} /></div>
        <div className="flex gap-2.5">
          {alert && <Btn variant="outline" size="lg" onClick={remove} disabled={busy}>{en ? 'Remove' : '지우기'}</Btn>}
          <Btn full size="lg" onClick={save} loading={busy} disabled={!days.length}>{en ? 'Save alert' : '알림 저장'}</Btn>
        </div>
      </div>
    </BottomSheet>
  );
}
