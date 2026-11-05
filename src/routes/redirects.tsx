import { Navigate, Route, useLocation, useParams } from 'react-router-dom';
import { useAppStore } from '@core/store/useAppStore';

/**
 * 예전 주소 → 새 주소. 알림·푸시·공유 링크에 남은 예전 주소가 깨지지 않게 (?쿼리는 그대로).
 * 파일 주인: 기초(foundation). 작업 묶음은 줄을 덧붙이기만 한다 — docs/design/harness-a/PLAN.md
 */
export function Redirect({ to }: { to: string }) {
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

/** 만들기 주소 — 아직은 하나의 만들기 화면(CreateActivityPage)을 종류 쿼리로 연다 (WP4 가 화면을 나눈다) */
export function CreateRedirect({ kind }: { kind: 'meetup' | 'activity' }) {
  const { search } = useLocation();
  const q = new URLSearchParams(search);
  q.set('kind', q.get('kind') ?? 'group');
  if (kind === 'meetup') q.set('meetup', '1');
  return <Navigate to={`/create/activity?${q}`} replace />;
}

/** 내 글 — 아직 따로 화면이 없어 내 공개 프로필(글 목록 포함)로 */
export function MyPostsRedirect() {
  const me = useAppStore((s) => s.currentUserId);
  return <Navigate to={me ? `/users/${me}` : '/profile'} replace />;
}

/** 로그인한 사람의 예전 주소 (탭 바 없는 틀 안) */
export const legacyRoutes = (
  <>
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
    {/* Harness A 에 없는 기능 — 화면 진입점 없음 (서버·데이터는 그대로). SCREENS.md "What left the navigation" */}
    <Route path="/seats" element={<Navigate to="/schedule" replace />} />
    <Route path="/academic-calendar" element={<Navigate to="/schedule" replace />} />
    <Route path="/map" element={<Navigate to="/explore/events" replace />} />
    <Route path="/rides/*" element={<Navigate to="/" replace />} />
  </>
);

/** 로그인 여부와 상관없는 예전 공유 링크 */
export const legacyPublicRoutes = (
  <>
    <Route path="/r/:id" element={<Navigate to="/" replace />} />
    <Route path="/p/:id" element={<Navigate to="/schedule/plans" replace />} />
  </>
);
