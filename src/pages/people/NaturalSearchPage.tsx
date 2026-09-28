import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight, X, Clock, Star, Lock, Sparkles, SlidersHorizontal, Send, ShieldCheck } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Input, Section, SectionSkeleton, SectionEmpty, PrivacyNote } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useSectionState } from '@/hooks/useSectionState';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { parseQuery, removeChip, relaxations, FREE_NL_SEARCHES_PER_DAY, EXAMPLE_QUERIES, type QueryChip } from '@core/lib/nlsearch';
import { searchPeople, isAdvancedSearch } from '@core/lib/people';
import { matchScore, shareableReasons, type Reason } from '@core/lib/recommend';
import { profileView, canShowInPath, type ProfileView } from '@core/lib/privacy';
import { degreeOf, pathBetween } from '@core/lib/graph';
import { majorOf } from '@core/lib/network';
import { mutualFriends } from '@core/lib/relations';
import { degreeLabel } from '@core/lib/requests';
import { isPlus, swipesLeft } from '@core/lib/monetization';
import { PersonRow } from '@/components/cards/PersonRow';
import { PaywallSheet, type PaywallReason } from '@/components/social/PaywallSheet';
import type { User } from '@core/types';

// ─── 공개 범위를 적용한 사람 행 (자연어 찾기 · 사람 찾아보기 공용) ─────────────
/** 보기 권한이 없는 항목은 지운 복사본 — PersonRow 가 그대로 그려도 새지 않게 */
function maskUser(u: User, view: ProfileView): User {
  return {
    ...u,
    career: u.career ? { ...u.career, company: view.company ? u.career.company : undefined, city: view.city ? u.career.city : undefined } : u.career,
    homeCity: view.city ? u.homeCity : undefined,
    activityCity: view.city ? u.activityCity : undefined,
    gradYear: view.gradYear ? u.gradYear : undefined,
    trips: view.trips ? u.trips : undefined,
  };
}

/**
 * 사람 한 명 — 왜(이유 칩) → 얼마나 가까운지(촌수 · 공통 연결) → 경로(나 → 아는 사람) → 세부(공개 범위 안에서만).
 * 전화번호·개인 이메일·정확한 위치는 애초에 보여주지 않는다.
 */
export function MaskedPersonRow({ user, reasons, onConnect, busy }: { user: User; reasons: Reason[]; onConnect?: (u: User) => void; busy?: boolean }) {
  const v = useViewer();
  const snap = useSnapshot();
  const me = v.me;
  const view = profileView(snap, me, user);
  const masked = maskUser(user, view);
  const rs = reasons.filter((r) => (view.city || (r.kind !== 'city' && r.kind !== 'living')) && (view.groups || r.kind !== 'group'));
  const degree = degreeOf(snap, me.id, user.id, 3);
  const mutual = mutualFriends(snap, me.id, user.id).length;
  const via = degree && degree >= 2 ? pathBetween(snap, me.id, user.id, 3).map((id) => v.userById(id)).filter((u): u is User => !!u && canShowInPath(u)) : [];
  return (
    <div>
      <PersonRow user={masked} reasons={rs} onConnect={onConnect} busy={busy} compact={!view.city} />
      <div className="px-3 mt-1 flex items-center gap-1 flex-wrap text-[11px] text-ink-3">
        <span className="font-semibold text-ink-2">{degreeLabel(degree, lang)}</span>
        {mutual > 0 && <span>· {t('공통 연결')} {mutual}{t('명')}</span>}
        {via.length > 0 && <span className="inline-flex items-center gap-0.5">· {t('나')}{via.map((p) => <span key={p.id} className="inline-flex items-center gap-0.5"><ArrowRight size={10} />{p.nickname}</span>)}<ArrowRight size={10} />{user.nickname}</span>}
      </div>
      {!view.full && view.reason && <PrivacyNote className="px-3 mt-0.5" text={view.reason} />}
    </div>
  );
}

// ─── 하루 무료 한도 (웹 데모: localStorage) ───────────────────────────────────
const DAILY_KEY = 'aroundu.nlsearch.daily';
const today = () => new Date().toISOString().slice(0, 10);
function usedToday(): number {
  try { const j = JSON.parse(localStorage.getItem(DAILY_KEY) ?? 'null') as { date: string; n: number } | null; return j && j.date === today() ? j.n : 0; } catch { return 0; }
}
function bumpToday() {
  try { localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today(), n: usedToday() + 1 })); } catch { /* 저장소를 못 쓰면 세지 않는다 */ }
}
/** 같은 문장은 한 번만 센다 (뒤로 가기·재방문) */
const counted = new Set<string>();
const chipKey = (c: QueryChip) => `${c.kind}:${c.value}`;
/** 의미 있는 조건인가 — "??" 같은 기호뿐인 키워드는 조건으로 치지 않는다 */
const meaningful = (c: QueryChip) => c.kind !== 'keyword' || /[\p{L}\p{N}]{2,}/u.test(c.label);

/**
 * /people/find?q= — 자연어 사람 찾기. "혹시 찾는 사람이 있나요?" 한 줄 → 조건 칩 → 가까운 네트워크 결과.
 * 민감한 조건(성별·나이·종교 등)은 쓰지 않는다. 결과가 없으면 조건을 하나씩 빼 보거나 건너건너 물어본다.
 */
export function NaturalSearchPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const v = useViewer();
  const me = v.me;
  const plus = isPlus(me);
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const [draft, setDraft] = useState(q);
  const [removed, setRemoved] = useState<string[]>([]);
  const [limited, setLimited] = useState(false);
  const [used, setUsed] = useState(usedToday);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sec = useSectionState(`nl:${q}`, 300);

  // 새 문장이 들어오면: 한도 확인 → 세기 → 최근 검색에 넣기
  useEffect(() => {
    setDraft(q); setRemoved([]);
    if (!q) { setLimited(false); return; }
    if (counted.has(q)) { setLimited(false); return; }
    if (!parseQuery(q, schools, lang, { myMajor: majorOf(me) }).chips.some(meaningful)) { setLimited(false); return; } // 읽지 못한 문장은 세지 않는다
    if (!plus && usedToday() >= FREE_NL_SEARCHES_PER_DAY) { setLimited(true); return; }
    counted.add(q); setLimited(false);
    if (!plus) { bumpToday(); setUsed(usedToday()); }
    run(() => api.users.pushRecentSearch(me.id, q)).catch(() => { /* 최근 검색은 실패해도 조용히 */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const parsed = useMemo(() => (q ? parseQuery(q, schools, lang, { myMajor: majorOf(me) }) : null), [q, schools, me]);
  const chips = useMemo(() => (parsed ? parsed.chips.filter((c) => !removed.includes(chipKey(c))) : []), [parsed, removed]);
  const criteria = useMemo(() => {
    if (!parsed) return null;
    return parsed.chips.filter((c) => removed.includes(chipKey(c))).reduce((acc, c) => removeChip(acc, c), parsed.criteria);
  }, [parsed, removed]);
  const snap = useSnapshot();
  // 가려진 항목으로는 찾히지 않게 — 도시·회사·졸업연도 조건은 그 항목을 볼 수 있는 사람에게만 적용
  const results = useMemo(() => (criteria && chips.length ? searchPeople(v.visibleUsers, me, criteria)
    .filter((u) => {
      const view = profileView(snap, me, u);
      if ((criteria.homeCities.length || criteria.activityCities.length) && !view.city) return false;
      if (criteria.companies.length && !view.company) return false;
      if ((criteria.gradYearFrom || criteria.gradYearTo) && !view.gradYear) return false;
      return true;
    })
    .map((u) => { const m = matchScore(me, u, v.snap, v.canSeeField(u, 'timetable')); return { u, score: m.score, reasons: shareableReasons(m.reasons) }; })
    .sort((a, b) => b.score - a.score) : []), [v, me, criteria, chips.length, snap]);
  const advancedLocked = !!criteria && isAdvancedSearch(criteria) && !plus;
  const shown = advancedLocked ? results.slice(0, 3) : results;
  const parseFailed = !!parsed && !parsed.chips.some(meaningful);
  const allRemoved = !!parsed && !parseFailed && chips.length === 0;
  const examples = EXAMPLE_QUERIES[lang === 'en' ? 'en' : 'ko'];
  const recent = me.recentSearches ?? [];

  const go = (text: string) => { const s = text.trim(); if (!s) return; setParams({ q: s }, { replace: !!q }); };
  const connect = async (u: User) => {
    if (!plus && swipesLeft(me) <= 0) { setPaywall('limit'); return; }
    setBusyId(u.id);
    try { await run(() => api.relationships.sendFriendRequest(me.id, u.id), `${u.nickname}${t('님에게 연결 요청을 보냈어요.')}`); } catch { /* toast */ } finally { setBusyId(null); }
  };
  const save = async () => {
    if (!plus || !criteria) { setPaywall('search'); return; }
    setSaving(true);
    try { await run(() => api.searches.save(me.id, q.slice(0, 40), criteria, false), t('검색을 저장했어요.')); } catch { /* toast */ } finally { setSaving(false); }
  };
  const askNetwork = () => nav(`/people/ask?q=${encodeURIComponent(q)}`);

  const exampleChips = (
    <div className="flex flex-wrap gap-1.5">
      {examples.map((x) => <button key={x} onClick={() => go(x)} className="h-8 px-3 rounded-full bg-[#F4F9FF] border border-[var(--tint)] text-[12px] font-semibold text-primary press">{x}</button>)}
    </div>
  );

  return (
    <div className="min-h-full pb-24 bg-bg">
      <TopBar back title={t('사람 찾기')} />
      <div className="px-4 pt-2">
        <form className="relative" onSubmit={(e) => { e.preventDefault(); go(draft); }}>
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input className="pl-10 pr-12 h-12 rounded-full bg-[#F4F9FF] border-[var(--tint)]" autoFocus={!q} placeholder={t('혹시 찾는 사람이 있나요?')} value={draft} onChange={(e) => setDraft(e.target.value)} enterKeyHint="search" />
          <button type="submit" aria-label={t('찾기')} disabled={!draft.trim()} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-primary text-white grid place-items-center press disabled:opacity-35"><ArrowRight size={16} /></button>
        </form>
        {!plus && <p className="mt-1.5 ml-3 text-[11px] text-ink-3">{t('오늘 남은 자연어 찾기')} {Math.max(0, FREE_NL_SEARCHES_PER_DAY - used)}/{FREE_NL_SEARCHES_PER_DAY}</p>}
      </div>

      {/* 아직 입력 전 — 예시 · 최근 검색 */}
      {!q && (
        <div className="px-4 mt-5 space-y-5">
          <section>
            <h2 className="text-[13px] font-bold text-ink-2 flex items-center gap-1"><Sparkles size={13} />{t('이렇게 찾아보세요')}</h2>
            <div className="mt-2">{exampleChips}</div>
          </section>
          <section>
            <h2 className="text-[13px] font-bold text-ink-2 flex items-center gap-1"><Clock size={13} />{t('최근 찾은 것')}</h2>
            {recent.length === 0
              ? <p className="mt-2 text-[12px] text-ink-3">{t('아직 없어요. 찾은 문장은 나만 볼 수 있게 여기 남아요.')}</p>
              : <div className="mt-2 flex flex-col">{recent.map((x) => (
                <button key={x} onClick={() => go(x)} className="h-11 flex items-center gap-2.5 text-left text-[14px] text-ink press border-b border-line/60 last:border-0"><Clock size={14} className="text-ink-3 shrink-0" /><span className="flex-1 truncate">{x}</span><ArrowRight size={14} className="text-ink-3" /></button>
              ))}</div>}
          </section>
          <PrivacyNote text={t('공개 프로필만으로 찾아요. 성별·나이·종교 같은 민감한 조건은 쓰지 않아요.')} />
        </div>
      )}

      {/* 하루 무료 한도 */}
      {q && limited && (
        <div className="mx-4 mt-5 rounded-[24px] border border-dashed border-line bg-surface-2/60 p-4" role="alert">
          <div className="text-[15px] font-bold text-ink">{t('오늘 자연어 찾기를 다 썼어요 — 필터로 찾거나 내일 다시')}</div>
          <p className="mt-1 text-[12px] text-ink-3">{t('무료는 하루')} {FREE_NL_SEARCHES_PER_DAY}{t('번까지예요. 필터 찾기는 계속 무료예요.')}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" icon={<SlidersHorizontal size={14} />} onClick={() => nav('/people?tab=search')}>{t('필터로 찾기')}</Button>
            <Button size="sm" icon={<Sparkles size={14} />} onClick={() => nav('/plus')}>{t('AroundU+ 보기')}</Button>
          </div>
        </div>
      )}

      {q && !limited && (
        <div className="px-4 mt-4">
          <Section loading={sec.loading} error={sec.error} onRetry={sec.retry}
            skeleton={<div><p className="text-[13px] font-semibold text-ink-3 animate-pulse">{t('조건을 읽는 중…')}</p><SectionSkeleton count={2} className="mt-3" /></div>}
            empty={parseFailed && (
              <div className="rounded-[24px] bg-surface-2/60 p-4">
                <div className="text-[15px] font-bold">{t('무엇을 찾는지 조금만 더 적어주세요')}</div>
                {parsed?.dropped.length ? <PrivacyNote className="mt-1" text={t('성별·나이·종교 같은 민감한 조건은 쓰지 않아요')} /> : <p className="mt-1 text-[12px] text-ink-3">{t('도시 · 학교 · 분야 · 관심사 중 하나만 있어도 돼요.')}</p>}
                <div className="mt-3">{exampleChips}</div>
              </div>
            )}>
            {/* 읽어낸 조건 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-ink-3 mr-0.5">{t('읽어낸 조건')}</span>
              {chips.map((c) => (
                <span key={chipKey(c)} className="h-8 pl-3 pr-1 rounded-full bg-primary-soft text-primary text-[12px] font-bold inline-flex items-center gap-1">
                  {c.label}
                  <button onClick={() => setRemoved((r) => [...r, chipKey(c)])} aria-label={`${c.label} ${t('빼기')}`} className="h-6 w-6 rounded-full grid place-items-center hover:bg-white/60 press"><X size={12} /></button>
                </span>
              ))}
              {removed.length > 0 && <button onClick={() => setRemoved([])} className="h-8 px-2 text-[12px] font-semibold text-ink-3 underline underline-offset-2 press">{t('처음 조건으로')}</button>}
            </div>
            {parsed && parsed.dropped.length > 0 && <PrivacyNote className="mt-2" text={t('성별·나이·종교 같은 민감한 조건은 쓰지 않아요')} />}

            {allRemoved ? (
              <SectionEmpty className="mt-4" emoji="🧹" title={t('조건을 모두 뺐어요')} description={t('다시 적거나 처음 조건으로 돌아가요.')} action={<Button size="sm" variant="outline" onClick={() => setRemoved([])}>{t('처음 조건으로')}</Button>} />
            ) : results.length === 0 ? (
              <div className="mt-4 rounded-[24px] border border-line bg-white p-4">
                <div className="text-[15px] font-bold text-ink">{t('가까운 네트워크에서 바로 떠오르는 사람이 없어요')}</div>
                <p className="mt-0.5 text-[12px] text-ink-3">{t('조건을 하나 빼면 더 넓게 찾을 수 있어요.')}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {relaxations(chips).map((c) => (
                    <button key={chipKey(c)} onClick={() => setRemoved((r) => [...r, chipKey(c)])} className="h-10 px-3.5 rounded-full bg-surface-2 text-left text-[13px] font-semibold text-primary flex items-center gap-2 press">
                      <X size={13} />{lang === 'en' ? `Try again without '${c.label}'` : `'${c.label}' 빼고 다시 찾기`}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-primary text-white p-3.5">
                  <div className="font-display text-[16px] font-bold">{t('건너건너 물어볼까요?')}</div>
                  <p className="mt-0.5 text-[12px] text-white/80">{t('아는 사람들의 네트워크에 조용히 물어봐요. 해당되는 사람만 답해요.')}</p>
                  <Button size="sm" variant="secondary" className="mt-2.5" icon={<Send size={14} />} onClick={askNetwork}>{t('건너건너 물어보기')}</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-end gap-2">
                  <h2 className="flex-1 font-display text-[18px] font-bold text-ink leading-tight">{t('가까운 네트워크에서')} {results.length}{t('명을 찾았어요')}</h2>
                  <button onClick={save} disabled={saving} className="h-8 px-3 rounded-full border border-line bg-white text-[12px] font-bold text-primary inline-flex items-center gap-1 press shrink-0">
                    {plus ? <Star size={13} /> : <Lock size={12} />}{t('검색 저장')}
                  </button>
                </div>
                <p className="mt-0.5 text-[12px] text-ink-3 flex items-center gap-1"><ShieldCheck size={12} />{t('공개 범위 안에서만 보여요')}</p>
                <div className="mt-3 space-y-3">
                  {shown.map((x) => <MaskedPersonRow key={x.u.id} user={x.u} reasons={x.reasons} onConnect={connect} busy={busyId === x.u.id} />)}
                </div>
                {advancedLocked && results.length > shown.length && (
                  <div className="mt-3 rounded-[24px] bg-[linear-gradient(120deg,var(--tint),var(--tint))] p-4">
                    <div className="text-[14px] font-bold text-primary">{lang === 'en' ? `${results.length - shown.length} more match these combined conditions` : `조건을 겹친 결과 ${results.length - shown.length}명이 더 있어요`}</div>
                    <p className="mt-0.5 text-[12px] text-ink-2">{t('조건 2개 이상은 AroundU+ 에서 모두 보여요. 조건 하나씩은 무료예요.')}</p>
                    <div className="mt-2.5 flex gap-2">
                      <Button size="sm" onClick={() => nav('/plus')}>{t('AroundU+ 보기')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => nav('/people?tab=search')}>{t('필터로 찾기')}</Button>
                    </div>
                  </div>
                )}
                <button onClick={askNetwork} className="mt-4 w-full h-11 rounded-full border border-line bg-white text-[13px] font-semibold text-primary inline-flex items-center justify-center gap-1.5 press">
                  <Send size={14} />{t('건너건너 물어볼까요?')}
                </button>
              </>
            )}
          </Section>
        </div>
      )}

      <PaywallSheet open={!!paywall} onClose={() => setPaywall(null)} reason={paywall ?? undefined} />
    </div>
  );
}
