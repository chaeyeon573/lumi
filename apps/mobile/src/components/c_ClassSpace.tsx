import { Pressable, ScrollView, Text, View } from 'react-native';
import { Users, Plus } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { classmates } from '@core/lib/relations';
import { DAY_LABELS, statusNow } from '@core/lib/timetable';
import { todayISO, formatDate, formatTime } from '@core/lib/format';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Avatar, Button, C } from '@/ui';
import { JoinButton } from '@/components/JoinButton';

/** 수업 공간 — 지금 공강인 같은 수업 학생 + Study Crew (웹 ClassSpaceContent 와 동일) */
export function ClassSpaceContent({ courseName, onEdit, onClose }: { courseName: string; onEdit?: () => void; onClose?: () => void }) {
  const v = useViewer();
  const me = v.me;
  const mine = me.timetable.filter((c) => c.name === courseName);
  const mates = classmates(v.snap, me, courseName, (u) => v.canSeeField(u, 'timetable'));
  const freeMates = mates.filter((u) => statusNow(u.timetable ?? []).kind !== 'in_class');
  const crews = v.visibleActivities.filter((a) => a.courseName === courseName && a.date >= todayISO());
  const go = (p: string) => { onClose?.(); nav(p); };
  const times = [...new Set(mine.map((c) => DAY_LABELS[c.day]))].join('') + (mine[0] ? ` ${formatTime(mine[0].start)}` : '');
  const short = courseName.split(' ').slice(0, 2).join(' ');
  return (
    <View>
      <View style={tw`flex-row items-start justify-between`}>
        <View style={tw`flex-1 mr-3`}>
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-[28px] font-bold text-primary`}>{short}</Text>
            {freeMates.length > 0 && <View style={tw`ml-2 h-6 px-2.5 rounded-full bg-accent items-center justify-center`}><Text style={tw`text-[11px] font-bold text-primary`}>Live</Text></View>}
          </View>
          <Text style={tw`mt-1.5 text-[14px] text-verify`}>{mine[0]?.room ? `${mine[0].room} · ` : ''}{times}</Text>
        </View>
        <View style={tw`h-9 px-3 rounded-full bg-surface-2 flex-row items-center`}><Users size={15} color={C.primary} /><Text style={tw`ml-1.5 text-[13px] font-semibold text-primary`}>{mates.length}</Text></View>
      </View>

      <View style={tw`mt-6`}>
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <View style={tw`flex-row items-center`}><View style={tw`h-2 w-2 rounded-full bg-accent mr-2`} /><Text style={tw`text-[14px] font-semibold text-primary`}>{lang === 'en' ? 'Free Now' : '지금 공강'}</Text></View>
          <Text style={tw`text-[13px] text-verify`}>{mates.length}{lang === 'en' ? ' classmates' : '명 같은 수업'}</Text>
        </View>
        {freeMates.length === 0 ? <Text style={tw`text-[13px] text-ink-3`}>{t('시간표를 공개한 같은 수업 학생이 아직 없어요.')}</Text> : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {freeMates.slice(0, 6).map((u) => (
              <Pressable key={u.id} onPress={() => go(`/users/${u.id}?propose=1&cat=study`)} style={tw`items-center w-[64px] mr-4`}>
                <View>
                  <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={60} />
                  <View style={tw`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-accent border-2 border-white`} />
                </View>
                <Text numberOfLines={1} style={tw`mt-1.5 text-[12px] text-primary`}>{u.nickname}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={tw`mt-6`}>
        <View style={tw`flex-row items-center justify-between mb-2`}><Text style={tw`text-[14px] font-semibold text-primary`}>Study Crews</Text><Text style={tw`text-[13px] text-verify`}>{crews.length}{lang === 'en' ? ' active' : '개'}</Text></View>
        {crews.length === 0 ? <Text style={tw`text-[13px] text-ink-3`}>{lang === 'en' ? 'No crews yet. Start the first one.' : '아직 없어요. 첫 Crew를 열어보세요.'}</Text> : (
          crews.map((a) => { const left = a.capacity - v.approvedCount(a.id); return (
            <View key={a.id} style={tw`rounded-2xl bg-surface-2 px-4 py-3.5 flex-row items-center mb-2`}>
              <Pressable onPress={() => go(`/activities/${a.id}`)} style={tw`flex-1 min-w-0 mr-3`}>
                <Text numberOfLines={1} style={tw`text-[15px] font-semibold text-primary`}>{a.title}</Text>
                <Text style={tw`text-[13px] text-verify mt-0.5`}>{formatDate(a.date)} {formatTime(a.startTime)} · {left}{lang === 'en' ? ` spot${left === 1 ? '' : 's'} left` : '자리'}</Text>
              </Pressable>
              <JoinButton activity={a} size="sm" label={t('참여')} />
            </View>
          ); })
        )}
      </View>

      <View style={tw`mt-6 items-center`}><Button size="lg" icon={<Plus size={18} color="#fff" />} onPress={() => go(`/create/activity?crew=${encodeURIComponent(courseName)}`)}>{lang === 'en' ? 'New Crew' : 'Crew 만들기'}</Button></View>
      {onEdit && <Pressable onPress={onEdit} style={tw`h-9 items-center justify-center mt-2`}><Text style={tw`text-[12px] font-semibold text-ink-3`}>{t('수업 정보 수정')}</Text></Pressable>}
    </View>
  );
}
