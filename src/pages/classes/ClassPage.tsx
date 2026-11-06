import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, CalendarDays, Handshake, Lock, MapPin, Plus, Users } from 'lucide-react';
import type { CatalogCourse } from '@core/api/types';
import { courseTerm } from '@core/data/catalog/courses';
import { isCourseAdded } from '@core/lib/coursefinder';
import { catalogCourseName } from '@core/lib/timetable';
import { useAddCourse } from '@/pages/schedule/addCourse';
import { CourseInfoCard, Elsewhere, LumiCountLine, useCatalogCourse, useCatalogDetails } from './CourseInfo';
import { lang } from '@core/i18n';
import type { Activity, ClassRoster, User } from '@core/types';
import { api } from '@core/api';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { CopyClassLink } from '@/components/classes/ClassLink';
import { ClassQuestions } from '@/components/classes/ClassQuestions';
import { CourseReviewsTab } from '@/components/reviews/CourseReviewsTab';
import { ExamInfoTab } from '@/components/reviews/ExamInfoTab';
import { HeaderStars } from '@/components/reviews/ReviewParts';
import { SchoolEmailCard } from '@/components/settings/SchoolEmailCard';
import { Avatar } from '@/components/ui';
import {
  BackHeader, PageTitle, SegTabs, InfoRows, SectionHeader, MeetupCard, InfoNote, EmptyState, Btn, Switch, TextInput, BottomCTA, LoadingCards, cardCls,
} from '@/components/ha';
import { classKey, codeFromName, codeSlug, courseCodeOf, courseTermOf, campusDateOf, enrollments, schoolOf, type Enrollment } from '@core/lib/classmates';
import { DAY_LABELS } from '@core/lib/timetable';
import { slotLabel } from '@core/api/classes';
import { formatDate, formatTime } from '@core/lib/format';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
type Tab = 'class' | 'reviews' | 'exam' | 'questions' | 'study';
const TAB_KEYS: Tab[] = ['class', 'reviews', 'exam', 'questions', 'study'];
/**
 * Owner 2026-11-06: reviews matter most on the course page.
 *   Not added yet (catalog / Add classes): Reviews · Exam info · Class · Questions, opens on Reviews.
 *   In my schedule: Class · Reviews · Exam info · Questions.
 * Study opens from the Class tab ("Study together" › See all) — the Class tab stays underlined there.
 */
const courseTabs = (reviewsFirst = false) => {
  const cls = { key: 'class', label: en ? 'Class' : '수업' };
  const rev = [{ key: 'reviews', label: en ? 'Reviews' : '리뷰' }, { key: 'exam', label: en ? 'Exam info' : '시험' }];
  return [...(reviewsFirst ? [...rev, cls] : [cls, ...rev]), { key: 'questions', label: en ? 'Questions' : '질문' }];
};
const tabOf = (raw: string | null, def: Tab = 'class'): Tab => (TAB_KEYS.includes(raw as Tab) ? raw as Tab : def);

/**
 * Class space (PDF S030) — 내 시간표의 수업 하나. Class · Questions · Study 밑줄 탭 (주소 ?tab= 가 탭을 정한다).
 *   Class     수업 시간·강의실(나만), 같은 수업 학생(보이기를 켠 인증 학생만), 같이 공부(첫 모임) · 수업 링크
 *   Questions 같은 수업 학생끼리 묻고 답하기 (server/classqa.ts)
 *   Study     Lumi 가 제안한 스터디 그룹 · 학생이 연 스터디 모임 · 프로젝트 파트너 목록
 */
export function ClassPage() {
  const { courseName = '' } = useParams();
  return <ClassSpace name={decodeURIComponent(courseName)} />;
}

/**
 * 학교 수업 목록의 수업 하나 (/classes/course/:courseId) — 시간표에 넣기 전에도 열린다 (owner 2026-11-06).
 * 이미 넣은 수업이면 그 수업 공간(ClassSpace) 그대로, 아니면 수업 정보 · Lumi 학생 수 · 바깥 링크 + 아래 "Add to schedule".
 * 질문은 넣은 (인증) 학생만 — 넣기 전에는 한 줄만.
 */
export function CatalogClassPage() {
  const { courseId = '' } = useParams();
  const v = useViewer();
  const schoolId = schoolOf(v.me);
  const hit = useCatalogCourse(schoolId, { id: decodeURIComponent(courseId) });
  if (hit === undefined) return <div className="min-h-full bg-bg"><BackHeader title={en ? 'Class space' : '수업 공간'} /><LoadingCards className="px-4 pt-2" count={2} /></div>;
  if (!hit) return (
    <div className="min-h-full bg-bg">
      <BackHeader title={en ? 'Class space' : '수업 공간'} />
      <EmptyState icon={<BookOpen size={28} />} title={en ? 'We couldn’t find this class' : '수업을 찾을 수 없어요'} action={{ label: en ? 'Add classes' : '수업 추가', onClick: () => history.back() }} />
    </div>
  );
  const c = hit.course;
  const slug = codeSlug(c.code), term = courseTerm(c);
  const row = isCourseAdded(v.me.timetable ?? [], c) ? (v.me.timetable ?? []).find((x) => x.name === catalogCourseName(c)) ?? (v.me.timetable ?? []).find((x) => { const code = courseCodeOf(x); return !!code && codeSlug(code) === slug && courseTermOf(x) === term; }) : undefined;
  if (row) return <ClassSpace name={row.name} catalog={hit} fromCatalog />;
  return <NotAddedSpace c={c} count={hit.count} />;
}

function NotAddedSpace({ c, count }: { c: CatalogCourse; count: number }) {
  const [params, setParams] = useSearchParams();
  const v = useViewer();
  const add = useAddCourse();
  const [busy, setBusy] = useState(false);
  const details = useCatalogDetails(schoolOf(v.me), c.id);
  const tab = tabOf(params.get('tab'), 'reviews');
  const setTab = (k: string) => setParams(k === 'reviews' ? {} : { tab: k }, { replace: true });
  const name = catalogCourseName(c);
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Class space' : '수업 공간'} />
      <div className="px-4 pt-1 flex-1 pb-6">
        <div className="rounded-[20px] bg-t-ice border border-line px-4 py-4">
          <div className="text-[12px] text-t-ice-fg/80">{courseTerm(c) || (en ? 'Class' : '수업')}</div>
          <div className="text-[26px] font-extrabold tracking-[-0.02em] text-t-ice-fg leading-tight mt-0.5 [overflow-wrap:anywhere]">{c.code}</div>
          <div className="text-[13px] text-ink-2 mt-1 line-clamp-2">{c.title}</div>
          <HeaderStars code={c.code} onOpen={() => setTab('reviews')} />
        </div>
        <SegTabs className="mt-3" value={tab === 'study' ? 'class' : tab} onChange={setTab} tabs={courseTabs(true)} />
        <div className="pt-4">
          {tab === 'class' && (
            <div className="space-y-5">
              <CourseInfoCard c={c} details={details} />
              <LumiCountLine count={count} />
              <InfoNote>{en ? 'Add this class to see classmates who opted in.' : '수업을 넣으면 스스로 켠 같은 수업 학생이 보여요.'}</InfoNote>
              <StudyPreview name={name} enrollment={undefined} onAll={() => setTab('study')} />
              <Elsewhere c={c} />
            </div>
          )}
          {tab === 'reviews' && <CourseReviewsTab code={c.code} onAsk={() => setTab('questions')} />}
          {tab === 'exam' && <ExamInfoTab code={c.code} onAsk={() => setTab('questions')} />}
          {tab === 'questions' && <p className="px-1 py-2 text-[14px] text-ink-2">{en ? 'Add this class to see and ask questions.' : '수업을 넣으면 질문을 보고 물어볼 수 있어요.'}</p>}
          {tab === 'study' && <Study name={name} enrollment={undefined} roster={undefined} />}
        </div>
      </div>
      <BottomCTA>
        <Btn full size="lg" loading={busy} onClick={async () => { setBusy(true); try { await add(c); } catch { /* toast */ } finally { setBusy(false); } }}>{en ? 'Add to schedule' : '시간표에 추가'}</Btn>
      </BottomCTA>
    </div>
  );
}

/** 내 시간표의 수업 공간. catalog 를 주면(목록에서 연 경우) 그 수업 정보로, 아니면 과목 코드·학기로 목록에서 찾아 본다 */
export function ClassSpace({ name, catalog, fromCatalog }: { name: string; catalog?: { course: CatalogCourse; count: number }; fromCatalog?: boolean }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const v = useViewer();
  const me = v.me;
  const rosters = useAppStore((s) => s.classRosters);
  const mine = me.timetable.filter((c) => c.name === name);
  const tab = tabOf(params.get('tab'));
  const firstCode = mine[0] ? courseCodeOf(mine[0]) : null;
  const looked = useCatalogCourse(catalog ? '' : schoolOf(me), firstCode ? { code: firstCode, term: courseTermOf(mine[0]) } : {});
  const cc = catalog ?? looked ?? undefined;
  const details = useCatalogDetails(schoolOf(me), cc?.course.id);
  if (!mine.length) return (
    <div className="min-h-full bg-bg">
      <BackHeader title={en ? 'Class space' : '수업 공간'} />
      <EmptyState icon={<BookOpen size={28} />} title={en ? 'This class isn’t in your schedule' : '내 시간표에 없는 수업이에요'} action={{ label: en ? 'Go to Schedule' : '일정으로', onClick: () => nav('/schedule') }} />
    </div>
  );
  const first = mine[0];
  const code = courseCodeOf(first);
  const enrollment = code ? enrollments(me).find((e) => e.key === classKey(schoolOf(me), code, courseTermOf(first))) : undefined;
  const roster = enrollment ? rosters?.find((r) => r.id === enrollment.key) : undefined;
  const title = code && name.startsWith(code) ? name.slice(code.length).trim() : '';
  const lecture = mine.filter((c) => !c.section);
  const lead = lecture[0] ?? first;
  // "Mon / Wed · 10 AM" — 강의, 그 밑에 디스커션·랩
  const when = (rows: typeof mine) => `${[...new Set([...rows].sort((a, b) => a.day - b.day).map((c) => DAY_LABELS[c.day]))].join(en ? ' / ' : '·')} · ${formatTime(rows[0].start)}`;
  const sections = [...new Set(mine.filter((c) => c.section).map((c) => c.section!))].map((s) => `${s} ${when(mine.filter((c) => c.section === s))}`);
  const setTab = (k: string) => setParams(k === 'class' ? {} : { tab: k }, { replace: true });

  return (
    <div className={cn('min-h-full bg-bg', fromCatalog ? 'flex flex-col' : 'pb-10')}>
      <BackHeader title={en ? 'Class space' : '수업 공간'} />
      <PageTitle title={en ? 'Class space' : '수업 공간'} className="pb-3" />
      <div className="px-4">
        <div className="rounded-[20px] bg-t-ice border border-line px-4 py-4">
          <div className="text-[12px] text-t-ice-fg/80">{en ? 'Your class space' : '내 수업 공간'}</div>
          <div className="text-[26px] font-extrabold tracking-[-0.02em] text-t-ice-fg leading-tight mt-0.5 [overflow-wrap:anywhere]">{code ?? name}</div>
          <div className="text-[13px] text-ink-2 mt-1 truncate">{[title, courseTermOf(first)].filter(Boolean).join(' · ')}</div>
          {code && <HeaderStars code={code} onOpen={() => setTab('reviews')} />}
        </div>
        <SegTabs className="mt-3" value={tab === 'study' ? 'class' : tab} onChange={setTab} tabs={courseTabs()} />
        <div className="pt-4">
          {tab === 'class' && (
            <div className="space-y-6">
              {cc && <CourseInfoCard c={cc.course} details={details} />}
              {cc && <LumiCountLine count={cc.count} />}
              <InfoRows rows={[
                { tone: 'ice', icon: <CalendarDays size={20} />, label: en ? 'Your class time' : '수업 시간', value: when(lecture.length ? lecture : mine), caption: sections.length ? sections.join(' · ') : (en ? 'From your schedule' : '내 시간표'), onClick: () => nav('/schedule') },
                { tone: 'peach', icon: <MapPin size={20} />, label: en ? 'Classroom' : '강의실', value: lead.room || (en ? 'Private to you' : '나만 보기'), caption: lead.room ? (en ? 'Only you see this · Edit class details' : '나만 보여요 · 수업 정보 수정') : (en ? 'Edit class details' : '수업 정보 수정'), onClick: () => nav(`/schedule/classes/${lead.id}`) },
              ]} />
              {enrollment ? <Classmates enrollment={enrollment} roster={roster} /> : (
                <InfoNote>{en ? 'Classmates are matched by course code, like “CS 61A”. Add this class from your school’s class list to find who else takes it.' : '같은 수업 학생은 과목 코드(예: CS 61A)로 찾아요. 학교 수업 목록에서 추가해 주세요.'}</InfoNote>
              )}
              <StudyPreview name={name} enrollment={enrollment} onAll={() => setTab('study')} />
              {cc && <Elsewhere c={cc.course} />}
              {enrollment && <CopyClassLink compact schoolId={enrollment.schoolId} code={enrollment.code} />}
              <InfoNote>{en ? 'Classmates appear only when they opt in. This is not a university roster.' : '같은 수업 학생은 스스로 켠 사람만 보여요. 학교 명단이 아니에요.'}</InfoNote>
            </div>
          )}
          {(tab === 'reviews' || tab === 'exam') && (code
            ? (tab === 'reviews' ? <CourseReviewsTab code={code} onAsk={() => setTab('questions')} /> : <ExamInfoTab code={code} onAsk={() => setTab('questions')} />)
            : <EmptyState icon={<BookOpen size={28} />} title={en ? 'Reviews need a course code' : '과목 코드가 필요해요'} sub={en ? 'Add this class from your school’s class list to see its reviews.' : '학교 수업 목록에서 추가하면 리뷰를 볼 수 있어요.'} action={{ label: en ? 'Find it in the class list' : '수업 목록에서 찾기', onClick: () => nav('/schedule/classes') }} />)}
          {tab === 'questions' && (
            !enrollment ? <EmptyState icon={<BookOpen size={28} />} title={en ? 'Questions need a course code' : '과목 코드가 필요해요'} sub={en ? 'Add this class from your school’s class list to ask classmates.' : '학교 수업 목록에서 추가하면 같은 수업 학생에게 물어볼 수 있어요.'} action={{ label: en ? 'Find it in the class list' : '수업 목록에서 찾기', onClick: () => nav('/schedule/classes') }} />
              : roster?.unverified ? <Verify code={enrollment.code} />
              : roster?.hidden ? <ShowMe code={enrollment.code} />
              : <ClassQuestions classKey={enrollment.key} code={enrollment.code} />
          )}
          {tab === 'study' && <Study name={name} enrollment={enrollment} roster={roster} />}
        </div>
      </div>
      {fromCatalog && <BottomCTA><Btn full size="lg" disabled>{en ? 'Added ✓' : '추가됨 ✓'}</Btn></BottomCTA>}
    </div>
  );
}

function Verify({ code }: { code: string }) {
  return (
    <div className="space-y-4">
      <div className={cn(cardCls, 'p-4')}>
        <div className="flex items-center gap-2 text-[15px] font-bold"><Lock size={16} />{en ? `Verify your school email to see who’s in ${code}` : `학교 이메일을 인증하면 ${code} 학생이 보여요`}</div>
        <p className="text-[13px] text-ink-2 mt-1">{en ? 'Class spaces are only for verified students, so nobody can add a class just to look.' : '수업 공간은 인증한 학생에게만 보여요.'}</p>
      </div>
      <SchoolEmailCard />
    </div>
  );
}

function ShowMe({ code }: { code: string }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  return (
    <div className={cn(cardCls, 'p-4')}>
      <div className="text-[15px] font-bold">{en ? 'You’re hidden from classmates' : '같은 수업 학생에게 숨겨져 있어요'}</div>
      <p className="text-[13px] text-ink-2 mt-1">{en ? `Turn this on to see ${code} classmates and their questions. They only see that you take the class.` : `켜면 ${code} 학생과 질문이 보여요. 상대에게는 같은 수업을 듣는다는 것만 보여요.`}</p>
      <Btn className="mt-3" size="sm" variant="outline" onClick={() => run(() => api.users.update(v.me.id, { showToClassmates: true }))}>{en ? 'Show me to classmates' : '같은 수업 학생에게 보이기'}</Btn>
    </div>
  );
}

/** 같은 수업 학생 — 서버가 보낸 classRosters 만 (보이기를 켠 인증 학생) */
function Classmates({ enrollment, roster }: { enrollment: Enrollment; roster: ClassRoster | undefined }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const members = useMemo(() => (roster?.members ?? []).map((m) => ({ m, u: v.userById(m.userId) })).filter((x): x is { m: ClassRoster['members'][number]; u: User } => !!x.u), [roster, v]);
  if (roster?.unverified) return <Verify code={enrollment.code} />;
  if (roster?.hidden) return <ShowMe code={enrollment.code} />;
  return (
    <section>
      <SectionHeader title={en ? 'Classmates' : '같은 수업 학생'} />
      {members.length === 0 ? (
        <div className={cn(cardCls, 'p-4 text-[13.5px] text-ink-2')}>{en ? `You’re the only ${enrollment.code} student on Lumi so far. Share the class link in your class chat.` : `아직 Lumi 에 ${enrollment.code} 학생이 나뿐이에요. 수업 단톡방에 링크를 공유해 보세요.`}</div>
      ) : (
        <div className={cn(cardCls, 'divide-y divide-line')}>
          {members.slice(0, 20).map(({ m, u }) => (
            <button key={u.id} onClick={() => nav(`/users/${u.id}`)} className="w-full flex items-center gap-3 px-4 py-3 text-left press">
              <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} />
              <span className="flex-1 min-w-0">
                <span className="block text-[14.5px] font-semibold truncate">{u.nickname}{u.sample && <span className="ml-1.5 text-[11px] font-medium text-ink-3">{en ? 'Sample' : '예시'}</span>}</span>
                {m.section && <span className={cn('block text-[12px]', m.section === roster?.mySection ? 'text-sel-fg font-semibold' : 'text-ink-3')}>{m.section === roster?.mySection ? (en ? `Same section · ${m.section}` : `같은 분반 · ${m.section}`) : m.section}</span>}
              </span>
            </button>
          ))}
          {members.length > 20 && <div className="px-4 py-2.5 text-[12.5px] text-ink-3">{en ? `and ${members.length - 20} more` : `외 ${members.length - 20}명`}</div>}
        </div>
      )}
      <div className="flex items-center gap-3 mt-3 px-1">
        <span className="flex-1 text-[13px] text-ink-2">{en ? 'Show me to classmates' : '같은 수업 학생에게 보이기'}</span>
        <Switch checked={v.me.showToClassmates !== false} label={en ? 'Show me to classmates' : '같은 수업 학생에게 보이기'} onChange={(on) => run(() => api.users.update(v.me.id, { showToClassmates: on }))} />
      </div>
    </section>
  );
}

/** 이 수업의 스터디 — Lumi 제안 (초대받은 것만) + 학생이 연 스터디 모임 */
function useStudy(name: string, enrollment: Enrollment | undefined) {
  const v = useViewer();
  const activities = useAppStore((s) => s.activities);
  const today = campusDateOf(new Date());
  const code = enrollment?.code ?? codeFromName(name);
  const suggested = enrollment ? activities.filter((a) => a.studyGroup?.key === enrollment.key && a.studyGroup.invitedIds.includes(v.me.id) && a.studyGroup.status !== 'expired' && a.date >= today) : [];
  const crews = v.visibleActivities.filter((a) => !a.studyGroup && a.category === 'study' && a.courseName && (a.courseName === name || (code && codeFromName(a.courseName) === code)) && a.date >= today);
  return { suggested, crews };
}

function StudyCard({ a }: { a: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  const people = useAppStore((s) => s.participations).filter((p) => p.activityId === a.id && p.status === 'approved').map((p) => v.userById(p.userId)).filter((u): u is User => !!u);
  const host = v.userById(a.hostId);
  const sg = a.studyGroup;
  const faces = sg ? sg.invitedIds.filter((id) => sg.responses[id] === 'in').map((id) => v.userById(id)).filter((u): u is User => !!u) : [host, ...people].filter((u): u is User => !!u);
  const day = (new Date(`${a.date}T12:00:00Z`).getUTCDay() + 6) % 7;
  return (
    <MeetupCard tone="ice" icon={<BookOpen size={20} />} badge={sg ? (en ? 'Suggested by Lumi' : 'Lumi 제안') : (en ? 'Study' : '스터디')}
      title={sg ? `${sg.code} · ${slotLabel({ day, start: a.startTime, end: a.endTime }, en)}` : a.title}
      meta={`${formatDate(a.date)} ${formatTime(a.startTime)} · ${a.place.name}`}
      people={faces.map((u) => ({ id: u.id, avatar: u.avatar }))}
      footnote={sg ? (sg.responses[v.me.id] ? (en ? 'You answered' : '답했어요') : (en ? 'Waiting on you' : '내 답을 기다려요')) : a.sample ? (en ? 'Sample meetup' : '예시 모임') : undefined}
      action={en ? 'View' : '보기'} onClick={() => nav(sg ? `/study/${a.id}` : `/activities/${a.id}`)} />
  );
}

function StudyPreview({ name, enrollment, onAll }: { name: string; enrollment: Enrollment | undefined; onAll: () => void }) {
  const nav = useNavigate();
  const { suggested, crews } = useStudy(name, enrollment);
  const first = suggested[0] ?? crews[0];
  return (
    <section>
      <SectionHeader title={en ? 'Study together' : '같이 공부'} action={first ? (en ? 'See all' : '모두 보기') : (en ? 'Create' : '만들기')} onAction={first ? onAll : () => nav(`/create/activity?crew=${encodeURIComponent(name)}`)} />
      {first ? <StudyCard a={first} /> : (
        <button onClick={() => nav(`/create/activity?crew=${encodeURIComponent(name)}`)} className={cn(cardCls, 'w-full p-4 flex items-center gap-3 text-left press')}>
          <Plus size={18} className="text-sel-fg" /><span className="text-[14px] font-semibold">{en ? 'Start a study group for this class' : '이 수업 스터디 만들기'}</span>
        </button>
      )}
    </section>
  );
}

function Study({ name, enrollment, roster }: { name: string; enrollment: Enrollment | undefined; roster: ClassRoster | undefined }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const { suggested, crews } = useStudy(name, enrollment);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const me = v.me;
  const code = enrollment?.code ?? name;
  const partners = (roster?.partners ?? []).map((p) => ({ p, u: v.userById(p.userId), section: roster?.members.find((m) => m.userId === p.userId)?.section })).filter((x): x is { p: ClassRoster['partners'][number]; u: User; section: string | undefined } => !!x.u);
  const mySearch = enrollment ? me.partnerSearch?.find((p) => p.key === enrollment.key) : undefined;
  const optedOut = enrollment ? (me.studyGroupOptOut ?? []).includes(enrollment.key) : false;
  const setPartner = async (n: string | null) => {
    if (!enrollment) return;
    setBusy(true);
    try { await run(() => api.classes.setPartner(me.id, enrollment.key, n), n === null ? (en ? 'Removed you from the list' : '목록에서 내렸어요') : (en ? `You’re on the ${code} partner list` : '파트너 목록에 올렸어요')); setAdding(false); setNote(''); } catch { /* toast */ } finally { setBusy(false); }
  };
  const ask = (u: User) => nav(`/users/${u.id}?propose=1&cat=study&msg=${encodeURIComponent(en ? `Want to partner up for the ${code} project?` : `${code} 프로젝트 같이 할래요?`)}`);
  const usable = enrollment && !roster?.unverified && !roster?.hidden;
  return (
    <div className="space-y-6">
      <section>
        <SectionHeader title={en ? 'Study together' : '같이 공부'} action={en ? 'Create' : '만들기'} onAction={() => nav(`/create/activity?crew=${encodeURIComponent(name)}`)} />
        <div className="space-y-3">
          {[...suggested, ...crews].map((a) => <StudyCard key={a.id} a={a} />)}
          {!suggested.length && !crews.length && <div className={cn(cardCls, 'p-4 text-[13.5px] text-ink-2')}>{en ? 'Lumi suggests a group when 3–4 of you are free at the same time.' : '3~4명이 같은 시간에 비면 Lumi가 제안해요.'}</div>}
        </div>
        {usable && (
          <div className="flex items-center gap-3 mt-3 px-1">
            <span className="flex-1 text-[13px] text-ink-2">{en ? `Lumi can suggest ${code} study groups` : `${code} 스터디 제안 받기`}<span className="block text-[11.5px] text-ink-3">{en ? 'At most one a week. Only the group sees it.' : '일주일에 한 번까지. 그룹 사람에게만 보여요.'}</span></span>
            <Switch checked={!optedOut} label={en ? 'Study group suggestions' : '스터디 제안'} onChange={(on) => run(() => api.users.update(me.id, { studyGroupOptOut: on ? (me.studyGroupOptOut ?? []).filter((k) => k !== enrollment!.key) : [...(me.studyGroupOptOut ?? []), enrollment!.key] }))} />
          </div>
        )}
      </section>

      {usable && (
        <section>
          <SectionHeader title={en ? 'Project partners' : '프로젝트 파트너'} />
          <div className="space-y-3">
            {partners.map(({ p, u, section }) => (
              <div key={u.id} className={cn(cardCls, 'p-4 flex items-center gap-3')}>
                <button onClick={() => nav(`/users/${u.id}`)} className="shrink-0"><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} /></button>
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-bold truncate">{u.nickname}{u.sample && <span className="ml-1.5 text-[11px] font-medium text-ink-3">{en ? 'Sample' : '예시'}</span>}</div>
                  <div className="text-[12.5px] text-ink-3 truncate">{[section, p.note, p.overlap.length ? `${en ? 'both free' : '같이 비는 시간'} ${p.overlap.slice(0, 2).map((o) => slotLabel(o, en)).join(', ')}` : ''].filter(Boolean).join(' · ')}</div>
                </div>
                <Btn size="sm" variant="outline" onClick={() => ask(u)}>{en ? 'Ask' : '물어보기'}</Btn>
              </div>
            ))}
            {mySearch ? (
              <div className={cn(cardCls, 'p-4')}>
                <div className="text-[14px] font-semibold">{en ? 'You’re on the list' : '목록에 올라가 있어요'}{mySearch.note ? ` · ${mySearch.note}` : ''}</div>
                <div className="text-[12.5px] text-ink-3 mt-0.5">{en ? `Only ${code} students see it` : `${code} 학생에게만 보여요`}</div>
                <Btn className="mt-3" size="sm" variant="outline" loading={busy} onClick={() => setPartner(null)}>{en ? 'I paired up — remove me' : '짝을 찾았어요 — 내리기'}</Btn>
              </div>
            ) : adding ? (
              <div className={cn(cardCls, 'p-4 space-y-3')}>
                <TextInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder={en ? 'One line, optional — “works early”' : '한 줄 (선택) — "아침형"'} />
                <div className="flex gap-2"><Btn size="sm" variant="outline" loading={busy} onClick={() => setPartner(note)}>{en ? 'Add me' : '올리기'}</Btn><Btn size="sm" variant="link" onClick={() => setAdding(false)}>{en ? 'Cancel' : '취소'}</Btn></div>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className={cn(cardCls, 'w-full p-4 flex items-center gap-3 text-left press')}>
                <Handshake size={18} className="text-sel-fg shrink-0" />
                <span><span className="block text-[14px] font-semibold">{en ? 'I’m looking for a partner' : '나도 파트너 찾는 중'}</span><span className="block text-[12.5px] text-ink-3">{en ? `Only ${code} students see it` : `${code} 학생에게만 보여요`}</span></span>
              </button>
            )}
          </div>
        </section>
      )}
      {!enrollment && <InfoNote><Users size={13} className="inline mr-1" />{en ? 'Add this class from the class list to find study partners.' : '수업 목록에서 추가하면 스터디 파트너를 찾을 수 있어요.'}</InfoNote>}
    </div>
  );
}
