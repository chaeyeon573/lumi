import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import type { User } from '@core/types';
import { assetUrl } from '@/lib/assets';

interface AvatarProps {
  emoji: string;
  hue: number;
  url?: string;
  size?: number;
  className?: string;
  ring?: boolean;
}

export function Avatar({ emoji, hue, url, size = 44, className, ring }: AvatarProps) {
  if (url) return <img src={assetUrl(url)} alt="" width={size} height={size} className={cn('shrink-0 rounded-full object-cover select-none', ring && 'ring-2 ring-white shadow-sm', className)} style={{ width: size, height: size }} />;
  return (
    <div
      className={cn('shrink-0 grid place-items-center rounded-full select-none', ring && 'ring-2 ring-white shadow-sm', className)}
      style={{
        width: size, height: size, fontSize: size * 0.5,
        background: `linear-gradient(135deg, hsl(${hue} 85% 88%), hsl(${(hue + 40) % 360} 80% 74%))`,
      }}
    >
      {/^[A-Z0-9ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ•]{1,3}$/.test(emoji)
        ? <span className="font-display font-extrabold text-primary" style={{ lineHeight: 1, fontSize: size * (emoji.length > 2 ? 0.3 : 0.36) }}>{emoji}</span>
        : <span style={{ lineHeight: 1 }}>{emoji}</span>}
    </div>
  );
}

/** 큰 프로필 사진 (카드용) */
export function Portrait({ emoji, hue, url, className, photoType }: { emoji: string; hue: number; url?: string; className?: string; photoType?: User['avatar']['photoType'] }) {
  return (
    <div
      className={cn('relative w-full grid place-items-center select-none overflow-hidden', className)}
      style={{ background: `radial-gradient(120% 90% at 30% 20%, hsl(${hue} 90% 90%), hsl(${(hue + 35) % 360} 75% 70%) 70%, hsl(${(hue + 60) % 360} 70% 60%))` }}
    >
      {url ? <img src={assetUrl(url)} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="text-[88px] drop-shadow-sm" style={{ lineHeight: 1 }}>{emoji}</span>}
      {photoType && photoType !== 'face' && (
        <span className="absolute bottom-2 left-2 rounded-lg bg-black/35 text-white text-[11px] px-2 py-0.5 backdrop-blur">
          {photoType === 'masked' ? t('얼굴 비공개') : t('뒷모습')}
        </span>
      )}
    </div>
  );
}

export function Cover({ emoji, hue, url, className, size = 40 }: { emoji: string; hue: number; url?: string; className?: string; size?: number }) {
  return (
    <div
      className={cn('relative grid place-items-center select-none overflow-hidden', className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 80% 92%) 0%, hsl(${(hue + 30) % 360} 75% 78%) 60%, hsl(${(hue + 50) % 360} 70% 68%) 100%)` }}
    >
      {url ? <img src={assetUrl(url)} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <span style={{ fontSize: size, lineHeight: 1 }} className="drop-shadow-sm">{emoji}</span>}
    </div>
  );
}

export function VerifiedBadge({ kind = 'school', size = 14, label }: { kind?: 'school' | 'identity' | 'org'; size?: number; label?: boolean }) {
  const map = {
    school: { Icon: BadgeCheck, color: 'text-verify', text: t('학교 인증') },
    identity: { Icon: ShieldCheck, color: 'text-mint', text: t('본인 인증') },
    org: { Icon: BadgeCheck, color: 'text-gold', text: t('공식 인증') },
  }[kind];
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-semibold', map.color)} title={map.text} style={{ fontSize: size - 2 }}>
      <map.Icon size={size} strokeWidth={2.4} />
      {label && map.text}
    </span>
  );
}
