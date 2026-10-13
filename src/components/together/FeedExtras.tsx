import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail } from 'lucide-react';
import { lang } from '@core/i18n';
import type { DailyResults } from '@core/api/types';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { api } from '@core/api';
import { DAILY_QUESTIONS } from '@core/lib/labels';
import { todayISO } from '@core/lib/format';
import { badgeOf, campusDate } from '@core/lib/listings';
import { canGoTogether, campusToday, goingPeople, percentages } from '@core/lib/withpeople';
import { cn } from '@core/lib/cn';
import { PeopleLine } from './PeopleLine';

const en = lang === 'en';

/**
 * 오늘의 질문 — 한 번 눌러 답한다. 같은 학교에서 5명 이상 답해야 비율이 보인다 (서버가 집계해서 개인의 답은 내려오지 않는다).
 * "나 + 친구가 X" 는 내가 볼 수 있는 친구의 답만.
 */
export function TodaysQuestion() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const q = DAILY_QUESTIONS[0];
  const today = todayISO();
  const mine = me.dailyAnswer?.date === today && me.dailyAnswer.questionId === q.id ? me.dailyAnswer.answer : undefined;
  const [res, setRes] = useState<DailyResults | null>(null);
  const [busy, setBusy] = useState('');
  useEffect(() => {
    let alive = true;
    api.users.dailyResults(me.id, q.id, today).then((r) => { if (alive) setRes(r); }).catch(() => { /* 없으면 숫자 없이 */ });
    return () => { alive = false; };
  }, [me.id, q.id, today, mine]);
  const answer = async (key: string) => {
    if (busy) return;
    setBusy(key);
    try { await run(() => api.users.update(me.id, { dailyAnswer: { questionId: q.id, answer: key, date: today } })); } catch { /* toast */ } finally { setBusy(''); }
  };
  const pct = res?.counts ? percentages(res.counts, q.options.map((o) => o.key)) : null;
  const showPct = !!pct && !!mine;
  // 같은 답을 고른 친구 (내게 답이 보이는 친구만 — 서버가 공개 범위 밖의 답은 지워서 보낸다)
  const sameFriends = mine ? v.visibleUsers.filter((u) => v.isFriend(u.id) && u.dailyAnswer?.date === today && u.dailyAnswer.questionId === q.id && u.dailyAnswer.answer === mine) : [];
  const label = (k: string) => q.options.find((o) => o.key === k)?.label ?? k;
  const total = res?.total ?? 0;
  const min = res?.min ?? 5;
  return (
    <section className="card p-4 mb-3 bg-primary-soft border border-primary/10">
      <div className="text-[11px] font-bold uppercase tracking-wide text-primary flex items-center gap-1"><Sparkles size={12} />{en ? "Today's question · 1 tap" : '오늘의 질문 · 한 번 탭'}</div>
      <h3 className="text-[17px] font-extrabold mt-1 leading-snug">{q.text}</h3>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {q.options.map((o) => {
          const picked = mine === o.key;
          const p = pct?.[o.key] ?? 0;
          return (
            <button key={o.key} onClick={() => answer(o.key)} disabled={!!busy} aria-pressed={picked}
              className={cn('relative overflow-hidden h-10 rounded-xl px-3 text-left text-[13px] font-semibold border press flex items-center', picked ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink')}>
              {showPct && !picked && <span className="absolute inset-y-0 left-0 bg-surface-2" style={{ width: `${p}%` }} aria-hidden />}
              <span className="relative flex-1 truncate">{o.label}</span>
              {showPct && <span className="relative text-[12px] font-bold ml-2">{p}%</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] text-ink-2 mt-2.5">
        {showPct
          ? <>{en ? `${total} answered` : `${total}명 답함`}{sameFriends.length > 0 && <> · {en ? 'you' : '나'} + {sameFriends.slice(0, 2).map((u) => u.nickname).join(', ')}{sameFriends.length > 2 ? ` +${sameFriends.length - 2}` : ''} {en ? 'picked' : '도'} {label(mine!)}</>}</>
          : mine
            ? (en ? `Answers show up when ${min} people reply · ${total} so far` : `${min}명이 답하면 결과가 보여요 · 지금 ${total}명`)
            : (en ? `Tap one — results show once ${min} people at your school answer.` : `하나 골라보세요 — 같은 학교 ${min}명이 답하면 결과가 보여요.`)}
        {!showPct && mine && sameFriends.length > 0 && <> · {en ? 'you' : '나'} + {sameFriends[0].nickname} {en ? 'picked' : '도'} {label(mine)}</>}
      </p>
    </section>
  );
}

/** 피드가 조용할 때 — 사람을 데려오는 카드 */
export function QuietInvite() {
  const v = useViewer();
  const showToast = useAppStore((s) => s.showToast);
  const cls = v.me.timetable[0]?.name;
  const invite = async (who: 'floor' | 'class') => {
    const url = `${window.location.origin}/welcome`;
    const text = en ? (who === 'class' && cls ? `Our ${cls} section is on Lumi — come find people to study and hang out with: ${url}` : `I'm on Lumi — come find people on our floor to do campus things with: ${url}`)
      : (who === 'class' && cls ? `${cls} 수업 사람들 Lumi에 있어요 — 같이 공부하고 놀 사람 찾기: ${url}` : `Lumi에서 같은 층 사람들이랑 같이 다닐 사람 찾아요: ${url}`);
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      showToast(en ? 'Invite copied — paste it in your group chat.' : '초대 문구를 복사했어요.', 'success');
    } catch { /* 공유 취소 */ }
  };
  return (
    <section className="card p-4 my-3 flex gap-3 items-start">
      <span className="h-10 w-10 rounded-full bg-surface-2 grid place-items-center text-primary shrink-0"><Mail size={18} /></span>
      <div className="flex-1 min-w-0">
        <b className="text-[14px] block">{en ? 'Feed is quiet — bring your people' : '피드가 조용해요 — 사람들을 불러오세요'}</b>
        <p className="text-[12px] text-ink-2 mt-0.5">{en ? `Invite your floor${cls ? ` or your ${cls} section` : ' or your class'}. Their posts show up here first.` : `같은 층${cls ? `이나 ${cls} 수업` : '이나 수업'} 사람들을 초대하세요. 그 사람들의 글이 여기 먼저 보여요.`}</p>
        <div className="flex gap-2 mt-2.5">
          <button onClick={() => invite('floor')} className="h-8 px-3.5 rounded-full bg-primary text-white text-[12px] font-bold press">{en ? 'Invite your floor' : '같은 층 초대'}</button>
          <button onClick={() => invite('class')} className="h-8 px-3.5 rounded-full bg-surface-2 text-ink border border-line text-[12px] font-bold press">{en ? 'Invite your class' : '수업 사람 초대'}</button>
        </div>
      </div>
    </section>
  );
}

/** 피드 맨 아래, 조용할 때만 — 이번 주 행사 하나 + 같이 가기 */
export function MeanwhileThisWeek() {
  const nav = useNavigate();
  const v = useViewer();
  const opps = useAppStore((s) => s.opportunities);
  const pick = useMemo(() => {
    const school = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
    const today = campusToday();
    const weekEnd = new Date(Date.parse(`${today}T12:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
    const list = opps.filter((o) => (!o.schoolId || o.schoolId === school) && canGoTogether(o) && campusDate(o.date!) <= weekEnd);
    const score = (o: (typeof list)[number]) => goingPeople(v.snap, v.me, o.id).length * 10 + (o.tags.some((tg) => tg.toLowerCase() === 'free food') ? 3 : 0);
    return list.sort((a, b) => score(b) - score(a) || `${campusDate(a.date!)}${a.startTime}`.localeCompare(`${campusDate(b.date!)}${b.startTime}`))[0];
  }, [opps, v]);
  if (!pick) return null;
  const free = pick.tags.some((tg) => tg.toLowerCase() === 'free food');
  return (
    <section className="mt-5">
      <div className="flex items-center justify-between mb-1.5"><b className="text-[14px]">{en ? 'Meanwhile, this week' : '그동안, 이번 주에는'}</b><button onClick={() => nav(`/community?tab=opportunities&sub=${free ? 'free_food' : 'event'}`)} className="text-[12px] font-semibold text-primary">{en ? 'See all' : '모두 보기'}</button></div>
      <div className="card p-3.5">
        <button onClick={() => nav(`/opportunities/${pick.id}`)} className="w-full text-left">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-primary">{[free ? (en ? 'Free food' : '무료 음식') : (en ? 'Event' : '행사'), badgeOf(pick, en).text, pick.startTime].filter(Boolean).join(' · ')}</span>
          <span className="block text-[15px] font-bold mt-0.5 line-clamp-2">{pick.title}</span>
          <span className="block text-[12px] text-ink-3 truncate">{pick.place?.name ?? pick.host}</span>
        </button>
        <PeopleLine o={pick} quiet={false} />
      </div>
    </section>
  );
}
