import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MessageCircle } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import type { User } from '@core/types';
import type { HiContext } from '@core/lib/sayhi';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { BottomSheet, Button, Textarea } from '@/components/ui';
import { cn } from '@core/lib/cn';

const en = lang === 'en';

/**
 * 사람 카드의 큰 버튼 — "Say hi". 하트·연결 대신 함께 가진 것(같은 수업 등)으로 시작하는 첫 메시지.
 * - 이미 대화할 수 있는 사이(친구·참가 승인 등)면 1:1 채팅을 열고 입력창에 초안을 채워 둔다 (보내는 건 본인이).
 * - 아니면 초안을 고칠 수 있는 시트 → 메시지 요청(활동 제안)으로 보낸다. 상대가 좋다고 하면 채팅이 열린다.
 */
export function SayHiButton({ user, hi, className }: { user: User; hi: HiContext; className?: string }) {
  const v = useViewer();
  const nav = useNavigate();
  const run = useAppStore((s) => s.run);
  const proposals = useAppStore((s) => s.proposals);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(hi.message);
  const [busy, setBusy] = useState(false);
  const sent = proposals.some((p) => p.fromId === v.me.id && p.toId === user.id && p.status === 'pending');
  const name = user.nickname;

  const start = async () => {
    if (v.canMessage(user.id).ok) {
      setBusy(true);
      try { const res = await run(() => api.chats.openDirect(v.me.id, user.id)); nav(`/chats/${res.room.id}?draft=${encodeURIComponent(hi.message)}`); } catch { /* toast */ } finally { setBusy(false); }
      return;
    }
    setText(hi.message); setOpen(true);
  };
  const send = async () => {
    setBusy(true);
    try {
      await run(() => api.proposals.create(v.me.id, user.id, { category: hi.category, message: text.trim(), when: en ? 'This week' : '이번 주' }), en ? `Sent — if ${name} says yes, a chat opens.` : `보냈어요 — ${name}님이 좋다고 하면 채팅이 열려요.`);
      setOpen(false);
    } catch { /* toast */ } finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={sent ? () => nav('/chats?tab=requests') : start} disabled={busy} aria-label={sent ? (en ? `Hi sent to ${name}` : `${name}님에게 인사 보냄`) : (en ? `Say hi to ${name}` : `${name}님에게 인사하기`)}
        className={cn('h-14 px-7 rounded-full flex items-center justify-center gap-2 text-[16px] font-bold press disabled:opacity-60',
          sent ? 'bg-surface-2 text-ink-2' : 'bg-primary text-white shadow-[0_10px_24px_-8px_rgba(15,43,72,.45)] v2:bg-lime-400 v2:text-night v2:shadow-none', className)}>
        {sent ? <Check size={18} /> : <MessageCircle size={19} />}{sent ? (en ? 'Hi sent' : '인사 보냄') : (en ? 'Say hi' : '인사하기')}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={en ? `Say hi to ${name}` : `${name}님에게 인사하기`}>
        <div className="space-y-3">
          <Textarea rows={4} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />
          <p className="text-[12px] text-ink-3">{en ? `${name} gets this as a message request. If they say yes, a chat opens — no reply, nothing happens.` : `${name}님에게 메시지 요청으로 가요. 좋다고 하면 채팅이 열리고, 답이 없으면 아무 일도 없어요.`}</p>
          <Button full size="lg" loading={busy} disabled={!text.trim()} onClick={send}>{en ? 'Send' : '보내기'}</Button>
        </div>
      </BottomSheet>
    </>
  );
}
