import { LumiHome, LumiExplore, LumiSocial, LumiProfile, LumiSaved, LumiPrivacy } from '@/pages/lumi/Experience';
import { BRAND } from '@core/brand';
import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAppStore } from '@core/store/useAppStore';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorState } from '@/components/ui';
import { WelcomePage } from '@/pages/onboarding/WelcomePage';
import { LumiOnboarding } from '@/pages/lumi/Onboarding';
import { MapPage } from '@/pages/map/MapPage';
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
import { PeopleResultsPage } from '@/pages/people/PeopleResultsPage';
import { AroundPage } from '@/pages/people/AroundPage';
import { UnexpectedPage } from '@/pages/people/UnexpectedPage';
import { SecondDegreePage } from '@/pages/people/SecondDegreePage';
import { OpenToPage } from '@/pages/profile/OpenToPage';
import { SavedPeoplePage } from '@/pages/profile/SavedPeoplePage';
import { NaturalSearchPage } from '@/pages/people/NaturalSearchPage';
import { AiChatPage } from '@/pages/ai/AiChatPage';
import { RespondPage } from '@/pages/people/RespondPage';
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
import { CreateMeetPage } from '@/pages/meet/CreateMeetPage';
import { PostDetailPage } from '@/pages/feed/PostDetailPage';
import { PricingPage } from '@/pages/pricing/PricingPage';
import { MyGroupsPage } from '@/pages/profile/MyGroupsPage';
import { PlansPage } from '@/pages/plans/PlansPage';
import { ClassPage } from '@/pages/classes/ClassPage';
import { CreateTogetherPage } from '@/pages/together/CreateTogetherPage';
import { TogetherPage } from '@/pages/together/TogetherPage';
import { OpportunityDetailPage } from '@/pages/opportunities/OpportunityDetailPage';
import { ProfileContextPage } from '@/pages/profile/ProfileContextPage';

/** 졸업생에게는 시간표·수업·같이 계획하기(시간 투표 만들기)가 없다 — 옛 링크로 들어오면 모임으로 */
function StudentOnly({ children }: { children: React.ReactElement }) {
  return children;
}

function RequireAuth() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const status = useAppStore((s) => s.status);
  // 계정 삭제 직후(로그아웃 전) 익명화된 "나"가 실시간 패치로 들어와도 화면을 그리지 않는다
  const meDeleted = useAppStore((s) => !!s.users.find((u) => u.id === s.currentUserId)?.deleted);
  const location = useLocation();
  if (status === 'idle' || status === 'loading') return <SplashScreen />;
  if (status === 'error') return <FullError />;
  if (!currentUserId) return <Navigate to="/welcome" replace state={{ from: location }} />;
  if (meDeleted) return <SplashScreen />;
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

function LegacySocial({ section }: { section: string }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search); params.set('section', section);
  return <Navigate to={'/social?' + params.toString()} replace />;
}

function SplashScreen() {
  return (
    <div className="h-full grid place-items-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-3xl bg-primary grid place-items-center text-white text-3xl shadow-[var(--shadow-float)]">📍</div>
        <div className="text-[15px] font-bold">{BRAND.name}</div>
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
          <Route path="/onboarding/*" element={<LumiOnboarding />} />
        </Route>
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<LumiHome />} />
          <Route path="/explore" element={<LumiExplore />} />
          <Route path="/social" element={<LumiSocial />} />
          <Route path="/schedule" element={<TimetablePage />} />
          <Route path="/profile/discovery" element={<LumiPrivacy />} />
          <Route path="/saved-content" element={<LumiSaved />} />
          <Route path="/people" element={<LegacySocial section="people" />} />
          {/* v2: 학교로 나누지 않는다 — 이전 Beyond/고급 검색은 찾기 탭으로 */}
          <Route path="/people/beyond" element={<Navigate to="/people?tab=search" replace />} />
          <Route path="/people/search" element={<Navigate to="/people?tab=search" replace />} />
          <Route path="/people/results" element={<PeopleResultsPage />} />
          <Route path="/meet" element={<LegacySocial section="meetups" />} />
          <Route path="/meet/create" element={<CreateMeetPage />} />
          <Route path="/feed" element={<LegacySocial section="feed" />} />
          <Route path="/feed/:id" element={<PostDetailPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/profile/groups" element={<MyGroupsPage />} />
          {/* 이전 구조 호환 */}
          <Route path="/discover" element={<Navigate to="/explore" replace />} />
          <Route path="/community" element={<CommunityRedirect />} />
          <Route path="/opportunities" element={<Navigate to="/explore?category=Opportunities" replace />} />
          <Route path="/profile" element={<LumiProfile />} />
        </Route>
        <Route element={<AppShell withNav={false} />}>
          {/* 사람 찾아보기 — 가까운 네트워크에서 찾고, 건너건너 물어보기 */}
          <Route path="/people/ask" element={<AskNetworkPage />} />
          <Route path="/people/requests" element={<RequestsPage />} />
          <Route path="/people/requests/:id" element={<RequestDetailPage />} />
          <Route path="/plus" element={<PlusPage />} />
          <Route path="/people/around" element={<AroundPage />} />
          <Route path="/people/unexpected" element={<UnexpectedPage />} />
          <Route path="/people/second" element={<SecondDegreePage />} />
          <Route path="/profile/open-to" element={<OpenToPage />} />
          <Route path="/profile/saved" element={<SavedPeoplePage />} />
          <Route path="/people/find" element={<NaturalSearchPage />} />
          <Route path="/ai" element={<AiChatPage />} />
          <Route path="/people/requests/:id/respond" element={<RespondPage />} />
          <Route path="/people/advanced" element={<AdvancedExplorePage />} />
          <Route path="/meet/tables" element={<SmallTablesPage />} />
          <Route path="/plus/checkout" element={<CheckoutPage />} />
          <Route path="/groups/new" element={<CreateGroupPage />} />
          <Route path="/profile/wants" element={<WantsPage />} />
          <Route path="/profile/status" element={<StatusPage />} />
          <Route path="/profile/status/career" element={<StatusCareerPage />} />
          <Route path="/timetable" element={<Navigate to="/schedule" replace />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/classes/:courseName" element={<StudentOnly><ClassPage /></StudentOnly>} />
          <Route path="/together/new" element={<StudentOnly><CreateTogetherPage /></StudentOnly>} />
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
