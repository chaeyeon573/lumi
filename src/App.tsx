import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAppStore } from '@core/store/useAppStore';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorScreen } from '@/components/ha/States';
import { PreviewListPage, PreviewSchoolPage, PreviewJobsPage } from '@/pages/preview/PreviewPage';
import { ClassRoomPage } from '@/pages/classes/ClassRoomPage';
import { ClassQrPage } from '@/pages/classes/ClassQrPage';
import { onboardingRoutes } from '@/routes/onboarding';
import { homeExploreTabRoutes, homeExploreSubRoutes } from '@/routes/homeExplore';
import { scheduleTabRoutes, scheduleSubRoutes } from '@/routes/schedule';
import { socialTabRoutes, socialSubRoutes } from '@/routes/social';
import { meTabRoutes, meSubRoutes } from '@/routes/me';
import { legacyRoutes, legacyPublicRoutes } from '@/routes/redirects';
import { takeReturnTo } from '@/components/classes/ClassLink';
import { PrivacyPage, TermsPage } from '@/pages/legal/LegalPages';
import { ClubSetupPage } from '@/pages/org/ClubSetupPage';
import { NativeBridge } from '@/components/native/NativeBridge';
import { isNativeShell } from '@/lib/native';

function RequireAuth() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const status = useAppStore((s) => s.status);
  const location = useLocation();
  if (status === 'idle' || status === 'loading') return <SplashScreen />;
  if (status === 'error') return <FullError />;
  if (!currentUserId) return <Navigate to="/welcome" replace state={{ from: location }} />;
  // 수업 링크로 들어와 가입·로그인했으면 그 수업 방으로
  if (location.pathname === '/') { const back = takeReturnTo(); if (back) return <Navigate to={back} replace />; }
  return <Outlet />;
}

function RedirectIfAuthed() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const status = useAppStore((s) => s.status);
  if (status === 'idle' || status === 'loading') return <SplashScreen />;
  if (currentUserId) return <Navigate to="/" replace />;
  return <Outlet />;
}

function SplashScreen() {
  return (
    <div className="h-full grid place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <span className="font-display text-[34px] font-extrabold tracking-[-0.03em] text-ink">Lumi</span>
        <div className="h-1 w-24 rounded-full bg-line overflow-hidden"><div className="h-full w-1/2 bg-sel animate-pulse" /></div>
      </div>
    </div>
  );
}

function FullError() {
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  return <div className="h-full grid place-items-center bg-bg"><ErrorScreen message={error ?? undefined} onRetry={init} /></div>;
}

export default function App() {
  const init = useAppStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <>
    {/* iPhone 앱(apps/shell) 안에서만 — 딥링크·푸시·상태 표시줄 */}
    {isNativeShell() && <NativeBridge />}
    {/* Harness A 주소 지도 — 영역별 파일(src/routes/*)이 화면 번호(S0xx)와 함께 갖고 있다. docs/design/harness-a/SCREENS.md · PLAN.md */}
    <Routes>
      <Route element={<RedirectIfAuthed />}>
        <Route element={<AppShell withNav={false} />}>{onboardingRoutes}</Route>
      </Route>
      {/* 수업 공유 링크 — 로그인 전에도 열린다 (인원 수만) */}
      <Route element={<AppShell withNav={false} />}>
        <Route path="/c/:school/:code" element={<ClassRoomPage />} />
      </Route>
      <Route path="/c/:school/:code/qr" element={<ClassQrPage />} />
      <Route element={<RequireAuth />}>
        {/* 탭 첫 화면 — 아래 탭 바 (Home · Explore · Schedule · Social · Profile) */}
        <Route element={<AppShell />}>
          {homeExploreTabRoutes}
          {scheduleTabRoutes}
          {socialTabRoutes}
          {meTabRoutes}
        </Route>
        {/* 하위 화면 — 탭 바 없음, ‹ 뒤로 머리 */}
        <Route element={<AppShell withNav={false} />}>
          {homeExploreSubRoutes}
          {scheduleSubRoutes}
          {socialSubRoutes}
          {meSubRoutes}
          {legacyRoutes}
        </Route>
      </Route>
      {legacyPublicRoutes}
      {/* 아직 안 연 학교 미리보기 — 주소로만 (메뉴에 없음) · server/preview.ts */}
      <Route element={<AppShell withNav={false} />}>
        <Route path="/preview" element={<PreviewListPage />} />
        <Route path="/preview/jobs" element={<PreviewJobsPage />} />
        <Route path="/preview/:id" element={<PreviewSchoolPage />} />
      </Route>
      {/* Privacy Policy · Terms of Use — public, signed in or not (App Store Connect links here; server/legal.ts) */}
      <Route element={<AppShell withNav={false} />}>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        {/* S097 club setup from the link sent to the club's official directory e-mail — no account needed (server/clubs.ts) */}
        <Route path="/club-setup/:token" element={<ClubSetupPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
