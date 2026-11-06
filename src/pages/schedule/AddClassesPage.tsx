import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Check, Search, Star, X } from 'lucide-react';
import { lang } from '@core/i18n';
import type { CatalogCourse, CatalogDetails, CatalogSection } from '@core/api/types';
import { api } from '@core/api';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { WeekGrid } from '@/components/timetable/WeekGrid';
import { Btn, Chip, FilterBar, SearchField, type FilterGroup, type FilterValues, type GroupRenderer } from '@/components/ha';
import { DAY_LABELS, todayIdx } from '@core/lib/timetable';
import { codeSlug, courseTermOf } from '@core/lib/classmates';
import { LEVEL_LABELS, courseLevel, findCourses, findOverlap, isCourseAdded, lumiCountLabel, majorDepartment, meetingLine, noteLine, orderDepartments, overlapLine, popularOnLumi, toggleFavorite, type CourseLevel, type CourseSort } from '@core/lib/coursefinder';
import { courseLinks } from '@core/lib/courseLinks';
import { openExternal } from '@/lib/native';
import { cn } from '@core/lib/cn';
import { departmentsOf, useCatalogBrowse, useCatalogTerms } from './catalogData';
import { useAddCourse } from './addCourse';
import { CourseStars, useCourseStars } from '@/components/reviews/ReviewParts';

const en = lang === 'en';
const L = (e: string, k: string) => (en ? e : k);
const PAGE = 50;
/** 위쪽 내 시간표 — 화면 높이의 35~40% (390×844 에서 약 300px) */
const GRID_HOUR_PX = 26;

/**
 * 수업 추가 (S029) — owner 2026-11-06: "CalCentral 에 이미 있는 내 수업을 30초 안에 Lumi 에 넣기". 계획 도구가 아니다.
 *   위: 이번 학기 내 시간표(작게) — 고른 수업을 핑크 테두리로 미리 보여 준다
 *   검색이 주인공: "cs61a" · "COMPSCI 61A" · "61a" · "math 1a"(옛 번호) · 다섯 자리 수업 번호
 *   필터(Explore 와 같은 FilterBar): 학기 · 학과(★) · 학년 단계 · 정렬
 *   줄을 누르면 펼쳐진다: 학교 노트 한 줄(핑크) · 겹침 · 디스커션·랩(선택) · [Add to schedule] [Class page] · Berkeleytime ↗
 *   넣어도 목록은 그대로 — 계속 넣고 Done. 목록에 없으면 맨 아래 "Can't find it? Add it yourself" (직접 입력 폼)
 */
export function AddClassesPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const me = v.me;
  const timetable = me.timetable ?? [];
  const schoolId = me.affiliation.type === 'university' ? me.affiliation.schoolId ?? '' : '';
  const undergrad = me.affiliation.type === 'university' && (me.affiliation.role ?? 'undergraduate') === 'undergraduate';
  const terms = useCatalogTerms(schoolId);
  const wantTerm = params.get('term') ?? '';
  const [values, setValues] = useState<FilterValues>({ term: '', dept: '', level: '', sort: 'default' });
  // 좌석 알림 등에서 ?term=Spring 2027 로 열면 그 학기
  useEffect(() => { if (terms?.next && wantTerm === terms.next) setValues((x) => ({ ...x, term: wantTerm })); }, [terms?.next, wantTerm]);
  const term = terms ? values.term || terms.current : null;
  const data = useCatalogBrowse(schoolId, term);
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [addedHere, setAddedHere] = useState(0);
  const add = useAddCourse();
  const run = useAppStore((s) => s.run);

  const depts = useMemo(() => departmentsOf(data.courses), [data.courses]);
  const favorites = me.favoriteDepartments ?? [];
  const query = (f: FilterValues, text = dq) => ({ q: text, dept: f.dept, level: (f.level || '') as CourseLevel | '', sort: (f.sort || 'default') as CourseSort, undergrad });
  const list = useMemo(() => findCourses(data.courses, query(values)), [data.courses, dq, values, undergrad]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setShown(PAGE); }, [list]);

  const groups: FilterGroup[] = useMemo(() => [
    ...(terms?.next ? [{ key: 'term', title: L('Term', '학기'), options: [{ value: '', label: terms.current }, { value: terms.next, label: terms.next }] }] : []),
    { key: 'dept', title: L('Department', '학과'), options: depts.map((d) => ({ value: d.name, label: d.name })) },
    { key: 'level', title: L('Level', '단계'), options: (['lower', 'upper', 'grad'] as CourseLevel[]).map((k) => ({ value: k, label: LEVEL_LABELS[k][en ? 0 : 1] })) },
    { key: 'sort', title: L('Sort', '정렬'), required: true, options: [{ value: 'default', label: L('Default', '기본') }, { value: 'code', label: L('Course code', '과목 코드') }, { value: 'name', label: L('Name', '이름') }] },
  ], [terms, depts]);
  // 학기를 바꾸면 그 학기 목록이 와야 셀 수 있다 — 같은 학기 초안만 바로 센다
  const count = (draft: FilterValues) => ((draft.term ?? '') === (values.term ?? '') ? findCourses(data.courses, query(draft)).length : 1);
  const setFav = (name: string) => run(() => api.users.update(me.id, { favoriteDepartments: toggleFavorite(favorites, name) })).catch(() => {});
  const renderGroup: GroupRenderer = (g, value, set) => (g.key === 'dept' ? <DeptPicker depts={depts} value={value} favorites={favorites} onPick={set} onStar={setFav} /> : null);

  // 위쪽 격자: 보고 있는 학기의 내 수업 + 펼친 수업 미리보기
  const termCourses = timetable.filter((c) => courseTermOf(c) === (data.term || term));
  const openCourse = open ? list.find((c) => c.id === open) ?? data.courses.find((c) => c.id === open) : undefined;
  const [pickedSections, setPickedSections] = useState<CatalogSection[]>([]);
  useEffect(() => { setPickedSections([]); }, [open]);
  const added = openCourse ? isCourseAdded(timetable, openCourse) : false;
  const ghostMeetings = openCourse && !added ? [...openCourse.meetings.map((m) => ({ ...m, label: openCourse.code })), ...pickedSections.flatMap((s) => s.meetings.map((m) => ({ ...m, label: s.label })))] : [];
  const weekend = [...termCourses, ...ghostMeetings].some((c) => c.day >= 5);
  const days = weekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  const overlap = openCourse && !added ? findOverlap(termCourses, ghostMeetings, openCourse.code) : null;

  // 검색칸 — "Add Classes" 로 열면 바로 칠 수 있게
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => { searchRef.current?.querySelector('input')?.focus({ preventScroll: true }); }, []);
  // 끝없이 내리기 — 바닥 근처에 오면 다음 묶음
  const listRef = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setShown((n) => n + PAGE); }, { root: listRef.current, rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [list, shown]);

  // 검색칸이 비고 학과·단계도 안 골랐으면: A–Z 목록 대신 "내 전공 수업" → "Popular on Lumi", 둘 다 없으면 한 줄 안내
  const [openReq, setOpenReq] = useState({ n: 0, focus: undefined as string | undefined });
  const curated = useMemo(() => {
    if (dq.trim() || values.dept || values.level) return null;
    const out: { key: string; title: string; items: CatalogCourse[]; more?: { label: string; run: () => void } }[] = [];
    const major = majorDepartment(me.affiliation.type === 'university' ? me.affiliation.department : undefined, depts.map((d) => d.name));
    if (major) {
      const all = findCourses(data.courses, { dept: major, undergrad });
      if (all.length) out.push({ key: 'major', title: L(`${major} classes`, `${major} 수업`), items: all.slice(0, 8), more: all.length > 8 ? { label: L(`See all ${all.length}`, `${all.length}개 모두`), run: () => setValues((v) => ({ ...v, dept: major })) } : undefined });
    }
    const popular = popularOnLumi(data.courses, data.counts);
    if (popular.length) out.push({ key: 'popular', title: L('Popular on Lumi', 'Lumi 에서 많이 듣는 수업'), items: popular });
    return out;
  }, [dq, values.dept, values.level, data.courses, data.counts, depts, me.affiliation, undergrad]); // eslint-disable-line react-hooks/exhaustive-deps
  // ★ avg (count) on rows with 3+ reviews (server/coursereviews.ts) — nothing under 3, no placeholder stars
  const stars = useCourseStars(curated ? curated.flatMap((x) => x.items.map((c) => c.code)) : list.slice(0, shown).map((c) => c.code));
  const row = (c: CatalogCourse) => (
    <CourseRow key={c.id} c={c} count={data.counts[codeSlug(c.code)]} stars={stars[codeSlug(c.code)]} open={open === c.id} added={isCourseAdded(timetable, c)}
      overlap={open === c.id && overlap ? overlapLine(overlap, DAY_LABELS, en) : null}
      picked={open === c.id ? pickedSections : []} onPickSections={setPickedSections}
      onToggle={() => setOpen(open === c.id ? null : c.id)} onAdd={() => doAdd(c)}
      onPage={() => nav(`/classes/course/${encodeURIComponent(c.id)}?tab=reviews`)} schoolId={schoolId} />
  );

  const close = () => (window.history.length > 1 ? nav(-1) : nav('/schedule', { replace: true }));
  const doAdd = async (c: CatalogCourse) => {
    try { await add(c, pickedSections); setAddedHere((n) => n + 1); setPickedSections([]); data.refreshCounts(); } catch { /* run 이 오류 토스트 */ }
  };

  return (
    <div className="h-full flex flex-col bg-bg">
      <header className="shrink-0 h-14 px-2 flex items-center gap-1">
        <button onClick={close} aria-label={L('Close', '닫기')} className="h-10 w-10 rounded-full grid place-items-center text-ink press"><X size={22} /></button>
        <h1 className="flex-1 min-w-0 truncate text-[17px] font-bold tracking-[-0.01em]">{L('Add classes', '수업 추가')}</h1>
        {addedHere > 0 && <button onClick={() => nav('/schedule', { replace: true })} className="h-10 px-3 text-[15px] font-bold text-sel-fg press">{L('Done', '완료')}</button>}
      </header>

      <div className="shrink-0 px-3 flex flex-col" style={{ maxHeight: '38%' }}>
        <div className="min-h-0 rounded-[16px] bg-surface border border-line overflow-y-auto hide-scrollbar px-0.5">
          <WeekGrid courses={termCourses} days={days} today={term === terms?.current ? todayIdx() : -1} hourPx={GRID_HOUR_PX} ghosts={ghostMeetings} onCourse={() => {}} />
        </div>
      </div>

      <div className="shrink-0 px-4 pt-3 space-y-2.5">
        <div ref={searchRef}>
          <SearchField placeholder={L('CS 61A, 61a, or class number', '과목 코드 · 번호 · 이름')} value={q} onChange={(x) => { setQ(x); setOpen(null); }} />
        </div>
        <FilterBar groups={groups} values={values} count={count} renderGroup={renderGroup} openRequest={openReq} onApply={(next) => { setValues(next); setOpen(null); }} />
      </div>

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain mt-2 pb-24" aria-busy={data.loading}>
        {!schoolId ? (
          <ManualOnly onManual={() => nav('/schedule/classes/manual')} />
        ) : data.loading ? (
          <div className="px-4 space-y-2 pt-1" aria-label={L('Loading classes', '수업 목록 읽는 중')}>
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[92px] rounded-[16px] bg-surface border border-line animate-pulse" />)}
          </div>
        ) : (
          <>
            {data.error && <p className="px-4 py-3 text-[13.5px] text-ink-2">{L('We couldn’t load the class list. You can add a class yourself.', '수업 목록을 불러오지 못했어요. 직접 넣을 수 있어요.')}</p>}
            {!data.error && curated && (
              curated.length ? curated.map((sec) => (
                <section key={sec.key} className="mb-4">
                  <div className="flex items-baseline gap-2 px-4 pt-1 pb-2">
                    <h2 className="flex-1 min-w-0 text-[15px] font-bold leading-snug">{sec.title}</h2>
                    {sec.more && <button onClick={sec.more.run} className="shrink-0 text-[13px] font-semibold text-sel-fg press">{sec.more.label}</button>}
                  </div>
                  <ul className="divide-y divide-line border-y border-line" role="list">{sec.items.map(row)}</ul>
                </section>
              )) : (
                <div className="px-6 pt-6 text-center">
                  <p className="text-[14.5px] text-ink-2 leading-snug">{L('Type a course code like CS 61A or a class number', 'CS 61A 같은 과목 코드나 수업 번호를 쳐 보세요')}</p>
                  <Btn variant="outline" size="sm" className="mt-4" onClick={() => setOpenReq((r) => ({ n: r.n + 1, focus: 'dept' }))}>{L('Browse by department', '학과로 찾기')}</Btn>
                </div>
              )
            )}
            {!data.error && !curated && list.length === 0 && <p className="px-4 pt-2 text-[14px] text-ink-2">{dq.trim() ? L(`No class matches “${dq.trim()}”.`, `“${dq.trim()}”에 맞는 수업이 없어요.`) : L('No classes with these filters.', '이 조건의 수업이 없어요.')}</p>}
            {!curated && <ul className="divide-y divide-line border-y border-line" role="list">{list.slice(0, shown).map(row)}</ul>}
            {!curated && shown < list.length && <div ref={sentinel} className="h-10" aria-hidden />}
            {(curated || shown >= list.length) && (
              <div className="px-4 pt-5 pb-2 text-center">
                <button onClick={() => nav('/schedule/classes/manual')} className="text-[14px] font-semibold text-sel-fg press">{L('Can’t find it? Add it yourself', '못 찾겠어요? 직접 넣기')}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ManualOnly({ onManual }: { onManual: () => void }) {
  return (
    <div className="px-4 pt-4 text-center">
      <p className="text-[14px] text-ink-2">{L('Your school’s class list isn’t on Lumi yet.', '아직 학교 수업 목록이 없어요.')}</p>
      <button onClick={onManual} className="mt-3 text-[14px] font-semibold text-sel-fg press">{L('Add a class yourself', '직접 넣기')}</button>
    </div>
  );
}

/** 목록 한 줄 — 코드+이름(굵게) · 교수 · 요일·시각 · 장소 · 학점·단계, 오른쪽에 조용히 "N on Lumi". 누르면 펼친다 */
function CourseRow({ c, count, stars, open, added, overlap, picked, onPickSections, onToggle, onAdd, onPage, schoolId }: {
  c: CatalogCourse; count?: number; stars?: { avg: number; count: number }; open: boolean; added: boolean; overlap: string | null; picked: CatalogSection[];
  onPickSections: (s: CatalogSection[]) => void; onToggle: () => void; onAdd: () => Promise<void>; onPage: () => void; schoolId: string;
}) {
  const level = courseLevel(c.code);
  const lumi = lumiCountLabel(count, en);
  const [busy, setBusy] = useState(false);
  const meta = [c.units != null ? (en ? `${c.units} unit${c.units === 1 ? '' : 's'}` : `${c.units}학점`) : '', level ? LEVEL_LABELS[level][en ? 0 : 1] : ''].filter(Boolean).join(' · ');
  const site = open ? courseLinks(c).find((l) => l.kind === 'site') : undefined;
  return (
    <li className={cn(open && 'bg-surface-2')}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full px-4 py-3 flex gap-3 text-left press">
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold leading-snug line-clamp-2">{c.code} <span className="text-ink">{c.title}</span></span>
          {c.instructor && <span className="block text-[13px] text-ink-2 mt-0.5 truncate">{c.instructor}</span>}
          <span className="block text-[13px] text-ink-2 mt-0.5 truncate">{[meetingLine(c.meetings, DAY_LABELS), c.location].filter(Boolean).join(' · ')}</span>
          {meta && <span className="block text-[12.5px] text-ink-3 mt-0.5">{meta}</span>}
        </span>
        <span className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
          {added && <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-sel-fg"><Check size={13} strokeWidth={3} />{L('Added', '추가됨')}</span>}
          <CourseStars stars={stars} />
          {lumi && <span className="text-[12px] text-ink-3 whitespace-nowrap">{lumi}</span>}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 -mt-1 space-y-3">
          <Expanded c={c} schoolId={schoolId} added={added} overlap={overlap} picked={picked} onPickSections={onPickSections} />
          <div className="flex items-center gap-2">
            <Btn size="md" className="flex-1" loading={busy} disabled={added} onClick={async () => { setBusy(true); try { await onAdd(); } finally { setBusy(false); } }}>
              {added ? L('Added ✓', '추가됨 ✓') : L('Add to schedule', '시간표에 추가')}
            </Btn>
            {/* owner 2026-11-06: reviews first — one outline button opens the course page on Reviews */}
            <Btn size="md" variant="outline" className="flex-1" onClick={onPage}>{L('Reviews & info', '리뷰 · 정보')}</Btn>
          </div>
          {site && (
            <button type="button" onClick={() => openExternal(site.url)} className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-ink-2 press">
              {site.label}<ArrowUpRight size={13} />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** 펼친 줄 가운데 — 학교 노트(핑크 한 줄) · 겹침 한 줄 · 디스커션·랩 (선택, 기다리지 않아도 된다) */
function Expanded({ c, schoolId, added, overlap, picked, onPickSections }: {
  c: CatalogCourse; schoolId: string; added: boolean; overlap: string | null; picked: CatalogSection[]; onPickSections: (s: CatalogSection[]) => void;
}) {
  const [details, setDetails] = useState<CatalogDetails | null>(null);
  const [sections, setSections] = useState<CatalogSection[] | null>(null);
  useEffect(() => {
    let alive = true;
    api.catalog.details(schoolId, c.id).then((d) => alive && setDetails(d)).catch(() => alive && setDetails({}));
    api.catalog.sections(schoolId, c.id).then((s) => alive && setSections(s)).catch(() => alive && setSections([]));
    return () => { alive = false; };
  }, [schoolId, c.id]);
  const note = noteLine(details, en);
  const kinds = [...new Set((sections ?? []).map((s) => s.kind))];
  const toggle = (s: CatalogSection) => onPickSections(picked.some((x) => x.label === s.label) ? picked.filter((x) => x.label !== s.label) : [...picked.filter((x) => x.kind !== s.kind), s]);
  return (
    <>
      {note && <p className="text-[13px] font-medium text-sel-fg leading-snug line-clamp-2">{note}</p>}
      {overlap && <p className="text-[13px] font-semibold text-gold">{overlap}</p>}
      {!added && sections && sections.length > 0 && (
        <div className="space-y-2">
          {kinds.map((k) => (
            <div key={k}>
              <div className="text-[12px] font-semibold text-ink-3 mb-1.5">{L(`${KIND_NAME[k] ?? k} · optional`, `${KIND_NAME[k] ?? k} · 선택`)}</div>
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4">
                {sections.filter((s) => s.kind === k).map((s) => (
                  <Chip key={s.label} size="sm" active={picked.some((x) => x.label === s.label)} onClick={() => toggle(s)} className="shrink-0">
                    {s.label.replace(/^\w+ /, '')} · {meetingLine(s.meetings, DAY_LABELS)}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
const KIND_NAME: Record<string, string> = { DIS: 'Discussion', LAB: 'Lab', REC: 'Recitation', SEM: 'Seminar' };

/** 필터 시트의 학과 — 검색 + ★ (★ 먼저). 별은 바로 저장된다 (내 계정, 본인에게만) */
function DeptPicker({ depts, value, favorites, onPick, onStar }: {
  depts: { name: string; count: number }[]; value: string; favorites: string[]; onPick: (v: string) => void; onStar: (name: string) => void;
}) {
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(false);
  const rows = orderDepartments(depts, favorites, q);
  const show = expanded || q ? rows : rows.slice(0, Math.max(6, favorites.length + 3));
  return (
    <div>
      <label className="flex items-center gap-2 h-10 px-3 rounded-full bg-surface-2 border border-line text-ink-3 focus-within:border-sel-line">
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L(`Search ${depts.length} departments`, `학과 ${depts.length}개 검색`)} className="flex-1 min-w-0 bg-transparent text-[14px] text-ink placeholder:text-ink-3 outline-none" />
      </label>
      <ul className="mt-2 divide-y divide-line" role="list">
        {value === '' ? null : (
          <li><button type="button" onClick={() => onPick('')} className="w-full py-2.5 text-left text-[14px] text-ink-2 press">{L('All departments', '전체 학과')}</button></li>
        )}
        {show.map((d) => {
          const on = value === d.name, fav = favorites.includes(d.name);
          return (
            <li key={d.name} className="flex items-center">
              <button type="button" onClick={() => onStar(d.name)} aria-pressed={fav} aria-label={fav ? L(`Unstar ${d.name}`, `${d.name} 별 빼기`) : L(`Star ${d.name}`, `${d.name} 별 달기`)} className="h-10 w-9 -ml-1 grid place-items-center press">
                <Star size={17} className={fav ? 'text-sel-fg fill-current' : 'text-ink-3'} />
              </button>
              <button type="button" onClick={() => onPick(on ? '' : d.name)} aria-pressed={on} className="flex-1 min-w-0 flex items-center gap-2 py-2.5 text-left press">
                <span className={cn('flex-1 min-w-0 text-[14px] leading-snug', on ? 'text-sel-fg font-semibold' : 'text-ink')}>{d.name}</span>
                <span className="text-[12px] text-ink-3 tabular-nums">{d.count}</span>
                {on && <Check size={16} className="text-sel-fg" />}
              </button>
            </li>
          );
        })}
      </ul>
      {!expanded && !q && rows.length > show.length && (
        <button type="button" onClick={() => setExpanded(true)} className="mt-1 text-[13.5px] font-semibold text-sel-fg press">{L(`Show all ${rows.length}`, `${rows.length}개 모두 보기`)}</button>
      )}
    </div>
  );
}

