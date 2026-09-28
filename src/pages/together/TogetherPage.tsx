import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Plus, Users, ArrowRight, MapPin } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, EmptyState, BottomSheet, Input, Field } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { CATEGORY_LABELS } from '@core/lib/labels';
import { tally, optionLabel, closesIn } from '@core/lib/together';
import { addDaysISO } from '@core/lib/format';
import { cn } from '@core/lib/cn';

/** Plan Together — 겹치는 시간에 표 던지기 (pure minimal) */
export function TogetherPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const polls = useAppStore((s) => s.timePolls);
  const poll = polls.find((p) => p.id === id);
  const me = v.me;
  const [sel, setSel] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [custom, setCustom] = useState({ date: addDaysISO(1), startTime: '18:00', endTime: '19:30' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (poll) setSel(poll.votes[me.id] ?? []); }, [poll?.id, poll?.votes[me.id]?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!poll) return <div className="min-h-full"><TopBar back title="Plan Together" /><EmptyState emoji="" title={t('투표를 찾을 수 없어요')} /></div>;
  const isHost = poll.hostId === me.id;
  if (!isHost && !poll.inviteeIds.includes(me.id)) return <div className="min-h-full"><TopBar back title="Plan Together" /><EmptyState emoji="" title={t('초대받은 사람만 볼 수 있어요')} /></div>;
  const { rows, best, voted, total } = tally(poll);
  const people = [poll.hostId, ...poll.inviteeIds].map((u) => v.userById(u)).filter(Boolean);
  const myVote = poll.votes[me.id];
  const dirty = JSON.stringify([...sel].sort()) !== JSON.stringify([...(myVote ?? [])].sort());
  const decided = poll.status === 'decided';
  const open = poll.status === 'open';
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const save = async () => { setBusy(true); try { await run(() => api.together.vote(poll.id, me.id, sel), t('되는 시간을 저장했어요.')); } catch { /* */ } finally { setBusy(false); } };
  const decide = async (optionId: string) => { setBusy(true); try { const res = await run(() => api.together.decide(poll.id, optionId), t('시간을 확정했어요. 활동과 그룹 채팅방이 만들어졌어요.')); nav(`/activities/${res.activity.id}`); } catch { setBusy(false); } };

  return (
    <div className="min-h-full pb-32">
      <TopBar back title={lang === 'en' ? 'Plan Together' : '시간 정하기'} />
      <div className="px-4 pt-3 space-y-5">
        <div>
          <h1 className="font-display text-[30px] font-bold text-ink leading-tight">{poll.title}</h1>
          <div className="mt-1.5 text-[14px] text-ink-2 flex items-center gap-1.5"><MapPin size={15} className="text-verify" />{poll.place?.name ?? CATEGORY_LABELS[poll.category]} · {lang === 'en' ? `${total} friends` : `${total}명`}{open && <span className="text-ink-3"> · {closesIn(poll.closesAt)}</span>}</div>
        </div>
        <div className="rounded-2xl bg-surface-2 px-4 py-3.5 flex items-center gap-3">
          <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-primary">{lang === 'en' ? 'Squad' : '멤버'}</span><span className="block text-[13px] text-ink-2">{lang === 'en' ? `${voted} of ${total} voted` : `${total}명 중 ${voted}명 투표`}</span></span>
          <span className="flex -space-x-2">{people.slice(0, 4).map((u) => <Avatar key={u!.id} emoji={u!.avatar.emoji} hue={u!.avatar.hue} url={u!.avatar.url} size={36} className={cn('ring-2 ring-white', !poll.votes[u!.id] && 'opacity-40')} />)}{people.length > 4 && <span className="h-9 w-9 rounded-full bg-accent text-primary text-[12px] font-bold grid place-items-center ring-2 ring-white">+{people.length - 4}</span>}</span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2"><span className="text-[14px] font-semibold text-primary">{lang === 'en' ? 'Overlapping Free Times' : '겹치는 시간'}</span>{open && <button onClick={() => setAddOpen(true)} className="text-[13px] font-semibold text-verify flex items-center gap-1"><Plus size={13} />{t('시간 제안')}</button>}</div>
          <div className="space-y-3">
            {sorted.map(({ option: o, count }) => {
              const on = sel.includes(o.id); const isDecided = poll.decidedOptionId === o.id; const top = best?.option.id === o.id;
              return (
                <button key={o.id} disabled={!open} onClick={() => setSel((s) => on ? s.filter((x) => x !== o.id) : [...s, o.id])} className={cn('w-full rounded-full pl-2 pr-2 py-2 flex items-center gap-3 text-left transition', on || isDecided ? 'bg-surface card' : 'bg-surface-2')}>
                  <span className={cn('h-11 w-11 rounded-full grid place-items-center shrink-0', on || isDecided ? 'bg-primary text-white' : 'bg-surface text-ink-3')}>{on || isDecided ? <Check size={20} /> : <Plus size={18} />}</span>
                  <span className="flex-1 min-w-0"><span className="block text-[16px] font-semibold text-ink truncate">{optionLabel(o)}</span><span className={cn('block text-[13px]', top ? 'text-verify' : 'text-ink-3')}>{lang === 'en' ? `${count} friends free` : `${count}명 가능`}{o.suggested ? ` · ${t('공강 겹침')}` : ''}</span></span>
                  <span className={cn('h-8 px-3 rounded-full text-[12px] font-bold flex items-center gap-1 shrink-0', top ? 'bg-accent text-primary' : 'bg-surface text-ink-2')}><Users size={13} />{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        {decided && poll.activityId && <Button full size="lg" icon={<ArrowRight size={18} />} onClick={() => nav(`/activities/${poll.activityId}`)}>{lang === 'en' ? 'Open the hangout' : '약속 열기'}</Button>}
      </div>
      {open && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur p-4 safe-bottom z-20">
          {isHost && best ? (
            <Button full size="lg" variant="secondary" loading={busy} onClick={() => decide(best.option.id)}>{lang === 'en' ? `Confirm Meetup (${optionLabel(best.option)})` : `${optionLabel(best.option)} 확정`}</Button>
          ) : (
            <Button full size="lg" disabled={!dirty} loading={busy} onClick={save}>{myVote ? (dirty ? t('선택 저장') : t('투표 완료')) : lang === 'en' ? `I can do these ${sel.length}` : `이 ${sel.length}개 시간 돼요`}</Button>
          )}
          <p className="mt-2 text-center text-[12px] text-ink-3">{isHost ? (lang === 'en' ? 'Everyone free at that time gets invited' : '그 시간에 가능한 사람만 초대돼요') : (lang === 'en' ? 'Only the times you pick are shared' : '고른 시간만 공유돼요')}</p>
        </div>
      )}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title={t('시간 제안')}>
        <div className="space-y-3">
          <Field label={t('날짜')}><Input type="date" value={custom.date} onChange={(e) => setCustom({ ...custom, date: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label={t('시작')}><Input type="time" value={custom.startTime} onChange={(e) => setCustom({ ...custom, startTime: e.target.value })} /></Field><Field label={t('종료')}><Input type="time" value={custom.endTime} onChange={(e) => setCustom({ ...custom, endTime: e.target.value })} /></Field></div>
          <Button full disabled={custom.startTime >= custom.endTime} onClick={async () => { await run(() => api.together.addOption(poll.id, me.id, custom), t('시간을 추가했어요.')); setAddOpen(false); }}>{t('추가')}</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
