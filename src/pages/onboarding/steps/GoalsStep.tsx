import { Building2, CalendarDays, Compass, MessageCircle, Users } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { IconTile, InfoNote, cardCls, type Tone } from '@/components/ha';
import { CheckDot, StepFrame, en, toggle, type Saves, type StepProps } from './shared';

/**
 * S003 Your goals — five rows, any number. Keys stay the same as the 2026-11-03 flow so a saved draft still fits.
 * Saved as goals · interests · purposes (For you and the people suggestions read them).
 */
export const GOALS: ({ key: string; Icon: typeof Compass; tone: Tone; label: string } & Saves)[] = [
  { key: 'opps', Icon: Compass, tone: 'ice', label: en ? 'Find events & opportunities' : '행사·기회 찾기', goals: ['internship', 'lab', 'scholarship', 'hackathon'], interests: ['research', 'networking'] },
  { key: 'classes', Icon: CalendarDays, tone: 'peach', label: en ? 'Plan my classes' : '수업 계획하기', goals: [], interests: ['study'], purposes: ['study'] },
  { key: 'involved', Icon: Users, tone: 'mint', label: en ? 'Explore clubs & groups' : '동아리·모임 둘러보기', goals: ['join_club'], interests: ['club'], purposes: ['club'] },
  { key: 'people', Icon: MessageCircle, tone: 'rose', label: en ? 'Meet new people' : '새 사람 만나기', goals: ['friends'], interests: ['coffee'], purposes: ['friend'] },
  { key: 'easier', Icon: Building2, tone: 'lav', label: en ? 'Campus life' : '캠퍼스 생활', goals: [], interests: ['exercise', 'meal'] },
];

export function GoalsStep({ d, patch, next }: StepProps) {
  return (
    <StepFrame title={en ? 'Your goals' : '나의 목표'} sub={en ? 'What would you like to get out of Lumi?' : 'Lumi에서 무엇을 얻고 싶어요?'}
      cta={{ label: en ? 'Continue' : '계속', onClick: next, disabled: d.goalKeys.length === 0 }}>
      <div className="space-y-3">
        {GOALS.map((g) => {
          const on = d.goalKeys.includes(g.key);
          return (
            <button key={g.key} type="button" aria-pressed={on} onClick={() => patch({ goalKeys: toggle(d.goalKeys, g.key) })}
              className={cn(cardCls, 'w-full h-[72px] px-4 flex items-center gap-3.5 text-left press transition', on && 'bg-sel-soft border-sel-line')}>
              <IconTile tone={g.tone} size={42}><g.Icon size={21} /></IconTile>
              <span className="flex-1 min-w-0 text-[15px] font-bold">{g.label}</span>
              <CheckDot on={on} />
            </button>
          );
        })}
      </div>
      <InfoNote className="mt-4">{en ? 'You can change this later.' : '나중에 바꿀 수 있어요.'}</InfoNote>
    </StepFrame>
  );
}
