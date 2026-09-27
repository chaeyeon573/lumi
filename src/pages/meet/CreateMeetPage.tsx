import { useNavigate } from 'react-router-dom';
import { Vote, BookOpen, Users, ChevronRight } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';

/** 만남 종류 타일 → 기존 /create/activity (kind·cat·start·end 만 넘긴다) */
const KINDS: { key: string; emoji: string; label: string; to: string }[] = [
  { key: 'coffee', emoji: '☕', label: t('커피'), to: '/create/activity?kind=personal&cat=coffee' },
  { key: 'lunch', emoji: '🍱', label: t('점심'), to: '/create/activity?kind=personal&cat=meal&start=12:00&end=13:00' },
  { key: 'study', emoji: '📚', label: t('공부'), to: '/create/activity?kind=personal&cat=study' },
  { key: 'sports', emoji: '🏃', label: lang === 'en' ? 'Sports' : '운동', to: '/create/activity?kind=personal&cat=exercise' },
  { key: 'dinner', emoji: '🍽️', label: t('저녁'), to: '/create/activity?kind=personal&cat=meal&start=18:00&end=20:00' },
  { key: 'networking', emoji: '🤝', label: t('네트워킹'), to: '/create/activity?kind=personal&cat=networking' },
  { key: 'party', emoji: '🎉', label: t('파티'), to: '/create/activity?kind=personal&cat=club' },
  { key: 'other', emoji: '✨', label: t('기타'), to: '/create/activity?kind=personal&cat=etc' },
];

const MORE: { key: string; icon: React.ReactNode; title: string; sub: string; to: string }[] = [
  { key: 'together', icon: <Vote size={20} />, title: t('같이 계획하기'), sub: t('시간 투표로 정하기'), to: '/together/new' },
  { key: 'crew', icon: <BookOpen size={20} />, title: t('수업 Study Crew'), sub: t('시간표에서 수업을 골라요'), to: '/timetable' },
  { key: 'team', icon: <Users size={20} />, title: t('팀원 모집하기'), sub: t('역할별로 팀원을 모아요'), to: '/create/activity?kind=group&team=1' },
];

/** /meet/create — 무엇을 할지 고르면 바로 만들기 화면으로 */
export function CreateMeetPage() {
  const nav = useNavigate();
  return (
    <div className="min-h-full pb-10 bg-bg">
      <TopBar back title={t('만들기')} />
      <div className="px-4 pt-3">
        <h2 className="font-display text-[24px] font-bold text-primary mb-4">{t('무엇을 할까요?')}</h2>
        <div className="grid grid-cols-4 gap-3">
          {KINDS.map((k) => (
            <button key={k.key} onClick={() => nav(k.to)} className="card aspect-square flex flex-col items-center justify-center gap-1.5 press">
              <span className="text-[30px] leading-none">{k.emoji}</span>
              <span className="text-[12px] font-semibold text-primary">{k.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 space-y-2">
          {MORE.map((m) => (
            <button key={m.key} onClick={() => nav(m.to)} className="w-full card p-3 flex items-center gap-3 text-left press">
              <span className="h-11 w-11 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0">{m.icon}</span>
              <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-primary truncate">{m.title}</span><span className="block text-[12px] text-ink-3 truncate">{m.sub}</span></span>
              <ChevronRight size={18} className="text-ink-3 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
