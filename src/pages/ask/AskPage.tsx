import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import type { AiCard } from '@core/api/types';
import { TopBar } from '@/components/layout/TopBar';
import { AiCardView } from '@/components/ai/AiCards';
import { useAiEnabled } from '@/hooks/useAiEnabled';
import { useViewer } from '@/hooks/useViewer';
import { cn } from '@core/lib/cn';

interface Turn { role: 'user' | 'assistant'; content: string; cards?: AiCard[]; error?: boolean }
const KEY = 'aroundu.ask.turns';

const L = lang === 'en'
  ? { title: 'Ask Lumi', hello: 'Ask about events, free food, clubs, classes or opportunities at your school.', note: 'Answers come only from Lumi’s listings — check the official page before you apply.', placeholder: 'Ask anything about campus…', thinking: 'Looking through campus listings…', off: 'The assistant isn’t switched on yet.', clear: 'New chat' }
  : { title: 'Ask Lumi', hello: '우리 학교 행사, 무료 음식, 동아리, 수업, 공고에 대해 물어보세요.', note: 'Lumi에 있는 정보로만 답해요 — 지원 전에는 공식 페이지를 꼭 확인하세요.', placeholder: '캠퍼스에 대해 무엇이든 물어보세요…', thinking: '캠퍼스 정보를 찾는 중…', off: '아직 AI 도우미가 켜져 있지 않아요.', clear: '새 대화' };

const EXAMPLES = lang === 'en'
  ? ['Free food on campus today?', 'Summer internships in finance for a sophomore', 'Clubs for climbing or photography', 'Hackathons I can join this month', 'Any scholarships with deadlines soon?']
  : ['오늘 캠퍼스에 무료 음식 있어?', '2학년이 지원할 수 있는 금융 여름 인턴', '클라이밍이나 사진 동아리', '이번 달에 나갈 수 있는 해커톤', '마감 임박한 장학금 있어?'];

/** **굵게** 와 줄머리 '- ' 정도만 그린다 */
function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-[14px] leading-relaxed text-ink">
      {text.split('\n').filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim())).map((line, i) => {
        const bullet = /^\s*([-*•]|\d+\.)\s+/.test(line);
        const body = line.replace(/^\s*([-*•]|\d+\.)\s+/, '');
        const parts = body.split(/(\*\*[^*]+\*\*)/g).map((p, j) => (p.startsWith('**') && p.endsWith('**') ? <b key={j}>{p.slice(2, -2)}</b> : <span key={j}>{p}</span>));
        return line.trim() ? <p key={i} className={cn(bullet && 'pl-4 relative before:content-["•"] before:absolute before:left-1 before:text-ink-3')}>{parts}</p> : <div key={i} className="h-1" />;
      })}
    </div>
  );
}

/** Ask Lumi — 우리 데이터만 검색해서 답하는 캠퍼스 도우미 */
export function AskPage() {
  const on = useAiEnabled();
  const v = useViewer();
  const [turns, setTurns] = useState<Turn[]>(() => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? '[]'); } catch { return []; } });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(turns.slice(-20))); } catch { /* */ } end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns, busy]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: question }];
    setTurns(next); setText(''); setBusy(true);
    try {
      const history = next.filter((x) => !x.error).map((x) => ({ role: x.role, content: x.content }));
      const r = await api.ai.ask(history);
      setTurns((cur) => [...cur, { role: 'assistant', content: r.answer, cards: r.cards }]);
    } catch (e) {
      setTurns((cur) => [...cur, { role: 'assistant', content: (e as Error).message, error: true }]);
    } finally { setBusy(false); }
  };

  const school = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolName : '';
  return (
    <div className="h-full flex flex-col bg-bg">
      <TopBar back title={L.title} right={turns.length ? <button onClick={() => setTurns([])} className="text-[13px] font-semibold text-primary px-3">{L.clear}</button> : undefined} />
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar px-4 pb-4">
        {turns.length === 0 && (
          <div className="pt-6">
            <div className="h-12 w-12 rounded-2xl bg-primary-soft text-primary grid place-items-center"><Sparkles size={22} /></div>
            <h2 className="mt-3 text-[20px] font-extrabold">{school ? (lang === 'en' ? `What’s on at ${school}?` : `${school}에서 뭐 찾아요?`) : L.title}</h2>
            <p className="text-[13px] text-ink-3 mt-1">{on ? L.hello : L.off}</p>
            {on && <div className="mt-4 flex flex-col gap-2">{EXAMPLES.map((q) => <button key={q} onClick={() => send(q)} className="text-left rounded-2xl bg-surface border border-line px-4 py-3 text-[14px] text-primary press">{q}</button>)}</div>}
          </div>
        )}
        <div className="space-y-4 pt-3">
          {turns.map((m, i) => m.role === 'user' ? (
            <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-white px-3.5 py-2.5 text-[14px] whitespace-pre-wrap">{m.content}</div></div>
          ) : (
            <div key={i} className="space-y-2">
              <div className={cn('rounded-2xl rounded-bl-md px-3.5 py-3', m.error ? 'bg-danger/10 text-danger text-[14px]' : 'bg-surface border border-line')}>{m.error ? m.content : <RichText text={m.content} />}</div>
              {m.cards?.map((c) => <AiCardView key={`${c.kind}:${c.id}`} card={c} />)}
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-[13px] text-ink-3"><span className="h-2 w-2 rounded-full bg-primary animate-pulse" />{L.thinking}</div>}
        </div>
        <div ref={end} />
      </div>
      <div className="shrink-0 border-t border-line bg-surface px-3 pt-2 pb-3 safe-bottom">
        <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex items-end gap-2">
          <textarea rows={1} value={text} disabled={!on} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(text); } }} placeholder={L.placeholder}
            className="flex-1 resize-none max-h-32 min-h-[44px] rounded-2xl bg-surface-2 px-4 py-2.5 text-[15px] outline-none" />
          <button type="submit" disabled={!on || busy || !text.trim()} aria-label="Send" className="h-11 w-11 rounded-full bg-primary text-white grid place-items-center press disabled:opacity-40"><ArrowUp size={20} /></button>
        </form>
        <p className="text-[11px] text-ink-3 mt-1.5 px-1">{L.note}</p>
      </div>
    </div>
  );
}
