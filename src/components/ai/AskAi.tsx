import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { t } from '@core/i18n';
import type { StageKind } from '@core/lib/stage';
import { cn } from '@core/lib/cn';

/** 단계별로 바로 눌러볼 수 있는 예시 문장 — 파서가 조건으로 읽어내는 문장만 고른다 */
export function aiExamples(kind: StageKind): string[] {
  if (kind === 'grad') return [t('NLP 연구하는 대학원생'), t('AI 연구하는 대학원생'), t('박사과정 선배')];
  if (kind === 'alumni') return [t('핀테크 동문'), t('서울 창업 동문'), t('뉴욕 금융권 동문')];
  return [t('러닝 좋아하는 재학생'), t('창업 관심 있는 재학생'), t('디자인 좋아하는 재학생')];
}

export const findUrl = (q?: string) => (q ? `/people/find?q=${encodeURIComponent(q)}` : '/people/find');

/** 예시 칩 한 줄 — 누르면 바로 그 문장으로 찾는다 */
export function AiExampleChips({ kind, className, onPick }: { kind: StageKind; className?: string; onPick?: (q: string) => void }) {
  const nav = useNavigate();
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto hide-scrollbar', className)}>
      {aiExamples(kind).map((q) => (
        <button key={q} type="button" onClick={() => (onPick ? onPick(q) : nav(findUrl(q)))} className="h-8 px-3 rounded-full bg-card border border-line text-[12px] font-semibold text-primary whitespace-nowrap shrink-0 press">{q}</button>
      ))}
    </div>
  );
}

/** 홈 — "찾는 사람을 말로 설명해 보세요" 카드. 가짜 입력창 + 단계별 예시 칩 */
export function AskAiCard({ kind, className }: { kind: StageKind; className?: string }) {
  const nav = useNavigate();
  return (
    <section className={cn('rounded-[24px] bg-primary-soft p-4', className)} aria-label={t('AI로 사람 찾기')}>
      <div className="flex items-start gap-2.5">
        <span className="h-9 w-9 rounded-full bg-card text-primary grid place-items-center shrink-0"><Sparkles size={17} /></span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold text-ink leading-snug">{t('찾는 사람을 말로 설명해 보세요')}</h2>
          <p className="text-[12px] text-ink-2">{t('AI가 조건을 알아듣고 찾아줘요')}</p>
        </div>
      </div>
      <button type="button" onClick={() => nav(findUrl())} className="mt-3 w-full h-11 rounded-full bg-card border border-line pl-4 pr-1.5 flex items-center gap-2 text-left press">
        <span className="flex-1 min-w-0 truncate text-[14px] text-ink-3">{t('혹시 찾는 사람이 있나요?')}</span>
        <span className="h-8 w-8 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0"><ArrowRight size={15} /></span>
      </button>
      <AiExampleChips kind={kind} className="mt-2.5 -mx-4 px-4" />
    </section>
  );
}

/** 사람 탭 — 큰 검색창 모양 입구 */
export function AskAiBar({ className }: { className?: string }) {
  const nav = useNavigate();
  return (
    <button type="button" onClick={() => nav(findUrl())} className={cn('w-full h-12 rounded-full bg-card border border-line pl-3 pr-2 flex items-center gap-2.5 text-left press', className)}>
      <span className="h-8 w-8 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0"><Sparkles size={15} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold text-ink truncate">{t('AI에게 찾아달라고 하기')}</span>
        <span className="block text-[11px] text-ink-3 truncate">{t('예: 러닝 좋아하는 재학생, 뉴욕 금융권 동문')}</span>
      </span>
      <ArrowRight size={16} className="text-ink-3 shrink-0" />
    </button>
  );
}
