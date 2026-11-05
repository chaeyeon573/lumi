import { Route } from 'react-router-dom';
import { WelcomePage } from '@/pages/onboarding/WelcomePage';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { StartPage } from '@/pages/onboarding/StartPage';
import { Redirect } from './redirects';

/** WP1 Onboarding (S001–S011) — 로그인 전, 탭 바 없음. 파일 주인: WP1 */
export const onboardingRoutes = (
  <>
    <Route path="/welcome" element={<WelcomePage />} />                    {/* S001 */}
    <Route path="/login" element={<Redirect to="/welcome?signin=1" />} />  {/* S002 (지금은 Welcome 의 이메일 시트) */}
    <Route path="/onboarding/*" element={<OnboardingPage />} />            {/* mock 모드 가입 */}
    <Route path="/start" element={<StartPage />} />                        {/* S003–S011 */}
    <Route path="/start/:step" element={<StartPage />} />
  </>
);
