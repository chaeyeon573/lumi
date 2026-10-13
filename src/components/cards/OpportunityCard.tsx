import { useNavigate } from 'react-router-dom';
import { t, lang } from '@core/i18n';
import { Bookmark, Clock, MapPin, Users, ExternalLink, BadgeCheck, AlarmClock } from 'lucide-react';
import type { Opportunity } from '@core/types';
import { Cover, Tag, Button } from '@/components/ui';
import { OPP_TYPE_COLORS, OPP_TYPE_EMOJI, OPP_TYPE_LABELS, PERSON_ROLE_LABELS, RSVP_LABELS, RSVP_EMOJI } from '@core/lib/labels';
import { formatDateTime } from '@core/lib/format';
import { dday, daysUntil, isTogetherType } from '@core/lib/recommend';
import { Heart } from 'lucide-react';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';
import { badgeOf } from '@core/lib/listings';

export function useOppState(o: Opportunity) {
  const intents = useAppStore((s) => s.opportunityIntents);
  const v = useViewer();
  const mine = intents.find((i) => i.opportunityId === o.id && i.userId === v.me.id);
  const others = intents.filter((i) => i.opportunityId === o.id && i.userId !== v.me.id);
  const matchCount = others.filter((i) => { const u = v.userById(i.userId); return u && (o.rolesNeeded ? u.canOffer.some((r) => v.me.lookingFor.includes(r)) || v.me.canOffer.some((r) => u.lookingFor.includes(r)) : v.me.interests.some((x) => u.interests.includes(x))); }).length;
  return { mine, others, matchCount };
}

export function OpportunityCard({ o, reasons, variant = 'feed', className }: { o: Opportunity; reasons?: string[]; /** text: 사진 없이 글만 */ variant?: 'feed' | 'row' | 'text'; className?: string }) {
  const nav = useNavigate();
  const run = useAppStore((s) => s.run);
  const v = useViewer();
  const { mine, others, matchCount } = useOppState(o);
  const color = OPP_TYPE_COLORS[o.type];
  const urgent = o.deadline && daysUntil(o.deadline) <= 7 && daysUntil(o.deadline) >= 0;

  if (variant === 'row') {
    return (
      <button onClick={() => nav(`/opportunities/${o.id}`)} className={cn('card w-full flex gap-3 p-3 text-left press', className)}>
        <span className="h-[52px] w-[52px] rounded-xl grid place-items-center text-[24px] shrink-0" style={{ background: `${color}1A` }}>{OPP_TYPE_EMOJI[o.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5"><span className="text-[11px] font-bold" style={{ color }}>{OPP_TYPE_EMOJI[o.type]} {OPP_TYPE_LABELS[o.type]}</span>{o.deadline && <Tag tone={urgent ? 'danger' : 'neutral'} className="h-5">{dday(o.deadline)}</Tag>}{!o.deadline && o.date && <Tag tone="primary" className="h-5">{badgeOf(o, lang === 'en').text}{o.startTime ? ` · ${o.startTime}` : ''}</Tag>}</div>
          <div className="text-[14px] font-bold truncate mt-0.5">{o.title}</div>
          <div className="text-[12px] text-ink-3 truncate">{o.host}</div>
          <div className="text-[12px] text-ink-2 mt-1 flex items-center gap-2">{isTogetherType(o.type) ? <><span className="flex items-center gap-1"><Users size={11} />{others.length}{t('명 관심')}</span>{matchCount > 0 && <span className="text-primary font-semibold">{t('나와 맞는')} {matchCount}{t('명')}</span>}</> : <>{o.benefit && <span className="truncate">🎁 {o.benefit}</span>}</>}</div>
        </div>
      </button>
    );
  }

  const textMode = true as boolean; // 기회 카드에는 사진을 쓰지 않는다
  return (
    <article className={cn('card overflow-hidden', className)}>
      {textMode ? (
        <button onClick={() => nav(`/opportunities/${o.id}`)} className="w-full flex items-center gap-2 px-3.5 pt-3.5 text-left">
          <span className="h-9 w-9 rounded-xl grid place-items-center text-[18px] shrink-0" style={{ background: `${color}1A` }}>{OPP_TYPE_EMOJI[o.type]}</span>
          <span className="text-[11px] font-bold" style={{ color }}>{OPP_TYPE_LABELS[o.type]}</span>
          {o.official && <Tag tone="gold" className="h-5"><BadgeCheck size={11} /> {t('공식')}</Tag>}
          {o.deadline && <Tag tone={urgent ? 'danger' : 'neutral'} className="h-5 ml-auto"><AlarmClock size={11} /> {dday(o.deadline)}</Tag>}
        </button>
      ) : (
      <button onClick={() => nav(`/opportunities/${o.id}`)} className="block w-full text-left">
        <div className="relative">
          <Cover emoji={o.cover.emoji} hue={o.cover.hue} url={o.cover.url} className="h-[120px]" size={48} />
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="rounded-lg px-2 h-6 inline-flex items-center text-[11px] font-bold text-white" style={{ background: color }}>{OPP_TYPE_EMOJI[o.type]} {OPP_TYPE_LABELS[o.type]}</span>
            {o.official && <Tag tone="gold"><BadgeCheck size={11} /> {t('공식')}</Tag>}
          </div>
          {o.deadline && <span className={cn('absolute top-3 right-3 rounded-lg px-2 h-6 inline-flex items-center gap-1 text-[11px] font-bold', urgent ? 'bg-danger text-white' : 'bg-white/90 text-ink')}><AlarmClock size={11} />{dday(o.deadline)}</span>}
        </div>
      </button>
      )}
      <div className={cn('p-3.5', textMode && 'pt-2')}>
        <button onClick={() => nav(`/opportunities/${o.id}`)} className="text-left"><h3 className="text-[16px] font-bold leading-snug">{o.title}</h3></button>
        <div className="text-[12px] text-ink-3 mt-0.5">{o.host}</div>
        {reasons && reasons.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{reasons.slice(0, 2).map((r) => <Tag key={r} tone="primary">{r}</Tag>)}</div>}
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-ink-2">
          {o.date && <span className="flex items-center gap-1 truncate"><Clock size={12} className="text-ink-3" />{formatDateTime(o.date, o.startTime ?? '00:00')}</span>}
          {o.place && <span className="flex items-center gap-1 truncate"><MapPin size={12} className="text-ink-3" />{o.place.name}</span>}
          <span className="flex items-center gap-1 truncate col-span-2">👤 {o.eligibility}</span>
          {o.benefit && <span className="flex items-center gap-1 truncate col-span-2">🎁 {o.benefit}</span>}
          {o.rolesNeeded && <span className="col-span-2 flex flex-wrap gap-1">{t('필요한 역할:')} {o.rolesNeeded.map((r) => <Tag key={r} className="h-5">{PERSON_ROLE_LABELS[r]}</Tag>)}</span>}
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-[12px]">
          <span className="flex items-center gap-1 text-ink-2"><Users size={12} />{others.length}{t('명 관심')}</span>
          {isTogetherType(o.type) && others.filter((i) => i.intent === 'solo' || i.intent === 'company').length > 0 && <span className="text-accent font-semibold">{others.filter((i) => i.intent === 'solo' || i.intent === 'company').length}{t('명이 같이 갈 사람을 찾고 있어요')}</span>}
          {matchCount > 0 && <span className="text-primary font-semibold">{t('나와 맞는 사람')} {matchCount}{t('명')}</span>}
          {o.sourceUrl && <a href={o.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-0.5 text-ink-3"><ExternalLink size={11} />{o.sourceLabel}</a>}
        </div>
        <div className="mt-3 flex gap-2">
          {isTogetherType(o.type) ? (<>
            <button onClick={() => run(() => api.opportunities.setIntent(o.id, v.me.id, mine?.intent === 'interested' ? null : 'interested'), mine ? undefined : t('관심 표시했어요.'))} aria-label={t('관심')} className={cn('h-9 w-9 rounded-xl grid place-items-center press', mine?.intent === 'interested' ? 'bg-heart text-white' : 'bg-heart-soft text-heart')}><Heart size={16} fill={mine?.intent === 'interested' ? 'currentColor' : 'none'} /></button>
            <Button size="sm" variant={mine && mine.intent !== 'interested' ? 'secondary' : 'primary'} className="flex-1" onClick={() => nav(`/opportunities/${o.id}`)}>{mine && mine.intent !== 'interested' ? `${RSVP_EMOJI[mine.intent]} ${RSVP_LABELS[mine.intent]}` : t('같이 갈래요')}</Button>
            <Button size="sm" variant="outline" onClick={() => nav(`/opportunities/${o.id}?tab=people`)}>{t('사람 찾기')}</Button>
          </>) : (
            <Button size="sm" variant={mine?.intent === 'applied' ? 'secondary' : 'outline'} className="flex-1" onClick={() => nav(`/opportunities/${o.id}`)}>{mine?.intent === 'applied' ? t('지원 완료') : t('자세히')}</Button>
          )}
          <button onClick={() => run(() => api.opportunities.toggleSave(o.id, v.me.id), mine?.saved ? undefined : t('저장했어요. 마감 3일 전에 알려드릴게요.'))} className={cn('h-9 w-9 rounded-xl grid place-items-center press', mine?.saved ? 'bg-primary text-white' : 'bg-surface-2 text-ink-2')} aria-label={t('저장')}><Bookmark size={16} fill={mine?.saved ? 'currentColor' : 'none'} /></button>
        </div>
      </div>
    </article>
  );
}
