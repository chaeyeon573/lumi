import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CalendarPlus, ChevronRight, Users, CheckCircle2, MapPin } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { CardSkeleton, ErrorState, Button, Avatar, Tag } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import type { Snapshot } from '@core/api';
import { homeToday, alumniHome, type HomeToday, type AlumniHome } from '@core/lib/home';
import { isAlumniStage, networkLabel } from '@core/lib/network';
import { INTEREST_LABELS, CATEGORY_EMOJI, CATEGORY_COLORS, OPP_TYPE_EMOJI, OPP_TYPE_COLORS, OPP_TYPE_LABELS, ORG_TYPE_LABELS } from '@core/lib/labels';
import { formatTime, formatDate } from '@core/lib/format';
import { fmtHours, fmtBlock } from '@core/lib/timetable';
import { dday, type Reason } from '@core/lib/recommend';
import type { User, Activity, Opportunity } from '@core/types';

/** Home — 오늘 대시보드. 재학생은 시간표·캠퍼스·만남·사람·기회, 졸업생은 도시·그룹·만남·글·기회 */
export function HomePage() {
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const schools = useAppStore((s) => s.schools);
  const organizations = useAppStore((s) => s.organizations);
  const posts = useAppStore((s) => s.posts);
  const chatRooms = useAppStore((s) => s.chatRooms);
  const notifications = useAppStore((s) => s.notifications);
  const reports = useAppStore((s) => s.reports);
  const v = useViewer();
  const me = v.me as User | undefined;
  const snap: Snapshot = useMemo(() => ({ ...v.snap, schools, organizations, posts, chatRooms, notifications, reports }), [v.snap, schools, organizations, posts, chatRooms, notifications, reports]);
  const alumni = !!me && isAlumniStage(me);
  const student = useMemo(() => (me && !alumni ? homeToday(snap, me, v.visibleActivities, (u) => v.canSeeField(u, 'timetable')) : null), [snap, me, alumni, v]);
  const alum = useMemo(() => (me && alumni ? alumniHome(snap, me, v.visibleActivities, v.visiblePosts, (u) => v.canSeeField(u, 'timetable')) : null), [snap, me, alumni, v]);

  return (
    <div className="min-h-full pb-24 bg-bg">
      <AppHeader search />
      {status === 'loading' && <div className="px-4"><CardSkeleton /></div>}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && me && (student ? <StudentHome d={student} me={me} /> : alum ? <AlumniHome d={alum} me={me} /> : null)}
    </div>
  );
}

// ─── 공용 조각 ────────────────────────────────────────────────────────────────
function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <section className="px-4 mt-5">
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

const Note = ({ children }: { children: ReactNode }) => <div className="card px-4 py-3 text-[13px] text-ink-3 flex items-center justify-between gap-2">{children}</div>;

function MeetRow({ a }: { a: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  return <Row icon={CATEGORY_EMOJI[a.category]} color={CATEGORY_COLORS[a.category]} title={a.title} sub={`${formatDate(a.date)} ${formatTime(a.startTime)} · ${a.place.name}`} right={<span className="text-[12px] text-ink-3 flex items-center gap-0.5 shrink-0"><Users size={11} />{v.approvedCount(a.id)}/{a.capacity >= 999 ? '∞' : a.capacity}</span>} onClick={() => nav(`/activities/${a.id}`)} />;
}

function OppRow({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  return <Row icon={OPP_TYPE_EMOJI[o.type]} color={OPP_TYPE_COLORS[o.type]} title={o.title} sub={`${OPP_TYPE_LABELS[o.type]} · ${o.host}`} right={o.deadline ? <span className="text-[12px] font-bold text-ink-3 shrink-0">{dday(o.deadline)}</span> : undefined} onClick={() => nav(`/opportunities/${o.id}`)} />;
}

/** 사람 카드 가로 스트립 — 아바타·이름·소속·관심사 3·연결 이유 2·프로필 보기 */
function PeopleStrip({ people, city }: { people: { u: User; reasons: Reason[] }[]; city?: boolean }) {
  const nav = useNavigate();
  return (
    <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 snap-x">
      {people.map(({ u, reasons }) => {
        const dept = u.affiliation.type === 'university' && u.affiliation.showDepartment ? u.affiliation.department : '';
        const sub = city ? [networkLabel(u, lang), u.career?.city ?? u.region].join(' · ') : [networkLabel(u, lang), dept].filter(Boolean).join(' · ');
        return (
          <article key={u.id} className="card w-[248px] shrink-0 snap-start p-4 flex flex-col">
            <div className="flex items-center gap-3">
              <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={48} />
              <div className="min-w-0"><div className="text-[15px] font-bold truncate">{u.nickname}</div><div className="text-[12px] text-ink-3 truncate flex items-center gap-1">{city && <MapPin size={11} className="shrink-0" />}{sub}</div></div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1">{u.interests.slice(0, 3).map((i) => <Tag key={i}>{INTEREST_LABELS[i]}</Tag>)}</div>
            <div className="mt-2.5 flex-1">
              {reasons.length > 0 && (<>
                <div className="text-[11px] font-bold text-ink-3">{t('이런 이유로 맞아요')}</div>
                <ul className="mt-0.5 space-y-0.5">{reasons.slice(0, 2).map((r) => <li key={r.text} className="text-[12px] text-ink-2 flex items-start gap-1"><CheckCircle2 size={12} className="text-primary shrink-0 mt-0.5" /><span className="line-clamp-1">{r.text}</span></li>)}</ul>
              </>)}
            </div>
            <Button size="sm" variant="outline" full className="mt-3" onClick={() => nav(`/users/${u.id}`)}>{t('프로필 보기')}</Button>
          </article>
        );
      })}
    </div>
  );
}

// ─── 재학생·대학원생 ───────────────────────────────────────────────────────────
function StudentHome({ d, me }: { d: HomeToday; me: User }) {
  const nav = useNavigate();
  const hasTT = me.timetable.length > 0;
  const freeText = d.nextFree ? (lang === 'en' ? `You have ${fmtHours(d.nextFree)} free · ${d.freeTogether} people are also free` : `${fmtHours(d.nextFree)} 비어요 · ${d.freeTogether}명도 비어요`) : '';
  return (
    <>
      <Section title={t('오늘 일정')} action={hasTT ? t('시간표') : undefined} onAction={() => nav('/timetable')}>
        {!hasTT ? (
          <button onClick={() => nav('/timetable')} className="card w-full p-4 text-left press flex items-center gap-3">
            <span className="h-11 w-11 rounded-2xl bg-primary-soft grid place-items-center text-primary shrink-0"><CalendarPlus size={20} /></span>
            <span className="flex-1 min-w-0"><span className="block text-[15px] font-bold">{t('시간표를 추가하세요')}</span><span className="block text-[12px] text-ink-3">{t('수업을 넣으면 공강에 맞는 사람과 만남을 추천해요')}</span></span>
            <ChevronRight size={16} className="text-ink-3 shrink-0" />
          </button>
        ) : (
          <>
            {d.classes.length === 0 ? <Note>{t('오늘 수업 없음')}</Note> : (
              <div className="card divide-y divide-line">
                {d.classes.map((c) => (
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

      {d.happening.length > 0 && (
        <Section title={t('오늘 캠퍼스에서')}>
          <div className="card divide-y divide-line">
            {d.happening.map((h) => h.kind === 'activity'
              ? <Row key={h.a.id} icon={CATEGORY_EMOJI[h.a.category]} color={CATEGORY_COLORS[h.a.category]} title={h.a.title} sub={`${formatTime(h.a.startTime)} · ${h.a.place.name}`} onClick={() => nav(`/activities/${h.a.id}`)} />
              : <Row key={h.o.id} icon={OPP_TYPE_EMOJI[h.o.type]} color={OPP_TYPE_COLORS[h.o.type]} title={h.o.title} sub={`${h.o.startTime ? `${formatTime(h.o.startTime)} · ` : ''}${h.o.host}`} onClick={() => nav(`/opportunities/${h.o.id}`)} />)}
          </div>
        </Section>
      )}

      <Section title={t('주변 만남')} action={t('전체 보기')} onAction={() => nav('/meet')}>
        {d.meets.length === 0
          ? <Note>{t('지금 열린 만남이 없어요')}<Button size="sm" variant="outline" onClick={() => nav('/meet/create')}>{t('만남 열기')}</Button></Note>
          : <div className="card divide-y divide-line">{d.meets.map((a) => <MeetRow key={a.id} a={a} />)}</div>}
      </Section>

      {d.people.length > 0 && (
        <Section title={t('만나보면 좋을 사람')} action={t('전체 보기')} onAction={() => nav('/people')}>
          <PeopleStrip people={d.people} />
        </Section>
      )}

      {d.opportunities.length > 0 && (
        <Section title={t('추천 기회')}>
          <div className="card divide-y divide-line">{d.opportunities.map((o) => <OppRow key={o.id} o={o} />)}</div>
        </Section>
      )}
    </>
  );
}

// ─── 졸업생·직장인 ─────────────────────────────────────────────────────────────
function AlumniHome({ d, me }: { d: AlumniHome; me: User }) {
  const nav = useNavigate();
  const v = useViewer();
  const city = me.career?.city ?? me.region;
  return (
    <>
      <Section title={`${t('주변 사람')} · ${city}`} action={t('전체 보기')} onAction={() => nav('/people')}>
        {d.nearby.length === 0 ? <Note>{t('아직 근처에 사람이 없어요')}</Note> : <PeopleStrip people={d.nearby} city />}
      </Section>

      <Section title={t('내 그룹')} action={t('전체 보기')} onAction={() => nav('/profile/groups')}>
        {d.groups.length === 0
          ? <Note>{t('아직 참여한 그룹이 없어요')}<Button size="sm" variant="outline" onClick={() => nav('/search?tab=orgs')}>{t('그룹 찾기')}</Button></Note>
          : <div className="card divide-y divide-line">{d.groups.map((g) => <Row key={g.id} icon={g.logo.url ? <Avatar emoji={g.logo.emoji} hue={g.logo.hue} url={g.logo.url} size={40} /> : g.logo.emoji} color="#0F2B48" title={g.name} sub={`${ORG_TYPE_LABELS[g.type]} · ${g.memberIds.length}${t('명')}`} onClick={() => nav(`/orgs/${g.id}`)} />)}</div>}
      </Section>

      <Section title={t('다가오는 만남')} action={t('전체 보기')} onAction={() => nav('/meet')}>
        {d.upcoming.length === 0
          ? <Note>{t('예정된 만남이 없어요')}<Button size="sm" variant="outline" onClick={() => nav('/meet')}>{t('만남 둘러보기')}</Button></Note>
          : <div className="card divide-y divide-line">{d.upcoming.map((a) => <MeetRow key={a.id} a={a} />)}</div>}
      </Section>

      {d.posts.length > 0 && (
        <Section title={t('관련 글')} action={t('전체 보기')} onAction={() => nav('/feed')}>
          <div className="card divide-y divide-line">
            {d.posts.map((p) => {
              const author = v.userById(p.authorId); const org = p.orgId ? v.orgById(p.orgId) : undefined;
              const name = p.anonymous ? t('익명') : org?.name ?? author?.nickname ?? '';
              return (
                <button key={p.id} onClick={() => nav(`/feed/${p.id}`)} className="w-full flex items-start gap-3 px-3.5 py-3 text-left press">
                  {p.anonymous || !author ? <span className="h-9 w-9 rounded-full bg-surface-2 grid place-items-center text-[16px] shrink-0">{org?.logo.emoji ?? '👤'}</span> : <Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={36} />}
                  <span className="flex-1 min-w-0"><span className="block text-[12px] font-bold text-ink-2 truncate">{name}</span><span className="block text-[13px] text-ink line-clamp-2 mt-0.5">{p.text}</span></span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {d.opportunities.length > 0 && (
        <Section title={t('추천 기회')}>
          <div className="card divide-y divide-line">{d.opportunities.map((o) => <OppRow key={o.id} o={o} />)}</div>
        </Section>
      )}
    </>
  );
}
