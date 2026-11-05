import { Route } from 'react-router-dom';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { EditProfilePage } from '@/pages/profile/EditProfilePage';
import { EditPromptsPage } from '@/pages/profile/EditPromptsPage';
import { ProfileContextPage } from '@/pages/profile/ProfileContextPage';
import { ProfileListPage } from '@/pages/profile/ProfileListPage';
import { MyOrgsPage } from '@/pages/org/MyOrgsPage';
import { ChatInboxPage } from '@/pages/chat/ChatInboxPage';
import { ChatRoomPage } from '@/pages/chat/ChatRoomPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { PrivacySettingsPage } from '@/pages/settings/PrivacySettingsPage';
import { SafetySettingsPage } from '@/pages/settings/SafetySettingsPage';
import { MyPostsRedirect, Redirect } from './redirects';

/** WP5 Messages + Profile + Settings (S068–S088, S092–S096). 파일 주인: WP5 */
export const meTabRoutes = (
  <>
    <Route path="/profile" element={<ProfilePage />} />                   {/* S071 */}
  </>
);
export const meSubRoutes = (
  <>
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
  </>
);
