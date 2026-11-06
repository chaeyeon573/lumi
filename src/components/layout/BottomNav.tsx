import { TabBar } from '@/components/ha';

/**
 * 아래 탭 5개 — Harness A 의 TabBar (src/components/ha/Shell.tsx). AppShell 이 탭 화면에서만 그린다.
 * 예전 '+ 만들기' 시트는 열 곳이 없어져 지웠다 (만들기는 각 화면의 버튼: Social → Create a Meetup, /create/post …)
 */
export function BottomNav() {
  return <TabBar />;
}
