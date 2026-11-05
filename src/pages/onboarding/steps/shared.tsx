import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { lang } from '@core/i18n';
import { cn } from '@core/lib/cn';
import type { Goal, Interest, Purpose, UniversityRole } from '@core/types';
import type { OrgHit } from '@core/lib/signup';
import { BottomCTA, Btn } from '@/components/ha';

export const en = lang === 'en';

/**
 * Sign-up steps in PDF order (Lumi Harness A p.4–7): goals (1 of 6) → what Lumi can do (2) → university (3) →
 * make it yours (4, Skip) → communities (5, Skip) → a little about you (6) → Home. One address per step: /start/<step>.
 */
export const STEPS = ['goals', 'what', 'university', 'discover', 'communities', 'about'] as const;
export type Step = (typeof STEPS)[number];
export const isStep = (s: string | undefined): s is Step => !!s && (STEPS as readonly string[]).includes(s);

/** The answers so far. Kept in sessionStorage (DRAFT_KEY) so an iOS WebView reload or a trip to Mail for the code loses nothing */
export interface Draft {
  goalKeys: string[];
  schoolId: string;
  role: UniversityRole | '';
  /** 1–4 (4 = 4th+), 0 = not answered (optional) */
  yearInSchool: number;
  topics: string[];
  communities: string[];
  /** organizations picked in S010 — followed right after the account exists (following ≠ membership) */
  orgs: OrgHit[];
  nickname: string;
  birthYear: string;
  email: string;
  codeSent: boolean;
}
export const DRAFT_KEY = 'lumi.start.draft.v3';
export const EMPTY_DRAFT: Draft = { goalKeys: [], schoolId: '', role: '', yearInSchool: 0, topics: [], communities: [], orgs: [], nickname: '', birthYear: '', email: '', codeSent: false };

export function loadDraft(): Draft {
  try {
    const raw = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}') as Partial<Draft>;
    const d = { ...EMPTY_DRAFT, ...raw };
    // older drafts (before 2026-11-05) had other shapes — keep only what still fits
    return { ...d, orgs: Array.isArray(d.orgs) ? d.orgs.filter((o) => o && typeof o.id === 'string') : [], yearInSchool: Number(d.yearInSchool) || 0 };
  } catch { return EMPTY_DRAFT; }
}
export const saveDraft = (d: Draft | null) => { try { if (d) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else sessionStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ } };

export const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
export const uniq = <T,>(a: T[]) => [...new Set(a)];

/** What a choice saves on the account (goals · interests · purposes feed For you and recommendations) */
export interface Saves { goals: Goal[]; interests: Interest[]; purposes?: Purpose[] }

export interface StepProps { d: Draft; patch: (p: Partial<Draft>) => void; next: () => void }

/** Big title + one grey line (PDF: "Your goals / What would you like to get out of Lumi?") */
export function StepTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="pt-3 pb-5">
      <h1 className="ha-title">{title}</h1>
      {sub && <p className="text-[15px] text-ink-2 mt-2.5 leading-snug">{sub}</p>}
    </div>
  );
}

/** Step body + the sticky bottom button (one primary per screen) */
export function StepFrame({ title, sub, cta, note, children }: {
  title: string; sub?: ReactNode; note?: ReactNode; children: ReactNode;
  cta: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean };
}) {
  return (
    <>
      <main className="flex-1 px-5 pb-8 animate-fade-in">
        <StepTitle title={title} sub={sub} />
        {children}
      </main>
      <BottomCTA note={note}><Btn full size="lg" onClick={cta.onClick} disabled={cta.disabled} loading={cta.loading}>{cta.label}</Btn></BottomCTA>
    </>
  );
}

/** Round check (PDF S003): filled pink when picked */
export function CheckDot({ on, className }: { on: boolean; className?: string }) {
  return (
    <span className={cn('h-6 w-6 rounded-full grid place-items-center shrink-0 transition', on ? 'bg-sel text-bg' : 'border-2 border-line', className)} aria-hidden>
      {on && <Check size={15} strokeWidth={3} />}
    </span>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('ha-h2 mb-3', className)}>{children}</h2>;
}
