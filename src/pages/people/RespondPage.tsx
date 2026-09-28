import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Hand, Check, ArrowRight, Lock, Clock, Users, CheckCircle2 } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, EmptyState, Textarea, Section, SectionSkeleton, PrivacyNote } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useSectionState } from '@/hooks/useSectionState';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { degreeLabel, requestContextLine, relevanceToRequest } from '@core/lib/requests';
import { degreeOf, pathBetween } from '@core/lib/graph';
import { citiesOf, majorOf } from '@core/lib/network';
import { INTEREST_LABELS } from '@core/lib/labels';
import { containsContact, canShowInPath } from '@core/lib/privacy';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { SharedProfileMini, SHARE_FIELDS, DEFAULT_SHARED, shareFieldLabel, isRequestExpired } from '@/components/people_RequestCard';
import { cn } from '@core/lib/cn';
import type { NetworkRequest, ShareField, User } from '@core/types';

const lc = (s?: string) => (s ?? '').toLowerCase();

/** 요청에서 뽑은 "해당되는 부분" — 도시 · 분야 · 관심사 각각 · 본문 내용. hit = 내 프로필에 이미 있는 것 (기본 체크) */
function conditionsFor(req: NetworkRequest, me: User): { key: string; label: string; value: string; hit: boolean }[] {
  const out: { key: string; label: string; value: string; hit: boolean }[] = [];
  if (req.city) out.push({ key: 'city', label: `${t('도시')} · ${req.city}`, value: req.city, hit: citiesOf(me).some((c) => lc(c) === lc(req.city)) });
  if (req.field) {
    const f = lc(req.field);
    const hay = [me.career?.industry, me.career?.role, me.career?.company, majorOf(me)].map(lc).filter(Boolean);
    out.push({ key: 'field', label: `${t('분야')} · ${req.field}`, value: req.field, hit: hay.some((h) => h.includes(f) || f.includes(h)) });
  }
  req.interests.forEach((i) => out.push({ key: `i-${i}`, label: INTEREST_LABELS[i], value: INTEREST_LABELS[i], hit: me.interests.includes(i) }));
  const mentioned = relevanceToRequest({ text: req.text, interests: [] }, me).score > 0;
  out.push({ key: 'text', label: t('본문 내용'), value: t('본문 내용'), hit: mentioned });
  return out;
}

/** /people/requests/:id/respond — "저요" 응답. 해당되는 부분 · 한 줄 · 요청자에게 보여줄 정보(고른 것만) */
export function RespondPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const req = useAppStore((s) => s.networkRequests).find((r) => r.id === id);
  const author = req ? v.userById(req.authorId) : undefined;
  if (!req || !author) return <div className="min-h-full bg-bg"><TopBar back title={t('저요')} /><EmptyState emoji="🍃" title={t('찾을 수 없는 요청이에요')} description={t('이미 마감됐거나 지워졌을 수 있어요.')} action={<Button size="sm" variant="outline" onClick={() => nav('/people/requests', { replace: true })}>{t('받은 요청으로')}</Button>} /></div>;
  if (req.authorId === me.id) return <div className="min-h-full bg-bg"><TopBar back title={t('저요')} /><EmptyState emoji="🔎" title={t('내가 올린 요청이에요')} action={<Button size="sm" onClick={() => nav(`/people/requests/${req.id}`, { replace: true })}>{t('요청 보기')}</Button>} /></div>;
  return <RespondForm key={req.id} req={req} author={author} />;
}

function RespondForm({ req, author }: { req: NetworkRequest; author: User }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const applyPatch = useAppStore((s) => s.applyPatch);
  const showToast = useAppStore((s) => s.showToast);
  const sec = useSectionState(`respond-${req.id}`, 300);
  const conditions = useMemo(() => conditionsFor(req, me), [req, me]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(conditions.filter((c) => c.hit).map((c) => c.key)));
  const [note, setNote] = useState('');
  const [shared, setShared] = useState<ShareField[]>(DEFAULT_SHARED);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [err, setErr] = useState<'expired' | 'duplicate' | null>(null);
  const [done, setDone] = useState(false);

  const degree = degreeOf(snap, me.id, author.id, 3);
  const pathIds = degree && degree >= 2 ? pathBetween(snap, me.id, author.id, 3) : [];
  const pathUsers = pathIds.map((pid) => v.userById(pid)).filter((u): u is User => !!u);
  const shownPath = pathUsers.filter(canShowInPath);
  const hiddenInPath = pathUsers.length - shownPath.length;
  const ctx = requestContextLine(req);
  const expired = err === 'expired' || isRequestExpired(req) || req.status !== 'open';
  const already = !done && (err === 'duplicate' || req.responses.some((r) => r.userId === me.id));
  const noHit = conditions.every((c) => !c.hit);
  const noteHasContact = containsContact(note);

  const toggleCond = (k: string) => setChecked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const toggleShare = (f: ShareField) => setShared((s) => (s.includes(f) ? s.filter((x) => x !== f) : SHARE_FIELDS.filter((x) => x === f || s.includes(x))));

  const send = async () => {
    if (noteHasContact) return;
    if (isRequestExpired(req) || req.status !== 'open') { setErr('expired'); return; }
    setSending(true); setErr(null); setFailed(false);
    try {
      const matched = conditions.filter((c) => checked.has(c.key)).map((c) => c.value);
      const patch = await api.requests.respond(req.id, me.id, note.trim() || undefined, matched, shared);
      applyPatch(patch);
      setDone(true);
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      if (msg === t('마감된 요청이에요.')) setErr('expired');
      else if (msg === t('이미 손을 들었어요.')) setErr('duplicate');
      else { setFailed(true); showToast(t('보내지 못했어요. 연결을 확인하고 다시 보내주세요.'), 'error'); }
    } finally { setSending(false); }
  };

  // ─── 요청 요약 (왜 → 얼마나 가까운지 → 경로) ───
  const summary = (
    <div className={cn('rounded-[24px] border border-line p-4', expired ? 'bg-surface-2/60' : 'bg-[linear-gradient(120deg,var(--tint),#FFFFFF)]')}>
      <div className={cn('text-[12px] font-bold', expired ? 'text-ink-3' : 'text-primary')}>{expired ? <span className="inline-flex items-center gap-1"><Clock size={12} />{t('마감된 요청이에요')}</span> : t('혹시 여기에 해당되나요?')}</div>
      <p className={cn('mt-1 text-[16px] font-bold leading-snug', expired ? 'text-ink-3' : 'text-ink')}>{req.text}</p>
      {ctx && <p className="mt-1 text-[12px] text-ink-2">{ctx}</p>}
      <div className="mt-3 flex items-center gap-2 min-w-0">
        <Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={28} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0 text-[13px]"><span className="font-bold truncate">{author.nickname}{t('님')}</span><SchoolBadge user={author} size="sm" className="min-w-0" /></span>
          <span className="block text-[11px] text-ink-3">{degreeLabel(degree, lang)}</span>
        </span>
      </div>
      {(shownPath.length > 0 || hiddenInPath > 0) && (
        <div className="mt-2 flex items-center gap-1 flex-wrap text-[11px] text-ink-2">
          <span className="font-semibold">{t('나')}</span>
          {shownPath.map((p) => <span key={p.id} className="contents"><ArrowRight size={11} className="text-ink-3" /><span className="inline-flex items-center gap-1 h-6 pl-0.5 pr-2 rounded-full bg-white/80"><Avatar emoji={p.avatar.emoji} hue={p.avatar.hue} url={p.avatar.url} size={18} />{p.nickname}</span></span>)}
          {hiddenInPath > 0 && <span className="contents"><ArrowRight size={11} className="text-ink-3" /><span className="h-6 px-2 rounded-full bg-white/80 inline-flex items-center text-ink-3">{t('비공개 연결')} {hiddenInPath}</span></span>}
          <ArrowRight size={11} className="text-ink-3" /><span className="font-semibold">{author.nickname}</span>
        </div>
      )}
    </div>
  );

  if (done) {
    return (
      <div className="min-h-full pb-24 bg-bg">
        <TopBar back title={t('저요')} />
        <div className="px-4 pt-6 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-accent-soft grid place-items-center text-primary"><CheckCircle2 size={30} /></div>
          <h1 className="mt-4 font-display text-[20px] font-bold text-ink">{t('손을 들었어요')}</h1>
          <p className="mt-1 text-[13px] text-ink-2 leading-relaxed">{t('상대가 대화를 시작하면 알려드려요.')}</p>
        </div>
        <div className="px-4 mt-5">
          <div className="text-[11px] font-bold text-ink-3 mb-1.5">{t('요청자에게 이렇게 보여요')}</div>
          <SharedProfileMini user={me} shared={shared} />
          <PrivacyNote className="mt-2" text={t('답하지 않아도 괜찮아요 — 상대가 대화를 시작하지 않으면 아무 일도 없어요.')} />
          <Button full size="lg" className="mt-5" onClick={() => nav('/people/requests', { replace: true })}>{t('받은 요청으로')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-bg flex flex-col">
      <TopBar back title={t('저요')} />
      <div className="flex-1 px-4 pt-1 pb-6 space-y-5">
        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={1} />}>
          {summary}
        </Section>

        {expired ? (
          <div className="rounded-[20px] bg-surface-2/60 px-4 py-4 text-center">
            <div className="text-[14px] font-semibold">{t('마감된 요청이에요')}</div>
            <div className="mt-0.5 text-[12px] text-ink-3">{t('기간이 지났거나 요청자가 그만 찾기로 했어요.')}</div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => nav('/people/requests', { replace: true })}>{t('받은 요청으로')}</Button>
          </div>
        ) : already ? (
          <div className="rounded-[20px] bg-primary-soft/70 px-4 py-4 text-center">
            <div className="text-[14px] font-semibold text-primary">{t('이미 손을 들었어요')}</div>
            <div className="mt-0.5 text-[12px] text-ink-3">{t('상대가 대화를 시작하면 알려드려요.')}</div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => nav('/people/requests', { replace: true })}>{t('받은 요청으로')}</Button>
          </div>
        ) : !sec.loading && !sec.error && (
          <>
            <section>
              <h2 className="text-[15px] font-bold text-ink">{t('해당되는 부분')}</h2>
              <p className="mt-0.5 text-[12px] text-ink-3">{t('맞는 것만 골라주세요. 요청자에게 그대로 보여요.')}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {conditions.map((c) => { const on = checked.has(c.key); return (
                  <button key={c.key} type="button" role="checkbox" aria-checked={on} onClick={() => toggleCond(c.key)}
                    className={cn('h-9 px-3 rounded-full border text-[13px] font-semibold inline-flex items-center gap-1.5 press', on ? 'bg-primary text-white border-primary' : 'bg-white border-line text-ink-2')}>
                    <span className={cn('h-4 w-4 rounded-full grid place-items-center', on ? 'bg-white text-primary' : 'border border-line')}>{on && <Check size={11} strokeWidth={3} />}</span>{c.label}
                  </button>
                ); })}
              </div>
              {noHit && (
                <div className="mt-3 rounded-2xl bg-surface-2 px-3.5 py-3">
                  <p className="text-[12px] text-ink-2 leading-relaxed">{t("딱 맞지 않아도 괜찮아요 — 아는 사람이 있다면 '아는 사람 있어요'로 연결해줄 수도 있어요")}</p>
                  <button onClick={() => nav(`/people/requests/${req.id}`)} className="mt-1.5 text-[12px] font-bold text-primary inline-flex items-center gap-1 press"><Users size={13} />{t('아는 사람 있어요로 가기')}<ArrowRight size={12} /></button>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-[15px] font-bold text-ink">{t('한 줄')} <span className="text-[12px] font-medium text-ink-3">{t('(선택)')}</span></h2>
              <Textarea className={cn('mt-2 min-h-[72px]', noteHasContact && 'border-danger focus:border-danger')} placeholder={t('한 줄이면 충분해요 (예: 일본 식품 유통 5년)')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} aria-invalid={noteHasContact} />
              <div className="mt-1 flex items-start gap-2">
                {noteHasContact
                  ? <p className="flex-1 text-[12px] text-danger" role="alert">{t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.')}</p>
                  : <span className="flex-1" />}
                <span className="text-[11px] text-ink-3 shrink-0">{note.length}/120</span>
              </div>
            </section>

            <section>
              <h2 className="text-[15px] font-bold text-ink">{t('요청자에게 보여줄 정보')}</h2>
              <p className="mt-0.5 text-[12px] text-ink-3">{t('이름과 사진은 함께 보여요. 나머지는 고른 것만.')}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {SHARE_FIELDS.map((f) => { const on = shared.includes(f); return (
                  <button key={f} type="button" role="switch" aria-checked={on} onClick={() => toggleShare(f)}
                    className={cn('h-8 px-3 rounded-full border text-[12px] font-semibold inline-flex items-center gap-1 press', on ? 'bg-primary-soft border-accent text-primary' : 'bg-white border-line text-ink-3')}>
                    {on && <Check size={12} strokeWidth={3} />}{shareFieldLabel(f)}
                  </button>
                ); })}
              </div>
              <div className="mt-2 h-9 px-3 rounded-full bg-surface-2 text-[12px] text-ink-3 inline-flex items-center gap-1.5" aria-disabled><Lock size={12} />{t('연락처 · 정확한 위치 — 항상 비공개')}</div>
              <div className="mt-3 text-[11px] font-bold text-ink-3 mb-1.5">{t('요청자에게 이렇게 보여요')}</div>
              <SharedProfileMini user={me} shared={shared} preview lockedRow={false} />
            </section>
          </>
        )}
      </div>

      {!expired && !already && (
        <div className="sticky bottom-0 z-20 border-t border-line/60 bg-bg/95 backdrop-blur px-4 pt-3 pb-4">
          <Button full size="lg" icon={<Hand size={16} />} loading={sending} disabled={noteHasContact || sec.loading} onClick={send}>{failed ? t('다시 보내기') : t('보내기')}</Button>
          <p className="mt-1.5 text-center text-[11px] text-ink-3">{t('답하지 않아도 불이익은 없어요 · 읽음 표시도 없어요')}</p>
        </div>
      )}
    </div>
  );
}
