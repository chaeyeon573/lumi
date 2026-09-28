import { Pressable, Text, View } from 'react-native';
import { Heart, UserPlus, Clock, MapPin, BadgeCheck, CheckCircle2, Users, ShieldCheck } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { Activity, Organization, User } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { INTEREST_EMOJI, INTEREST_LABELS, PURPOSE_LABELS, ROLE_LABELS, ORG_TYPE_LABELS, CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORY_LABELS } from '@core/lib/labels';
import { commonInterests } from '@core/lib/relations';
import { availabilityText } from '@core/lib/timetable';
import { isAlumniStage } from '@core/lib/network';
import { matchReasons } from '@core/lib/recommend';
import { formatDateTime } from '@core/lib/format';
import { questionById } from '@core/data/prompts';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Cover, Button, Tag, C } from '@/ui';

export function affiliationText(u: User, showSchoolOverride?: boolean) {
  if (u.affiliation.type !== 'university') return u.affiliation.companyName;
  const a = u.affiliation;
  const parts: string[] = [];
  if (showSchoolOverride ?? a.showSchool) parts.push(a.schoolName);
  if (a.showDepartment) parts.push(a.department);
  parts.push(ROLE_LABELS[a.role]);
  return parts.join(' · ');
}

/** 추천 사람 카드 — 사진뿐 아니라 관심사·소속·가능 시간·하고 싶은 활동을 함께 보여준다 (웹 PersonCard) */
export function PersonCard({ user }: { user: User }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const liked = v.iLike(user.id);
  const following = v.isFollowing(user.id);
  const common = commonInterests(v.me, user);
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const reasons = matchReasons(v.me, user, { opportunities: opps, opportunityIntents: intents }, v.canSeeField(user, 'timetable')).filter((r) => r.kind !== 'school');
  // 졸업생이 보거나 졸업생을 볼 때는 공강(시간표)을 쓰지 않는다
  const avail = availabilityText(user, !isAlumniStage(v.me) && !isAlumniStage(user) && v.canSeeField(user, 'timetable'));
  const showAvail = avail.auto || (v.canSeeField(user, 'availability') && user.availability !== 'hidden');
  const prompt = v.canSeeField(user, 'prompts') && user.prompts[0]?.answer ? user.prompts[0] : null;

  const like = async () => {
    const res = await run(() => api.relationships.toggleLike(v.me.id, user.id));
    if (res.mutual) useAppStore.getState().showToast(`${user.nickname}${t('님과 서로 관심이 있어요. 이제 메시지를 보낼 수 있어요.')}`, 'success');
  };
  const follow = () => run(() => api.relationships.toggleFollow(v.me.id, user.id, 'user'), following ? undefined : `${user.nickname}${t('님을 팔로우해요')}`);

  return (
    <View style={tw`card overflow-hidden mb-3`}>
      <Pressable onPress={() => nav(`/users/${user.id}`)}><Cover emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={220} radius={0} style={{ width: '100%', height: 220 }} /></Pressable>
      <View style={tw`p-3.5`}>
        <View style={tw`flex-row items-center`}>
          <Pressable onPress={() => nav(`/users/${user.id}`)}><Text style={tw`text-[16px] font-bold text-ink`}>{user.nickname}</Text></Pressable>
          {user.affiliation.type === 'university' && user.affiliation.emailVerified && <BadgeCheck size={14} color={C.verify} style={tw`ml-1.5`} />}
          {user.identityVerified && <ShieldCheck size={14} color={C.mint} style={tw`ml-1`} />}
        </View>
        <Text numberOfLines={1} style={tw`text-[12px] text-ink-3 mt-0.5`}>{affiliationText(user)}</Text>
        {v.canSeeField(user, 'likes') && user.likes ? <Text numberOfLines={2} style={tw`text-[13px] text-ink-2 mt-2`}>{user.likes}{t('를 좋아해요.')}</Text> : null}
        <View style={tw`flex-row flex-wrap mt-2`}>
          {(common.length ? common : user.interests.slice(0, 3)).slice(0, 3).map((i) => <View key={i} style={tw`mr-1 mb-1`}><Tag tone={common.includes(i) ? 'primary' : 'neutral'}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Tag></View>)}
          {common.length > 0 && <View style={tw`mr-1 mb-1`}><Tag tone="mint">✨ {t('공통')} {common.length}</Tag></View>}
        </View>
        <View style={tw`mt-1`}>
          {showAvail && <View style={tw`flex-row items-center mb-0.5`}><Clock size={12} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-2`}>{avail.text}</Text>{avail.auto && <Text style={tw`ml-1 text-[10px] font-semibold text-mint`}>{t('시간표')}</Text>}</View>}
          <View style={tw`flex-row items-center`}><MapPin size={12} color={C.ink3} /><Text numberOfLines={1} style={tw`ml-1 flex-1 text-[12px] text-ink-2`}>{user.region} {t('근처 ·')} {user.purposes.slice(0, 2).map((p) => PURPOSE_LABELS[p]).join(', ')}</Text></View>
        </View>
        {reasons.length > 0 && <View style={tw`mt-1.5`}>{reasons.slice(0, 2).map((r) => <View key={r.text} style={tw`flex-row items-start mb-0.5`}><CheckCircle2 size={12} color={C.primary} style={tw`mt-0.5`} /><Text numberOfLines={1} style={tw`ml-1 flex-1 text-[12px] text-ink-2`}>{r.text}</Text></View>)}</View>}
        {prompt ? <View style={tw`mt-2 rounded-xl bg-surface-2 px-3 py-2`}><Text style={tw`text-[11px] font-bold text-primary`}>{questionById(prompt.questionId)?.text}</Text><Text numberOfLines={2} style={tw`text-[13px] font-semibold text-ink mt-0.5`}>{prompt.answer}</Text></View>
          : user.nowWant ? <View style={tw`mt-2 rounded-xl bg-primary-soft px-3 py-2`}><Text style={tw`text-[13px] font-semibold text-primary`}>“{user.nowWant}”</Text></View> : null}
        <View style={tw`flex-row items-center mt-3`}>
          <Pressable onPress={like} style={[tw`h-10 w-10 rounded-xl items-center justify-center mr-1.5`, { backgroundColor: liked ? C.primary : C.tint }]}><Heart size={18} color={liked ? C.onPrimary : C.primary} fill={liked ? C.onPrimary : 'none'} /></Pressable>
          <Button size="sm" full style={tw`h-10`} onPress={() => nav(`/users/${user.id}?propose=1`)}>{t('같이하기')}</Button>
          <View style={tw`w-1.5`} />
          <Button size="sm" style={tw`h-10`} variant={following ? 'secondary' : 'outline'} onPress={follow} icon={<UserPlus size={15} color={following ? C.primary : C.ink2} />}>{following ? t('팔로잉') : t('팔로우')}</Button>
        </View>
      </View>
    </View>
  );
}

/** 활동 행 카드 (웹 ActivityCard variant="row") */
export function ActivityRowCard({ activity: a, badge }: { activity: Activity; badge?: string }) {
  const v = useViewer();
  const host = v.userById(a.hostId);
  const org = a.orgId ? v.orgById(a.orgId) : undefined;
  const name = a.official ? t('학교 공식') : org?.name ?? host?.nickname ?? t('알 수 없음');
  const count = v.approvedCount(a.id);
  const color = CATEGORY_COLORS[a.category];
  return (
    <Pressable onPress={() => nav(`/activities/${a.id}`)} style={tw`card flex-row p-3 mb-3`}>
      <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} size={76} radius={12} />
      <View style={tw`flex-1 min-w-0 ml-3`}>
        <View style={tw`flex-row items-center`}><Text style={[tw`text-[11px] font-bold`, { color }]}>{CATEGORY_EMOJI[a.category]} {CATEGORY_LABELS[a.category]}</Text>{badge ? <View style={tw`ml-1.5`}><Tag tone="primary">{badge}</Tag></View> : null}</View>
        <Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink mt-0.5`}>{a.title}</Text>
        <View style={tw`flex-row items-center mt-0.5`}><Clock size={11} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-3`}>{formatDateTime(a.date, a.startTime)}</Text></View>
        <View style={tw`flex-row items-center`}><MapPin size={11} color={C.ink3} /><Text numberOfLines={1} style={tw`ml-1 flex-1 text-[12px] text-ink-3`}>{a.place.name}</Text></View>
        <View style={tw`flex-row items-center mt-1`}><Users size={11} color={C.ink2} /><Text style={tw`ml-1 text-[12px] text-ink-2`}>{count}/{a.capacity >= 999 ? '∞' : a.capacity}</Text><Text numberOfLines={1} style={tw`ml-2 flex-1 text-[12px] text-ink-2`}>{name}</Text></View>
      </View>
    </Pressable>
  );
}

/** 조직 카드 (웹 OrgCard) */
export function OrgCard({ org }: { org: Organization }) {
  return (
    <Pressable onPress={() => nav(`/orgs/${org.id}`)} style={tw`card flex-row items-center p-3 mb-3`}>
      <Cover emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={48} radius={16} />
      <View style={tw`flex-1 min-w-0 ml-3`}>
        <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink shrink`}>{org.name}</Text>{org.verified && <BadgeCheck size={14} color={C.gold} style={tw`ml-1`} />}</View>
        <View style={tw`flex-row items-center`}><Text style={tw`text-[12px] text-ink-3`}>{ORG_TYPE_LABELS[org.type]}</Text><Users size={11} color={C.ink3} style={tw`ml-2`} /><Text style={tw`ml-0.5 text-[12px] text-ink-3`}>{org.followerIds.length}</Text></View>
        {org.recruitment?.open && <View style={tw`mt-1 self-start`}><Tag tone="primary">{org.recruitment.title}</Tag></View>}
      </View>
    </Pressable>
  );
}
