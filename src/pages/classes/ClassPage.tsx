import { useNavigate, useParams } from 'react-router-dom';
import { Users, Plus, ChevronRight } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, EmptyState } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ClassRoom } from '@/components/classes/ClassRoom';
import { CopyClassLink, QrLinkButton } from '@/components/classes/ClassLink';
import { classKey, classPath, courseCodeOf, courseTermOf, enrollments, schoolOf } from '@core/lib/classmates';
import { DAY_LABELS } from '@core/lib/timetable';
import { formatTime } from '@core/lib/format';

/**
 * 수업 공간 — 내 시간표의 수업 하나 (시간표 칸을 누르면 시트로, /classes/:이름 으로도 열린다).
 * 같은 수업 학생·수업 끝나고 비는 사람·스터디 그룹·파트너·수업 링크 복사 (ClassRoom).
 */
export function ClassSpaceContent({ courseName, onEdit, onClose }: { courseName: string; onEdit?: () => void; onClose?: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const rosters = useAppStore((s) => s.classRosters);
  const go = (p: string) => { onClose?.(); nav(p); };
  const mine = me.timetable.filter((c) => c.name === courseName);
  const first = mine[0];
  const code = first ? courseCodeOf(first) : null;
  const enrollment = code ? enrollments(me).find((e) => e.key === classKey(schoolOf(me), code, courseTermOf(first))) : undefined;
  const roster = enrollment && rosters?.find((r) => r.id === enrollment.key);
  // 강의 요일·시각과 디스커션·랩 요일·시각을 따로 (CS 61A: "Mon/Wed/Fri 12 PM · DIS 118 Thu 12:30 PM")
  const days = (rows: typeof mine) => [...new Set([...rows].sort((a, b) => a.day - b.day).map((c) => DAY_LABELS[c.day]))].join(lang === 'en' ? '/' : '') + (rows[0] ? ` ${formatTime(rows[0].start)}` : '');
  const lecture = mine.filter((c) => !c.section);
  const sections = [...new Set(mine.filter((c) => c.section).map((c) => c.section!))].map((s) => `${s} ${days(mine.filter((c) => c.section === s))}`);
  const lead = lecture[0] ?? first;
  const times = [lecture.length ? days(lecture) : '', ...sections].filter(Boolean).join(' · ');
  const title = code && courseName.startsWith(code) ? courseName.slice(code.length).trim() : courseName;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[28px] font-bold text-ink leading-none">{code ?? courseName.split(' ').slice(0, 2).join(' ')}</h2>
          {title && title !== code && <div className="mt-1.5 text-[13.5px] text-ink-2 truncate">{title}</div>}
          <div className="mt-0.5 text-[13px] text-ink-3">{lead?.room ? `${lead.room} · ` : ''}{times}</div>
        </div>
        {roster && !roster.hidden && <span className="h-9 px-3 rounded-full bg-surface-2 text-ink text-[13px] font-semibold flex items-center gap-1.5 shrink-0"><Users size={15} />{roster.count}</span>}
      </div>
      {enrollment ? (
        <>
          <div className="flex gap-2 flex-wrap">
            <CopyClassLink compact schoolId={enrollment.schoolId} code={enrollment.code} />
            <QrLinkButton schoolId={enrollment.schoolId} code={enrollment.code} />
            <button onClick={() => go(classPath(enrollment.schoolId, enrollment.code))} className="h-9 px-3 rounded-full text-[13px] font-semibold text-primary inline-flex items-center gap-0.5">{lang === 'en' ? 'Class room' : '수업 방'}<ChevronRight size={14} /></button>
          </div>
          <ClassRoom enrollment={enrollment} roster={roster} onGo={go} />
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-3">{lang === 'en' ? 'Classmates are matched by course code (like "CS 61A"). Add this class from your school’s class list to find who else is in it.' : '같은 수업 학생은 과목 코드(예: CS 61A)로 찾아요. 학교 수업 목록에서 추가해 주세요.'}</p>
          <Button size="sm" variant="outline" icon={<Plus size={15} />} onClick={() => go(`/create/activity?crew=${encodeURIComponent(courseName)}`)}>{lang === 'en' ? 'Start a study crew' : 'Crew 만들기'}</Button>
        </div>
      )}
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
