import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Send, MoreVertical, Flag, Ban, Users, CalendarDays, LogOut } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import type { ChatMessage } from '@core/types';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Button, BottomSheet, Empty, IconBtn, Input, C } from '@/ui';
import { SheetItem } from '@/components/PostCard';
import { ReportSheet } from '@/components/b_ReportSheet';
import { displayAvatar, displayName } from '@core/lib/deleted';

/** 채팅방 — 메시지 목록 + 입력 (웹 ChatRoomPage) */
export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const rooms = useAppStore((s) => s.chatRooms);
  const room = rooms.find((r) => r.id === roomId);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const count = room?.messages.length ?? 0;

  useEffect(() => { if (room) api.chats.markRead(room.id, v.me.id).then((p) => useAppStore.getState().applyPatch(p)); }, [room?.id, count]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (count) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50); }, [count]);

  if (!room || !room.memberIds.includes(v.me.id)) return <Screen title={t('채팅')}><Empty title={t('입장할 수 없는 채팅방이에요')} description={t('참가 승인이 완료되면 그룹 채팅방에 입장할 수 있어요.')} /></Screen>;

  const other = room.type === 'direct' ? v.userById(room.memberIds.find((m) => m !== v.me.id)!) : undefined;
  const activity = room.activityId ? v.visibleActivities.find((a) => a.id === room.activityId) : undefined;
  /** 탈퇴한 상대 — 기록만 남고 대화·신고·차단은 막는다 */
  const gone = !!other?.deleted;
  const title = other ? displayName(other) : room.title ?? t('채팅');
  const blocked = other && !gone ? v.isBlocked(other.id) : false;
  const inputOff = gone || blocked;

  const send = async () => {
    const msg = text.trim();
    if (!msg || inputOff) return;
    setText('');
    await run(() => api.chats.send(room.id, v.me.id, msg));
  };

  const header = (
    <View>
      {activity && (
        <Pressable onPress={() => nav(`/activities/${activity.id}`)} style={tw`card p-3 flex-row items-center mb-2`}>
          <View style={tw`h-9 w-9 rounded-xl bg-primary-soft items-center justify-center`}><CalendarDays size={18} color={C.primary} /></View>
          <View style={tw`flex-1 min-w-0 ml-3`}><Text numberOfLines={1} style={tw`text-[13px] font-bold text-ink`}>{activity.title}</Text><Text style={tw`text-[11px] text-ink-3`}>{activity.place.name} · {activity.date} {activity.startTime}</Text></View>
        </Pressable>
      )}
      {room.messages.length === 0 && <Text style={tw`text-center text-[12px] text-ink-3 py-8`}>{t('대화를 시작해보세요. 차단·신고는 오른쪽 위 메뉴에서 할 수 있어요.')}</Text>}
    </View>
  );

  const renderItem = ({ item: m, index: i }: { item: ChatMessage; index: number }) => {
    if (m.system) return <Text style={tw`text-center text-[11px] text-ink-3 py-1`}>{m.text}</Text>;
    const mine = m.senderId === v.me.id;
    const u = v.userById(m.senderId);
    const av = displayAvatar(u);
    const showName = !mine && room.type !== 'direct' && room.messages[i - 1]?.senderId !== m.senderId;
    const hideAvatar = room.messages[i + 1]?.senderId === m.senderId;
    return (
      <View style={tw`flex-row items-end mb-2 ${mine ? 'justify-end' : 'justify-start'}`}>
        {!mine && <View style={[tw`mr-2`, hideAvatar ? { opacity: 0 } : null]}><Avatar emoji={av.emoji} hue={av.hue} url={av.url} size={28} /></View>}
        <View style={tw`max-w-[72%] ${mine ? 'items-end' : 'items-start'}`}>
          {showName && <Text style={tw`text-[11px] text-ink-3 mb-0.5 ml-1`}>{displayName(u)}</Text>}
          <View style={tw`px-3.5 py-2 rounded-2xl ${mine ? 'bg-primary rounded-br-md' : 'bg-white border border-line rounded-bl-md'}`}><Text style={tw`text-[14px] leading-5 ${mine ? 'text-white' : 'text-ink'}`}>{m.text}</Text></View>
        </View>
      </View>
    );
  };

  const titleNode = (
    <Pressable onPress={() => (other ? (gone ? undefined : nav(`/users/${other.id}`)) : activity ? nav(`/activities/${activity.id}`) : undefined)} style={tw`flex-1 ml-1`}>
      <Text numberOfLines={1} style={tw`text-[17px] font-bold text-ink`}>{title}</Text>
      {room.type !== 'direct' && <Text style={tw`text-[11px] text-ink-3 font-medium`}>{t('멤버')} {room.memberIds.length}{t('명')}</Text>}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={tw`flex-1 bg-white`} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 제목 자리는 탭 가능한 노드(프로필/활동 이동 + 멤버 수)라 right 슬롯에 넣고, Screen 의 빈 제목(flex-1)을 밀어낸다 */}
      <Screen scroll={false} right={<View style={[tw`flex-row items-center`, { flex: 1000 }]}>{titleNode}<IconBtn onPress={() => setMenu(true)}><MoreVertical size={20} color={C.ink2} /></IconBtn></View>}
        footer={
          <View style={tw`flex-row items-center`}>
            <Input style={tw`flex-1 h-11 rounded-2xl bg-surface-2 border-0`} placeholder={gone ? t('탈퇴한 사용자와는 대화할 수 없어요') : blocked ? t('차단된 사용자와는 대화할 수 없어요') : t('메시지 입력…')} value={text} onChangeText={setText} editable={!inputOff} onSubmitEditing={send} returnKeyType="send" blurOnSubmit={false} />
            <View style={tw`w-2`} />
            <Button style={tw`h-11 w-11 px-0 rounded-2xl`} disabled={!text.trim() || inputOff} onPress={send}><Send size={18} color={C.onPrimary} /></Button>
          </View>
        }>
        <FlatList ref={listRef} data={room.messages} keyExtractor={(m) => m.id} renderItem={renderItem} ListHeaderComponent={header} contentContainerStyle={tw`px-4 py-3`} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })} />
      </Screen>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={title}>
        {room.type !== 'direct' && <View style={tw`px-3 py-2 flex-row items-center`}><Users size={13} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-3 shrink`}>{t('멤버')} {room.memberIds.map((id) => displayName(v.userById(id), id === v.me.id ? t('나') : '')).filter(Boolean).join(', ')}</Text></View>}
        {other && !gone && <SheetItem icon={<Flag size={18} color={C.danger} />} label={t('사용자 신고')} danger onPress={() => { setMenu(false); setReport(true); }} />}
        {other && !gone && <SheetItem icon={<Ban size={18} color={C.danger} />} label={blocked ? t('차단 해제') : t('사용자 차단')} danger onPress={() => { setMenu(false); if (blocked) run(() => api.relationships.unblock(v.me.id, other.id), t('차단을 해제했어요.')); else setBlockOpen(true); }} />}
        {activity && activity.hostId !== v.me.id && <SheetItem icon={<LogOut size={18} color={C.danger} />} label={t('활동 나가기')} danger onPress={async () => { setMenu(false); await run(() => api.activities.cancel(activity.id, v.me.id), t('활동에서 나갔어요.')); nav('/chats?tab=activity'); }} />}
        {!other && !activity && <SheetItem icon={<Flag size={18} color={C.danger} />} label={t('채팅방 신고')} danger onPress={() => { setMenu(false); setReport(true); }} />}
      </BottomSheet>
      {other && <ReportSheet open={report} onClose={() => setReport(false)} targetType="user" targetId={other.id} />}
      {!other && <ReportSheet open={report} onClose={() => setReport(false)} targetType="message" targetId={room.id} />}
      {other && (
        <BottomSheet open={blockOpen} onClose={() => setBlockOpen(false)} title={`${other.nickname}${t('님을 차단할까요?')}`}>
          <Text style={tw`text-[13px] text-ink-3`}>{t('차단하면 서로 메시지를 보낼 수 없고 프로필과 활동이 보이지 않아요.')}</Text>
          <View style={tw`flex-row mt-4`}>
            <Button variant="outline" full onPress={() => setBlockOpen(false)}>{t('취소')}</Button>
            <View style={tw`w-2`} />
            <Button variant="danger" full onPress={async () => { setBlockOpen(false); await run(() => api.relationships.block(v.me.id, other.id), t('차단했어요.')); nav('/chats'); }}>{t('차단')}</Button>
          </View>
        </BottomSheet>
      )}
    </KeyboardAvoidingView>
  );
}
