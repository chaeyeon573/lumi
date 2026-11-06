import { Route } from 'react-router-dom';
import { HomeDashboard } from '@/pages/home/HomeDashboard';
import { ExploreIndex, ExplorePage } from '@/pages/explore/ExplorePage';
import { GymPage } from '@/pages/campus/GymPage';
import { DiningPage } from '@/pages/campus/DiningPage';
import { OpportunityDetailPage } from '@/pages/opportunities/OpportunityDetailPage';
import { OrgPage } from '@/pages/org/OrgPage';
import { CreateGroupPage } from '@/pages/org/CreateGroupPage';
import { MembershipRequestsPage } from '@/pages/org/MembershipRequestsPage';
import { ClubSetupPage } from '@/pages/org/ClubSetupPage';

/** WP2 Home + Explore + 상세 (S012–S026, S089–S091). 파일 주인: WP2 */
export const homeExploreTabRoutes = (
  <>
    <Route path="/" element={<HomeDashboard />} />                          {/* S012–S014 */}
    <Route path="/explore" element={<ExploreIndex />} />
    <Route path="/explore/:section" element={<ExplorePage />} />          {/* S017–S019 */}
  </>
);
export const homeExploreSubRoutes = (
  <>
    <Route path="/recreation" element={<GymPage />} />                    {/* S015 RSF 혼잡도 */}
    <Route path="/dining" element={<DiningPage />} />                     {/* S016 학식 */}
    <Route path="/opportunities/:id" element={<OpportunityDetailPage />} /> {/* S020 · S021 · S090 */}
    <Route path="/orgs/new" element={<CreateGroupPage />} />               {/* S026 */}
    <Route path="/orgs/:id" element={<OrgPage />} />                      {/* S022–S025 (?tab=about|feed|events|members) */}
    <Route path="/orgs/:id/requests" element={<MembershipRequestsPage />} /> {/* S091 — who asked (name · year · major), message them */}
    <Route path="/orgs/:id/setup" element={<ClubSetupPage />} />          {/* S097 — organizer edits how to join, logo, cover */}
  </>
);
