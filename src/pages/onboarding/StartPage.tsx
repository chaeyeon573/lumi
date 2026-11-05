import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@core/api';
import type { School } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { entryYearFor } from '@core/lib/signup';
import { OnboardingHeader } from '@/components/ha';
import { takeReturnTo } from '@/lib/returnTo';
import { DEFAULT_FV } from './OnboardingPage';
import { STEPS, isStep, loadDraft, saveDraft, uniq, type Draft, type Step } from './steps/shared';
import { GOALS, GoalsStep } from './steps/GoalsStep';
import { PREVIEWS, WhatStep, isPreview, type Preview } from './steps/WhatStep';
import { UniversityStep } from './steps/UniversityStep';
import { DiscoverStep, TOPICS } from './steps/DiscoverStep';
import { COMMUNITIES, CommunitiesStep } from './steps/CommunitiesStep';
import { AboutStep } from './steps/AboutStep';

/** Steps that need the school first (search, e-mail domain) — opened directly without one, they go back to the university step */
const NEEDS_SCHOOL: Step[] = ['discover', 'communities', 'about'];

/**
 * Sign-up (WP1, Lumi Harness A S003–S011): /start/goals → /start/what?p=… → /start/university → /start/discover →
 * /start/communities → /start/about → Home. The step lives in the URL (survives a reload); the answers live in
 * sessionStorage until the account exists. Remote API only — mock mode signs up through /onboarding (OnboardingPage).
 */
export function StartPage() {
  const { step: raw } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const [d, setD] = useState<Draft>(loadDraft);
  const [schools, setSchools] = useState<School[]>([]);
  useEffect(() => { saveDraft(d); }, [d]);
  useEffect(() => { void api.schools.search('').then(setSchools).catch(() => setSchools([])); }, []);
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  if (!isStep(raw)) return <Navigate to="/start/goals" replace />;
  const step = raw;
  if (NEEDS_SCHOOL.includes(step) && (!d.schoolId || !d.role)) return <Navigate to="/start/university" replace />;

  const idx = STEPS.indexOf(step);
  const p: Preview = isPreview(params.get('p')) ? (params.get('p') as Preview) : 'classes';
  const inFlow = (location.state as { inFlow?: boolean } | null)?.inFlow === true;
  const go = (path: string) => nav(path, { state: { inFlow: true } });
  const next = () => go(`/start/${STEPS[Math.min(idx + 1, STEPS.length - 1)]}`);
  const prevPath = () => {
    if (step === 'what' && PREVIEWS.indexOf(p) > 0) return `/start/what?p=${PREVIEWS[PREVIEWS.indexOf(p) - 1]}`;
    if (step === 'university') return '/start/what?p=social';
    return idx > 0 ? `/start/${STEPS[idx - 1]}` : '/welcome';
  };
  // ‹ goes back in history when we came here through the flow (so the browser's own back stays in step), otherwise to the step before
  const back = () => (inFlow ? nav(-1) : nav(prevPath(), { replace: true }));
  const skip = step === 'discover' ? () => { patch({ topics: [] }); next(); }
    : step === 'communities' ? () => { patch({ communities: [], orgs: [] }); next(); }
    : undefined;

  const school = schools.find((s) => s.id === d.schoolId);

  /** Create the account (e-mail already verified by AboutStep), follow the picked organizations, then Home */
  const finish = async (email: string) => {
    const picks = [...GOALS.filter((g) => d.goalKeys.includes(g.key)), ...TOPICS.filter((t) => d.topics.includes(t.key)), ...COMMUNITIES.filter((c) => d.communities.includes(c.key))];
    const goals = uniq(picks.flatMap((x) => x.goals));
    const interests = uniq(picks.flatMap((x) => x.interests));
    const purposes = uniq(picks.flatMap((x) => x.purposes ?? []));
    const role = d.role || 'undergraduate';
    const user = await api.auth.register({
      email, emailVerified: true, nickname: d.nickname.trim(), birthYear: Number(d.birthYear), gender: 'private', avatar: { emoji: '🙂', hue: 210, photoType: 'face' },
      schoolId: d.schoolId, role, department: '', year: entryYearFor(role === 'alumni' ? 4 : d.yearInSchool),
      showSchool: true, showDepartment: true, interests, purposes: purposes.length ? purposes : ['friend'], bio: '', likes: '', freeTime: '', availability: 'after18',
      fieldVisibility: DEFAULT_FV, prompts: [], goals, lookingFor: [], canOffer: [], meetPreference: [], interestedOrgIds: d.orgs.map((o) => o.id),
      locationPermission: 'undecided', notifications: true,
    });
    // following ≠ membership (S010 footnote). A failed follow must not undo the sign-up — they can follow from Explore
    for (const o of d.orgs) await api.relationships.toggleFollow(user.id, o.id, 'org').catch(() => undefined);
    saveDraft(null);
    await setCurrentUser(user);
    nav(takeReturnTo(), { replace: true });
  };

  const props = { d, patch, next };
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <OnboardingHeader step={idx + 1} total={STEPS.length} onBack={back} onSkip={skip} />
      {step === 'goals' && <GoalsStep {...props} />}
      {step === 'what' && (
        <WhatStep p={p} onPick={(k) => nav(`/start/what?p=${k}`, { replace: true, state: location.state })}
          onContinue={() => (p === 'social' ? next() : go(`/start/what?p=${PREVIEWS[PREVIEWS.indexOf(p) + 1]}`))} />
      )}
      {step === 'university' && <UniversityStep {...props} schools={schools} />}
      {step === 'discover' && <DiscoverStep {...props} />}
      {step === 'communities' && <CommunitiesStep {...props} schoolName={school?.name} />}
      {step === 'about' && <AboutStep d={d} patch={patch} school={school} finish={finish} />}
    </div>
  );
}
