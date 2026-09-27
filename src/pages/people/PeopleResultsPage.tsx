import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, Bell, Pencil, Lock } from 'lucide-react';
import { t } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, BottomSheet, EmptyState, ErrorState, CardSkeleton, Input, Toggle, Field } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { searchPeople, searchLabel } from '@core/lib/people';
import { matchScore, shareableReasons } from '@core/lib/recommend';
import { isPlus, swipesLeft } from '@core/lib/monetization';
import type { User } from '@core/types';
import { PersonRow } from '@/components/cards/PersonRow';
import { PaywallSheet, type PaywallReason } from '@/components/social/PaywallSheet';
import { parseCriteria, criteriaParam } from './PeoplePage';

/** /people/results?c=<JSON>&saved=<id> — 조건에 맞는 사람 목록. ☆ 저장(Plus) · 저장한 검색이면 알림 토글 */
export function PeopleResultsPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const savedAll = useAppStore((s) => s.savedSearches);
  const v = useViewer();
  const me = v.me;
  const plus = isPlus(me);
  const saved = params.get('saved') ? savedAll.find((s) => s.id === params.get('saved') && s.userId === me.id) : undefined;
  const criteria = useMemo(() => (params.get('c') ? parseCriteria(params.get('c')) : saved ? saved.criteria : parseCriteria(null)), [params, saved]);
  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? id;
  const label = searchLabel(criteria, schoolName);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [alert, setAlert] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const results = useMemo(() => searchPeople(v.visibleUsers, me, criteria)
    .map((u) => { const m = matchScore(me, u, v.snap, v.canSeeField(u, 'timetable')); return { u, score: m.score, reasons: shareableReasons(m.reasons) }; })
    .sort((a, b) => b.score - a.score), [v, me, criteria]);

  const connect = async (u: User) => {
    if (!plus && swipesLeft(me) <= 0) { setPaywall('limit'); return; }
    setBusyId(u.id);
    try { await run(() => api.relationships.sendFriendRequest(me.id, u.id), `${u.nickname}${t('님에게 연결 요청을 보냈어요.')}`); }
    catch { if (!plus && swipesLeft(useAppStore.getState().users.find((x) => x.id === me.id) ?? me) <= 0) setPaywall('limit'); }
    finally { setBusyId(null); }
  };
  const openSave = (withAlert: boolean) => {
    if (!plus) { setPaywall(withAlert ? 'alert' : 'save'); return; }
    setName(label); setAlert(withAlert); setSaveOpen(true);
  };
  const save = async () => {
    setSaving(true);
    try { await run(() => api.searches.save(me.id, name.trim() || label, criteria, alert), alert ? t('검색을 저장하고 새 사람 알림을 켰어요.') : t('검색을 저장했어요.')); setSaveOpen(false); }
    catch { /* toast */ } finally { setSaving(false); }
  };
  const edit = () => nav(`/people?tab=search&c=${criteriaParam(criteria)}`);

  return (
    <div className="min-h-full bg-bg pb-24">
      <TopBar back title={t('검색 결과')} right={!saved && (
        <button onClick={() => openSave(false)} aria-label={t('검색 저장')} className="h-10 px-3 rounded-full flex items-center gap-1 text-[13px] font-bold text-primary press">
          {plus ? <Star size={16} /> : <Lock size={14} />}{t('검색 저장')}
        </button>
      )} />
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4 space-y-3">
          {saved && (
            <div className="rounded-[24px] bg-primary-soft/70 px-4 py-3">
              <div className="text-[11px] font-bold text-ink-3 flex items-center gap-1"><Star size={11} fill="currentColor" className="text-primary" />{t('저장한 검색')}</div>
              <div className="text-[16px] font-bold text-primary mt-0.5">{saved.name}</div>
              <Toggle label={t('새 사람 알림')} description={t('조건에 맞는 사람이 새로 들어오면 알려드려요')} checked={saved.alert} onChange={(on) => run(() => api.searches.setAlert(saved.id, on), on ? t('새 사람 알림을 켰어요.') : t('새 사람 알림을 껐어요.'))} />
            </div>
          )}
          <button onClick={edit} className="w-full flex items-center gap-1.5 flex-wrap text-left press">
            {label.split(' + ').map((x, i) => <span key={`${x}${i}`} className="h-7 px-2.5 rounded-full bg-accent-soft text-primary text-[12px] font-bold inline-flex items-center">{x}</span>)}
            <span className="h-7 px-2 rounded-full text-[12px] font-semibold text-ink-3 inline-flex items-center gap-1"><Pencil size={11} />{t('편집')}</span>
          </button>
          <div className="text-[15px] font-bold">{results.length}{t('명의 사람을 찾았어요')}</div>
          {results.length === 0 ? (
            <EmptyState emoji="" title={t('조건에 맞는 사람이 아직 없어요')} description={t('조건을 줄이거나 알림을 켜두세요. 새 사람이 들어오면 알려드려요.')}
              action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={edit}>{t('조건 줄이기')}</Button>{!saved && <Button size="sm" icon={<Bell size={14} />} onClick={() => openSave(true)}>{t('알림 켜두기')}</Button>}</div>} />
          ) : (
            <div className="space-y-2">{results.map((x) => <PersonRow key={x.u.id} user={x.u} reasons={x.reasons} onConnect={connect} busy={busyId === x.u.id} />)}</div>
          )}
        </div>
      )}

      <BottomSheet open={saveOpen} onClose={() => setSaveOpen(false)} title={t('검색 저장')}>
        <Field label={t('이름')}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={label} /></Field>
        <div className="mt-2 rounded-2xl bg-surface-2 px-4"><Toggle label={t('새 사람 알림')} description={t('조건에 맞는 사람이 새로 들어오면 알려드려요')} checked={alert} onChange={setAlert} /></div>
        <Button full size="lg" className="mt-4" loading={saving} onClick={save} icon={<Star size={16} />}>{t('저장')}</Button>
      </BottomSheet>
      <PaywallSheet open={!!paywall} onClose={() => setPaywall(null)} reason={paywall ?? undefined} />
    </div>
  );
}
