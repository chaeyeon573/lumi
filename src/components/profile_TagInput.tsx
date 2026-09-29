import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { t } from '@core/i18n';

/** 짧은 태그 입력 — 도와줄 수 있어요 · 찾고 있어요 (최대 5개, 20자). 추천 태그를 누르면 바로 들어간다 */
export function TagInput({ value, onChange, suggestions = [], placeholder }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = (x: string) => { const v = x.trim().slice(0, 20); if (!v || value.includes(v) || value.length >= 5) return; onChange([...value, v]); setDraft(''); };
  const rest = suggestions.filter((s) => !value.includes(s)).slice(0, 6);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((x) => (
          <span key={x} className="h-8 pl-3 pr-1 rounded-full bg-primary-soft text-primary text-[12px] font-bold inline-flex items-center gap-1">
            {x}<button type="button" onClick={() => onChange(value.filter((y) => y !== x))} aria-label={`${x} ${t('빼기')}`} className="h-6 w-6 rounded-full grid place-items-center press"><X size={12} /></button>
          </span>
        ))}
        {value.length < 5 && (
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); } }} onBlur={() => add(draft)}
            placeholder={placeholder ?? t('입력하고 Enter')} maxLength={20} className="h-8 min-w-[140px] flex-1 rounded-full border border-line bg-card px-3 text-[13px] outline-none focus:border-primary" />
        )}
      </div>
      {rest.length > 0 && value.length < 5 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rest.map((s) => <button key={s} type="button" onClick={() => add(s)} className="h-7 px-2.5 rounded-full border border-dashed border-line text-[12px] text-ink-2 inline-flex items-center gap-1 press"><Plus size={11} />{s}</button>)}
        </div>
      )}
    </div>
  );
}

/** 단계별 추천 태그 */
export function helpSuggestions(kind: 'undergrad' | 'grad' | 'alumni'): { help: string[]; seek: string[] } {
  if (kind === 'alumni') return { help: [t('취업·이직 이야기'), t('창업'), t('이 도시 생활'), t('대학원 준비'), t('포트폴리오 피드백')], seek: [t('같은 업계 동문'), t('러닝 메이트'), t('공동창업자'), t('이 도시 친구')] };
  if (kind === 'grad') return { help: [t('논문 읽기'), t('데이터 분석'), t('대학원 진학 상담'), t('연구실 생활')], seek: [t('공동 연구'), t('같은 분야 연구자'), t('박사 진학 선배'), t('산업계 선배')] };
  return { help: [t('수업 정리'), t('동아리 소개'), t('학교 앞 맛집'), t('디자인 툴')], seek: [t('창업 팀원'), t('스터디 친구'), t('운동 메이트'), t('선배 조언')] };
}
