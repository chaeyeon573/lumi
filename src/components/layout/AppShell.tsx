import { Outlet } from 'react-router-dom';
import { Toast } from '@/components/ui';
import { BottomNav } from './BottomNav';
import { FeedbackTab } from './FeedbackTab';

/** 모바일 프레임. 데스크톱에서는 가운데 430px 폭으로 고정된다. */
export function AppShell({ withNav = true }: { withNav?: boolean }) {
  return (
    <div className="h-full w-full flex justify-center">
      <div id="shell" className="relative h-full w-full max-w-[430px] bg-bg sm:shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_24px_60px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar" id="scroll-root">
          <Outlet />
        </div>
        {withNav && <BottomNav />}
        {withNav && <FeedbackTab />}
        <Toast />
      </div>
    </div>
  );
}
