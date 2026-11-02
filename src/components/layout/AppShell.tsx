import { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { isNativeShell } from '@/lib/native';
import { PullToRefresh } from '@/components/native/PullToRefresh';
import { Toast } from '@/components/ui';
import { BottomNav } from './BottomNav';
import { FeedbackTab } from './FeedbackTab';
import { DesignToggle } from './DesignToggle';

/**
 * 모바일 프레임. 데스크톱에서는 가운데 430px 폭으로 고정된다.
 * iPhone 앱 안에서는 테스트용 떠 있는 알약(디자인 비교 · 의견)을 그리지 않는다 — App Review 2.1/4.2.
 * 의견은 설정 → '의견 보내기'로 보낸다 (SettingsPage).
 */
export function AppShell({ withNav = true }: { withNav?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inApp = isNativeShell();
  return (
    <div className="h-full w-full flex justify-center">
      <div id="shell" className="relative h-full w-full max-w-[430px] bg-bg sm:shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_24px_60px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col">
        {inApp && <PullToRefresh target={scrollRef} />}
        {/* scroll-pt: 위의 고정 상단 바(h-16) 밑으로 줄이 숨지 않게 — 화면 밖 줄을 눌러 끌어올 때(scrollIntoView·포커스) 바 아래에 멈춘다.
            안 그러면 줄 가운데가 상단 바 밑에 깔려 눌러도 바가 눌린다 (ux-sim baseline-aisha step 22: 동아리 줄을 눌렀는데 아무 일도 없음) */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto hide-scrollbar scroll-pt-[72px]" id="scroll-root">
          <Outlet />
        </div>
        {withNav && <BottomNav />}
        {withNav && !inApp && <FeedbackTab />}
        {/* 2026-11-02 사장님: 디자인 비교 알약은 그대로 둔다 */}
        {!inApp && <DesignToggle withNav={withNav} />}
        <Toast />
      </div>
    </div>
  );
}
