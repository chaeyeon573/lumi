import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lang } from '@core/i18n';
import type { Opportunity, User } from '@core/types';
import { Avatar, SampleTag } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { canGoTogether, socialSummary } from '@core/lib/withpeople';
import { cn } from '@core/lib/cn';
import { GoTogetherSheet } from './GoTogetherSheet';

/** 사람 줄에 필요한 데이터만 — 목록의 행마다 useViewer 전체를 다시 계산하지 않게 */
export function usePeopleSnap() {
  const users = useAppStore((s) => s.users);
  const relationships = useAppStore((s) => s.relationships);
  const participations = useAppStore((s) => s.participations);
  const proposals = useAppStore((s) => s.proposals);
  const activities = useAppStore((s) => s.activities);
  const opportunityIntents = useAppStore((s) => s.opportunityIntents);
  const currentUserId = useAppStore((s) => s.currentUserId);
  return useMemo(() => ({
    snap: { users, relationships, participations, proposals, activities, opportunityIntents },
    me: users.find((u) => u.id === currentUserId) as User,
  }), [users, relationships, participations, proposals, activities, opportunityIntents, currentUserId]);
}

/** 겹친 얼굴 (최대 3) */
export function Faces({ people, size = 22 }: { people: User[]; size?: number }) {
  if (!people.length) return null;
  return (
    <span className="flex shrink-0">
      {people.slice(0, 3).map((u, i) => <span key={u.id} className={cn('rounded-full', i > 0 && '-ml-1.5')}><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={size} ring /></span>)}
    </span>
  );
}

/**
 * 공고·행사 한 줄 아래 붙는 "누가 함께하는지" + 버튼 하나.
 *   행사·무료 음식 → Go together (한 번 누르면 같이 가기 모임에 들어가고 시트가 열린다)
 *   인턴·장학금·연구 → Prep together · 해커톤·공모전 → Find teammates (상세 페이지의 사람 칸으로)
 * 아무도 없으면 기본(quiet)은 줄을 숨긴다 — 줄마다 "아직 아무도 없어요"가 붙으면 앱이 텅 비어 보인다.
 * quiet={false}인 곳(목록 맨 위 몇 개)에서만 문구 없이 버튼 하나를 남긴다.
 */
export function PeopleLine({ o, className, quiet = true }: { o: Opportunity; className?: string; quiet?: boolean }) {
  const nav = useNavigate();
  const { snap, me } = usePeopleSnap();
  const [sheet, setSheet] = useState(false);
  const s = useMemo(() => (me ? socialSummary(snap, me, o) : null), [snap, me, o]);
  if (!s || !me) return null;
  if (s.first && quiet) return null;
  const go = s.kind === 'go' && canGoTogether(o);
  const onCta = () => (go ? setSheet(true) : nav(`/opportunities/${o.id}?with=1`));
  return (
    <div className={cn('flex items-center gap-2 mt-2 min-w-0', className)}>
      {!s.first && <Faces people={s.faces} />}
      {s.first ? <span className="flex-1" /> : (
        <span className="flex-1 min-w-0 text-[12px] leading-snug text-ink-2 line-clamp-2">
          {s.sample && <SampleTag />}
          {s.text}
        </span>
      )}
      <button onClick={onCta} className={cn('h-8 px-3.5 rounded-full text-[12px] font-bold shrink-0 press whitespace-nowrap', 'bg-surface-2 text-ink border border-line')}>
        {s.kind === 'go' && !go ? (lang === 'en' ? 'See who’s going' : '누가 가는지') : s.cta}
      </button>
      {go && <GoTogetherSheet o={o} open={sheet} onClose={() => setSheet(false)} />}
    </div>
  );
}
