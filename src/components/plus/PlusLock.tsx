import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { TONE } from '@/components/ha';

/**
 * Small lock + "Lumi+" on a control that needs Lumi+ (only drawn while LUMI_PLUS is on and the person doesn't have it).
 * Tapping it opens Lumi+ (S087). The server refuses the same thing anyway — this only explains why.
 */
export function PlusLock({ className }: { className?: string }) {
  const nav = useNavigate();
  return (
    <button type="button" onClick={() => nav('/settings/plus')} aria-label="Lumi+ — see what's included"
      className={cn('inline-flex items-center gap-1 h-6 px-2 rounded-lg text-[12px] font-semibold press', TONE.lav, className)}>
      <Lock size={12} strokeWidth={2.4} />Lumi+
    </button>
  );
}
