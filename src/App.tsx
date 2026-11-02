import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAppStore } from '@core/store/useAppStore';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorState } from '@/components/ui';
import { WelcomePage } from '@/pages/onboarding/WelcomePage';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { StartPage } from '@/pages/onboarding/StartPage';
import { HomePage } from '@/pages/home/HomePage';
import { HomeDashboard } from '@/pages/home/HomeDashboard';
import { MeetPage } from '@/pages/meet/MeetPage';
import { ExplorePage, ExploreSectionPage } from '@/pages/explore/ExplorePage';
import { MapPage } from '@/pages/map/MapPage';
import { CommunityPage } from '@/pages/community/CommunityPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { EditProfilePage } from '@/pages/profile/EditProfilePage';
import { ActivityDetailPage } from '@/pages/activity/ActivityDetailPage';
import { ManageActivityPage } from '@/pages/activity/ManageActivityPage';
import { CreateActivityPage } from '@/pages/create/CreateActivityPage';
import { CreatePostPage } from '@/pages/create/CreatePostPage';
import { PersonPage } from '@/pages/people/PersonPage';
import { OrgPage } from '@/pages/org/OrgPage';
import { ChatInboxPage } from '@/pages/chat/ChatInboxPage';
import { ChatRoomPage } from '@/pages/chat/ChatRoomPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { PrivacySettingsPage } from '@/pages/settings/PrivacySettingsPage';
import { SafetySettingsPage } from '@/pages/settings/SafetySettingsPage';
import { SearchPage } from '@/pages/home/SearchPage';
import { ProfileListPage } from '@/pages/profile/ProfileListPage';
import { EditPromptsPage } from '@/pages/profile/EditPromptsPage';
import { TimetablePage } from '@/pages/timetable/TimetablePage';
import { DiscoverPage } from '@/pages/discover/DiscoverPage';
import { PlansPage } from '@/pages/plans/PlansPage';
import { ClassPage } from '@/pages/classes/ClassPage';
import { CreateTogetherPage } from '@/pages/together/CreateTogetherPage';
import { TogetherPage } from '@/pages/together/TogetherPage';
import { PlanPage } from '@/pages/plans/PlanPage';
import { CreatePlanPage } from '@/pages/plans/CreatePlanPage';
import { OpportunityDetailPage } from '@/pages/opportunities/OpportunityDetailPage';
import { ProfileContextPage } from '@/pages/profile/ProfileContextPage';
import { AcademicCalendarPage } from '@/pages/academic/AcademicCalendarPage';
import { SeatsPage } from '@/pages/seats/SeatsPage';
import { ClassRoomPage } from '@/pages/classes/ClassRoomPage';
import { ClassQrPage } from '@/pages/classes/ClassQrPage';
import { StudyGroupPage } from '@/pages/classes/StudyGroupPage';
import { DiningPage } from '@/pages/campus/DiningPage';
import { GymPage } from '@/pages/campus/GymPage';
import { takeReturnTo } from '@/components/classes/ClassLink';
import { RidesPage } from '@/pages/rides/RidesPage';
import { PostRidePage } from '@/pages/rides/PostRidePage';
import { RideDetailPage } from '@/pages/rides/RideDetailPage';
import { RideLinkPage } from '@/pages/rides/RideLinkPage';
import { PrivacyPage, TermsPage } from '@/pages/legal/LegalPages';
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
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-3xl bg-primary grid place-items-center text-white text-3xl shadow-[var(--shadow-float)]">📍</div>
        <div className="text-[15px] font-bold">Lumi</div>
        <div className="h-1 w-24 rounded-full bg-line overflow-hidden"><div className="h-full w-1/2 bg-primary animate-pulse" /></div>
      </div>
    </div>
  );
}

function FullError() {
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  return <div className="h-full grid place-items-center"><ErrorState message={error ?? undefined} onRetry={init} /></div>;
}

export default function App() {
  const init = useAppStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <>
    {/* iPhone 앱(apps/shell) 안에서만 — 딥링크·푸시·상태 표시줄 */}
    {isNativeShell() && <NativeBridge />}
    <Routes>
      <Route element={<RedirectIfAuthed />}>
        <Route element={<AppShell withNav={false} />}>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/onboarding/*" element={<OnboardingPage />} />
          <Route path="/start" element={<StartPage />} />
        </Route>
      </Route>
      {/* 수업 공유 링크 — 로그인 전에도 열린다 (인원 수만) */}
      <Route element={<AppShell withNav={false} />}>
        <Route path="/c/:school/:code" element={<ClassRoomPage />} />
      </Route>
      <Route path="/c/:school/:code/qr" element={<ClassQrPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeDashboard />} />
          <Route path="/people" element={<HomePage />} />
          <Route path="/meet" element={<MeetPage />} />
          <Route path="/meet/more" element={<DiscoverPage />} />
          <Route path="/schedule" element={<PlansPage />} />
          <Route path="/discover" element={<Navigate to="/meet" replace />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore/:section" element={<ExploreSectionPage />} />
          <Route path="/opportunities" element={<Navigate to="/community?tab=opportunities" replace />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route element={<AppShell withNav={false} />}>
          <Route path="/timetable" element={<TimetablePage />} />
          <Route path="/academic-calendar" element={<AcademicCalendarPage />} />
          <Route path="/seats" element={<SeatsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/classes/:courseName" element={<ClassPage />} />
          <Route path="/study/:id" element={<StudyGroupPage />} />
          <Route path="/together/new" element={<CreateTogetherPage />} />
          <Route path="/together/:id" element={<TogetherPage />} />
          <Route path="/plans/new" element={<CreatePlanPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/rides" element={<RidesPage />} />
          <Route path="/rides/new" element={<PostRidePage />} />
          <Route path="/rides/:id" element={<RideDetailPage />} />
          <Route path="/ask" element={<Navigate to="/meet" replace />} />
          <Route path="/dining" element={<DiningPage />} />
          <Route path="/gym" element={<GymPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/activities/:id" element={<ActivityDetailPage />} />
          <Route path="/activities/:id/edit" element={<CreateActivityPage />} />
          <Route path="/activities/:id/manage" element={<ManageActivityPage />} />
          <Route path="/create/activity" element={<CreateActivityPage />} />
          <Route path="/create/post" element={<CreatePostPage />} />
          <Route path="/users/:id" element={<PersonPage />} />
          <Route path="/orgs/:id" element={<OrgPage />} />
          <Route path="/chats" element={<ChatInboxPage />} />
          <Route path="/chats/:roomId" element={<ChatRoomPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/profile/prompts" element={<EditPromptsPage />} />
          <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
          <Route path="/profile/context" element={<ProfileContextPage />} />
          <Route path="/profile/:list" element={<ProfileListPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
          <Route path="/settings/safety" element={<SafetySettingsPage />} />
        </Route>
      </Route>
      {/* shareable ride link — teaser when signed out, the ride when signed in */}
      <Route element={<AppShell withNav={false} />}><Route path="/r/:id" element={<RideLinkPage />} /></Route>
      {/* 링크로 묻는 약속 — 앱·계정 없이도 열린다 (로그인했으면 내 이름으로) */}
      <Route element={<AppShell withNav={false} />}>
        <Route path="/p/:id" element={<PlanPage />} />
      </Route>
      {/* Privacy Policy · Terms of Use — public, signed in or not (App Store Connect links here; server/legal.ts) */}
      <Route element={<AppShell withNav={false} />}>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
