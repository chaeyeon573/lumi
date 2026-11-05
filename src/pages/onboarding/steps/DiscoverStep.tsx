import { Bike, Briefcase, CalendarDays, Check, FlaskConical, GraduationCap, Trophy, Users, Utensils } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { TONE, type Tone } from '@/components/ha';
import { StepFrame, en, toggle, type Saves, type StepProps } from './shared';

/**
 * S009 Make it yours (optional, Skip) — eight tinted tiles, saved as goals · interests (For you and suggestions read them).
 * Keys match the 2026-11-02 topics step so an older draft still fits.
 */
export const TOPICS: ({ key: string; Icon: typeof Briefcase; tone: Tone; label: string } & Saves)[] = [
  { key: 'jobs', Icon: Briefcase, tone: 'ice', label: en ? 'Internships' : '인턴십', goals: ['internship'], interests: [] },
  { key: 'research', Icon: FlaskConical, tone: 'lav', label: en ? 'Research' : '연구', goals: ['lab'], interests: ['research'] },
  { key: 'hack', Icon: Trophy, tone: 'peach', label: en ? 'Hackathons' : '해커톤', goals: ['hackathon'], interests: [] },
  { key: 'funding', Icon: GraduationCap, tone: 'mint', label: en ? 'Scholarships' : '장학금', goals: ['scholarship'], interests: [] },
  { key: 'events', Icon: CalendarDays, tone: 'ice', label: en ? 'Campus events' : '캠퍼스 행사', goals: [], interests: ['networking'] },
  { key: 'clubs', Icon: Users, tone: 'rose', label: en ? 'Communities' : '커뮤니티', goals: ['join_club'], interests: ['club'] },
  { key: 'sports', Icon: Bike, tone: 'mint', label: en ? 'Recreation' : '레크리에이션', goals: [], interests: ['exercise'] },
  { key: 'food', Icon: Utensils, tone: 'peach', label: en ? 'Dining' : '학식', goals: [], interests: ['meal'] },
];

export function DiscoverStep({ d, patch, next }: StepProps) {
  return (
    <StepFrame title={en ? 'Make it yours' : '나에게 맞추기'} sub={en ? 'Choose the content you’d like to discover. This step is optional.' : '보고 싶은 내용을 골라 주세요. 건너뛰어도 돼요.'}
      cta={{ label: en ? 'Continue' : '계속', onClick: next }}>
      <div className="grid grid-cols-2 gap-3">
        {TOPICS.map((t) => {
          const on = d.topics.includes(t.key);
          return (
            <button key={t.key} type="button" aria-pressed={on} onClick={() => patch({ topics: toggle(d.topics, t.key) })}
              className={cn('relative h-[96px] rounded-[20px] border-2 p-4 flex flex-col justify-between text-left press transition', TONE[t.tone], on ? 'border-sel-line' : 'border-transparent')}>
              <t.Icon size={22} />
              <span className="text-[15px] font-bold text-ink">{t.label}</span>
              {on && <Check size={17} strokeWidth={2.6} className="absolute top-3.5 right-3.5 text-sel-fg" aria-hidden />}
            </button>
          );
        })}
      </div>
    </StepFrame>
  );
}
