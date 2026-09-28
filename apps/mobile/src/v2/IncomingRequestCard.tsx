import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Hand, Users, MessageCircle, Lock, Clock } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { IncomingRequest } from '@core/lib/requests';
import { degreeLabel, requestContextLine } from '@core/lib/requests';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Avatar, Button, Tag, C } from '@/ui';
import { PlainReasonChips } from './ReasonChips';

/**
 * "혹시 여기에 해당되나요?" — 건너건너 물어온 요청 카드 (웹 people_RequestCard IncomingRequestCard 의 모바일판).
 * 저요 → 응답 화면(고른 정보만 공개) · 아는 사람 있어요 → 요청 상세에서 떠올리기 · 넘기기.
 * 숨기기·신고·추천 시트는 요청 상세(/people/requests/:id)에서.
 */
export function IncomingRequestCard({ item, compact }: { item: IncomingRequest; compact?: boolean }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const rooms = useAppStore((s) => s.chatRooms);
  const [busy, setBusy] = useState<string | null>(null);
  const { req, author, degree, reasons, myResponse, myReferral } = item;
  const referrer = myReferral ? v.userById(myReferral.referrerId) : undefined;
  const ctx = requestContextLine(req);
  const expired = new Date(req.expiresAt).getTime() < Date.now() || req.status !== 'open';
  const room = myResponse?.status === 'accepted' ? rooms.find((r) => r.type === 'direct' && r.memberIds.length === 2 && r.memberIds.includes(v.me.id) && r.memberIds.includes(author.id)) : undefined;
  const act = async (key: string, fn: Parameters<typeof run>[0], msg?: string) => { setBusy(key); try { await run(fn, msg); } catch { /* toast */ } finally { setBusy(null); } };
  const openDetail = () => nav(`/people/requests/${req.id}`);

  return (
    <View style={tw`rounded-[24px] border border-line overflow-hidden ${expired ? 'bg-surface-2' : 'bg-white'}`}>
      <Pressable onPress={openDetail} style={tw`px-4 pt-3.5 pb-3 ${expired ? 'opacity-60' : ''}`}>
        {expired
          ? <View style={tw`flex-row items-center`}><Clock size={12} color={C.ink3} /><Text style={tw`ml-1 text-[12px] font-bold text-ink-3`}>{t('마감된 요청이에요')}</Text></View>
          : <Text style={tw`text-[12px] font-bold text-primary`}>{t('혹시 여기에 해당되나요?')}</Text>}
        <Text numberOfLines={compact ? 2 : undefined} style={tw`mt-0.5 text-[15px] font-bold text-ink leading-snug`}>{req.text}</Text>
        {ctx && !compact ? <Text numberOfLines={1} style={tw`mt-1 text-[12px] text-ink-3`}>{ctx}</Text> : null}
        <View style={tw`mt-2 flex-row items-center`}>
          <Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={20} />
          <Text numberOfLines={1} style={tw`ml-1.5 text-[12px] text-ink-3 shrink`}>{author.nickname}{t('님')} · {degreeLabel(degree, lang)}</Text>
        </View>
        {!compact && !expired ? <View style={tw`mt-2`}><PlainReasonChips reasons={reasons} /></View> : null}
      </Pressable>

      {myReferral && myReferral.status === 'pending' && referrer && !expired ? (
        <View style={tw`mx-3 mb-3 rounded-2xl p-3 bg-primary-soft`}>
          <View style={tw`flex-row items-center`}><Avatar emoji={referrer.avatar.emoji} hue={referrer.avatar.hue} url={referrer.avatar.url} size={26} /><Text style={tw`ml-2 flex-1 text-[13px] font-semibold text-primary`}>{referrer.nickname}{t('님이 당신이 떠올랐대요')}</Text></View>
          <Text style={tw`mt-1.5 text-[11px] text-ink-3`}>{t('관심 있어요 하기 전까지 상대에게 내 프로필은 보이지 않아요.')}</Text>
          <View style={tw`mt-2.5 flex-row`}>
            <Button size="sm" full loading={busy === 'ref-yes'} onPress={() => act('ref-yes', () => api.requests.referralDecide(req.id, myReferral.id, true), t('관심 있다고 알렸어요. 상대가 대화를 시작하면 알려드려요.'))}>{t('관심 있어요')}</Button>
            <View style={tw`w-2`} />
            <Button size="sm" variant="outline" loading={busy === 'ref-no'} onPress={() => act('ref-no', () => api.requests.referralDecide(req.id, myReferral.id, false))}>{t('넘기기')}</Button>
          </View>
        </View>
      ) : myResponse ? (
        <View style={tw`mx-3 mb-3 rounded-2xl bg-surface-2 px-3 py-2.5 flex-row items-center`}>
          {myResponse.status === 'accepted' ? <Tag tone="mint">{t('연결됨')}</Tag> : myResponse.status === 'declined' ? <Tag>{t('이번엔 아니에요')}</Tag> : <Tag tone="primary">{t('손 들었어요')}</Tag>}
          <View style={tw`flex-1`} />
          {room ? <Button size="sm" icon={<MessageCircle size={14} color={C.onPrimary} />} onPress={() => nav(`/chats/${room.id}`)}>{t('대화 열기')}</Button> : null}
        </View>
      ) : expired ? null : (
        <View style={tw`px-3 pb-3`}>
          <View style={tw`flex-row`}>
            <Button size="sm" icon={<Hand size={14} color={C.onPrimary} />} onPress={() => nav(`/people/requests/${req.id}/respond`)}>{t('저요')}</Button>
            <View style={tw`w-1.5`} />
            <Button size="sm" full variant="secondary" icon={<Users size={14} color={C.primary} />} onPress={openDetail}>{t('아는 사람 있어요')}</Button>
            <View style={tw`w-1.5`} />
            <Button size="sm" variant="outline" loading={busy === 'dismiss'} onPress={() => act('dismiss', () => api.requests.dismiss(req.id, v.me.id))}>{t('넘기기')}</Button>
          </View>
          <View style={tw`mt-2 px-1 flex-row items-center`}><Lock size={10} color={C.ink3} /><Text style={tw`ml-1 flex-1 text-[11px] text-ink-3`}>{t('저요를 누르면 고른 정보만 보여요 · 연락처는 공개되지 않아요')}</Text></View>
        </View>
      )}
    </View>
  );
}
