import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAppStore } from '@core/store/useAppStore';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorState } from '@/components/ui';
import { WelcomePage } from '@/pages/onboarding/WelcomePage';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { StartPage } from '@/pages/onboarding/StartPage';
import { PreviewListPage, PreviewSchoolPage, PreviewJobsPage } from '@/pages/preview/PreviewPage';
import { HomePage } from '@/pages/home/HomePage';
import { HomeDashboard } from '@/pages/home/HomeDashboard';
import { SocialForYouPage, SocialPeoplePage, SocialFeedPage } from '@/pages/social/SocialPage';
import { ScheduleTab } from '@/pages/schedule/ScheduleTab';
import { MeetPage } from '@/pages/meet/MeetPage';
import { MyOrgsPage } from '@/pages/org/MyOrgsPage';
import { ExploreIndex, ExplorePage } from '@/pages/explore/ExplorePage';
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
import { OpportunityDetailPage } from '@/pages/opportunities/OpportunityDetailPage';
import { ProfileContextPage } from '@/pages/profile/ProfileContextPage';
import { ClassRoomPage } from '@/pages/classes/ClassRoomPage';
import { ClassQrPage } from '@/pages/classes/ClassQrPage';
import { StudyGroupPage } from '@/pages/classes/StudyGroupPage';
import { DiningPage } from '@/pages/campus/DiningPage';
import { GymPage } from '@/pages/campus/GymPage';
import { takeReturnTo } from '@/components/classes/ClassLink';
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
  return <div className="h-full grid place-items-center"><ErrorState message={error ?? undefined} onRetry={init} /></div>;
}

/** 예전 주소 → 새 주소 (?쿼리는 그대로). 알림·푸시·공유 링크에 남은 예전 주소가 깨지지 않게 */
function Redirect({ to }: { to: string }) {
  const { search } = useLocation();
  const params = useParams();
  const path = to.replace(/:(\w+)/g, (_, k: string) => encodeURIComponent(params[k] ?? ''));
  return <Navigate to={`${path}${search}`} replace />;
}

/** /community?tab=opportunities&sub=… → Explore, 그 밖(피드) → Social › Feed */
function CommunityRedirect() {
  const { search } = useLocation();
  const q = new URLSearchParams(search);
  if (q.get('tab') !== 'opportunities' && q.get('tab') !== 'clubs') return <Navigate to="/social/feed" replace />;
  const sub = q.get('sub');
  q.delete('tab');
  const section = sub === 'clubs' ? 'clubs' : sub === 'event' ? 'events' : 'opportunities';
  return <Navigate to={`/explore/${section}${q.toString() ? `?${q}` : ''}`} replace />;
}

/** 만들기 주소 — 아직은 하나의 만들기 화면(CreateActivityPage)을 종류 쿼리로 연다 (Social 작업 묶음이 화면을 나눈다) */
function CreateRedirect({ kind }: { kind: 'meetup' | 'activity' }) {
  const { search } = useLocation();
  const q = new URLSearchParams(search);
  q.set('kind', q.get('kind') ?? 'group');
  if (kind === 'meetup') q.set('meetup', '1');
  return <Navigate to={`/create/activity?${q}`} replace />;
}

/** 내 글 — 아직 따로 화면이 없어 내 공개 프로필(글 목록 포함)로 */
function MyPostsRedirect() {
  const me = useAppStore((s) => s.currentUserId);
  return <Navigate to={me ? `/users/${me}` : '/profile'} replace />;
}

export default function App() {
  const init = useAppStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <>
    {/* iPhone 앱(apps/shell) 안에서만 — 딥링크·푸시·상태 표시줄 */}
    {isNativeShell() && <NativeBridge />}
    {/* Harness A 주소 지도 — docs/design/harness-a/SCREENS.md (화면 번호 S0xx) */}
    <Routes>
      <Route element={<RedirectIfAuthed />}>
        <Route element={<AppShell withNav={false} />}>
          <Route path="/welcome" element={<WelcomePage />} />                    {/* S001 */}
          <Route path="/login" element={<Redirect to="/welcome?signin=1" />} />  {/* S002 (지금은 Welcome 의 이메일 시트) */}
          <Route path="/onboarding/*" element={<OnboardingPage />} />
          <Route path="/start" element={<StartPage />} />                        {/* S003–S011 */}
          <Route path="/start/:step" element={<StartPage />} />
        </Route>
      </Route>
      {/* 수업 공유 링크 — 로그인 전에도 열린다 (인원 수만) */}
      <Route element={<AppShell withNav={false} />}>
        <Route path="/c/:school/:code" element={<ClassRoomPage />} />
      </Route>
      <Route path="/c/:school/:code/qr" element={<ClassQrPage />} />
      <Route element={<RequireAuth />}>
        {/* 탭 첫 화면 — 아래 탭 바 */}
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeDashboard />} />                          {/* S012–S014 */}
          <Route path="/explore" element={<ExploreIndex />} />
          <Route path="/explore/:section" element={<ExplorePage />} />          {/* S017–S019 */}
          <Route path="/schedule" element={<ScheduleTab />} />                  {/* S027–S028 */}
          <Route path="/social" element={<SocialForYouPage />} />               {/* S037 · S041 */}
          <Route path="/social/meetups" element={<MeetPage />} />               {/* S038 · S042 */}
          <Route path="/social/people" element={<SocialPeoplePage />} />        {/* S039 · S043 */}
          <Route path="/social/feed" element={<SocialFeedPage />} />            {/* S040 · S044 */}
          <Route path="/profile" element={<ProfilePage />} />                   {/* S071 */}
        </Route>
        {/* 하위 화면 — 탭 바 없음, ‹ 뒤로 머리 */}
        <Route element={<AppShell withNav={false} />}>
          <Route path="/recreation" element={<GymPage />} />                    {/* S015 RSF 혼잡도 */}
          <Route path="/dining" element={<DiningPage />} />                     {/* S016 학식 */}
          <Route path="/opportunities/:id" element={<OpportunityDetailPage />} /> {/* S020 · S021 · S090 */}
          <Route path="/orgs/:id" element={<OrgPage />} />                      {/* S022–S025 · S091 */}
          <Route path="/schedule/classes" element={<TimetablePage />} />        {/* S029 */}
          <Route path="/classes/:courseName" element={<ClassPage />} />         {/* S030 */}
          <Route path="/study/:id" element={<StudyGroupPage />} />
          <Route path="/schedule/plans" element={<PlansPage />} />              {/* S031 */}
          <Route path="/schedule/meeting/new" element={<CreateTogetherPage />} /> {/* S032–S033 */}
          <Route path="/together/new" element={<CreateTogetherPage />} />
          <Route path="/together/:id" element={<TogetherPage />} />             {/* S034–S036 */}
          <Route path="/meetups/new" element={<CreateRedirect kind="meetup" />} /> {/* S045 */}
          <Route path="/activities/new" element={<CreateRedirect kind="activity" />} /> {/* S050 */}
          <Route path="/create/activity" element={<CreateActivityPage />} />
          <Route path="/create/post" element={<CreatePostPage />} />            {/* S051 */}
          <Route path="/posts/new" element={<Redirect to="/create/post" />} />
          <Route path="/activities/:id" element={<ActivityDetailPage />} />     {/* S046 · S053 */}
          <Route path="/activities/:id/edit" element={<CreateActivityPage />} /> {/* S047 */}
          <Route path="/activities/:id/manage" element={<ManageActivityPage />} /> {/* S048 */}
          <Route path="/social/people/explore" element={<HomePage />} />        {/* S058 (임시) */}
          <Route path="/social/more" element={<DiscoverPage />} />
          <Route path="/users/:id" element={<PersonPage />} />                  {/* S054 */}
          <Route path="/search" element={<SearchPage />} />                     {/* S056 */}
          <Route path="/chats" element={<ChatInboxPage />} />                   {/* S068 */}
          <Route path="/chats/:roomId" element={<ChatRoomPage />} />            {/* S069 */}
          <Route path="/notifications" element={<NotificationsPage />} />       {/* S070 · S095 */}
          <Route path="/profile/edit" element={<EditProfilePage />} />          {/* S072 */}
          <Route path="/profile/prompts" element={<EditPromptsPage />} />       {/* S073 */}
          <Route path="/profile/communities" element={<MyOrgsPage />} />        {/* S074 (임시) */}
          <Route path="/profile/saved" element={<Redirect to="/explore/opportunities?sub=saved" />} /> {/* S076 (임시) */}
          <Route path="/profile/posts" element={<MyPostsRedirect />} />
          <Route path="/profile/context" element={<ProfileContextPage />} />
          <Route path="/profile/:list" element={<ProfileListPage />} />         {/* S075 friends · followers · following */}
          <Route path="/settings" element={<SettingsPage />} />                 {/* S084 */}
          <Route path="/settings/privacy" element={<PrivacySettingsPage />} />  {/* S085 */}
          <Route path="/settings/safety" element={<SafetySettingsPage />} />    {/* S086 */}

          {/* 예전 주소 → 새 주소 */}
          <Route path="/meet" element={<Redirect to="/social" />} />
          <Route path="/meet/meetups" element={<Redirect to="/social/meetups" />} />
          <Route path="/meet/more" element={<Redirect to="/social/more" />} />
          <Route path="/people" element={<Redirect to="/social/people" />} />
          <Route path="/people/explore" element={<Redirect to="/social/people/explore" />} />
          <Route path="/feed" element={<Redirect to="/social/feed" />} />
          <Route path="/discover" element={<Redirect to="/social" />} />
          <Route path="/ask" element={<Redirect to="/social" />} />
          <Route path="/community" element={<CommunityRedirect />} />
          <Route path="/opportunities" element={<Redirect to="/explore/opportunities" />} />
          <Route path="/timetable" element={<Redirect to="/schedule/classes" />} />
          <Route path="/plans" element={<Redirect to="/schedule/plans" />} />
          <Route path="/plans/new" element={<Redirect to="/schedule/meeting/new" />} />
          <Route path="/orgs/mine" element={<Redirect to="/profile/communities" />} />
          <Route path="/gym" element={<Redirect to="/recreation" />} />
          {/* Harness A 에 없는 기능 — 화면 진입점 없음 (서버·데이터는 그대로) */}
          <Route path="/seats" element={<Navigate to="/schedule" replace />} />
          <Route path="/academic-calendar" element={<Navigate to="/schedule" replace />} />
          <Route path="/map" element={<Navigate to="/explore/events" replace />} />
          <Route path="/rides/*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
      <Route path="/r/:id" element={<Navigate to="/" replace />} />
      <Route path="/p/:id" element={<Navigate to="/schedule/plans" replace />} />
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
