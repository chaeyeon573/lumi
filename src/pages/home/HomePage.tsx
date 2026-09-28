import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CalendarPlus, ChevronRight, Users, MapPin, X, Sparkles, CalendarDays, Briefcase, RefreshCw } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { CardSkeleton, ErrorState, Button, Avatar, EmptyState } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useSnapshot } from '@/hooks/useSnapshot';
import { AroundTodayCard } from '@/components/home_AroundToday';
import { useAppStore } from '@core/store/useAppStore';
import { getPlatform } from '@core/platform';
import type { Snapshot } from '@core/api';
import { homeToday, alumniHome, gradHome, type HomeToday, type AlumniHome, type GradHome as GradHomeData, type NetworkNews } from '@core/lib/home';
import { stageKind, researchLine } from '@core/lib/stage';
import { isAlumniStage, contextLine, cityOf, personLine, shouldSuggestStatusUpdate } from '@core/lib/network';
import type { RecommendedPerson } from '@core/lib/people';
import type { RecommendedMeet } from '@core/lib/meet';
import { CATEGORY_EMOJI, CATEGORY_COLORS, OPP_TYPE_EMOJI, OPP_TYPE_COLORS, ORG_TYPE_LABELS } from '@core/lib/labels';
import { formatTime, formatDate } from '@core/lib/format';
import { fmtHours, fmtBlock, toMin, nowMin } from '@core/lib/timetable';
import { localeContext } from '@core/lib/locale-context';
import type { User, Activity } from '@core/types';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { ReasonChips } from '@/components/people_ReasonChips';
import { JoinButton } from '@/components/cards/JoinButton';
import { OpportunityCard } from '@/components/cards/OpportunityCard';
import { NowActivityRow } from '@/components/cards/NowActivityRow';
import { FIRSTRUN_KEY } from '@/pages/onboarding/OnboardingPage';
import { requestsForMe } from '@core/lib/requests';
import { IncomingRequestCard } from '@/components/people_RequestCard';

/**
 * Home — "오늘 나에게 뭐가 있나". 게시글 피드가 아니라 지금 내 상황에서 볼 가치가 높은 것 2~4개씩.
 * 재학생: 오늘 일정 → 지금 연결할 수 있는 사람 → 학교에서 일어나는 것 → 나에게 맞는 모임 → 지금 열린 만남 → 새로운 사람 → 추천 기회
 * 졸업생: 새롭게 연결할 사람 → 내 지역 사람 → 내 분야 사람 → 이번 주 모임 → 내 관계망 소식 → 내 그룹 → 추천 기회
 */
export function HomePage() {
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const v = useViewer();
  const me = v.me as User | undefined;
  const snap: Snapshot = useSnapshot();
  const alumni = !!me && isAlumniStage(me);
  const kind = me ? stageKind(me) : 'undergrad';
  const student = useMemo(() => (me && kind === 'undergrad' ? homeToday(snap, me, v.visibleActivities, (u) => v.canSeeField(u, 'timetable')) : null), [snap, me, kind, v]);
  const grad = useMemo(() => (me && kind === 'grad' ? gradHome(snap, me, v.visibleActivities, (u) => v.canSeeField(u, 'timetable')) : null), [snap, me, kind, v]);
  const alum = useMemo(() => (me && alumni ? alumniHome(snap, me, v.visibleActivities, v.visiblePosts, (u) => v.canSeeField(u, 'timetable')) : null), [snap, me, alumni, v]);

  return (
    <div className="min-h-full pb-24 bg-bg">
      <AppHeader search />
      {status === 'loading' && <div className="px-4"><CardSkeleton /></div>}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && me && (
        <>
          <Identity me={me} />
          <FirstRunCard />
          <AroundTodayCard me={me} snap={snap} />
          <AskedOfMe me={me} snap={snap} />
          {student ? <StudentHome d={student} me={me} /> : grad ? <GradHome d={grad} me={me} /> : alum ? <AlumniHome d={alum} me={me} /> : null}
        </>
      )}
    </div>
  );
}

// ─── 정체성 블록 — "연세대학교 ✓ · 학부생 · 경영학과 3학년" ────────────────────────
function Identity({ me }: { me: User }) {
  const nav = useNavigate();
  const line = contextLine(me, lang);
  const suggest = shouldSuggestStatusUpdate(me);
  return (
    <div className="px-4 pt-1 pb-1">
      <button onClick={() => nav('/profile')} className="text-left press flex items-center gap-3 w-full">
        <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={44} />
        <span className="min-w-0 flex-1">
          <SchoolBadge user={me} size="lg" className="block truncate" />
          {line && <span className="block text-[13px] text-ink-2 truncate">{line}</span>}
          {me.research?.field && stageKind(me) === 'grad' && <span className="block text-[12px] text-verify font-semibold truncate">🔬 {researchLine(me, lang)}</span>}
        </span>
        <ChevronRight size={16} className="text-ink-3 shrink-0" />
      </button>
      {suggest && (
        <button onClick={() => nav('/profile/edit')} className="mt-2 w-full rounded-2xl bg-accent-soft px-3.5 py-2.5 text-[12px] font-semibold text-primary flex items-center gap-2 press"><RefreshCw size={13} />{t('현재 상태가 바뀌었나요? 졸업했다면 알려주세요.')}<ChevronRight size={14} className="ml-auto" /></button>
      )}
    </div>
  );
}

// ─── 첫 사용 카드 (가입 직후 1회) — 할 일 목록이 아니라 한 줄 안내. 아무것도 안 해도 된다 ─────────────
function FirstRunCard() {
  const nav = useNavigate();
  const [show, setShow] = useState(() => { try { return getPlatform().getItem(FIRSTRUN_KEY) === '1'; } catch { return false; } });
  if (!show) return null;
  const dismiss = () => { try { getPlatform().removeItem(FIRSTRUN_KEY); } catch { /* */ } setShow(false); };
  return (
    <div className="mx-4 mt-3 rounded-[24px] bg-primary-soft p-4 relative">
      <button onClick={dismiss} aria-label={t('닫기')} className="absolute top-3 right-3 h-8 w-8 rounded-full grid place-items-center text-ink-3 press"><X size={16} /></button>
      <div className="text-[11px] font-bold text-primary flex items-center gap-1"><Sparkles size={12} />{t('어서 오세요')}</div>
      <div className="mt-1 text-[15px] font-bold leading-snug pr-8 text-ink">{t('천천히 둘러보세요. 마음에 드는 사람은 저장해 두고, 나중에 편할 때 연결하면 돼요.')}</div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => { dismiss(); nav('/people'); }} className="h-9 px-3.5 rounded-full bg-white text-primary text-[12px] font-semibold flex items-center gap-1.5 press"><Users size={14} />{t('가까운 사람 보기')}</button>
        <button onClick={() => { dismiss(); nav('/meet/tables'); }} className="h-9 px-3.5 rounded-full bg-white text-primary text-[12px] font-semibold flex items-center gap-1.5 press"><CalendarDays size={14} />{t('작은 모임 보기')}</button>
      </div>
    </div>
  );
}

// ─── 혹시 여기에 해당되나요? — 건너건너 물어온 것 1건, 조용히 ─────────────────────
function AskedOfMe({ me, snap }: { me: User; snap: Snapshot }) {
  const nav = useNavigate();
  const incoming = useMemo(() => requestsForMe(snap, me), [snap, me]);
  if (incoming.length === 0) return null;
  const first = incoming[0];
  return (
    <Section title={t('혹시 여기에 해당되나요?')} action={incoming.length > 1 ? `${t('전체보기')} ${incoming.length}` : undefined} onAction={() => nav('/people/requests')}>
      <IncomingRequestCard item={first} compact onOpen={() => nav(`/people/requests/${first.req.id}`)} />
    </Section>
  );
}

// ─── 공용 조각 ────────────────────────────────────────────────────────────────
function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <section className="px-4 mt-6">
      <div className="flex items-end justify-between mb-2">
        <h2 className="font-display text-[18px] font-bold text-primary">{title}</h2>
        {action && <button onClick={onAction} className="text-[12px] font-semibold text-primary flex items-center gap-0.5 press">{action}<ChevronRight size={14} /></button>}
      </div>
      {children}
    </section>
  );
}

function Row({ icon, color, title, sub, right, onClick }: { icon: ReactNode; color: string; title: string; sub: string; right?: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3.5 py-3 text-left press">
      <span className="h-10 w-10 rounded-xl grid place-items-center text-[18px] shrink-0" style={{ background: `${color}1A` }}>{icon}</span>
      <span className="flex-1 min-w-0"><span className="block text-[14px] font-bold truncate">{title}</span><span className="block text-[12px] text-ink-3 truncate">{sub}</span></span>
      {right ?? <ChevronRight size={16} className="text-ink-3 shrink-0" />}
    </button>
  );
}

/** 섹션 안의 작은 빈 상태 — 행동 하나만 */
function Empty({ emoji, title, description, action, onAction }: { emoji?: string; title: string; description?: string; action: string; onAction: () => void }) {
  return <div className="card"><EmptyState emoji={emoji} title={title} description={description} className="py-7 px-5" action={<Button size="sm" variant="outline" onClick={onAction}>{action}</Button>} /></div>;
}

/** 사람 미니 카드 가로 스트립 — 사진 · 이름 · 학교 ✓ · 한 줄 · 이유 칩 2 */
function PeopleStrip({ people }: { people: RecommendedPerson[] }) {
  const nav = useNavigate();
  return (
    <div className="flex gap-2.5 overflow-x-auto hide-scrollbar -mx-4 px-4 snap-x">
      {people.map(({ user: u, reasons }) => (
        <button key={u.id} onClick={() => nav(`/users/${u.id}`)} className="card w-[196px] shrink-0 snap-start p-3.5 text-left press flex flex-col">
          <div className="flex items-center gap-2.5">
            <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={44} />
            <div className="min-w-0"><div className="text-[14px] font-bold truncate">{u.nickname}</div><SchoolBadge user={u} withYear size="sm" className="max-w-full" /></div>
          </div>
          <div className="mt-2 text-[12px] text-ink-2 truncate">{personLine(u, lang)}</div>
          <ReasonChips reasons={reasons} max={2} className="mt-2" />
        </button>
      ))}
    </div>
  );
}

/** 추천 모임 행 — 제목 · 언제·어디 · 이유 · [참여] */
function MeetRow({ m }: { m: RecommendedMeet }) {
  const nav = useNavigate();
  const v = useViewer();
  const a = m.a;
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <button onClick={() => nav(`/activities/${a.id}`)} className="h-10 w-10 rounded-xl grid place-items-center text-[18px] shrink-0 press" style={{ background: `${CATEGORY_COLORS[a.category]}1A` }}>{CATEGORY_EMOJI[a.category]}</button>
      <button onClick={() => nav(`/activities/${a.id}`)} className="flex-1 min-w-0 text-left press">
        <span className="block text-[14px] font-bold truncate">{a.title}</span>
        <span className="block text-[12px] text-ink-3 truncate">{formatDate(a.date)} {formatTime(a.startTime)} · {a.place.name}</span>
        <span className="block text-[11px] font-semibold text-primary truncate mt-0.5">{m.reason} · <Users size={10} className="inline -mt-0.5" /> {v.approvedCount(a.id)}/{a.capacity >= 999 ? '∞' : a.capacity}</span>
      </button>
      <JoinButton activity={a} size="sm" label={t('참여하기')} className="shrink-0" />
    </div>
  );
}

// ─── 재학생·대학원생 ───────────────────────────────────────────────────────────
function StudentHome({ d, me }: { d: HomeToday; me: User }) {
  const nav = useNavigate();
  const ctx = localeContext();
  const hasTT = me.timetable.length > 0;
  const freeText = d.nextFree ? (lang === 'en' ? `${fmtHours(d.nextFree)} free · ${d.freeTogether} also free` : `${fmtHours(d.nextFree)} 비어요 · 같이 비는 사람 ${d.freeTogether}명`) : '';
  const nowMinutes = nowMin();
  return (
    <>
      <Section title={t('오늘 일정')} action={hasTT ? t('전체보기') : undefined} onAction={() => nav('/timetable')}>
        {!hasTT ? (
          <button onClick={() => nav('/timetable')} className="card w-full p-4 text-left press flex items-center gap-3">
            <span className="h-11 w-11 rounded-2xl bg-primary-soft grid place-items-center text-primary shrink-0"><CalendarPlus size={20} /></span>
            <span className="flex-1 min-w-0"><span className="block text-[15px] font-bold">{t('시간표 추가')}</span><span className="block text-[12px] text-ink-3">{t('수업을 넣으면 공강이 겹치는 사람을 찾아드려요')}</span></span>
            <ChevronRight size={16} className="text-ink-3 shrink-0" />
          </button>
        ) : (
          <>
            {d.classes.length === 0 ? <div className="card px-4 py-3 text-[13px] text-ink-3">{t('오늘 수업 없음')}</div> : (
              <div className="card divide-y divide-line">
                {d.classes.slice(0, 4).map((c) => (
                  <button key={c.id} onClick={() => nav(`/classes/${encodeURIComponent(c.name)}`)} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left press">
                    <span className="w-1 h-8 rounded-full shrink-0" style={{ background: `hsl(${c.hue} 70% 60%)` }} />
                    <span className="flex-1 min-w-0"><span className="block text-[14px] font-bold truncate">{c.name}</span><span className="block text-[12px] text-ink-3">{formatTime(c.start)} – {formatTime(c.end)}</span></span>
                  </button>
                ))}
              </div>
            )}
            {d.nextFree && (
              <div className="mt-2 rounded-[24px] bg-accent-soft p-4 flex items-center gap-3">
                <Clock size={18} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold text-primary">{freeText}</div><div className="text-[11px] text-ink-3">{fmtBlock(d.nextFree)}</div></div>
                <Button size="sm" onClick={() => nav('/people?free=1')}>{t('같이할 사람 찾기')}</Button>
              </div>
            )}
          </>
        )}
      </Section>

      <Section title={t('지금 가까운 사람')} action={t('전체보기')} onAction={() => nav('/people')}>
        {d.connectNow.length === 0
          ? <Empty emoji="🤝" title={t('아직 추천할 사람이 없어요')} description={t('관심사와 찾는 것을 채우면 추천이 시작돼요.')} action={t('사람 둘러보기')} onAction={() => nav('/people')} />
          : <PeopleStrip people={d.connectNow} />}
      </Section>

      <Section title={t('학교에서 일어나는 것')} action={t('전체보기')} onAction={() => nav('/meet?tab=recommend')}>
        {d.happening.length === 0
          ? <Empty emoji="🏫" title={t('오늘은 학교 행사가 없어요')} description={ctx.campusHappenings.slice(0, 3).join(' · ')} action={t('모임 둘러보기')} onAction={() => nav('/meet?tab=recommend')} />
          : (
            <div className="card divide-y divide-line">
              {d.happening.map((h) => h.kind === 'activity'
                ? <Row key={h.a.id} icon={CATEGORY_EMOJI[h.a.category]} color={CATEGORY_COLORS[h.a.category]} title={h.a.title} sub={`${formatTime(h.a.startTime)} · ${h.a.place.name}`} onClick={() => nav(`/activities/${h.a.id}`)} />
                : <Row key={h.o.id} icon={OPP_TYPE_EMOJI[h.o.type]} color={OPP_TYPE_COLORS[h.o.type]} title={h.o.title} sub={`${h.o.startTime ? `${formatTime(h.o.startTime)} · ` : ''}${h.o.host}`} onClick={() => nav(`/opportunities/${h.o.id}`)} />)}
            </div>
          )}
      </Section>

      <Section title={t('나에게 맞는 모임')} action={t('전체보기')} onAction={() => nav('/meet')}>
        {d.meets.length === 0
          ? <Empty emoji="📅" title={t('맞는 모임이 아직 없어요')} action={t('모임 만들기')} onAction={() => nav('/meet/create')} />
          : <div className="card divide-y divide-line">{d.meets.map((m) => <MeetRow key={m.a.id} m={m} />)}</div>}
      </Section>

      {d.now.length > 0 && (
        <Section title={t('지금 열린 만남')} action={t('전체보기')} onAction={() => nav('/meet?tab=now')}>
          <div className="space-y-2">{d.now.map((a: Activity) => <NowActivityRow key={a.id} activity={a} inMin={toMin(a.startTime) - nowMinutes} />)}</div>
        </Section>
      )}

      {d.newPeople.length > 0 && (
        <Section title={t('새로운 사람')} action={t('찾기에서 더 보기')} onAction={() => nav('/people?tab=search')}>
          <PeopleStrip people={d.newPeople} />
        </Section>
      )}

      {d.opportunities.length > 0 && (
        <Section title={t('추천 기회')}>
          <div className="space-y-2">{d.opportunities.map((o) => <OpportunityCard key={o.id} o={o} variant="row" />)}</div>
        </Section>
      )}
    </>
  );
}

// ─── 대학원생 — 수업·공강보다 연구 분야 · 연구 일정 · 먼저 간 사람 ─────────────────────
function GradHome({ d, me }: { d: GradHomeData; me: User }) {
  const nav = useNavigate();
  const field = me.research?.field;
  const hasTT = me.timetable.length > 0;
  return (
    <>
      <Section title={t('이번 주 연구 일정')} action={d.researchWeek.length ? t('전체보기') : undefined} onAction={() => nav('/meet?tab=schedule')}>
        {d.researchWeek.length === 0
          ? <Empty emoji="📚" title={t('이번 주 세미나·리딩 그룹이 없어요')} description={t('같은 분야 사람과 작게 시작해보세요.')} action={t('리딩 그룹 만들기')} onAction={() => nav('/meet/create?category=study')} />
          : <div className="card divide-y divide-line">{d.researchWeek.map((a) => <Row key={a.id} icon={CATEGORY_EMOJI[a.category]} color={CATEGORY_COLORS[a.category]} title={a.title} sub={`${formatDate(a.date)} ${formatTime(a.startTime)} · ${a.place.name}`} onClick={() => nav(`/activities/${a.id}`)} />)}</div>}
      </Section>

      <Section title={field ? `${t('같은 연구 분야')} · ${field}` : t('같은 연구 분야')} action={d.researchPeople.length ? t('전체보기') : undefined} onAction={() => nav(`/people?tab=search${field ? `&q=${encodeURIComponent(field)}` : ''}`)}>
        {!field
          ? <Empty emoji="🔬" title={t('연구 분야를 알려주세요')} description={t('다른 학교 연구실까지, 분야가 겹치는 사람을 먼저 보여드려요.')} action={t('연구 분야 추가')} onAction={() => nav('/profile/edit#research')} />
          : d.researchPeople.length === 0
            ? <Empty emoji="🔬" title={t('같은 분야 대학원생이 아직 없어요')} action={t('사람 찾아보기')} onAction={() => nav('/people/find')} />
            : <PeopleStrip people={d.researchPeople} />}
      </Section>

      {d.ahead.length > 0 && (
        <Section title={t('먼저 간 사람')} action={t('전체보기')} onAction={() => nav('/people?tab=search')}>
          <p className="-mt-1 mb-2 text-[12px] text-ink-3">{t('박사과정 · 그 분야에서 일하는 선배 — 진로 이야기를 편하게')}</p>
          <PeopleStrip people={d.ahead} />
        </Section>
      )}

      <Section title={t('나에게 맞는 모임')} action={t('전체보기')} onAction={() => nav('/meet')}>
        {d.meets.length === 0
          ? <Empty emoji="📅" title={t('맞는 모임이 아직 없어요')} action={t('모임 만들기')} onAction={() => nav('/meet/create')} />
          : <div className="card divide-y divide-line">{d.meets.map((m) => <MeetRow key={m.a.id} m={m} />)}</div>}
      </Section>

      {hasTT && d.classes.length > 0 && (
        <Section title={t('오늘 일정')} action={t('전체보기')} onAction={() => nav('/timetable')}>
          <div className="card divide-y divide-line">
            {d.classes.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="w-1 h-8 rounded-full shrink-0" style={{ background: `hsl(${c.hue} 70% 60%)` }} />
                <span className="flex-1 min-w-0"><span className="block text-[14px] font-bold truncate">{c.name}</span><span className="block text-[12px] text-ink-3">{formatTime(c.start)} – {formatTime(c.end)}</span></span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {d.connectNow.length > 0 && (
        <Section title={t('같은 학교 사람')} action={t('전체보기')} onAction={() => nav('/people')}>
          <PeopleStrip people={d.connectNow} />
        </Section>
      )}

      {d.opportunities.length > 0 && (
        <Section title={t('추천 기회')}>
          <div className="space-y-2">{d.opportunities.map((o) => <OpportunityCard key={o.id} o={o} variant="row" />)}</div>
        </Section>
      )}
      <p className="px-6 mt-6 text-center text-[11px] text-ink-3">{t('연구 분야와 연구실은 프로필에서 바꿀 수 있어요. 지도교수는 켤 때만 보여요.')}</p>
    </>
  );
}

// ─── 졸업생·직장인 ─────────────────────────────────────────────────────────────
function NewsRow({ n }: { n: NetworkNews }) {
  const nav = useNavigate();
  const v = useViewer();
  if (n.kind === 'post' && n.post) {
    const p = n.post; const author = v.userById(p.authorId);
    return (
      <button onClick={() => nav(`/feed/${p.id}`)} className="w-full flex items-start gap-3 px-3.5 py-3 text-left press">
        {p.anonymous || !author ? <span className="h-9 w-9 rounded-full bg-surface-2 grid place-items-center text-[16px] shrink-0">👤</span> : <Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={36} />}
        <span className="flex-1 min-w-0"><span className="block text-[12px] font-bold text-ink-2 truncate">{n.who} · {t('새 글')}</span><span className="block text-[13px] text-ink line-clamp-2 mt-0.5">{p.text}</span></span>
      </button>
    );
  }
  if (n.kind === 'meet' && n.meet) {
    const a = n.meet;
    return <Row icon={CATEGORY_EMOJI[a.category]} color={CATEGORY_COLORS[a.category]} title={a.title} sub={`${n.who} · ${formatDate(a.date)} ${formatTime(a.startTime)}`} onClick={() => nav(`/activities/${a.id}`)} />;
  }
  return null;
}

function AlumniHome({ d, me }: { d: AlumniHome; me: User }) {
  const nav = useNavigate();
  const city = cityOf(me);
  const field = [me.career?.industry, me.career?.role].filter(Boolean).join(' / ');
  return (
    <>
      <Section title={t('새로운 사람')} action={t('전체보기')} onAction={() => nav('/people')}>
        {d.connect.length === 0
          ? <Empty emoji="🤝" title={t('아직 추천할 사람이 없어요')} action={t('사람 둘러보기')} onAction={() => nav('/people')} />
          : <PeopleStrip people={d.connect} />}
      </Section>

      <Section title={city ? `${t('내 지역 사람')} · ${city}` : t('내 지역 사람')} action={d.nearby.length ? t('전체보기') : undefined} onAction={() => nav('/people?tab=search')}>
        {d.nearby.length === 0
          ? <Empty emoji="📍" title={city ? t('이 지역에서 활동하는 사람이 아직 없어요') : t('활동 지역을 알려주세요')} description={t('지역을 더하면 같은 도시의 동문을 먼저 보여드려요.')} action={t('활동 지역 추가')} onAction={() => nav('/profile/edit')} />
          : <PeopleStrip people={d.nearby} />}
      </Section>

      <Section title={field ? `${t('내 분야 사람')} · ${field}` : t('내 분야 사람')} action={d.field.length ? t('전체보기') : undefined} onAction={() => nav('/people?tab=search')}>
        {d.field.length === 0
          ? <Empty emoji="💼" title={field ? t('같은 분야 사람이 아직 없어요') : t('직무·업종을 알려주세요')} description={t('같은 분야의 동문과 자연스럽게 이어져요.')} action={t('직무·업종 추가')} onAction={() => nav('/profile/edit')} />
          : <PeopleStrip people={d.field} />}
      </Section>

      <Section title={t('이번 주 참여 가능한 모임')} action={t('전체보기')} onAction={() => nav('/meet')}>
        {d.thisWeek.length === 0
          ? <Empty emoji="📅" title={t('이번 주 모임이 없어요')} action={t('모임 둘러보기')} onAction={() => nav('/meet')} />
          : <div className="card divide-y divide-line">{d.thisWeek.map((m) => <MeetRow key={m.a.id} m={m} />)}</div>}
      </Section>

      {d.news.length > 0 && (
        <Section title={t('내 관계망 소식')} action={t('전체보기')} onAction={() => nav('/feed?tab=following')}>
          <div className="card divide-y divide-line">{d.news.map((n) => <NewsRow key={`${n.kind}-${n.post?.id ?? n.meet?.id ?? n.group?.id}`} n={n} />)}</div>
        </Section>
      )}

      <Section title={t('내 그룹')} action={t('전체보기')} onAction={() => nav('/meet?tab=groups')}>
        {d.groups.length === 0
          ? <Empty emoji="👥" title={t('아직 참여한 그룹이 없어요')} action={t('그룹 찾기')} onAction={() => nav('/search?tab=groups')} />
          : <div className="card divide-y divide-line">{d.groups.map((g) => <Row key={g.id} icon={g.logo.url ? <Avatar emoji={g.logo.emoji} hue={g.logo.hue} url={g.logo.url} size={40} /> : g.logo.emoji} color="#0F2B48" title={g.name} sub={`${ORG_TYPE_LABELS[g.type]} · ${g.memberIds.length}${t('명')}`} onClick={() => nav(`/orgs/${g.id}`)} />)}</div>}
      </Section>

      {d.opportunities.length > 0 && (
        <Section title={t('추천 기회')}>
          <div className="space-y-2">{d.opportunities.map((o) => <OpportunityCard key={o.id} o={o} variant="row" />)}</div>
        </Section>
      )}
      <p className="px-6 mt-6 text-center text-[11px] text-ink-3 flex items-center justify-center gap-1"><MapPin size={11} /><Briefcase size={11} />{t('지역과 분야는 프로필에서 언제든 바꿀 수 있어요.')}</p>
    </>
  );
}
