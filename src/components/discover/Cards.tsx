import { useNavigate } from 'react-router-dom';
import { Lock, Users, ArrowUpRight } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { Activity, Opportunity } from '@core/types';
import { Avatar } from '@/components/ui';
import { SampleTag } from '@/components/ui/SampleTag';
import { JoinButton } from '@/components/cards/JoinButton';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { CATEGORY_LABELS, OPP_TYPE_LABELS, PERSON_ROLE_LABELS, CREW_TYPE_LABELS } from '@core/lib/labels';
import { CATEGORY_ICON, CATEGORY_TINT, OPP_ICON, OPP_TINT } from '@/lib/icons';
import { placeLabel } from '@core/lib/relations';
import { formatDate, formatTime } from '@core/lib/format';
import { dday } from '@core/lib/recommend';
import { cn } from '@core/lib/cn';

/** Now: 큰 색 면 카드 하나에 무엇·언제·어디 — 글 3줄 */
export function NowCard({ activity: a, inMin }: { activity: Activity; inMin: number }) {
  const nav = useNavigate();
  const v = useViewer();
  const participations = useAppStore((s) => s.participations);
  const host = v.userById(a.hostId);
  const approved = participations.filter((p) => p.activityId === a.id && p.status === 'approved');
  const mine = v.myParticipation(a.id);
  const place = placeLabel(a, v.me, mine?.status === 'approved');
  const when = inMin <= 0 ? t('진행 중') : inMin < 60 ? (lang === 'en' ? `in ${inMin} min` : `${inMin}분 후`) : formatTime(a.startTime);
  const faces = [a.hostId, ...approved.map((p) => p.userId)].slice(0, 4).map((id) => v.userById(id)).filter(Boolean);
  const Icon = CATEGORY_ICON[a.category];
  return (
    <article className="rounded-[24px] p-5 flex flex-col min-h-[196px]" style={{ background: CATEGORY_TINT[a.category] }}>
      <button onClick={() => nav(`/activities/${a.id}`)} className="text-left flex-1">
        <div className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase text-ink/70"><Icon size={14} />{CATEGORY_LABELS[a.category]}</div>
        <h3 className="font-display text-[24px] leading-[1.15] font-bold mt-2 line-clamp-2">{a.sample && <SampleTag className="!bg-white/25 !text-current" />}{a.title}</h3>
        <p className="mt-2 text-[14px] text-ink/80 flex items-center gap-1"><b className="text-ink">{when}</b> · {place.name}{place.approximate && <Lock size={12} />}</p>
      </button>
      <div className="mt-4 flex items-center gap-2">
        <span className="flex -space-x-2">{faces.map((u) => <Avatar key={u!.id} emoji={u!.avatar.emoji} hue={u!.avatar.hue} url={u!.avatar.url} size={28} className="ring-2 ring-white/70" />)}</span>
        <span className="text-[13px] text-ink/70">{host?.nickname}{approved.length ? ` +${approved.length}` : ''}</span>
        <span className="flex-1" />
        <JoinButton activity={a} size="sm" label={t('같이 가기')} className="rounded-full bg-ink text-white shadow-none px-4" />
      </div>
    </article>
  );
}

/** 활동·행사 타일 — 2열, 색 면 + 큰 제목 + 날짜 */
export function ActivityTile({ activity: a }: { activity: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  const host = v.userById(a.hostId);
  const org = a.orgId ? v.orgById(a.orgId) : undefined;
  const Icon = CATEGORY_ICON[a.category];
  return (
    <button onClick={() => nav(`/activities/${a.id}`)} className="rounded-[22px] p-4 text-left flex flex-col aspect-[4/5] press" style={{ background: CATEGORY_TINT[a.category] }}>
      <div className="flex items-center justify-between"><span className="h-8 w-8 rounded-full bg-white/60 grid place-items-center"><Icon size={15} /></span><ArrowUpRight size={16} className="text-ink/50" /></div>
      <h3 className="font-display text-[19px] leading-[1.15] font-bold mt-auto line-clamp-3">{a.sample && <SampleTag className="!bg-white/25 !text-current" />}{a.title}</h3>
      <p className="mt-1.5 text-[12px] text-ink/70">{formatDate(a.date)} · {formatTime(a.startTime)}</p>
      <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-ink/70">{org ? <Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={20} /> : host && <Avatar emoji={host.avatar.emoji} hue={host.avatar.hue} url={host.avatar.url} size={20} />}<span className="truncate">{org?.name ?? host?.nickname}</span></div>
    </button>
  );
}

export function OpportunityTile({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  const intents = useAppStore((s) => s.opportunityIntents);
  const n = intents.filter((i) => i.opportunityId === o.id).length;
  const Icon = OPP_ICON[o.type];
  return (
    <button onClick={() => nav(`/opportunities/${o.id}`)} className="rounded-[22px] p-4 text-left flex flex-col aspect-[4/5] press bg-surface-2" style={{ background: `${OPP_TINT[o.type]}66` }}>
      <div className="flex items-center justify-between"><span className="h-8 w-8 rounded-full bg-white/70 grid place-items-center"><Icon size={15} /></span>{o.deadline && <span className="text-[11px] font-bold text-ink/60">{dday(o.deadline)}</span>}</div>
      <h3 className="font-display text-[19px] leading-[1.15] font-bold mt-auto line-clamp-3">{o.title}</h3>
      <p className="mt-1.5 text-[12px] text-ink/70">{o.date ? `${formatDate(o.date)} · ` : ''}{OPP_TYPE_LABELS[o.type]}</p>
      <p className="mt-2.5 text-[12px] text-ink/70 flex items-center gap-1"><Users size={12} />{n}{t('명 관심')}</p>
    </button>
  );
}

/** 팀 행 — 제목 + 필요한 역할 한 줄 + 참여 */
export function TeamRow({ activity: a }: { activity: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  const roles = a.rolesNeeded ?? [];
  const fit = roles.some((r) => v.me.canOffer.includes(r));
  const Icon = CATEGORY_ICON[a.category];
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span className="h-12 w-12 rounded-2xl grid place-items-center shrink-0" style={{ background: CATEGORY_TINT[a.category] }}><Icon size={18} /></span>
      <button onClick={() => nav(`/activities/${a.id}`)} className="flex-1 min-w-0 text-left">
        <h3 className="text-[15px] font-bold leading-snug line-clamp-1">{a.sample && <SampleTag />}{a.title}</h3>
        <p className={cn('text-[12px] mt-0.5 truncate', fit ? 'text-primary font-semibold' : 'text-ink-3')}>{a.courseName ? `${a.courseName} · ${a.crewType ? CREW_TYPE_LABELS[a.crewType] : ''}` : roles.map((r) => PERSON_ROLE_LABELS[r]).join(' · ')}{fit ? ` · ${t('내 역할')}` : ''}</p>
      </button>
      <JoinButton activity={a} size="sm" label={t('참여')} className="rounded-full" />
    </div>
  );
}

/** 기회 행 (팀 탭) */
export function OpportunityRow({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  const Icon = OPP_ICON[o.type];
  return (
    <button onClick={() => nav(`/opportunities/${o.id}`)} className="w-full flex items-center gap-3 py-3.5 text-left press">
      <span className="h-12 w-12 rounded-2xl grid place-items-center shrink-0" style={{ background: `${OPP_TINT[o.type]}99` }}><Icon size={18} /></span>
      <span className="flex-1 min-w-0"><h3 className="text-[15px] font-bold leading-snug line-clamp-1">{o.title}</h3><p className="text-[12px] text-ink-3 mt-0.5 truncate">{(o.rolesNeeded ?? []).map((r) => PERSON_ROLE_LABELS[r]).join(' · ') || OPP_TYPE_LABELS[o.type]}</p></span>
      {o.deadline && <span className="text-[12px] font-bold text-ink-3">{dday(o.deadline)}</span>}
    </button>
  );
}
