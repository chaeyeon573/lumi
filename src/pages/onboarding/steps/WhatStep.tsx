import type { ReactNode } from 'react';
import { ArrowUpRight, BookOpen, Bookmark, ChevronRight, Coffee, Compass, FlaskConical, Heart, MessageCircle, Mountain, Trophy, UserRound, Users } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Badge, Chip, IconTile, RowCard, TONE, cardCls, type Tone } from '@/components/ha';
import { StepFrame, en } from './shared';

/**
 * S004–S007 What Lumi can do — one screen, four previews picked by the 2×2 selector (?p=classes|events|clubs|social).
 * Continue walks through the four, then goes on to the university step.
 * Everything here is a picture of the experience, not data: every card says "Sample preview", nothing is clickable,
 * and there are no people in it (no faces, no names, no counts) — PRODUCT_TASTE "no fake data presented as real".
 */
export const PREVIEWS = ['classes', 'events', 'clubs', 'social'] as const;
export type Preview = (typeof PREVIEWS)[number];
export const isPreview = (p: string | null): p is Preview => !!p && (PREVIEWS as readonly string[]).includes(p);

const PILLS: Record<Preview, { Icon: typeof BookOpen; label: string }> = {
  classes: { Icon: BookOpen, label: en ? 'Classes & Schedule' : '수업·시간표' },
  events: { Icon: Compass, label: en ? 'Events & Opportunities' : '행사·기회' },
  clubs: { Icon: Users, label: en ? 'Clubs & Groups' : '동아리·모임' },
  social: { Icon: MessageCircle, label: en ? 'Social' : '소셜' },
};

export function WhatStep({ p, onPick, onContinue }: { p: Preview; onPick: (p: Preview) => void; onContinue: () => void }) {
  return (
    <StepFrame title={en ? 'What Lumi can do' : 'Lumi로 할 수 있는 것'} cta={{ label: en ? 'Continue' : '계속', onClick: onContinue }}>
      <div role="tablist" className="grid grid-cols-2 gap-2.5 -mt-1">
        {PREVIEWS.map((k) => {
          const on = k === p; const { Icon, label } = PILLS[k];
          return (
            <button key={k} type="button" role="tab" aria-selected={on} onClick={() => onPick(k)}
              className={cn('h-11 px-3.5 rounded-full border flex items-center gap-2 text-[13px] font-semibold press min-w-0', on ? 'bg-sel-soft border-sel-line text-sel-fg' : 'bg-surface border-line text-ink')}>
              <Icon size={16} className="shrink-0" /><span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
      <div key={p} className="mt-4 animate-fade-in">
        {p === 'classes' && <ClassesPreview />}
        {p === 'events' && <EventsPreview />}
        {p === 'clubs' && <ClubsPreview />}
        {p === 'social' && <SocialPreview />}
      </div>
    </StepFrame>
  );
}

/** The preview card — title, "Sample preview", one sentence about the experience, then the picture */
function PreviewCard({ title, line, children }: { title: string; line: string; children: ReactNode }) {
  return (
    <section className={cn(cardCls, 'p-4')} aria-label={`${title} — ${en ? 'Sample preview' : '예시 화면'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-bold">{title}</h2>
        <span className="text-[11.5px] text-ink-3 shrink-0">{en ? 'Sample preview' : '예시 화면'}</span>
      </div>
      <p className="text-[13px] text-ink-2 leading-snug mt-1">{line}</p>
      <div className="mt-3.5 select-none" aria-hidden>{children}</div>
    </section>
  );
}

/* ── S004 Classes & Schedule: an example week, and the free afternoon it leaves ── */

const DAYS = en ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : ['월', '화', '수', '목', '금'];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16];
const ROW = 30;
const CLASSES: { day: number; start: number; len: number; title: string; tone: Tone }[] = [
  ...[0, 2, 4].map((day) => ({ day, start: 10, len: 1, title: en ? 'Calculus' : '미적분', tone: 'ice' as Tone })),
  { day: 1, start: 12, len: 1.5, title: en ? 'Studio' : '스튜디오', tone: 'peach' },
  { day: 3, start: 12, len: 1.5, title: en ? 'Seminar' : '세미나', tone: 'mint' },
  { day: 0, start: 14, len: 1, title: en ? 'Discussion' : '토론', tone: 'lav' },
  { day: 3, start: 14.5, len: 1, title: en ? 'Research' : '연구', tone: 'lav' },
];
const hourLabel = (h: number) => (h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`);

function ClassesPreview() {
  return (
    <PreviewCard title={PILLS.classes.label} line={en ? 'Your classes in one week view, and the free time between them.' : '한 주의 수업과 그 사이 빈 시간을 한눈에.'}>
      <div className="text-center text-[13.5px] font-bold mb-2">{en ? 'Your example week' : '예시 한 주'}</div>
      <div className="rounded-2xl border border-line overflow-hidden">
        <div className="grid grid-cols-[38px_repeat(5,1fr)] border-b border-line bg-surface-2">
          <span />
          {DAYS.map((d) => <span key={d} className="h-8 grid place-items-center text-[11.5px] font-semibold text-ink-2">{d}</span>)}
        </div>
        <div className="relative grid grid-cols-[38px_repeat(5,1fr)]" style={{ height: HOURS.length * ROW }}>
          <div>{HOURS.map((h) => <div key={h} className="text-[9.5px] text-ink-3 pl-1.5 pt-0.5" style={{ height: ROW }}>{hourLabel(h)}</div>)}</div>
          {DAYS.map((_, day) => (
            <div key={day} className="relative border-l border-line">
              {HOURS.map((h) => <div key={h} className="border-t border-line/60 first:border-t-0" style={{ height: ROW }} />)}
              {day === 2 && (
                <div className="absolute inset-x-[3px] rounded-lg border border-dashed border-sel-line bg-sel-soft/60 px-1 pt-1 text-[9.5px] font-semibold leading-tight text-sel-fg" style={{ top: (13 - 9) * ROW + 3, height: 3 * ROW - 6 }}>
                  {en ? 'Free afternoon' : '빈 오후'}
                </div>
              )}
              {CLASSES.filter((c) => c.day === day).map((c) => (
                <div key={c.title + c.start} className={cn('absolute inset-x-[3px] rounded-lg px-1 pt-1 text-[9.5px] font-bold leading-tight text-ink overflow-hidden', TONE[c.tone])} style={{ top: (c.start - 9) * ROW + 2, height: c.len * ROW - 4 }}>
                  <span className="block truncate text-ink">{c.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </PreviewCard>
  );
}

/* ── S005 Events & Opportunities: two example listings, each pointing to its source ── */

function SampleListing({ tone, Icon, badge, title }: { tone: Tone; Icon: typeof Compass; badge: string; title: string }) {
  return (
    <div className={cn(cardCls, 'p-3 flex gap-3 relative bg-surface-2')}>
      <span className={cn('h-[76px] w-[76px] rounded-2xl grid place-items-center shrink-0', TONE[tone])}><Icon size={26} /></span>
      <div className="flex-1 min-w-0 pr-6">
        <Badge tone={tone}>{badge}</Badge>
        <span className="block text-[14.5px] font-bold leading-snug mt-1.5 truncate">{title}</span>
        <span className="block text-[12px] text-ink-3 mt-0.5">{en ? 'Example listing' : '예시 공고'}</span>
        <span className="inline-flex items-center gap-0.5 mt-1 text-[12px] font-semibold text-sel-fg">{en ? 'View source' : '원문 보기'}<ArrowUpRight size={13} /></span>
      </div>
      <Bookmark size={18} className="absolute top-3 right-3 text-ink-2" />
    </div>
  );
}

function EventsPreview() {
  return (
    <PreviewCard title={PILLS.events.label} line={en ? 'Research, internships and campus events, each linked to where it came from.' : '연구·인턴·캠퍼스 행사, 모두 원래 출처와 함께.'}>
      <div className="space-y-2.5">
        <SampleListing tone="lav" Icon={FlaskConical} badge={en ? 'Research' : '연구'} title={en ? 'Research assistant pathways' : '연구 보조 시작하기'} />
        <SampleListing tone="peach" Icon={Trophy} badge={en ? 'Hackathon' : '해커톤'} title={en ? 'Build something with a team' : '팀과 함께 만들어 보기'} />
      </div>
    </PreviewCard>
  );
}

/* ── S006 Clubs & Groups: follow what you care about ── */

function ClubsPreview() {
  const chev = <ChevronRight size={18} className="text-ink-3 shrink-0" />;
  return (
    <PreviewCard title={PILLS.clubs.label} line={en ? 'Follow the clubs you care about and see what they are up to.' : '관심 있는 동아리를 팔로우하고 소식을 받아요.'}>
      <div className="space-y-2.5">
        <RowCard className="bg-surface-2" tone="ice" icon={<Users size={21} />} title={en ? 'Photography Club' : '사진 동아리'} sub={en ? 'Creative · Followed' : '창작 · 팔로우 중'} right={chev} />
        <RowCard className="bg-surface-2" tone="mint" icon={<Mountain size={21} />} title={en ? 'Outdoor Community' : '아웃도어 모임'} sub={en ? 'Recreation · Explore' : '레크리에이션 · 둘러보기'} right={chev} />
        <RowCard className="bg-surface-2" tone="peach" icon={<FlaskConical size={21} />} title={en ? 'Student Research Network' : '학생 연구 네트워크'} sub={en ? 'Academic · Explore' : '학술 · 둘러보기'} right={chev} />
      </div>
    </PreviewCard>
  );
}

/* ── S007 Social: small plans with people around you ── */

function SocialPreview() {
  const tabs = en ? ['For You', 'Meetups', 'People', 'Feed'] : ['추천', '모임', '사람', '피드'];
  return (
    <PreviewCard title={PILLS.social.label} line={en ? 'Small plans with people from your classes and clubs.' : '같은 수업·동아리 사람들과 작은 약속을.'}>
      <div className="flex border-b border-line -mx-1">
        {tabs.map((t, i) => (
          <span key={t} className={cn('relative flex-1 h-9 grid place-items-center text-[12px] font-semibold', i === 0 ? 'text-sel-fg' : 'text-ink-3')}>
            {t}{i === 0 && <span className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-sel" />}
          </span>
        ))}
      </div>
      <div className="text-[17px] font-extrabold tracking-[-0.02em] mt-3.5">{en ? 'Good plans. Your people.' : '좋은 약속, 나의 사람들.'}</div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <span className="h-9 rounded-full border border-sel-line bg-sel-soft text-sel-fg text-[12.5px] font-semibold grid place-items-center">{en ? 'Start a Meetup' : '모임 만들기'}</span>
        <span className="h-9 rounded-full border border-line text-[12.5px] font-semibold grid place-items-center">{en ? 'Find People' : '사람 찾기'}</span>
      </div>
      <div className="flex gap-1.5 mt-3 overflow-hidden">
        {(en ? ['Coffee', 'Study', 'Workout', 'Lunch'] : ['커피', '공부', '운동', '점심']).map((c, i) => <Chip key={c} size="sm" active={i === 0}>{c}</Chip>)}
      </div>
      <div className={cn(cardCls, 'p-3.5 mt-3 bg-surface-2')}>
        <div className="flex items-center gap-3">
          <IconTile tone="peach" size={42}><Coffee size={20} /></IconTile>
          <div className="flex-1 min-w-0">
            <Badge tone="peach" className="h-5 text-[11px] px-2">{en ? 'Coffee' : '커피'}</Badge>
            <span className="block text-[14.5px] font-bold mt-1">{en ? 'Coffee after class' : '수업 끝나고 커피'}</span>
            <span className="block text-[12px] text-ink-3">{en ? 'Café · Choose a time together' : '카페 · 같이 시간 정하기'}</span>
          </div>
          <ChevronRight size={18} className="text-ink-3" />
        </div>
        <div className="flex items-center justify-between mt-2.5 text-[11.5px]">
          <span className="text-ink-3">{en ? 'Example meetup' : '예시 모임'}</span>
          <span className="font-semibold text-sel-fg">{en ? 'View meetup' : '모임 보기'}</span>
        </div>
      </div>
      <div className={cn(cardCls, 'p-3.5 mt-2.5 bg-surface-2')}>
        <div className="flex items-center gap-2.5">
          <IconTile tone="neutral" size={34} className="!rounded-full"><UserRound size={18} /></IconTile>
          <div className="min-w-0">
            <span className="block text-[13.5px] font-bold">{en ? 'A classmate' : '같은 수업 학생'}</span>
            <span className="block text-[11.5px] text-ink-3">{en ? 'Campus question · Sample post' : '캠퍼스 질문 · 예시 글'}</span>
          </div>
        </div>
        <p className="text-[13.5px] mt-2.5">{en ? 'Anyone up for a study break after class?' : '수업 끝나고 잠깐 쉬면서 공부할 사람?'}</p>
        <div className="flex items-center gap-4 mt-2.5 text-ink-2"><Heart size={17} /><MessageCircle size={17} /><span className="flex-1" /><Bookmark size={17} /></div>
      </div>
    </PreviewCard>
  );
}
