import { useEffect, useRef, useState } from 'react';
import { t, lang } from '@core/i18n';
import { Plus, X, Mic, Square, Play, Pause, Trash2, Check, BarChart3, Pencil } from 'lucide-react';
import type { PollPrompt, ProfilePrompt, VoicePrompt } from '@core/types';
import { BottomSheet, Chip, Textarea, Tag } from '@/components/ui';
import { TEXT_PROMPTS, VOICE_PROMPTS, POLL_PROMPTS, PROMPT_CATEGORY_LABELS, questionById, pollById, MAX_TEXT_PROMPTS, REQUIRED_TEXT_PROMPTS, REQUIRED_SLOTS, FIRST_PROMPT_ID, slotCategories, normalizePrompts, type PromptCategory } from '@core/data/prompts';
import { cn } from '@core/lib/cn';
import { pollCounts } from '@core/lib/privacy';

// ─── 텍스트 질문 편집 ──────────────────────────────────────────────────────
export function PromptEditor({ value, onChange }: { value: ProfilePrompt[]; onChange: (v: ProfilePrompt[]) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [cat, setCat] = useState<PromptCategory | 'all'>('all');
  const used = new Set(value.map((p) => p.questionId));
  const answered = value.filter((p) => p.answer.trim()).length;
  // 1번 슬롯은 첫 질문으로 고정. 저장된 값이 규칙에 안 맞으면 정규화한다.
  useEffect(() => {
    if (value[0]?.questionId !== FIRST_PROMPT_ID) onChange(normalizePrompts(value));
  }, [value, onChange]);
  const targetIndex = editing ?? value.length;
  const allowed = slotCategories(targetIndex);
  const slot = REQUIRED_SLOTS[targetIndex];

  const openPicker = (index: number | null) => { setEditing(index); setCat('all'); setPickerOpen(true); };
  const pick = (questionId: string) => {
    if (editing !== null) onChange(value.map((p, i) => (i === editing ? { questionId, answer: '' } : p)));
    else onChange([...value, { questionId, answer: '' }]);
    setPickerOpen(false); setEditing(null);
  };

  return (
    <div className="space-y-2.5">
      {value.map((p, i) => {
        const q = questionById(p.questionId);
        const fixed = i === 0;
        const hint = REQUIRED_SLOTS[i]?.hint;
        return (
          <div key={p.questionId} className="card p-3.5">
            {hint && <div className="text-[11px] font-semibold text-ink-3 mb-1">{i + 1}. {hint}{fixed ? ` · ${t('첫 질문은 고정이에요')}` : ''}</div>}
            <div className="flex items-start justify-between gap-2">
              {fixed
                ? <div className="text-left text-[13px] font-bold text-primary">{q?.text}</div>
                : <button type="button" onClick={() => openPicker(i)} className="text-left text-[13px] font-bold text-primary flex items-center gap-1">{q?.text}<Pencil size={11} className="text-ink-3" /></button>}
              {!fixed && <button type="button" onClick={() => onChange(normalizePrompts(value.filter((_, j) => j !== i)))} className="text-ink-3 h-6 w-6 grid place-items-center" aria-label={t('삭제')}><X size={15} /></button>}
            </div>
            <Textarea className="mt-2 min-h-[64px]" placeholder={q?.placeholder ?? t('2줄 이내로 짧게')} maxLength={80} value={p.answer} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
            <div className="text-right text-[11px] text-ink-3 mt-1">{p.answer.length}/80</div>
          </div>
        );
      })}
      {value.length < MAX_TEXT_PROMPTS && (
        <button type="button" onClick={() => openPicker(null)} className="w-full h-12 rounded-2xl border-2 border-dashed border-line text-[13px] font-semibold text-ink-2 flex items-center justify-center gap-1.5 press"><Plus size={16} />{value.length < REQUIRED_TEXT_PROMPTS ? (lang === 'en' ? `Add a prompt (${answered}/${REQUIRED_TEXT_PROMPTS} required)` : `질문 추가 (${answered}/${REQUIRED_TEXT_PROMPTS} 필수)`) : t('질문 하나 더 답하기')}</button>
      )}
      <BottomSheet open={pickerOpen} onClose={() => { setPickerOpen(false); setEditing(null); }} title={slot ? `${targetIndex + 1}. ${slot.hint}` : t('질문 고르기')} tall>
        {slot && <p className="text-[12px] text-ink-3 mb-2">{t('이 자리에는 다른 종류의 질문이 들어가요')}: {slot.categories.map((c) => PROMPT_CATEGORY_LABELS[c]).join(' · ')}</p>}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-2 -mx-1 px-1">
          <Chip size="sm" active={cat === 'all'} onClick={() => setCat('all')}>{t('전체')}</Chip>
          {(Object.keys(PROMPT_CATEGORY_LABELS) as PromptCategory[]).filter((c) => !allowed || allowed.includes(c)).map((c) => <Chip key={c} size="sm" active={cat === c} onClick={() => setCat(c)}>{PROMPT_CATEGORY_LABELS[c]}</Chip>)}
        </div>
        <div className="space-y-1.5 mt-1">
          {TEXT_PROMPTS.filter((q) => q.id !== FIRST_PROMPT_ID && (!allowed || allowed.includes(q.category)) && (cat === 'all' || q.category === cat)).map((q) => {
            const taken = used.has(q.id) && value[editing ?? -1]?.questionId !== q.id;
            return <button key={q.id} type="button" disabled={taken} onClick={() => pick(q.id)} className={cn('w-full text-left rounded-xl px-3.5 py-3 border border-line text-[14px] font-medium press', taken ? 'opacity-40' : 'hover:bg-surface-2')}>{q.text}<span className="block text-[11px] text-ink-3 mt-0.5">{PROMPT_CATEGORY_LABELS[q.category]}{taken ? t(' · 이미 답했어요') : ''}</span></button>;
          })}
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── 음성 질문 (데모: 실제 녹음 대신 길이만 기록) ────────────────────────────
export function VoicePromptEditor({ value, onChange }: { value?: VoicePrompt; onChange: (v?: VoicePrompt) => void }) {
  const [questionId, setQuestionId] = useState(value?.questionId ?? VOICE_PROMPTS[0].id);
  const [recording, setRecording] = useState(false);
  const [sec, setSec] = useState(0);
  const timer = useRef<number | null>(null);
  const stop = () => { if (timer.current) window.clearInterval(timer.current); timer.current = null; setRecording(false); if (sec >= 1) onChange({ questionId, durationSec: sec, recordedAt: new Date().toISOString() }); };
  useEffect(() => { if (recording && sec >= 30) stop(); }, [sec, recording]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { setSec(0); setRecording(true); timer.current = window.setInterval(() => setSec((s) => s + 1), 1000); };
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  if (value) {
    return (
      <div className="card p-3.5">
        <div className="text-[13px] font-bold text-primary">{questionById(value.questionId)?.text}</div>
        <div className="mt-2 flex items-center gap-3"><VoicePlayer duration={value.durationSec} /><button type="button" onClick={() => onChange(undefined)} className="text-ink-3" aria-label={t('삭제')}><Trash2 size={16} /></button></div>
      </div>
    );
  }
  return (
    <div className="card p-3.5">
      <div className="flex flex-wrap gap-1.5">{VOICE_PROMPTS.map((q) => <Chip key={q.id} size="sm" active={questionId === q.id} onClick={() => !recording && setQuestionId(q.id)}>{q.text}</Chip>)}</div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={recording ? stop : start} className={cn('h-14 w-14 rounded-full grid place-items-center text-white press', recording ? 'bg-danger animate-pulse' : 'bg-primary')} aria-label={recording ? t('녹음 중지') : t('녹음 시작')}>{recording ? <Square size={20} /> : <Mic size={22} />}</button>
        <div className="flex-1">
          <div className="text-[14px] font-semibold">{recording ? `${t('녹음 중 · ')}${sec}${t('초')}` : t('탭해서 녹음 (최대 30초)')}</div>
          <div className="text-[11px] text-ink-3">{t('데모에서는 실제 음성 대신 녹음 길이만 저장돼요.')}</div>
          {recording && <Waveform active />}
        </div>
      </div>
    </div>
  );
}

export function VoicePlayer({ duration }: { duration: number }) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setPos((p) => { if (p + 1 >= duration) { setPlaying(false); return 0; } return p + 1; }), 1000);
    return () => window.clearInterval(id);
  }, [playing, duration]);
  return (
    <div className="flex-1 flex items-center gap-2.5 rounded-xl bg-primary-soft px-3 py-2">
      <button type="button" onClick={() => setPlaying((p) => !p)} className="h-9 w-9 rounded-full bg-primary text-white grid place-items-center press shrink-0" aria-label={playing ? t('일시정지') : t('재생')}>{playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}</button>
      <Waveform active={playing} progress={pos / duration} />
      <span className="text-[12px] font-semibold text-primary tabular-nums">{playing ? `${pos}s` : `${duration}s`}</span>
    </div>
  );
}

function Waveform({ active, progress = 0 }: { active?: boolean; progress?: number }) {
  const bars = [4, 9, 14, 8, 16, 11, 6, 13, 9, 15, 7, 12, 5, 10, 14, 8, 6, 11, 9, 13];
  return (
    <div className="flex items-center gap-[3px] h-5 flex-1">
      {bars.map((h, i) => <span key={i} className={cn('w-[3px] rounded-full transition-colors', i / bars.length < progress ? 'bg-sel' : 'bg-sel/35', active && 'animate-pulse')} style={{ height: h }} />)}
    </div>
  );
}

// ─── 투표형 질문 ───────────────────────────────────────────────────────────
export function PollEditor({ value, onChange }: { value?: PollPrompt; onChange: (v?: PollPrompt) => void }) {
  if (value) {
    const q = pollById(value.questionId);
    return (
      <div className="card p-3.5">
        <div className="flex items-center justify-between"><div className="text-[13px] font-bold text-primary flex items-center gap-1"><BarChart3 size={13} />{q?.text}</div><button type="button" onClick={() => onChange(undefined)} className="text-ink-3" aria-label={t('삭제')}><Trash2 size={16} /></button></div>
        <div className="mt-2 flex flex-wrap gap-1.5">{value.options.map((o, i) => <Chip key={o} size="sm" active={value.ownChoice === i} onClick={() => onChange({ ...value, ownChoice: i })}>{o}</Chip>)}</div>
        <p className="text-[11px] text-ink-3 mt-2">{t('내 답을 고르면 방문자도 한 표씩 던질 수 있어요.')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {POLL_PROMPTS.map((q) => <button key={q.id} type="button" onClick={() => onChange({ questionId: q.id, options: q.options, ownChoice: 0, votes: {} })} className="w-full text-left card px-3.5 py-3 press"><div className="text-[14px] font-semibold">{q.text}</div><div className="text-[12px] text-ink-3 mt-0.5">{q.options.join(' · ')}</div></button>)}
    </div>
  );
}

/** 다른 사람 프로필에서 보는 투표 카드 */
export function PollCard({ poll, ownerName, myVote, onVote, isMine }: { poll: PollPrompt; ownerName: string; myVote?: number; onVote?: (i: number) => void; isMine?: boolean }) {
  const q = pollById(poll.questionId);
  // 다른 사람 투표는 서버가 집계(tally)만 보낸다 — 누가 무엇을 골랐는지는 오지 않는다
  const counts = pollCounts(poll);
  const total = counts.reduce((a, b) => a + b, 0);
  const voted = myVote !== undefined || isMine;
  return (
    <div className="rounded-2xl bg-surface-2 p-3.5">
      <div className="text-[12px] font-bold text-ink-3 flex items-center gap-1"><BarChart3 size={12} />{ownerName}{t('의 투표 ·')} {q?.text}</div>
      <div className="mt-2 space-y-1.5">
        {poll.options.map((o, i) => {
          const pct = total ? Math.round((counts[i] / total) * 100) : 0;
          return (
            <button key={o} type="button" disabled={voted || !onVote} onClick={() => onVote?.(i)} className="relative w-full h-10 rounded-xl overflow-hidden bg-surface border border-line text-left px-3 text-[13px] font-semibold press disabled:opacity-100">
              {voted && <span className="absolute inset-y-0 left-0 bg-primary-soft" style={{ width: `${pct}%` }} />}
              <span className="relative flex items-center justify-between"><span className="flex items-center gap-1.5">{o}{poll.ownChoice === i && <Tag tone="primary" className="h-5">{ownerName}{t('의 답')}</Tag>}{myVote === i && <Check size={14} className="text-primary" />}</span>{voted && <span className="text-ink-3">{pct}%</span>}</span>
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-ink-3 mt-2">{total}{t('명 참여')}{!voted && onVote ? t(' · 한 표 던져보세요') : ''}</div>
    </div>
  );
}

/** 프로필 상세의 텍스트 답변 카드 */
export function PromptAnswerCard({ prompt, compact }: { prompt: ProfilePrompt; compact?: boolean }) {
  const q = questionById(prompt.questionId);
  return (
    <div className={cn('rounded-2xl', compact ? 'bg-primary-soft px-3 py-2' : 'card p-4')}>
      <div className={cn('font-bold text-primary', compact ? 'text-[11px]' : 'text-[12px]')}>{q?.text}</div>
      <div className={cn('text-ink leading-snug mt-0.5', compact ? 'text-[13px] font-semibold line-clamp-2' : 'text-[16px] font-bold mt-1')}>{prompt.answer}</div>
    </div>
  );
}

export function CompletionMeter({ percent, done, total, complete }: { percent: number; done: number; total: number; complete: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-line overflow-hidden"><div className={cn('h-full rounded-full transition-all', complete ? 'bg-ok' : 'bg-sel')} style={{ width: `${percent}%` }} /></div>
      <span className={cn('text-[12px] font-bold tabular-nums', complete ? 'text-mint' : 'text-ink-2')}>{done}/{total}</span>
      {complete && <Tag tone="mint"><Check size={11} /> {t('프로필 완성')}</Tag>}
    </div>
  );
}
