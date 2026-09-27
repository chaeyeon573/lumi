import { BadgeCheck } from 'lucide-react';
import { lang, t } from '@core/i18n';
import type { User } from '@core/types';
import { isVerified, schoolBadge, verificationLabel, yy, gradYearOf } from '@core/lib/network';
import { cn } from '@core/lib/cn';

/**
 * "연세대학교 ✓" — 신뢰의 출발점. 인증 방법은 title(툴팁)로.
 * 졸업생은 "연세대학교 동문 ✓", withYear 면 "연세대학교 '18 ✓"
 */
export function SchoolBadge({ user, withYear, size = 'md', className }: { user: User; withYear?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const verified = isVerified(user);
  const label = withYear ? `${schoolBadge(user, lang)} ${yy(gradYearOf(user))}`.trim() : schoolBadge(user, lang);
  const method = user.verification ? verificationLabel(user.verification.method, lang) : verified ? t('학교 인증') : t('미인증');
  return (
    <span title={method} className={cn('inline-flex items-center gap-1 font-semibold text-primary', size === 'sm' ? 'text-[12px]' : size === 'lg' ? 'text-[17px]' : 'text-[14px]', className)}>
      <span className="truncate">{label}</span>
      {verified && <BadgeCheck size={size === 'sm' ? 13 : size === 'lg' ? 18 : 15} className="text-[#2E6388] shrink-0" aria-label={method} />}
    </span>
  );
}

/** 컴팩트 알약 — 헤더·카드용 ("연세대학교 ✓") */
export function SchoolPill({ user, className }: { user: User; className?: string }) {
  const verified = isVerified(user);
  const method = user.verification ? verificationLabel(user.verification.method, lang) : t('학교 인증');
  return (
    <span title={method} className={cn('inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#BFF4FF] border border-[#A3D5FF] text-primary text-[11px] font-bold', className)}>
      <span className="truncate max-w-[140px]">{schoolBadge(user, lang)}</span>{verified && <BadgeCheck size={12} />}
    </span>
  );
}
