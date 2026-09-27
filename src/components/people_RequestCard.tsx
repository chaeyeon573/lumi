import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hand, Users, MessageCircle, CheckCircle2, ChevronRight, MoreHorizontal, EyeOff, Flag, Lock, Clock } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { IncomingRequest } from '@core/lib/requests';
import { degreeLabel, requestContextLine, referralCandidates } from '@core/lib/requests';
import { personLine, cityOf, majorOf } from '@core/lib/network';
import { INTEREST_LABELS } from '@core/lib/labels';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { useSnapshot } from '@/hooks/useSnapshot';
import { Avatar, Button, BottomSheet, Tag, EmptyState } from '@/components/ui';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { cn } from '@core/lib/cn';
import type { Interest, NetworkRequest, Organization, ShareField, User } from '@core/types';

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

/** 요청이 마감됐는가 (기간이 지났거나 요청자가 그만 찾기로 함) */
export const isRequestExpired = (req: Pick<NetworkRequest, 'expiresAt'>) => new Date(req.expiresAt).getTime() < Date.now();

// ─── "저요" 때 요청자에게 보여줄 정보 ────────────────────────────────────────
/** 공개 항목 — 순서대로 토글·미니 카드에 쓴다. 연락처·정확한 위치는 목록 자체에 없다 */
export const SHARE_FIELDS: ShareField[] = ['school', 'major', 'city', 'career', 'interests', 'groups'];
export const DEFAULT_SHARED: ShareField[] = ['school', 'interests'];
export const shareFieldLabel = (f: ShareField) => ({ school: t('학교'), major: t('전공'), city: t('도시'), career: t('하는 일'), interests: t('관심사'), groups: t('그룹') })[f];

/** 공개 항목의 실제 값 (비어 있으면 '') */
export function shareFieldValue(u: User, f: ShareField, orgs: Organization[]): string {
  switch (f) {
    case 'school': return u.affiliation.type === 'university' ? u.affiliation.schoolName : u.affiliation.companyName;
    case 'major': return majorOf(u);
    case 'city': return cityOf(u) ?? '';
    case 'career': return [u.career?.role, u.career?.company].filter(Boolean).join(' @ ') || u.career?.industry || '';
    case 'interests': return u.interests.slice(0, 4).map((i: Interest) => INTEREST_LABELS[i]).join(' · ');
    case 'groups': return orgs.filter((o) => o.memberIds.includes(u.id)).slice(0, 3).map((o) => o.name).join(' · ');
  }
}

/**
 * 손 든 사람 미니 카드 — 이름·사진 + 본인이 고른 항목만. 연락처·정확한 위치는 항상 비공개.
 * 응답 화면의 "요청자에게 이렇게 보여요" 미리보기와 요청자 화면의 응답 카드가 같이 쓴다.
 */
export function SharedProfileMini({ user, shared, preview, className }: { user: User; shared: ShareField[]; preview?: boolean; className?: string }) {
  const orgs = useAppStore((s) => s.organizations);
  const rows = SHARE_FIELDS.filter((f) => shared.includes(f)).map((f) => ({ f, value: shareFieldValue(user, f, orgs) }));
  return (
    <div className={cn('rounded-2xl bg-surface-2 px-3 py-2.5', className)}>
      <div className="flex items-center gap-2 min-w-0">
        <Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={32} />
        <span className="text-[14px] font-bold truncate">{user.nickname}</span>
      </div>
      <dl className="mt-2 space-y-1">
        {rows.length === 0 && <div className="text-[12px] text-ink-3">{t('이름과 사진만 보여요')}</div>}
        {rows.map(({ f, value }) => (
          <div key={f} className="flex items-baseline gap-2 text-[12px] min-w-0">
            <dt className="w-14 shrink-0 text-ink-3 font-semibold">{shareFieldLabel(f)}</dt>
            <dd className={cn('min-w-0 truncate', value ? 'text-ink' : 'text-ink-3')}>{value || (preview ? t('프로필에 없어요') : '—')}</dd>
          </div>
        ))}
        <div className="flex items-baseline gap-2 text-[12px] pt-1 mt-1 border-t border-line/70">
          <dt className="w-14 shrink-0 text-ink-3 font-semibold inline-flex items-center gap-1"><Lock size={10} />{t('비공개')}</dt>
          <dd className="text-ink-3">{t('연락처 · 정확한 위치 — 항상 비공개')}</dd>
        </div>
      </dl>
    </div>
  );
}

/** 작성 화면용 미리보기 — 받는 사람의 카드 모양 그대로, 누를 수 없다 */
export function RequestPreviewCard({ author, text, context, degreeText, className }: { author: User; text: string; context?: string; degreeText: string; className?: string }) {
  return (
    <div className={cn('rounded-[24px] border border-line bg-white overflow-hidden pointer-events-none select-none', className)} aria-hidden>
      <div className="px-4 pt-3.5 pb-3">
        <div className="text-[12px] font-bold text-primary">{t('혹시 여기에 해당되나요?')}</div>
        <p className={cn('mt-1 text-[15px] font-bold leading-snug line-clamp-3', text ? 'text-ink' : 'text-ink-3')}>{text || t('찾는 사람을 한 줄로 적어주세요')}</p>
        {context && <p className="mt-1 text-[12px] text-ink-3 truncate">{context}</p>}
        <div className="mt-2 flex items-center gap-1.5 min-w-0 text-[12px] text-ink-3">
          <Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={20} />
          <span className="truncate">{author.nickname}{t('님')} · {degreeText}</span>
          <SchoolBadge user={author} size="sm" className="min-w-0 ml-1 text-ink-3 font-medium" />
        </div>
      </div>
      <div className="px-3 pb-3 flex gap-1.5 opacity-80">
        <span className="flex-1 h-9 rounded-full bg-primary text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"><Hand size={14} />{t('저요')}</span>
        <span className="flex-1 h-9 rounded-full bg-accent text-primary text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"><Users size={14} />{t('아는 사람 있어요')}</span>
        <span className="h-9 px-3 rounded-full text-ink-2 text-[13px] font-semibold inline-flex items-center">{t('넘기기')}</span>
      </div>
    </div>
  );
}

const REPORT_REASONS = () => [t('스팸·광고'), t('연락처·개인정보를 요구해요'), t('부적절한 내용'), t('사칭 또는 허위'), t('기타')];

/**
 * 나에게 온 것 — "혹시 여기에 해당되나요?" 한 장. 가볍게: 저요 / 아는 사람 있어요 / 넘기기.
 * 저요 → 응답 화면(/people/requests/:id/respond)에서 해당되는 부분·보여줄 정보를 고른다.
 * 지인이 떠올려 보낸 것은 먼저 '관심 있어요' 를 묻고, 그 전까지 찾는 사람에게 내 프로필은 보이지 않는다.
 * ⋯ 메뉴: 숨기기 · 신고. 마감된 요청은 흐리게, 행동 없이. 읽음 표시·불이익 없음.
 */
export function IncomingRequestCard({ item, highlightReferral, compact, onOpen, className }: { item: IncomingRequest; highlightReferral?: boolean; compact?: boolean; onOpen?: () => void; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const run = useAppStore((s) => s.run);
  const rooms = useAppStore((s) => s.chatRooms);
  const [sheet, setSheet] = useState<'refer' | 'menu' | 'report' | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { req, author, degree, reasons, myResponse, myReferral } = item;
  const referrer = myReferral ? v.userById(myReferral.referrerId) : undefined;
  const ctx = requestContextLine(req);
  const room = myResponse?.status === 'accepted' ? directRoomWith(rooms, me.id, author.id) : undefined;
  const expired = isRequestExpired(req) || req.status !== 'open';

  const act = async (key: string, fn: Parameters<typeof run>[0], msg?: string) => {
    setBusy(key);
    try { await run(fn, msg); return true; } catch { return false; } finally { setBusy(null); }
  };
  const refer = async (u: User) => { setSheet(null); await act(`refer-${u.id}`, () => api.requests.refer(req.id, me.id, u.id), `${u.nickname}${t('님에게 조용히 물어봤어요. 본인이 관심 있어요 하면 연결돼요.')}`); };
  const dismiss = () => act('dismiss', () => api.requests.dismiss(req.id, me.id));
  const hide = async () => { setSheet(null); await act('dismiss', () => api.requests.dismiss(req.id, me.id), t('숨겼어요. 다시 보이지 않아요.')); };
  const report = async () => {
    if (!reason) return;
    const ok = await act('report', () => api.requests.report(req.id, me.id, reason), t('신고가 접수되었어요. 이 요청은 더 이상 보이지 않아요.'));
    if (ok) { setSheet(null); setReason(null); }
  };
  const referralDecide = (ok: boolean) => myReferral && act(ok ? 'ref-yes' : 'ref-no', () => api.requests.referralDecide(req.id, myReferral.id, ok), ok ? t('관심 있다고 알렸어요. 상대가 대화를 시작하면 알려드려요.') : undefined);

  const candidates = sheet === 'refer' ? referralCandidates(snap, me, req) : [];

  return (
    <article className={cn('rounded-[24px] border border-line bg-white overflow-hidden', expired && 'bg-surface-2/60', className)}>
      <div className={cn('px-4 pt-3.5 pb-3', expired && 'opacity-55')}>
        <div className="flex items-center gap-2">
          <div className="flex-1 text-[12px] font-bold text-primary">{expired ? <span className="inline-flex items-center gap-1 text-ink-3"><Clock size={12} />{t('마감된 요청이에요')}</span> : t('혹시 여기에 해당되나요?')}</div>
          <button type="button" onClick={() => setSheet('menu')} aria-label={t('더보기')} className="-mr-2 -my-1 h-8 w-8 rounded-full grid place-items-center text-ink-3 hover:bg-surface-2 press"><MoreHorizontal size={17} /></button>
        </div>
        <button onClick={onOpen} className={cn('mt-0.5 block w-full text-left', onOpen && 'press')} disabled={!onOpen}>
          <p className={cn('text-[15px] font-bold text-ink leading-snug', compact && 'line-clamp-2')}>{req.text}</p>
          {ctx && !compact && <p className="mt-1 text-[12px] text-ink-3 truncate">{ctx}</p>}
        </button>
        <div className="mt-2 flex items-center gap-1.5 min-w-0 text-[12px] text-ink-3">
          <button onClick={() => nav(`/users/${author.id}`)} className="shrink-0 press"><Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={20} /></button>
          <span className="truncate">{author.nickname}{t('님')} · {degreeLabel(degree, lang)}</span>
          {!compact && <SchoolBadge user={author} size="sm" className="min-w-0 ml-1 text-ink-3 font-medium" />}
        </div>
        {!compact && !expired && <PlainReasonChips reasons={reasons} className="mt-2" />}
      </div>

      {myReferral && myReferral.status === 'pending' && referrer && !expired ? (
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
      ) : expired ? null : (
        <div className="px-3 pb-3">
          <div className="flex gap-1.5">
            <Button size="sm" full icon={<Hand size={14} />} onClick={() => nav(`/people/requests/${req.id}/respond`)}>{t('저요')}</Button>
            <Button size="sm" full variant="secondary" icon={<Users size={14} />} loading={busy?.startsWith('refer') ?? false} onClick={() => setSheet('refer')}>{t('아는 사람 있어요')}</Button>
            <Button size="sm" variant="ghost" loading={busy === 'dismiss'} onClick={dismiss}>{t('넘기기')}</Button>
          </div>
          <p className="mt-2 px-1 text-[11px] text-ink-3 flex items-center gap-1"><Lock size={10} className="shrink-0" />{t('저요를 누르면 고른 정보만 보여요 · 연락처는 공개되지 않아요')}</p>
        </div>
      )}

      <BottomSheet open={sheet === 'menu'} onClose={() => setSheet(null)}>
        <div className="space-y-1">
          <button onClick={hide} className="w-full flex items-center gap-3 rounded-xl px-3 h-12 text-[14px] font-semibold press hover:bg-surface-2"><EyeOff size={18} />{t('숨기기')}<span className="ml-auto text-[11px] font-medium text-ink-3">{t('상대는 알 수 없어요')}</span></button>
          <button onClick={() => setSheet('report')} className="w-full flex items-center gap-3 rounded-xl px-3 h-12 text-[14px] font-semibold press hover:bg-surface-2 text-danger"><Flag size={18} />{t('신고')}</button>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'report'} onClose={() => setSheet(null)} title={t('신고하기')}>
        <p className="text-[13px] text-ink-3">{t('신고 내용은 상대에게 공개되지 않아요.')} {t('신고하면 이 요청은 더 이상 보이지 않아요.')}</p>
        <div className="mt-3 space-y-1.5">
          {REPORT_REASONS().map((r) => (
            <button key={r} onClick={() => setReason(r)} className={cn('w-full text-left rounded-xl px-3.5 h-11 text-[14px] font-medium border press', reason === r ? 'border-primary bg-primary-soft' : 'border-line')}>{r}</button>
          ))}
        </div>
        <Button full size="lg" variant="danger" className="mt-4" disabled={!reason} loading={busy === 'report'} onClick={report}>{t('신고 제출')}</Button>
      </BottomSheet>

      <BottomSheet open={sheet === 'refer'} onClose={() => setSheet(null)} title={t('아는 사람 있어요')} tall>
        <p className="text-[13px] text-ink-2 leading-relaxed">{t('떠오르는 사람을 고르면 그 사람에게 먼저 조용히 물어봐요. 본인이 관심 있어요 해야 상대에게 보여요.')}</p>
        <p className="mt-1 text-[11px] text-ink-3 flex items-center gap-1"><Lock size={10} />{t('그 전까지 요청자는 누구를 떠올렸는지 알 수 없어요.')}</p>
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
