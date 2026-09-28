import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Quote, Send } from 'lucide-react';
import { t } from '@core/i18n';
import type { FriendNote, ProfilePrompt, User } from '@core/types';
import { questionById } from '@core/data/prompts';
import { containsContact } from '@core/lib/privacy';
import { isPlus, swipesLeft } from '@core/lib/monetization';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { BottomSheet, Button, Textarea } from '@/components/ui';
import { PaywallSheet } from '@/components/social/PaywallSheet';
import { useViewer } from '@/hooks/useViewer';
import { fmt } from '@/components/people_Network';

export const NOTE_MAX = 140;

/** 받은 연결 요청의 한마디 — 인용한 답(옅은 말풍선) + 보낸 사람의 한 줄 */
export function NoteBubble({ note, className }: { note?: FriendNote; className?: string }) {
  if (!note?.text) return null;
  const q = note.promptId ? questionById(note.promptId) : undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      {note.quote && (
        <div className="rounded-2xl bg-primary-soft/70 px-3 py-2">
          {q && <div className="text-[11px] font-semibold text-ink-3 truncate">{q.text}</div>}
          <div className="text-[13px] text-ink-2 line-clamp-2 flex gap-1"><Quote size={11} className="text-primary shrink-0 mt-1" /><span>{note.quote}</span></div>
        </div>
      )}
      <div className="text-[14px] font-medium text-ink leading-snug">{note.text}</div>
    </div>
  );
}

type Target = { user: User; prompt: ProfilePrompt };

/**
 * 답에 한마디 — Hinge 처럼 프로필의 답 하나를 인용해서 연결을 요청한다.
 * 이미 연결된 사이면 대화방으로 보내고, 요청을 보낸 뒤면 막아 둔다.
 */
export function PromptReplySheet({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const key = target ? `${target.user.id}:${target.prompt.questionId}` : '';
  useEffect(() => { setText(''); setErr(null); }, [key]);

  const user = target?.user;
  const friend = user ? v.isFriend(user.id) : false;
  const pending = user ? !!v.pendingOut(user.id) : false;
  const q = target ? questionById(target.prompt.questionId) : undefined;
  const contact = containsContact(text);
  const trimmed = text.trim();

  const send = async () => {
    if (!target || !user || !trimmed) return;
    if (contact) { setErr(t('연락처는 한마디에 적을 수 없어요.')); return; }
    setBusy(true); setErr(null);
    try {
      if (friend) {
        const res = await run(() => api.chats.openDirect(v.me.id, user.id));
        await run(() => api.chats.send(res.room.id, v.me.id, `“${target.prompt.answer}” — ${trimmed}`));
        onClose();
        nav(`/chats/${res.room.id}`);
      } else {
        if (!isPlus(v.me) && swipesLeft(v.me) <= 0) { setPaywall(true); return; }
        await run(() => api.relationships.sendFriendRequest(v.me.id, user.id, { text: trimmed, promptId: target.prompt.questionId, quote: target.prompt.answer }), fmt(t('{name}님에게 한마디와 함께 연결 요청을 보냈어요'), { name: user.nickname }));
        onClose();
      }
    } catch (e) {
      setErr((e as Error).message || t('문제가 발생했어요.'));
    } finally { setBusy(false); }
  };

  return (
    <>
      <BottomSheet open={!!target} onClose={onClose} title={user ? fmt(t('{name}님의 답에 한마디'), { name: user.nickname }) : ''}>
        {target && user && (
          <div className="space-y-3">
            <div className="rounded-[20px] bg-primary-soft/70 px-4 py-3">
              <div className="text-[12px] font-semibold text-ink-3">{q?.text}</div>
              <div className="mt-1 text-[17px] font-bold text-ink leading-snug">{target.prompt.answer}</div>
            </div>
            <div>
              <Textarea rows={3} maxLength={NOTE_MAX} autoFocus value={text} onChange={(e) => { setText(e.target.value); setErr(null); }}
                placeholder={t('예: 저도 거기 좋아해요! 다음에 같이 가요')} aria-invalid={contact || !!err} disabled={pending && !friend} />
              <div className="mt-1 flex items-start gap-2">
                <p className={cn('flex-1 text-[12px]', contact || err ? 'text-danger' : 'text-ink-3')} role={contact || err ? 'alert' : undefined}>
                  {contact ? t('연락처는 한마디에 적을 수 없어요.') : err ?? (friend ? t('이미 연결된 사이라 대화방으로 보내요') : t('답을 인용해서 보내면 대화가 쉽게 시작돼요'))}
                </p>
                <span className="text-[11px] text-ink-3 tabular-nums shrink-0">{text.length}/{NOTE_MAX}</span>
              </div>
            </div>
            {pending && !friend ? (
              <Button full size="lg" variant="secondary" disabled>{t('이미 연결 요청을 보냈어요')}</Button>
            ) : (
              <Button full size="lg" loading={busy} disabled={!trimmed || contact} icon={friend ? <Send size={16} /> : <MessageCircle size={16} />} onClick={send}>
                {friend ? t('메시지로 보내기') : t('한마디와 함께 연결 요청')}
              </Button>
            )}
          </div>
        )}
      </BottomSheet>
      <PaywallSheet open={paywall} onClose={() => setPaywall(false)} reason="limit" />
    </>
  );
}

/** Hinge 느낌의 답 카드 — 작은 질문 · 큰 답 · 오른쪽 아래 "한마디" */
export function HingePromptCard({ prompt, onReply, replyState = 'ready', className }: { prompt: ProfilePrompt; onReply?: () => void; replyState?: 'ready' | 'pending' | 'hidden'; className?: string }) {
  const q = questionById(prompt.questionId);
  return (
    <article className={cn('card p-5', className)}>
      <div className="text-[13px] font-semibold text-ink-2">{q?.text}</div>
      <div className="mt-2 font-display text-[22px] leading-snug font-bold text-ink break-keep">{prompt.answer}</div>
      {onReply && replyState !== 'hidden' && (
        <div className="mt-3 flex justify-end">
          {replyState === 'pending'
            ? <span className="h-9 px-3.5 rounded-full bg-surface-2 text-ink-3 text-[12px] font-semibold inline-flex items-center gap-1.5"><MessageCircle size={14} />{t('요청 보냄')}</span>
            : <button type="button" onClick={onReply} className="h-9 px-3.5 rounded-full bg-primary-soft text-primary text-[13px] font-semibold inline-flex items-center gap-1.5 press"><MessageCircle size={14} />{t('한마디')}</button>}
        </div>
      )}
    </article>
  );
}
