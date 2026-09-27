import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight, ChevronDown, Send, Lock, X, Check, Save } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Input, Segmented, EmptyState, Section, SectionSkeleton } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useSectionState } from '@/hooks/useSectionState';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { matchesForRequest, audienceForRequest, degreeLabel, requestContextLine, REACH_LABELS_KO, REACH_LABELS_EN } from '@core/lib/requests';
import { parseQuery, type QueryChip } from '@core/lib/nlsearch';
import { containsContact } from '@core/lib/privacy';
import { cityOf } from '@core/lib/network';
import { localeContext } from '@core/lib/locale-context';
import { swipesLeft, isPlus, FREE_OPEN_REQUESTS, PLUS_OPEN_REQUESTS } from '@core/lib/monetization';
import { RequestPreviewCard } from '@/components/people_RequestCard';
import { MaskedPersonRow } from './NaturalSearchPage';
import { cn } from '@core/lib/cn';
import type { Reason } from '@core/lib/recommend';
import type { Interest, RequestReach, User } from '@core/types';

const merge = (...lists: (string | undefined)[][]) => [...new Set(lists.flat().filter((x): x is string => !!x))];
/** 문자열 이유 → Reason (도시 이유는 공개 범위에 따라 가려질 수 있게 kind 를 붙인다) */
const asReasons = (rs: string[]): Reason[] => rs.map((text) => ({ text, weight: 1, kind: text.startsWith(t('같은 지역')) ? 'city' as const : 'interest' as const }));
const chipKey = (c: QueryChip) => `${c.kind}:${c.value}`;

const DRAFT_KEY = 'aroundu.ask.draft';
interface Draft { text: string; city?: string; field?: string; reach: RequestReach; removed: string[]; find: boolean; ask: boolean }
function readDraft(): Draft | null {
  try { const j = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null; return j && typeof j.text === 'string' && j.text.trim() ? j : null; } catch { return null; }
}
const writeDraft = (d: Draft) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); return true; } catch { return false; } };
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ } };

/**
 * 사람 찾아보기 — 한 줄 입력 → 먼저 AroundU 가 가까운 네트워크에서 조용히 찾아 보여주고,
 * 그 아래에서 "건너건너 물어볼까요?" (아는 사람들의 네트워크에 조용히 전달, 해당되는 사람만 답한다).
 * 전달 방식 두 가지(찾아보기 / 물어보기)는 따로 끌 수 있고, 찾아보기만 켜면 요청은 만들지 않는다.
 */
export function AskNetworkPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const applyPatch = useAppStore((s) => s.applyPatch);
  const showToast = useAppStore((s) => s.showToast);
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const ctx = localeContext();
  const initial = params.get('q') ?? '';
  // 임시 저장 — 주소에 다른 문장이 없을 때만 불러온다
  const [restored] = useState<Draft | null>(() => { const d = readDraft(); return d && (!initial.trim() || initial.trim() === d.text.trim()) ? d : null; });
  const [draft, setDraft] = useState(restored?.text ?? initial);
  const q = (initial || restored?.text || '').trim();
  const [more, setMore] = useState(!!restored && (!!restored.city || !!restored.field || restored.reach !== 2));
  const [city, setCity] = useState<string | undefined>(restored?.city);
  const [field, setField] = useState<string | undefined>(restored?.field);
  const [reach, setReach] = useState<RequestReach>(restored?.reach ?? 2);
  const [removed, setRemoved] = useState<string[]>(restored?.removed ?? []);
  const [modeFind, setModeFind] = useState(restored?.find ?? true);
  const [modeAsk, setModeAsk] = useState(restored?.ask ?? true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [emptyErr, setEmptyErr] = useState(false);
  const [capErr, setCapErr] = useState(false);
  const sec = useSectionState(`ask:${q}`);
  const toasted = useRef(false);

  useEffect(() => {
    if (!restored || toasted.current) return;
    toasted.current = true;
    showToast(t('임시 저장한 내용을 불러왔어요'));
    if (!initial.trim()) setParams({ q: restored.text }, { replace: true });
  }, [restored, initial, setParams, showToast]);

  // 입력한 문장에서 읽어낸 조건 (✕ 로 뺄 수 있다). 더 알려주기에서 고른 값이 있으면 그게 먼저
  const parsed = useMemo(() => parseQuery(draft, schools, lang), [draft, schools]);
  const chips = parsed.chips.filter((c) => !removed.includes(chipKey(c)));
  const cityEff = city ?? chips.find((c) => c.kind === 'city')?.value;
  const fieldEff = field ?? chips.find((c) => c.kind === 'industry' || c.kind === 'role')?.value;
  const interests = chips.filter((c) => c.kind === 'interest').map((c) => c.value as Interest);
  const interestKey = interests.join(',');

  const temp = useMemo(() => ({ authorId: me.id, text: q, city: cityEff, field: fieldEff, interests: interestKey ? (interestKey.split(',') as Interest[]) : [], reach }), [me.id, q, cityEff, fieldEff, interestKey, reach]);
  const matches = useMemo(() => (q && modeFind ? matchesForRequest(snap, temp, 7) : []), [snap, temp, q, modeFind]);
  const delivered = useMemo(() => (q ? audienceForRequest(snap, temp).length : 0), [snap, temp, q]);
  const cities = merge([cityOf(me)], ctx.cities).slice(0, 8);
  const fields = merge([me.career?.industry], ctx.industries).slice(0, 8);
  const reachLabels = lang === 'en' ? REACH_LABELS_EN : REACH_LABELS_KO;
  const cap = isPlus(me) ? PLUS_OPEN_REQUESTS : FREE_OPEN_REQUESTS;
  const openCount = snap.networkRequests.filter((r) => r.authorId === me.id && r.status === 'open').length;
  const hasContact = containsContact(draft);
  const text = draft.trim() || q;

  // 더 알려주기에서 고르면 그 값이 우선. 다시 누르면 끄고, 문장에서 읽은 같은 조건도 뺀다 ('' = 일부러 비움)
  const dropChips = (kinds: QueryChip['kind'][]) => setRemoved((r) => [...new Set([...r, ...parsed.chips.filter((c) => kinds.includes(c.kind)).map(chipKey)])]);
  const pickCity = (c: string) => { if (cityEff === c) { setCity(''); dropChips(['city']); } else setCity(c); };
  const pickField = (f: string) => { if (fieldEff === f) { setField(''); dropChips(['industry', 'role']); } else setField(f); };

  const submit = () => {
    const s = draft.trim();
    if (!s) { setEmptyErr(true); return; }
    setEmptyErr(false);
    setParams({ q: s }, { replace: true });
  };
  const connect = async (u: User) => {
    if (!isPlus(me) && swipesLeft(me) <= 0) { nav('/plus'); return; }
    setBusyId(u.id);
    try { await run(() => api.relationships.sendFriendRequest(me.id, u.id), `${u.nickname}${t('님에게 연결 요청을 보냈어요.')}`); } catch { /* toast */ } finally { setBusyId(null); }
  };
  const saveDraft = () => {
    if (!draft.trim()) { setEmptyErr(true); return; }
    if (writeDraft({ text: draft.trim(), city, field, reach, removed, find: modeFind, ask: modeAsk })) showToast(t('임시 저장했어요. 다음에 열면 이어서 쓸 수 있어요.'), 'success');
    else showToast(t('임시 저장하지 못했어요.'), 'error');
  };
  const ask = async () => {
    if (!text) { setEmptyErr(true); return; }
    if (hasContact) return;
    if (openCount >= cap) { setCapErr(true); return; }
    setBusy(true); setCapErr(false);
    try {
      const r = await api.requests.create(me.id, { text, city: cityEff, field: fieldEff, interests: temp.interests, reach });
      applyPatch(r.patch);
      clearDraft();
      showToast(t('조용히 물어봤어요. 해당되는 사람이 손 들면 알려드려요.'), 'success');
      nav(`/people/requests/${r.request.id}`, { replace: true });
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      setBusy(false);
      if (msg.startsWith(t('동시에 찾을 수 있는 건 '))) setCapErr(true);
      else if (containsContact(text) || msg === t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.')) { /* 입력 아래 안내가 이미 보인다 */ }
      else showToast(t('보내지 못했어요. 잠시 후 다시 시도해주세요.'), 'error');
    }
  };

  const few = matches.length < 5 || !modeFind;
  const modePill = (on: boolean, label: string, onClick: () => void) => (
    <button type="button" role="switch" aria-checked={on} onClick={onClick}
      className={cn('h-9 px-3 rounded-full border text-[12px] font-bold inline-flex items-center gap-1.5 press', on ? 'bg-primary text-white border-primary' : 'bg-white border-line text-ink-3')}>
      <span className={cn('h-4 w-4 rounded-full grid place-items-center', on ? 'bg-white text-primary' : 'border border-line')}>{on && <Check size={10} strokeWidth={3} />}</span>{label}
    </button>
  );

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title={t('사람 찾아보기')} />
      <div className="px-4 pt-2">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input className={cn('pl-10 pr-12 h-12 rounded-full', (hasContact || emptyErr) && 'border-danger focus:border-danger')} autoFocus={!q} aria-invalid={hasContact || emptyErr} placeholder={t('혹시 찾는 사람이 있나요? 예: 일본 식품 유통 아는 사람')} value={draft} onChange={(e) => { setDraft(e.target.value); if (e.target.value.trim()) setEmptyErr(false); }} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          <button onClick={submit} aria-label={t('찾기')} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-primary text-white grid place-items-center press"><ArrowRight size={16} /></button>
        </div>
        {emptyErr && <p className="mt-1.5 ml-3 text-[12px] text-danger" role="alert">{t("예: '일본 식품 유통 아는 사람'처럼 한 줄이면 돼요")}</p>}
        {hasContact && <p className="mt-1.5 ml-3 text-[12px] text-danger" role="alert">{t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.')}</p>}

        {/* 읽어낸 조건 — ✕ 로 빼기 */}
        {!hasContact && (chips.length > 0 || removed.length > 0) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-ink-3 mr-0.5">{t('읽어낸 조건')}</span>
            {chips.map((c) => (
              <span key={chipKey(c)} className="h-7 pl-2.5 pr-0.5 rounded-full bg-[#D2E4FF] text-primary text-[12px] font-bold inline-flex items-center gap-0.5">
                {c.label}
                <button onClick={() => setRemoved((r) => [...r, chipKey(c)])} aria-label={`${c.label} ${t('빼기')}`} className="h-6 w-6 rounded-full grid place-items-center hover:bg-white/60 press"><X size={11} /></button>
              </span>
            ))}
            {removed.length > 0 && <button onClick={() => setRemoved([])} className="h-7 px-1.5 text-[11px] font-semibold text-ink-3 underline underline-offset-2 press">{t('처음 조건으로')}</button>}
          </div>
        )}
        {parsed.dropped.length > 0 && <p className="mt-1.5 ml-1 text-[11px] text-ink-3 flex items-center gap-1"><Lock size={10} />{t('성별·나이·종교 같은 민감한 조건은 쓰지 않아요')}</p>}

        {/* 전달 방식 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {modePill(modeFind, t('AroundU가 찾아보기'), () => setModeFind((x) => !x))}
          {modePill(modeAsk, t('건너건너 물어보기'), () => setModeAsk((x) => !x))}
        </div>
      </div>

      {!q ? (
        <EmptyState emoji="🔎" title={t('어떤 사람을 찾고 있나요?')} description={t('한 줄이면 돼요. 먼저 가까운 네트워크에서 찾아보고, 없으면 건너건너 물어볼 수 있어요.')} />
      ) : !modeFind && !modeAsk ? (
        <EmptyState emoji="🍃" title={t('둘 중 하나는 켜주세요')} description={t('AroundU가 찾아보거나, 건너건너 물어보거나 — 둘 다도 괜찮아요.')} />
      ) : (
        <>
          {modeFind && (
            <section className="px-4 mt-5">
              <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={2} />}>
                <h2 className="font-display text-[18px] font-bold text-primary">{matches.length > 0 ? `${t('가까운 네트워크에서')} ${matches.length}${t('명을 찾았어요')}` : t('가까운 네트워크에서 바로 떠오르는 사람이 없어요')}</h2>
                {matches.length > 0 && <p className="mt-0.5 text-[12px] text-ink-3">{t('프로필과 연결을 바탕으로 골랐어요')}</p>}
                {matches.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {matches.map((m) => <MaskedPersonRow key={m.user.id} user={m.user} reasons={asReasons(m.reasons)} onConnect={connect} busy={busyId === m.user.id} />)}
                  </div>
                )}
              </Section>
            </section>
          )}

          {modeAsk ? (
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
                    <div className="flex flex-wrap gap-1.5">{cities.map((c) => <Chip key={c} size="sm" active={cityEff === c} onClick={() => pickCity(c)} className={cn(few && cityEff !== c && 'bg-white/90')}>{c}</Chip>)}</div>
                  </div>
                  <div>
                    <div className={cn('text-[11px] font-bold mb-1.5', few ? 'text-white/70' : 'text-ink-3')}>{t('분야')}</div>
                    <div className="flex flex-wrap gap-1.5">{fields.map((f) => <Chip key={f} size="sm" active={fieldEff === f} onClick={() => pickField(f)} className={cn(few && fieldEff !== f && 'bg-white/90')}>{f}</Chip>)}</div>
                  </div>
                  <div>
                    <div className={cn('text-[11px] font-bold mb-1.5', few ? 'text-white/70' : 'text-ink-3')}>{t('어디까지')}</div>
                    <Segmented value={String(reach) as '1' | '2' | '3'} onChange={(x) => setReach(Number(x) as RequestReach)} options={[{ value: '1', label: t('1촌') }, { value: '2', label: t('2촌') }, { value: '3', label: t('3촌') }]} className={cn(few && 'bg-white/90')} />
                    <p className={cn('mt-1.5 text-[11px]', few ? 'text-white/70' : 'text-ink-3')}>{reachLabels[reach]}</p>
                  </div>
                </div>
              )}

              <div className={cn('mt-4 text-[11px] font-bold mb-1.5', few ? 'text-white/70' : 'text-ink-3')}>{t('받는 사람에게 이렇게 보여요')}</div>
              <RequestPreviewCard author={me} text={text} context={requestContextLine({ city: cityEff || undefined, field: fieldEff || undefined, interests: temp.interests })} degreeText={degreeLabel(2, lang)} />

              <p className={cn('mt-4 text-[12px] font-semibold', few ? 'text-white/90' : 'text-ink-2')}>{t('관련 있는')} {delivered}{t('명에게 조용히 전달돼요')}</p>
              {capErr && (
                <div className={cn('mt-2 rounded-2xl px-3 py-2.5 text-[12px]', few ? 'bg-white text-ink' : 'bg-danger-soft text-ink')} role="alert">
                  {lang === 'en' ? `You can look for up to ${cap} at a time. Finish one, or get more with AroundU+.` : `동시에 찾을 수 있는 건 ${cap}개까지예요. 하나를 마치거나 AroundU+ 에서 늘릴 수 있어요.`}
                  <div className="mt-1.5 flex gap-3">
                    <button onClick={() => nav('/people/requests?tab=mine')} className="font-bold text-primary press">{t('내가 찾는 것 보기')}</button>
                    {!isPlus(me) && <button onClick={() => nav('/plus')} className="font-bold text-primary press">{t('AroundU+ 보기')}</button>}
                  </div>
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Button full size="lg" variant={few ? 'secondary' : 'primary'} icon={<Send size={16} />} loading={busy} disabled={delivered === 0 || hasContact} onClick={ask}>{t('물어보기')}</Button>
                <Button size="lg" variant={few ? 'ghost' : 'outline'} className={cn(few && 'text-white hover:bg-white/10')} icon={<Save size={16} />} onClick={saveDraft}>{t('임시 저장')}</Button>
              </div>
              <p className={cn('mt-2 text-[11px] flex items-start gap-1.5', few ? 'text-white/70' : 'text-ink-3')}><Lock size={11} className="mt-0.5 shrink-0" />{t('이름·학교만 함께 보여요. 연락처는 적지 마세요.')}</p>
            </section>
          ) : (
            <section className="mx-4 mt-5 rounded-[24px] bg-surface-2/70 p-4">
              <p className="text-[13px] text-ink-2 leading-relaxed">{t('건너건너 물어보기가 꺼져 있어요. 요청은 만들지 않고 찾은 사람만 보여드려요.')}</p>
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" variant="outline" icon={<Send size={14} />} onClick={() => setModeAsk(true)}>{t('건너건너 물어보기 켜기')}</Button>
                <Button size="sm" variant="ghost" icon={<Save size={14} />} onClick={saveDraft}>{t('임시 저장')}</Button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
