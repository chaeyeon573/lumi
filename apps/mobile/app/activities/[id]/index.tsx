import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Clock, MapPin, Users, Ticket, Lock, Share2, Flag, MoreHorizontal, Pencil, Trash2, BadgeCheck, MessageCircle, ShieldCheck } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORY_LABELS, JOIN_POLICY_LABELS, KIND_LABELS } from '@core/lib/labels';
import { formatDate, formatTime, formatFee, relativeTime } from '@core/lib/format';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav, replace } from '@/nav';
import { Screen, Avatar, Button, Cover, Tag, BottomSheet, Input, Empty, IconBtn, C } from '@/ui';
import { JoinButton } from '@/components/JoinButton';
import { SheetItem } from '@/components/PostCard';
import { ReportSheet } from '@/components/a_ReportSheet';
import { VisibilityTag, InfoRow, Dialog, PersonPill } from '@/components/a_shared';

/** 활동 상세 (웹 ActivityDetailPage) — 지도는 장소 이름 텍스트로 */
export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const participations = useAppStore((s) => s.participations);
  const rooms = useAppStore((s) => s.chatRooms);
  const a = v.visibleActivities.find((x) => x.id === id);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [text, setText] = useState('');

  if (!a) return <Screen title={t('활동')}><Empty title={`🔒 ${t('활동을 볼 수 없어요')}`} description={t('삭제되었거나 공개 범위에 포함되지 않은 활동이에요.')} action={<Button onPress={() => nav('/')}>{t('홈으로')}</Button>} /></Screen>;

  const host = v.userById(a.hostId);
  const org = a.orgId ? v.orgById(a.orgId) : undefined;
  const approved = participations.filter((p) => p.activityId === a.id && p.status === 'approved');
  const isHost = a.hostId === v.me.id;
  const mine = v.myParticipation(a.id);
  const room = rooms.find((r) => r.activityId === a.id);
  const canChat = room && (isHost || mine?.status === 'approved');
  const color = CATEGORY_COLORS[a.category];
  const submitComment = async () => { if (!text.trim()) return; await run(() => api.activities.comment(a.id, v.me.id, text.trim())); setText(''); };

  const footer = (
    <View style={[tw`flex-row`, { gap: 8 }]}>
      <Pressable onPress={() => showToast(t('링크를 복사했어요.'))} style={tw`h-[52px] w-[52px] rounded-2xl bg-surface-2 items-center justify-center`}><Share2 size={20} color={C.ink2} /></Pressable>
      {canChat ? <Button size="lg" variant="secondary" onPress={() => nav(`/chats/${room!.id}`)} icon={<MessageCircle size={18} color={C.primary} />}>{t('그룹 채팅')}</Button> : null}
      <View style={tw`flex-1`}><JoinButton activity={a} size="lg" /></View>
    </View>
  );

  return (
    <Screen title="" right={<IconBtn onPress={() => setMenu(true)}><MoreHorizontal size={20} color={C.ink2} /></IconBtn>} footer={footer}>
      <View style={tw`-mx-4`}><Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} size={240} radius={0} style={{ width: '100%', height: 240 }} /></View>
      <View style={tw`-mt-6`}>
        <View style={tw`card p-4`}>
          <View style={[tw`flex-row flex-wrap items-center`, { gap: 6 }]}>
            <View style={[tw`rounded-lg px-2 h-6 justify-center`, { backgroundColor: color }]}><Text style={tw`text-[11px] font-bold text-white`}>{CATEGORY_EMOJI[a.category]} {CATEGORY_LABELS[a.category]}</Text></View>
            <Tag>{KIND_LABELS[a.kind]}</Tag>
            {a.official && <Tag tone="gold">✓ {t('학교 공식')}</Tag>}
            <View style={tw`flex-1`} /><VisibilityTag value={a.visibility} />
          </View>
          <Text style={tw`text-[20px] font-extrabold text-ink leading-7 mt-2`}>{a.title}</Text>
          <Text style={tw`text-[14px] text-ink-2 leading-6 mt-2`}>{a.description}</Text>
        </View>

        <Pressable onPress={() => nav(org ? `/orgs/${org.id}` : `/users/${a.hostId}`)} style={tw`mt-3 card p-3 flex-row items-center`}>
          {org ? <Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={44} style={{ borderRadius: 12 }} /> : host && <Avatar emoji={host.avatar.emoji} hue={host.avatar.hue} url={host.avatar.url} size={44} />}
          <View style={tw`flex-1 min-w-0 ml-3`}>
            <Text style={tw`text-[11px] text-ink-3`}>{t('주최자')}</Text>
            <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink shrink`}>{org?.name ?? host?.nickname}</Text>{(org?.verified || (host?.affiliation.type === 'university' && host.affiliation.emailVerified)) && <BadgeCheck size={13} color={C.verify} style={{ marginLeft: 4 }} />}</View>
            {!org && host && host.affiliation.type === 'university' && <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{host.affiliation.showSchool ? host.affiliation.schoolName : ''} {host.affiliation.showDepartment ? host.affiliation.department : ''}</Text>}
          </View>
        </Pressable>

        <View style={tw`mt-3 card overflow-hidden`}>
          <InfoRow icon={<Clock size={16} color={C.ink2} />} label={t('날짜와 시간')} value={`${formatDate(a.date)} ${formatTime(a.startTime)} – ${formatTime(a.endTime)}`} />
          <InfoRow icon={<MapPin size={16} color={C.ink2} />} label={t('장소')} value={a.place.name} sub={a.place.address} />
          <InfoRow icon={<Users size={16} color={C.ink2} />} label={t('모집 인원')} value={`${approved.length}${t('명 참가 중 · 모집 ')}${a.capacity >= 999 ? t('제한 없음') : `${a.capacity}${t('명')}`}`} />
          <InfoRow icon={<Ticket size={16} color={C.ink2} />} label={t('참가 비용')} value={formatFee(a.fee)} />
          <InfoRow icon={<Lock size={16} color={C.ink2} />} label={t('참가 방식')} value={JOIN_POLICY_LABELS[a.joinPolicy]} last={!a.conditions} />
          {a.conditions ? <InfoRow icon={<ShieldCheck size={16} color={C.ink2} />} label={t('참가 조건')} value={a.conditions} last /> : null}
        </View>

        <View style={tw`mt-3 card overflow-hidden`}>
          <View style={tw`h-[120px] bg-surface-2 items-center justify-center px-4`}>
            <View style={[tw`h-9 w-9 rounded-full items-center justify-center`, { backgroundColor: color }]}><Text style={tw`text-[16px]`}>{CATEGORY_EMOJI[a.category]}</Text></View>
            <Text numberOfLines={1} style={tw`mt-2 text-[14px] font-bold text-ink`}>{a.place.name}</Text>
            {a.place.address ? <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{a.place.address}</Text> : null}
          </View>
          <Pressable onPress={() => nav(`/map?focus=${a.id}`)} style={tw`h-11 flex-row items-center justify-center`}><MapPin size={14} color={C.primary} /><Text style={tw`ml-1 text-[13px] font-semibold text-primary`}>{t('지도에서 보기')}</Text></Pressable>
        </View>

        <View style={tw`mt-3 card p-4`}>
          <View style={tw`flex-row items-center justify-between`}><Text style={tw`text-[14px] font-bold text-ink`}>{t('현재 참가자')} {approved.length}</Text>{isHost && <Pressable onPress={() => nav(`/activities/${a.id}/manage`)}><Text style={tw`text-[12px] font-semibold text-primary`}>{t('참가자 관리')}</Text></Pressable>}</View>
          <View style={tw`flex-row flex-wrap mt-3`}>
            {host && <PersonPill id={host.id} label={t('주최')} />}
            {approved.map((p) => <PersonPill key={p.id} id={p.userId} />)}
            {approved.length === 0 && <Text style={tw`text-[12px] text-ink-3`}>{t('아직 참가자가 없어요. 첫 참가자가 되어보세요!')}</Text>}
          </View>
        </View>

        <View style={tw`mt-3 card p-4`}>
          <Text style={tw`text-[14px] font-bold text-ink`}>{t('댓글 또는 질문')} {a.comments.length}</Text>
          <View style={tw`mt-3`}>
            {a.comments.map((c) => { const u = v.userById(c.authorId); return (
              <View key={c.id} style={tw`flex-row mb-3`}><Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={30} /><View style={tw`flex-1 ml-2.5`}><View style={tw`flex-row items-center`}><Text style={tw`text-[12px] font-bold text-ink`}>{u?.nickname}</Text>{c.authorId === a.hostId && <View style={tw`ml-1`}><Tag tone="primary">{t('주최자')}</Tag></View>}<Text style={tw`text-[12px] text-ink-3 ml-1.5`}>{relativeTime(c.createdAt)}</Text></View><Text style={tw`text-[13px] text-ink-2 mt-0.5`}>{c.text}</Text></View></View>
            ); })}
            {a.comments.length === 0 && <Text style={tw`text-[12px] text-ink-3`}>{t('궁금한 점을 주최자에게 물어보세요.')}</Text>}
          </View>
          <View style={tw`flex-row items-center mt-3`}>
            <Input style={tw`flex-1 h-10`} placeholder={t('질문이나 댓글 남기기')} value={text} onChangeText={setText} onSubmitEditing={submitComment} /><View style={tw`w-2`} /><Button size="sm" disabled={!text.trim()} onPress={submitComment}>{t('등록')}</Button>
          </View>
        </View>
      </View>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={t('활동')}>
        {isHost && <SheetItem icon={<Pencil size={18} color={C.ink} />} label={t('활동 수정')} onPress={() => { setMenu(false); nav(`/activities/${a.id}/edit`); }} />}
        {isHost && <SheetItem icon={<Trash2 size={18} color={C.danger} />} label={t('활동 삭제')} danger onPress={() => { setMenu(false); setConfirmDelete(true); }} />}
        <SheetItem icon={<Share2 size={18} color={C.ink} />} label={t('공유')} onPress={() => { setMenu(false); showToast(t('링크를 복사했어요.')); }} />
        {!isHost && <SheetItem icon={<Flag size={18} color={C.danger} />} label={t('활동 신고')} danger onPress={() => { setMenu(false); setReport(true); }} />}
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="activity" targetId={a.id} />
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('활동을 삭제할까요?')} description={t('참가자와 그룹 채팅방도 함께 사라져요. 되돌릴 수 없어요.')}>
        <Button variant="outline" full onPress={() => setConfirmDelete(false)}>{t('취소')}</Button><View style={tw`w-2`} />
        <Button variant="danger" full onPress={async () => { await run(() => api.activities.remove(a.id), t('활동을 삭제했어요.')); replace('/'); }}>{t('삭제')}</Button>
      </Dialog>
    </Screen>
  );
}
