import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { t } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, EmptyState } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { matchScore, shareableReasons } from '@core/lib/recommend';
import { commonInterests } from '@core/lib/relations';
import { isPlus } from '@core/lib/monetization';
import type { User } from '@core/types';
import { PaywallSheet } from '@/components/social/PaywallSheet';
import { BeyondCard, cityOf } from '@/components/people_BeyondCard';
import { BeyondFilterGroups, beyondPresets, beyondLabel, passesBeyond, isEmptyBeyond, EMPTY_BEYOND, type BeyondFilter } from '@/components/people_BeyondFilters';

/** /people/search — AroundU+ 전용 전체 화면 검색: 학교 여러 개 + 단계 + 관심사 + 도시 + 목표 → 결과 목록 */
export function AdvancedSearchPage() {
  const v = useViewer();
  const me = v.me;
  const run = useAppStore((s) => s.run);
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const schools = useAppStore((s) => s.schools);
  const plus = isPlus(me);
  const [f, setF] = useState<BeyondFilter>(EMPTY_BEYOND);
  const [paywall, setPaywall] = useState<'limit' | 'open' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pool = useMemo(() => v.visibleUsers
    .map((u) => { const m = matchScore(me, u, { opportunities: opps, opportunityIntents: intents }, v.canSeeField(u, 'timetable')); return { u, score: m.score + commonInterests(me, u).length * 0.5, reasons: shareableReasons(m.reasons) }; })
    .sort((a, b) => b.score - a.score), [v, me, opps, intents]);
  const cities = useMemo(() => [...new Set(pool.map((x) => cityOf(x.u)))], [pool]);
  const presets = useMemo(() => beyondPresets(schools, me), [schools, me]);
  const results = pool.filter((x) => passesBeyond(x.u, f));

  const connect = async (u: User) => {
    setBusyId(u.id);
    try { useAppStore.getState().applyPatch(await api.users.recordSwipe(me.id)); } catch { setPaywall('limit'); setBusyId(null); return; }
    if (!(v.isFriend(u.id) || v.pendingOut(u.id))) { try { await run(() => api.relationships.sendFriendRequest(me.id, u.id), `${u.nickname}${t('님에게 친구 요청을 보냈어요.')}`); } catch { /* toast */ } }
    setBusyId(null);
  };

  return (
    <div className="min-h-full pb-24 bg-bg">
      <TopBar back title={t('고급 검색')} />
      {!plus ? (
        <div className="px-4 pt-2 space-y-3">
          <div className="rounded-[24px] bg-primary-soft p-4">
            <div className="flex items-center gap-2"><Sparkles size={16} className="text-primary" /><span className="font-display text-[18px] font-bold text-primary">{t('서클을 넓히세요')}</span></div>
            <p className="text-[13px] text-ink-2 mt-1">{t('대학·도시·커뮤니티를 넘어 사람을 발견하세요.')}</p>
            <p className="text-[12px] text-ink-3 mt-1">{t('여러 학교를 한 번에 검색')} · {t('학교 간 사람 검색·고급 필터')}</p>
            <Button size="sm" className="mt-3" onClick={() => setPaywall('open')}>{t('AroundU+ 써보기')}</Button>
          </div>
          {pool.slice(0, 3).map((x) => <BeyondCard key={x.u.id} user={x.u} reasons={x.reasons} locked onConnect={() => undefined} />)}
        </div>
      ) : (
        <div className="px-4 pt-2">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-3 items-center">
            <span className="text-[11px] font-bold text-ink-3 shrink-0">{t('프리셋')}</span>
            {presets.map((p) => <Chip key={p.label} size="sm" active={beyondLabel(f, schools) === p.label} onClick={() => setF(p.f)}>{p.label}</Chip>)}
          </div>
          <BeyondFilterGroups f={f} onChange={setF} schools={schools} cities={cities} me={me} />
          <div className="flex items-center justify-between mt-5 mb-2">
            <h2 className="font-display text-[18px] font-bold text-primary">{t('결과')} <span className="text-ink-3 text-[14px] font-semibold">{results.length}</span></h2>
            {!isEmptyBeyond(f) && <Button size="sm" variant="ghost" onClick={() => setF(EMPTY_BEYOND)}>{t('초기화')}</Button>}
          </div>
          {results.length === 0 ? (
            <EmptyState emoji="" title={t('조건에 맞는 사람이 없어요')} action={<Button size="sm" variant="outline" onClick={() => setF(EMPTY_BEYOND)}>{t('조건 지우기')}</Button>} />
          ) : (
            <div className="space-y-3">{results.map((x) => <BeyondCard key={x.u.id} user={x.u} reasons={x.reasons} busy={busyId === x.u.id} onConnect={connect} />)}</div>
          )}
        </div>
      )}
      <PaywallSheet open={!!paywall} onClose={() => setPaywall(null)} reason={paywall === 'limit' ? 'limit' : undefined} />
    </div>
  );
}
