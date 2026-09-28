import { useNavigate } from 'react-router-dom';
import { Users, Clock, BookOpen, Wifi, MapPin } from 'lucide-react';
import { t } from '@core/i18n';
import type { Activity } from '@core/types';
import { Avatar, Tag } from '@/components/ui';
import { JoinButton } from '@/components/cards/JoinButton';
import { useViewer } from '@/hooks/useViewer';
import { PERSON_ROLE_LABELS, CREW_TYPE_LABELS, CREW_TYPE_EMOJI, MODE_LABELS } from '@core/lib/labels';
import { formatDateTime } from '@core/lib/format';

/** 팀 모집·Study Crew 카드 — 필요한 역할과 내 역할이 맞는지 먼저 보여준다 */
export function TeamCard({ activity: a }: { activity: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  const host = v.userById(a.hostId);
  const count = v.approvedCount(a.id);
  const roles = a.rolesNeeded ?? [];
  const fit = roles.filter((r) => v.me.canOffer.includes(r));
  return (
    <div className="card p-3.5">
      <div className="flex gap-3">
        <span className="h-[52px] w-[52px] rounded-xl grid place-items-center text-[24px] shrink-0 bg-surface-2">{a.cover.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            {a.courseName ? <Tag tone="primary" className="h-5"><BookOpen size={10} /> {a.courseName}</Tag> : <Tag tone="gold" className="h-5">{t('팀원 모집')}</Tag>}
            {a.crewType && <Tag className="h-5">{CREW_TYPE_EMOJI[a.crewType]} {CREW_TYPE_LABELS[a.crewType]}</Tag>}
            {a.mode && <Tag className="h-5">{a.mode === 'online' ? <Wifi size={10} /> : <MapPin size={10} />} {MODE_LABELS[a.mode]}</Tag>}
          </div>
          <button onClick={() => nav(`/activities/${a.id}`)} className="text-left text-[14px] font-bold leading-snug mt-1 line-clamp-2">{a.title}</button>
          <div className="text-[12px] text-ink-3 mt-0.5 flex items-center gap-1"><Clock size={11} />{formatDateTime(a.date, a.startTime)}</div>
        </div>
      </div>
      {roles.length > 0 && <div className="mt-2 flex flex-wrap gap-1 items-center text-[11px] text-ink-3">{t('필요:')} {roles.map((r) => <Tag key={r} tone={fit.includes(r) ? 'mint' : 'neutral'} className="h-5">{PERSON_ROLE_LABELS[r]}{fit.includes(r) ? ' ✓' : ''}</Tag>)}</div>}
      {a.courseName && <div className="mt-2 text-[11px] text-ink-3">{t('같은 수업을 듣는 사람에게만 보여요')}</div>}
      <div className="mt-2.5 flex items-center gap-2">
        {host && <button onClick={() => nav(`/users/${host.id}`)} className="flex items-center gap-1.5 text-[12px] text-ink-2"><Avatar emoji={host.avatar.emoji} hue={host.avatar.hue} url={host.avatar.url} size={22} />{host.nickname}</button>}
        <span className="text-[12px] text-ink-3 flex items-center gap-0.5"><Users size={11} />{count + 1}/{a.capacity}</span>
        <span className="flex-1" />
        <JoinButton activity={a} size="sm" label={a.courseName ? t('스터디 참여') : t('팀 참여 문의')} />
      </div>
    </div>
  );
}
