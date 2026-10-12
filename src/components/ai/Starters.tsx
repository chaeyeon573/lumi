import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Sparkles } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import type { User } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { useAiEnabled } from '@/hooks/useAiEnabled';
import { Button } from '@/components/ui';

const L = lang === 'en'
  ? { title: 'Not sure what to say?', sub: 'Get openers based on what you have in common — only from what they chose to share.', go: 'Suggest openers', again: 'More ideas', use: 'Tap one to start a chat' }
  : { title: '뭐라고 말을 걸지 모르겠다면', sub: '공통점으로 첫마디를 제안해요 — 상대가 공개한 정보만 써요.', go: '첫마디 추천받기', again: '다른 아이디어', use: '누르면 채팅이 열려요' };

/** 사람 프로필의 '첫마디 추천' — 고르면 1:1 채팅을 열고 입력창에 넣어 둔다 */
export function ConversationStarters({ user }: { user: User }) {
  const on = useAiEnabled();
  const v = useViewer();
  const nav = useNavigate();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const [list, setList] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  if (!on || user.id === v.me.id) return null;

  const load = async () => {
    setBusy(true);
    try { setList((await api.ai.starters(user.id, lang)).starters); } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const use = async (line: string) => {
    try { const res = await run(() => api.chats.openDirect(v.me.id, user.id)); nav(`/chats/${res.room.id}?draft=${encodeURIComponent(line)}`); } catch { /* toast */ }
  };
  return (
    <div className="card p-4">
      <b className="text-[14px] flex items-center gap-1.5"><Sparkles size={15} className="text-primary" />{L.title}</b>
      <p className="text-[12px] text-ink-3 mt-0.5">{list.length ? L.use : L.sub}</p>
      {list.length > 0 && <div className="mt-2.5 space-y-2">{list.map((s) => <button key={s} onClick={() => use(s)} className="w-full text-left rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] text-ink flex items-start gap-2 press"><MessageCircle size={14} className="text-primary shrink-0 mt-0.5" /><span>{s}</span></button>)}</div>}
      <Button className="mt-3" size="sm" variant={list.length ? 'outline' : 'secondary'} loading={busy} onClick={load}>{list.length ? L.again : L.go}</Button>
    </div>
  );
}
