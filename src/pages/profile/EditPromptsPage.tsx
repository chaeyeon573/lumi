import { useState } from 'react';
import { FormField, InfoNote, TextArea } from '@/components/ha';
import { GET_TO_KNOW_ME_IDS, questionById } from '@core/data/prompts';
import { SaveButton, SubScreen, en, useSaveSelf } from './shared';

/**
 * Get to know me (PDF S073): "Optional. A few short answers are all you need." — 세 질문, 모두 선택.
 * 여기 없는 예전 질문 답·음성·투표는 지우지 않고 그대로 둔다 (프로필에는 이 세 개가 먼저 보인다).
 * 누가 보는지는 Visibility settings 의 Prompt answers (fieldVisibility.prompts) 가 정한다.
 */
export function EditPromptsPage() {
  const { me, busy, save } = useSaveSelf();
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(GET_TO_KNOW_ME_IDS.map((id) => [id, me.prompts.find((p) => p.questionId === id)?.answer ?? ''])));
  const submit = () => {
    const mine = GET_TO_KNOW_ME_IDS.filter((id) => answers[id].trim()).map((id) => ({ questionId: id, answer: answers[id].trim() }));
    const others = me.prompts.filter((p) => !(GET_TO_KNOW_ME_IDS as readonly string[]).includes(p.questionId));
    return save({ prompts: [...mine, ...others] }, en ? 'Answers saved' : '답을 저장했어요');
  };
  return (
    <SubScreen title={en ? 'Get to know me' : '나를 소개해요'} sub={en ? 'Optional. A few short answers are all you need.' : '선택이에요. 짧게 몇 줄이면 충분해요.'}
      cta={<SaveButton label={en ? 'Save Answers' : '답 저장'} busy={busy} onClick={submit} />}>
      <div className="space-y-5">
        {GET_TO_KNOW_ME_IDS.map((id) => {
          const q = questionById(id)!;
          return (
            <FormField key={id} label={q.text}>
              <TextArea value={answers[id]} maxLength={120} placeholder={q.placeholder} onChange={(e) => setAnswers((a) => ({ ...a, [id]: e.target.value }))} />
            </FormField>
          );
        })}
        <InfoNote>{en ? 'Choose who sees your answers in Visibility settings.' : '누가 볼지는 공개 범위 설정에서 정해요.'}</InfoNote>
      </div>
    </SubScreen>
  );
}
