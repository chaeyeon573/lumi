import { Route } from 'react-router-dom';
import { SocialForYouPage, SocialPeoplePage, SocialFeedPage } from '@/pages/social/SocialPage';
import { MeetPage } from '@/pages/meet/MeetPage';
import { DiscoverPage } from '@/pages/discover/DiscoverPage';
import { HomePage } from '@/pages/home/HomePage';
import { SearchPage } from '@/pages/home/SearchPage';
import { ActivityDetailPage } from '@/pages/activity/ActivityDetailPage';
import { ManageActivityPage } from '@/pages/activity/ManageActivityPage';
import { CreateActivityPage } from '@/pages/create/CreateActivityPage';
import { CreatePostPage } from '@/pages/create/CreatePostPage';
import { PersonPage } from '@/pages/people/PersonPage';
import { CreateRedirect, Redirect } from './redirects';

/** WP4 Social · Meetups · Feed · People (S037–S067). 파일 주인: WP4 */
export const socialTabRoutes = (
  <>
    <Route path="/social" element={<SocialForYouPage />} />               {/* S037 · S041 */}
    <Route path="/social/meetups" element={<MeetPage />} />               {/* S038 · S042 */}
    <Route path="/social/people" element={<SocialPeoplePage />} />        {/* S039 · S043 */}
    <Route path="/social/feed" element={<SocialFeedPage />} />            {/* S040 · S044 */}
  </>
);
export const socialSubRoutes = (
  <>
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
  </>
);
