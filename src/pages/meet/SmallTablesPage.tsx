import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Clock, EyeOff, MapPin, Plus, RefreshCw, Users } from 'lucide-react';
import { t } from '@core/i18n';
import type { Activity } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { recommendSmallTables, type SmallTableRec } from '@core/lib/meet';
import { placeLabel } from '@core/lib/relations';
import { formatDateTime, todayISO } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, Cover, Tag, Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/components/ui';
import { JoinButton } from '@/components/cards/JoinButton';
import { useSectionState } from '@/hooks/useSectionState';
import { useViewer } from '@/hooks/useViewer';

/** 관심 둔 작은 모임 — 이 브라우저에만 저장 (나만 봄, 주최자에게 알리지 않음) */
export const INTERESTED_KEY = 'aroundu.tables.interested';
function readInterested(): string[] {
  try { const v = JSON.parse(localStorage.getItem(INTERESTED_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
function writeInterested(ids: string[]) {
  try { localStorage.setItem(INTERESTED_KEY, JSON.stringify(ids)); } catch { /* 저장 불가 — 화면 상태만 유지 */ }
}

const PAGE = 5;

/** /meet/tables — Small Table 추천. 1:1 커피챗 대신 4~6명이 모이는 작은 모임 */
export function SmallTablesPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const participations = useAppStore((s) => s.participations);
  const s = useSectionState('small-tables');
  const [offset, setOffset] = useState(0);
  const [interested, setInterested] = useState<string[]>(readInterested);
  const [lastHidden, setLastHidden] = useState<Activity | null>(null);

  const recs = useMemo(() => recommendSmallTables(v.visibleActivities, v.me, v.users, participations, 20), [v, participations]);
  const rotated = recs.length ? [...recs.slice(offset % recs.length), ...recs.slice(0, offset % recs.length)].slice(0, PAGE) : [];
  const recIds = new Set(recs.map((r) => r.a.id));
  const saved = interested.map((id) => v.visibleActivities.find((a) => a.id === id)).filter((a): a is Activity => !!a && !recIds.has(a.id));

  const toggleInterest = (id: string) => {
    const on = interested.includes(id);
    const next = on ? interested.filter((x) => x !== id) : [id, ...interested];
    setInterested(next); writeInterested(next);
    useAppStore.getState().showToast(on ? t('관심을 거뒀어요') : t('관심 둔 모임에 담았어요 · 주최자에게 알리지 않아요'), 'success');
  };
  const hide = async (a: Activity) => {
    try { await run(() => api.users.hide(v.me.id, 'activity', a.id), t('이 모임을 숨겼어요')); setLastHidden(a); } catch { /* toast */ }
  };
  const undo = async () => {
    if (!lastHidden) return;
    const a = lastHidden;
    try { await run(() => api.users.hide(v.me.id, 'activity', a.id, true), t('다시 보이게 했어요')); setLastHidden(null); } catch { /* toast */ }
  };
  const more = () => { setOffset((o) => o + Math.min(3, Math.max(1, recs.length - 1))); useAppStore.getState().showToast(t('새 추천을 보여드려요')); };

  return (
    <div className="min-h-full bg-bg pb-10">
      <TopBar back title={t('작은 모임')} />
      <div className="px-4 space-y-4">
        <div className="rounded-[24px] bg-[linear-gradient(135deg,#D2E4FF,#BFF4FF)] p-4">
          <div className="flex items-center gap-2 text-primary"><Users size={16} /><span className="text-[15px] font-bold">{t('작은 모임 · 4~6명')}</span></div>
          <p className="text-[13px] text-ink-2 mt-1">{t('4~6명이 모이는 작은 모임이 1:1보다 편해요')}</p>
        </div>

        {lastHidden && (
          <div className="h-11 rounded-full bg-ink text-white pl-4 pr-1.5 flex items-center gap-2 text-[13px]" role="status">
            <EyeOff size={14} /><span className="flex-1 truncate">{t('숨겼어요')} · {lastHidden.title}</span>
            <button onClick={undo} className="h-8 px-3 rounded-full bg-white text-primary text-[12px] font-bold press">{t('되돌리기')}</button>
          </div>
        )}

        <Section loading={s.loading} error={s.error} onRetry={s.retry} skeleton={<SectionSkeleton count={3} />}
          empty={recs.length === 0 && (
            <SectionEmpty emoji="🍽️" title={t('지금 맞는 작은 모임이 없어요')} description={t('직접 열면 비슷한 사람에게 먼저 보여드려요')} action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" icon={<Plus size={14} />} onClick={() => nav('/meet/create?small=1')}>{t('작은 모임 만들기')}</Button>
                <Button size="sm" variant="outline" onClick={() => nav('/profile/wants')}>{t('찾는 활동 조정')}</Button>
              </div>
            } />
          )}>
          <div className="space-y-3">
            {rotated.map((r) => <TableCard key={r.a.id} r={r} interested={interested.includes(r.a.id)} onInterest={() => toggleInterest(r.a.id)} onHide={() => hide(r.a)} />)}
            {recs.length > PAGE - 2 && (
              <Button full variant="outline" icon={<RefreshCw size={15} />} onClick={more}>{t('새 추천 보기')}</Button>
            )}
          </div>
        </Section>

        {saved.length > 0 && (
          <section>
            <h2 className="text-[13px] font-semibold text-ink-3 mb-2 flex items-center gap-1"><Bookmark size={12} />{t('관심 둔 작은 모임')}</h2>
            <div className="space-y-2">{saved.map((a) => <SavedRow key={a.id} a={a} onRemove={() => toggleInterest(a.id)} />)}</div>
          </section>
        )}
        <PrivacyNote className="justify-center" text={t('참여 전에는 이름 대신 관심사가 겹치는 사람 수만 보여요')} />
      </div>
    </div>
  );
}

/** 추천 카드 — 제목 · n/정원 · 일시 · 지역 · 이유 · 겹치는 사람(아바타만) · [자세히] [관심] [참여] [숨기기] */
function TableCard({ r, interested, onInterest, onHide }: { r: SmallTableRec; interested: boolean; onInterest: () => void; onHide: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const { a, reasons, filled, sharedPeople } = r;
  const mine = v.myParticipation(a.id);
  const place = placeLabel(a, v.me, mine?.status === 'approved');
  const closed = filled >= a.capacity || a.date < todayISO();
  const others = sharedPeople.filter((u) => u.id !== v.me.id);
  return (
    <article className="card p-3.5">
      <button onClick={() => nav(`/activities/${a.id}`)} className="w-full flex items-start gap-3 text-left press">
        <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} className="h-14 w-14 rounded-2xl shrink-0" size={26} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold truncate">{a.title}</span>
            {closed && <Tag tone="neutral" className="h-5 text-[11px] shrink-0">{t('모집이 끝났어요')}</Tag>}
          </div>
          <div className="text-[12px] text-ink-2 mt-0.5 flex items-center gap-1"><Clock size={11} className="shrink-0" /><span className="truncate">{formatDateTime(a.date, a.startTime)}</span></div>
          <div className="text-[12px] text-ink-3 flex items-center gap-1"><MapPin size={11} className="shrink-0" /><span className="truncate">{place.name}{place.approximate ? ` · ${t('대략')}` : ''}</span></div>
        </div>
        <span className="h-7 px-2.5 rounded-full bg-primary-soft text-primary text-[12px] font-bold grid place-items-center shrink-0">{filled}/{a.capacity}{t('명')}</span>
      </button>

      <div className="mt-2.5 flex flex-wrap gap-1">{reasons.map((x) => <span key={x} className="h-6 px-2 rounded-full bg-[#BFF4FF] text-primary text-[11px] font-bold inline-flex items-center">{x}</span>)}</div>

      {others.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex -space-x-2">{others.slice(0, 3).map((u) => <Avatar key={u.id} emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={26} className="ring-2 ring-white" />)}</div>
          <span className="text-[12px] text-ink-2">{t('관심사 겹침')} {others.length}{t('명')}</span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={() => nav(`/activities/${a.id}`)}>{t('자세히')}</Button>
        <Button size="sm" variant={interested ? 'primary' : 'secondary'} aria-pressed={interested} icon={<Bookmark size={13} fill={interested ? 'currentColor' : 'none'} />} onClick={onInterest}>{t('관심 두기')}</Button>
        <JoinButton activity={a} size="sm" label={t('참여하기')} className="flex-1" />
        <button onClick={onHide} className="h-9 w-9 rounded-full grid place-items-center text-ink-3 hover:bg-surface-2 press shrink-0" aria-label={t('숨기기')} title={t('숨기기')}><EyeOff size={16} /></button>
      </div>
    </article>
  );
}

function SavedRow({ a, onRemove }: { a: Activity; onRemove: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const filled = v.approvedCount(a.id) + 1;
  const past = a.date < todayISO();
  const closed = past || filled >= a.capacity;
  return (
    <div className={cn('rounded-[20px] border border-line bg-white px-3 py-2.5 flex items-center gap-2.5', closed && 'opacity-80')}>
      <button onClick={() => nav(`/activities/${a.id}`)} className="flex-1 min-w-0 flex items-center gap-2.5 text-left press">
        <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} className="h-9 w-9 rounded-xl shrink-0" size={18} />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold truncate">{a.title}</span>
          <span className="block text-[11px] text-ink-3 truncate">{formatDateTime(a.date, a.startTime)} · {filled}/{a.capacity}</span>
        </span>
      </button>
      {closed && <Tag className="h-5 text-[11px] shrink-0">{past ? t('지난 모임이에요') : t('모집이 끝났어요')}</Tag>}
      <button onClick={onRemove} className="text-[12px] font-semibold text-ink-3 px-1.5 press shrink-0">{t('빼기')}</button>
    </div>
  );
}
