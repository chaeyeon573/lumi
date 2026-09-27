import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight, ChevronDown, Send, Lock } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Input, Segmented, EmptyState } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { matchesForRequest, audienceForRequest, REACH_LABELS_KO, REACH_LABELS_EN } from '@core/lib/requests';
import { cityOf } from '@core/lib/network';
import { localeContext } from '@core/lib/locale-context';
import { swipesLeft, isPlus } from '@core/lib/monetization';
import { PersonRow } from '@/components/cards/PersonRow';
import { cn } from '@core/lib/cn';
import type { Reason } from '@core/lib/recommend';
import type { RequestReach, User } from '@core/types';

const merge = (...lists: (string | undefined)[][]) => [...new Set(lists.flat().filter((x): x is string => !!x))];
const asReasons = (rs: string[]): Reason[] => rs.map((text) => ({ text, weight: 1, kind: 'interest' as const }));

/**
 * 사람 찾아보기 — 한 줄 입력 → 먼저 AroundU 가 가까운 네트워크에서 조용히 찾아 보여주고,
 * 그 아래에서 "건너건너 물어볼까요?" (아는 사람들의 네트워크에 조용히 전달, 해당되는 사람만 답한다).
 */
export function AskNetworkPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const run = useAppStore((s) => s.run);
  const ctx = localeContext();
  const initial = params.get('q') ?? '';
  const [draft, setDraft] = useState(initial);
  const q = initial.trim();
  const [more, setMore] = useState(false);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [field, setField] = useState<string | undefined>(undefined);
  const [reach, setReach] = useState<RequestReach>(2);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const temp = useMemo(() => ({ authorId: me.id, text: q, city, field, interests: [], reach }), [me.id, q, city, field, reach]);
  const matches = useMemo(() => (q ? matchesForRequest(snap, temp, 7) : []), [snap, temp, q]);
  const delivered = useMemo(() => (q ? audienceForRequest(snap, temp).length : 0), [snap, temp, q]);
  const cities = merge([cityOf(me)], ctx.cities).slice(0, 8);
  const fields = merge([me.career?.industry], ctx.industries).slice(0, 8);
  const reachLabels = lang === 'en' ? REACH_LABELS_EN : REACH_LABELS_KO;

  const submit = () => { const s = draft.trim(); if (!s) return; setParams({ q: s }, { replace: true }); };
  const connect = async (u: User) => {
    if (!isPlus(me) && swipesLeft(me) <= 0) { nav('/plus'); return; }
    setBusyId(u.id);
    try { await run(() => api.relationships.sendFriendRequest(me.id, u.id), `${u.nickname}${t('님에게 연결 요청을 보냈어요.')}`); } catch { /* toast */ } finally { setBusyId(null); }
  };
  const ask = async () => {
    setBusy(true);
    try {
      const r = await run(() => api.requests.create(me.id, { text: q, city, field, interests: [], reach }), t('조용히 물어봤어요. 해당되는 사람이 손 들면 알려드려요.'));
      nav(`/people/requests/${r.request.id}`, { replace: true });
    } catch { setBusy(false); }
  };

  const few = matches.length < 5;

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title={t('사람 찾아보기')} />
      <div className="px-4 pt-2">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input className="pl-10 pr-12 h-12 rounded-full" autoFocus={!q} placeholder={t('혹시 찾는 사람이 있나요? 예: 일본 식품 유통 아는 사람')} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          <button onClick={submit} aria-label={t('찾기')} disabled={!draft.trim()} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-primary text-white grid place-items-center press disabled:opacity-35"><ArrowRight size={16} /></button>
        </div>
      </div>

      {!q ? (
        <EmptyState emoji="🔎" title={t('어떤 사람을 찾고 있나요?')} description={t('한 줄이면 돼요. 먼저 가까운 네트워크에서 찾아보고, 없으면 건너건너 물어볼 수 있어요.')} />
      ) : (
        <>
          <section className="px-4 mt-5">
            <h2 className="font-display text-[18px] font-bold text-primary">{matches.length > 0 ? `${t('가까운 네트워크에서')} ${matches.length}${t('명을 찾았어요')}` : t('가까운 네트워크에서 바로 떠오르는 사람이 없어요')}</h2>
            {matches.length > 0 && <p className="mt-0.5 text-[12px] text-ink-3">{t('프로필과 연결을 바탕으로 골랐어요')}</p>}
            {matches.length > 0 && (
              <div className="mt-3 space-y-2">
                {matches.map((m) => <PersonRow key={m.user.id} user={m.user} reasons={asReasons(m.reasons)} onConnect={connect} busy={busyId === m.user.id} compact />)}
              </div>
            )}
          </section>

          <section className={cn('mx-4 mt-5 rounded-[24px] p-4', few ? 'bg-primary text-white' : 'bg-white border border-line')}>
            <h3 className={cn('font-display text-[17px] font-bold', few ? 'text-white' : 'text-primary')}>{t('건너건너 물어볼까요?')}</h3>
            <p className={cn('mt-1 text-[13px] leading-relaxed', few ? 'text-white/80' : 'text-ink-2')}>{t('아는 사람들의 네트워크에 조용히 물어봐요. 해당되는 사람만 답해요.')}</p>

            <button onClick={() => setMore((x) => !x)} className={cn('mt-3 h-8 px-3 -ml-1 rounded-full text-[12px] font-semibold inline-flex items-center gap-1 press', few ? 'text-white/90 hover:bg-white/10' : 'text-primary hover:bg-surface-2')}>
              {t('더 알려주기')}<ChevronDown size={14} className={cn('transition-transform', more && 'rotate-180')} />
            </button>
            {more && (
              <div className={cn('mt-2 rounded-2xl p-3 space-y-3', few ? 'bg-white/10' : 'bg-surface-2')}>
                <div>
                  <div className={cn('text-[11px] font-bold mb-1.5', few ? 'text-white/70' : 'text-ink-3')}>{t('도시')}</div>
                  <div className="flex flex-wrap gap-1.5">{cities.map((c) => <Chip key={c} size="sm" active={city === c} onClick={() => setCity(city === c ? undefined : c)} className={cn(few && city !== c && 'bg-white/90')}>{c}</Chip>)}</div>
                </div>
                <div>
                  <div className={cn('text-[11px] font-bold mb-1.5', few ? 'text-white/70' : 'text-ink-3')}>{t('분야')}</div>
                  <div className="flex flex-wrap gap-1.5">{fields.map((f) => <Chip key={f} size="sm" active={field === f} onClick={() => setField(field === f ? undefined : f)} className={cn(few && field !== f && 'bg-white/90')}>{f}</Chip>)}</div>
                </div>
                <div>
                  <div className={cn('text-[11px] font-bold mb-1.5', few ? 'text-white/70' : 'text-ink-3')}>{t('어디까지')}</div>
                  <Segmented value={String(reach) as '2' | '3'} onChange={(x) => setReach(Number(x) as RequestReach)} options={[{ value: '2', label: t('2촌까지') }, { value: '3', label: t('3촌 + 관련') }]} className={cn(few && 'bg-white/90')} />
                  <p className={cn('mt-1.5 text-[11px]', few ? 'text-white/70' : 'text-ink-3')}>{reachLabels[reach]}</p>
                </div>
              </div>
            )}

            <p className={cn('mt-4 text-[12px] font-semibold', few ? 'text-white/90' : 'text-ink-2')}>{t('관련 있는')} {delivered}{t('명에게 조용히 전달돼요')}</p>
            <Button full size="lg" className="mt-2" variant={few ? 'secondary' : 'primary'} icon={<Send size={16} />} loading={busy} disabled={delivered === 0} onClick={ask}>{t('물어보기')}</Button>
            <p className={cn('mt-2 text-[11px] flex items-start gap-1.5', few ? 'text-white/70' : 'text-ink-3')}><Lock size={11} className="mt-0.5 shrink-0" />{t('내 이름과 함께 보여요. 손 든 사람의 프로필은 본인이 손 들기 전까지 보이지 않아요.')}</p>
          </section>
        </>
      )}
    </div>
  );
}
