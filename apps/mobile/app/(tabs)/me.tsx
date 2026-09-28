import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Settings, Pencil, ShieldCheck, CalendarDays, ChevronRight, Users, CalendarCheck, Bookmark, Building2, FileText, Bell, MapPin, Briefcase, Sparkles, GraduationCap, Quote, Target, MessageSquareText, BookmarkCheck, Coffee, FlaskConical, Plus, ChevronDown } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { INTEREST_LABELS, INTEREST_EMOJI } from '@core/lib/labels';
import { friendsOf } from '@core/lib/relations';
import { isStudentStage, majorOf, cityOf, contextLine, classYearLabel, yy, shouldSuggestStatusUpdate, stageLabel, stageOf, gradYearOf } from '@core/lib/network';
import { PEOPLE_WANT_LABELS, PEOPLE_WANT_EMOJI, ACTIVITY_WANT_LABELS, ACTIVITY_WANT_EMOJI, hasWants, peopleWantOptions, activityWantOptions } from '@core/lib/wants';
import { stageKind, stageCopy, researchLine, type StageKind } from '@core/lib/stage';
import { activeStatuses } from '@core/lib/status';
import { AUDIENCE_LABELS, privacyOf } from '@core/lib/privacy';
import { todayISO, formatDateTime } from '@core/lib/format';
import { statusNow, freeBlocks, todayIdx, nowMin, fmtBlock, toHHMM } from '@core/lib/timetable';
import { profileCompletion, questionById } from '@core/data/prompts';
import type { User } from '@core/types';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { TabScreen, AppHeader, IconBtn, Avatar, Button, Tag, IconCircle, C } from '@/ui';
import { WeekGrid } from '@/components/WeekGrid';
import { PostCard } from '@/components/PostCard';
import { SchoolBadge } from '@/v2/SchoolBadge';
import { StatusPills } from '@/v2/StatusPill';

/** 헤더 두 번째 줄 — 학생: "경영학과 · '25 졸업 예정" / 석·박사: "컴퓨터과학과 · 석사 과정" / 졸업생: "2018 졸업 · 서울 · AI / Product" */
function headerLine(me: User, kind: StageKind): string {
  if (kind === 'alumni') return contextLine(me, lang);
  const major = majorOf(me);
  const stagePart = kind === 'grad' || !me.gradYear ? classYearLabel(me, lang) : lang === 'en' ? `Class of ${yy(me.gradYear)}` : `${yy(me.gradYear)} 졸업 예정`;
  return [major, stagePart].filter(Boolean).join(' · ');
}

const Card = ({ children, style }: { children: ReactNode; style?: object }) => <View style={[tw`mt-4 rounded-[24px] border border-line bg-white p-5`, style]}>{children}</View>;
function SectionTitle({ icon, children, right }: { icon: ReactNode; children: ReactNode; right?: ReactNode }) {
  return <View style={tw`flex-row items-center justify-between`}><View style={tw`flex-row items-center flex-1`}>{icon}<Text numberOfLines={1} style={tw`ml-2 text-[18px] font-bold text-primary shrink`}>{children}</Text></View>{right}</View>;
}
const EditLink = ({ to, label }: { to: string; label?: string }) => (
  <Pressable onPress={() => nav(to)} style={tw`h-8 px-3 rounded-full bg-surface-2 flex-row items-center`}><Pencil size={12} color={C.primary} /><Text style={tw`ml-1 text-[12px] font-bold text-primary`}>{label ?? t('편집')}</Text></Pressable>
);
const Pill = ({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'soft' | 'neutral' }) => (
  <View style={tw`h-7 px-3 mr-1.5 mb-1.5 rounded-full justify-center ${tone === 'accent' ? 'bg-accent-soft' : tone === 'soft' ? 'bg-primary-soft' : 'bg-surface-2'}`}><Text style={tw`text-[12px] font-semibold ${tone === 'neutral' ? 'text-ink-2' : 'text-primary'}`}>{children}</Text></View>
);
const Tile = ({ icon, l, v }: { icon: ReactNode; l: string; v: string }) => (
  <View style={tw`w-1/2 p-1`}><View style={tw`rounded-2xl bg-surface-2 px-3.5 py-2.5`}><View style={tw`flex-row items-center`}>{icon}<Text style={tw`ml-1 text-[11px] text-ink-3`}>{l}</Text></View><Text numberOfLines={1} style={tw`text-[14px] font-semibold text-ink`}>{v}</Text></View></View>
);

/**
 * 나 (웹 ProfilePage) — 헤더 · Open To · 단계 카드 · 관심사 · 추천 설정 · 카운트 · 상태 변경 · 다가오는 만남 · 더 알려주기 · 내 글.
 * 단계 카드: 학부생 "이번 학기"(학년·전공·시간표 미니·동아리) / 대학원생 "연구"(분야·연구실·키워드, 지도교수는 켤 때만) / 졸업생 "현재"(도시·활동 지역·회사·업종·직무)
 */
export default function ProfileScreen() {
  const v = useViewer();
  const activities = useAppStore((s) => s.activities);
  const participations = useAppStore((s) => s.participations);
  const polls = useAppStore((s) => s.timePolls);
  const intents = useAppStore((s) => s.opportunityIntents);
  const orgs = useAppStore((s) => s.organizations);
  const posts = useAppStore((s) => s.posts);
  const notifications = useAppStore((s) => s.notifications);
  const me = v.me;
  const kind = stageKind(me);
  const friends = friendsOf(v.snap, me.id).length;
  const today = todayISO();
  const upcoming = activities.filter((a) => a.date >= today && (a.hostId === me.id || participations.some((p) => p.activityId === a.id && p.userId === me.id && (p.status === 'approved' || p.status === 'pending')))).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const meets = activities.filter((a) => participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'approved')).length + activities.filter((a) => a.hostId === me.id).length;
  const completion = profileCompletion(me);
  const goTo = me.prompts[0];
  const openPolls = polls.filter((p) => p.status === 'open' && (p.hostId === me.id || p.inviteeIds.includes(me.id))).length;
  const saved = intents.filter((i) => i.userId === me.id && (i.saved || i.intent === 'applied')).length;
  const myOrgs = orgs.filter((o) => o.memberIds.includes(me.id) || o.adminIds.includes(me.id) || o.followerIds.includes(me.id)).length;
  const myPosts = posts.filter((p) => p.authorId === me.id && p.authorType === 'user').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = notifications.filter((n) => n.userId === me.id && !n.read).length;
  const student = isStudentStage(me);
  const suggest = shouldSuggestStatusUpdate(me);
  const myStatus = activeStatuses(me).length > 0;
  const savedPeople = (me.savedPeople ?? []).filter((id) => v.visibleUsers.some((u) => u.id === id)).length;
  const wantPeople = peopleWantOptions(kind).filter((p) => me.wants?.people.includes(p));
  const [moreLinks, setMoreLinks] = useState(false);
  const wantActs = activityWantOptions(kind).filter((a) => me.wants?.activities.includes(a));

  return (
    <TabScreen header={<AppHeader right={<IconBtn onPress={() => nav('/settings')}><Settings size={21} color={C.ink2} /></IconBtn>} />}>
      {/* ── 헤더: 사진 · 이름 · 학교 배지 · 전공 · 졸업(예정) ── */}
      <View style={tw`rounded-[24px] border border-line bg-white p-5`}>
        <View style={tw`flex-row items-center`}>
          <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={72} />
          <View style={tw`flex-1 min-w-0 ml-4`}>
            <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[24px] font-bold text-primary shrink`}>{me.nickname}</Text>{me.plan === 'plus' ? <View style={tw`ml-2 h-5 px-2 rounded-full bg-primary justify-center`}><Text style={tw`text-[10px] font-extrabold text-white`}>PLUS</Text></View> : null}</View>
            {me.affiliation.type === 'university' ? <View style={tw`mt-0.5`}><SchoolBadge user={me} /></View> : null}
            <Text numberOfLines={1} style={tw`text-[13px] text-ink-2`}>{headerLine(me, kind)}</Text>
          </View>
        </View>
        {goTo?.answer ? (
          <View style={tw`mt-4 rounded-2xl bg-surface-2 px-4 py-3`}>
            <View style={tw`flex-row items-center`}><Quote size={11} color={C.verify} /><Text style={tw`ml-1 text-[11px] font-bold text-verify uppercase`}>{questionById(goTo.questionId)?.text}</Text></View>
            <Text style={tw`mt-1 text-[14px] text-ink-2 italic`}>“{goTo.answer}”</Text>
          </View>
        ) : null}
        <View style={tw`mt-4 flex-row`}>
          <Button full icon={<Pencil size={15} color={C.onPrimary} />} onPress={() => nav('/profile/edit')}>{t('프로필 편집')}</Button>
          <View style={tw`w-2`} />
          <Button full variant="secondary" icon={<ShieldCheck size={15} color={C.primary} />} onPress={() => nav('/settings/privacy')}>{t('공개 범위')}</Button>
        </View>
      </View>

      {/* ── Open To: 기간이 지나면 자동으로 꺼진다. 한 줄 ── */}
      <Pressable onPress={() => nav('/profile/open-to')} style={tw`mt-4 rounded-[24px] border border-line bg-white p-4 flex-row items-center`}>
        <View style={tw`h-10 w-10 rounded-full bg-accent-soft items-center justify-center`}><Coffee size={18} color={C.primary} /></View>
        <View style={tw`flex-1 min-w-0 mx-3`}>
          <Text style={tw`text-[12px] font-bold text-ink-3`}>Open To · {t('지금 상태')}</Text>
          {myStatus ? <View style={tw`mt-1`}><StatusPills user={me} /></View> : <Text style={tw`text-[14px] text-ink-2`}>{t('상태 없음')}</Text>}
        </View>
        <Text style={tw`text-[13px] font-bold text-verify`}>{myStatus ? t('바꾸기') : t('켜기')}</Text>
      </Pressable>

      {/* ── 단계 카드 ── */}
      {kind === 'undergrad' ? <SemesterCard me={me} /> : kind === 'grad' ? <ResearchCard me={me} /> : <NowCard me={me} />}

      {/* ── 관심사 ── */}
      <Card>
        <SectionTitle icon={<Sparkles size={17} color={C.primary} />} right={<EditLink to="/profile/edit" />}>{t('관심사')}</SectionTitle>
        {me.interests.length === 0
          ? <Text style={tw`mt-2 text-[13px] text-ink-3`}>{t('관심사를 고르면 비슷한 사람과 모임을 먼저 추천해요.')}</Text>
          : <View style={tw`mt-3 flex-row flex-wrap`}>{me.interests.slice(0, 8).map((i) => <Pill key={i}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Pill>)}</View>}
      </Card>

      {/* ── 추천 설정 — 나만 보는 추천 기준. 단계별 순서(peopleWantOptions/activityWantOptions) ── */}
      <Card>
        <SectionTitle icon={<Target size={17} color={C.primary} />} right={<EditLink to="/profile/wants" />}>{t('추천 설정')}</SectionTitle>
        <Text style={tw`mt-0.5 text-[12px] text-ink-3`}>{t('나만 보여요 · 추천에만 쓰여요')}</Text>
        {!hasWants(me.wants) ? (
          <View style={tw`mt-3 rounded-2xl bg-surface-2 px-4 py-4 items-center`}>
            <Text style={tw`text-[13px] text-ink-2 text-center`}>{t('어떤 사람을 만나고, 무엇을 하고 싶은지 알려주세요.')}</Text>
            <View style={tw`mt-3`}><Button size="sm" onPress={() => nav('/profile/wants')}>{t('설정하기')}</Button></View>
          </View>
        ) : (
          <View style={tw`mt-3`}>
            <Text style={tw`text-[11px] font-bold text-ink-3 uppercase mb-1.5`}>{t('찾는 사람')}</Text>
            <View style={tw`flex-row flex-wrap`}>{wantPeople.map((p) => <Pill key={p} tone="soft">{PEOPLE_WANT_EMOJI[p]} {PEOPLE_WANT_LABELS[p]}</Pill>)}</View>
            <Text style={tw`mt-2 text-[11px] font-bold text-ink-3 uppercase mb-1.5`}>{t('하고 싶은 활동')}</Text>
            <View style={tw`flex-row flex-wrap`}>{wantActs.map((a) => <Pill key={a}>{ACTIVITY_WANT_EMOJI[a]} {ACTIVITY_WANT_LABELS[a]}</Pill>)}</View>
          </View>
        )}
      </Card>

      {/* ── 대학원생 시간표 (있을 때만 — 학부생은 이번 학기 카드에) ── */}
      {kind === 'grad' && me.timetable.length > 0 && <TimetableCard me={me} />}

      {/* ── 카운트: 그룹 · 연결 · 모임 · 글 ── */}
      <View style={tw`mt-4 rounded-[24px] border border-line bg-white px-2 py-3 flex-row`}>
        {[
          { n: myOrgs, l: t('그룹'), to: '/community?tab=clubs&mine=1' },
          { n: friends, l: t('연결'), to: '/profile/friends' },
          { n: meets, l: t('모임'), to: '/plans' },
          { n: myPosts.length, l: t('글'), to: '/feed?tab=following' },
        ].map((s) => <Pressable key={s.l} onPress={() => nav(s.to)} style={tw`flex-1 items-center py-1`}><Text style={tw`text-[22px] font-bold text-primary`}>{s.n}</Text><Text style={tw`text-[12px] text-ink-3`}>{s.l}</Text></Pressable>)}
      </View>

      {/* ── 현재 상태가 바뀌었나요? (학생) / 상태: 졸업생 · 변경 (졸업생) ── */}
      {student ? (
        <Pressable onPress={() => nav('/profile/status')} style={[tw`mt-4 rounded-[24px] border p-4 flex-row items-center`, { borderColor: suggest ? C.goldLine : C.line, backgroundColor: suggest ? C.goldSoft : C.onPrimary }]}>
          <View style={tw`h-11 w-11 rounded-full items-center justify-center ${suggest ? 'bg-white' : 'bg-primary-soft'}`}><GraduationCap size={20} color={suggest ? C.goldInk : C.primary} /></View>
          <View style={tw`flex-1 min-w-0 mx-3`}>
            <Text style={tw`text-[15px] font-bold text-primary`}>{t('현재 상태가 바뀌었나요?')}</Text>
            <Text style={tw`text-[12px] text-ink-2`}>{suggest ? t('졸업 예정연도가 지났어요. 졸업생으로 바꾸면 홈과 추천이 달라져요.') : t('졸업·대학원 진학 — 연결과 기록은 그대로 유지돼요')}</Text>
          </View>
          <ChevronRight size={18} color={C.ink3} />
        </Pressable>
      ) : (
        <Pressable onPress={() => nav('/profile/status')} style={tw`mt-4 flex-row items-center justify-center`}>
          <GraduationCap size={13} color={C.ink3} /><Text style={tw`ml-1.5 text-[12px] text-ink-3`}>{t('상태')}: {stageLabel(stageOf(me), lang)}{gradYearOf(me) ? ` · ${gradYearOf(me)}` : ''} <Text style={tw`font-bold text-verify`}>· {t('변경')}</Text></Text>
        </Pressable>
      )}

      {/* ── 다가오는 만남 ── */}
      <Card>
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <View style={tw`flex-row items-center`}><CalendarCheck size={17} color={C.primary} /><Text style={tw`ml-2 text-[18px] font-bold text-primary`}>{t('다가오는 만남')}</Text></View>
          <Pressable onPress={() => nav('/plans')}><Text style={tw`text-[13px] font-semibold text-verify`}>{t('전체')} ({upcoming.length + openPolls})</Text></Pressable>
        </View>
        {upcoming.length === 0 && openPolls === 0 ? (
          <View style={tw`items-center py-3`}>
            <Text style={tw`text-[13px] text-ink-3`}>{t('확정된 약속이 없어요.')}</Text>
            <View style={tw`mt-3`}><Button size="sm" variant="secondary" onPress={() => nav('/meet')}>{t('모임 둘러보기')}</Button></View>
          </View>
        ) : (
          <View>
            {upcoming.slice(0, 3).map((a, i) => { const pending = participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'pending'); return (
              <Pressable key={a.id} onPress={() => nav(`/activities/${a.id}`)} style={tw`flex-row items-center py-3 ${i === 0 ? '' : 'border-t border-line'}`}>
                <IconCircle><CalendarCheck size={17} color={C.primary} /></IconCircle>
                <View style={tw`flex-1 min-w-0 mx-3`}><Text numberOfLines={1} style={tw`text-[14px] font-semibold text-primary`}>{a.title}</Text><Text style={tw`text-[12px] text-ink-3`}>{formatDateTime(a.date, a.startTime)}</Text></View>
                <Tag tone={pending ? 'neutral' : 'primary'}>{pending ? t('대기') : lang === 'en' ? 'Confirmed' : '확정'}</Tag>
              </Pressable>
            ); })}
            {upcoming.length === 0 && openPolls > 0 ? <Text style={tw`py-3 text-[13px] text-ink-3`}>{t('시간 정하는 중')} {openPolls}</Text> : null}
          </View>
        )}
      </Card>

      {/* ── 더 알려주기 ── */}
      <Text style={tw`mt-5 px-1 text-[18px] font-bold text-primary`}>{t('더 알려주기')}</Text>
      <View style={tw`mt-2 rounded-[24px] border border-line bg-white`}>
        {[
          { Icon: MessageSquareText, label: t('프로필 질문'), sub: `${t('프로필 완성')} ${completion.percent}%`, to: '/profile/prompts' },
          { Icon: BookmarkCheck, label: `${t('저장한 사람')} ${savedPeople}`, sub: t('나만 볼 수 있어요'), to: '/profile/saved' },
          { Icon: ShieldCheck, label: t('공개 범위'), sub: AUDIENCE_LABELS[privacyOf(me).scope], to: '/settings/privacy' },
          { Icon: Target, label: t('목표와 역할'), sub: t('이번 학기 목표 · 생활권 · 찾는 역할'), to: '/profile/context' },
          { Icon: Building2, label: t('내 그룹'), sub: `${myOrgs}${t('개')}`, to: '/community?tab=clubs&mine=1' },
          { Icon: Users, label: t('내 연결'), sub: `${friends}${t('명')}`, to: '/profile/friends' },
          { Icon: Bookmark, label: t('저장·지원 내역'), sub: `${saved}${t('개')}`, to: '/community?tab=opportunities&sub=saved' },
          { Icon: Bell, label: t('알림'), sub: unread ? `${unread}${t('개')}` : t('모두 확인했어요'), to: '/notifications' },
          { Icon: Settings, label: t('설정'), sub: t('데모 도구'), to: '/settings' },
        ].slice(0, moreLinks ? undefined : 4).map((r, i) => (
          <Pressable key={r.to + r.label} onPress={() => nav(r.to)} style={tw`flex-row items-center px-4 py-3 ${i === 0 ? '' : 'border-t border-line'}`}>
            <IconCircle><r.Icon size={18} color={C.primary} /></IconCircle>
            <View style={tw`flex-1 min-w-0 mx-3`}><Text style={tw`text-[14px] font-semibold text-primary`}>{r.label}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{r.sub}</Text></View>
            <ChevronRight size={18} color={C.ink3} />
          </Pressable>
        ))}
        <Pressable onPress={() => setMoreLinks((x) => !x)} style={tw`h-11 flex-row items-center justify-center border-t border-line`}>
          <Text style={tw`text-[13px] font-semibold text-primary`}>{moreLinks ? t('접기') : t('더 보기')}</Text>
          <ChevronDown size={14} color={C.primary} style={moreLinks ? { transform: [{ rotate: '180deg' }] } : undefined} />
        </Pressable>
      </View>

      {/* ── 내 글 ── */}
      <View style={tw`mt-5 px-1 flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}><FileText size={17} color={C.primary} /><Text style={tw`ml-2 text-[18px] font-bold text-primary`}>{t('내 글')}</Text></View>
        <Pressable onPress={() => nav('/feed?tab=following')}><Text style={tw`text-[13px] font-semibold text-verify`}>{t('전체 보기')}</Text></Pressable>
      </View>
      {myPosts.length === 0 ? (
        <View style={tw`mt-3 rounded-[24px] border border-line bg-white p-5 items-center`}>
          <Text style={tw`text-[13px] text-ink-3`}>{t('아직 글이 없어요')}</Text>
          <View style={tw`mt-3`}><Button size="sm" variant="secondary" onPress={() => nav('/create/post')}>{t('첫 글 쓰기')}</Button></View>
        </View>
      ) : <View style={tw`mt-3`}>{myPosts.slice(0, 3).map((p) => <View key={p.id} style={tw`mb-3`}><PostCard post={p} /></View>)}</View>}
    </TabScreen>
  );
}

/** 거주·활동 도시 한 줄 (도시 단위만) */
function CityLine({ me }: { me: User }) {
  const home = cityOf(me);
  if (!home && !me.activityCity) return null;
  return (
    <View style={tw`mt-3 flex-row items-center`}>
      <MapPin size={13} color={C.ink3} />
      <Text numberOfLines={1} style={tw`ml-1 text-[12px] text-ink-3 shrink`}>{[home, me.activityCity && me.activityCity !== home ? `${t('활동')} ${me.activityCity}` : ''].filter(Boolean).join(' · ')}</Text>
    </View>
  );
}

/** 학부생 — 이번 학기: 학년·전공 · 시간표 미니 · 동아리 */
function SemesterCard({ me }: { me: User }) {
  const orgs = useAppStore((s) => s.organizations);
  const clubs = orgs.filter((o) => (o.memberIds.includes(me.id) || o.adminIds.includes(me.id)) && o.type !== 'department');
  const now = statusNow(me.timetable);
  const nextFree = freeBlocks(me.timetable, todayIdx()).find((b) => b.end > nowMin());
  return (
    <Card>
      <SectionTitle icon={<CalendarDays size={17} color={C.primary} />} right={<EditLink to="/profile/edit" />}>{stageCopy('undergrad').nowTitle}</SectionTitle>
      <View style={tw`mt-3 flex-row flex-wrap -m-1`}>
        <Tile icon={<GraduationCap size={13} color={C.ink3} />} l={t('학년')} v={classYearLabel(me, lang) || '—'} />
        <Tile icon={<FileText size={13} color={C.ink3} />} l={t('전공')} v={majorOf(me) || '—'} />
      </View>
      {me.timetable.length === 0 ? (
        <View style={tw`mt-3`}><Button variant="secondary" icon={<Plus size={15} color={C.primary} />} onPress={() => nav('/timetable')}>{t('시간표 만들기')}</Button></View>
      ) : (
        <>
          <View style={tw`mt-3 flex-row items-center justify-between`}>
            <Text style={tw`text-[12px] font-bold text-ink-3`}>{t('이번 주 시간표')}</Text>
            <View style={tw`h-6 px-2.5 rounded-full flex-row items-center ${now.kind === 'free' ? 'bg-mint-soft' : 'bg-surface-2'}`}><View style={tw`h-1.5 w-1.5 rounded-full mr-1 ${now.kind === 'free' ? 'bg-mint' : 'bg-ink-3'}`} /><Text style={tw`text-[11px] font-bold ${now.kind === 'free' ? 'text-mint' : 'text-ink-2'}`}>{now.kind === 'free' ? (now.until ? `${t('공강')} · ${toHHMM(now.until)}` : t('오늘 수업 없음')) : now.kind === 'in_class' ? t('수업 중') : t('오늘 수업 끝')}</Text></View>
          </View>
          <Pressable onPress={() => nav('/timetable')} style={tw`mt-2`}><WeekGrid courses={me.timetable} px={18} /></Pressable>
          {nextFree ? <View style={tw`mt-2 flex-row items-center`}><Text style={tw`text-verify mr-2`}>★</Text><Text numberOfLines={1} style={tw`flex-1 text-[13px] text-ink-2`}>{lang === 'en' ? `Next free window ${fmtBlock({ start: Math.max(nextFree.start, nowMin()), end: nextFree.end })}` : `다음 공강 ${fmtBlock({ start: Math.max(nextFree.start, nowMin()), end: nextFree.end })}`}</Text><Button size="sm" onPress={() => nav('/timetable?open=1')}>{t('열기')}</Button></View> : null}
        </>
      )}
      <Text style={tw`mt-3 text-[12px] font-bold text-ink-3 mb-1.5`}>{t('동아리')}</Text>
      {clubs.length === 0
        ? <Pressable onPress={() => nav('/meet?tab=groups')} style={tw`flex-row items-center`}><Text style={tw`text-[13px] text-ink-3`}>{t('아직 가입한 그룹이 없어요')}</Text><Text style={tw`ml-2 text-[13px] font-semibold text-verify`}>{t('그룹 찾기')}</Text></Pressable>
        : <View style={tw`flex-row flex-wrap`}>{clubs.slice(0, 5).map((o) => <Pressable key={o.id} onPress={() => nav(`/orgs/${o.id}`)}><Pill tone="neutral">{o.logo.emoji} {o.name}</Pill></Pressable>)}</View>}
      <CityLine me={me} />
    </Card>
  );
}

/** 대학원생 — 연구: 분야 · 연구실 · n년차 · (지도교수는 showAdvisor 일 때만) · 키워드 */
function ResearchCard({ me }: { me: User }) {
  const r = me.research;
  return (
    <Card>
      <SectionTitle icon={<FlaskConical size={17} color={C.primary} />} right={<EditLink to="/profile/edit" />}>{stageCopy('grad').nowTitle}</SectionTitle>
      {!r?.field ? (
        <View style={tw`mt-3 rounded-2xl bg-surface-2 px-4 py-4 items-center`}>
          <Text style={tw`text-[14px] font-semibold text-ink`}>{t('연구 분야를 알려주세요')}</Text>
          <Text style={tw`mt-0.5 text-[12px] text-ink-3 text-center`}>{t('다른 학교 연구실까지, 분야가 겹치는 사람을 먼저 보여드려요.')}</Text>
          <View style={tw`mt-3`}><Button size="sm" onPress={() => nav('/profile/edit')}>{t('연구 분야 추가')}</Button></View>
        </View>
      ) : (
        <>
          <Text style={tw`mt-3 text-[15px] font-semibold text-ink`}>🔬 {researchLine(me, lang, true)}</Text>
          <View style={tw`mt-2 flex-row flex-wrap -m-1`}>
            <Tile icon={<FlaskConical size={13} color={C.ink3} />} l={t('연구 분야')} v={r.field} />
            {r.lab ? <Tile icon={<Building2 size={13} color={C.ink3} />} l={t('연구실')} v={r.lab} /> : null}
          </View>
          {r.keywords?.length ? <View style={tw`mt-2 flex-row flex-wrap`}>{r.keywords.map((k) => <Pill key={k} tone="soft">#{k}</Pill>)}</View> : null}
          {r.advisor && !r.showAdvisor ? <Text style={tw`mt-1 text-[11px] text-ink-3`}>{t('지도교수는 켤 때만 보여요.')}</Text> : null}
        </>
      )}
      <CityLine me={me} />
    </Card>
  );
}

/** 졸업생 — 현재: 거주 도시 · 활동 지역 · 회사 · 업종 · 직무 */
function NowCard({ me }: { me: User }) {
  type NowRow = { icon: ReactNode; l: string; v?: string };
  const all: NowRow[] = [
    { icon: <MapPin size={13} color={C.ink3} />, l: t('거주 도시'), v: cityOf(me) },
    { icon: <MapPin size={13} color={C.ink3} />, l: t('활동 지역'), v: me.activityCity },
    { icon: <Briefcase size={13} color={C.ink3} />, l: t('회사'), v: me.career?.company },
    { icon: <Briefcase size={13} color={C.ink3} />, l: t('업종'), v: me.career?.industry },
    { icon: <Briefcase size={13} color={C.ink3} />, l: t('직무'), v: me.career?.role },
  ];
  const rows = all.filter((r) => !!r.v);
  return (
    <Card>
      <SectionTitle icon={<MapPin size={17} color={C.primary} />} right={<EditLink to="/profile/edit" />}>{stageCopy('alumni').nowTitle}</SectionTitle>
      {rows.length === 0
        ? <Text style={tw`mt-2 text-[13px] text-ink-3`}>{t('거주 도시와 하는 일을 알려주면 같은 도시·분야의 동문과 더 잘 연결돼요.')}</Text>
        : <View style={tw`mt-3 flex-row flex-wrap -m-1`}>{rows.map((r) => <Tile key={r.l} icon={r.icon} l={r.l} v={r.v ?? ''} />)}</View>}
      <Text style={tw`mt-2 text-[11px] text-ink-3`}>{t('도시 단위만 표시돼요. 정확한 주소는 받지 않아요.')}</Text>
    </Card>
  );
}

/** 대학원생 시간표 (있을 때만) */
function TimetableCard({ me }: { me: User }) {
  return (
    <Card>
      <SectionTitle icon={<CalendarDays size={17} color={C.primary} />}>{t('이번 주 시간표')}</SectionTitle>
      <Pressable onPress={() => nav('/timetable')} style={tw`mt-3`}><WeekGrid courses={me.timetable} px={18} /></Pressable>
    </Card>
  );
}
