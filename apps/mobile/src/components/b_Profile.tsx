import { Text, View } from 'react-native';
import { BadgeCheck, ShieldCheck } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { User } from '@core/types';
import { ROLE_LABELS } from '@core/lib/labels';
import { tw } from '@/tw';
import { C } from '@/ui';

/** 소속 한 줄 (웹 PersonCard.affiliationText 와 동일) */
export function affiliationText(u: User, showSchoolOverride?: boolean) {
  if (u.affiliation.type !== 'university') return u.affiliation.companyName;
  const a = u.affiliation;
  const parts: string[] = [];
  if ((showSchoolOverride ?? a.showSchool) && a.schoolName) parts.push(a.schoolName);
  if (a.showDepartment && a.department) parts.push(a.department);
  parts.push(ROLE_LABELS[a.role]);
  return parts.join(' · ');
}

/** 인증 배지 (웹 VerifiedBadge 와 동일) */
export function VerifiedBadge({ kind = 'school', size = 14, label }: { kind?: 'school' | 'identity' | 'org'; size?: number; label?: boolean }) {
  const map = {
    school: { Icon: BadgeCheck, color: C.verify, text: t('학교 인증') },
    identity: { Icon: ShieldCheck, color: C.mint, text: t('본인 인증') },
    org: { Icon: BadgeCheck, color: C.gold, text: t('공식 인증') },
  }[kind];
  return (
    <View style={tw`flex-row items-center`}>
      <map.Icon size={size} strokeWidth={2.4} color={map.color} />
      {label ? <Text style={{ fontSize: size - 2, fontWeight: '600', color: map.color, marginLeft: 2 }}>{map.text}</Text> : null}
    </View>
  );
}
