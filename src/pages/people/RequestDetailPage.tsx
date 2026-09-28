import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MessageCircle, Users, ArrowRight, XCircle } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, EmptyState, Tag, PrivacyNote } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { matchesForRequest, audienceForRequest, relevanceToRequest, requestContextLine, degreeLabel, REACH_LABELS_KO, REACH_LABELS_EN, type IncomingRequest } from '@core/lib/requests';
import { degreeOf, pathBetween } from '@core/lib/graph';
import { mutualFriends } from '@core/lib/relations';
import { personLine, contextLine } from '@core/lib/network';
import { swipesLeft, isPlus } from '@core/lib/monetization';
import { PersonRow } from '@/components/cards/PersonRow';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { IncomingRequestCard, PlainReasonChips, directRoomWith, SharedProfileMini, DEFAULT_SHARED } from '@/components/people_RequestCard';
import { cn } from '@core/lib/cn';
import type { Reason } from '@core/lib/recommend';
import type { NetworkRequest, RequestResponse, User } from '@core/types';

const asReasons = (rs: string[]): Reason[] => rs.map((text) => ({ text, weight: 1, kind: 'interest' as const }));

/** 사람 찾아보기 › 한 건 — 내가 찾는 것(찾은 사람 · 손 든 사람) 또는 나에게 온 것(저요 / 아는 사람 있어요 / 넘기기) */
export function RequestDetailPage() {
  const { id } = useParams();
  const v = useViewer();
  const me = v.me;
  const requests = useAppStore((s) => s.networkRequests);
  const req = requests.find((r) => r.id === id);
  if (!req) return <div className="min-h-full bg-bg"><TopBar back title={t('사람 찾아보기')} /><EmptyState emoji="🍃" title={t('찾을 수 없는 요청이에요')} description={t('이미 마감됐거나 지워졌을 수 있어요.')} /></div>;
  return req.authorId === me.id ? <RequesterView req={req} /> : <ReceiverView req={req} />;
}

// ─── 내가 찾는 것 ─────────────────────────────────────────────────────────────
function RequesterView({ req }: { req: NetworkRequest }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const run = useAppStore((s) => s.run);
  const rooms = useAppStore((s) => s.chatRooms);
  const [busy, setBusy] = useState<string | null>(null);
  const matches = useMemo(() => matchesForRequest(snap, req, 7), [snap, req]);
  const delivered = useMemo(() => audienceForRequest(snap, req).length, [snap, req]);
  const ctx = requestContextLine(req);
  const reachLabels = lang === 'en' ? REACH_LABELS_EN : REACH_LABELS_KO;
  const raised = req.responses.filter((r) => r.status !== 'declined');
  const asking = req.referrals.filter((r) => r.status === 'pending').length;

  const act = async (key: string, fn: Parameters<typeof run>[0], msg?: string) => { setBusy(key); try { return await run(fn, msg); } catch { return undefined; } finally { setBusy(null); } };
  const close = () => act('close', () => api.requests.close(req.id), t('그만 찾기로 했어요.'));
  const connect = async (u: User) => {
    if (!isPlus(me) && swipesLeft(me) <= 0) { nav('/plus'); return; }
    await act(`c-${u.id}`, () => api.relationships.sendFriendRequest(me.id, u.id), `${u.nickname}${t('님에게 연결 요청을 보냈어요.')}`);
  };
  const decide = async (res: RequestResponse, accept: boolean) => {
    const r = await act(`${accept ? 'y' : 'n'}-${res.id}`, () => api.requests.decide(req.id, res.id, accept), accept ? t('대화가 열렸어요') : undefined);
    if (accept && r && 'roomId' in r && r.roomId) nav(`/chats/${r.roomId}`);
  };

  return (
    <div className="min-h-full pb-24 bg-bg">
      <TopBar back title={t('사람 찾아보기')} />
      <div className="px-4 pt-1">
        <div className="rounded-[24px] bg-[linear-gradient(120deg,var(--tint),#FFFFFF)] border border-line p-4">
          <div className="flex items-center gap-2">
            {req.status === 'open' ? <Tag tone="primary">{t('찾는 중')}</Tag> : <Tag tone="neutral">{t('그만 찾음')}</Tag>}
            <span className="text-[11px] text-ink-3 truncate flex-1">{reachLabels[req.reach]}</span>
            {req.status === 'open' && <button onClick={close} disabled={busy === 'close'} className="text-[12px] font-semibold text-ink-3 inline-flex items-center gap-1 press"><XCircle size={13} />{t('그만 찾기')}</button>}
          </div>
          <p className="mt-2 text-[16px] font-bold text-ink leading-snug">{req.text}</p>
          {ctx && <p className="mt-1 text-[12px] text-ink-2">{ctx}</p>}
        </div>
      </div>

      <section className="px-4 mt-6">
        <div className="flex items-end justify-between mb-2">
          <h2 className="font-display text-[18px] font-bold text-ink">{t('AroundU가 찾은 사람')} <span className="text-ink-3 font-semibold text-[15px]">{matches.length}</span></h2>
        </div>
        {matches.length === 0
          ? <div className="card px-4 py-3 text-[13px] text-ink-3">{t('가까운 네트워크에서 바로 떠오르는 사람이 없어요')}</div>
          : <div className="space-y-2">{matches.map((m) => <PersonRow key={m.user.id} user={m.user} reasons={asReasons(m.reasons)} onConnect={connect} busy={busy === `c-${m.user.id}`} compact />)}</div>}
      </section>

      <section className="px-4 mt-6">
        <div className="flex items-end justify-between mb-2">
          <h2 className="font-display text-[18px] font-bold text-ink">{t('손 든 사람')} <span className="text-ink-3 font-semibold text-[15px]">{raised.length}</span></h2>
        </div>
        <PrivacyNote className="mb-2" text={t('손 든 사람이 고른 정보만 보여요 · 연락처는 공개되지 않아요')} />
        {raised.length === 0
          ? <div className="card px-4 py-4 text-[13px] text-ink-3 leading-relaxed">{t('아직 손 든 사람이 없어요. 데모에서는 잠시 후 관련 있는 사람이 손을 들어요.')}</div>
          : <div className="space-y-2">{raised.map((res) => <ResponseCard key={res.id} res={res} busy={busy} onDecide={decide} roomId={res.status === 'accepted' ? directRoomWith(rooms, me.id, res.userId)?.id : undefined} />)}</div>}
        <p className="mt-3 text-[11px] text-ink-3 leading-relaxed">{t('관련 있는')} {delivered}{t('명에게 조용히 전달됐어요')}{asking ? ` · ${lang === 'en' ? `${asking} more being asked via someone they know` : `아는 사람 통해 물어보는 중 ${asking}건`}` : ''}. {t('본인이 관심 있어요 하면 여기 나타나요.')}</p>
      </section>
    </div>
  );
}

/**
 * 손 든 사람 한 명 — 왜(해당되는 부분 · 한 줄) → 얼마나 가까운지(촌수 · 공통 연결 · 누가 떠올렸나) → 본인이 고른 정보만.
 * 이름·사진 외 프로필은 응답자가 고른 항목(shared)만 보여주고, 대화가 열리기 전에는 프로필로 들어가지 않는다.
 */
function ResponseCard({ res, busy, onDecide, roomId }: { res: RequestResponse; busy: string | null; onDecide: (r: RequestResponse, accept: boolean) => void; roomId?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const snap = useSnapshot();
  const u = v.userById(res.userId);
  if (!u) return null;
  const via = res.viaId ? v.userById(res.viaId) : undefined;
  const mutual = mutualFriends(snap, v.me.id, u.id).length;
  const degree = degreeOf(snap, v.me.id, u.id, 3);
  const connected = res.status === 'accepted';
  const shared = res.shared ?? DEFAULT_SHARED;
  return (
    <article className={cn('rounded-[24px] border bg-white p-3.5', connected ? 'border-mint/40' : 'border-line')}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-primary flex-1">{t('손 들었어요')}</span>
        {connected && <Tag tone="mint" className="shrink-0">{t('연결됨')}</Tag>}
      </div>
      {res.matched && res.matched.length > 0 && (
        <div className="mt-1.5">
          <div className="text-[11px] text-ink-3 mb-1">{t('해당되는 부분')}</div>
          <PlainReasonChips reasons={res.matched} max={6} />
        </div>
      )}
      {res.note && <p className="mt-2 rounded-2xl bg-surface-2 px-3 py-2 text-[13px] text-ink leading-relaxed">“{res.note}”</p>}
      <div className="mt-2 text-[11px] text-ink-3 flex items-center gap-1 flex-wrap">
        <span>{degreeLabel(degree, lang)}</span>
        <span>·</span>
        <span className="inline-flex items-center gap-0.5"><Users size={10} />{t('공통 연결')} {mutual}{t('명')}</span>
        {via && <span>· {via.nickname}{t('님이 떠올렸어요')}</span>}
      </div>
      {connected
        ? <button onClick={() => nav(`/users/${u.id}`)} className="mt-2 block w-full text-left press"><SharedProfileMini user={u} shared={shared} /></button>
        : <SharedProfileMini user={u} shared={shared} className="mt-2" />}
      <div className="mt-3 flex gap-2">
        {connected ? (
          roomId && <Button size="sm" full icon={<MessageCircle size={14} />} onClick={() => nav(`/chats/${roomId}`)}>{t('대화 열기')}</Button>
        ) : (
          <>
            <Button size="sm" full icon={<MessageCircle size={14} />} loading={busy === `y-${res.id}`} onClick={() => onDecide(res, true)}>{t('대화 시작')}</Button>
            <Button size="sm" variant="outline" loading={busy === `n-${res.id}`} onClick={() => onDecide(res, false)}>{t('괜찮아요')}</Button>
          </>
        )}
      </div>
    </article>
  );
}

// ─── 나에게 온 것 ─────────────────────────────────────────────────────────────
function ReceiverView({ req }: { req: NetworkRequest }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const author = v.userById(req.authorId);
  const item = useMemo<IncomingRequest | null>(() => {
    if (!author) return null;
    const degree = degreeOf(snap, me.id, author.id, 3);
    return { req, author, degree, reasons: relevanceToRequest(req, me).reasons, myResponse: req.responses.find((r) => r.userId === me.id), myReferral: req.referrals.find((r) => r.candidateId === me.id && r.status !== 'declined') };
  }, [req, author, snap, me]);
  if (!author || !item) return <div className="min-h-full bg-bg"><TopBar back title={t('사람 찾아보기')} /><EmptyState emoji="🍃" title={t('찾을 수 없는 요청이에요')} /></div>;
  const path = item.degree && item.degree >= 2 ? pathBetween(snap, me.id, author.id, 3).map((pid) => v.userById(pid)).filter((u): u is User => !!u) : [];
  const highlight = !!params.get('referral') && item.myReferral?.id === params.get('referral');
  const dismissed = req.dismissedIds.includes(me.id) || req.status !== 'open';

  return (
    <div className="min-h-full pb-24 bg-bg">
      <TopBar back title={t('사람 찾아보기')} />
      <div className="px-4 pt-1 space-y-3">
        {dismissed && !item.myResponse ? (
          <div className="card px-4 py-3 text-[13px] text-ink-3">{req.status !== 'open' ? t('이제 찾지 않는대요.') : t('넘긴 요청이에요.')}</div>
        ) : (
          <IncomingRequestCard item={item} highlightReferral={highlight} />
        )}

        <div className="rounded-[24px] border border-line bg-white p-3.5">
          <div className="text-[11px] font-bold text-ink-3">{t('찾는 사람')}</div>
          <button onClick={() => nav(`/users/${author.id}`)} className="mt-2 w-full flex items-center gap-3 text-left press">
            <Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold truncate">{author.nickname}</span>
              <SchoolBadge user={author} withYear size="sm" className="max-w-full" />
              <span className="block text-[12px] text-ink-3 truncate">{contextLine(author, lang) || personLine(author, lang)}</span>
            </span>
          </button>
          {path.length > 0 && (
            <div className="mt-3 flex items-center gap-1 flex-wrap text-[12px] text-ink-2">
              <span className="font-semibold">{t('나')}</span>
              {path.map((p) => (
                <span key={p.id} className="contents"><ArrowRight size={12} className="text-ink-3" /><button onClick={() => nav(`/users/${p.id}`)} className="inline-flex items-center gap-1 h-6 pl-0.5 pr-2 rounded-full bg-surface-2 press"><Avatar emoji={p.avatar.emoji} hue={p.avatar.hue} url={p.avatar.url} size={18} />{p.nickname}</button></span>
              ))}
              <ArrowRight size={12} className="text-ink-3" /><span className="font-semibold">{author.nickname}</span>
              <span className="text-ink-3">· {degreeLabel(item.degree, lang)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
