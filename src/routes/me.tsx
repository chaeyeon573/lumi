import { Route } from 'react-router-dom';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { EditProfilePage } from '@/pages/profile/EditProfilePage';
import { EditPromptsPage } from '@/pages/profile/EditPromptsPage';
import { ProfileListPage } from '@/pages/profile/ProfileListPage';
import { SavedPage } from '@/pages/profile/SavedPage';
import { SavedPeoplePage } from '@/pages/profile/SavedPeoplePage';
import { LookingForPage, NextChapterPage, OpenToPage, PreferencesPage, StudentStatusPage } from '@/pages/profile/PreferencePages';
import { MyOrgsPage } from '@/pages/org/MyOrgsPage';
import { ChatInboxPage } from '@/pages/chat/ChatInboxPage';
import { ChatRoomPage } from '@/pages/chat/ChatRoomPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { DiscoveryPage } from '@/pages/settings/DiscoveryPage';
import { PrivacySettingsPage } from '@/pages/settings/PrivacySettingsPage';
import { SafetySettingsPage } from '@/pages/settings/SafetySettingsPage';
import { AccountSecurityPage, BlockedAccountsPage, MyReportsPage, NotificationSettingsPage } from '@/pages/settings/SafetySubPages';
import { BlockPage, ReportPage } from '@/pages/settings/ReportBlockPages';
import { VerifyIdPage } from '@/pages/settings/VerifyIdPage';
import { MyPostsRedirect, Redirect } from './redirects';

/** WP5 Messages + Profile + Settings (S068–S086, S092–S096). 파일 주인: WP5. Lumi+ (S087·S088) 는 사장님 결정 전까지 없다 */
export const meTabRoutes = (
  <>
    <Route path="/profile" element={<ProfilePage />} />                   {/* S071 */}
  </>
);
export const meSubRoutes = (
  <>
    <Route path="/chats" element={<ChatInboxPage />} />                   {/* S068 (?tab=direct|groups|requests) */}
    <Route path="/verify-id" element={<VerifyIdPage />} />                {/* student ID photo — send again after sign-up (server/idverify.ts) */}
    <Route path="/chats/:roomId" element={<ChatRoomPage />} />            {/* S069 */}
    <Route path="/notifications" element={<NotificationsPage />} />       {/* S070 · S095 */}
    <Route path="/profile/edit" element={<EditProfilePage />} />          {/* S072 */}
    <Route path="/profile/prompts" element={<EditPromptsPage />} />       {/* S073 */}
    <Route path="/profile/communities" element={<MyOrgsPage />} />        {/* S074 (?tab=member) */}
    <Route path="/profile/saved" element={<SavedPage />} />               {/* S076 · S096 (?tab=events|clubs) */}
    <Route path="/profile/saved-people" element={<SavedPeoplePage />} />  {/* S077 */}
    <Route path="/profile/likes" element={<Redirect to="/profile/saved-people" />} />
    <Route path="/profile/preferences" element={<PreferencesPage />} />   {/* S078 */}
    <Route path="/profile/looking-for" element={<LookingForPage />} />    {/* S079 */}
    <Route path="/profile/open-to" element={<OpenToPage />} />            {/* S080 */}
    <Route path="/profile/status" element={<StudentStatusPage />} />      {/* S081 */}
    <Route path="/profile/next-chapter" element={<NextChapterPage />} />  {/* S082 */}
    <Route path="/profile/context" element={<Redirect to="/profile/preferences" />} />
    <Route path="/profile/posts" element={<MyPostsRedirect />} />
    <Route path="/profile/:list" element={<ProfileListPage />} />         {/* S075 friends · followers · following */}
    <Route path="/settings" element={<SettingsPage />} />                 {/* S084 */}
    <Route path="/settings/discovery" element={<DiscoveryPage />} />      {/* S083 */}
    <Route path="/settings/privacy" element={<PrivacySettingsPage />} />  {/* S085 */}
    <Route path="/settings/safety" element={<SafetySettingsPage />} />    {/* S086 */}
    <Route path="/settings/blocked" element={<BlockedAccountsPage />} />
    <Route path="/settings/reports" element={<MyReportsPage />} />
    <Route path="/settings/security" element={<AccountSecurityPage />} />
    <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
    <Route path="/report/:type/:id" element={<ReportPage />} />           {/* S092 */}
    <Route path="/users/:id/block" element={<BlockPage />} />             {/* S093 */}
  </>
);
