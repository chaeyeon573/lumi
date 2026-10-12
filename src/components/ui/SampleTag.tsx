import { lang } from '@core/i18n';
import { cn } from '@core/lib/cn';

/** 예시 데이터 표시 — 테스트하는 사람이 가짜 모임·프로필을 진짜로 오해하지 않게 */
export function SampleTag({ className }: { className?: string }) {
  return <span className={cn('inline-flex align-middle h-5 px-1.5 mr-1.5 rounded-md bg-ink/10 text-ink-2 text-[10px] font-bold uppercase tracking-wide items-center', className)}>{lang === 'en' ? 'Sample' : '예시'}</span>;
}
