import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { CalendarPlus, Image as ImageIcon, Lightbulb, Zap, BookOpen, Vote } from 'lucide-react-native';
import { t } from '@core/i18n';
import { getPlatform } from '@core/platform';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { BottomSheet, C } from '@/ui';

/** 마지막으로 본 사람 (People 카드) — `+`에서 바로 초대할 때 사용 */
export const LAST_SEEN_KEY = 'aroundu.people.last';

/** `+` 시트 — 상황 인식: 현재 화면에 따라 기본값을 채운다 (웹 BottomNav 와 동일) */
export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [crewPick, setCrewPick] = useState(false);
  const path = usePathname();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const opps = useAppStore((s) => s.opportunities);
  const go = (p: string) => { onClose(); nav(p); };

  const orgHere = path.startsWith('/orgs/') ? orgs.find((o) => o.id === path.split('/')[2]) : undefined;
  const oppHere = path.startsWith('/opportunities/') ? opps.find((o) => o.id === path.split('/')[2]) : undefined;
  const classHere = path.startsWith('/classes/') ? decodeURIComponent(path.split('/')[2] ?? '') : '';
  const userHere = path.startsWith('/users/') ? path.split('/')[2] : '';
  const lastSeen = path === '/' ? getPlatform().getItem(LAST_SEEN_KEY) ?? '' : '';
  const inviteId = userHere || lastSeen;
  const invitee = inviteId ? v.userById(inviteId) : undefined;
  const adminOrgs = orgs.filter((o) => o.adminIds.includes(v.me.id));
  const courses = [...new Set(v.me.timetable.map((c) => c.name))];

  const options = [
    { key: 'now', label: t('즉석 만남'), desc: invitee ? `${invitee.nickname}${t('님을 바로 초대해요')}` : t('30분 뒤 밥·커피·산책 — 시간 맞는 사람에게 바로 보여요'), Icon: Zap, path: `/create/activity?kind=personal&now=1${invitee ? `&invite=${invitee.id}` : ''}`, bg: C.accentSoft, fg: C.primary },
    { key: 'activity', label: t('활동·약속 만들기'), desc: t('점심·운동·전시·모임 — 날짜와 장소를 정해서'), Icon: CalendarPlus, path: `/create/activity?kind=${invitee ? 'personal' : 'group'}${invitee ? `&invite=${invitee.id}` : ''}`, bg: C.soft, fg: C.primary },
    { key: 'together', label: t('같이 시간 정하기'), desc: invitee ? `${invitee.nickname}${t('님과 후보 시간 투표로 약속 잡기')}` : t('친구들에게 후보 시간을 보내고 겹치는 시간으로 확정'), Icon: Vote, path: `/together/new${invitee ? `?invite=${invitee.id}` : ''}`, bg: C.soft, fg: C.primary },
    { key: 'crew', label: t('스터디 만들기'), desc: classHere ? `${classHere} · ${t('같은 수업 학생에게만 보여요')}` : t('시험·과제·팀플 — 같은 수업 학생에게만 보여요'), Icon: BookOpen, path: classHere ? `/create/activity?crew=${encodeURIComponent(classHere)}` : '', bg: C.mintSoft, fg: C.mint },
    { key: 'team', label: t('팀원 모집하기'), desc: oppHere ? `${oppHere.title} · ${t('필요한 역할을 미리 채워요')}` : t('해커톤·창업·프로젝트에 필요한 역할 모집'), Icon: Lightbulb, path: `/create/activity?kind=group&team=1${oppHere ? `&opportunity=${oppHere.id}` : ''}`, bg: C.goldSoft, fg: C.goldInk },
    { key: 'post', label: t('게시물 작성'), desc: orgHere ? `${orgHere.name} ${t('페이지에 소식 올리기')}` : t('사진·일상·질문, 익명은 글만'), Icon: ImageIcon, path: `/create/post${orgHere && adminOrgs.includes(orgHere) ? `?org=${orgHere.id}&type=news` : ''}`, bg: C.surface2, fg: C.primary },
  ];
  const pick = (o: typeof options[number]) => {
    if (o.key === 'crew' && !o.path) { onClose(); if (courses.length) setTimeout(() => setCrewPick(true), 250); else nav('/timetable'); return; }
    go(o.path);
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={t('무엇을 함께 시작할까요?')} tall>
        {options.map((o) => (
          <Pressable key={o.key} onPress={() => pick(o)} style={tw`flex-row items-center rounded-2xl p-3 bg-surface-2 mb-2`}>
            <View style={[tw`h-11 w-11 rounded-xl items-center justify-center`, { backgroundColor: o.bg }]}><o.Icon size={20} color={o.fg} /></View>
            <View style={tw`flex-1 min-w-0 ml-3`}><Text style={tw`text-[14px] font-bold text-ink`}>{o.label}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{o.desc}</Text></View>
          </Pressable>
        ))}
      </BottomSheet>
      <BottomSheet open={crewPick} onClose={() => setCrewPick(false)} title={t('어떤 수업 스터디인가요?')}>
        {courses.map((c) => <Pressable key={c} onPress={() => { setCrewPick(false); nav(`/create/activity?crew=${encodeURIComponent(c)}`); }} style={tw`rounded-xl px-3.5 h-11 justify-center border border-line mb-1.5`}><Text style={tw`text-[14px] font-medium text-ink`}>{c}</Text></Pressable>)}
      </BottomSheet>
    </>
  );
}
