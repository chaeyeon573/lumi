/**
 * 수업 질문 탭 (PDF S030 Class space › Questions) — 같은 수업을 듣는, 학교 이메일을 인증한 학생끼리만.
 * 규칙·저장: @core/lib/classqa, server/classqa.ts. 명단과 같은 기준이라 명단을 못 보는 사람은 질문도 못 본다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircleQuestion } from 'lucide-react';
import { lang } from '@core/i18n';
import type { ClassQuestionView } from '@core/lib/classqa';
import { CLASS_QA_LIMITS } from '@core/lib/classqa';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { relativeTime } from '@core/lib/format';
import { Avatar } from '@/components/ui';
import { Btn, TextArea, InfoNote, EmptyState, LoadingCards, ErrorScreen, cardCls } from '@/components/ha';
import { cn } from '@core/lib/cn';

const en = lang === 'en';

export function ClassQuestions({ classKey, code }: { classKey: string; code: string }) {
  const nav = useNavigate();
  const toast = useAppStore((s) => s.showToast);
  const [list, setList] = useState<ClassQuestionView[] | null>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const load = useCallback(() => {
    setError('');
    api.classQA.list(classKey).then(setList).catch((e) => setError((e as Error).message));
  }, [classKey]);
  useEffect(() => { load(); }, [load]);
  const act = async (fn: () => Promise<ClassQuestionView[]>, done?: () => void) => {
    setBusy(true);
    try { setList(await fn()); done?.(); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  if (error && !list) return <ErrorScreen message={error} onRetry={load} />;
  if (!list) return <LoadingCards count={2} className="pt-2" />;
  return (
    <div className="space-y-4">
      <div className={cn(cardCls, 'p-3 space-y-2.5')}>
        <TextArea value={text} onChange={(e) => setText(e.target.value)} maxLength={CLASS_QA_LIMITS.text} className="min-h-[76px] bg-surface-2"
          placeholder={en ? `Ask ${code} classmates — a homework hint, a lecture you missed…` : `${code} 학생들에게 물어보기 — 과제 힌트, 놓친 수업…`} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-3">{en ? 'Your name is shown' : '이름이 함께 보여요'}</span>
          <Btn size="sm" loading={busy && !replyTo} disabled={text.trim().length < 2} onClick={() => act(() => api.classQA.ask(classKey, text), () => setText(''))}>{en ? 'Ask' : '질문하기'}</Btn>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<MessageCircleQuestion size={28} />} title={en ? 'Ask your classmates' : '같은 수업 학생에게 물어보세요'} className="pt-4"
          sub={en ? `Only verified ${code} students on Lumi see questions here.` : `인증한 ${code} 학생에게만 보여요.`} />
      ) : list.map((q) => (
        <div key={q.id} className={cn(cardCls, 'p-4')}>
          <Byline person={q.author} when={q.createdAt} onOpen={() => nav(`/users/${q.author.id}`)} mine={q.mine} />
          <p className="text-[14.5px] text-ink mt-2 leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{q.text}</p>
          {q.answers.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 border-line pl-3">
              {q.answers.map((a) => (
                <div key={a.id}>
                  <Byline person={a.author} when={a.createdAt} onOpen={() => nav(`/users/${a.author.id}`)} mine={a.mine} small
                    onDelete={a.mine ? () => act(() => api.classQA.remove(q.id, a.id)) : undefined} />
                  <p className="text-[13.5px] text-ink-2 mt-1 leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{a.text}</p>
                </div>
              ))}
            </div>
          )}
          {replyTo === q.id ? (
            <div className="mt-3 space-y-2">
              <TextArea autoFocus value={reply} onChange={(e) => setReply(e.target.value)} maxLength={CLASS_QA_LIMITS.text} className="min-h-[64px] bg-surface-2" placeholder={en ? 'Write an answer' : '답 쓰기'} />
              <div className="flex justify-end gap-2">
                <Btn size="sm" variant="link" onClick={() => { setReplyTo(null); setReply(''); }}>{en ? 'Cancel' : '취소'}</Btn>
                <Btn size="sm" variant="outline" loading={busy} disabled={reply.trim().length < 2} onClick={() => act(() => api.classQA.answer(q.id, reply), () => { setReplyTo(null); setReply(''); })}>{en ? 'Post answer' : '답 올리기'}</Btn>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-4">
              <button onClick={() => { setReplyTo(q.id); setReply(''); }} className="text-[13px] font-semibold text-sel-fg press">{en ? 'Answer' : '답하기'}</button>
              {q.mine && <button onClick={() => act(() => api.classQA.remove(q.id))} className="text-[13px] font-medium text-ink-3 press">{en ? 'Delete' : '지우기'}</button>}
            </div>
          )}
        </div>
      ))}
      <InfoNote>{en ? 'Only verified classmates in this class can see questions. Be kind — no exam answers.' : '이 수업을 듣는 인증 학생만 볼 수 있어요. 시험 답은 올리지 마세요.'}</InfoNote>
    </div>
  );
}

function Byline({ person, when, onOpen, mine, small, onDelete }: { person: ClassQuestionView['author']; when: string; onOpen: () => void; mine: boolean; small?: boolean; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={onOpen} className="flex items-center gap-2.5 min-w-0 press">
        <Avatar emoji={person.avatar.emoji} hue={person.avatar.hue} url={person.avatar.url} size={small ? 24 : 32} />
        <span className={cn('font-semibold truncate', small ? 'text-[12.5px]' : 'text-[13.5px]')}>{mine ? (en ? 'You' : '나') : person.nickname}{person.sample && <span className="ml-1.5 text-[11px] font-medium text-ink-3">{en ? 'Sample' : '예시'}</span>}</span>
      </button>
      <span className="text-[12px] text-ink-3 shrink-0">{relativeTime(when)}</span>
      {onDelete && <button onClick={onDelete} className="ml-auto text-[12px] text-ink-3 press">{en ? 'Delete' : '지우기'}</button>}
    </div>
  );
}
