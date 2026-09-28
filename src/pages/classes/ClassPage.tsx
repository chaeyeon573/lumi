import { useNavigate, useParams } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, EmptyState } from '@/components/ui';
import { JoinButton } from '@/components/cards/JoinButton';
import { useViewer } from '@/hooks/useViewer';
import { classmates } from '@core/lib/relations';
import { DAY_LABELS, statusNow } from '@core/lib/timetable';
import { todayISO, formatDate, formatTime } from '@core/lib/format';

/** 수업 공간 — 지금 공강인 같은 수업 학생 + Study Crew (ultra minimal) */
export function ClassSpaceContent({ courseName, onEdit, onClose }: { courseName: string; onEdit?: () => void; onClose?: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const mine = me.timetable.filter((c) => c.name === courseName);
  const mates = classmates(v.snap, me, courseName, (u) => v.canSeeField(u, 'timetable'));
  const freeMates = mates.filter((u) => statusNow(u.timetable).kind !== 'in_class');
  const crews = v.visibleActivities.filter((a) => a.courseName === courseName && a.date >= todayISO());
  const go = (p: string) => { onClose?.(); nav(p); };
  const times = [...new Set(mine.map((c) => DAY_LABELS[c.day]))].join('') + (mine[0] ? ` ${formatTime(mine[0].start)}` : '');
  const short = courseName.split(' ').slice(0, 2).join(' ');
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2"><h2 className="font-display text-[28px] font-bold text-ink leading-none">{short}</h2>{freeMates.length > 0 && <span className="h-6 px-2.5 rounded-full bg-accent text-primary text-[11px] font-bold flex items-center">Live</span>}</div>
          <div className="mt-1.5 text-[14px] text-verify">{mine[0]?.room ? `${mine[0].room} · ` : ''}{times}</div>
        </div>
        <span className="h-9 px-3 rounded-full bg-surface-2 text-primary text-[13px] font-semibold flex items-center gap-1.5"><Users size={15} />{mates.length}</span>
      </div>
      <section>
        <div className="flex items-center justify-between mb-3"><span className="text-[14px] font-semibold text-primary flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent" />{lang === 'en' ? 'Free Now' : '지금 공강'}</span><span className="text-[13px] text-verify">{mates.length}{lang === 'en' ? ' classmates' : '명 같은 수업'}</span></div>
        {freeMates.length === 0 ? <p className="text-[13px] text-ink-3">{t('시간표를 공개한 같은 수업 학생이 아직 없어요.')}</p> : (
          <div className="flex gap-4 overflow-x-auto hide-scrollbar">{freeMates.slice(0, 6).map((u) => (
            <button key={u.id} onClick={() => go(`/users/${u.id}?propose=1&cat=study`)} className="flex flex-col items-center gap-1.5 shrink-0 w-[64px]"><span className="relative"><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={60} /><span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-accent ring-2 ring-white" /></span><span className="text-[12px] text-ink truncate max-w-full">{u.nickname}</span></button>
          ))}</div>
        )}
      </section>
      <section>
        <div className="flex items-center justify-between mb-2"><span className="text-[14px] font-semibold text-primary">Study Crews</span><span className="text-[13px] text-verify">{crews.length}{lang === 'en' ? ' active' : '개'}</span></div>
        {crews.length === 0 ? <p className="text-[13px] text-ink-3">{lang === 'en' ? 'No crews yet. Start the first one.' : '아직 없어요. 첫 Crew를 열어보세요.'}</p> : (
          <div className="space-y-2">{crews.map((a) => { const left = a.capacity - v.approvedCount(a.id); return (
            <div key={a.id} className="rounded-2xl bg-surface-2 px-4 py-3.5 flex items-center gap-3">
              <button onClick={() => go(`/activities/${a.id}`)} className="flex-1 min-w-0 text-left"><span className="block text-[15px] font-semibold text-ink truncate">{a.title}</span><span className="block text-[13px] text-verify mt-0.5">{formatDate(a.date)} {formatTime(a.startTime)} · {left}{lang === 'en' ? ` spot${left === 1 ? '' : 's'} left` : '자리'}</span></button>
              <JoinButton activity={a} size="sm" label={t('참여하기')} />
            </div>
          ); })}</div>
        )}
      </section>
      <div className="flex justify-center"><Button size="lg" icon={<Plus size={18} />} onClick={() => go(`/create/activity?crew=${encodeURIComponent(courseName)}`)}>{lang === 'en' ? 'New Crew' : 'Crew 만들기'}</Button></div>
      {onEdit && <button onClick={onEdit} className="w-full h-9 text-[12px] font-semibold text-ink-3">{t('수업 정보 수정')}</button>}
    </div>
  );
}

export function ClassPage() {
  const { courseName = '' } = useParams();
  const name = decodeURIComponent(courseName);
  const v = useViewer();
  const has = v.me.timetable.some((c) => c.name === name);
  return (
    <div className="min-h-full pb-8">
      <TopBar back title={lang === 'en' ? 'Class Space' : '수업 공간'} />
      <div className="px-4 pt-3">
        {!has ? <EmptyState emoji="" title={t('내 시간표에 없는 수업이에요')} /> : <ClassSpaceContent courseName={name} />}
      </div>
    </div>
  );
}
