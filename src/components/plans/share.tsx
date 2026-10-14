import { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { lang } from '@core/i18n';
import type { ID } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { canShareSheet, shareOrCopy } from '@/lib/native';

const en = lang === 'en';

/** 공유용 전체 주소 — 해시 라우터(정적 빌드)에서도 열리게 */
export function planUrl(id: ID): string {
  const path = `/p/${id}`;
  if (typeof window === 'undefined') return path;
  return import.meta.env.VITE_ROUTER === 'hash' ? `${window.location.origin}${window.location.pathname}#${path}` : `${window.location.origin}${path}`;
}
export const shortPlanUrl = (id: ID) => planUrl(id).replace(/^https?:\/\//, '');

// ─── 이 기기에 기억하기 (실패해도 화면은 돈다) ─────────────────────────────────
const TOKEN_KEY = (id: ID) => `lumi.plan.${id}`;
const NAME_KEY = 'lumi.plan.name';
export const readPlanToken = (id: ID): string | undefined => { try { return localStorage.getItem(TOKEN_KEY(id)) ?? undefined; } catch { return undefined; } };
export const savePlanToken = (id: ID, token: string) => { try { localStorage.setItem(TOKEN_KEY(id), token); } catch { /* 사생활 보호 모드 */ } };
export const readGuestName = (): string => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } };
export const saveGuestName = (name: string) => { try { localStorage.setItem(NAME_KEY, name); } catch { /* */ } };

/** Copy link + 공유 시트 (휴대폰이면 공유 시트, 아니면 복사) */
export function SharePlanButtons({ id, title, className }: { id: ID; title: string; className?: string }) {
  const toast = useAppStore((s) => s.showToast);
  const [copied, setCopied] = useState(false);
  const url = planUrl(id);
  const canShare = canShareSheet();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast(en ? 'Link copied — paste it in your group chat' : '링크를 복사했어요 — 단톡방에 붙여 넣으세요', 'success');
    } catch { toast(url, 'info'); }
  };
  const share = async () => {
    // iPhone 앱이면 iOS 공유 시트, 브라우저면 navigator.share (src/lib/native.ts)
    if (await shareOrCopy({ title, text: title, url }) === 'copied') toast(en ? 'Link copied — paste it in your group chat' : '링크를 복사했어요 — 단톡방에 붙여 넣으세요', 'success');
  };
  return (
    <div className={cn('flex gap-2', className)}>
      <button onClick={copy} className="flex-1 h-12 rounded-full bg-primary text-white v2:text-on-primary text-[15px] font-bold inline-flex items-center justify-center gap-2 press">
        {copied ? <Check size={18} /> : <Link2 size={18} />}{copied ? (en ? 'Copied' : '복사됨') : (en ? 'Copy link' : '링크 복사')}
      </button>
      {canShare && (
        <button onClick={share} className="h-12 px-5 rounded-full bg-surface-2 border border-line text-ink text-[15px] font-semibold inline-flex items-center justify-center gap-2 press">
          <Share2 size={18} />{en ? 'Share' : '공유'}
        </button>
      )}
    </div>
  );
}
