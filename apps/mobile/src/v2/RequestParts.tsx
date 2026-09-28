/**
 * 사람 찾아보기(네트워크 요청) 공용 조각 — 웹 people_RequestCard 의 SharedProfileMini · RequestPreviewCard · 공개 항목 목록.
 * 연락처·정확한 위치는 공개 항목 목록 자체에 없다.
 */
import { Pressable, Text, View } from 'react-native';
import { Check, Hand, Users, Lock } from 'lucide-react-native';
import { t } from '@core/i18n';
import { cityOf, majorOf } from '@core/lib/network';
import { INTEREST_LABELS } from '@core/lib/labels';
import { useAppStore } from '@core/store/useAppStore';
import type { Interest, NetworkRequest, Organization, ShareField, User } from '@core/types';
import { tw } from '@/tw';
import { Avatar, C } from '@/ui';
import { SchoolBadge } from './SchoolBadge';

/** 요청이 마감됐는가 (기간이 지났거나 요청자가 그만 찾기로 함) */
export const isRequestExpired = (req: Pick<NetworkRequest, 'expiresAt'>) => new Date(req.expiresAt).getTime() < Date.now();

/** 두 사람의 1:1 방 (대화 시작 후 열리는 Mutual Room) */
export function directRoomWith(rooms: { id: string; type: string; memberIds: string[] }[], a: string, b: string) {
  return rooms.find((r) => r.type === 'direct' && r.memberIds.length === 2 && r.memberIds.includes(a) && r.memberIds.includes(b));
}

export const SHARE_FIELDS: ShareField[] = ['school', 'major', 'city', 'career', 'interests', 'groups'];
export const DEFAULT_SHARED: ShareField[] = ['school', 'interests'];
export const shareFieldLabel = (f: ShareField) => ({ school: t('학교'), major: t('전공'), city: t('도시'), career: t('하는 일'), interests: t('관심사'), groups: t('그룹') })[f];

export function shareFieldValue(u: User, f: ShareField, orgs: Organization[]): string {
  switch (f) {
    case 'school': return u.affiliation.type === 'university' ? u.affiliation.schoolName : u.affiliation.companyName;
    case 'major': return majorOf(u);
    case 'city': return cityOf(u) ?? '';
    case 'career': return [u.career?.role, u.career?.company].filter(Boolean).join(' @ ') || u.career?.industry || '';
    case 'interests': return u.interests.slice(0, 4).map((i: Interest) => INTEREST_LABELS[i]).join(' · ');
    case 'groups': return orgs.filter((o) => o.memberIds.includes(u.id)).slice(0, 3).map((o) => o.name).join(' · ');
  }
}

/** 손 든 사람 미니 카드 — 이름·사진 + 본인이 고른 항목만. 연락처·정확한 위치는 항상 비공개 */
export function SharedProfileMini({ user, shared, preview, lockedRow = true }: { user: User; shared: ShareField[]; preview?: boolean; lockedRow?: boolean }) {
  const orgs = useAppStore((s) => s.organizations);
  const rows = SHARE_FIELDS.filter((f) => shared.includes(f)).map((f) => ({ f, value: shareFieldValue(user, f, orgs) }));
  return (
    <View style={tw`rounded-2xl bg-surface-2 px-3 py-2.5`}>
      <View style={tw`flex-row items-center`}><Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={32} /><Text numberOfLines={1} style={tw`ml-2 flex-1 text-[14px] font-bold text-ink`}>{user.nickname}</Text></View>
      <View style={tw`mt-2`}>
        {rows.length === 0 ? <Text style={tw`text-[12px] text-ink-3`}>{t('이름과 사진만 보여요')}</Text> : null}
        {rows.map(({ f, value }) => (
          <View key={f} style={tw`flex-row items-center py-0.5`}>
            <Text style={tw`w-16 text-[12px] font-semibold text-ink-3`}>{shareFieldLabel(f)}</Text>
            <Text numberOfLines={1} style={tw`flex-1 text-[12px] ${value ? 'text-ink' : 'text-ink-3'}`}>{value || (preview ? t('프로필에 없어요') : '—')}</Text>
          </View>
        ))}
        {lockedRow ? (
          <View style={tw`flex-row items-center pt-1 mt-1 border-t border-line`}>
            <View style={tw`w-16 flex-row items-center`}><Lock size={10} color={C.ink3} /><Text style={tw`ml-1 text-[12px] font-semibold text-ink-3`}>{t('비공개')}</Text></View>
            <Text numberOfLines={1} style={tw`flex-1 text-[12px] text-ink-3`}>{t('연락처 · 정확한 위치 — 항상 비공개')}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** 작성 화면용 미리보기 — 받는 사람의 카드 모양 그대로, 누를 수 없다 */
export function RequestPreviewCard({ author, text, context, degreeText }: { author: User; text: string; context?: string; degreeText: string }) {
  return (
    <View pointerEvents="none" style={tw`rounded-[24px] border border-line bg-white overflow-hidden`}>
      <View style={tw`px-4 pt-3.5 pb-3`}>
        <Text style={tw`text-[12px] font-bold text-primary`}>{t('혹시 여기에 해당되나요?')}</Text>
        <Text numberOfLines={3} style={tw`mt-1 text-[15px] font-bold ${text ? 'text-ink' : 'text-ink-3'}`}>{text || t('찾는 사람을 한 줄로 적어주세요')}</Text>
        {context ? <Text numberOfLines={1} style={tw`mt-1 text-[12px] text-ink-3`}>{context}</Text> : null}
        <View style={tw`mt-2 flex-row items-center`}>
          <Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={20} />
          <Text numberOfLines={1} style={tw`ml-1.5 text-[12px] text-ink-3 shrink`}>{author.nickname}{t('님')} · {degreeText}</Text>
          <View style={tw`ml-1.5 shrink`}><SchoolBadge user={author} size="sm" muted /></View>
        </View>
      </View>
      <View style={tw`px-3 pb-3 flex-row opacity-80`}>
        <View style={tw`flex-1 h-9 rounded-full bg-primary flex-row items-center justify-center`}><Hand size={13} color={C.onPrimary} /><Text style={tw`ml-1 text-[12px] font-semibold text-white`}>{t('저요')}</Text></View>
        <View style={tw`flex-[1.4] ml-1.5 h-9 rounded-full bg-accent flex-row items-center justify-center`}><Users size={13} color={C.primary} /><Text numberOfLines={1} style={tw`ml-1 text-[12px] font-semibold text-primary`}>{t('아는 사람 있어요')}</Text></View>
        <View style={tw`ml-1.5 h-9 px-2 justify-center`}><Text style={tw`text-[12px] font-semibold text-ink-2`}>{t('넘기기')}</Text></View>
      </View>
    </View>
  );
}

/** 체크 알약 (해당되는 부분 · 전달 방식) — 켜짐: 채운 파랑 + ✓ */
export function CheckPill({ on, label, onPress, soft }: { on: boolean; label: string; onPress: () => void; soft?: boolean }) {
  const onBg = soft ? 'bg-primary-soft border-accent' : 'bg-primary border-primary';
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={tw`h-9 px-3 mr-1.5 mb-1.5 rounded-full border flex-row items-center ${on ? onBg : 'bg-white border-line'}`}>
      {soft ? (on ? <Check size={12} color={C.primary} /> : null) : <View style={tw`h-4 w-4 rounded-full items-center justify-center ${on ? 'bg-white' : 'border border-line'}`}>{on ? <Check size={10} color={C.primary} /> : null}</View>}
      <Text style={tw`ml-1.5 text-[12px] font-bold ${on ? (soft ? 'text-primary' : 'text-white') : 'text-ink-3'}`}>{label}</Text>
    </Pressable>
  );
}
