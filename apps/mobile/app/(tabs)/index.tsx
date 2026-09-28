import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Clock, CalendarPlus, ChevronRight, Users, MapPin, X, Sparkles, CalendarDays, Briefcase, RefreshCw } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { getPlatform } from '@core/platform';
import type { Snapshot } from '@core/api/types';
import { homeToday, alumniHome, gradHome, type HomeToday, type AlumniHome as AlumniHomeData, type GradHome as GradHomeData, type NetworkNews } from '@core/lib/home';
import { stageKind, researchLine } from '@core/lib/stage';
import { isAlumniStage, contextLine, cityOf, shouldSuggestStatusUpdate } from '@core/lib/network';
import { CATEGORY_EMOJI, CATEGORY_COLORS, OPP_TYPE_EMOJI, OPP_TYPE_COLORS, ORG_TYPE_LABELS } from '@core/lib/labels';
import { formatTime, formatDate } from '@core/lib/format';
import { fmtHours, fmtBlock, toMin, nowMin } from '@core/lib/timetable';
import { localeContext } from '@core/lib/locale-context';
import { requestsForMe } from '@core/lib/requests';
import type { User, Activity } from '@core/types';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { TabScreen, AppHeader, Avatar, Button, C } from '@/ui';
import { OppRow } from '@/components/a_shared';
import { useSnapshot } from '@/v2/useSnapshot';
import { SchoolBadge } from '@/v2/SchoolBadge';
import { PeopleStrip } from '@/v2/PeopleStrip';
import { MeetRow } from '@/v2/MeetRow';
import { NowActivityRow } from '@/v2/NowActivityRow';
import { AroundTodayCard } from '@/v2/AroundTodayCard';
import { HSection, CardList, Row, SmallEmpty, MoreSections } from '@/v2/HomeParts';

/** 가입 직후 1회 보여주는 첫 사용 카드 (웹 OnboardingPage FIRSTRUN_KEY 와 같은 키) */
const FIRSTRUN_KEY = 'aroundu.firstrun';

/**
 * Home — "오늘 나에게 뭐가 있나" (웹 HomePage). 게시글 피드가 아니라 지금 내 상황에서 볼 가치가 높은 것 2~4개씩.
 * 섹션은 3개 + "더 보기" 카드 하나 (UX-SPEC 13). 학부생: 오늘 일정 · 지금 가까운 사람 · 나에게 맞는 모임 / 더 보기: 학교에서 일어나는 것 · 지금 열린 만남 · 새로운 사람 · 추천 기회
 * 대학원생: 이번 주 연구 일정 · 같은 연구 분야 · 먼저 간 사람 / 더 보기: 나에게 맞는 모임 · 오늘 일정 · 같은 학교 사람 · 추천 기회
 * 졸업생: 새로운 사람 · 내 지역 사람 · 이번 주 모임 / 더 보기: 내 분야 사람 · 내 관계망 소식 · 내 그룹 · 추천 기회
 */
export default function HomeScreen() {
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const kind = stageKind(me);
  const student = useMemo(() => (kind === 'undergrad' ? homeToday(snap, me, v.visibleActivities, (u) => v.canSeeField(u, 'timetable')) : null), [snap, me, kind, v]);
  const grad = useMemo(() => (kind === 'grad' ? gradHome(snap, me, v.visibleActivities, (u) => v.canSeeField(u, 'timetable')) : null), [snap, me, kind, v]);
  const alum = useMemo(() => (isAlumniStage(me) ? alumniHome(snap, me, v.visibleActivities, v.visiblePosts, (u) => v.canSeeField(u, 'timetable')) : null), [snap, me, v]);
  return (
    <TabScreen header={<AppHeader search />}>
      <Identity me={me} />
      <FirstRunCard />
      <AroundTodayCard me={me} snap={snap} />
      <AskedOfMe me={me} snap={snap} />
      {student ? <StudentHome d={student} me={me} /> : grad ? <GradHome d={grad} me={me} /> : alum ? <AlumniHome d={alum} me={me} /> : null}
      <View style={tw`h-6`} />
    </TabScreen>
  );
}

// ─── 정체성 블록 — "연세대학교 ✓ · 학부생 · 경영학과 3학년" (대학원생은 연구 한 줄) ──────────────
function Identity({ me }: { me: User }) {
  const line = contextLine(me, lang);
  const suggest = shouldSuggestStatusUpdate(me);
  const research = stageKind(me) === 'grad' ? researchLine(me, lang) : '';
  return (
    <View style={tw`pt-1 pb-1`}>
      <Pressable onPress={() => nav('/profile')} style={tw`flex-row items-center`}>
        <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={44} />
        <View style={tw`flex-1 min-w-0 mx-3`}>
          <SchoolBadge user={me} size="lg" />
          {line ? <Text numberOfLines={1} style={tw`text-[13px] text-ink-2`}>{line}</Text> : null}
          {research ? <Text numberOfLines={1} style={tw`text-[12px] text-verify font-semibold`}>🔬 {research}</Text> : null}
        </View>
        <ChevronRight size={16} color={C.ink3} />
      </Pressable>
      {suggest && (
        <Pressable onPress={() => nav('/profile/status')} style={tw`mt-2 rounded-2xl bg-accent-soft px-3.5 py-2.5 flex-row items-center`}>
          <RefreshCw size={13} color={C.primary} />
          <Text style={tw`flex-1 mx-2 text-[12px] font-semibold text-primary`}>{t('현재 상태가 바뀌었나요? 졸업했다면 알려주세요.')}</Text>
          <ChevronRight size={14} color={C.primary} />
        </Pressable>
      )}
    </View>
  );
}

// ─── 첫 사용 카드 (가입 직후 1회) — 한 줄 안내, 아무것도 안 해도 된다 ───────────────────
function FirstRunCard() {
  const [show, setShow] = useState(() => { try { return getPlatform().getItem(FIRSTRUN_KEY) === '1'; } catch { return false; } });
  if (!show) return null;
  const dismiss = () => { try { getPlatform().removeItem(FIRSTRUN_KEY); } catch { /* */ } setShow(false); };
  return (
    <View style={tw`mt-3 rounded-[20px] bg-primary-soft p-4`}>
      <Pressable onPress={dismiss} accessibilityLabel={t('닫기')} style={tw`absolute top-3 right-3 h-8 w-8 rounded-full items-center justify-center`}><X size={16} color={C.ink3} /></Pressable>
      <View style={tw`flex-row items-center`}><Sparkles size={12} color={C.primary} /><Text style={tw`ml-1 text-[11px] font-bold text-primary`}>{t('어서 오세요')}</Text></View>
      <Text style={tw`mt-1 pr-8 text-[15px] font-bold text-ink`}>{t('천천히 둘러보세요. 마음에 드는 사람은 저장해 두고, 나중에 편할 때 연결하면 돼요.')}</Text>
      <View style={tw`mt-3 flex-row`}>
        <Pressable onPress={() => { dismiss(); nav('/people'); }} style={tw`h-9 px-3.5 mr-2 rounded-full bg-white flex-row items-center`}><Users size={14} color={C.primary} /><Text style={tw`ml-1.5 text-[12px] font-semibold text-primary`}>{t('가까운 사람 보기')}</Text></Pressable>
        <Pressable onPress={() => { dismiss(); nav('/meet/tables'); }} style={tw`h-9 px-3.5 rounded-full bg-white flex-row items-center`}><CalendarDays size={14} color={C.primary} /><Text style={tw`ml-1.5 text-[12px] font-semibold text-primary`}>{t('작은 모임 보기')}</Text></Pressable>
      </View>
    </View>
  );
}

// ─── 혹시 여기에 해당되나요? — 건너건너 물어온 것 1건, 조용히 ─────────────────────
function AskedOfMe({ me, snap }: { me: User; snap: Snapshot }) {
  const incoming = useMemo(() => requestsForMe(snap, me), [snap, me]);
  if (incoming.length === 0) return null;
  const first = incoming[0];
  // 섹션 대신 한 줄 — 누르면 받은 요청으로 (답하지 않아도 괜찮다)
  return (
    <Pressable onPress={() => nav(incoming.length > 1 ? '/people/requests' : `/people/requests/${first.req.id}`)} style={tw`mt-3 h-12 rounded-full bg-accent-soft pl-4 pr-3 flex-row items-center`}>
      <Text numberOfLines={1} style={tw`flex-1 min-w-0 text-[13px] font-semibold text-ink`}>{t('혹시 여기에 해당되나요?')} · <Text style={tw`font-medium text-ink-2`}>{first.req.text}</Text></Text>
      <Text style={tw`ml-2 text-[12px] font-semibold text-verify`}>{incoming.length > 1 ? `${incoming.length}${lang === 'en' ? '' : '건'}` : t('보기')}</Text>
      <ChevronRight size={15} color={C.ink3} />
    </Pressable>
  );
}

/** 오늘 수업 목록 (색 막대 + 시간) */
function ClassList({ classes, max }: { classes: HomeToday['classes']; max: number }) {
  const list = classes.slice(0, max);
  return (
    <CardList>
      {list.map((c, i) => (
        <Pressable key={c.id} onPress={() => nav(`/classes/${encodeURIComponent(c.name)}`)} style={tw`flex-row items-center px-3.5 py-2.5 ${i === list.length - 1 ? '' : 'border-b border-line'}`}>
          <View style={[tw`w-1 h-8 rounded-full`, { backgroundColor: `hsl(${c.hue}, 70%, 60%)` }]} />
          <View style={tw`flex-1 min-w-0 ml-3`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{c.name}</Text><Text style={tw`text-[12px] text-ink-3`}>{formatTime(c.start)} – {formatTime(c.end)}</Text></View>
        </Pressable>
      ))}
    </CardList>
  );
}

function Opps({ list }: { list: HomeToday['opportunities'] }) {
  if (!list.length) return null;
  return <HSection title={t('추천 기회')}><View>{list.map((o) => <OppRow key={o.id} o={o} />)}</View></HSection>;
}

// ─── 학부생 ───────────────────────────────────────────────────────────────────
function StudentHome({ d, me }: { d: HomeToday; me: User }) {
  const ctx = localeContext();
  const hasTT = me.timetable.length > 0;
  const freeText = d.nextFree ? (lang === 'en' ? `${fmtHours(d.nextFree)} free · ${d.freeTogether} also free` : `${fmtHours(d.nextFree)} 비어요 · 같이 비는 사람 ${d.freeTogether}명`) : '';
  const nowMinutes = nowMin();
  return (
    <>
      <HSection title={t('오늘 일정')} action={hasTT ? t('전체보기') : undefined} onAction={() => nav('/timetable')}>
        {!hasTT ? (
          <Pressable onPress={() => nav('/timetable')} style={tw`card p-4 flex-row items-center`}>
            <View style={tw`h-11 w-11 rounded-2xl bg-primary-soft items-center justify-center`}><CalendarPlus size={20} color={C.primary} /></View>
            <View style={tw`flex-1 min-w-0 mx-3`}><Text style={tw`text-[15px] font-bold text-ink`}>{t('시간표 추가')}</Text><Text style={tw`text-[12px] text-ink-3`}>{t('수업을 넣으면 공강이 겹치는 사람을 찾아드려요')}</Text></View>
            <ChevronRight size={16} color={C.ink3} />
          </Pressable>
        ) : (
          <>
            {d.classes.length === 0 ? <View style={tw`card px-4 py-3`}><Text style={tw`text-[13px] text-ink-3`}>{t('오늘 수업 없음')}</Text></View> : <ClassList classes={d.classes} max={4} />}
            {d.nextFree && (
              <View style={tw`mt-2 rounded-[20px] bg-accent-soft p-4 flex-row items-center`}>
                <Clock size={18} color={C.primary} />
                <View style={tw`flex-1 min-w-0 mx-3`}><Text style={tw`text-[13px] font-semibold text-primary`}>{freeText}</Text><Text style={tw`text-[11px] text-ink-3`}>{fmtBlock(d.nextFree)}</Text></View>
                <Button size="sm" onPress={() => nav('/people?free=1')}>{t('같이할 사람 찾기')}</Button>
              </View>
            )}
          </>
        )}
      </HSection>

      <HSection title={t('지금 가까운 사람')} action={t('전체보기')} onAction={() => nav('/people')}>
        {d.connectNow.length === 0
          ? <SmallEmpty emoji="🤝" title={t('아직 추천할 사람이 없어요')} description={t('관심사와 찾는 것을 채우면 추천이 시작돼요.')} action={t('사람 둘러보기')} onAction={() => nav('/people')} />
          : <PeopleStrip people={d.connectNow} />}
      </HSection>

      <HSection title={t('나에게 맞는 모임')} action={t('전체보기')} onAction={() => nav('/meet')}>
        {d.meets.length === 0
          ? <SmallEmpty emoji="📅" title={t('맞는 모임이 아직 없어요')} action={t('모임 만들기')} onAction={() => nav('/meet/create')} />
          : <CardList>{d.meets.map((m, i) => <MeetRow key={m.a.id} m={m} last={i === d.meets.length - 1} />)}</CardList>}
      </HSection>

      <MoreSections titles={[t('학교에서 일어나는 것'), d.now.length ? t('지금 열린 만남') : '', d.newPeople.length ? t('새로운 사람') : '', d.opportunities.length ? t('추천 기회') : '']}>
      <HSection title={t('학교에서 일어나는 것')} action={t('전체보기')} onAction={() => nav('/meet?tab=recommend')}>
        {d.happening.length === 0
          ? <SmallEmpty emoji="🏫" title={t('오늘은 학교 행사가 없어요')} description={ctx.campusHappenings.slice(0, 3).join(' · ')} action={t('모임 둘러보기')} onAction={() => nav('/meet?tab=recommend')} />
          : (
            <CardList>
              {d.happening.map((h, i) => h.kind === 'activity'
                ? <Row key={h.a.id} last={i === d.happening.length - 1} icon={CATEGORY_EMOJI[h.a.category]} color={CATEGORY_COLORS[h.a.category]} title={h.a.title} sub={`${formatTime(h.a.startTime)} · ${h.a.place.name}`} onPress={() => nav(`/activities/${h.a.id}`)} />
                : <Row key={h.o.id} last={i === d.happening.length - 1} icon={OPP_TYPE_EMOJI[h.o.type]} color={OPP_TYPE_COLORS[h.o.type]} title={h.o.title} sub={`${h.o.startTime ? `${formatTime(h.o.startTime)} · ` : ''}${h.o.host}`} onPress={() => nav(`/opportunities/${h.o.id}`)} />)}
            </CardList>
          )}
      </HSection>

      {d.now.length > 0 && (
        <HSection title={t('지금 열린 만남')} action={t('전체보기')} onAction={() => nav('/discover')}>
          <View>{d.now.map((a: Activity) => <NowActivityRow key={a.id} activity={a} inMin={toMin(a.startTime) - nowMinutes} />)}</View>
        </HSection>
      )}

      {d.newPeople.length > 0 && (
        <HSection title={t('새로운 사람')} action={t('찾기에서 더 보기')} onAction={() => nav('/people?tab=search')}>
          <PeopleStrip people={d.newPeople} />
        </HSection>
      )}

        <Opps list={d.opportunities} />
      </MoreSections>
    </>
  );
}

// ─── 대학원생 — 수업·공강보다 연구 분야 · 연구 일정 · 먼저 간 사람 ─────────────────────
function GradHome({ d, me }: { d: GradHomeData; me: User }) {
  const field = me.research?.field;
  const hasTT = me.timetable.length > 0;
  return (
    <>
      <HSection title={t('이번 주 연구 일정')} action={d.researchWeek.length ? t('전체보기') : undefined} onAction={() => nav('/meet?tab=schedule')}>
        {d.researchWeek.length === 0
          ? <SmallEmpty emoji="📚" title={t('이번 주 세미나·리딩 그룹이 없어요')} description={t('같은 분야 사람과 작게 시작해보세요.')} action={t('리딩 그룹 만들기')} onAction={() => nav('/meet/create?category=study')} />
          : <CardList>{d.researchWeek.map((a, i) => <Row key={a.id} last={i === d.researchWeek.length - 1} icon={CATEGORY_EMOJI[a.category]} color={CATEGORY_COLORS[a.category]} title={a.title} sub={`${formatDate(a.date)} ${formatTime(a.startTime)} · ${a.place.name}`} onPress={() => nav(`/activities/${a.id}`)} />)}</CardList>}
      </HSection>

      <HSection title={field ? `${t('같은 연구 분야')} · ${field}` : t('같은 연구 분야')} action={d.researchPeople.length && field ? t('전체보기') : undefined} onAction={() => nav(`/people?tab=search${field ? `&q=${encodeURIComponent(field)}` : ''}`)}>
        {!field
          ? <SmallEmpty emoji="🔬" title={t('연구 분야를 알려주세요')} description={t('다른 학교 연구실까지, 분야가 겹치는 사람을 먼저 보여드려요.')} action={t('연구 분야 추가')} onAction={() => nav('/profile/edit')} />
          : d.researchPeople.length === 0
            ? <SmallEmpty emoji="🔬" title={t('같은 분야 대학원생이 아직 없어요')} action={t('사람 찾아보기')} onAction={() => nav('/people/find')} />
            : <PeopleStrip people={d.researchPeople} />}
      </HSection>

      {d.ahead.length > 0 && (
        <HSection title={t('먼저 간 사람')} action={t('전체보기')} onAction={() => nav('/people?tab=search')} sub={t('박사과정 · 그 분야에서 일하는 선배 — 진로 이야기를 편하게')}>
          <PeopleStrip people={d.ahead} />
        </HSection>
      )}

      <MoreSections titles={[t('나에게 맞는 모임'), hasTT && d.classes.length ? t('오늘 일정') : '', d.connectNow.length ? t('같은 학교 사람') : '', d.opportunities.length ? t('추천 기회') : '']}>
      <HSection title={t('나에게 맞는 모임')} action={t('전체보기')} onAction={() => nav('/meet')}>
        {d.meets.length === 0
          ? <SmallEmpty emoji="📅" title={t('맞는 모임이 아직 없어요')} action={t('모임 만들기')} onAction={() => nav('/meet/create')} />
          : <CardList>{d.meets.map((m, i) => <MeetRow key={m.a.id} m={m} last={i === d.meets.length - 1} />)}</CardList>}
      </HSection>

      {hasTT && d.classes.length > 0 && (
        <HSection title={t('오늘 일정')} action={t('전체보기')} onAction={() => nav('/timetable')}>
          <ClassList classes={d.classes} max={3} />
        </HSection>
      )}

      {d.connectNow.length > 0 && (
        <HSection title={t('같은 학교 사람')} action={t('전체보기')} onAction={() => nav('/people')}>
          <PeopleStrip people={d.connectNow} />
        </HSection>
      )}

        <Opps list={d.opportunities} />
      </MoreSections>
      <Text style={tw`px-4 mt-6 text-center text-[11px] text-ink-3`}>{t('연구 분야와 연구실은 프로필에서 바꿀 수 있어요. 지도교수는 켤 때만 보여요.')}</Text>
    </>
  );
}

// ─── 졸업생·직장인 ─────────────────────────────────────────────────────────────
function NewsRow({ n, last }: { n: NetworkNews; last?: boolean }) {
  const v = useViewer();
  if (n.kind === 'post' && n.post) {
    const p = n.post; const author = v.userById(p.authorId);
    return (
      <Pressable onPress={() => nav(`/feed/${p.id}`)} style={tw`flex-row items-start px-3.5 py-3 ${last ? '' : 'border-b border-line'}`}>
        {p.anonymous || !author ? <View style={tw`h-9 w-9 rounded-full bg-surface-2 items-center justify-center`}><Text style={tw`text-[16px]`}>👤</Text></View> : <Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={36} />}
        <View style={tw`flex-1 min-w-0 ml-3`}><Text numberOfLines={1} style={tw`text-[12px] font-bold text-ink-2`}>{n.who} · {t('새 글')}</Text><Text numberOfLines={2} style={tw`text-[13px] text-ink mt-0.5`}>{p.text}</Text></View>
      </Pressable>
    );
  }
  if (n.kind === 'meet' && n.meet) {
    const a = n.meet;
    return <Row last={last} icon={CATEGORY_EMOJI[a.category]} color={CATEGORY_COLORS[a.category]} title={a.title} sub={`${n.who} · ${formatDate(a.date)} ${formatTime(a.startTime)}`} onPress={() => nav(`/activities/${a.id}`)} />;
  }
  return null;
}

function AlumniHome({ d, me }: { d: AlumniHomeData; me: User }) {
  const city = cityOf(me);
  const field = [me.career?.industry, me.career?.role].filter(Boolean).join(' / ');
  return (
    <>
      <HSection title={t('새로운 사람')} action={t('전체보기')} onAction={() => nav('/people')}>
        {d.connect.length === 0
          ? <SmallEmpty emoji="🤝" title={t('아직 추천할 사람이 없어요')} action={t('사람 둘러보기')} onAction={() => nav('/people')} />
          : <PeopleStrip people={d.connect} />}
      </HSection>

      <HSection title={city ? `${t('내 지역 사람')} · ${city}` : t('내 지역 사람')} action={d.nearby.length ? t('전체보기') : undefined} onAction={() => nav('/people?tab=search')}>
        {d.nearby.length === 0
          ? <SmallEmpty emoji="📍" title={city ? t('이 지역에서 활동하는 사람이 아직 없어요') : t('활동 지역을 알려주세요')} description={t('지역을 더하면 같은 도시의 동문을 먼저 보여드려요.')} action={t('활동 지역 추가')} onAction={() => nav('/profile/edit')} />
          : <PeopleStrip people={d.nearby} />}
      </HSection>

      <HSection title={t('이번 주 참여 가능한 모임')} action={t('전체보기')} onAction={() => nav('/meet')}>
        {d.thisWeek.length === 0
          ? <SmallEmpty emoji="📅" title={t('이번 주 모임이 없어요')} action={t('모임 둘러보기')} onAction={() => nav('/meet')} />
          : <CardList>{d.thisWeek.map((m, i) => <MeetRow key={m.a.id} m={m} last={i === d.thisWeek.length - 1} />)}</CardList>}
      </HSection>

      <MoreSections titles={[t('내 분야 사람'), d.news.length ? t('내 관계망 소식') : '', t('내 그룹'), d.opportunities.length ? t('추천 기회') : '']}>
      <HSection title={field ? `${t('내 분야 사람')} · ${field}` : t('내 분야 사람')} action={d.field.length ? t('전체보기') : undefined} onAction={() => nav('/people?tab=search')}>
        {d.field.length === 0
          ? <SmallEmpty emoji="💼" title={field ? t('같은 분야 사람이 아직 없어요') : t('직무·업종을 알려주세요')} description={t('같은 분야의 동문과 자연스럽게 이어져요.')} action={t('직무·업종 추가')} onAction={() => nav('/profile/edit')} />
          : <PeopleStrip people={d.field} />}
      </HSection>

      {d.news.length > 0 && (
        <HSection title={t('내 관계망 소식')} action={t('전체보기')} onAction={() => nav('/feed?tab=following')}>
          <CardList>{d.news.map((n, i) => <NewsRow key={`${n.kind}-${n.post?.id ?? n.meet?.id ?? n.group?.id}`} n={n} last={i === d.news.length - 1} />)}</CardList>
        </HSection>
      )}

      <HSection title={t('내 그룹')} action={t('전체보기')} onAction={() => nav('/meet?tab=groups')}>
        {d.groups.length === 0
          ? <SmallEmpty emoji="👥" title={t('아직 참여한 그룹이 없어요')} action={t('그룹 찾기')} onAction={() => nav('/meet?tab=groups')} />
          : <CardList>{d.groups.map((g, i) => <Row key={g.id} last={i === d.groups.length - 1} icon={g.logo.url ? <Avatar emoji={g.logo.emoji} hue={g.logo.hue} url={g.logo.url} size={40} /> : g.logo.emoji} color={C.primary} title={g.name} sub={`${ORG_TYPE_LABELS[g.type]} · ${g.memberIds.length}${t('명')}`} onPress={() => nav(`/orgs/${g.id}`)} />)}</CardList>}
      </HSection>

        <Opps list={d.opportunities} />
      </MoreSections>
      <View style={tw`px-4 mt-6 flex-row items-center justify-center`}><MapPin size={11} color={C.ink3} /><Briefcase size={11} color={C.ink3} /><Text style={tw`ml-1 text-[11px] text-ink-3 text-center shrink`}>{t('지역과 분야는 프로필에서 언제든 바꿀 수 있어요.')}</Text></View>
    </>
  );
}
