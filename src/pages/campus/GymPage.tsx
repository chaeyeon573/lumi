import { useEffect, useState } from 'react';
import { Bell, BellRing, ExternalLink, WifiOff } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { BottomSheet, Button, CardSkeleton, Chip, EmptyState, ErrorState, Tag } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { campusClock, fmtClock } from '@core/lib/campusclock';
import { CROWD_LABELS, DAY_SHORT, GYM_USUAL_MIN_DAYS, crowdLevel, type GymSpaceView } from '@core/lib/gym';
import { agoLabel, campusLive, type GymAlertView, type GymResponse } from '@/lib/campusLive';

const LEVEL_TONE = { quiet: 'mint', moderate: 'primary', busy: 'gold', packed: 'danger' } as const;
const daysLabel = (days: number[]) => {
  const k = [...days].sort().join(',');
  return k === '1,2,3,4,5' ? 'Weekdays' : k === '0,6' ? 'Weekends' : k === '0,1,2,3,4,5,6' ? 'Every day' : days.map((d) => DAY_SHORT[d]).join(' ');
};
const hourLabel = (h: number) => (h === 0 || h === 24 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`);

/** 체육관 혼잡도 — 공간별 지금 % · 오늘 시간대별 막대 + 평소 선 · "X% 미만이면 알려줘" */
export function GymPage() {
  const [data, setData] = useState<GymResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<GymSpaceView | null>(null);
  const [tick, setTick] = useState(0);
  const load = () => campusLive.gym().then((r) => { setData(r); setError(null); }).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); const h = setInterval(() => { load(); setTick((x) => x + 1); }, 60_000); return () => clearInterval(h); }, []);

  if (error && !data) return <div><TopBar back title="Gym crowd" /><ErrorState message={error} onRetry={load} /></div>;
  if (!data) return <div><TopBar back title="Gym crowd" /><CardSkeleton /></div>;
  if (!data.supported) return <div><TopBar back title="Gym crowd" /><EmptyState emoji="🏋️" title="Gym crowd isn't here for your school yet" description="Lumi shows the UC Berkeley RSF crowd meter for now." /></div>;

  return (
    <div className="min-h-full pb-10 bg-bg">
      <TopBar back title="Gym crowd" />
      <div className="px-4 pt-2 space-y-4" data-tick={tick}>
        {data.spaces.length === 0 && <div className="card p-5 text-center"><WifiOff className="mx-auto text-ink-3" size={22} /><p className="text-[15px] font-bold mt-2">Crowd meter unavailable</p><p className="text-[13px] text-ink-3 mt-1">We couldn't read the crowd meter yet. Try again in a few minutes.</p></div>}
        {data.spaces.map((s) => <SpaceCard key={s.id} s={s} alert={data.alerts.find((a) => a.displayId === s.id)} onAlert={() => setEditing(s)} />)}
        {data.source && (
          <a href={data.source.url} target="_blank" rel="noreferrer" className="block px-1 text-[12px] text-ink-3 underline underline-offset-2">{data.source.attribution} <ExternalLink size={11} className="inline -mt-0.5" /></a>
        )}
      </div>
      <AlertSheet space={editing} alert={editing ? data.alerts.find((a) => a.displayId === editing.id) : undefined} onClose={() => setEditing(null)} onSaved={(alerts) => setData({ ...data, alerts })} />
    </div>
  );
}

function SpaceCard({ s, alert, onAlert }: { s: GymSpaceView; alert?: GymAlertView; onAlert: () => void }) {
  const live = s.status === 'live' && s.percent != null;
  const level = live ? crowdLevel(s.percent!) : null;
  // 공식 운영 시간을 알 때만 (RSF) — 닫힌 시간엔 0% 를 ‘Quiet’ 대신 ‘Closed’
  const closed = s.open === false;
  const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).replace(':00', '');
  const hoursLine = s.hours ? `Today ${clock(s.hours.open)}–${clock(s.hours.close)}` : s.hours === null ? 'Closed today' : '';
  return (
    <section className="card px-4 pt-4 pb-3.5">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[15px] font-bold">{s.name}</h2>
        {closed ? <Tag>Closed</Tag> : live ? <Tag tone={LEVEL_TONE[level!]}>{CROWD_LABELS[level!]}</Tag> : <Tag>Unavailable</Tag>}
      </div>
      {live ? (
        <>
          <div className="mt-1 flex items-end gap-2">
            <span className="font-display text-[56px] leading-none font-bold tabular-nums">{s.percent}%</span>
            <span className="pb-1.5 text-[13px] text-ink-2">{s.count} / {s.capacity} people</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent} aria-label={`${s.name} ${s.percent}% full`}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, s.percent!)}%` }} />
          </div>
          <p className="mt-2 text-[12px] text-ink-3">{hoursLine && <>{hoursLine} · </>}Updated {agoLabel(s.updatedAt)}{s.usualNow != null ? ` · usually ${s.usualNow}% at this hour` : ''}</p>
        </>
      ) : (
        <div className="mt-2 rounded-xl bg-surface-2 px-3 py-3 flex items-start gap-2.5">
          <WifiOff size={16} className="text-ink-3 mt-0.5 shrink-0" />
          <p className="text-[13px] text-ink-2">The live count is unavailable right now{s.updatedAt ? ` — last reading ${agoLabel(s.updatedAt)}` : ''}. We don't show old numbers as live.</p>
        </div>
      )}
      <TodayChart s={s} />
      <button onClick={onAlert} className="mt-3 w-full flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5 text-left press">
        {alert?.enabled ? <BellRing size={16} className="text-primary shrink-0" /> : <Bell size={16} className="text-ink-3 shrink-0" />}
        <span className="flex-1 text-[13px]">{alert ? <><b className="font-semibold">Under {alert.below}%</b> · {daysLabel(alert.days)} · {fmtClock(alert.start)}–{fmtClock(alert.end)}{alert.enabled ? '' : ' (off)'}</> : <span className="text-ink-2">Tell me when it's under X%</span>}</span>
        <span className="text-[12px] font-semibold text-primary">{alert ? 'Edit' : 'Set'}</span>
      </button>
    </section>
  );
}

/** 오늘 시간대별 평균 % 막대 + 같은 요일 평소 선 (기록 7일 이상일 때) */
function TodayChart({ s }: { s: GymSpaceView }) {
  const [sel, setSel] = useState<number | null>(null);
  const bars = s.today;
  const hasToday = bars.some((b) => b.percent != null);
  const hasUsual = bars.some((b) => b.usual != null);
  const W = 320, H = 96, top = 6, bottom = 18;
  const max = Math.max(100, ...bars.map((b) => Math.max(b.percent ?? 0, b.usual ?? 0)));
  const bw = W / bars.length;
  const y = (p: number) => top + (H - top - bottom) * (1 - p / max);
  const usualPts = bars.map((b, i) => (b.usual != null ? `${i * bw + bw / 2},${y(b.usual)}` : null));
  const segs: string[][] = []; let cur: string[] = [];
  usualPts.forEach((p) => { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } }); if (cur.length) segs.push(cur);
  const picked = sel != null ? bars[sel] : null;
  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 text-[11px] text-ink-3 mb-1">
        <span className="flex items-center gap-1 font-semibold text-ink-2"><span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-primary opacity-80" />Today</span>
        {hasUsual && <span className="flex items-center gap-1"><svg width="16" height="4" aria-hidden><line x1="1" y1="2" x2="15" y2="2" className="stroke-ink-3" strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" /></svg>Usually ({DAY_SHORT[campusClock().weekday]})</span>}
        <span className="flex-1" />
        {picked && <span className="text-ink-2 tabular-nums">{hourLabel(picked.hour)}: {picked.percent != null ? `${picked.percent}%` : 'no data'}{picked.usual != null ? ` · usually ${picked.usual}%` : ''}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${s.name} today by hour`} onMouseLeave={() => setSel(null)}>
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="stroke-line" strokeWidth={1} />
        <line x1={0} x2={W} y1={y(50)} y2={y(50)} className="stroke-line" strokeWidth={1} strokeDasharray="2 3" />
        <text x={W - 1} y={y(50) - 3} textAnchor="end" className="fill-ink-3" fontSize={8}>50%</text>
        {bars.map((b, i) => {
          const x = i * bw + 1.5; const w = bw - 3;
          return (
            <g key={b.hour} onMouseEnter={() => setSel(i)} onClick={() => setSel(i)}>
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {b.percent != null && <rect x={x} y={y(b.percent)} width={w} height={Math.max(2, y(0) - y(b.percent))} rx={3} className={cn('fill-primary', sel === i ? 'opacity-100' : 'opacity-80')}><title>{`${hourLabel(b.hour)}: ${b.percent}%`}</title></rect>}
              {b.hour % 3 === 0 && <text x={i * bw + bw / 2} y={H - 4} textAnchor="middle" className="fill-ink-3" fontSize={9}>{hourLabel(b.hour)}</text>}
            </g>
          );
        })}
        {segs.map((pts, i) => <polyline key={i} points={pts.join(' ')} fill="none" className="stroke-ink-3" strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />)}
      </svg>
      {!hasToday && <p className="text-[12px] text-ink-3 -mt-1">No readings yet today.</p>}
      {!hasUsual && <p className="text-[11.5px] text-ink-3 mt-1">A “usually” line appears after a week of readings ({Math.min(s.historyDays, GYM_USUAL_MIN_DAYS)}/{GYM_USUAL_MIN_DAYS} days).</p>}
    </div>
  );
}

const TIMES = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

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
    try { const r = await campusLive.setGymAlert({ displayId: space.id, below, days, start, end, enabled }); onSaved(r.alerts); showToast(enabled ? `We'll tell you when ${space.name} is under ${below}%` : 'Alert paused', 'success'); onClose(); }
    catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!space) return; setBusy(true);
    try { const r = await campusLive.removeGymAlert(space.id); onSaved(r.alerts); showToast('Alert removed', 'info'); onClose(); }
    catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={!!space} onClose={onClose} title={space ? `Alert for ${space.name}` : ''}>
      <div className="space-y-5 pb-2">
        <div>
          <div className="flex items-baseline justify-between"><span className="text-[13px] font-semibold">Tell me when it's under</span><span className="font-display text-[26px] font-bold tabular-nums">{below}%</span></div>
          <input type="range" min={5} max={95} step={5} value={below} onChange={(e) => setBelow(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" aria-label="Crowd level" />
          {space?.capacity ? <p className="text-[12px] text-ink-3">About {Math.round((space.capacity * below) / 100)} of {space.capacity} people</p> : null}
        </div>
        <div>
          <p className="text-[13px] font-semibold mb-2">Days</p>
          <div className="flex gap-1.5">{DAY_SHORT.map((d, i) => <Chip key={d} size="sm" active={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}>{d}</Chip>)}</div>
        </div>
        <div>
          <p className="text-[13px] font-semibold mb-2">Between</p>
          <div className="flex items-center gap-2">
            <select value={start} onChange={(e) => setStart(e.target.value)} aria-label="From" className="flex-1 h-11 rounded-xl bg-surface-2 px-3 text-[14px]">{TIMES.slice(0, 48).map((t) => <option key={t} value={t}>{fmtClock(t)}</option>)}</select>
            <span className="text-ink-3 text-[13px]">to</span>
            <select value={end} onChange={(e) => setEnd(e.target.value)} aria-label="To" className="flex-1 h-11 rounded-xl bg-surface-2 px-3 text-[14px]">{TIMES.slice(1).map((t) => <option key={t} value={t}>{t === '24:00' ? 'Midnight' : fmtClock(t)}</option>)}</select>
          </div>
          <p className="text-[12px] text-ink-3 mt-2">At most once a day per alert, and only from a live reading.</p>
        </div>
        <label className="flex items-center justify-between"><span className="text-[13px] font-semibold">Alert on</span><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" /></label>
        <div className="flex gap-2">
          {alert && <Button variant="outline" onClick={remove} disabled={busy}>Remove</Button>}
          <Button full onClick={save} loading={busy} disabled={!days.length}>Save alert</Button>
        </div>
      </div>
    </BottomSheet>
  );
}
