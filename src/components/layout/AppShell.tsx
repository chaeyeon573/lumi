import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
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
  useScrollMemory(scrollRef);
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

/** 화면별 스크롤 위치 — 위치(location.key)마다. AppShell 이 다시 그려져도 남게 모듈에 둔다 */
const scrollByKey = new Map<string, number>();

/**
 * 앱은 #scroll-root 하나 안에서 스크롤한다 — 브라우저의 스크롤 복원이 닿지 않는다.
 * 다른 화면으로 가면(PUSH·REPLACE, 경로가 바뀔 때) 맨 위에서, 뒤로 가기(POP)면 떠날 때 위치로.
 * 같은 화면 안에서 탭·필터만 바뀌면(?tab=…) 그대로 둔다.
 * (ux-sim baseline-aisha step 9: Discover 를 내려 본 뒤 Campus 를 누르면 피드 맨 아래에서 열렸다)
 */
function useScrollMemory(ref: RefObject<HTMLDivElement | null>) {
  const loc = useLocation();
  const navType = useNavigationType();
  const prevPath = useRef<string | null>(null);
  const keyRef = useRef(loc.key);
  // 지금 위치의 스크롤을 계속 적어 둔다 — 떠나는 순간에는 이미 새 화면이 그려져 있어 읽을 수 없다
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const save = () => scrollByKey.set(keyRef.current, el.scrollTop);
    el.addEventListener('scroll', save, { passive: true });
    return () => el.removeEventListener('scroll', save);
  }, [ref]);
  useLayoutEffect(() => {
    keyRef.current = loc.key;
    const el = ref.current;
    if (!el) return;
    const changedPath = prevPath.current !== null && prevPath.current !== loc.pathname;
    prevPath.current = loc.pathname;
    if (navType === 'POP') {
      const y = scrollByKey.get(loc.key);
      if (y === undefined) return;
      el.scrollTop = y;
      // 목록이 한 박자 늦게 길어지면 한 번 더
      const id = requestAnimationFrame(() => { if (el.scrollTop !== y) el.scrollTop = y; });
      return () => cancelAnimationFrame(id);
    }
    if (changedPath) el.scrollTop = 0;
  }, [ref, loc.key, loc.pathname, navType]);
}
