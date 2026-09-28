import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, Pencil } from 'lucide-react';
import { t } from '@core/i18n';
import type { User } from '@core/types';
import { dailyPrompt, answersTo } from '@core/lib/prompts-fun';
import { normalizePrompts, MAX_TEXT_PROMPTS } from '@core/data/prompts';
import { stageKind } from '@core/lib/stage';
import { sameSchool } from '@core/lib/network';
import { mutualFriends } from '@core/lib/relations';
import { todayISO } from '@core/lib/format';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { Avatar, Button, Textarea } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';

/** 오늘의 질문 — 날짜마다 바뀌는 단계별 질문. 답하면 내 프로필 질문에 더해지고, 가까운 사람의 답을 먼저 보여준다 */
export function useDailyPrompt() {
  const v = useViewer();
  const me = v.me;
  const q = useMemo(() => dailyPrompt(me, todayISO()), [me]);
  const mine = me.prompts.find((p) => p.questionId === q.id && p.answer.trim());
  const others = useMemo(() => {
    const rank = (u: User) => (v.isFriend(u.id) ? 3 : 0) + (mutualFriends(v.snap, me.id, u.id).length > 0 ? 2 : 0) + (sameSchool(u, me) ? 1 : 0);
    return answersTo(v.visibleUsers.filter((u) => v.canSeeField(u, 'prompts')), q.id, me.id, rank).slice(0, 3);
  }, [v, me, q.id]);
  return { q, mine, others };
}

export function DailyPromptCard({ bare, className, onDone }: { bare?: boolean; className?: string; onDone?: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const { q, mine, others } = useDailyPrompt();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const full = me.prompts.length >= MAX_TEXT_PROMPTS;

  const save = async () => {
    const answer = text.trim();
    if (!answer || full) return;
    setBusy(true);
    try {
      const prompts = normalizePrompts([...me.prompts, { questionId: q.id, answer }], stageKind(me));
      await run(() => api.users.update(me.id, { prompts }), t('답을 내 프로필에 더했어요'));
      setText(''); onDone?.();
    } catch { /* run 이 토스트 */ } finally { setBusy(false); }
  };

  return (
    <div className={cn(!bare && 'card p-4', className)}>
      <div className="text-[17px] font-bold text-ink leading-snug flex items-start gap-1.5"><Sparkles size={15} className="text-primary shrink-0 mt-1" />{q.text}</div>
      {mine ? (
        <div className="mt-2.5 rounded-2xl bg-primary-soft/70 px-3.5 py-2.5 flex items-start gap-2">
          <Check size={14} className="text-primary shrink-0 mt-0.5" />
          <span className="flex-1 min-w-0 text-[14px] text-ink">{mine.answer}</span>
          <button type="button" onClick={() => nav('/profile/prompts')} aria-label={t('질문 바꾸기')} className="h-7 w-7 rounded-full grid place-items-center text-ink-3 press shrink-0"><Pencil size={13} /></button>
        </div>
      ) : full ? (
        <div className="mt-2.5 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[12px] text-ink-2 flex items-center gap-2">
          <span className="flex-1">{t('질문은 6개까지 답할 수 있어요. 하나를 바꾸면 이 질문을 넣을 수 있어요.')}</span>
          <Button size="sm" variant="outline" onClick={() => nav('/profile/prompts')}>{t('질문 바꾸기')}</Button>
        </div>
      ) : (
        <div className="mt-2.5">
          <Textarea rows={2} maxLength={80} value={text} onChange={(e) => setText(e.target.value)} placeholder={q.placeholder ?? t('한두 줄이면 충분해요')} className="min-h-[60px]" />
          <div className="mt-1.5 flex items-center gap-2">
            <span className="flex-1 text-[11px] text-ink-3">{t('답하면 내 프로필 질문에 더해져요')}</span>
            <Button size="sm" variant="secondary" loading={busy} disabled={!text.trim()} onClick={save}>{t('답하기')}</Button>
          </div>
        </div>
      )}
      <div className="mt-3">
        <div className="text-[11px] font-semibold text-ink-3 mb-1.5">{others.length ? t('다른 사람들은 이렇게 답했어요') : t('아직 답한 사람이 없어요. 첫 답을 남겨 보세요')}</div>
        {others.length > 0 && (
          <div className="space-y-1.5">
            {others.map((a) => (
              <button key={a.user.id} type="button" onClick={() => nav(`/users/${a.user.id}`)} className="w-full flex items-start gap-2.5 rounded-2xl bg-surface-2/70 px-3 py-2 text-left press">
                <Avatar emoji={a.user.avatar.emoji} hue={a.user.avatar.hue} url={a.user.avatar.url} size={28} />
                <span className="flex-1 min-w-0"><span className="block text-[11px] font-semibold text-ink-3">{a.user.nickname}{v.isFriend(a.user.id) ? ` · ${t('연결됨')}` : ''}</span><span className="block text-[13px] text-ink line-clamp-2">{a.answer}</span></span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
