import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUp, Sparkles, UserPlus, Coffee, Users, ShieldCheck, Lock, MessageCircleQuestion } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { answerQuery, aiLine, aiQuestionExamples, type AiAnswer, type AiPerson } from '@core/lib/ai-answer';
import { profileView } from '@core/lib/privacy';
import { stageKind } from '@core/lib/stage';
import { isPlus, swipesLeft } from '@core/lib/monetization';
import { CATEGORY_EMOJI, CATEGORY_COLORS } from '@core/lib/labels';
import { formatDate, formatTime } from '@core/lib/format';
import type { User, Activity } from '@core/types';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { ReasonChips } from '@/components/people_ReasonChips';
import { JoinButton } from '@/components/cards/JoinButton';
import { PaywallSheet } from '@/components/social/PaywallSheet';
import { maskUser } from '@/pages/people/NaturalSearchPage';

/** 모든 상황 예시 — 단계별 예시 3개를 먼저, 나머지는 뒤에 */
function allExamples(kind: 'undergrad' | 'grad' | 'alumni'): string[] {
  return [...new Set([...aiQuestionExamples(kind), ...aiQuestionExamples('alumni'), ...aiQuestionExamples('grad'), ...aiQuestionExamples('undergrad')])];
}

/**
 * /ai?q= — AI에게 묻기. 검색 결과 목록이 아니라 대화로 답한다:
 * 사람 추천 → 왜 이 사람인지 → 공통점·서로 아는 사람 → 관련 모임 → 다음 행동.
 * "누구를 만나야 할지 모를 때"는 사람 유형부터 제안하고 유형마다 실제 사람을 붙인다.
 */
export function AiChatPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const kind = stageKind(me);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const run = useAppStore((s) => s.run);

  // 답을 내기 전 잠깐 "찾는 중" — 사람을 찾고 있다는 느낌
  useEffect(() => {
    if (!q) return;
    setThinking(true);
    const id = setTimeout(() => setThinking(false), 650);
    run(() => api.users.pushRecentSearch(me.id, q)).catch(() => { /* 최근 검색은 실패해도 조용히 */ });
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const answer = useMemo(() => (q ? answerQuery(snap, me, v.visibleUsers, v.visibleActivities, q, lang, (u) => v.canSeeField(u, 'timetable')) : null), [q, snap, me, v]);
  const ask = (text: string) => { const s = text.trim(); if (!s) return; setDraft(''); setParams({ q: s }, { replace: !!q }); };
  const bottom = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title={t('AI에게 묻기')} />
      <div className="px-4 pt-1 space-y-4">
        {!q && <Intro kind={kind} onAsk={ask} />}
        {q && (
          <>
            <div className="flex justify-end"><div className="max-w-[85%] rounded-[20px] rounded-br-md bg-primary text-white px-4 py-2.5 text-[14px] leading-relaxed">{q}</div></div>
            {thinking || !answer
              ? <AiBubble><p className="text-[14px] text-ink-2 animate-pulse">{t('네트워크에서 찾는 중…')}</p></AiBubble>
              : <Answer a={answer} q={q} onAsk={ask} onPaywall={() => setPaywall(true)} />}
          </>
        )}
        <div ref={bottom} />
      </div>

      {/* 이어서 묻기 */}
      <form onSubmit={(e) => { e.preventDefault(); ask(draft); }} className="fixed bottom-0 inset-x-0 z-20 bg-bg/95 backdrop-blur border-t border-line px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]">
        <div className="max-w-[520px] mx-auto relative">
          <Sparkles size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={q ? t('이어서 물어보세요') : t('무엇이 필요한지 말해 주세요')} className="w-full h-12 rounded-full bg-card border border-line pl-10 pr-12 text-[14px] outline-none focus:border-primary" enterKeyHint="send" />
          <button type="submit" aria-label={t('보내기')} disabled={!draft.trim()} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-primary text-white grid place-items-center press disabled:opacity-35"><ArrowUp size={17} /></button>
        </div>
      </form>
      <PaywallSheet open={paywall} onClose={() => setPaywall(false)} reason="search" />
    </div>
  );
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 items-start">
      <span className="h-8 w-8 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0 mt-0.5"><Sparkles size={15} /></span>
      <div className="flex-1 min-w-0 space-y-3">{children}</div>
    </div>
  );
}

function Intro({ kind, onAsk }: { kind: 'undergrad' | 'grad' | 'alumni'; onAsk: (q: string) => void }) {
  return (
    <AiBubble>
      <div className="rounded-[20px] rounded-tl-md bg-card border border-line p-4">
        <p className="text-[15px] font-bold text-ink leading-snug">{t('무엇이 필요한지 말해 주세요')}</p>
        <p className="mt-1 text-[13px] text-ink-2 leading-relaxed">{t('실제 AroundU 사람들 중에서 찾아, 왜 이 사람인지와 서로 아는 사람, 같이 갈 만한 모임까지 알려드려요. 누구를 찾아야 할지 모르겠다면 그것부터 물어봐도 돼요.')}</p>
      </div>
      <div className="flex flex-col gap-2">
        {allExamples(kind).map((x) => (
          <button key={x} onClick={() => onAsk(x)} className="text-left rounded-2xl bg-primary-soft/60 border border-primary-soft px-3.5 py-2.5 text-[13px] font-semibold text-ink press flex items-start gap-2">
            <MessageCircleQuestion size={15} className="text-primary shrink-0 mt-0.5" /><span>{x}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-3 flex items-center gap-1"><ShieldCheck size={12} />{t('공개 프로필만으로 찾아요. 성별·나이·종교 같은 민감한 조건은 쓰지 않아요.')}</p>
    </AiBubble>
  );
}

function Answer({ a, q, onAsk, onPaywall }: { a: AiAnswer; q: string; onAsk: (q: string) => void; onPaywall: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const plus = isPlus(v.me);
  const FREE = 3;
  const shown = plus ? a.people : a.people.slice(0, FREE);
  const more = a.total - shown.length;
  return (
    <AiBubble>
      <div className="rounded-[20px] rounded-tl-md bg-card border border-line p-3.5">
        <p className="text-[14px] text-ink leading-relaxed">{a.lead}</p>
        {a.understood.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-ink-3 mr-0.5">{t('이렇게 이해했어요')}</span>
            {a.understood.map((u) => <span key={u} className="h-6 px-2.5 rounded-full bg-primary-soft text-primary text-[11px] font-bold inline-flex items-center">{u}</span>)}
          </div>
        )}
      </div>

      {/* 누구를 만나야 할지 모를 때 — 사람 유형 → 실제 사람 */}
      {a.kinds.map((k, i) => (
        <section key={k.title} className="rounded-[20px] bg-primary-soft/50 p-3">
          <div className="flex items-start gap-2 px-0.5">
            <span className="h-6 w-6 rounded-full bg-primary text-white text-[12px] font-bold grid place-items-center shrink-0">{i + 1}</span>
            <div className="min-w-0"><h3 className="text-[15px] font-bold text-ink leading-snug">{k.title}</h3><p className="text-[12px] text-ink-2 leading-relaxed mt-0.5">{k.why}</p></div>
          </div>
          <div className="mt-2.5 space-y-2">{k.people.length ? k.people.map((p) => <PersonCard key={p.user.id} p={p} compact />) : <p className="px-1 text-[12px] text-ink-3">{t('아직 AroundU에 이런 분이 없어요. 지인들에게 물어볼 수 있어요.')}</p>}</div>
        </section>
      ))}

      {shown.length > 0 && <div className="space-y-2.5">{shown.map((p) => <PersonCard key={p.user.id} p={p} research={a.intent === 'research'} />)}</div>}
      {!plus && more > 0 && a.intent !== 'advice' && (
        <button onClick={onPaywall} className="w-full rounded-2xl bg-card border border-dashed border-line p-3 text-left press">
          <span className="text-[13px] font-bold text-primary inline-flex items-center gap-1"><Lock size={12} />{lang === 'en' ? `${more} more` : `${more}명 더 있어요`}</span>
          <span className="block text-[12px] text-ink-3 mt-0.5">{t('여러 조건을 겹친 결과는 AroundU+ 에서 모두 보여요.')}</span>
        </button>
      )}

      {/* 관련 모임 · 그룹 */}
      {(a.meets.length > 0 || a.groups.length > 0) && (
        <section className="rounded-[20px] bg-card border border-line overflow-hidden">
          <h3 className="px-3.5 pt-3 text-[13px] font-bold text-ink flex items-center gap-1.5"><Users size={14} className="text-primary" />{a.intent === 'moving' ? t('그 도시 모임도 있어요') : a.intent === 'meal' ? t('이미 열린 모임') : t('같이 가 볼 만한 모임')}</h3>
          <div className="divide-y divide-line">
            {a.meets.map((m) => <MeetRow key={m.id} a={m} />)}
            {a.groups.map((g) => (
              <button key={g.id} onClick={() => nav(`/orgs/${g.id}`)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left press">
                <Avatar emoji={g.logo.emoji} hue={g.logo.hue} url={g.logo.url} size={40} />
                <span className="flex-1 min-w-0"><span className="block text-[14px] font-bold truncate">{g.name}</span><span className="block text-[12px] text-ink-3 truncate">{g.description}</span></span>
                <ArrowRight size={15} className="text-ink-3 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 다음 행동 */}
      <div className="flex flex-wrap gap-1.5">
        {a.followups.map((f) => (
          <button key={f.label} onClick={() => (f.q ? onAsk(f.q) : f.to && nav(f.to))} className="h-9 px-3.5 rounded-full bg-card border border-line text-[12px] font-semibold text-primary press">{f.label}</button>
        ))}
        <button onClick={() => nav(`/people/find?q=${encodeURIComponent(q)}`)} className="h-9 px-3.5 rounded-full text-[12px] font-semibold text-ink-3 press">{t('조건 칩으로 보기')}</button>
      </div>
    </AiBubble>
  );
}

function MeetRow({ a }: { a: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <button onClick={() => nav(`/activities/${a.id}`)} className="h-10 w-10 rounded-xl grid place-items-center text-[18px] shrink-0 press" style={{ background: `color-mix(in srgb, ${CATEGORY_COLORS[a.category]} 10%, transparent)` }}>{CATEGORY_EMOJI[a.category]}</button>
      <button onClick={() => nav(`/activities/${a.id}`)} className="flex-1 min-w-0 text-left press">
        <span className="block text-[14px] font-bold truncate">{a.title}</span>
        <span className="block text-[12px] text-ink-3 truncate">{formatDate(a.date)} {formatTime(a.startTime)} · {a.place.area ?? a.place.name} · {v.approvedCount(a.id)}/{a.capacity >= 999 ? '∞' : a.capacity}</span>
        {a.newcomers && <span className="inline-block mt-0.5 text-[10px] font-bold text-primary bg-primary-soft rounded-full px-1.5">{t('새로 온 사람 환영')}</span>}
      </button>
      <JoinButton activity={a} size="sm" label={t('참여')} className="shrink-0" />
    </div>
  );
}

/** 사람 한 명 — 누구 → 왜 → 공통점·서로 아는 사람 → 다음 행동 (공개 범위 안에서만) */
export function PersonCard({ p, compact, research }: { p: AiPerson; compact?: boolean; research?: boolean }) {
  const nav = useNavigate();
  const v = useViewer();
  const snap = useSnapshot();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const view = profileView(snap, v.me, p.user);
  const u: User = maskUser(p.user, view);
  const sent = !!v.pendingOut(u.id);
  const friend = v.isFriend(u.id);
  const connect = async () => {
    if (!isPlus(v.me) && swipesLeft(v.me) <= 0) { setPaywall(true); return; }
    setBusy(true);
    try { await run(() => api.relationships.sendFriendRequest(v.me.id, u.id), `${u.nickname}${t('님에게 연결 요청을 보냈어요.')}`); } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <article className="rounded-[20px] bg-card border border-line p-3.5">
      <button onClick={() => nav(`/users/${u.id}`)} className="w-full flex items-center gap-3 text-left press">
        <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={compact ? 42 : 48} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 min-w-0"><span className="text-[15px] font-bold text-ink shrink-0">{u.nickname}</span><SchoolBadge user={u} withYear size="sm" className="min-w-0 truncate" /></span>
          <span className="block text-[12px] text-ink-2 truncate mt-0.5">{aiLine(u, false)}</span>
          {p.open && <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-semibold text-mint"><span className="h-1.5 w-1.5 rounded-full bg-mint" />{p.open}</span>}
        </span>
      </button>
      {p.why && <p className="mt-2.5 text-[13px] text-ink leading-relaxed"><Sparkles size={12} className="inline -mt-0.5 mr-1 text-primary" /><b className="font-semibold">{t('추천 이유')}</b> · {p.why}</p>}
      {p.keywords.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">{p.keywords.map((k) => <span key={k} className="h-6 px-2 rounded-full bg-primary-soft text-primary text-[11px] font-bold inline-flex items-center">{research ? `# ${k}` : k}</span>)}</div>
      )}
      {!compact && <ReasonChips reasons={p.reasons} max={3} className="mt-2" />}
      {p.via && (
        <div className="mt-2 rounded-xl bg-surface-2/70 px-2.5 py-2 flex items-center gap-2">
          <Avatar emoji={p.via.avatar.emoji} hue={p.via.avatar.hue} url={p.via.avatar.url} size={22} />
          <span className="flex-1 min-w-0 text-[12px] text-ink-2 truncate">{lang === 'en' ? `You can get an intro through ${p.via.nickname}` : `${p.via.nickname}님을 통해 소개받을 수 있어요`}{p.mutualCount > 1 ? (lang === 'en' ? ` +${p.mutualCount - 1}` : ` 외 ${p.mutualCount - 1}명`) : ''}</span>
          <button onClick={() => nav(`/people/second`)} className="text-[12px] font-bold text-primary press shrink-0">{lang === 'en' ? 'Ask for intro' : '소개 부탁'}</button>
        </div>
      )}
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => nav(`/users/${u.id}`)}>{t('프로필 보기')}</Button>
        {friend
          ? <Button size="sm" variant="secondary" className="flex-1" onClick={() => nav(`/users/${u.id}`)}>{t('이미 연결됨')}</Button>
          : <Button size="sm" variant="secondary" className="flex-1" loading={busy} disabled={sent} icon={research ? <Coffee size={14} /> : <UserPlus size={14} />} onClick={connect}>{sent ? t('요청 보냄') : research ? t('커피 한잔 요청') : t('연결 요청')}</Button>}
      </div>
      <PaywallSheet open={paywall} onClose={() => setPaywall(false)} reason="limit" />
    </article>
  );
}
