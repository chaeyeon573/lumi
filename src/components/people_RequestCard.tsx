import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hand, Users, MessageCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { IncomingRequest } from '@core/lib/requests';
import { degreeLabel, requestContextLine, referralCandidates } from '@core/lib/requests';
import { personLine } from '@core/lib/network';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { useSnapshot } from '@/hooks/useSnapshot';
import { Avatar, Button, BottomSheet, Textarea, Tag, EmptyState } from '@/components/ui';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { cn } from '@core/lib/cn';
import type { User } from '@core/types';

/** 문자열 이유 칩 — "같은 지역 · 서울" 처럼 전체 문장을 그대로 보여준다 */
export function PlainReasonChips({ reasons, max = 3, className }: { reasons: string[]; max?: number; className?: string }) {
  if (!reasons.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {reasons.slice(0, max).map((r) => <span key={r} className="h-6 px-2 rounded-full bg-[#BFF4FF] text-primary text-[11px] font-bold inline-flex items-center gap-1"><CheckCircle2 size={11} />{r}</span>)}
    </div>
  );
}

/** 두 사람의 1:1 방 (대화 시작 후 열리는 Mutual Room) */
export function directRoomWith(rooms: { id: string; type: string; memberIds: string[] }[], a: string, b: string) {
  return rooms.find((r) => r.type === 'direct' && r.memberIds.length === 2 && r.memberIds.includes(a) && r.memberIds.includes(b));
}

/**
 * 나에게 온 것 — "혹시 여기에 해당되나요?" 한 장. 가볍게: 저요 / 아는 사람 있어요 / 넘기기.
 * 지인이 떠올려 보낸 것은 먼저 '관심 있어요' 를 묻고, 그 전까지 찾는 사람에게 내 프로필은 보이지 않는다.
 */
export function IncomingRequestCard({ item, highlightReferral, compact, onOpen, className }: { item: IncomingRequest; highlightReferral?: boolean; compact?: boolean; onOpen?: () => void; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const run = useAppStore((s) => s.run);
  const rooms = useAppStore((s) => s.chatRooms);
  const [sheet, setSheet] = useState<'me' | 'refer' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const { req, author, degree, reasons, myResponse, myReferral } = item;
  const referrer = myReferral ? v.userById(myReferral.referrerId) : undefined;
  const ctx = requestContextLine(req);
  const room = myResponse?.status === 'accepted' ? directRoomWith(rooms, me.id, author.id) : undefined;

  const act = async (key: string, fn: Parameters<typeof run>[0], msg?: string) => {
    setBusy(key);
    try { await run(fn, msg); } catch { /* toast */ } finally { setBusy(null); }
  };
  const respond = async () => { setSheet(null); await act('me', () => api.requests.respond(req.id, me.id, note.trim() || undefined), t('손 들었어요. 상대가 대화를 시작하면 알려드려요.')); setNote(''); };
  const refer = async (u: User) => { setSheet(null); await act(`refer-${u.id}`, () => api.requests.refer(req.id, me.id, u.id), `${u.nickname}${t('님에게 조용히 물어봤어요. 본인이 관심 있어요 하면 연결돼요.')}`); };
  const dismiss = () => act('dismiss', () => api.requests.dismiss(req.id, me.id));
  const referralDecide = (ok: boolean) => myReferral && act(ok ? 'ref-yes' : 'ref-no', () => api.requests.referralDecide(req.id, myReferral.id, ok), ok ? t('관심 있다고 알렸어요. 상대가 대화를 시작하면 알려드려요.') : undefined);

  const candidates = sheet === 'refer' ? referralCandidates(snap, me, req) : [];

  return (
    <article className={cn('rounded-[24px] border border-line bg-white overflow-hidden', className)}>
      <div className="px-4 pt-3.5 pb-3">
        <div className="text-[12px] font-bold text-primary">{t('혹시 여기에 해당되나요?')}</div>
        <button onClick={onOpen} className={cn('mt-1 block w-full text-left', onOpen && 'press')} disabled={!onOpen}>
          <p className={cn('text-[15px] font-bold text-ink leading-snug', compact && 'line-clamp-2')}>{req.text}</p>
          {ctx && !compact && <p className="mt-1 text-[12px] text-ink-3 truncate">{ctx}</p>}
        </button>
        <div className="mt-2 flex items-center gap-1.5 min-w-0 text-[12px] text-ink-3">
          <button onClick={() => nav(`/users/${author.id}`)} className="shrink-0 press"><Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={20} /></button>
          <span className="truncate">{author.nickname}{t('님')} · {degreeLabel(degree, lang)}</span>
          {!compact && <SchoolBadge user={author} size="sm" className="min-w-0 ml-1 text-ink-3 font-medium" />}
        </div>
        {!compact && <PlainReasonChips reasons={reasons} className="mt-2" />}
      </div>

      {myReferral && myReferral.status === 'pending' && referrer ? (
        <div className={cn('mx-3 mb-3 rounded-2xl p-3', highlightReferral ? 'bg-primary text-white' : 'bg-primary-soft')}>
          <div className={cn('text-[13px] font-semibold leading-snug flex items-center gap-2', highlightReferral ? 'text-white' : 'text-primary')}>
            <Avatar emoji={referrer.avatar.emoji} hue={referrer.avatar.hue} url={referrer.avatar.url} size={26} />
            <span>{referrer.nickname}{t('님이 당신이 떠올랐대요')}</span>
          </div>
          <p className={cn('mt-1.5 text-[11px]', highlightReferral ? 'text-white/75' : 'text-ink-3')}>{t('관심 있어요 하기 전까지 상대에게 내 프로필은 보이지 않아요.')}</p>
          <div className="mt-2.5 flex gap-2">
            <Button size="sm" full variant={highlightReferral ? 'secondary' : 'primary'} loading={busy === 'ref-yes'} onClick={() => referralDecide(true)}>{t('관심 있어요')}</Button>
            <Button size="sm" variant={highlightReferral ? 'ghost' : 'outline'} className={cn(highlightReferral && 'text-white hover:bg-white/10')} loading={busy === 'ref-no'} onClick={() => referralDecide(false)}>{t('넘기기')}</Button>
          </div>
        </div>
      ) : myResponse ? (
        <div className="mx-3 mb-3 rounded-2xl bg-surface-2 px-3 py-2.5 flex items-center gap-2">
          {myResponse.status === 'accepted' ? <Tag tone="mint">{t('연결됨')}</Tag> : myResponse.status === 'declined' ? <Tag tone="neutral">{t('이번엔 아니에요')}</Tag> : <Tag tone="primary">{t('손 들었어요')}</Tag>}
          <span className="flex-1" />
          {room && <Button size="sm" icon={<MessageCircle size={14} />} onClick={() => nav(`/chats/${room.id}`)}>{t('대화 열기')}</Button>}
        </div>
      ) : (
        <div className="px-3 pb-3 flex gap-1.5">
          <Button size="sm" full icon={<Hand size={14} />} loading={busy === 'me'} onClick={() => setSheet('me')}>{t('저요')}</Button>
          <Button size="sm" full variant="secondary" icon={<Users size={14} />} loading={busy?.startsWith('refer') ?? false} onClick={() => setSheet('refer')}>{t('아는 사람 있어요')}</Button>
          <Button size="sm" variant="ghost" loading={busy === 'dismiss'} onClick={dismiss}>{t('넘기기')}</Button>
        </div>
      )}

      <BottomSheet open={sheet === 'me'} onClose={() => setSheet(null)} title={t('저요')}>
        <p className="text-[13px] text-ink-2 leading-relaxed">{author.nickname}{t('님에게 내 프로필과 함께 전해져요. 상대가 대화를 시작하면 서로 연결돼요.')}</p>
        <div className="mt-3">
          <Textarea placeholder={t('한 줄이면 충분해요 (예: 일본 식품 유통 5년)')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setSheet(null)}>{t('취소')}</Button>
          <Button full icon={<Hand size={16} />} onClick={respond}>{t('저요')}</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'refer'} onClose={() => setSheet(null)} title={t('아는 사람 있어요')} tall>
        <p className="text-[13px] text-ink-2 leading-relaxed">{t('떠오르는 사람을 고르면 그 사람에게 먼저 조용히 물어봐요. 본인이 관심 있어요 해야 상대에게 보여요.')}</p>
        {candidates.length === 0 ? (
          <EmptyState emoji="" title={t('아직 물어볼 연결이 없어요')} description={t('연결이 늘면 여기서 아는 사람을 떠올릴 수 있어요.')} className="py-8" />
        ) : (
          <div className="mt-3 space-y-1.5">
            {candidates.map((c) => (
              <button key={c.user.id} onClick={() => refer(c.user)} className="w-full flex items-center gap-2.5 rounded-2xl bg-surface-2 px-3 py-2 text-left press">
                <Avatar emoji={c.user.avatar.emoji} hue={c.user.avatar.hue} url={c.user.avatar.url} size={40} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5 min-w-0"><span className="text-[14px] font-bold truncate">{c.user.nickname}</span><SchoolBadge user={c.user} size="sm" className="min-w-0" /></span>
                  <span className="block text-[11px] text-ink-3 truncate">{personLine(c.user, lang)}</span>
                  {c.reasons.length > 0 && <PlainReasonChips reasons={c.reasons} max={2} className="mt-1" />}
                </span>
                <ChevronRight size={16} className="text-ink-3 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </article>
  );
}
