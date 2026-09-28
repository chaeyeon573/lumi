import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CalendarCheck, Clock, Mail, Heart, BookOpen, Puzzle, Vote } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { RSVP_LABELS, RSVP_EMOJI, CATEGORY_EMOJI, OPP_TYPE_EMOJI } from '@core/lib/labels';
import { formatDateTime, todayISO, formatDate } from '@core/lib/format';
import { isTeamActivity } from '@core/lib/discover';
import { dday } from '@core/lib/recommend';
import type { Activity } from '@core/types';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Button, Tag, Loading, C } from '@/ui';
import { ErrorState } from '@/components/b_States';
import { NoteBubble } from '@/v2/PromptParts';
import { isAlumniStage } from '@core/lib/network';

const card = tw`card`;

/** Me › My Plans — 받은 초대 / 대기 / 확정 / 관심 행사 / 팀 신청 / Study Crew (웹 PlansPage) */
export default function PlansScreen() {
  const v = useViewer();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const run = useAppStore((s) => s.run);
  const participations = useAppStore((s) => s.participations);
  const proposals = useAppStore((s) => s.proposals);
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const polls = useAppStore((s) => s.timePolls);
  const me = v.me;
  /** 졸업생에게는 시간표·Study Crew·팀원 모집·같이 계획하기를 보여주지 않는다 (기존 데이터가 있으면 그 목록만) */
  const alumni = isAlumniStage(me);
  const today = todayISO();
  const openPolls = polls.filter((p) => p.status === 'open' && (p.hostId === me.id || p.inviteeIds.includes(me.id)));
  if (status === 'loading') return <Screen title="My Plans"><Loading /></Screen>;
  if (status === 'error') return <Screen title="My Plans"><ErrorState message={error ?? undefined} onRetry={init} /></Screen>;

  const upcoming = v.visibleActivities.filter((a) => a.date >= today).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const myPending = participations.filter((p) => p.userId === me.id && p.status === 'pending');
  const pendingActs = upcoming.filter((a) => myPending.some((p) => p.activityId === a.id));
  const confirmed = upcoming.filter((a) => a.hostId === me.id || participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'approved'));
  const invites = upcoming.filter((a) => a.joinPolicy === 'invite' && (a.invitedIds ?? []).includes(me.id) && !participations.some((p) => p.activityId === a.id && p.userId === me.id));
  const proposalsIn = proposals.filter((p) => p.toId === me.id && p.status === 'pending');
  const friendReqs = v.snap.relationships.friendRequests.filter((r) => r.toId === me.id && r.status === 'pending');
  const myIntents = intents.filter((i) => i.userId === me.id).map((i) => ({ i, o: opps.find((o) => o.id === i.opportunityId)! })).filter((x) => x.o);
  const events = myIntents.filter((x) => x.o.date && x.o.date >= today && ['interested', 'going', 'solo', 'company'].includes(x.i.intent));
  const teamPending = pendingActs.filter(isTeamActivity);
  const crews = confirmed.filter((a) => a.courseName);
  const plain = confirmed.filter((a) => !a.courseName);

  const Row = ({ a, right, first }: { a: Activity; right?: ReactNode; first?: boolean }) => (
    <Pressable onPress={() => nav(`/activities/${a.id}`)} style={tw`flex-row items-center px-3.5 py-3 ${first ? '' : 'border-t border-line'}`}>
      <View style={tw`h-10 w-10 rounded-xl bg-surface-2 items-center justify-center`}><Text style={tw`text-[18px]`}>{a.courseName ? '📚' : CATEGORY_EMOJI[a.category]}</Text></View>
      <View style={tw`flex-1 min-w-0 ml-3`}><Text numberOfLines={1} style={tw`text-[13px] font-bold text-ink`}>{a.title}</Text><Text style={tw`text-[12px] text-ink-3`}>{formatDateTime(a.date, a.startTime)} · {a.place.name}</Text></View>
      {right ?? (a.hostId === me.id ? <Tag>{t('주최')}</Tag> : null)}
    </Pressable>
  );
  const Section = ({ icon, title, count, children, empty }: { icon: ReactNode; title: string; count: number; children: ReactNode; empty: string }) => (
    <View style={tw`mb-5`}>
      <View style={tw`flex-row items-center mb-2`}>{icon}<Text style={tw`ml-1.5 text-[15px] font-bold text-ink`}>{title}</Text><Text style={tw`ml-1.5 text-[12px] text-ink-3 font-semibold`}>{count}</Text></View>
      {count === 0 ? <View style={[card, tw`px-4 py-3`]}><Text style={tw`text-[12px] text-ink-3`}>{empty}</Text></View> : <View style={card}>{children}</View>}
    </View>
  );

  return (
    <Screen title="My Plans">
      <View style={tw`pt-2`}>
        {!(alumni && openPolls.length === 0) && <View style={tw`mb-5`}>
          <View style={tw`flex-row items-end justify-between mb-2`}>
            <View style={tw`flex-row items-center`}><Vote size={15} color={C.primary} /><Text style={tw`ml-1.5 text-[15px] font-bold text-ink`}>{t('시간 정하는 중')}</Text><Text style={tw`ml-1.5 text-[12px] text-ink-3 font-semibold`}>{openPolls.length}</Text></View>
            {alumni ? null : <Pressable onPress={() => nav('/together/new')}><Text style={tw`text-[12px] font-semibold text-primary`}>+ Plan Together</Text></Pressable>}
          </View>
          {openPolls.length === 0 ? <View style={[card, tw`px-4 py-3`]}><Text style={tw`text-[12px] text-ink-3`}>{t('진행 중인 시간 투표가 없어요. 친구들과 만날 시간을 투표로 정해보세요.')}</Text></View> : (
            <View style={card}>{openPolls.map((p, idx) => { const h = v.userById(p.hostId); const voted = !!p.votes[me.id]; const n = Object.keys(p.votes).length; return (
              <Pressable key={p.id} onPress={() => nav(`/together/${p.id}`)} style={tw`flex-row items-center px-3.5 py-3 ${idx === 0 ? '' : 'border-t border-line'}`}>
                <View style={tw`h-10 w-10 rounded-xl bg-accent items-center justify-center`}><Vote size={18} color={C.primary} /></View>
                <View style={tw`flex-1 min-w-0 ml-3`}><Text numberOfLines={1} style={tw`text-[13px] font-bold text-ink`}>{p.title}</Text><Text style={tw`text-[12px] text-ink-3`}>{p.hostId === me.id ? t('내가 주최') : h?.nickname} · {lang === 'en' ? `${n}/${p.inviteeIds.length + 1} voted · ${p.options.length} options` : `${n}/${p.inviteeIds.length + 1}명 투표 · 후보 ${p.options.length}개`}</Text></View>
                {p.hostId === me.id ? <Tag tone="primary">{t('확정하기')}</Tag> : voted ? <Tag tone="mint">{t('투표 완료')}</Tag> : <Tag tone="primary">{t('투표하기')}</Tag>}
              </Pressable>); })}</View>
          )}
        </View>}

        <Section icon={<Mail size={15} color={C.accent} />} title={t('받은 초대')} count={invites.length + proposalsIn.length + friendReqs.length} empty={t('받은 초대가 없어요.')}>
          {friendReqs.map((r, idx) => { const u = v.userById(r.fromId); return u ? (
            <View key={r.id} style={tw`px-3.5 py-3 ${idx === 0 ? '' : 'border-t border-line'}`}>
              <View style={tw`flex-row items-center`}>
                <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} />
                <Text style={tw`flex-1 ml-3 text-[13px] text-ink`}><Text style={tw`font-bold`}>{u.nickname}</Text>{t('님의 친구 요청')}</Text>
                <Button size="sm" variant="outline" onPress={() => run(() => api.relationships.respondFriendRequest(r.id, false))}>{t('거절')}</Button>
                <View style={tw`w-2`} />
                <Button size="sm" onPress={() => run(() => api.relationships.respondFriendRequest(r.id, true), t('친구가 되었어요!'))}>{t('수락')}</Button>
              </View>
              <NoteBubble note={r.note} />
            </View>) : null; })}
          {proposalsIn.map((p, idx) => { const u = v.userById(p.fromId); return u ? (
            <View key={p.id} style={tw`flex-row items-center px-3.5 py-3 ${idx === 0 && friendReqs.length === 0 ? '' : 'border-t border-line'}`}>
              <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} />
              <View style={tw`flex-1 min-w-0 ml-3`}><Text style={tw`text-[13px] text-ink`}><Text style={tw`font-bold`}>{u.nickname}</Text> · {CATEGORY_EMOJI[p.category]} {p.when}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{p.message}</Text></View>
              <Button size="sm" variant="outline" onPress={() => run(() => api.proposals.respond(p.id, false))}>{t('이번에는 어려워요')}</Button>
              <View style={tw`w-2`} />
              <Button size="sm" onPress={() => run(() => api.proposals.respond(p.id, true), t('제안을 수락했어요.'))}>{t('수락')}</Button>
            </View>) : null; })}
          {invites.map((a, idx) => <Row key={a.id} a={a} first={idx === 0 && friendReqs.length === 0 && proposalsIn.length === 0} right={<Tag tone="primary">{t('초대')}</Tag>} />)}
        </Section>
        <Section icon={<Clock size={15} color={C.gold} />} title={t('참가 신청 대기')} count={pendingActs.filter((a) => !isTeamActivity(a)).length} empty={t('승인을 기다리는 신청이 없어요.')}>
          {pendingActs.filter((a) => !isTeamActivity(a)).map((a, idx) => <Row key={a.id} a={a} first={idx === 0} right={<Tag tone="gold">{t('대기')}</Tag>} />)}
        </Section>
        <Section icon={<CalendarCheck size={15} color={C.mint} />} title={t('확정된 약속')} count={plain.length} empty={t('확정된 약속이 없어요. 모임 탭에서 참여할 수 있는 모임을 찾아보세요.')}>
          {plain.map((a, idx) => <Row key={a.id} a={a} first={idx === 0} />)}
        </Section>
        <Section icon={<Heart size={15} color={C.primary} />} title={t('관심 표시한 행사')} count={events.length} empty={t('관심 표시한 행사가 없어요.')}>
          {events.map(({ i, o }, idx) => (
            <Pressable key={i.id} onPress={() => nav(`/opportunities/${o.id}`)} style={tw`flex-row items-center px-3.5 py-3 ${idx === 0 ? '' : 'border-t border-line'}`}>
              <View style={tw`h-10 w-10 rounded-xl bg-surface-2 items-center justify-center`}><Text style={tw`text-[18px]`}>{OPP_TYPE_EMOJI[o.type]}</Text></View>
              <View style={tw`flex-1 min-w-0 ml-3`}><Text numberOfLines={1} style={tw`text-[13px] font-bold text-ink`}>{o.title}</Text><Text style={tw`text-[12px] text-ink-3`}>{o.date ? formatDate(o.date) : ''}{o.deadline ? ` · ${dday(o.deadline)}` : ''}</Text></View>
              <Tag>{RSVP_EMOJI[i.intent]} {RSVP_LABELS[i.intent]}</Tag>
            </Pressable>
          ))}
        </Section>
        {!(alumni && teamPending.length === 0) && <Section icon={<Puzzle size={15} color={C.primary} />} title={t('대기 중인 팀 신청')} count={teamPending.length} empty={t('신청한 팀이 없어요. 발견 › 팀에서 역할이 맞는 팀을 찾아보세요.')}>
          {teamPending.map((a, idx) => <Row key={a.id} a={a} first={idx === 0} right={<Tag tone="gold">{t('대기')}</Tag>} />)}
        </Section>}
        {!(alumni && crews.length === 0) && <Section icon={<BookOpen size={15} color={C.primary} />} title={t('스터디 일정')} count={crews.length} empty={t('참여 중인 스터디가 없어요. 시간표에서 수업을 누르면 만들 수 있어요.')}>
          {crews.map((a, idx) => <Row key={a.id} a={a} first={idx === 0} right={<Tag tone="primary">{a.courseName}</Tag>} />)}
        </Section>}
        {alumni
          ? <View style={tw`flex-row`}><Button full onPress={() => nav('/meet')}>{t('모임 둘러보기')}</Button></View>
          : <View style={tw`flex-row`}><Button full variant="outline" onPress={() => nav('/timetable')}>{t('내 시간표')}</Button><View style={tw`w-2`} /><Button full onPress={() => nav('/discover')}>{t('활동 찾기')}</Button></View>}
      </View>
    </Screen>
  );
}
