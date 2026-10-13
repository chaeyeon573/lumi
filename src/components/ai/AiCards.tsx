import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, CalendarDays, Users, Sparkles } from 'lucide-react';
import type { AiCard } from '@core/api/types';
import { lang } from '@core/i18n';
import { OPP_TYPE_LABELS, ORG_TYPE_LABELS } from '@core/lib/labels';
import { dday, daysUntil } from '@core/lib/recommend';
import { cn } from '@core/lib/cn';
import { campusDate } from '@core/lib/listings';
import { todayISO } from '@core/lib/format';
import { SampleTag } from '@/components/ui/SampleTag';

// 날짜만('2026-10-14') 오기도, 시각이 붙은 ISO('…T12:00:00.000Z')로 오기도 한다 — 둘 다 캠퍼스 날짜로 맞춘다
const fmtDate = (iso: string) => new Date(`${campusDate(iso)}T12:00:00`).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** AI 답변·추천에 붙는 카드 — 앱 안 화면으로 가거나(공고·동아리·활동) 공식 페이지를 연다(수업) */
export function AiCardView({ card, compact }: { card: AiCard; compact?: boolean }) {
  const nav = useNavigate();
  const base = 'w-full text-left rounded-2xl bg-surface border border-line px-3.5 py-3 flex items-start gap-3 press';
  if (card.kind === 'listing') {
    const soon = card.deadline && daysUntil(card.deadline) <= 7;
    return (
      <button onClick={() => nav(`/opportunities/${card.id}`)} className={base}>
        <span className="h-9 w-9 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0"><CalendarDays size={17} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold text-primary leading-snug line-clamp-2">{card.title}</span>
          <span className="block text-[12px] text-ink-3 mt-0.5 truncate">{[OPP_TYPE_LABELS[card.type], card.host, card.date && !(card.deadline && campusDate(card.date) < todayISO()) ? `${fmtDate(card.date)}${card.startTime ? ` ${card.startTime}` : ''}` : '', card.place].filter(Boolean).join(' · ')}</span>
          {!compact && card.benefit && <span className="block text-[12px] text-ink-2 mt-0.5 truncate">{card.benefit}</span>}
        </span>
        {card.deadline && <span className={cn('h-6 px-2 rounded-full text-[11px] font-bold shrink-0 grid place-items-center', soon ? 'bg-danger/10 text-danger v2:bg-lime-400 v2:text-night' : 'bg-surface-2 text-ink-2')}>{dday(card.deadline)}</span>}
      </button>
    );
  }
  if (card.kind === 'club') {
    return (
      <button onClick={() => nav(`/orgs/${card.id}`)} className={base}>
        <span className="h-9 w-9 rounded-xl bg-accent-soft text-primary grid place-items-center shrink-0"><Users size={17} /></span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5"><span className="text-[14px] font-semibold text-primary truncate">{card.name}</span>{card.recruiting && <span className="h-5 px-2 rounded-full bg-accent-soft text-primary text-[10px] font-bold shrink-0">{lang === 'en' ? 'Recruiting' : '모집 중'}</span>}</span>
          <span className="block text-[12px] text-ink-3 mt-0.5 line-clamp-2">{ORG_TYPE_LABELS[card.type]}{card.summary ? ` · ${card.summary}` : ''}</span>
        </span>
      </button>
    );
  }
  if (card.kind === 'course') {
    const link = card.syllabusUrl ?? card.url;
    return (
      <a href={link} target="_blank" rel="noreferrer" onClick={(e) => { if (!link) e.preventDefault(); }} className={base}>
        <span className="h-9 w-9 rounded-xl bg-surface-2 text-primary grid place-items-center shrink-0"><BookOpen size={17} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold text-primary truncate">{card.code} · {card.title}</span>
          <span className="block text-[12px] text-ink-3 mt-0.5 truncate">{[card.when, card.location, card.instructor].filter(Boolean).join(' · ')}</span>
        </span>
        {link && <ArrowUpRight size={16} className="text-ink-3 shrink-0 mt-1" />}
      </a>
    );
  }
  return (
    <button onClick={() => nav(`/activities/${card.id}`)} className={base}>
      <span className="h-9 w-9 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0"><Sparkles size={17} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold text-primary truncate">{card.sample && <SampleTag />}{card.title}</span>
        <span className="block text-[12px] text-ink-3 mt-0.5 truncate">{fmtDate(card.date)} {card.startTime} · {card.place}</span>
      </span>
    </button>
  );
}
