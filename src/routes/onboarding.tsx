import { Route } from 'react-router-dom';
import { WelcomePage } from '@/pages/onboarding/WelcomePage';
import { LoginPage } from '@/pages/onboarding/LoginPage';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { StartPage } from '@/pages/onboarding/StartPage';
import { Redirect } from './redirects';

/** WP1 Onboarding (S001–S011) — 로그인 전, 탭 바 없음. 파일 주인: WP1 */
export const onboardingRoutes = (
  <>
    <Route path="/welcome" element={<WelcomePage />} />                    {/* S001 (?signin=1 → /login) */}
    <Route path="/login" element={<LoginPage />} />                        {/* S002 */}
    <Route path="/onboarding/*" element={<OnboardingPage />} />            {/* mock 모드 가입 */}
    <Route path="/start" element={<Redirect to="/start/goals" />} />
    {/* S003 goals · S004–S007 what?p=classes|events|clubs|social · S008 university · S009 discover · S010 communities · S011 about */}
    <Route path="/start/:step" element={<StartPage />} />
  </>
);
