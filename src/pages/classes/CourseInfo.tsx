import { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { lang } from '@core/i18n';
import type { CatalogCourse, CatalogDetails } from '@core/api/types';
import { api } from '@core/api';
import { DAY_LABELS } from '@core/lib/timetable';
import { LEVEL_LABELS, courseLevel, meetingLine } from '@core/lib/coursefinder';
import { courseLinks, lectureSection } from '@core/lib/courseLinks';
import { courseTerm } from '@core/data/catalog/courses';
import { openExternal } from '@/lib/native';
import { SectionHeader, cardCls } from '@/components/ha';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
const L = (e: string, k: string) => (en ? e : k);

/** 수업 하나 (id 또는 과목 코드 + 학기) + 그 과목 Lumi 학생 수 — 없으면 null, 읽는 중 undefined */
export function useCatalogCourse(schoolId: string, ref: { id?: string; code?: string; term?: string }) {
  const [v, setV] = useState<{ key: string; value: { course: CatalogCourse; count: number } | null } | null>(null);
  const key = `${schoolId}|${ref.id ?? ''}|${ref.code ?? ''}|${ref.term ?? ''}`;
  useEffect(() => {
    if (!schoolId || (!ref.id && !ref.code)) { setV({ key, value: null }); return; }
    let alive = true;
    api.catalog.course(schoolId, ref).then((r) => alive && setV({ key, value: r })).catch(() => alive && setV({ key, value: null }));
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return v?.key === key ? v.value : undefined;
}

/** 수업 페이지에서 그때 읽는 수업 번호·조건·노트 — 못 읽으면 {} */
export function useCatalogDetails(schoolId: string, courseId: string | undefined) {
  const [d, setD] = useState<CatalogDetails | null>(null);
  useEffect(() => {
    if (!schoolId || !courseId) return;
    let alive = true;
    api.catalog.details(schoolId, courseId).then((x) => alive && setD(x)).catch(() => alive && setD({}));
    return () => { alive = false; };
  }, [schoolId, courseId]);
  return d;
}

/**
 * S030 Class 탭의 수업 정보 — 라벨/값 줄. 학교 목록에 있는 것만 (없는 칸은 줄째 뺀다, 지어내지 않는다).
 * 처음 네 줄만, 나머지는 "More course info ⌄"
 */
export function CourseInfoCard({ c, details }: { c: CatalogCourse; details: CatalogDetails | null }) {
  const [more, setMore] = useState(false);
  const level = courseLevel(c.code);
  const sec = c.url ? lectureSection(c) : null;
  const classNo = details?.classNumber ?? c.classNumber;
  const notes = [...(details?.requisites ?? []), ...(details?.notes ?? [])];
  const rows: { label: string; value: string; pink?: boolean }[] = [
    { label: L('Course', '과목'), value: `${c.code} · ${c.title}` },
    ...(c.instructor ? [{ label: L('Instructor', '교수'), value: c.instructor }] : []),
    ...(courseTerm(c) ? [{ label: L('Term', '학기'), value: courseTerm(c) }] : []),
    ...(sec || classNo ? [{ label: L('Section / Class #', '분반 / 수업 번호'), value: [sec && `${L('Lecture', '강의')} ${sec}`, classNo && `#${classNo}`].filter(Boolean).join(' · ') }] : []),
    ...(level ? [{ label: L('Level', '단계'), value: LEVEL_LABELS[level][en ? 0 : 1] }] : []),
    ...(c.meetings.length ? [{ label: L('Days & time', '요일·시간'), value: meetingLine(c.meetings, DAY_LABELS) }] : []),
    ...(c.location ? [{ label: L('Location', '장소'), value: c.location }] : []),
    ...(c.units != null ? [{ label: L('Units', '학점'), value: String(c.units) }] : []),
    ...(notes.length ? [{ label: L('Notes', '노트'), value: notes.join('\n'), pink: !!details?.requisites?.length }] : []),
  ];
  const shown = more ? rows : rows.slice(0, 4);
  return (
    <div className={cn(cardCls, 'px-4')}>
      <dl className="divide-y divide-line">
        {shown.map((r) => (
          <div key={r.label} className="py-3 grid grid-cols-[104px_1fr] gap-3">
            <dt className="text-[12.5px] text-ink-3 pt-px">{r.label}</dt>
            <dd className={cn('text-[14px] leading-snug whitespace-pre-line [overflow-wrap:anywhere]', r.label === L('Course', '과목') ? 'font-bold text-ink' : 'text-ink', r.pink && 'text-sel-fg')}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {rows.length > 4 && (
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className="w-full border-t border-line py-3 flex items-center justify-center gap-1 text-[13.5px] font-semibold text-ink-2 press">
          {more ? L('Less', '접기') : L('More course info', '수업 정보 더 보기')}<ChevronDown size={16} className={cn('transition-transform', more && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}

/** "Elsewhere" — 학교 설정(@core/lib/courseLinks)이 주는 바깥 링크만. 없는 학교는 아무것도 그리지 않는다 */
export function Elsewhere({ c }: { c: CatalogCourse }) {
  const links = courseLinks(c);
  if (!links.length) return null;
  return (
    <section>
      <SectionHeader title={L('Elsewhere', '다른 사이트')} />
      <div className={cn(cardCls, 'divide-y divide-line')}>
        {links.map((l) => (
          <button key={l.url} type="button" onClick={() => openExternal(l.url)} className="w-full px-4 py-3 flex items-center gap-2 text-left press">
            <span className="flex-1 min-w-0 text-[14px] text-ink truncate">
              {l.kind === 'site' ? `${L('Grades & enrollment', '성적·수강 현황')} — ${l.label}` : `${l.name} — ${l.label}`}
            </span>
            <ArrowUpRight size={16} className="text-ink-3 shrink-0" />
          </button>
        ))}
      </div>
      <p className="text-[12px] text-ink-3 mt-2 px-1">{L('Opens another site · not part of Lumi', '다른 사이트가 열려요 · Lumi 가 아니에요')}</p>
    </section>
  );
}

/** "12 Lumi students are taking this" — 수만, 1명 이상일 때만 */
export function LumiCountLine({ count }: { count: number }) {
  if (count < 1) return null;
  return <p className="text-[14px] font-semibold text-ink px-1">{en ? `${count} Lumi student${count === 1 ? ' is' : 's are'} taking this` : `Lumi 학생 ${count}명이 듣고 있어요`}</p>;
}
