/**
 * 상세 화면 공용 조각 (웹 PersonCard.affiliationText / VisibilityTag / VerifiedBadge / Dialog / ActivityCard(row) / TeamCard / OpportunityCard(row))
 */
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Globe, School, Building2, Users, Heart, UserCheck, Lock, BadgeCheck, ShieldCheck, Clock, MapPin, BookOpen, Wifi } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { Activity, Opportunity, User, Visibility } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { ROLE_LABELS, VISIBILITY_LABELS, CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORY_LABELS, OPP_TYPE_COLORS, OPP_TYPE_EMOJI, OPP_TYPE_LABELS, PERSON_ROLE_LABELS, CREW_TYPE_LABELS, CREW_TYPE_EMOJI, MODE_LABELS } from '@core/lib/labels';
import { formatDateTime } from '@core/lib/format';
import { dday, daysUntil, isTogetherType } from '@core/lib/recommend';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Avatar, Cover, Tag, BottomSheet, C } from '@/ui';
import { JoinButton } from '@/components/JoinButton';

/** 웹 PersonCard.affiliationText 와 동일 */
export function affiliationText(u: User, showSchoolOverride?: boolean) {
  if (u.affiliation.type !== 'university') return u.affiliation.companyName;
  const a = u.affiliation;
  const parts: string[] = [];
  if (showSchoolOverride ?? a.showSchool) parts.push(a.schoolName);
  if (a.showDepartment) parts.push(a.department);
  parts.push(ROLE_LABELS[a.role]);
  return parts.join(' · ');
}

const VISIBILITY_ICONS = { public: Globe, school: School, department: Building2, friends: Users, followers: Heart, selected: UserCheck, private: Lock, group: Users } as const;
export function VisibilityTag({ value }: { value: Visibility }) {
  const Icon = VISIBILITY_ICONS[value];
  return <View style={tw`flex-row items-center`}><Icon size={12} color={C.ink3} /><Text style={tw`ml-1 text-[11px] font-semibold text-ink-3`}>{VISIBILITY_LABELS[value]}</Text></View>;
}

export function VerifiedBadge({ kind = 'school', size = 14, label }: { kind?: 'school' | 'identity' | 'org'; size?: number; label?: boolean }) {
  const map = {
    school: { Icon: BadgeCheck, color: C.verify, text: t('학교 인증') },
    identity: { Icon: ShieldCheck, color: C.mint, text: t('본인 인증') },
    org: { Icon: BadgeCheck, color: C.gold, text: t('공식 인증') },
  }[kind];
  return <View style={tw`flex-row items-center mr-2`}><map.Icon size={size} color={map.color} strokeWidth={2.4} />{label ? <Text style={{ fontSize: size - 2, fontWeight: '600', color: map.color, marginLeft: 2 }}>{map.text}</Text> : null}</View>;
}

/** 상세 정보 행: 아이콘 · 라벨 · 값 (웹 ActivityDetail/OpportunityDetail 의 Row) */
export function InfoRow({ icon, label, value, sub, action, last }: { icon: ReactNode; label: string; value: string; sub?: string; action?: ReactNode; last?: boolean }) {
  return (
    <View style={tw`flex-row items-start px-4 py-3 ${last ? '' : 'border-b border-line'}`}>
      <View style={tw`h-8 w-8 rounded-lg bg-surface-2 items-center justify-center`}>{icon}</View>
      <View style={tw`flex-1 min-w-0 ml-3`}>
        <Text style={tw`text-[11px] text-ink-3`}>{label}</Text>
        <Text style={tw`text-[14px] font-semibold text-ink`}>{value}</Text>
        {sub ? <Text style={tw`text-[12px] text-ink-3`}>{sub}</Text> : null}
      </View>
      {action ? <View style={tw`ml-2`}>{action}</View> : null}
    </View>
  );
}

/** 확인 대화상자 (웹 Dialog): 제목 + 설명 + 버튼들 */
export function Dialog({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {description ? <Text style={tw`text-[13px] text-ink-2 leading-5`}>{description}</Text> : null}
      <View style={tw`flex-row mt-4`}>{children}</View>
    </BottomSheet>
  );
}

/** 웹 ActivityCard variant="row" */
export function ActivityRow({ activity: a, badge }: { activity: Activity; badge?: string }) {
  const v = useViewer();
  const host = v.userById(a.hostId);
  const org = a.orgId ? v.orgById(a.orgId) : undefined;
  const count = v.approvedCount(a.id);
  const name = org?.name ?? host?.nickname ?? '';
  const color = CATEGORY_COLORS[a.category];
  return (
    <Pressable onPress={() => nav(`/activities/${a.id}`)} style={tw`card p-3 flex-row mb-2`}>
      <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} size={76} radius={12} />
      <View style={tw`flex-1 min-w-0 ml-3`}>
        <View style={tw`flex-row items-center`}><Text style={{ fontSize: 11, fontWeight: '700', color }}>{CATEGORY_EMOJI[a.category]} {CATEGORY_LABELS[a.category]}</Text>{badge ? <View style={tw`ml-1.5`}><Tag tone="primary">{badge}</Tag></View> : null}</View>
        <Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink mt-0.5`}>{a.title}</Text>
        <View style={tw`flex-row items-center mt-0.5`}><Clock size={11} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-3`}>{formatDateTime(a.date, a.startTime)}</Text></View>
        <View style={tw`flex-row items-center`}><MapPin size={11} color={C.ink3} /><Text numberOfLines={1} style={tw`ml-1 text-[12px] text-ink-3 shrink`}>{a.place.name}</Text></View>
        <View style={tw`flex-row items-center mt-1`}><Users size={11} color={C.ink2} /><Text style={tw`ml-1 text-[12px] text-ink-2`}>{count}/{a.capacity >= 999 ? '∞' : a.capacity}</Text><Text style={tw`ml-2 text-[12px] text-ink-2`}>{name}</Text></View>
      </View>
    </Pressable>
  );
}

/** 웹 TeamCard — 팀 모집·Study Crew 카드 */
export function TeamCard({ activity: a }: { activity: Activity }) {
  const v = useViewer();
  const host = v.userById(a.hostId);
  const count = v.approvedCount(a.id);
  const roles = a.rolesNeeded ?? [];
  const fit = roles.filter((r) => v.me.canOffer.includes(r));
  return (
    <View style={tw`card p-3.5 mb-3`}>
      <View style={tw`flex-row`}>
        <View style={tw`h-[52px] w-[52px] rounded-xl bg-surface-2 items-center justify-center`}><Text style={{ fontSize: 24 }}>{a.cover.emoji}</Text></View>
        <View style={tw`flex-1 min-w-0 ml-3`}>
          <View style={[tw`flex-row flex-wrap items-center`, { gap: 4 }]}>
            {a.courseName ? <View style={tw`flex-row items-center`}><BookOpen size={10} color={C.primary} /><Tag tone="primary">{a.courseName}</Tag></View> : <Tag tone="gold">{t('팀원 모집')}</Tag>}
            {a.crewType ? <Tag>{CREW_TYPE_EMOJI[a.crewType]} {CREW_TYPE_LABELS[a.crewType]}</Tag> : null}
            {a.mode ? <View style={tw`flex-row items-center`}>{a.mode === 'online' ? <Wifi size={10} color={C.ink2} /> : <MapPin size={10} color={C.ink2} />}<Tag>{MODE_LABELS[a.mode]}</Tag></View> : null}
          </View>
          <Pressable onPress={() => nav(`/activities/${a.id}`)}><Text numberOfLines={2} style={tw`text-[14px] font-bold text-ink leading-5 mt-1`}>{a.title}</Text></Pressable>
          <View style={tw`flex-row items-center mt-0.5`}><Clock size={11} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-3`}>{formatDateTime(a.date, a.startTime)}</Text></View>
        </View>
      </View>
      {roles.length > 0 && <View style={[tw`mt-2 flex-row flex-wrap items-center`, { gap: 4 }]}><Text style={tw`text-[11px] text-ink-3`}>{t('필요:')} </Text>{roles.map((r) => <Tag key={r} tone={fit.includes(r) ? 'mint' : 'neutral'}>{PERSON_ROLE_LABELS[r]}{fit.includes(r) ? ' ✓' : ''}</Tag>)}</View>}
      {a.courseName ? <Text style={tw`mt-2 text-[11px] text-ink-3`}>{t('같은 수업을 듣는 사람에게만 보여요')}</Text> : null}
      <View style={tw`mt-2.5 flex-row items-center`}>
        {host && <Pressable onPress={() => nav(`/users/${host.id}`)} style={tw`flex-row items-center mr-2`}><Avatar emoji={host.avatar.emoji} hue={host.avatar.hue} url={host.avatar.url} size={22} /><Text style={tw`ml-1.5 text-[12px] text-ink-2`}>{host.nickname}</Text></Pressable>}
        <Users size={11} color={C.ink3} /><Text style={tw`ml-0.5 text-[12px] text-ink-3`}>{count + 1}/{a.capacity}</Text>
        <View style={tw`flex-1`} />
        <JoinButton activity={a} size="sm" label={a.courseName ? t('Crew 참여') : t('팀 참여 문의')} />
      </View>
    </View>
  );
}

/** 웹 OpportunityCard variant="row" */
export function OppRow({ o }: { o: Opportunity }) {
  const intents = useAppStore((s) => s.opportunityIntents);
  const v = useViewer();
  const others = intents.filter((i) => i.opportunityId === o.id && i.userId !== v.me.id);
  const matchCount = others.filter((i) => { const u = v.userById(i.userId); return u && (o.rolesNeeded ? u.canOffer.some((r) => v.me.lookingFor.includes(r)) || v.me.canOffer.some((r) => u.lookingFor.includes(r)) : v.me.interests.some((x) => u.interests.includes(x))); }).length;
  const color = OPP_TYPE_COLORS[o.type];
  const urgent = !!o.deadline && daysUntil(o.deadline) <= 7 && daysUntil(o.deadline) >= 0;
  return (
    <Pressable onPress={() => nav(`/opportunities/${o.id}`)} style={tw`card p-3 flex-row mb-2`}>
      <View style={[tw`h-[52px] w-[52px] rounded-xl items-center justify-center`, { backgroundColor: `${color}1A` }]}><Text style={{ fontSize: 24 }}>{OPP_TYPE_EMOJI[o.type]}</Text></View>
      <View style={tw`flex-1 min-w-0 ml-3`}>
        <View style={tw`flex-row items-center`}><Text style={{ fontSize: 11, fontWeight: '700', color }}>{OPP_TYPE_EMOJI[o.type]} {OPP_TYPE_LABELS[o.type]}</Text>{o.deadline ? <View style={tw`ml-1.5`}><Tag tone={urgent ? 'danger' : 'neutral'}>{dday(o.deadline)}</Tag></View> : null}</View>
        <Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink mt-0.5`}>{o.title}</Text>
        <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{o.host}</Text>
        <View style={tw`flex-row items-center mt-1`}>
          {isTogetherType(o.type)
            ? <><Users size={11} color={C.ink2} /><Text style={tw`ml-1 text-[12px] text-ink-2`}>{others.length}{t('명 관심')}</Text>{matchCount > 0 && <Text style={tw`ml-2 text-[12px] text-primary font-semibold`}>{t('나와 맞는')} {matchCount}{t('명')}</Text>}</>
            : o.benefit ? <Text numberOfLines={1} style={tw`text-[12px] text-ink-2`}>🎁 {o.benefit}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** 참가자 알약 (웹 ActivityDetail PersonPill) */
export function PersonPill({ id, label }: { id: string; label?: string }) {
  const v = useViewer();
  const u = v.userById(id);
  if (!u) return null;
  return (
    <Pressable onPress={() => nav(`/users/${id}`)} style={tw`flex-row items-center rounded-full bg-surface-2 pl-1 pr-3 h-8 mr-2 mb-2`}>
      <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={24} /><Text style={tw`ml-1.5 text-[12px] font-semibold text-ink`}>{u.nickname}</Text>{label ? <Text style={tw`ml-1 text-[12px] font-semibold text-primary`}>{label}</Text> : null}
    </Pressable>
  );
}
