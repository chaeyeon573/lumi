import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { lang } from '@core/i18n';
import { BackHeader, PageTitle, Chip, ChipRow, RowCard, EmptyCard } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { MeetupItem, studentMeetups } from '@/components/social/MeetupBits';
import { kindByKey } from '@/components/social/meetupKinds';

const en = lang === 'en';
/** 작은 테이블 — 정원이 이 수 이하인 커피·공부·점심 모임 */
export const SMALL_TABLE = 6;
const CHIPS = ['coffee', 'study', 'lunch'] as const;

/** Small Tables (PDF S049) — "Small plans, good company." All · Coffee · Study · Lunch, 작은 모임 카드, "+ Create a small table" */
export function SmallTablesPage() {
  const nav = useNavigate();
  const v = useViewer();
  const parts = useAppStore((s) => s.participations);
  const [params, setParams] = useSearchParams();
  const k = kindByKey(params.get('k'));
  const small = useMemo(() => studentMeetups(v.visibleActivities, v.me, parts)
    .filter((a) => a.capacity <= SMALL_TABLE && ['coffee', 'meal', 'study', 'seminar'].includes(a.category)), [v, parts]);
  const shown = small.filter((a) => !k || k.cats.includes(a.category));
  return (
    <div className="min-h-full bg-bg pb-8">
      <BackHeader title={en ? 'Small Tables' : '작은 테이블'} />
      <PageTitle title={en ? 'Small Tables' : '작은 테이블'} sub={en ? 'Small plans, good company.' : '작은 약속, 좋은 사람들.'} className="pb-3" />
      <div className="px-4">
        <ChipRow>
          <Chip active={!k} onClick={() => setParams({}, { replace: true })}>{en ? 'All' : '전체'}</Chip>
          {CHIPS.map((c) => { const x = kindByKey(c)!; return <Chip key={c} active={k?.key === c} onClick={() => setParams({ k: c }, { replace: true })}>{x.label}</Chip>; })}
        </ChipRow>
        <div className="space-y-3 mt-4">
          {shown.map((a) => <MeetupItem key={a.id} a={a} />)}
          {!shown.length && <EmptyCard title={en ? 'No small tables set yet' : '아직 작은 테이블이 없어요'} sub={en ? `Up to ${SMALL_TABLE} people — easy to say yes to.` : `${SMALL_TABLE}명까지 — 부담 없이.`} />}
          <RowCard tone="rose" icon={<Plus size={22} />} title={en ? 'Create a small table' : '작은 테이블 만들기'} sub={en ? 'Start with a shared interest' : '같은 관심사로 시작해요'}
            onClick={() => nav(`/meetups/new?kind=${k?.key ?? 'coffee'}&cap=4`)} />
        </div>
      </div>
    </div>
  );
}
