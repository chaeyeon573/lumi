/**
 * 수업 방 — 공유 링크 /c/<학교>/<과목> (예: /c/berkeley/cs61a).
 *   로그인 전: 수업 정보 + 인원 수 + 가입 (다른 학생은 보이지 않는다)
 *   같은 학교, 아직 안 들음: 인원 수 + 내 시간표에 추가
 *   듣는 사람: 같은 수업 학생·수업 끝나고 비는 사람·스터디 그룹·파트너 (ClassRoom)
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Coffee, Handshake, Lock } from 'lucide-react';
import { lang } from '@core/i18n';
import type { ClassRoomInfo } from '@core/api/types';
import type { Self } from '@core/types';
import { api, apiMode } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { TopBar } from '@/components/layout/TopBar';
import { Button, CardSkeleton, EmptyState } from '@/components/ui';
import { ClassRoom } from '@/components/classes/ClassRoom';
import { CopyClassLink, QrLinkButton, rememberReturnTo } from '@/components/classes/ClassLink';
import { classKey, codeSlug, enrollments } from '@core/lib/classmates';
import { coursesFromCatalog, clashesWith, COURSE_HUES } from '@core/lib/timetable';
import { clockLabel } from '@core/api/classes';

const en = lang === 'en';
const DAYS = en ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['월', '화', '수', '목', '금', '토', '일'];

export function meetingText(meetings: ClassRoomInfo['meetings']) {
  if (!meetings.length) return '';
  const days = [...new Set(meetings.map((m) => m.day))].sort().map((d) => DAYS[d]).join(en ? '/' : '');
  return `${days} ${clockLabel(meetings[0].start, en)}–${clockLabel(meetings[0].end, en)}`;
}

function Header({ info }: { info: ClassRoomInfo }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{info.schoolName} · {info.term}</div>
      <h1 className="mt-1.5 font-display text-[34px] font-extrabold text-ink leading-none">{info.code}</h1>
      {info.title && <div className="mt-1.5 text-[15px] text-ink-2">{info.title}</div>}
      <div className="mt-1 text-[13px] text-ink-3">{[info.instructor, meetingText(info.meetings)].filter(Boolean).join(' · ')}</div>
    </div>
  );
}

export function ClassRoomPage() {
  const { school = '', code = '' } = useParams();
  const nav = useNavigate();
  const status = useAppStore((s) => s.status);
  const meId = useAppStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  const rosters = useAppStore((s) => s.classRosters);
  const run = useAppStore((s) => s.run);
  const me = users.find((u) => u.id === meId) as Self | undefined;
  const [info, setInfo] = useState<ClassRoomInfo | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => { let alive = true; setInfo(undefined); api.classes.room(school, code).then((r) => { if (alive) setInfo(r); }).catch(() => { if (alive) setInfo(null); }); return () => { alive = false; }; }, [school, code, rosters?.length]);
  useEffect(() => { if (info) document.title = info.count > 0 ? `${info.code} on Lumi — ${info.count} classmate${info.count === 1 ? '' : 's'}` : `${info.code} on Lumi`; }, [info]);

  const key = info ? classKey(info.schoolId, info.code, info.term) : '';
  // 같은 과목을 다른 학기로 넣어 둔 사람도 자기 수업 방으로 (예: 다음 학기 시간표)
  const mine = useMemo(() => {
    if (!me || !info) return undefined;
    const list = enrollments(me);
    return list.find((e) => e.key === key) ?? list.find((e) => e.schoolId === info.schoolId && codeSlug(e.code) === info.codeSlug);
  }, [me, key, info]);
  const roster = rosters?.find((r) => r.id === (mine?.key ?? key));
  const mySchool = me?.affiliation.type === 'university' ? me.affiliation.schoolId : '';

  const join = () => { rememberReturnTo(`/c/${school}/${code}`); nav(apiMode === 'remote' ? '/start' : '/welcome'); };
  const addToTimetable = async () => {
    if (!me || !info?.catalogCourse) return;
    const used = new Set(me.timetable.map((c) => c.hue));
    const rows = coursesFromCatalog(info.catalogCourse, COURSE_HUES.find((h) => !used.has(h)) ?? COURSE_HUES[0]);
    const clash = clashesWith(me.timetable, info.catalogCourse)[0];
    setBusy(true);
    try { await run(() => api.users.update(me.id, { timetable: [...me.timetable, ...rows] }), clash ? (en ? `Added — overlaps ${clash.name.split(' ').slice(0, 2).join(' ')}` : '추가했어요 (겹치는 수업이 있어요)') : (en ? `Added ${info.code} to your timetable` : '시간표에 추가했어요')); } catch { /* toast */ } finally { setBusy(false); }
  };

  const loading = info === undefined || status === 'idle' || status === 'loading';
  return (
    <div className="min-h-full pb-10">
      <TopBar back={!!meId} title={en ? 'Class' : '수업'} />
      <div className="px-4 pt-2 space-y-5">
        {loading ? <CardSkeleton count={2} /> : !info ? (
          <EmptyState emoji="🔍" title={en ? "We couldn't find this class" : '수업을 찾을 수 없어요'} description={en ? 'Check the link — it looks like lumi…/c/berkeley/cs61a.' : '링크를 확인해 주세요.'} action={meId ? <Button onClick={() => nav('/timetable')}>{en ? 'My timetable' : '내 시간표'}</Button> : <Button onClick={() => nav('/welcome')}>Lumi</Button>} />
        ) : !meId || !me ? (
          // ─── 로그인 전: 인원 수만 ───
          <>
            <Header info={info} />
            <div className="rounded-3xl bg-surface-2 border border-line p-5">
              <div className="text-[40px] font-extrabold text-ink leading-none">{info.count}</div>
              <div className="mt-1 text-[14px] text-ink-2">{en ? `${info.code} student${info.count === 1 ? '' : 's'} already on Lumi` : `명의 ${info.code} 학생이 Lumi에 있어요`}</div>
              <ul className="mt-4 space-y-2.5 text-[14px] text-ink">
                <li className="flex items-center gap-2.5"><BookOpen size={16} className="text-primary" />{en ? 'Get matched into a study group of 3–4' : '3~4명 스터디 그룹 자동 매칭'}</li>
                <li className="flex items-center gap-2.5"><Handshake size={16} className="text-primary" />{en ? 'Find a project partner' : '프로젝트 파트너 찾기'}</li>
                <li className="flex items-center gap-2.5"><Coffee size={16} className="text-primary" />{en ? 'See who’s free after lecture' : '수업 끝나고 비는 사람'}</li>
              </ul>
              <div className="mt-4 text-[12.5px] text-ink-3 flex items-start gap-1.5"><Lock size={13} className="mt-0.5 shrink-0" />{en ? `Only ${info.schoolName} students in ${info.code} see each other — and only that you're in the class. Your timetable stays private.` : '같은 수업 학생끼리만, 같은 수업을 듣는다는 것만 보여요.'}</div>
            </div>
            <Button full size="lg" onClick={join}>{en ? `Join with your ${info.schoolName} email` : `${info.schoolName} 이메일로 시작하기`}</Button>
            <button onClick={() => { rememberReturnTo(`/c/${school}/${code}`); nav('/welcome'); }} className="w-full text-center text-[13px] font-semibold text-ink-2">{en ? 'Already on Lumi? Log in' : '이미 계정이 있어요'}</button>
          </>
        ) : mine ? (
          // ─── 듣는 사람 ───
          <>
            <Header info={mine.term === info.term && info.meetings.length ? info : { ...info, term: mine.term, instructor: mine.term === info.term ? info.instructor : undefined, meetings: mine.meetings.map((c) => ({ day: c.day, start: c.start, end: c.end })) }} />
            <div className="flex gap-2 flex-wrap"><CopyClassLink compact schoolId={info.schoolId} code={info.code} /><QrLinkButton schoolId={info.schoolId} code={info.code} /></div>
            <ClassRoom enrollment={mine} roster={roster} />
          </>
        ) : (
          // ─── 같은 학교·다른 학교, 아직 안 들음: 인원 수만 ───
          <>
            <Header info={info} />
            <div className="rounded-3xl bg-surface-2 border border-line p-5">
              <div className="text-[34px] font-extrabold text-ink leading-none">{info.count}</div>
              <div className="mt-1 text-[14px] text-ink-2">{en ? `${info.code} student${info.count === 1 ? '' : 's'} on Lumi` : `명의 ${info.code} 학생`}</div>
              <p className="mt-3 text-[13px] text-ink-3">{mySchool === info.schoolId
                ? (en ? `Add ${info.code} to your timetable to see classmates, study groups and project partners. They'll only see that you take it.` : '시간표에 추가하면 같은 수업 학생·스터디 그룹·파트너가 보여요.')
                : (en ? `This class room is for ${info.schoolName} students.` : `${info.schoolName} 학생을 위한 수업 방이에요.`)}</p>
            </div>
            {mySchool === info.schoolId && (info.catalogCourse?.meetings.length
              ? <Button full size="lg" loading={busy} onClick={addToTimetable}>{en ? `Add ${info.code} to my timetable` : '내 시간표에 추가'}</Button>
              : <Button full size="lg" variant="outline" onClick={() => nav('/timetable')}>{en ? 'Open my timetable' : '내 시간표 열기'}</Button>)}
            <div className="flex gap-2"><CopyClassLink compact schoolId={info.schoolId} code={info.code} /><QrLinkButton schoolId={info.schoolId} code={info.code} /></div>
          </>
        )}
      </div>
    </div>
  );
}
