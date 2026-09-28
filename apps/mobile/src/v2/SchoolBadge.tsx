import { Text, View } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { lang } from '@core/i18n';
import type { User } from '@core/types';
import { isVerified, schoolBadge, yy, gradYearOf } from '@core/lib/network';
import { tw } from '@/tw';
import { C } from '@/ui';

/**
 * "연세대학교 ✓" — 신뢰의 출발점 (웹 people_SchoolBadge).
 * 졸업생은 "연세대학교 동문 ✓", withYear 면 "연세대학교 '18 ✓"
 */
export function SchoolBadge({ user, withYear, size = 'md', muted }: { user: User; withYear?: boolean; size?: 'sm' | 'md' | 'lg'; muted?: boolean }) {
  const verified = isVerified(user);
  const label = withYear ? `${schoolBadge(user, lang)} ${yy(gradYearOf(user))}`.trim() : schoolBadge(user, lang);
  const fs = size === 'sm' ? 12 : size === 'lg' ? 17 : 14;
  return (
    <View style={tw`flex-row items-center shrink min-w-0`}>
      <Text numberOfLines={1} style={[tw`font-semibold shrink`, { fontSize: fs, color: muted ? C.ink3 : C.primary }]}>{label}</Text>
      {verified ? <BadgeCheck size={size === 'sm' ? 13 : size === 'lg' ? 18 : 15} color={C.verify} style={tw`ml-1`} /> : null}
    </View>
  );
}
