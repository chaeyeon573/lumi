import { useNavigate } from 'react-router-dom';
import { Link2, ChevronRight } from 'lucide-react';
import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { planStatus } from '@core/lib/plans';
import { cn } from '@core/lib/cn';

const en = lang === 'en';

/** 발견 화면 — 친구에게 링크 하나로 묻기 (+ 내가 연 약속 중 아직 진행 중인 것) */
export function AskFriendsCard({ className }: { className?: string }) {
  const nav = useNavigate();
  const me = useAppStore((s) => s.currentUserId);
  const polls = useAppStore((s) => s.timePolls);
  const mine = polls.filter((p) => p.link && (p.hostId === me || p.link.responses.some((r) => r.userId === me)))
    .filter((p) => { const s = planStatus(p); return s === 'open' || s === 'locked' || s === 'closed'; })
    .slice(0, 2);
  return (
    <section className={cn('rounded-3xl bg-surface-2 p-3.5', className)}>
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 rounded-xl bg-primary-soft text-primary v2:bg-lime-900 v2:text-lime-400 grid place-items-center shrink-0"><Link2 size={19} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold text-ink">{en ? 'Ask friends with one link' : '링크 하나로 친구에게 묻기'}</span>
          <span className="block text-[12.5px] text-ink-3 truncate">{en ? 'They answer without the app' : '친구는 앱 없이 답해요'}</span>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => nav('/plans/new?mode=fixed')} className="h-10 rounded-full bg-surface border border-line text-[13px] font-semibold text-ink press">{en ? 'I set the time' : '시간 정해서'}</button>
        <button onClick={() => nav('/plans/new?mode=vote')} className="h-10 rounded-full bg-primary text-white v2:text-on-primary text-[13px] font-semibold press">{en ? 'Decide together' : '같이 정하기'}</button>
      </div>
      {mine.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {mine.map((p) => (
            <button key={p.id} onClick={() => nav(`/p/${p.id}`)} className="w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-left press hover:bg-surface">
              <span className="text-[16px]" aria-hidden>{p.link!.emoji}</span>
              <span className="flex-1 min-w-0 text-[13px] text-ink truncate">{p.title}</span>
              <span className="text-[12px] text-ink-3 shrink-0">{en ? `${p.link!.responses.length} answered` : `${p.link!.responses.length}명 답함`}</span>
              <ChevronRight size={14} className="text-ink-3" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
