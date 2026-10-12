import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { lang } from '@core/i18n';
import { useAiEnabled } from '@/hooks/useAiEnabled';

/** 탭 상단의 'Ask Lumi' 입구 — AI 가 꺼져 있으면 아무것도 그리지 않는다 */
export function AskBar({ className = '' }: { className?: string }) {
  const nav = useNavigate();
  const on = useAiEnabled();
  if (!on) return null;
  return (
    <button onClick={() => nav('/ask')} className={`w-full h-11 rounded-full bg-primary-soft text-primary flex items-center gap-2 px-4 text-left press ${className}`}>
      <Sparkles size={17} className="shrink-0" />
      <span className="text-[14px] font-semibold shrink-0">Ask Lumi</span>
      <span className="text-[13px] text-ink-3 truncate">{lang === 'en' ? '“free food today?”' : '“오늘 무료 음식 있어?”'}</span>
    </button>
  );
}
