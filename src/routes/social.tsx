import { Navigate, Route, useParams, useSearchParams } from 'react-router-dom';
import { SocialForYouPage, SocialPeoplePage, SocialFeedPage } from '@/pages/social/SocialPage';
import { PostPage } from '@/pages/social/PostPage';
import { MeetPage } from '@/pages/meet/MeetPage';
import { SmallTablesPage } from '@/pages/meet/SmallTablesPage';
import { SearchPage } from '@/pages/home/SearchPage';
import { ActivityDetailPage } from '@/pages/activity/ActivityDetailPage';
import { ManageActivityPage } from '@/pages/activity/ManageActivityPage';
import { MeetupLocationPage } from '@/pages/activity/MeetupLocationPage';
import { CreateActivityPage } from '@/pages/create/CreateActivityPage';
import { MeetupFormPage } from '@/pages/create/MeetupFormPage';
import { QuickMeetup } from '@/pages/create/QuickMeetup';
import { CreatePostPage } from '@/pages/create/CreatePostPage';
import { PersonPage } from '@/pages/people/PersonPage';
import { SuggestMeetupPage } from '@/pages/people/SuggestMeetupPage';
import { PeopleResultsPage, PeopleFiltersPage } from '@/pages/people/PeopleResultsPage';
import { useViewer } from '@/hooks/useViewer';
import { PLACE_PRESETS } from '@core/data/places';
import { Redirect } from './redirects';

/** 즉석 모임 (S045 quick path) — 내 학교 장소 목록으로 */
function QuickRoute() {
  const v = useViewer();
  const [q] = useSearchParams();
  const school = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  return <QuickMeetup presets={PLACE_PRESETS[school] ?? PLACE_PRESETS.s_berkeley} inviteId={q.get('invite')} />;
}

/** /meetups/new — S045 (quick=1 이면 즉석 모임) */
function NewMeetupRoute() {
  const [q] = useSearchParams();
  return q.get('quick') ? <QuickRoute /> : <MeetupFormPage mode="meetup" />;
}

/**
 * 예전 만들기 주소 /create/activity?… — 다른 화면이 아직 이 주소로 연다.
 * 즉석(now=1) → 즉석 모임, 동아리 행사·Study Crew·팀원 모집·공고에서 시작한 것 → 예전 양식(그 전용 칸이 있다), 나머지 → 새 양식 (S045 / S050)
 */
function CreateActivityRoute() {
  const [q] = useSearchParams();
  if (q.get('now')) return <QuickRoute />;
  if (q.get('crew') || q.get('team') || q.get('opportunity') || q.get('event') || q.get('kind') === 'org_event') return <CreateActivityPage />;
  return <MeetupFormPage mode={q.get('kind') === 'group' && !q.get('meetup') ? 'activity' : 'meetup'} />;
}

/** 수정 — 학생 모임은 새 양식 (S047), 동아리 행사·Study Crew·팀 모집은 예전 양식 */
function EditActivityRoute() {
  const { id } = useParams();
  const v = useViewer();
  const a = v.visibleActivities.find((x) => x.id === id);
  if (a && (a.kind === 'org_event' || a.courseName || a.rolesNeeded || a.opportunityId)) return <CreateActivityPage />;
  return <MeetupFormPage mode="meetup" />;
}

/** WP4 Social · Meetups · Feed · People (S037–S061). 파일 주인: WP4 */
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
    <Route path="/meetups/new" element={<NewMeetupRoute />} />            {/* S045 (+ quick=1) */}
    <Route path="/activities/new" element={<MeetupFormPage mode="activity" />} /> {/* S050 */}
    <Route path="/create/activity" element={<CreateActivityRoute />} />
    <Route path="/create/post" element={<CreatePostPage />} />            {/* S051 */}
    <Route path="/posts/new" element={<Redirect to="/create/post" />} />
    <Route path="/posts/:id" element={<PostPage />} />                    {/* S052 */}
    <Route path="/activities/:id" element={<ActivityDetailPage />} />     {/* S046 */}
    <Route path="/activities/:id/edit" element={<EditActivityRoute />} /> {/* S047 */}
    <Route path="/activities/:id/manage" element={<ManageActivityPage />} /> {/* S048 */}
    <Route path="/activities/:id/location" element={<MeetupLocationPage />} /> {/* S053 */}
    <Route path="/social/small-tables" element={<SmallTablesPage />} />   {/* S049 */}
    <Route path="/social/people/results" element={<PeopleResultsPage />} /> {/* S058 */}
    <Route path="/social/people/filters" element={<PeopleFiltersPage />} /> {/* S059 */}
    <Route path="/social/people/common" element={<PeopleResultsPage mode="common" />} /> {/* S061 */}
    <Route path="/social/people/explore" element={<Navigate to="/social/people/results" replace />} />
    <Route path="/social/more" element={<Navigate to="/social" replace />} /> {/* old "who's free" page, no entry point left */}
    <Route path="/users/:id" element={<PersonPage />} />                  {/* S054 */}
    <Route path="/users/:id/suggest" element={<SuggestMeetupPage />} />   {/* S055 */}
    <Route path="/search" element={<SearchPage />} />                     {/* S056 */}
  </>
);
