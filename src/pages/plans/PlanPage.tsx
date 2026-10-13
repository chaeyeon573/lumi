import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, CalendarPlus, Lock, MapPin, Users, X, Pencil, Plus, Clock, HelpCircle, Ban } from 'lucide-react';
import { lang } from '@core/i18n';
import type { ID, PlanRsvp, TimeOption } from '@core/types';
import { api, apiMode, type Patch } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { TopBar } from '@/components/layout/TopBar';
import { BottomSheet, Button, EmptyState, Field, Input, Textarea } from '@/components/ui';
import { PLAN_LIMITS, dayLabel, clock, planIcs, weekday, whenLabel, type PublicPlan } from '@core/lib/plans';
import { cn } from '@core/lib/cn';
import { SharePlanButtons, planUrl, readGuestName, readPlanToken, saveGuestName, savePlanToken, shortPlanUrl } from '@/components/plans/share';

const en = lang === 'en';
const L = (e: string, k: string) => (en ? e : k);
const names = (list: string[], max = 4) => (list.length <= max ? list.join(', ') : `${list.slice(0, max).join(', ')} +${list.length - max}`);
const RSVP: { key: PlanRsvp; label: string; Icon: typeof Check }[] = [
  { key: 'going', label: L('Going', '갈게요'), Icon: Check },
  { key: 'maybe', label: L('Maybe', '아마도'), Icon: HelpCircle },
  { key: 'no', label: L('Can’t', '못 가요'), Icon: X },
];
const STATUS_NOTE: Partial<Record<PublicPlan['status'], string>> = {
  closed: L('The host closed responses.', '주최자가 답 받기를 닫았어요.'),
  past: L('This plan already happened.', '이미 지난 약속이에요.'),
  cancelled: L('This plan was cancelled.', '취소된 약속이에요.'),
};

/** 캘린더에 추가 — 서버가 있으면 .ics 주소(아이폰이 바로 캘린더로 연다), 목업이면 이 화면에서 만든 파일 */
function AddToCalendar({ plan }: { plan: PublicPlan }) {
  const label = <><CalendarPlus size={18} />{L('Add to calendar', '캘린더에 추가')}</>;
  const cls = 'w-full h-12 rounded-full bg-surface border border-line text-ink text-[15px] font-semibold inline-flex items-center justify-center gap-2 press';
  if (apiMode === 'remote') return <a href={`${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/plans/${plan.id}/ics`} className={cls} download>{label}</a>;
  const download = () => {
    const ics = planIcs(plan, planUrl(plan.id)); if (!ics) return;
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = url; a.download = 'plan.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <button onClick={download} className={cls}>{label}</button>;
}

/** /p/<id> — 링크로 묻는 약속. 앱·계정 없이도 열리고, 로그인했으면 내 이름으로, 주최자면 관리 도구까지 */
export function PlanPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const meId = useAppStore((s) => s.currentUserId);
  const status = useAppStore((s) => s.status);
  const storePoll = useAppStore((s) => s.timePolls.find((p) => p.id === id));
  const run = useAppStore((s) => s.run);
  const toast = useAppStore((s) => s.showToast);
  const [plan, setPlan] = useState<PublicPlan | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rsvp, setRsvp] = useState<PlanRsvp | undefined>();
  const [sel, setSel] = useState<ID[]>([]);
  const [placeSel, setPlaceSel] = useState<ID[]>([]);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [lockPick, setLockPick] = useState<{ optionId?: ID; placeId?: ID }>({});
  const fresh = params.get('new') === '1';

  const load = useCallback(async () => {
    try { setPlan(await api.plans.view(id, readPlanToken(id))); setLoadError(null); }
    catch (e) { setLoadError((e as Error).message); }
  }, [id]);
  // 앱 세션을 확인한 뒤에 (로그인했으면 나로 보이게). 주최자·답한 Lumi 사용자는 실시간 패치가 오면 다시 읽는다
  useEffect(() => { if (status === 'ready' || status === 'error') void load(); }, [status, meId, storePoll, load]);
  // 손님은 실시간 연결이 없다 — 화면으로 돌아오거나 30초마다
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVis);
    const iv = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30_000);
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(iv); };
  }, [load]);
  // 내 답으로 선택을 채운다
  useEffect(() => {
    if (!plan) return;
    setRsvp(plan.me?.rsvp);
    setSel(plan.me?.optionIds ?? []);
    setPlaceSel(plan.me?.placeIds ?? []);
    setName((n) => n || plan.me?.name || (meId ? '' : readGuestName()));
    if (plan.best && !lockPick.optionId) setLockPick((p) => ({ ...p, optionId: plan.final?.optionId ?? plan.best!.id }));
  }, [plan?.me?.responseId, plan?.me?.rsvp, plan?.me?.optionIds.join(), plan?.me?.placeIds.join(), plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const signedIn = !!meId;
  const asGuest = !signedIn;
  const open = plan?.status === 'open';
  const nameOk = signedIn || name.trim().length > 0;
  const dirty = useMemo(() => {
    if (!plan) return false;
    if (plan.mode === 'fixed') return !!rsvp && rsvp !== plan.me?.rsvp;
    const same = (a: ID[], b: ID[]) => a.length === b.length && a.every((x) => b.includes(x));
    return !plan.me || !same(sel, plan.me.optionIds) || !same(placeSel, plan.me.placeIds) || (asGuest && name.trim() !== plan.me.name);
  }, [plan, rsvp, sel, placeSel, name, asGuest]);

  async function submit(answer: { rsvp?: PlanRsvp; optionIds?: ID[]; placeIds?: ID[] }) {
    if (!plan) return;
    setBusy(true);
    try {
      if (meId) {
        await run(() => api.plans.respond(plan.id, meId, answer), L('Saved your answer', '답을 저장했어요'));
        await load();
      } else {
        const clean = name.trim();
        const res = await api.plans.guestRespond(plan.id, { name: clean, ...answer }, readPlanToken(plan.id));
        savePlanToken(plan.id, res.token); saveGuestName(res.plan.me?.name ?? clean);
        setPlan(res.plan);
        toast(L(`Thanks, ${res.plan.me?.name ?? clean}! Saved on this device.`, '저장했어요. 이 기기에서 다시 열면 내 답이 보여요.'), 'success');
      }
    } catch (e) { if (!meId) toast((e as Error).message, 'error'); }
    finally { setBusy(false); }
  }
  const host = async (fn: () => Promise<Patch>, msg: string) => { setBusy(true); try { await run(fn, msg); await load(); } catch { /* run 이 토스트로 알린다 */ } finally { setBusy(false); } };

  if (plan === undefined && !loadError) return <Shell signedIn={signedIn}><div className="px-4 pt-10 space-y-3"><div className="h-14 w-14 rounded-2xl bg-surface-2 animate-pulse" /><div className="h-8 w-2/3 rounded-xl bg-surface-2 animate-pulse" /><div className="h-24 rounded-2xl bg-surface-2 animate-pulse" /></div></Shell>;
  if (!plan) return <Shell signedIn={signedIn}><EmptyState emoji="🔗" title={L('This plan isn’t here', '약속을 찾을 수 없어요')} description={loadError ?? L('The link may be wrong, or the host removed it.', '링크가 틀렸거나 주최자가 지웠어요.')} action={<Button size="sm" onClick={() => nav(signedIn ? '/' : '/welcome')}>{L('Open Lumi', 'Lumi 열기')}</Button>} /></Shell>;

  const fixed = plan.mode === 'fixed';
  // '가장 많이'는 2명 이상이 고르고 단독 1위일 때만 (주최자 혼자 모든 시간에 있을 때는 의미가 없다)
  const topId = plan.best && plan.best.count >= 2 && plan.options.filter((o) => o.count === plan.best!.count).length === 1 ? plan.best.id : undefined;
  const toggle = (list: ID[], set: (x: ID[]) => void, x: ID) => set(list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  return (
    <Shell signedIn={signedIn}>
      <div className="px-4 pt-4 pb-10 space-y-5">
        {/* 주최자: 링크 공유 */}
        {plan.isHost && plan.status !== 'cancelled' && (
          <section className={cn('rounded-3xl p-4 space-y-3', fresh ? 'bg-primary-soft v2:bg-surface-2 v2:border v2:border-lime-800' : 'bg-surface-2')}>
            <div className="flex items-start gap-2">
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-bold text-ink">{fresh ? L('Your link is ready', '링크가 준비됐어요') : L('Share this plan', '약속 공유')}</span>
                <span className="block text-[12.5px] text-ink-2 truncate">{shortPlanUrl(plan.id)}</span>
              </span>
              {fresh && <button onClick={() => setParams({}, { replace: true })} aria-label={L('Dismiss', '닫기')} className="h-8 w-8 grid place-items-center text-ink-3"><X size={16} /></button>}
            </div>
            <SharePlanButtons id={plan.id} title={`${plan.emoji} ${plan.title}`} />
            {fresh && <p className="text-[12px] text-ink-2">{L('Paste it in the group chat. Friends don’t need Lumi — they type a first name and tap.', '단톡방에 붙여 넣으세요. 친구는 앱 없이 이름만 적고 누르면 돼요.')}</p>}
          </section>
        )}

        {/* 무엇 · 언제 · 어디 */}
        <header>
          <div className="text-[44px] leading-none mb-2" aria-hidden>{plan.emoji}</div>
          <h1 className="font-display text-[28px] font-bold text-primary leading-tight break-words">{plan.title}</h1>
          <p className="mt-1.5 text-[14px] text-ink-2">
            {plan.isHost ? L('Your plan', '내 약속') : L(`${plan.hostName} is asking`, `${plan.hostName}님의 약속`)}
            {' · '}{fixed ? L('say if you’re in', '올 수 있는지 알려주세요') : plan.final ? L('time is set', '시간 확정') : L('pick the times that work', '되는 시간을 골라주세요')}
          </p>
          {plan.final && (
            <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 flex items-center gap-3">
              <span className="h-11 w-11 rounded-xl bg-primary text-white v2:text-on-primary grid place-items-center shrink-0">{fixed ? <Clock size={20} /> : <Lock size={20} />}</span>
              <span className="min-w-0">
                {!fixed && <span className="block text-[11px] font-bold uppercase tracking-wide text-mint">{L('It’s set', '확정')}</span>}
                <span className="block text-[16px] font-bold text-ink">{dayLabel(plan.final.date)} · {clock(plan.final.startTime)}–{clock(plan.final.endTime)}</span>
                {plan.place && <span className="block text-[13px] text-ink-2 truncate"><MapPin size={12} className="inline -mt-0.5 mr-0.5" />{plan.place}</span>}
              </span>
            </div>
          )}
          {!plan.final && plan.place && <p className="mt-2 text-[14px] text-ink-2 flex items-center gap-1.5"><MapPin size={15} className="text-verify" />{plan.place}</p>}
          {plan.note && <p className="mt-3 text-[14px] text-ink whitespace-pre-line rounded-2xl border border-line px-3.5 py-2.5">{plan.note}</p>}
          {STATUS_NOTE[plan.status] && <p className="mt-3 text-[13px] font-semibold text-ink-2 rounded-xl bg-surface-2 px-3 py-2">{STATUS_NOTE[plan.status]}</p>}
        </header>

        {plan.final && plan.status !== 'cancelled' && plan.status !== 'past' && <AddToCalendar plan={plan} />}

        {/* 이름 (손님) */}
        {open && asGuest && (
          <Field label={plan.me ? L('Answering as', '내 이름') : L('Your first name', '이름 (첫 이름만)')} hint={plan.me ? L('Remembered on this device — come back to change your answer.', '이 기기에 기억돼요. 다시 와서 답을 바꿀 수 있어요.') : L('Only your first name is shown.', '이름 첫 단어만 보여요.')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={PLAN_LIMITS.nameMax} placeholder={L('e.g. Asha', '예: 지민')} autoComplete="given-name" />
          </Field>
        )}
        {open && signedIn && !plan.isHost && <p className="text-[13px] text-ink-3">{L('Answering with your Lumi account — you’ll get a reminder.', 'Lumi 계정으로 답해요 — 시작 전에 알려드려요.')}</p>}

        {/* 고정 시간: Going / Maybe / Can't */}
        {fixed && (
          <section className="space-y-3">
            {open && (
              <div className="grid grid-cols-3 gap-2">
                {RSVP.map(({ key, label, Icon }) => {
                  const on = rsvp === key;
                  return (
                    <button key={key} disabled={busy || !nameOk} onClick={() => { setRsvp(key); void submit({ rsvp: key }); }} aria-pressed={on}
                      className={cn('h-[68px] rounded-2xl flex flex-col items-center justify-center gap-1 text-[14px] font-bold press border disabled:opacity-45', on ? 'bg-primary text-white v2:text-on-primary border-primary' : 'bg-surface text-ink border-line')}>
                      <Icon size={20} />{label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="rounded-2xl border border-line divide-y divide-line">
              <Row icon={<Check size={16} />} label={L('Going', '갈게요')} count={plan.going.length} names={plan.going} />
              <Row icon={<HelpCircle size={16} />} label={L('Maybe', '아마도')} count={plan.maybe.length} names={plan.maybe} />
              <Row icon={<X size={16} />} label={L('Can’t', '못 가요')} count={plan.no} />
            </div>
          </section>
        )}

        {/* 같이 정하기: 후보 시간 · 장소 */}
        {!fixed && (
          <section className="space-y-2.5">
            <div className="flex items-end justify-between"><h2 className="text-[15px] font-bold text-ink">{open ? L('Tap every time that works', '되는 시간을 모두 누르세요') : L('Times', '시간')}</h2><span className="text-[12px] text-ink-3">{L(`${plan.responded} answered`, `${plan.responded}명 답함`)}</span></div>
            {plan.options.map((o) => {
              const on = sel.includes(o.id); const top = topId === o.id; const locked = plan.final?.optionId === o.id;
              return (
                <button key={o.id} disabled={!open} onClick={() => toggle(sel, setSel, o.id)} aria-pressed={on}
                  className={cn('w-full rounded-2xl pl-2 pr-3 py-2 flex items-center gap-3 text-left border transition', locked ? 'border-primary bg-surface' : on ? 'border-primary bg-primary-soft v2:bg-surface-2' : 'border-line bg-surface', !open && !locked && 'opacity-70')}>
                  <span className={cn('h-10 w-10 rounded-xl grid place-items-center shrink-0', on || locked ? 'bg-primary text-white v2:text-on-primary' : 'bg-surface-2 text-ink-3')}>{locked ? <Lock size={17} /> : on ? <Check size={18} /> : <Plus size={17} />}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-ink">{whenLabel(o)}</span>
                    <span className={cn('block text-[12.5px] truncate', top ? 'text-mint font-semibold' : 'text-ink-3')}>{o.count ? `${top ? L('Most popular · ', '가장 많이 · ') : ''}${names(o.names)}` : L('No one yet', '아직 없음')}</span>
                  </span>
                  <span className={cn('h-8 min-w-[44px] px-2.5 rounded-full text-[13px] font-bold flex items-center justify-center gap-1 shrink-0', top ? 'bg-accent text-primary v2:bg-lime-900 v2:text-lime-400' : 'bg-surface-2 text-ink-2')}><Users size={13} />{o.count}</span>
                </button>
              );
            })}
            {plan.places.length > 0 && (
              <div className="pt-2">
                <h3 className="text-[13px] font-semibold text-ink-2 mb-1.5">{open ? L('Where? (pick any)', '어디서? (여러 개 가능)') : L('Places', '장소')}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {plan.places.map((p) => { const on = placeSel.includes(p.id); return (
                    <button key={p.id} disabled={!open} onClick={() => toggle(placeSel, setPlaceSel, p.id)} aria-pressed={on} className={cn('h-9 px-3.5 rounded-full text-[13px] font-semibold border inline-flex items-center gap-1.5 press', on ? 'bg-primary text-white v2:text-on-primary border-primary' : 'bg-surface text-ink border-line')}>
                      <MapPin size={13} />{p.name}<span className="opacity-70">· {p.count}</span>
                    </button>
                  ); })}
                </div>
              </div>
            )}
            {open && (
              <Button full size="lg" disabled={!dirty || !nameOk || (sel.length === 0 && !plan.me)} loading={busy} onClick={() => submit({ optionIds: sel, placeIds: placeSel })}>
                {!nameOk ? L('Type your name first', '이름을 먼저 적어주세요') : plan.me && !dirty ? L('Saved ✓', '저장됨 ✓') : sel.length === 0 ? L('None of these work', '다 안 돼요') : L(`Save · ${sel.length} time${sel.length > 1 ? 's' : ''} work`, `저장 · ${sel.length}개 가능`)}
              </Button>
            )}
            {open && !plan.me && sel.length === 0 && <button className="w-full text-center text-[12.5px] text-ink-3 underline" disabled={!nameOk || busy} onClick={() => submit({ optionIds: [], placeIds: [] })}>{L('None of these work for me', '다 안 돼요')}</button>}
          </section>
        )}

        {/* 주최자 도구 */}
        {plan.isHost && plan.status !== 'cancelled' && (
          <section className="space-y-3 pt-2">
            <h2 className="text-[15px] font-bold text-ink">{L('Host tools', '주최자 도구')}</h2>
            {!fixed && plan.status !== 'past' && (
              <div className="rounded-2xl bg-surface-2 p-3.5 space-y-2.5">
                <div className="text-[13px] font-semibold text-ink">{plan.final ? L('Change the final time', '확정 시간 바꾸기') : L('Lock the final time', '시간 확정하기')}</div>
                <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                  {plan.options.map((o) => (
                    <button key={o.id} onClick={() => setLockPick((p) => ({ ...p, optionId: o.id }))} className={cn('shrink-0 h-9 px-3 rounded-full text-[12.5px] font-semibold border press', lockPick.optionId === o.id ? 'bg-primary text-white v2:text-on-primary border-primary' : 'bg-surface text-ink border-line')}>
                      {weekdayClock(o)} · {o.count}
                    </button>
                  ))}
                </div>
                {plan.places.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                    {plan.places.map((p) => <button key={p.id} onClick={() => setLockPick((x) => ({ ...x, placeId: x.placeId === p.id ? undefined : p.id }))} className={cn('shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold border press', lockPick.placeId === p.id ? 'bg-primary text-white v2:text-on-primary border-primary' : 'bg-surface text-ink-2 border-line')}><MapPin size={12} className="inline -mt-0.5" /> {p.name} · {p.count}</button>)}
                  </div>
                )}
                <Button full icon={<Lock size={16} />} disabled={!lockPick.optionId || (plan.final?.optionId === lockPick.optionId && !lockPick.placeId)} loading={busy}
                  onClick={() => host(() => api.plans.lock(plan.id, lockPick.optionId!, lockPick.placeId), L('Locked — everyone on Lumi gets the time', '확정했어요 — Lumi 사용자에게 알렸어요'))}>
                  {L(`Lock ${lockPick.optionId ? weekdayClock(plan.options.find((o) => o.id === lockPick.optionId)!) : 'a time'}`, '이 시간으로 확정')}
                </Button>
                <p className="text-[11.5px] text-ink-3">{L('Friends on Lumi get a notification and a reminder; others see it when they open the link.', 'Lumi 사용자는 알림과 리마인더를 받고, 나머지는 링크를 열면 보여요.')}</p>
              </div>
            )}
            <div className="rounded-2xl border border-line">
              <div className="px-3.5 py-2.5 text-[13px] font-semibold text-ink flex items-center justify-between"><span>{L('Responses', '답한 사람')} · {plan.responses?.length ?? 0}</span></div>
              <div className="divide-y divide-line">
                {(plan.responses ?? []).map((r) => (
                  <div key={r.id} className="px-3.5 py-2.5 flex items-center gap-2">
                    <span className="flex-1 min-w-0">
                      <span className="text-[14px] font-semibold text-ink">{r.name}</span>
                      {r.host && <span className="ml-1.5 text-[11px] text-ink-3">{L('you', '나')}</span>}
                      {r.lumi && !r.host && <span className="ml-1.5 text-[11px] font-semibold text-verify">Lumi</span>}
                      <span className="block text-[12px] text-ink-3 truncate">{fixed ? RSVP.find((x) => x.key === r.rsvp)?.label ?? '—' : r.optionIds.length ? r.optionIds.map((oid) => { const o = plan.options.find((x) => x.id === oid); return o ? weekdayClock(o) : ''; }).filter(Boolean).join(', ') : L('none of the times', '안 되는 시간뿐')}</span>
                    </span>
                    {!r.host && <button onClick={() => { if (window.confirm(L(`Remove ${r.name}’s answer?`, `${r.name}님의 답을 지울까요?`))) void host(() => api.plans.removeResponse(plan.id, r.id), L('Removed', '지웠어요')); }} aria-label={L(`Remove ${r.name}`, `${r.name} 지우기`)} className="h-8 w-8 grid place-items-center rounded-full text-ink-3 hover:bg-surface-2"><X size={16} /></button>}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {plan.status !== 'past' && <Button variant="outline" icon={<Pencil size={15} />} onClick={() => setEditOpen(true)}>{L('Edit', '수정')}</Button>}
              {(plan.status === 'open' || plan.status === 'closed') && <Button variant="outline" onClick={() => host(() => api.plans.close(plan.id, plan.status === 'open'), plan.status === 'open' ? L('Responses closed', '답 받기를 닫았어요') : L('Responses reopened', '다시 답을 받아요'))}>{plan.status === 'open' ? L('Close responses', '답 받기 닫기') : L('Reopen', '다시 열기')}</Button>}
              <Button variant="danger" icon={<Ban size={15} />} className="col-span-2" onClick={() => { if (window.confirm(L('Cancel this plan? The link will say it’s cancelled.', '약속을 취소할까요?'))) void host(() => api.together.cancel(plan.id), L('Plan cancelled', '약속을 취소했어요')); }}>{L('Cancel plan', '약속 취소')}</Button>
            </div>
          </section>
        )}

        {/* 계정 없는 사람: 가입은 선택 */}
        {asGuest && plan.status !== 'cancelled' && (
          <section className="rounded-2xl border border-dashed border-line px-4 py-3.5 text-center">
            <p className="text-[13px] text-ink-2">{L('Want a reminder before it starts?', '시작 전에 알림을 받고 싶다면')}</p>
            <Link to="/welcome" className="text-[13px] font-bold text-primary underline underline-offset-2">{L('Join Lumi to get reminders', 'Lumi 가입하고 알림 받기')}</Link>
            <p className="mt-1 text-[11.5px] text-ink-3">{L('Not needed to answer.', '답하는 데는 필요 없어요.')}</p>
          </section>
        )}
      </div>
      {plan.isHost && editOpen && <EditSheet plan={plan} onClose={() => setEditOpen(false)} onSaved={load} />}
    </Shell>
  );
}

/** "Thu 10/15 6pm" — 주최자 도구처럼 좁은 곳 */
const weekdayClock = (o: Pick<TimeOption, 'date' | 'startTime'>) => `${weekday(o.date)} ${Number(o.date.slice(5, 7))}/${Number(o.date.slice(8, 10))} ${clock(o.startTime)}`;

function Row({ icon, label, count, names: list }: { icon: React.ReactNode; label: string; count: number; names?: string[] }) {
  return (
    <div className="px-3.5 py-2.5 flex items-center gap-3">
      <span className="h-8 w-8 rounded-full bg-surface-2 text-ink-2 grid place-items-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-ink">{label}</span>{list && list.length > 0 && <span className="block text-[12.5px] text-ink-3 truncate">{names(list, 6)}</span>}</span>
      <span className="text-[17px] font-bold text-ink tabular-nums">{count}</span>
    </div>
  );
}

/** 바깥 틀 — 로그인했으면 뒤로 가기, 아니면 Lumi 이름만 */
function Shell({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-bg">
      {signedIn ? <TopBar back title={L('Plan', '약속')} /> : (
        <header className="h-14 px-4 flex items-center gap-2 border-b border-line/60">
          <span className="h-8 w-8 rounded-xl bg-primary text-white v2:text-on-primary grid place-items-center text-[15px]" aria-hidden>📍</span>
          <span className="font-display font-bold text-[18px] text-primary">Lumi</span>
        </header>
      )}
      {children}
    </div>
  );
}

/** 주최자: 이름·메모·시간 고치기 (확정 뒤에는 시간을 못 바꾼다) */
function EditSheet({ plan, onClose, onSaved }: { plan: PublicPlan; onClose: () => void; onSaved: () => Promise<void> }) {
  const run = useAppStore((s) => s.run);
  const [title, setTitle] = useState(plan.title);
  const [note, setNote] = useState(plan.note ?? '');
  const [opts, setOpts] = useState(plan.options.map((o) => ({ id: o.id as ID | undefined, date: o.date, startTime: o.startTime, endTime: o.endTime })));
  const [busy, setBusy] = useState(false);
  const canTimes = plan.status !== 'locked';
  const setOpt = (i: number, patch: Partial<(typeof opts)[number]>) => setOpts(opts.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const save = async () => {
    setBusy(true);
    try {
      await run(() => api.plans.edit(plan.id, { title, note, ...(canTimes ? { options: opts } : {}) }), L('Plan updated', '약속을 고쳤어요'));
      await onSaved(); onClose();
    } catch { setBusy(false); }
  };
  const last = opts[opts.length - 1];
  return (
    <BottomSheet open onClose={onClose} title={L('Edit plan', '약속 수정')} tall>
      <div className="space-y-4 pb-2">
        <Field label={L('Title', '이름')}><Input value={title} maxLength={PLAN_LIMITS.titleMax} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label={L('Note', '메모')}><Textarea value={note} maxLength={PLAN_LIMITS.noteMax} onChange={(e) => setNote(e.target.value)} className="min-h-[64px]" /></Field>
        {canTimes && (
          <Field label={plan.mode === 'fixed' ? L('Time', '시간') : L('Times', '후보 시간')} hint={plan.mode === 'vote' ? L('Answers on removed times are dropped.', '지운 시간에 낸 표는 사라져요.') : undefined}>
            <div className="space-y-2">
              {opts.map((o, i) => (
                <div key={o.id ?? `n${i}`} className="rounded-2xl bg-surface-2 p-2 space-y-1.5">
                  <div className="flex gap-1.5 items-center">
                    <Input type="date" aria-label={L('Date', '날짜')} value={o.date} onChange={(e) => setOpt(i, { date: e.target.value })} className="min-w-0" />
                    {plan.mode === 'vote' && <button disabled={opts.length <= PLAN_LIMITS.minVoteOptions} onClick={() => setOpts(opts.filter((_, j) => j !== i))} aria-label={L('Remove time', '시간 삭제')} className="h-9 w-9 shrink-0 grid place-items-center text-ink-3 disabled:opacity-30"><X size={16} /></button>}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input type="time" aria-label={L('Starts', '시작')} value={o.startTime} onChange={(e) => setOpt(i, { startTime: e.target.value })} className="min-w-0" />
                    <Input type="time" aria-label={L('Ends', '끝')} value={o.endTime} onChange={(e) => setOpt(i, { endTime: e.target.value })} className="min-w-0" />
                  </div>
                </div>
              ))}
              {plan.mode === 'vote' && opts.length < PLAN_LIMITS.maxOptions && <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={() => setOpts([...opts, { id: undefined, date: last.date, startTime: last.startTime, endTime: last.endTime }])}>{L('Add a time', '시간 추가')}</Button>}
            </div>
          </Field>
        )}
        <Button full size="lg" loading={busy} disabled={title.trim().length < 2} onClick={save}>{L('Save changes', '저장')}</Button>
      </div>
    </BottomSheet>
  );
}
