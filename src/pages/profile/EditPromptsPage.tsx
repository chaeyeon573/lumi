import { useState } from 'react';
import { t } from '@core/i18n';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Field, VisibilityPicker } from '@/components/ui';
import { PromptEditor, VoicePromptEditor, PollEditor, CompletionMeter } from '@/components/prompts/PromptComponents';
import { isNativeShell } from '@/lib/native';
import { profileCompletion, REQUIRED_TEXT_PROMPTS, promptsSatisfyRules } from '@core/data/prompts';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import type { PollPrompt, ProfilePrompt, VoicePrompt, Visibility } from '@core/types';

/** 프로필 질문(텍스트 3개 필수 + 음성·투표 선택) 편집 */
export function EditPromptsPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const [prompts, setPrompts] = useState<ProfilePrompt[]>(() => structuredClone(me.prompts));
  const [voice, setVoice] = useState<VoicePrompt | undefined>(me.voicePrompt);
  const [poll, setPoll] = useState<PollPrompt | undefined>(me.poll ? structuredClone(me.poll) : undefined);
  const [visibility, setVisibility] = useState<Visibility>(me.fieldVisibility.prompts);
  const [busy, setBusy] = useState(false);
  const answered = prompts.filter((p) => p.answer.trim()).length;
  const ok = promptsSatisfyRules(prompts);
  const preview = profileCompletion({ ...me, prompts, voicePrompt: voice, poll });

  const save = async () => {
    setBusy(true);
    try {
      await run(() => api.users.update(me.id, { prompts, voicePrompt: voice, poll, fieldVisibility: { ...me.fieldVisibility, prompts: visibility } }), t('질문 답변을 저장했어요.'));
      nav('/profile', { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28">
      <TopBar back title={t('질문 답변')} right={<VisibilityPicker compact value={visibility} onChange={setVisibility} label={t('질문 답변 공개 범위')} />} />
      <div className="px-4 py-4 space-y-5">
        <div className="card p-4"><div className="text-[12px] font-semibold text-ink-3 mb-2">{t('프로필 완성도')}</div><CompletionMeter {...preview} /></div>
        <Field label={`${t('텍스트 질문 (')}${answered}/${REQUIRED_TEXT_PROMPTS}${t(' 필수, 최대 6개)')}`} required><PromptEditor value={prompts} onChange={setPrompts} /></Field>
        {/* 음성 질문은 실제로 녹음하지 않는 데모 — iPhone 앱에서는 숨긴다 (App Review 2.1) */}
        {!isNativeShell() && <Field label={t('음성 질문 (선택)')}><VoicePromptEditor value={voice} onChange={setVoice} /></Field>}
        <Field label={t('투표형 질문 (선택)')} hint={t('방문자가 한 표씩 던질 수 있어요. 질문을 바꾸면 기존 투표는 사라져요.')}><PollEditor value={poll} onChange={setPoll} /></Field>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" loading={busy} disabled={!ok} onClick={save}>{ok ? t('저장') : `${t('필수 질문 ')}${REQUIRED_TEXT_PROMPTS - Math.min(answered, REQUIRED_TEXT_PROMPTS)}${t('개 더 답해주세요')}`}</Button>
      </div>
    </div>
  );
}
