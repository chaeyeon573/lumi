import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import type { Self, User } from '@core/types';
import { BackHeader, BottomCTA, Btn, ErrorScreen, LoadingCards, PageTitle } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';

export const en = lang === 'en';

/**
 * 하위 화면 틀 (PDF S072–S086): "‹ Title" 머리 + 큰 제목(+ 한 줄) + 내용 + (있으면) 아래 고정 버튼.
 * 불러오는 중이면 같은 모양의 회색 칸, 실패하면 "Let's try that again" (S094).
 */
export function SubScreen({ title, sub, onMore, cta, children, bigTitle = true }: {
  title: string; sub?: ReactNode; onMore?: () => void; cta?: ReactNode; children: ReactNode; bigTitle?: boolean;
}) {
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={title} onMore={onMore} />
      {bigTitle && <PageTitle title={title} sub={sub} />}
      <div className="flex-1 px-4 pb-8">
        {status === 'error' ? <ErrorScreen message={error ?? undefined} onRetry={init} /> : status === 'ready' ? children : <LoadingCards />}
      </div>
      {cta && status === 'ready' && <BottomCTA>{cta}</BottomCTA>}
    </div>
  );
}

/** 아래 고정 저장 버튼 — 하나뿐인 primary */
export function SaveButton({ label, busy, disabled, onClick }: { label: string; busy?: boolean; disabled?: boolean; onClick: () => void }) {
  return <Btn full size="lg" loading={busy} disabled={disabled} onClick={onClick}>{label}</Btn>;
}

/** 내 프로필 일부를 저장하고 뒤로 (서버가 거른 값이 그대로 돌아온다) */
export function useSaveSelf() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const save = async (patch: Partial<User>, toast: string, back = true) => {
    setBusy(true);
    try {
      await run(() => api.users.update(v.me.id, patch), toast);
      if (back) nav(-1); else setBusy(false);
    } catch { setBusy(false); }
  };
  return { me: v.me as Self, busy, save };
}

export const toggle = <T,>(arr: readonly T[], x: T): T[] => (arr.includes(x) ? arr.filter((i) => i !== x) : [...arr, x]);

/* ─────────────── 학년 (affiliation.year = 입학한 학년도 — lib/sayhi yearMajor 와 같은 셈) ─────────────── */

const academicYear = (d = new Date()) => (d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1);
export const YEAR_OPTIONS = en ? ['First-year', 'Second-year', 'Third-year', 'Fourth-year+'] : ['1학년', '2학년', '3학년', '4학년 이상'];
/** 1~4 */
export const yearOfStudy = (entryYear: number) => Math.min(4, Math.max(1, academicYear() - entryYear + 1));
export const entryYearFor = (n: number) => academicYear() - (n - 1);

export const STATUS_LABEL = { undergraduate: en ? 'Undergraduate' : '학부생', graduate: en ? 'Graduate' : '대학원생', alumni: en ? 'Alumni' : '졸업생' } as const;

/** "Design · Second-year" (PDF S071) — 학년은 학부생만 */
export function majorYear(u: Pick<User, 'affiliation'>): string {
  if (u.affiliation.type !== 'university') return u.affiliation.companyName;
  const a = u.affiliation;
  const year = a.role === 'undergraduate' ? YEAR_OPTIONS[yearOfStudy(a.year) - 1] : STATUS_LABEL[a.role];
  return [a.department, year].filter(Boolean).join(' · ');
}

/** 쉼표로 적은 목록 ↔ 배열 */
export const listToText = (xs?: string[]) => (xs ?? []).join(', ');
export const textToList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

/** 공개 범위 칩 (S083 Membership display · S085 Who can see your profile?) */
export const VIS_LABEL: Partial<Record<import('@core/types').Visibility, string>> = {
  private: en ? 'Private' : '나만', friends: en ? 'Friends' : '친구', school: en ? 'My school' : '우리 학교', public: en ? 'Everyone' : '모두',
};
