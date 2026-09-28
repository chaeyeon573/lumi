import { useState } from 'react';
import { Text, View } from 'react-native';
import { t } from '@core/i18n';
import { profileCompletion, REQUIRED_TEXT_PROMPTS, promptsSatisfyRules } from '@core/data/prompts';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import type { PollPrompt, ProfilePrompt, VoicePrompt, Visibility } from '@core/types';
import { tw } from '@/tw';
import { replace } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Field } from '@/ui';
import { VisibilityPicker } from '@/components/b_VisibilityPicker';
import { stageKind } from '@core/lib/stage';
import { PromptEditor, VoicePromptEditor, PollEditor, CompletionMeter } from '@/components/b_PromptComponents';

/** 프로필 질문(텍스트 3개 필수 + 음성·투표 선택) 편집 (웹 EditPromptsPage) */
export default function EditPromptsScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const kind = stageKind(me);
  const [prompts, setPrompts] = useState<ProfilePrompt[]>(() => structuredClone(me.prompts));
  const [voice, setVoice] = useState<VoicePrompt | undefined>(me.voicePrompt);
  const [poll, setPoll] = useState<PollPrompt | undefined>(me.poll ? structuredClone(me.poll) : undefined);
  const [visibility, setVisibility] = useState<Visibility>(me.fieldVisibility.prompts);
  const [busy, setBusy] = useState(false);
  const answered = prompts.filter((p) => p.answer.trim()).length;
  const ok = promptsSatisfyRules(prompts, kind);
  const preview = profileCompletion({ ...me, prompts, voicePrompt: voice, poll });

  const save = async () => {
    setBusy(true);
    try {
      await run(() => api.users.update(me.id, { prompts, voicePrompt: voice, poll, fieldVisibility: { ...me.fieldVisibility, prompts: visibility } }), t('질문 답변을 저장했어요.'));
      replace('/profile');
    } catch { setBusy(false); }
  };

  return (
    <Screen title={t('질문 답변')} right={<VisibilityPicker compact value={visibility} onChange={setVisibility} label={t('질문 답변 공개 범위')} />}
      footer={<View style={tw`flex-row`}><Button full size="lg" loading={busy} disabled={!ok} onPress={save}>{ok ? t('저장') : `${t('필수 질문 ')}${REQUIRED_TEXT_PROMPTS - Math.min(answered, REQUIRED_TEXT_PROMPTS)}${t('개 더 답해주세요')}`}</Button></View>}>
      <View style={tw`py-4`}>
        <View style={tw`card p-4 mb-5`}><Text style={tw`text-[12px] font-semibold text-ink-3 mb-2`}>{t('프로필 완성도')}</Text><CompletionMeter {...preview} /></View>
        <Field label={`${t('텍스트 질문 (')}${answered}/${REQUIRED_TEXT_PROMPTS}${t(' 필수, 최대 6개)')} *`}><PromptEditor kind={kind} value={prompts} onChange={setPrompts} /></Field>
        <Field label={t('음성 질문 (선택)')}><VoicePromptEditor kind={kind} value={voice} onChange={setVoice} /></Field>
        <Field label={t('투표형 질문 (선택)')} hint={t('방문자가 한 표씩 던질 수 있어요. 질문을 바꾸면 기존 투표는 사라져요.')}><PollEditor kind={kind} value={poll} onChange={setPoll} /></Field>
      </View>
    </Screen>
  );
}
