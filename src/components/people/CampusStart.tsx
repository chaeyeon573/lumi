import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Pizza, BookOpen, CalendarPlus, Link2 } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Opportunity } from '@core/types';
import { Btn, RowCard, SectionHeader, InfoNote } from '@/components/ha';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { audienceFits, campusDate } from '@core/lib/listings';
import { canGoTogether, campusToday, goingPeople } from '@core/lib/withpeople';
import { enrollments } from '@core/lib/classmates';
import { formatDate, formatTime } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { GoTogetherSheet } from '@/components/together/GoTogetherSheet';
import { classUrl } from '@/components/classes/ClassLink';
import { shareOrCopy } from '@/lib/native';

const en = lang === 'en';

/** 이번 주 같이 갈 수 있는 실제 캠퍼스 행사 — 누가 가는 것 먼저, 그다음 무료 음식·소셜, 그다음 빠른 순 */
export function useCampusWeek(): Opportunity[] {
  const v = useViewer();
  const opps = useAppStore((s) => s.opportunities);
  const me = v.me;
  return useMemo(() => {
    const school = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
    const today = campusToday();
    const weekEnd = new Date(Date.parse(`${today}T12:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10);
    const has = (o: Opportunity, tag: string) => o.tags.some((tg) => tg.toLowerCase() === tag);
    const score = (o: Opportunity) => goingPeople(v.snap, me, o.id).length * 10 + (has(o, 'free food') || has(o, 'social') ? 3 : 0);
    const when = (o: Opportunity) => `${campusDate(o.date!)}${o.startTime}`;
    return opps
      .filter((o) => (!o.schoolId || o.schoolId === school) && canGoTogether(o) && campusDate(o.date!) <= weekEnd && audienceFits(me, o))
      .sort((a, b) => score(b) - score(a) || when(a).localeCompare(when(b)));
  }, [opps, v.snap, me]);
}

/** 행사 한 줄 + Go together (시트가 같이 가기 모임에 넣고 채팅을 연다) */
function EventRow({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const free = o.tags.some((tg) => tg.toLowerCase() === 'free food');
  return (
    <>
      {/* 줄 전체를 버튼으로 두면 Go together 버튼이 버튼 안에 들어간다 — 제목·한 줄만 상세로 */}
      <RowCard tone={free ? 'peach' : 'ice'} icon={free ? <Pizza size={20} /> : <CalendarDays size={20} />}
        title={<button onClick={() => nav(`/opportunities/${o.id}`)} className="block w-full text-left whitespace-normal line-clamp-2 press">{o.title}</button>}
        sub={<button onClick={() => nav(`/opportunities/${o.id}`)} className="block w-full text-left truncate">{[`${formatDate(campusDate(o.date!))} ${formatTime(o.startTime!)}`, o.place?.name].filter(Boolean).join(' · ')}</button>}
        right={<Btn size="sm" variant="outline" className="px-3 shrink-0" onClick={() => setOpen(true)}>{en ? 'Go together' : '같이 가기'}</Btn>} />
      {open && <GoTogetherSheet o={o} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * 아직 사람이 없을 때도 할 수 있는 것 (가입 첫날 — 사장님 2026-11-02 "맨처음에는 사람이 아무도 없는데").
 * 이번 주 실제 캠퍼스 행사(Go together), 내 수업(같이 공부), 수업 링크 복사. 사람을 지어내지 않고, 빈자리 문구를 줄마다 달지 않는다.
 * parts 로 필요한 묶음만 고른다 (Feed 는 행사 하나만 등).
 */
export function CampusStart({ parts = ['week', 'classes', 'invite'], limit = 3, className }: { parts?: ('week' | 'classes' | 'invite')[]; limit?: number; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const toast = useAppStore((s) => s.showToast);
  const week = useCampusWeek();
  const classes = useMemo(() => enrollments(v.me), [v.me]);
  const first = classes[0];
  const copyLink = async () => {
    if (!first) return;
    const url = classUrl(first.schoolId, first.code);
    const r = await shareOrCopy({ title: `${first.code} on Lumi`, url }, { webSheet: 'mobile' });
    if (r === 'copied') toast(en ? 'Class link copied — paste it in your class Discord or GroupMe.' : '수업 링크를 복사했어요.', 'success');
    else if (r === 'failed') toast(url, 'info');
  };
  return (
    <div className={cn('space-y-7', className)}>
      {parts.includes('week') && week.length > 0 && (
        <section>
          <SectionHeader title={en ? 'This week on campus' : '이번 주 캠퍼스'} action={week.length > limit ? (en ? 'See all' : '모두 보기') : undefined} onAction={() => nav('/explore/events')} />
          <div className="space-y-3">{week.slice(0, limit).map((o) => <EventRow key={o.id} o={o} />)}</div>
        </section>
      )}
      {parts.includes('classes') && (
        <section>
          <SectionHeader title={en ? 'Your classes' : '내 수업'} />
          <div className="space-y-3">
            {classes.slice(0, 3).map((c) => (
              <RowCard key={c.key} tone="ice" icon={<BookOpen size={20} />} title={c.code}
                sub={en ? 'Study together with classmates' : '같은 수업 사람과 같이 공부'} onClick={() => nav(`/classes/${encodeURIComponent(c.name)}`)} />
            ))}
            {!classes.length && <RowCard tone="ice" icon={<CalendarPlus size={20} />} title={en ? 'Add your classes' : '수업 추가'} sub={en ? 'Classmates can find each other here' : '같은 수업 사람끼리 찾을 수 있어요'} onClick={() => nav('/schedule/classes')} />}
          </div>
        </section>
      )}
      {parts.includes('invite') && first && (
        <section>
          <InfoNote>{en ? `Classmates show up as they join. Your ${first.code} link helps.` : `같은 수업 사람들이 들어오면 보여요. ${first.code} 링크를 올려 두면 빨라요.`}</InfoNote>
          <Btn size="sm" variant="outline" className="mt-3" icon={<Link2 size={15} />} onClick={copyLink}>{en ? 'Copy class link' : '수업 링크 복사'}</Btn>
        </section>
      )}
    </div>
  );
}
