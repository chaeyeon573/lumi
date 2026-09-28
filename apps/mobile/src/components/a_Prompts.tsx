/** 프로필 프롬프트 표시 (웹 PromptComponents 의 PromptAnswerCard / VoicePlayer / PollCard) */
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Play, Pause, BarChart3, Check } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { PollPrompt, ProfilePrompt } from '@core/types';
import { questionById, pollById } from '@core/data/prompts';
import { tw } from '@/tw';
import { Tag, C } from '@/ui';

/** 프로필 상세의 텍스트 답변 카드 */
export function PromptAnswerCard({ prompt, compact }: { prompt: ProfilePrompt; compact?: boolean }) {
  const q = questionById(prompt.questionId);
  return (
    <View style={tw`${compact ? 'rounded-2xl bg-primary-soft px-3 py-2' : 'card p-4'}`}>
      <Text style={tw`font-bold text-primary ${compact ? 'text-[11px]' : 'text-[12px]'}`}>{q?.text}</Text>
      <Text numberOfLines={compact ? 2 : undefined} style={tw`text-ink leading-5 ${compact ? 'text-[13px] font-semibold mt-0.5' : 'text-[16px] font-bold mt-1'}`}>{prompt.answer}</Text>
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
      <Pressable onPress={() => setPlaying((p) => !p)} style={tw`h-9 w-9 rounded-full bg-primary items-center justify-center`}>{playing ? <Pause size={16} color={C.onPrimary} /> : <Play size={16} color={C.onPrimary} style={{ marginLeft: 2 }} />}</Pressable>
      <Waveform progress={pos / duration} />
      <Text style={tw`text-[12px] font-semibold text-primary`}>{playing ? `${pos}s` : `${duration}s`}</Text>
    </View>
  );
}

function Waveform({ progress = 0 }: { progress?: number }) {
  const bars = [4, 9, 14, 8, 16, 11, 6, 13, 9, 15, 7, 12, 5, 10, 14, 8, 6, 11, 9, 13];
  return (
    <View style={[tw`flex-1 flex-row items-center h-5 mx-2.5`, { gap: 3 }]}>
      {bars.map((h, i) => <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: i / bars.length < progress ? C.primary : C.tint2 }} />)}
    </View>
  );
}

export function PollCard({ poll, ownerName, myVote, onVote, isMine }: { poll: PollPrompt; ownerName: string; myVote?: number; onVote?: (i: number) => void; isMine?: boolean }) {
  const q = pollById(poll.questionId);
  const counts = poll.options.map((_, i) => Object.values(poll.votes).filter((v) => v === i).length);
  const total = counts.reduce((a, b) => a + b, 0);
  const voted = myVote !== undefined || isMine;
  return (
    <View style={tw`rounded-2xl bg-surface-2 p-3.5`}>
      <View style={tw`flex-row items-center`}><BarChart3 size={12} color={C.ink3} /><Text style={tw`ml-1 text-[12px] font-bold text-ink-3 shrink`}>{ownerName}{t('의 투표 ·')} {q?.text}</Text></View>
      <View style={tw`mt-2`}>
        {poll.options.map((o, i) => {
          const pct = total ? Math.round((counts[i] / total) * 100) : 0;
          return (
            <Pressable key={o} disabled={voted || !onVote} onPress={() => onVote?.(i)} style={tw`h-10 rounded-xl overflow-hidden bg-white border border-line justify-center px-3 mb-1.5`}>
              {voted ? <View style={[tw`absolute top-0 bottom-0 left-0 bg-primary-soft`, { width: `${pct}%` }]} /> : null}
              <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center shrink`}><Text style={tw`text-[13px] font-semibold text-ink`}>{o}</Text>{poll.ownChoice === i ? <View style={tw`ml-1.5`}><Tag tone="primary">{ownerName}{t('의 답')}</Tag></View> : null}{myVote === i ? <Check size={14} color={C.primary} style={{ marginLeft: 6 }} /> : null}</View>
                {voted ? <Text style={tw`text-[13px] text-ink-3`}>{pct}%</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={tw`text-[11px] text-ink-3 mt-0.5`}>{total}{t('명 참여')}{!voted && onVote ? t(' · 한 표 던져보세요') : ''}</Text>
    </View>
  );
}
