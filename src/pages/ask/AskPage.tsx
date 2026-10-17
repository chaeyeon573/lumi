import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Sparkles, Square } from 'lucide-react';
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
  ? ['I want to get into AI research — where do I start?', 'Internships open to undergrads', 'Hackathons I can still sign up for', 'Scholarships I can apply to this month', 'Free food on campus today?']
  : ['AI 연구 해보고 싶어, 뭐부터 하면 돼?', '학부생이 지원할 수 있는 인턴십', '아직 신청할 수 있는 해커톤', '이번 달에 지원할 수 있는 장학금', '오늘 캠퍼스에 무료 음식 있어?'];

/** **굵게** 와 줄머리 '- ' 정도만 그린다. 따옴표로만 된 줄머리(“Free food next week?”)는 누르면 그 질문을 보낸다 */
function RichText({ text, onAsk }: { text: string; onAsk?: (q: string) => void }) {
  return (
    <div className="space-y-1.5 text-[14px] leading-relaxed text-ink">
      {text.split('\n').filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim())).map((line, i) => {
        const bullet = /^\s*([-*•]|\d+\.)\s+/.test(line);
        const body = line.replace(/^\s*([-*•]|\d+\.)\s+/, '');
        const quoted = bullet && onAsk ? body.trim().match(/^[“"](.+?)[”"]$/)?.[1] : undefined;
        if (quoted) return <button key={i} type="button" onClick={() => onAsk!(quoted)} className="block text-left rounded-xl border border-line px-3 py-1.5 text-primary press">{quoted}</button>;
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
  // 생각하는 동안 보낸 질문 — 지금 답이 끝나면 이어서 묻는다
  const [queue, setQueue] = useState<string[]>([]);
  const runId = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(turns.slice(-20))); } catch { /* */ } end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns, busy]);

  const ask = async (upto: Turn[]) => {
    const id = ++runId.current;
    setBusy(true);
    try {
      const history = upto.filter((x) => !x.error).map((x) => ({ role: x.role, content: x.content }));
      const r = await api.ai.ask(history);
      if (id !== runId.current) return; // 멈춘 질문의 답은 버린다
      setTurns((cur) => [...cur, { role: 'assistant', content: r.answer, cards: r.cards }]);
    } catch (e) {
      if (id !== runId.current) return;
      setTurns((cur) => [...cur, { role: 'assistant', content: (e as Error).message, error: true }]);
    } finally { if (id === runId.current) setBusy(false); }
  };
  const send = (q: string) => {
    const question = q.trim();
    if (!question) return;
    setText('');
    setTurns((cur) => [...cur, { role: 'user', content: question }]);
    if (busy) { setQueue((x) => [...x, question]); return; }
    void ask([...turns, { role: 'user', content: question }]);
  };
  const stop = () => { runId.current++; setBusy(false); setQueue([]); };
  // 답이 끝나면 기다리던 질문을 이어서 — 그 질문까지의 대화만 보낸다
  useEffect(() => {
    if (busy || !queue.length) return;
    const [q, ...rest] = queue;
    setQueue(rest);
    const i = turns.map((x) => x.role === 'user' && x.content === q).lastIndexOf(true);
    void ask(i >= 0 ? turns.slice(0, i + 1) : [...turns, { role: 'user', content: q }]);
  }, [busy, queue]); // eslint-disable-line react-hooks/exhaustive-deps

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
              <div className={cn('rounded-2xl rounded-bl-md px-3.5 py-3', m.error ? 'bg-danger/10 text-danger text-[14px]' : 'bg-surface border border-line')}>{m.error ? m.content : <RichText text={m.content} onAsk={send} />}</div>
              {m.cards?.map((c) => <AiCardView key={`${c.kind}:${c.id}`} card={c} />)}
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-[13px] text-ink-3"><span className="h-2 w-2 rounded-full bg-primary animate-pulse" />{L.thinking}{queue.length > 0 && <span>· {lang === 'en' ? `${queue.length} more queued` : `다음 질문 ${queue.length}개 대기 중`}</span>}</div>}
        </div>
        <div ref={end} />
      </div>
      <div className="shrink-0 border-t border-line bg-surface px-3 pt-2 pb-3 safe-bottom">
        <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex items-end gap-2">
          <textarea rows={1} value={text} disabled={!on} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(text); } }} placeholder={L.placeholder}
            className="flex-1 resize-none max-h-32 min-h-[44px] rounded-2xl bg-surface-2 px-4 py-2.5 text-[15px] outline-none" />
          {busy && !text.trim()
            ? <button type="button" onClick={stop} aria-label={lang === 'en' ? 'Stop' : '멈추기'} className="h-11 w-11 rounded-full bg-surface-2 text-ink grid place-items-center press"><Square size={16} fill="currentColor" /></button>
            : <button type="submit" disabled={!on || !text.trim()} aria-label="Send" className="h-11 w-11 rounded-full bg-primary text-white grid place-items-center press disabled:opacity-40"><ArrowUp size={20} /></button>}
        </form>
        <p className="text-[11px] text-ink-3 mt-1.5 px-1">{L.note}</p>
      </div>
    </div>
  );
}
