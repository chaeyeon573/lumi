import { ArrowLeftRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '@core/lib/cn';
import { setDesign, useDesign } from '@/lib/design';

/**
 * 디자인 비교용 떠 있는 알약 — 누르면 Classic ⇄ New(Lumi v2) 가 바로 바뀐다.
 * 하단 탭이 있는 화면에서는 '의견' 버튼(오른쪽)의 반대편 왼쪽에, 없는 화면에서는 상단 바 아래 오른쪽에 둔다.
 * 가입 단계(/start)는 제목이 바로 그 자리라 가려진다 — 오른쪽이 빈 상단 바(← 7 / 9) 안에 둔다.
 */
export function DesignToggle({ withNav }: { withNav: boolean }) {
  const d = useDesign();
  const v2 = d === 'v2';
  const onboarding = useLocation().pathname === '/start';
  return (
    <button
      onClick={() => setDesign(v2 ? 'classic' : 'v2')}
      aria-label={v2 ? 'Switch to the classic design' : 'Switch to the new design'}
      className={cn(
        'absolute z-[1050] h-8 pl-2.5 pr-3 rounded-full backdrop-blur text-[11px] font-bold flex items-center gap-1.5 press',
        withNav ? 'left-3 bottom-[84px]' : onboarding ? 'right-3 top-[11px]' : 'right-3 top-[62px]',
        v2 ? 'bg-[#1F1B2B]/90 text-[#A79FC4] border border-[#2A2433] shadow-[0_6px_16px_-4px_rgba(0,0,0,.6)]' : 'bg-white/90 text-[#43474D] border border-[#E6E8E1] shadow-[0_6px_16px_-4px_rgba(15,43,72,.25)]',
      )}
    >
      <span className="opacity-80">Design:</span>
      <span className={cn(v2 ? 'opacity-60 font-semibold' : 'text-[#0F2B48]')}>Classic</span>
      <ArrowLeftRight size={12} className="opacity-70" />
      <span className={cn(v2 ? 'text-[#D4FF3A]' : 'opacity-60 font-semibold')}>New</span>
    </button>
  );
}
