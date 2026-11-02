import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { isNativeShell } from '@/lib/native';
import { PullToRefresh } from '@/components/native/PullToRefresh';
import { Toast } from '@/components/ui';
import { BottomNav } from './BottomNav';
import { FeedbackTab } from './FeedbackTab';
import { DesignToggle } from './DesignToggle';
import { lang } from '@core/i18n';

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
    <div className="h-full w-full flex justify-center relative">
      {/* 넓은 화면(노트북)에서는 폰 폭 앱이 검은 바탕에 떠 있어 '깨진 화면'처럼 보였다 (ux-sim baseline-priya step 0) —
          배경(index.css .app-backdrop)과 앱 틀 테두리, 왼쪽 설명 한 줄로 일부러 그렇게 둔 것임을 보여 준다. 화면 배치는 그대로 */}
      {!inApp && <DesktopAside />}
      <div id="shell" className="relative h-full w-full max-w-[430px] bg-bg sm:shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_24px_60px_rgba(0,0,0,0.12)] lg:border-x lg:border-line lg:shadow-[0_0_0_1px_var(--color-line),0_30px_80px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col">
        {inApp && <PullToRefresh target={scrollRef} />}
        {/* scroll-pt: 위의 고정 상단 바(h-16) 밑으로 줄이 숨지 않게 — 화면 밖 줄을 눌러 끌어올 때(scrollIntoView·포커스) 바 아래에 멈춘다.
            안 그러면 줄 가운데가 상단 바 밑에 깔려 눌러도 바가 눌린다 (ux-sim baseline-aisha step 22: 동아리 줄을 눌렀는데 아무 일도 없음).
            scroll-pb: 아래쪽도 같다 — 화면 아래 고정 버튼 줄(‘Post ride’ 등, h≈72) 밑에 입력칸이 깔려, 메모 칸을 누르면 글이 올라갔다
            (ux-sim baseline-seoyeon step 29) */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto hide-scrollbar scroll-pt-[72px] scroll-pb-[96px]" id="scroll-root">
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

/** 노트북·데스크톱에서 앱 틀 왼쪽 빈 곳 — 무엇인지, 폰에 맞춘 화면이라는 것 (lg 이상에서만) */
function DesktopAside() {
  const en = lang === 'en';
  return (
    <aside aria-hidden className="hidden xl:flex flex-col justify-center absolute inset-y-0 right-[calc(50%+215px+56px)] w-[280px] text-right select-none pointer-events-none">
      <span className="font-display text-[34px] font-extrabold tracking-tight text-primary leading-none v2:hidden">Lumi</span>
      <span className="hidden v2:inline font-['Unbounded'] text-[34px] font-extrabold tracking-tight text-ink leading-none">lumi<span className="text-pink-400">.</span></span>
      <span className="mt-3 text-[15px] text-ink-2 leading-snug">{en ? 'People and things to do around campus.' : '캠퍼스의 사람과 할 일.'}</span>
      <span className="mt-6 text-[13px] text-ink-3 leading-snug">{en ? 'Lumi is laid out for your phone — open this link there for the full experience. Everything works here too.' : 'Lumi 는 폰 화면에 맞춰져 있어요 — 폰에서 이 링크를 열면 더 편해요. 여기서도 모두 쓸 수 있어요.'}</span>
    </aside>
  );
}
