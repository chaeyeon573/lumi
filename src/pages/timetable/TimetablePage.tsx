import { useEffect, useMemo, useState } from 'react';
import { t, lang } from '@core/i18n';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OpenSlotSheet } from '@/components/social/OpenSlotSheet';
import { ClassSpaceContent } from '@/pages/classes/ClassPage';
import { slotSuggestions } from '@core/lib/social';
import { Plus, Trash2, Lock, Users, CalendarPlus, ChevronRight, Sparkles, Search } from 'lucide-react';
import type { Course } from '@core/types';
import type { CatalogCourse } from '@core/api/types';
import { TopBar } from '@/components/layout/TopBar';
import { Button, BottomSheet, Field, Input, Select, Tag, VisibilityPicker, EmptyState, CardSkeleton, ErrorState, Avatar } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { DAY_LABELS, GRID_START, GRID_END, toMin, toHHMM, freeBlocks, overlapBlocks, statusNow, statusLabel, todayIdx, jsDayToIdx, fmtBlock, fmtHours, nowMin } from '@core/lib/timetable';
import { friendsOf } from '@core/lib/relations';
import { uid, addDaysISO } from '@core/lib/format';
import { CATEGORY_COLORS, CATEGORY_EMOJI } from '@core/lib/labels';
import { cn } from '@core/lib/cn';

/** 한 시간 높이 — 에브리타임처럼 크게 (수업 이름·강의실·시간이 한눈에) */
const HOUR_PX = 62;
const HUES = [220, 160, 15, 280, 45, 330, 120, 200, 60, 300];

const emptyCourse = (day: number): Course => ({ id: '', name: '', day, start: '10:00', end: '11:15', room: '', hue: HUES[Math.floor(Math.random() * HUES.length)] });

export function TimetablePage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const participations = useAppStore((s) => s.participations);
  const me = v.me;
  const [editing, setEditing] = useState<Course | null>(null);
  const [catalogQ, setCatalogQ] = useState('');
  const [dept, setDept] = useState('');
  const [depts, setDepts] = useState<{ name: string; count: number }[]>([]);
  const [catalog, setCatalog] = useState<CatalogCourse[] | null>(null);
  const [slot, setSlot] = useState<{ day: number; block: { start: number; end: number } } | null>(null);
  const [params, setParams] = useSearchParams();
  const [space, setSpace] = useState<string | null>(null);
  const orgs = useAppStore((s) => s.organizations);
  const [busy, setBusy] = useState(false);
  const today = todayIdx();
  const showWeekend = me.timetable.some((c) => c.day >= 5);
  const days = showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  // 보이는 시간 범위: 기본 9~18시, 수업이 더 이르거나 늦으면 늘린다
  const gStart = Math.max(GRID_START, Math.min(9, ...me.timetable.map((c) => Math.floor(toMin(c.start) / 60))));
  const gEnd = Math.min(GRID_END, Math.max(18, ...me.timetable.map((c) => Math.ceil(toMin(c.end) / 60))));
  const hours = Array.from({ length: gEnd - gStart }, (_, i) => gStart + i);

  // 이번 주 참가 활동을 요일 블록으로
  const weekActs = useMemo(() => {
    const monday = new Date(); monday.setDate(monday.getDate() - today);
    const start = monday.toISOString().slice(0, 10); const end = addDaysISO(6, monday);
    return v.visibleActivities.filter((a) => a.date >= start && a.date <= end && (a.hostId === me.id || participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'approved')))
      .map((a) => ({ a, day: jsDayToIdx(new Date(a.date).getDay()) }));
  }, [v.visibleActivities, participations, me.id, today]);

  const now = statusNow(me.timetable);
  const myFree = freeBlocks(me.timetable, today);
  useEffect(() => {
    if (params.get('open') && me.timetable.length) {
      const now = nowMin();
      const b = myFree.find((x) => x.end > now) ?? myFree[0];
      if (b) setSlot({ day: today, block: { start: Math.max(b.start, now), end: b.end } });
      setParams({}, { replace: true });
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const friendIds = friendsOf(v.snap, me.id);
  const overlaps = friendIds.map((fid) => v.userById(fid)!).filter((f) => f && f.timetable.length > 0 && v.canSeeField(f, 'timetable'))
    .map((f) => ({ f, blocks: overlapBlocks(myFree, freeBlocks(f.timetable, today)) })).filter((x) => x.blocks.length > 0);
  const bestBlock = overlaps.length ? overlaps.flatMap((o) => o.blocks).sort((a, b) => (b.end - b.start) - (a.end - a.start))[0] : null;

  const schoolId = me?.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  useEffect(() => {
    if (!editing || editing.id || !schoolId) { setCatalog(null); return; }
    let alive = true;
    const h = setTimeout(() => { api.catalog.courses(schoolId, catalogQ, dept).then((r) => { if (alive) setCatalog(r); }).catch(() => { if (alive) setCatalog([]); }); }, 200);
    return () => { alive = false; clearTimeout(h); };
  }, [editing, schoolId, catalogQ, dept]);
  // 학과 목록 — 수업 추가 창을 처음 열 때 한 번
  useEffect(() => {
    if (!editing || editing.id || !schoolId || depts.length) return;
    api.catalog.departments(schoolId).then(setDepts).catch(() => setDepts([]));
  }, [editing, schoolId, depts.length]);

  /** 수업 목록에서 골라 요일별 수업으로 펼쳐 추가 */
  const addFromCatalog = async (c: CatalogCourse) => {
    if (!me || !editing) return;
    const name = `${c.code} ${c.title}`.slice(0, 60);
    const hue = editing.hue;
    const rows: Course[] = c.meetings.map((m) => ({ id: uid('c'), name, day: m.day, start: m.start, end: m.end, room: c.location, professor: c.instructor, url: c.url, syllabusUrl: c.syllabusUrl, hue }));
    setBusy(true);
    try { await run(() => api.users.update(me.id, { timetable: [...me.timetable, ...rows] }), `${rows.length}${t('개 수업 시간 추가')}`); setEditing(null); setCatalogQ(''); } catch { /* */ } finally { setBusy(false); }
  };

  const save = async () => {
    if (!editing || !editing.name.trim() || toMin(editing.start) >= toMin(editing.end)) return;
    setBusy(true);
    const course = { ...editing, id: editing.id || uid('c'), room: editing.room?.trim() || undefined };
    const next = editing.id ? me.timetable.map((c) => (c.id === course.id ? course : c)) : [...me.timetable, course];
    try { await run(() => api.users.update(me.id, { timetable: next }), editing.id ? t('수업을 수정했어요.') : t('수업을 추가했어요.')); setEditing(null); } catch { /* */ } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!editing?.id) return;
    setBusy(true);
    try { await run(() => api.users.update(me.id, { timetable: me.timetable.filter((c) => c.id !== editing.id) }), t('수업을 삭제했어요.')); setEditing(null); } catch { /* */ } finally { setBusy(false); }
  };

  if (status === 'loading') return <div><TopBar back title={t('시간표')} /><CardSkeleton count={2} /></div>;
  if (status === 'error') return <div><TopBar back title={t('시간표')} /><ErrorState message={error ?? undefined} onRetry={init} /></div>;

  return (
    <div className="min-h-full pb-6">
      <TopBar back title={t('시간표')} right={<><VisibilityPicker compact value={me.fieldVisibility.timetable} onChange={(vis) => run(() => api.users.update(me.id, { fieldVisibility: { ...me.fieldVisibility, timetable: vis } }))} options={['public', 'school', 'friends', 'private']} label={t('공강 시간 공개 범위')} /><Button size="sm" variant="ghost" className="ml-1" icon={<Plus size={15} />} onClick={() => setEditing(emptyCourse(today < 5 ? today : 0))}>{t('수업')}</Button></>} />
      <div className="px-4 pt-3 space-y-3">
        {me.timetable.length > 0 && (
          <div className={cn('card p-3.5 flex items-center gap-3', now.kind === 'in_class' ? 'bg-[linear-gradient(120deg,#FFF4DE,#FFFFFF)]' : 'bg-[linear-gradient(120deg,#E1F7F0,#FFFFFF)]')}>
            <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', now.kind === 'in_class' ? 'bg-gold' : 'bg-mint')} />
            <div className="flex-1 min-w-0">
              <b className="text-[14px]">{lang === 'en' ? `${DAY_LABELS[today]} · ${statusLabel(now)}` : `${DAY_LABELS[today]}요일 · ${statusLabel(now)}`}</b>
              <div className="text-[12px] text-ink-3 truncate">{now.kind === 'in_class' ? `${now.course.name}${now.course.room ? ` · ${now.course.room}` : ''}` : now.kind === 'free' && now.next ? `${t('다음 수업 ')}${now.next.start} ${now.next.name}` : t('오늘 남은 시간은 자유예요')}</div>
            </div>
            <Tag>{me.timetable.length}{t('개 수업')}</Tag>
          </div>
        )}

        {me.timetable.length === 0 ? (
          <EmptyState emoji="📅" title={t('시간표가 비어 있어요')} description={t('수업을 추가하면 공강 시간에 맞는 친구와 활동을 추천해요. 강의실과 전체 시간표는 다른 사람에게 공개되지 않아요.')}
            action={<Button icon={<Plus size={16} />} onClick={() => setEditing(emptyCourse(today < 5 ? today : 0))}>{t('첫 수업 추가')}</Button>} />
        ) : (
          <div className="card overflow-hidden -mx-2">
            <div className="grid" style={{ gridTemplateColumns: `28px repeat(${days.length}, 1fr)` }}>
              <div />
              {days.map((d) => <div key={d} className={cn('text-center text-[14px] font-bold py-2.5', d === today ? 'text-primary' : 'text-ink-3')}>{DAY_LABELS[d]}</div>)}
            </div>
            <div className="grid border-t border-line" style={{ gridTemplateColumns: `28px repeat(${days.length}, 1fr)`, height: hours.length * HOUR_PX }}>
              <div className="relative">{hours.map((h, i) => <div key={h} className="absolute right-1 text-[11px] text-ink-3 tabular-nums" style={{ top: i * HOUR_PX + 3 }}>{h}</div>)}</div>
              {days.map((d) => (
                <div key={d} className={cn('relative border-l border-line overflow-hidden', d === today && 'bg-primary-soft/30')} onClick={(e) => { const y = e.nativeEvent.offsetY; const min = gStart * 60 + Math.floor(y / HOUR_PX) * 60; const fb = freeBlocks(me.timetable, d).find((b) => b.start <= min && min < b.end); if (fb && me.timetable.length) setSlot({ day: d, block: { start: Math.max(fb.start, Math.floor(min / 30) * 30), end: fb.end } }); else setEditing({ ...emptyCourse(d), start: toHHMM(min), end: toHHMM(min + 75) }); }}>
                  {hours.map((h, i) => <div key={h} className="absolute left-0 right-0 border-t border-line/70" style={{ top: i * HOUR_PX }} />)}
                  {me.timetable.filter((c) => c.day === d).map((c) => (
                    <button key={c.id} onClick={(e) => { e.stopPropagation(); setSpace(c.name); }} className="absolute left-[1px] right-[1px] rounded-md px-1.5 py-1.5 text-left overflow-hidden press"
                      style={{ top: (toMin(c.start) - gStart * 60) / 60 * HOUR_PX, height: (toMin(c.end) - toMin(c.start)) / 60 * HOUR_PX - 2, background: `hsl(${c.hue} 75% 86%)` }}>
                      {(() => { const m = /^([A-Z][A-Z&.]*\s*\d+[A-Z]{0,3})\s*(.*)$/.exec(c.name); return m ? <>
                        <div className="text-[12px] font-extrabold leading-tight [overflow-wrap:anywhere]" style={{ color: `hsl(${c.hue} 55% 25%)` }}>{m[1]}</div>
                        {m[2] && <div className="text-[10.5px] font-semibold leading-tight line-clamp-3 mt-0.5 [overflow-wrap:anywhere]" style={{ color: `hsl(${c.hue} 50% 28%)` }}>{m[2]}</div>}
                      </> : <div className="text-[12px] font-extrabold leading-tight line-clamp-3" style={{ color: `hsl(${c.hue} 55% 25%)` }}>{c.name}</div>; })()}
                      {c.room && <div className="text-[10.5px] font-medium mt-0.5 leading-tight line-clamp-2" style={{ color: `hsl(${c.hue} 35% 35%)` }}>{c.room}</div>}
                    </button>
                  ))}
                  {weekActs.filter((x) => x.day === d).map(({ a }) => (
                    <button key={a.id} onClick={(e) => { e.stopPropagation(); nav(`/activities/${a.id}`); }} className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-left overflow-hidden press border-2 border-dashed"
                      style={{ top: Math.max(0, (toMin(a.startTime) - gStart * 60) / 60 * HOUR_PX), height: Math.max(22, (toMin(a.endTime) - toMin(a.startTime)) / 60 * HOUR_PX - 2), borderColor: CATEGORY_COLORS[a.category], background: `${CATEGORY_COLORS[a.category]}18` }}>
                      <div className="text-[11.5px] font-bold leading-tight line-clamp-3" style={{ color: CATEGORY_COLORS[a.category] }}>{CATEGORY_EMOJI[a.category]} {a.title}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="px-3 py-2 text-[11px] text-ink-3 flex items-center gap-3 border-t border-line"><span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary-soft border-l-2 border-primary mr-1 align-middle" />{t('수업')}</span><span><span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-dashed border-mint mr-1 align-middle" />{t('참가 활동')}</span><span className="ml-auto">{t('수업을 탭하면 수업 공간 · 공강은 활동 열기 · 빈 칸은 수업 추가')}</span></div>
          </div>
        )}

        {me.timetable.length > 0 && myFree.filter((b) => b.end > nowMin()).length > 0 && (
          <div className="card p-3.5">
            <b className="text-[13px]">{t('오늘 공강에 끼워 넣을 수 있는 것')}</b>
            <div className="mt-2 space-y-1.5">
              {myFree.filter((b) => b.end > nowMin()).slice(0, 3).map((b) => { const sg = slotSuggestions({ ...v.snap, organizations: orgs }, me, v.visibleActivities, b, today, (u) => v.canSeeField(u, 'timetable')); return (
                <button key={b.start} onClick={() => setSlot({ day: today, block: b })} className="w-full flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-left press">
                  <span className="text-[12px] font-bold text-mint tabular-nums">{fmtBlock(b)}</span>
                  <span className="flex-1 text-[12px] text-ink-2 truncate">{lang === 'en' ? `${sg.people.length} free · ${sg.acts.length} nearby` : `시간 맞는 사람 ${sg.people.length}명 · 근처 활동 ${sg.acts.length}개`}</span>
                  <span className="text-[11px] font-bold text-primary">{t('열기')}</span>
                </button>
              ); })}
            </div>
          </div>
        )}
        {me.timetable.length > 0 && (
          <div className="card p-4">
            <b className="text-[14px] flex items-center gap-1.5"><Users size={15} className="text-primary" />{t('오늘 공강이 겹치는 친구')}</b>
            {overlaps.length === 0 ? (
              <p className="text-[12px] text-ink-3 mt-2">{friendIds.length === 0 ? t('친구를 추가하면 공강이 겹치는 시간을 알려드려요.') : t('오늘은 겹치는 공강이 없어요. 친구가 시간표를 공개하면 여기에 보여요.')}</p>
            ) : (
              <>
                <div className="mt-2 rounded-xl bg-primary-soft px-3 py-2.5 text-[13px] flex items-center gap-2"><Sparkles size={14} className="text-primary shrink-0" /><span>{(() => { const n = overlaps.filter((o) => o.blocks.some((b) => bestBlock && b.start <= bestBlock.start && b.end >= bestBlock.end)).length; return lang === 'en' ? <><b>{n}</b> friend{n === 1 ? '' : 's'} free at <b>{bestBlock && fmtBlock(bestBlock)}</b>. Start something?</> : <><b>{bestBlock && fmtBlock(bestBlock)}</b>에 시간이 맞는 친구가 <b>{n}명</b> 있어요. 활동을 만들어볼까요?</>; })()}</span></div>
                <div className="mt-2 divide-y divide-line">
                  {overlaps.map(({ f, blocks }) => (
                    <button key={f.id} onClick={() => nav(`/users/${f.id}`)} className="w-full flex items-center gap-3 py-2.5 text-left press">
                      <Avatar emoji={f.avatar.emoji} hue={f.avatar.hue} url={f.avatar.url} size={36} />
                      <span className="flex-1 min-w-0"><b className="text-[13px]">{f.nickname}</b><span className="block text-[12px] text-ink-3 truncate">{blocks.map((b) => `${fmtBlock(b)} (${fmtHours(b)})`).join(' · ')}</span></span>
                      <ChevronRight size={16} className="text-ink-3" />
                    </button>
                  ))}
                </div>
                {bestBlock && <Button full size="sm" className="mt-2" icon={<CalendarPlus size={15} />} onClick={() => nav(`/create/activity?kind=personal&start=${toHHMM(bestBlock.start)}&end=${toHHMM(Math.min(bestBlock.end, bestBlock.start + 90))}`)}>{fmtBlock({ start: bestBlock.start, end: Math.min(bestBlock.end, bestBlock.start + 90) })} {t('활동 만들기')}</Button>}
              </>
            )}
          </div>
        )}

        <p className="text-[11px] text-ink-3 flex items-start gap-1.5 px-1"><Lock size={12} className="shrink-0 mt-0.5" />{t('다른 사용자에게는 전체 시간표가 아닌 공강 여부만 보여요. 강의실은 어떤 설정에서도 공개되지 않아요.')}</p>
      </div>

      <BottomSheet open={!!space} onClose={() => setSpace(null)} title={space ?? ''} tall>
        {space && <ClassSpaceContent courseName={space} onClose={() => setSpace(null)} onEdit={() => { const c = me.timetable.find((x) => x.name === space); setSpace(null); if (c) setEditing(c); }} />}
      </BottomSheet>
      <OpenSlotSheet open={!!slot} onClose={() => setSlot(null)} day={slot?.day ?? today} block={slot?.block ?? null} />
      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? t('수업 수정') : t('수업 추가')}>
        {editing && (
          <div className="space-y-4">
            {!editing.id && schoolId && (
              <div className="rounded-2xl bg-surface-2 p-3 space-y-2">
                <div className="flex items-center gap-2 text-[13px] font-semibold"><Search size={14} className="text-primary" />{t('학교 수업 목록에서 찾기')}</div>
                {depts.length > 1 && (
                  <select value={dept} onChange={(e) => setDept(e.target.value)} className={cn('w-full h-11 rounded-xl px-3 text-[14px] font-semibold border', dept ? 'bg-primary-soft text-primary border-primary/30' : 'bg-white text-ink-2 border-line')}>
                    <option value="">{lang === 'en' ? `All departments (${depts.length})` : `전체 학과 (${depts.length})`}</option>
                    {depts.map((d) => <option key={d.name} value={d.name}>{d.name} · {d.count}</option>)}
                  </select>
                )}
                <Input placeholder={dept ? (lang === 'en' ? `Search in ${dept}…` : `${dept} 안에서 검색…`) : t('수업 이름이나 과목 코드로 검색')} value={catalogQ} onChange={(e) => setCatalogQ(e.target.value)} />
                {dept && catalog && <div className="text-[11px] text-ink-3">{lang === 'en' ? `${catalog.length} classes in ${dept}` : `${dept} 수업 ${catalog.length}개`}</div>}
                {catalog && catalog.length > 0 && (
                  <div className={cn('overflow-y-auto divide-y divide-line rounded-xl bg-white', dept ? 'max-h-72' : 'max-h-44')}>
                    {catalog.slice(0, dept ? 400 : 20).map((c) => (
                      <div key={c.id} className="flex items-start gap-2 px-3 py-2">
                        <button type="button" disabled={busy} onClick={() => addFromCatalog(c)} className="flex-1 min-w-0 text-left press">
                          <div className="text-[13px] font-semibold">{c.code} <span className="font-medium text-ink-2">{c.title}</span></div>
                          <div className="text-[11px] text-ink-3">{c.meetings.length ? c.meetings.map((m) => `${DAY_LABELS[m.day]} ${m.start}–${m.end}`).join(' · ') : t('시간 미정')}{c.location ? ` · ${c.location}` : ''}{c.instructor ? ` · ${c.instructor}` : ''}</div>
                        </button>
                        {(c.syllabusUrl || c.url) && <a href={c.syllabusUrl ?? c.url} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] font-semibold text-primary underline pt-0.5">{c.syllabusUrl ? t('실라버스') : t('과목 정보')}</a>}
                      </div>
                    ))}
                  </div>
                )}
                {catalog && catalog.length === 0 && catalogQ && <div className="text-[12px] text-ink-3">{t('검색 결과가 없어요. 직접 입력할 수 있어요.')}</div>}
                <div className="text-[11px] text-ink-3">{t('직접 입력')} ↓</div>
              </div>
            )}
            <Field label={t('과목명')} required><Input autoFocus placeholder={t('예: 데이터베이스')} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label={t('요일')} required><Select value={editing.day} onChange={(e) => setEditing({ ...editing, day: Number(e.target.value) })}>{DAY_LABELS.map((d, i) => <option key={d} value={i}>{d}{t('요일')}</option>)}</Select></Field>
              <Field label={t('시작')} required><Input type="time" value={editing.start} onChange={(e) => setEditing({ ...editing, start: e.target.value })} /></Field>
              <Field label={t('종료')} required><Input type="time" value={editing.end} onChange={(e) => setEditing({ ...editing, end: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('강의실 (나만 보기)')}><Input placeholder={t('예: 공학관 B103')} value={editing.room ?? ''} onChange={(e) => setEditing({ ...editing, room: e.target.value })} /></Field>
              <Field label={t('교수 (선택)')}><Input value={editing.professor ?? ''} onChange={(e) => setEditing({ ...editing, professor: e.target.value })} /></Field>
            </div>
            <Field label={t('색상')}><div className="flex flex-wrap gap-1.5">{HUES.map((h) => <button key={h} type="button" onClick={() => setEditing({ ...editing, hue: h })} className={cn('h-7 w-7 rounded-full', editing.hue === h && 'ring-2 ring-offset-2 ring-ink')} style={{ background: `hsl(${h} 75% 70%)` }} aria-label={`${t('색상 ')}${h}`} />)}</div></Field>
            <div className="flex gap-2">
              {editing.id && <Button variant="danger" icon={<Trash2 size={16} />} onClick={remove} loading={busy}>{t('삭제')}</Button>}
              <Button full loading={busy} disabled={!editing.name.trim() || toMin(editing.start) >= toMin(editing.end)} onClick={save}>{editing.id ? t('수정') : t('추가')}</Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
