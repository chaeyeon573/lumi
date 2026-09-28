import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Plus, X, Mic, Square, Play, Pause, Trash2, BarChart3, Pencil } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { PollPrompt, ProfilePrompt, VoicePrompt } from '@core/types';
import { TEXT_PROMPTS, VOICE_PROMPTS, POLL_PROMPTS, PROMPT_CATEGORY_LABELS, questionById, pollById, MAX_TEXT_PROMPTS, REQUIRED_TEXT_PROMPTS, REQUIRED_SLOTS, FIRST_PROMPT_ID, slotCategories, normalizePrompts, type PromptCategory } from '@core/data/prompts';
import { tw } from '@/tw';
import { BottomSheet, Chip, Textarea, Tag, C } from '@/ui';

const card = tw`card`;

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
    <View>
      {value.map((p, i) => {
        const q = questionById(p.questionId);
        const fixed = i === 0;
        const hint = REQUIRED_SLOTS[i]?.hint;
        return (
          <View key={p.questionId} style={[card, tw`p-3.5 mb-2.5`]}>
            {hint && <Text style={tw`text-[11px] font-semibold text-ink-3 mb-1`}>{i + 1}. {hint}{fixed ? ` · ${t('첫 질문은 고정이에요')}` : ''}</Text>}
            <View style={tw`flex-row items-start justify-between`}>
              {fixed
                ? <View style={tw`flex-1 pr-2`}><Text style={tw`text-[13px] font-bold text-primary`}>{q?.text}</Text></View>
                : <Pressable onPress={() => openPicker(i)} style={tw`flex-1 flex-row items-center pr-2`}><Text style={tw`text-[13px] font-bold text-primary shrink`}>{q?.text}</Text><Pencil size={11} color={C.ink3} style={tw`ml-1`} /></Pressable>}
              {!fixed && <Pressable onPress={() => onChange(normalizePrompts(value.filter((_, j) => j !== i)))} hitSlop={6} style={tw`h-6 w-6 items-center justify-center`}><X size={15} color={C.ink3} /></Pressable>}
            </View>
            <Textarea style={tw`mt-2 min-h-[64px]`} placeholder={q?.placeholder ?? t('2줄 이내로 짧게')} maxLength={80} value={p.answer} onChangeText={(text) => onChange(value.map((x, j) => (j === i ? { ...x, answer: text } : x)))} />
            <Text style={tw`text-right text-[11px] text-ink-3 mt-1`}>{p.answer.length}/80</Text>
          </View>
        );
      })}
      {value.length < MAX_TEXT_PROMPTS && (
        <Pressable onPress={() => openPicker(null)} style={tw`h-12 rounded-2xl border-2 border-dashed border-line flex-row items-center justify-center`}>
          <Plus size={16} color={C.ink2} />
          <Text style={tw`ml-1.5 text-[13px] font-semibold text-ink-2`}>{value.length < REQUIRED_TEXT_PROMPTS ? (lang === 'en' ? `Add a prompt (${answered}/${REQUIRED_TEXT_PROMPTS} required)` : `질문 추가 (${answered}/${REQUIRED_TEXT_PROMPTS} 필수)`) : t('질문 하나 더 답하기')}</Text>
        </Pressable>
      )}
      <BottomSheet open={pickerOpen} onClose={() => { setPickerOpen(false); setEditing(null); }} title={slot ? `${targetIndex + 1}. ${slot.hint}` : t('질문 고르기')} tall>
        {slot && <Text style={tw`text-[12px] text-ink-3 mb-2`}>{t('이 자리에는 다른 종류의 질문이 들어가요')}: {slot.categories.map((c) => PROMPT_CATEGORY_LABELS[c]).join(' · ')}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pb-2`}>
          <Chip size="sm" active={cat === 'all'} onPress={() => setCat('all')}>{t('전체')}</Chip>
          {(Object.keys(PROMPT_CATEGORY_LABELS) as PromptCategory[]).filter((c) => !allowed || allowed.includes(c)).map((c) => <Chip key={c} size="sm" active={cat === c} onPress={() => setCat(c)}>{PROMPT_CATEGORY_LABELS[c]}</Chip>)}
        </ScrollView>
        <View style={tw`mt-1`}>
          {TEXT_PROMPTS.filter((q) => q.id !== FIRST_PROMPT_ID && (!allowed || allowed.includes(q.category)) && (cat === 'all' || q.category === cat)).map((q) => {
            const taken = used.has(q.id) && value[editing ?? -1]?.questionId !== q.id;
            return (
              <Pressable key={q.id} disabled={taken} onPress={() => pick(q.id)} style={tw`rounded-xl px-3.5 py-3 border border-line mb-1.5 ${taken ? 'opacity-40' : ''}`}>
                <Text style={tw`text-[14px] font-medium text-ink`}>{q.text}</Text>
                <Text style={tw`text-[11px] text-ink-3 mt-0.5`}>{PROMPT_CATEGORY_LABELS[q.category]}{taken ? t(' · 이미 답했어요') : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

// ─── 음성 질문 (데모: 실제 녹음 대신 길이만 기록) ────────────────────────────
export function VoicePromptEditor({ value, onChange }: { value?: VoicePrompt; onChange: (v?: VoicePrompt) => void }) {
  const [questionId, setQuestionId] = useState(value?.questionId ?? VOICE_PROMPTS[0].id);
  const [recording, setRecording] = useState(false);
  const [sec, setSec] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; setRecording(false); if (sec >= 1) onChange({ questionId, durationSec: sec, recordedAt: new Date().toISOString() }); };
  useEffect(() => { if (recording && sec >= 30) stop(); }, [sec, recording]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { setSec(0); setRecording(true); timer.current = setInterval(() => setSec((s) => s + 1), 1000); };
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  if (value) {
    return (
      <View style={[card, tw`p-3.5`]}>
        <Text style={tw`text-[13px] font-bold text-primary`}>{questionById(value.questionId)?.text}</Text>
        <View style={tw`mt-2 flex-row items-center`}><VoicePlayer duration={value.durationSec} /><Pressable onPress={() => onChange(undefined)} hitSlop={6} style={tw`ml-3`}><Trash2 size={16} color={C.ink3} /></Pressable></View>
      </View>
    );
  }
  return (
    <View style={[card, tw`p-3.5`]}>
      <View style={tw`flex-row flex-wrap`}>{VOICE_PROMPTS.map((q) => <View key={q.id} style={tw`mb-1.5`}><Chip size="sm" active={questionId === q.id} onPress={() => !recording && setQuestionId(q.id)}>{q.text}</Chip></View>)}</View>
      <View style={tw`mt-3 flex-row items-center`}>
        <Pressable onPress={recording ? stop : start} style={tw`h-14 w-14 rounded-full items-center justify-center ${recording ? 'bg-danger' : 'bg-primary'}`}>{recording ? <Square size={20} color={C.onPrimary} /> : <Mic size={22} color={C.onPrimary} />}</Pressable>
        <View style={tw`flex-1 ml-3`}>
          <Text style={tw`text-[14px] font-semibold text-ink`}>{recording ? `${t('녹음 중 · ')}${sec}${t('초')}` : t('탭해서 녹음 (최대 30초)')}</Text>
          <Text style={tw`text-[11px] text-ink-3`}>{t('데모에서는 실제 음성 대신 녹음 길이만 저장돼요.')}</Text>
          {recording && <Waveform active />}
        </View>
      </View>
    </View>
  );
}

export function VoicePlayer({ duration }: { duration: number }) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setPos((p) => { if (p + 1 >= duration) { setPlaying(false); return 0; } return p + 1; }), 1000);
    return () => clearInterval(id);
  }, [playing, duration]);
  return (
    <View style={tw`flex-1 flex-row items-center rounded-xl bg-primary-soft px-3 py-2`}>
      <Pressable onPress={() => setPlaying((p) => !p)} style={tw`h-9 w-9 rounded-full bg-primary items-center justify-center`}>{playing ? <Pause size={16} color={C.onPrimary} /> : <Play size={16} color={C.onPrimary} style={tw`ml-0.5`} />}</Pressable>
      <View style={tw`flex-1 mx-2.5`}><Waveform active={playing} progress={pos / duration} /></View>
      <Text style={tw`text-[12px] font-semibold text-primary`}>{playing ? `${pos}s` : `${duration}s`}</Text>
    </View>
  );
}

function Waveform({ active, progress = 0 }: { active?: boolean; progress?: number }) {
  const bars = [4, 9, 14, 8, 16, 11, 6, 13, 9, 15, 7, 12, 5, 10, 14, 8, 6, 11, 9, 13];
  return (
    <View style={tw`flex-row items-center h-5`}>
      {bars.map((h, i) => <View key={i} style={[tw`w-[3px] rounded-full mr-[3px]`, { height: h, backgroundColor: i / bars.length < progress ? C.primary : C.tint2, opacity: active ? 0.8 : 1 }]} />)}
    </View>
  );
}

// ─── 투표형 질문 ───────────────────────────────────────────────────────────
export function PollEditor({ value, onChange }: { value?: PollPrompt; onChange: (v?: PollPrompt) => void }) {
  if (value) {
    const q = pollById(value.questionId);
    return (
      <View style={[card, tw`p-3.5`]}>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-1 flex-row items-center`}><BarChart3 size={13} color={C.primary} /><Text style={tw`ml-1 text-[13px] font-bold text-primary shrink`}>{q?.text}</Text></View>
          <Pressable onPress={() => onChange(undefined)} hitSlop={6}><Trash2 size={16} color={C.ink3} /></Pressable>
        </View>
        <View style={tw`mt-2 flex-row flex-wrap`}>{value.options.map((o, i) => <View key={o} style={tw`mb-1.5`}><Chip size="sm" active={value.ownChoice === i} onPress={() => onChange({ ...value, ownChoice: i })}>{o}</Chip></View>)}</View>
        <Text style={tw`text-[11px] text-ink-3 mt-2`}>{t('내 답을 고르면 방문자도 한 표씩 던질 수 있어요.')}</Text>
      </View>
    );
  }
  return (
    <View>
      {POLL_PROMPTS.map((q) => (
        <Pressable key={q.id} onPress={() => onChange({ questionId: q.id, options: q.options, ownChoice: 0, votes: {} })} style={[card, tw`px-3.5 py-3 mb-1.5`]}>
          <Text style={tw`text-[14px] font-semibold text-ink`}>{q.text}</Text>
          <Text style={tw`text-[12px] text-ink-3 mt-0.5`}>{q.options.join(' · ')}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function CompletionMeter({ percent, done, total, complete }: { percent: number; done: number; total: number; complete: boolean }) {
  return (
    <View style={tw`flex-row items-center`}>
      <View style={tw`flex-1 h-2 rounded-full bg-line overflow-hidden`}><View style={[tw`h-full rounded-full ${complete ? 'bg-mint' : 'bg-primary'}`, { width: `${percent}%` }]} /></View>
      <Text style={tw`ml-3 text-[12px] font-bold ${complete ? 'text-mint' : 'text-ink-2'}`}>{done}/{total}</Text>
      {complete && <View style={tw`ml-2`}><Tag tone="mint">✓ {t('프로필 완성')}</Tag></View>}
    </View>
  );
}
