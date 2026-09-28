import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Hand, Users, MessageCircle, Lock, Clock, MoreHorizontal, EyeOff, Flag, ChevronRight } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { IncomingRequest } from '@core/lib/requests';
import { degreeLabel, requestContextLine, referralCandidates } from '@core/lib/requests';
import { personLine } from '@core/lib/network';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import type { User } from '@core/types';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Avatar, Button, BottomSheet, Empty, Tag, C } from '@/ui';
import { useSnapshot } from './useSnapshot';
import { PlainReasonChips } from './ReasonChips';
import { SchoolBadge } from './SchoolBadge';
import { directRoomWith, isRequestExpired } from './RequestParts';

const REPORT_REASONS = () => [t('스팸·광고'), t('연락처·개인정보를 요구해요'), t('부적절한 내용'), t('사칭 또는 허위'), t('기타')];

/**
 * "혹시 여기에 해당되나요?" — 건너건너 물어온 요청 카드 (웹 people_RequestCard IncomingRequestCard).
 * 저요 → 응답 화면(고른 정보만 공개) · 아는 사람 있어요 → 떠오르는 사람 고르기(본인이 관심 있어요 해야 보임) · 넘기기.
 * ⋯ 메뉴: 숨기기 · 신고. 마감된 요청은 흐리게, 행동 없이. 읽음 표시·불이익 없음.
 */
export function IncomingRequestCard({ item, compact, highlightReferral }: { item: IncomingRequest; compact?: boolean; highlightReferral?: boolean }) {
  const v = useViewer();
  const snap = useSnapshot();
  const run = useAppStore((s) => s.run);
  const rooms = useAppStore((s) => s.chatRooms);
  const [busy, setBusy] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'refer' | 'menu' | 'report' | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const { req, author, degree, reasons, myResponse, myReferral } = item;
  const referrer = myReferral ? v.userById(myReferral.referrerId) : undefined;
  const ctx = requestContextLine(req);
  const expired = isRequestExpired(req) || req.status !== 'open';
  const room = myResponse?.status === 'accepted' ? directRoomWith(rooms, v.me.id, author.id) : undefined;
  const act = async (key: string, fn: Parameters<typeof run>[0], msg?: string) => { setBusy(key); try { await run(fn, msg); return true; } catch { return false; } finally { setBusy(null); } };
  const openDetail = () => nav(`/people/requests/${req.id}`);
  const refer = async (u: User) => { setSheet(null); await act(`refer-${u.id}`, () => api.requests.refer(req.id, v.me.id, u.id), `${u.nickname}${t('님에게 조용히 물어봤어요. 본인이 관심 있어요 하면 연결돼요.')}`); };
  const hide = async () => { setSheet(null); await act('dismiss', () => api.requests.dismiss(req.id, v.me.id), t('숨겼어요. 다시 보이지 않아요.')); };
  const report = async () => {
    if (!reason) return;
    const ok = await act('report', () => api.requests.report(req.id, v.me.id, reason), t('신고가 접수되었어요. 이 요청은 더 이상 보이지 않아요.'));
    if (ok) { setSheet(null); setReason(null); }
  };
  const candidates = sheet === 'refer' ? referralCandidates(snap, v.me, req) : [];
  const hi = !!highlightReferral;

  return (
    <View style={tw`rounded-[20px] border border-line overflow-hidden ${expired ? 'bg-surface-2' : 'bg-white'}`}>
      <View style={tw`px-4 pt-3.5 pb-3 ${expired ? 'opacity-60' : ''}`}>
        <View style={tw`flex-row items-center`}>
          <View style={tw`flex-1`}>
            {expired
              ? <View style={tw`flex-row items-center`}><Clock size={12} color={C.ink3} /><Text style={tw`ml-1 text-[12px] font-bold text-ink-3`}>{t('마감된 요청이에요')}</Text></View>
              : <Text style={tw`text-[12px] font-bold text-primary`}>{t('혹시 여기에 해당되나요?')}</Text>}
          </View>
          <Pressable onPress={() => setSheet('menu')} accessibilityLabel={t('더보기')} hitSlop={6} style={tw`-mr-2 h-8 w-8 rounded-full items-center justify-center`}><MoreHorizontal size={17} color={C.ink3} /></Pressable>
        </View>
        <Pressable onPress={openDetail}>
          <Text numberOfLines={compact ? 2 : undefined} style={tw`mt-0.5 text-[15px] font-bold text-ink leading-snug`}>{req.text}</Text>
          {ctx && !compact ? <Text numberOfLines={1} style={tw`mt-1 text-[12px] text-ink-3`}>{ctx}</Text> : null}
        </Pressable>
        <View style={tw`mt-2 flex-row items-center`}>
          <Pressable onPress={() => nav(`/users/${author.id}`)}><Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={20} /></Pressable>
          <Text numberOfLines={1} style={tw`ml-1.5 text-[12px] text-ink-3 shrink`}>{author.nickname}{t('님')} · {degreeLabel(degree, lang)}</Text>
          {!compact ? <View style={tw`ml-1.5 shrink`}><SchoolBadge user={author} size="sm" muted /></View> : null}
        </View>
        {!compact && !expired ? <View style={tw`mt-2`}><PlainReasonChips reasons={reasons} /></View> : null}
      </View>

      {myReferral && myReferral.status === 'pending' && referrer && !expired ? (
        <View style={tw`mx-3 mb-3 rounded-2xl p-3 ${hi ? 'bg-primary' : 'bg-primary-soft'}`}>
          <View style={tw`flex-row items-center`}><Avatar emoji={referrer.avatar.emoji} hue={referrer.avatar.hue} url={referrer.avatar.url} size={26} /><Text style={tw`ml-2 flex-1 text-[13px] font-semibold ${hi ? 'text-white' : 'text-primary'}`}>{referrer.nickname}{t('님이 당신이 떠올랐대요')}</Text></View>
          <Text style={[tw`mt-1.5 text-[11px]`, { color: hi ? C.glassSoft : C.ink3 }]}>{t('관심 있어요 하기 전까지 상대에게 내 프로필은 보이지 않아요.')}</Text>
          <View style={tw`mt-2.5 flex-row`}>
            <Button size="sm" full variant={hi ? 'accent' : 'primary'} loading={busy === 'ref-yes'} onPress={() => act('ref-yes', () => api.requests.referralDecide(req.id, myReferral.id, true), t('관심 있다고 알렸어요. 상대가 대화를 시작하면 알려드려요.'))}>{t('관심 있어요')}</Button>
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
            <Button size="sm" full variant="secondary" icon={<Users size={14} color={C.primary} />} loading={busy?.startsWith('refer') ?? false} onPress={() => setSheet('refer')}>{t('아는 사람 있어요')}</Button>
            <View style={tw`w-1.5`} />
            <Button size="sm" variant="outline" loading={busy === 'dismiss'} onPress={() => act('dismiss', () => api.requests.dismiss(req.id, v.me.id))}>{t('넘기기')}</Button>
          </View>
          <View style={tw`mt-2 px-1 flex-row items-center`}><Lock size={10} color={C.ink3} /><Text style={tw`ml-1 flex-1 text-[11px] text-ink-3`}>{t('저요를 누르면 고른 정보만 보여요 · 연락처는 공개되지 않아요')}</Text></View>
        </View>
      )}

      <BottomSheet open={sheet === 'menu'} onClose={() => setSheet(null)}>
        <Pressable onPress={hide} style={tw`h-12 px-3 rounded-xl flex-row items-center`}><EyeOff size={18} color={C.ink} /><Text style={tw`ml-3 flex-1 text-[14px] font-semibold text-ink`}>{t('숨기기')}</Text><Text style={tw`text-[11px] text-ink-3`}>{t('상대는 알 수 없어요')}</Text></Pressable>
        <Pressable onPress={() => setSheet('report')} style={tw`h-12 px-3 rounded-xl flex-row items-center`}><Flag size={18} color={C.danger} /><Text style={tw`ml-3 text-[14px] font-semibold text-danger`}>{t('신고')}</Text></Pressable>
      </BottomSheet>

      <BottomSheet open={sheet === 'report'} onClose={() => setSheet(null)} title={t('신고하기')}>
        <Text style={tw`text-[13px] text-ink-3`}>{t('신고 내용은 상대에게 공개되지 않아요.')} {t('신고하면 이 요청은 더 이상 보이지 않아요.')}</Text>
        <View style={tw`mt-3`}>
          {REPORT_REASONS().map((r) => (
            <Pressable key={r} onPress={() => setReason(r)} style={tw`mb-1.5 h-11 px-3.5 rounded-xl border justify-center ${reason === r ? 'border-primary bg-primary-soft' : 'border-line'}`}><Text style={tw`text-[14px] font-medium text-ink`}>{r}</Text></Pressable>
          ))}
        </View>
        <View style={tw`mt-3 flex-row`}><Button full size="lg" variant="danger" disabled={!reason} loading={busy === 'report'} onPress={report}>{t('신고 제출')}</Button></View>
      </BottomSheet>

      <BottomSheet open={sheet === 'refer'} onClose={() => setSheet(null)} title={t('아는 사람 있어요')} tall>
        <Text style={tw`text-[13px] text-ink-2`}>{t('떠오르는 사람을 고르면 그 사람에게 먼저 조용히 물어봐요. 본인이 관심 있어요 해야 상대에게 보여요.')}</Text>
        <View style={tw`mt-1 flex-row items-center`}><Lock size={10} color={C.ink3} /><Text style={tw`ml-1 flex-1 text-[11px] text-ink-3`}>{t('그 전까지 요청자는 누구를 떠올렸는지 알 수 없어요.')}</Text></View>
        {candidates.length === 0 ? (
          <Empty title={t('아직 물어볼 연결이 없어요')} description={t('연결이 늘면 여기서 아는 사람을 떠올릴 수 있어요.')} />
        ) : (
          <View style={tw`mt-3`}>
            {candidates.map((c) => (
              <Pressable key={c.user.id} onPress={() => refer(c.user)} style={tw`mb-1.5 rounded-2xl bg-surface-2 px-3 py-2 flex-row items-center`}>
                <Avatar emoji={c.user.avatar.emoji} hue={c.user.avatar.hue} url={c.user.avatar.url} size={40} />
                <View style={tw`flex-1 min-w-0 mx-2.5`}>
                  <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink shrink-0 max-w-[55%] mr-1.5`}>{c.user.nickname}</Text><SchoolBadge user={c.user} size="sm" /></View>
                  <Text numberOfLines={1} style={tw`text-[11px] text-ink-3`}>{personLine(c.user, lang)}</Text>
                  {c.reasons.length > 0 ? <View style={tw`mt-1`}><PlainReasonChips reasons={c.reasons} max={2} /></View> : null}
                </View>
                <ChevronRight size={16} color={C.ink3} />
              </Pressable>
            ))}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}
