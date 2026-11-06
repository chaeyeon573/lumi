import { Route } from 'react-router-dom';
import { ScheduleTab } from '@/pages/schedule/ScheduleTab';
import { ClassFormPage } from '@/pages/schedule/ClassFormPage';
import { CatalogClassPage, ClassPage } from '@/pages/classes/ClassPage';
import { AddClassesPage } from '@/pages/schedule/AddClassesPage';
import { StudyGroupPage } from '@/pages/classes/StudyGroupPage';
import { PlansPage } from '@/pages/plans/PlansPage';
import { CreateTogetherPage } from '@/pages/together/CreateTogetherPage';
import { LocationIdeasPage } from '@/pages/together/LocationIdeasPage';
import { TogetherPage } from '@/pages/together/TogetherPage';
import { FindTimePage } from '@/pages/together/FindTimePage';

/** WP3 Schedule + Planning (S027–S036). 파일 주인: WP3 */
export const scheduleTabRoutes = (
  <>
    <Route path="/schedule" element={<ScheduleTab />} />                  {/* S027–S028 */}
  </>
);
export const scheduleSubRoutes = (
  <>
    <Route path="/schedule/classes" element={<AddClassesPage />} />       {/* S029 add — search the class list */}
    <Route path="/schedule/classes/manual" element={<ClassFormPage />} /> {/* S029 "Can't find it? Add it yourself" */}
    <Route path="/schedule/classes/:id" element={<ClassFormPage />} />    {/* S029 edit */}
    <Route path="/classes/course/:courseId" element={<CatalogClassPage />} /> {/* S030 before adding (catalog course) */}
    <Route path="/classes/:courseName" element={<ClassPage />} />         {/* S030 */}
    <Route path="/study/:id" element={<StudyGroupPage />} />
    <Route path="/schedule/plans" element={<PlansPage />} />              {/* S031 */}
    <Route path="/schedule/meeting/new" element={<CreateTogetherPage />} /> {/* S032 */}
    <Route path="/schedule/meeting/new/places" element={<LocationIdeasPage />} /> {/* S033 */}
    <Route path="/together/new" element={<CreateTogetherPage />} />
    <Route path="/together/:id/find" element={<FindTimePage />} />        {/* S034 */}
    <Route path="/together/:id" element={<TogetherPage />} />             {/* S035 · S036 */}
  </>
);
