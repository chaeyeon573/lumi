/**
 * 수업 리뷰 화면들 — 쓰기(/reviews/write) · 시험 정보(/reviews/exam) · 학기 말 단계(/reviews/term).
 * 수업 페이지의 Reviews · Exam info 탭과 학기 말 알림("How were your classes?")이 여기로 온다.
 * 규칙·검사는 서버 (server/coursereviews.ts) — 화면은 거절 이유를 그대로 보여 준다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Star } from 'lucide-react';
import type { CourseReviewsView, ExamInfoView, PastClassesView, TermPromptView } from '@core/lib/coursereviews';
import type { CatalogCourse } from '@core/api/types';
import { codeFromName, normalizeCode } from '@core/lib/classmates';
import { cn } from '@core/lib/cn';
import { useViewer } from '@/hooks/useViewer';
import { writeLink } from '@/components/reviews/ReviewParts';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { BackHeader, Btn, Chip, ChipRow, EmptyState, ErrorScreen, FormField, InfoNote, LoadingCards, OnboardingHeader, BottomCTA, SearchField, cardCls } from '@/components/ha';
import { ReviewForm, DeleteLink } from '@/components/reviews/ReviewForm';
import { ExamForm } from '@/components/reviews/ExamForm';

/** "CS 61A · Fall 2026" 머리 블록 */
function CourseHead({ title, code, term }: { title: string; code: string; term: string }) {
  return (
    <div className="px-4 pt-1 pb-5">
      <h1 className="ha-title">{title}</h1>
      <div className="text-[14px] text-ink-2 mt-1.5">{code} · {term}</div>
    </div>
  );
}

function useReviewData(code: string, term: string) {
  const [v, setV] = useState<CourseReviewsView | null>(null);
  const [instructors, setInstructors] = useState<string[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    if (!code) return;
    Promise.all([api.courseReviews.view(code), api.courseReviews.instructors(code, term).catch(() => ({ instructors: [] }))])
      .then(([view, ins]) => { setV(view); setInstructors(ins.instructors); })
      .catch((e) => setError((e as Error).message));
  }, [code, term]);
  useEffect(() => { load(); }, [load]);
  return { v, instructors, error, load };
}

/** 리뷰 쓰기 · 고치기 — 한 사람·수업·학기에 하나 */
export function WriteReviewPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useAppStore((s) => s.showToast);
  const code = params.get('code') ?? '';
  const term = params.get('term') ?? '';
  const { v, instructors, error, load } = useReviewData(code, term);
  const back = () => (window.history.length > 1 ? nav(-1) : nav('/schedule'));
  if (error && !v) return <div className="min-h-full bg-bg"><BackHeader title="Write a review" /><ErrorScreen message={error} onRetry={load} /></div>;
  if (!v) return <div className="min-h-full bg-bg"><BackHeader title="Write a review" /><LoadingCards count={2} className="px-4 pt-2" /></div>;
  const existing = v.mine.find((m) => m.term === term);
  const canWrite = existing || (v.write.ok && v.write.term === term);
  return (
    <div className="min-h-full bg-bg flex flex-col">
      <BackHeader title={existing ? 'Edit review' : 'Write a review'} />
      <CourseHead title={`How was ${v.course.code}?`} code={v.course.code} term={term} />
      {canWrite ? (
        <ReviewForm code={v.course.code} term={term} existing={existing} instructors={instructors} onSaved={back}
          extra={existing && <DeleteLink label="Delete review" onDelete={async () => { await api.courseReviews.remove(existing.id); toast('Review deleted', 'success'); back(); }} />} />
      ) : (
        <EmptyState icon={<Star size={28} />} tone="peach" title="Not open yet" sub={v.write.ok ? `You can review ${v.course.code} for ${v.write.term}.` : v.write.message} />
      )}
    </div>
  );
}

/** 시험 정보 쓰기 · 고치기 */
export function ExamInfoFormPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useAppStore((s) => s.showToast);
  const code = params.get('code') ?? '';
  const term = params.get('term') ?? '';
  const [v, setV] = useState<ExamInfoView | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); api.courseReviews.exam(code).then(setV).catch((e) => setError((e as Error).message)); }, [code]);
  useEffect(() => { load(); }, [load]);
  const back = () => (window.history.length > 1 ? nav(-1) : nav('/schedule'));
  if (error && !v) return <div className="min-h-full bg-bg"><BackHeader title="Exam info" /><ErrorScreen message={error} onRetry={load} /></div>;
  if (!v) return <div className="min-h-full bg-bg"><BackHeader title="Exam info" /><LoadingCards count={2} className="px-4 pt-2" /></div>;
  const existing = v.mine.find((m) => m.term === term);
  const canWrite = existing || (v.write.ok && v.write.term === term);
  return (
    <div className="min-h-full bg-bg flex flex-col">
      <BackHeader title="Exam info" />
      <CourseHead title={`${v.course.code} exams`} code={v.course.code} term={term} />
      {canWrite ? (
        <ExamForm code={v.course.code} term={term} existing={existing} onSaved={back}
          extra={existing && <DeleteLink label="Delete exam info" onDelete={async () => { await api.courseReviews.removeExam(existing.id); toast('Exam info deleted', 'success'); back(); }} />} />
      ) : (
        <EmptyState icon={<Star size={28} />} tone="peach" title="Not open yet" sub={v.write.ok ? `You can add exam info for ${v.write.term}.` : v.write.message} />
      )}
    </div>
  );
}

/**
 * 학기 말 안내 → "How were your classes?" — 그 학기 내 수업을 하나씩. 수업마다 Skip. 이미 쓴 수업은 건너뛴다.
 * 마지막엔 끝 화면 (리뷰가 열렸다는 한 줄 + 일정으로).
 */
export function TermReviewPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const term = params.get('term') ?? '';
  const [p, setP] = useState<TermPromptView | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [wrote, setWrote] = useState(0);
  const load = useCallback(() => { setError(''); api.courseReviews.term(term).then(setP).catch((e) => setError((e as Error).message)); }, [term]);
  useEffect(() => { load(); }, [load]);
  // 아직 안 쓴 수업만 단계로 — 처음 연 순간 기준 (쓰고 나서 목록이 줄어들지 않게)
  const [todo, setTodo] = useState<TermPromptView['classes'] | null>(null);
  useEffect(() => { if (p && !todo) setTodo(p.classes.filter((c) => !c.reviewed)); }, [p, todo]);
  const cur = todo?.[step];
  const reviews = useReviewData(cur?.code ?? '', term);

  if (error && !p) return <div className="min-h-full bg-bg"><BackHeader title="Your classes" /><ErrorScreen message={error} onRetry={load} /></div>;
  if (!p || !todo) return <div className="min-h-full bg-bg"><BackHeader title="Your classes" /><LoadingCards count={2} className="px-4 pt-2" /></div>;
  const next = () => setStep((s) => s + 1);

  if (!cur) {
    return (
      <div className="min-h-full bg-bg flex flex-col">
        <BackHeader title={`${term} classes`} onBack={() => nav('/schedule')} />
        <EmptyState icon={<CheckCircle2 size={28} />} tone="mint" title={todo.length === 0 ? 'All reviewed' : wrote ? 'Thanks for reviewing' : 'All done'}
          sub={wrote || p.classes.some((c) => c.reviewed) ? 'Every class’s reviews are open to you now.' : 'You can review these classes any time from the class page.'} />
        <BottomCTA><Btn full size="lg" onClick={() => nav('/schedule')}>Back to Schedule</Btn></BottomCTA>
      </div>
    );
  }
  const state = p.write[cur.slug];
  return (
    <div className="min-h-full bg-bg flex flex-col">
      <OnboardingHeader step={step + 1} total={todo.length} onBack={step > 0 ? () => setStep((s) => s - 1) : () => nav(-1)} onSkip={next} />
      <CourseHead title={`How was ${cur.code}?`} code={(cur.name.startsWith(cur.code) ? cur.name.slice(cur.code.length).trim() : cur.name) || cur.code} term={term} />
      {state?.ok === false ? (
        <>
          <EmptyState icon={<Star size={28} />} tone="peach" title="Not open yet" sub={state.message} />
          <BottomCTA><Btn full size="lg" onClick={next}>Next class</Btn></BottomCTA>
        </>
      ) : reviews.v ? (
        <ReviewForm key={cur.slug} code={cur.code} term={term} instructors={reviews.instructors} existing={reviews.v.mine.find((m) => m.term === term)}
          quick submitLabel={step + 1 < todo.length ? 'Post and next' : 'Post review'} onSaved={() => { setWrote((n) => n + 1); next(); }} />
      ) : <LoadingCards count={2} className="px-4" />}
    </div>
  );
}

/**
 * 지난 수업 넣기 (owner 2026-11-06) — 리뷰하려고 지난 학기 수업을 기록한다. 시간표·같은 수업 학생·"N on Lumi" 에는 안 들어간다.
 * 학교 수업 목록에서 찾거나(과목 코드는 학기가 달라도 같다), 과목 코드를 그대로 쓴다. 학기는 최근 4개 중에서.
 */
export function AddPastClassPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useAppStore((s) => s.showToast);
  const v = useViewer();
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId ?? '' : '';
  const [q, setQ] = useState(params.get('code') ?? '');
  const [results, setResults] = useState<CatalogCourse[]>([]);
  const [picked, setPicked] = useState<{ code: string; name: string } | null>(null);
  const [past, setPast] = useState<PastClassesView | null>(null);
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.courseReviews.pastClasses().then((p) => { setPast(p); setTerm((t) => t || p.terms[0] || ''); }).catch(() => {}); }, []);
  useEffect(() => {
    const text = q.trim();
    if (text.length < 2 || !schoolId) { setResults([]); return; }
    const h = setTimeout(() => {
      api.catalog.courses(schoolId, text).then((list) => {
        const seen = new Set<string>();
        setResults(list.filter((c) => (seen.has(c.code) ? false : (seen.add(c.code), true))).slice(0, 6));
      }).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(h);
  }, [q, schoolId]);
  const typed = codeFromName(normalizeCode(q.trim()));
  const showTyped = !!typed && !results.some((c) => normalizeCode(c.code) === typed);
  const add = async () => {
    if (!picked || !term) return;
    setBusy(true);
    try {
      await api.courseReviews.addPastClass({ code: picked.code, term, name: picked.name });
      nav(writeLink(picked.code, term), { replace: true });
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const Row = ({ code, name, onPick }: { code: string; name: string; onPick: () => void }) => (
    <button type="button" onClick={onPick} className={cn('w-full px-4 py-3 text-left press', picked?.code === code && 'bg-sel-soft')}>
      <span className={cn('block text-[15px] font-bold', picked?.code === code && 'text-sel-fg')}>{code}</span>
      {name && <span className="block text-[13px] text-ink-2 truncate">{name}</span>}
    </button>
  );
  return (
    <div className="min-h-full bg-bg flex flex-col">
      <BackHeader title="Add a past class" />
      <div className="px-4 pt-1 pb-6 flex-1 space-y-5">
        <h1 className="ha-title">Which class?</h1>
        <SearchField placeholder="Course code, like CS 61A" value={q} onChange={(x) => { setQ(x); setPicked(null); }} autoFocus />
        {(results.length > 0 || showTyped) && (
          <div className={cn(cardCls, 'divide-y divide-line overflow-hidden')}>
            {results.map((c) => <Row key={c.id} code={c.code} name={c.title} onPick={() => setPicked({ code: c.code, name: `${c.code} ${c.title}` })} />)}
            {showTyped && <Row code={typed!} name="Use this course code" onPick={() => setPicked({ code: typed!, name: typed! })} />}
          </div>
        )}
        {past && (
          <FormField label="When did you take it?">
            <ChipRow wrap>{past.terms.map((t) => <Chip key={t} size="sm" active={term === t} onClick={() => setTerm(t)}>{t}</Chip>)}</ChipRow>
          </FormField>
        )}
        <InfoNote>Only for reviews. It won’t show on your schedule or to classmates.</InfoNote>
        {past && past.classes.length > 0 && (
          <section>
            <div className="text-[13px] font-semibold mb-2">Your past classes</div>
            <div className={cn(cardCls, 'divide-y divide-line')}>
              {past.classes.map((c) => (
                <button key={`${c.slug}|${c.term}`} type="button" onClick={() => nav(writeLink(c.code, c.term))} className="w-full px-4 py-3 flex items-center gap-3 text-left press">
                  <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold">{c.code}</span><span className="block text-[12px] text-ink-3">{c.term}</span></span>
                  <span className="text-[13px] font-semibold text-sel-fg">{c.reviewed ? 'Edit' : 'Review'}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      <BottomCTA><Btn full size="lg" disabled={!picked || !term} loading={busy} onClick={add}>Add and review</Btn></BottomCTA>
    </div>
  );
}
