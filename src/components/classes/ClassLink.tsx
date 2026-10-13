import { useMemo, useState } from 'react';
import { Link2, Check, QrCode } from 'lucide-react';
import { encode } from 'uqr';
import { lang } from '@core/i18n';
import type { ID } from '@core/types';
import { classPath } from '@core/lib/classmates';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';

const en = lang === 'en';

/** 공유용 전체 주소 — 해시 라우터(정적 빌드)에서도 열리게 */
export function classUrl(schoolId: ID, code: string): string {
  const path = classPath(schoolId, code);
  if (typeof window === 'undefined') return path;
  const hash = import.meta.env.VITE_ROUTER === 'hash';
  return hash ? `${window.location.origin}${window.location.pathname}#${path}` : `${window.location.origin}${path}`;
}
/** 화면에 보여줄 짧은 주소 (https:// 없이) */
export const shortUrl = (url: string) => url.replace(/^https?:\/\//, '');

/** "Copy class link" — 수업 방·시간표 수업 칸 어디서나 */
export function CopyClassLink({ schoolId, code, className, compact }: { schoolId: ID; code: string; className?: string; compact?: boolean }) {
  const toast = useAppStore((s) => s.showToast);
  const [done, setDone] = useState(false);
  const copy = async () => {
    const url = classUrl(schoolId, code);
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) { await navigator.share({ title: `${code} on Lumi`, url }); return; }
      await navigator.clipboard.writeText(url);
      setDone(true); setTimeout(() => setDone(false), 2000);
      toast(en ? 'Class link copied — paste it in your class Discord or GroupMe' : '수업 링크를 복사했어요', 'success');
    } catch { toast(url, 'info'); }
  };
  if (compact) return (
    <button onClick={copy} className={cn('h-9 px-3.5 rounded-full bg-surface-2 border border-line text-ink text-[13px] font-semibold inline-flex items-center gap-1.5 press', className)}>
      {done ? <Check size={14} /> : <Link2 size={14} />}{en ? 'Copy class link' : '수업 링크 복사'}
    </button>
  );
  return (
    <button onClick={copy} className={cn('w-full rounded-2xl bg-surface-2 border border-line px-4 py-3.5 flex items-center gap-3 text-left press', className)}>
      <span className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0">{done ? <Check size={18} /> : <Link2 size={18} />}</span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-ink">{en ? 'Copy class link' : '수업 링크 복사'}</span>
        <span className="block text-[12.5px] text-ink-3">{en ? 'Paste it in your class Discord / GroupMe' : '수업 단톡방·디스코드에 붙여 넣으세요'}</span>
      </span>
    </button>
  );
}

export function QrLinkButton({ schoolId, code, className }: { schoolId: ID; code: string; className?: string }) {
  return (
    <a href={`${classPath(schoolId, code)}/qr`} target="_blank" rel="noreferrer" className={cn('h-9 px-3.5 rounded-full bg-surface-2 border border-line text-ink text-[13px] font-semibold inline-flex items-center gap-1.5 press', className)}>
      <QrCode size={14} />{en ? 'QR for slides' : 'QR 카드'}
    </a>
  );
}

/** QR 코드 — 흰 바탕·검은 칸 고정 (어두운 화면·인쇄에서도 읽히게) */
export function QrSvg({ value, size = 220, className }: { value: string; size?: number; className?: string }) {
  const qr = useMemo(() => encode(value, { ecc: 'M', border: 2 }), [value]);
  const n = qr.size;
  const cells: string[] = [];
  qr.data.forEach((row, y) => row.forEach((on, x) => { if (on) cells.push(`M${x} ${y}h1v1h-1z`); }));
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${value}`} className={className}>
      <rect width={n} height={n} fill="#FFFFFF" />
      <path d={cells.join('')} fill="#000000" />
    </svg>
  );
}

// ─── 가입 뒤 돌아오기 ──────────────────────────────────────────────────────────
const RETURN_KEY = 'lumi.returnTo';
/** 로그인 전에 수업 링크로 들어와 가입하면, 가입 뒤 그 수업 방으로 돌아온다 */
export function rememberReturnTo(path: string) { try { sessionStorage.setItem(RETURN_KEY, path); } catch { /* */ } }
export function takeReturnTo(): string | null {
  try { const p = sessionStorage.getItem(RETURN_KEY); if (p) sessionStorage.removeItem(RETURN_KEY); return p && p.startsWith('/c/') ? p : null; } catch { return null; }
}

/** 수업을 추가할 때 한 줄 설명 — 누가 무엇을 보는지 */
export function ClassmatesNote({ className }: { className?: string }) {
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const hidden = me?.showToClassmates === false;
  return (
    <p className={cn('text-[12px] text-ink-3 leading-snug', className)}>
      {hidden
        ? (en ? 'You’re hidden from classmates — turn it on in any class room.' : '같은 수업 학생에게 숨겨져 있어요 — 수업 방에서 켤 수 있어요.')
        : (en ? 'Classmates in the same class can see you take it — nothing else from your timetable.' : '같은 수업 학생에게는 이 수업을 듣는다는 것만 보여요.')}
    </p>
  );
}
