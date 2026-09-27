import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAppStore } from '@core/store/useAppStore';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorState } from '@/components/ui';
import { WelcomePage } from '@/pages/onboarding/WelcomePage';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { HomePage } from '@/pages/home/HomePage';
import { MapPage } from '@/pages/map/MapPage';
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
import { SearchPage } from '@/pages/search/SearchPage';
import { ProfileListPage } from '@/pages/profile/ProfileListPage';
import { EditPromptsPage } from '@/pages/profile/EditPromptsPage';
import { TimetablePage } from '@/pages/timetable/TimetablePage';
import { PeoplePage } from '@/pages/people/PeoplePage';
import { PeopleResultsPage } from '@/pages/people/PeopleResultsPage';
import { AroundPage } from '@/pages/people/AroundPage';
import { AdvancedExplorePage } from '@/pages/people/AdvancedExplorePage';
import { SmallTablesPage } from '@/pages/meet/SmallTablesPage';
import { AskNetworkPage } from '@/pages/people/AskNetworkPage';
import { RequestsPage } from '@/pages/people/RequestsPage';
import { RequestDetailPage } from '@/pages/people/RequestDetailPage';
import { PlusPage } from '@/pages/plus/PlusPage';
import { CheckoutPage } from '@/pages/plus/CheckoutPage';
import { CreateGroupPage } from '@/pages/groups/CreateGroupPage';
import { WantsPage } from '@/pages/profile/WantsPage';
import { StatusPage } from '@/pages/profile/StatusPage';
import { StatusCareerPage } from '@/pages/profile/StatusCareerPage';
import { MeetPage } from '@/pages/meet/MeetPage';
import { CreateMeetPage } from '@/pages/meet/CreateMeetPage';
import { FeedPage } from '@/pages/feed/FeedPage';
import { PostDetailPage } from '@/pages/feed/PostDetailPage';
import { PricingPage } from '@/pages/pricing/PricingPage';
import { MyGroupsPage } from '@/pages/profile/MyGroupsPage';
import { PlansPage } from '@/pages/plans/PlansPage';
import { ClassPage } from '@/pages/classes/ClassPage';
import { CreateTogetherPage } from '@/pages/together/CreateTogetherPage';
import { TogetherPage } from '@/pages/together/TogetherPage';
import { OpportunityDetailPage } from '@/pages/opportunities/OpportunityDetailPage';
import { ProfileContextPage } from '@/pages/profile/ProfileContextPage';

function RequireAuth() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const status = useAppStore((s) => s.status);
  const location = useLocation();
  if (status === 'idle' || status === 'loading') return <SplashScreen />;
  if (status === 'error') return <FullError />;
  if (!currentUserId) return <Navigate to="/welcome" replace state={{ from: location }} />;
  return <Outlet />;
}

function RedirectIfAuthed() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const status = useAppStore((s) => s.status);
  if (status === 'idle' || status === 'loading') return <SplashScreen />;
  if (currentUserId) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** /community?tab=... → /feed 또는 /meet?tab=groups */
function CommunityRedirect() {
  const location = useLocation();
  const tab = new URLSearchParams(location.search).get('tab');
  return <Navigate to={tab === 'clubs' ? '/meet?tab=groups' : tab === 'opportunities' ? '/' : '/feed'} replace />;
}

function SplashScreen() {
  return (
    <div className="h-full grid place-items-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-3xl bg-primary grid place-items-center text-white text-3xl shadow-[var(--shadow-float)]">📍</div>
        <div className="text-[15px] font-bold">AroundU</div>
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
    <Routes>
      <Route element={<RedirectIfAuthed />}>
        <Route element={<AppShell withNav={false} />}>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/onboarding/*" element={<OnboardingPage />} />
        </Route>
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/people" element={<PeoplePage />} />
          {/* v2: 학교로 나누지 않는다 — 이전 Beyond/고급 검색은 찾기 탭으로 */}
          <Route path="/people/beyond" element={<Navigate to="/people?tab=search" replace />} />
          <Route path="/people/search" element={<Navigate to="/people?tab=search" replace />} />
          <Route path="/people/results" element={<PeopleResultsPage />} />
          <Route path="/meet" element={<MeetPage />} />
          <Route path="/meet/create" element={<CreateMeetPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/feed/:id" element={<PostDetailPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/profile/groups" element={<MyGroupsPage />} />
          {/* 이전 구조 호환 */}
          <Route path="/discover" element={<Navigate to="/meet" replace />} />
          <Route path="/community" element={<CommunityRedirect />} />
          <Route path="/opportunities" element={<Navigate to="/" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route element={<AppShell withNav={false} />}>
          {/* 사람 찾아보기 — 가까운 네트워크에서 찾고, 건너건너 물어보기 */}
          <Route path="/people/ask" element={<AskNetworkPage />} />
          <Route path="/people/requests" element={<RequestsPage />} />
          <Route path="/people/requests/:id" element={<RequestDetailPage />} />
          <Route path="/plus" element={<PlusPage />} />
          <Route path="/people/around" element={<AroundPage />} />
          <Route path="/people/advanced" element={<AdvancedExplorePage />} />
          <Route path="/meet/tables" element={<SmallTablesPage />} />
          <Route path="/plus/checkout" element={<CheckoutPage />} />
          <Route path="/groups/new" element={<CreateGroupPage />} />
          <Route path="/profile/wants" element={<WantsPage />} />
          <Route path="/profile/status" element={<StatusPage />} />
          <Route path="/profile/status/career" element={<StatusCareerPage />} />
          <Route path="/timetable" element={<TimetablePage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/classes/:courseName" element={<ClassPage />} />
          <Route path="/together/new" element={<CreateTogetherPage />} />
          <Route path="/together/:id" element={<TogetherPage />} />
          <Route path="/search" element={<SearchPage />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
