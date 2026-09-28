import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronRight, Handshake, MessageCircle, Quote, Search, UserPlus } from 'lucide-react';
import { t } from '@core/i18n';
import type { IntroRequest, User } from '@core/types';
import { secondDegree, type SecondDegree } from '@core/lib/graph';
import { canShowInPath, containsContact, profileView } from '@core/lib/privacy';
import { matchReasons, shareableReasons } from '@core/lib/recommend';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, BottomSheet, Button, PrivacyNote, Section, SectionEmpty, SectionSkeleton, Segmented, Tag, Textarea } from '@/components/ui';
import { useSectionState } from '@/hooks/useSectionState';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useViewer } from '@/hooks/useViewer';
import { ReasonChips } from '@/components/people_ReasonChips';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { SaveButton } from '@/components/people_ActionBar';
import { StatusPill } from '@/components/people_StatusPill';
import { ConnectStatusButton, fmt, maskedCity, maskedLine } from '@/components/people_Network';

type Tab = 'people' | 'asks';

/**
 * 아는 사람의 아는 사람 (/people/second) — 2촌 탐색.
 *   사람: 경로(나 → 공통 연결 → 상대) · 겹치는 것 → 이름·프로필 → "연결해줄 수 있나요?" · 저장 · 연결
 *   연결 부탁(?tab=asks): 내가 이어줄 수 있는 부탁 · 나에게 전달된 소개 · 내가 한 부탁
 */
export function SecondDegreePage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'asks' ? 'asks' : 'people';
  const setTab = (next: Tab) => setParams(next === 'people' ? {} : { tab: next }, { replace: true });
  const v = useViewer();
  const intros = useAppStore((s) => s.introRequests);
  const waiting = intros.filter((i) => (i.viaId === v.me.id && i.status === 'pending') || (i.toId === v.me.id && i.status === 'forwarded')).length;

  return (
    <div className="min-h-full pb-10 bg-bg">
      <TopBar back title={t('아는 사람의 아는 사람')} messages />
      <div className="px-4 pb-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'people', label: t('사람') }, { value: 'asks', label: waiting ? `${t('연결 부탁')} ${waiting}` : t('연결 부탁') }]} />
      </div>
      {tab === 'people' ? <PeopleTab onAsks={() => setTab('asks')} /> : <AsksTab onPeople={() => setTab('people')} />}
    </div>
  );
}

// ─── 사람 — 2촌 카드 ─────────────────────────────────────────────────────────
function PeopleTab({ onAsks }: { onAsks: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const snap = useSnapshot();
  const sec = useSectionState('second');
  const intros = useAppStore((s) => s.introRequests);
  const list = useMemo(() => secondDegree(snap, v.me.id, canShowInPath).filter((x) => !v.isBlocked(x.user.id) && !v.hasBlocked(x.user.id)), [snap, v]);
  const [mutualOf, setMutualOf] = useState<SecondDegree | null>(null);
  const [askFor, setAskFor] = useState<SecondDegree | null>(null);
  const myAsk = (toId: string) => intros.find((i) => i.fromId === v.me.id && i.toId === toId && (i.status === 'pending' || i.status === 'forwarded'));

  return (
    <div className="px-4 space-y-3">
      <p className="text-[12px] text-ink-3 px-1">{t('내 연결이 알고 있는 사람이에요. 공통 연결에게 먼저 물어볼 수 있어요.')}</p>
      <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={3} />}
        empty={list.length === 0 && (
          <SectionEmpty emoji="🌱" title={t('아직 2촌이 없어요')} description={t('연결이 생기면 그 사람들이 아는 사람이 여기에 보여요.')}
            action={<div className="flex gap-2"><Button size="sm" icon={<UserPlus size={14} />} onClick={() => nav('/people')}>{t('연결 늘리기')}</Button><Button size="sm" variant="outline" icon={<Search size={14} />} onClick={() => nav('/people/find')}>{t('사람 찾아보기')}</Button></div>} />
        )}>
        {list.map((sd) => <SecondCard key={sd.user.id} sd={sd} asked={myAsk(sd.user.id)} onMutual={() => setMutualOf(sd)} onAsk={() => setAskFor(sd)} onAsks={onAsks} />)}
      </Section>
      <MutualSheet sd={mutualOf} onClose={() => setMutualOf(null)} />
      <AskSheet sd={askFor} onClose={() => setAskFor(null)} onDone={onAsks} />
    </div>
  );
}

/** 경로 한 줄 — "나 → 서연 외 1명 → 지민" */
function PathLine({ sd }: { sd: SecondDegree }) {
  const names = sd.via.slice(0, 2).map((u) => u.nickname).join(', ');
  const extra = sd.via.length > 2 ? sd.via.length - 2 + sd.hiddenVia : sd.hiddenVia;
  return (
    <div className="flex items-center gap-1 text-[13px] font-semibold text-ink min-w-0" aria-label={t('연결 경로')}>
      <span className="shrink-0 text-ink-3">{t('나')}</span>
      <ArrowRight size={13} className="text-ink-3 shrink-0" />
      <span className="flex items-center gap-1 min-w-0">
        {sd.via.slice(0, 2).map((u) => <Avatar key={u.id} emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={20} className="shrink-0" />)}
        <span className="truncate text-ink">{names || fmt(t('공통 연결 {n}명'), { n: sd.hiddenVia })}{names && extra > 0 ? ` ${fmt(t('외 {n}명'), { n: extra })}` : ''}</span>
      </span>
      <ArrowRight size={13} className="text-ink-3 shrink-0" />
      <span className="shrink-0">{sd.user.nickname}</span>
    </div>
  );
}

function SecondCard({ sd, asked, onMutual, onAsk, onAsks }: { sd: SecondDegree; asked?: IntroRequest; onMutual: () => void; onAsk: () => void; onAsks: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const u = sd.user;
  const view = profileView(v.snap, v.me, u);
  const reasons = shareableReasons(matchReasons(v.me, u, v.snap, v.canSeeField(u, 'timetable'))).filter((r) => r.kind !== 'mutual');
  const line = maskedLine(u, view);
  const city = maskedCity(u, view);
  const total = sd.via.length + sd.hiddenVia;
  const canIntro = sd.via.length > 0;
  const open = () => nav(`/users/${u.id}`);

  return (
    <article className="rounded-[24px] border border-line bg-white overflow-hidden">
      {/* 1. 관계의 이유 · 연결 경로 */}
      <div className="bg-[#F4F9FF] px-3.5 pt-3 pb-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="h-6 px-2.5 rounded-full bg-primary text-white text-[11px] font-bold inline-flex items-center shrink-0">{t('2촌')}</span>
          <button onClick={onMutual} className="h-6 px-2.5 rounded-full bg-white border border-[var(--tint)] text-primary text-[11px] font-bold inline-flex items-center gap-0.5 press">{fmt(t('공통 연결 {n}명'), { n: total })}<ChevronRight size={12} /></button>
          <span className="flex-1" />
          {canIntro && <Tag tone="mint">{t('소개 가능')}</Tag>}
        </div>
        <PathLine sd={sd} />
        <ReasonChips reasons={reasons} max={3} />
      </div>
      {/* 2. 사람 */}
      <div className="px-3.5 pt-3 flex items-center gap-3">
        <button onClick={open} className="shrink-0 press" aria-label={u.nickname}><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={52} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button onClick={open} className="text-[15px] font-bold truncate text-left">{u.nickname}</button>
            <SchoolBadge user={u} withYear={view.gradYear} size="sm" className="min-w-0" />
          </div>
          {(line || city) && <div className="text-[12px] text-ink-2 truncate">{[line, city].filter(Boolean).join(' · ')}</div>}
          <StatusPill user={u} size="sm" className="mt-0.5" />
          {!view.full && view.reason && <PrivacyNote text={view.reason} className="mt-0.5" />}
        </div>
      </div>
      {/* 3. 실제 연결 — 부탁 · 저장 · 연결 요청 */}
      <div className="px-3.5 pt-2.5 pb-3 flex items-center gap-1.5">
        {asked ? (
          <button onClick={onAsks} className="h-9 px-3.5 rounded-full bg-surface-2 text-ink-2 text-[12px] font-semibold flex items-center gap-1 press">
            <Handshake size={14} />{asked.status === 'forwarded' ? t('전달됨') : t('전달 대기')}<ChevronRight size={13} />
          </button>
        ) : canIntro ? (
          <Button size="sm" variant="secondary" icon={<Handshake size={14} />} onClick={onAsk}>{t('연결해줄 수 있나요?')}</Button>
        ) : null}
        <SaveButton user={u} />
        <span className="flex-1" />
        <ConnectStatusButton user={u} />
      </div>
    </article>
  );
}

/** 공통 연결 목록 — 경로에 보이지 않게 설정한 사람은 숫자로만 */
function MutualSheet({ sd, onClose }: { sd: SecondDegree | null; onClose: () => void }) {
  const nav = useNavigate();
  return (
    <BottomSheet open={!!sd} onClose={onClose} title={sd ? fmt(t('{name}님과의 공통 연결'), { name: sd.user.nickname }) : ''}>
      {sd && (
        <div className="space-y-1.5">
          {sd.via.map((u) => (
            <button key={u.id} onClick={() => { onClose(); nav(`/users/${u.id}`); }} className="w-full flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2 text-left press">
              <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} />
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-bold truncate">{u.nickname}</span><SchoolBadge user={u} size="sm" /></span>
              <ChevronRight size={16} className="text-ink-3" />
            </button>
          ))}
          {sd.hiddenVia > 0 && <PrivacyNote text={fmt(t('외 {n}명은 경로에 보이지 않게 설정했어요'), { n: sd.hiddenVia })} className="px-1 pt-1" />}
        </div>
      )}
    </BottomSheet>
  );
}

/** "연결해줄 수 있나요?" — 공통 연결 고르기 + 한 줄(선택). 연락처는 적을 수 없다 */
export function AskSheet({ sd, onClose, onDone }: { sd: SecondDegree | null; onClose: () => void; onDone: () => void }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [viaId, setViaId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  if (sd && key !== sd.user.id) { setKey(sd.user.id); setViaId(sd.via[0]?.id ?? null); setNote(''); setErr(null); }
  const contact = containsContact(note);
  const via = sd?.via.find((u) => u.id === viaId);

  const submit = async () => {
    if (!sd || !via) return;
    if (contact) { setErr(t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.')); return; }
    setBusy(true); setErr(null);
    try {
      await run(() => api.intros.create(v.me.id, via.id, sd.user.id, note.trim() || undefined), fmt(t('{name}님에게 물어봤어요'), { name: via.nickname }));
      onClose(); setKey(null); onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={!!sd} onClose={() => { onClose(); setKey(null); }} title={t('연결해줄 수 있나요?')}>
      {sd && (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-2">{fmt(t('{name}님은 공통 연결이 전달하기 전까지 이 부탁을 몰라요. 넘겨도 괜찮은 가벼운 부탁이에요.'), { name: sd.user.nickname })}</p>
          <div>
            <div className="text-[12px] font-bold text-ink-3 mb-1.5">{t('누구에게 물어볼까요?')}</div>
            <div className="space-y-1.5" role="radiogroup">
              {sd.via.map((u) => (
                <button key={u.id} role="radio" aria-checked={viaId === u.id} onClick={() => setViaId(u.id)}
                  className={cn('w-full flex items-center gap-3 rounded-2xl border px-3 py-2 text-left press', viaId === u.id ? 'border-primary bg-primary-soft/60' : 'border-line bg-white')}>
                  <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={34} />
                  <span className="flex-1 min-w-0 text-[14px] font-bold truncate">{u.nickname}</span>
                  <span className={cn('h-5 w-5 rounded-full border-2 grid place-items-center', viaId === u.id ? 'border-primary' : 'border-line')}>{viaId === u.id && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                </button>
              ))}
            </div>
            {sd.hiddenVia > 0 && <PrivacyNote text={fmt(t('외 {n}명은 경로에 보이지 않게 설정했어요'), { n: sd.hiddenVia })} className="mt-1.5 px-1" />}
          </div>
          <div>
            <div className="text-[12px] font-bold text-ink-3 mb-1.5">{t('한 줄 (선택)')}</div>
            <Textarea rows={3} maxLength={200} value={note} onChange={(e) => { setNote(e.target.value); setErr(null); }} placeholder={t('어떤 이야기를 나누고 싶은지 짧게 적어주세요')} aria-invalid={contact || !!err} />
            {(contact || err) && <p className="mt-1 text-[12px] text-danger" role="alert">{err ?? t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.')}</p>}
          </div>
          <Button full size="lg" loading={busy} disabled={!via || contact} icon={<Handshake size={16} />} onClick={submit}>{via ? fmt(t('{name}님에게 물어보기'), { name: via.nickname }) : t('물어보기')}</Button>
        </div>
      )}
    </BottomSheet>
  );
}

// ─── 연결 부탁 ───────────────────────────────────────────────────────────────
function AsksTab({ onPeople }: { onPeople: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const intros = useAppStore((s) => s.introRequests);
  const rooms = useAppStore((s) => s.chatRooms);
  const sec = useSectionState('asks');
  const [busy, setBusy] = useState<string | null>(null);
  const me = v.me.id;
  const byDate = (a: IntroRequest, b: IntroRequest) => b.createdAt.localeCompare(a.createdAt);
  const viaMe = intros.filter((i) => i.viaId === me && i.status === 'pending').sort(byDate);
  const toMe = intros.filter((i) => i.toId === me && i.status === 'forwarded').sort(byDate);
  const mine = intros.filter((i) => i.fromId === me).sort(byDate);
  const name = (id: string) => v.userById(id)?.nickname ?? t('알 수 없음');
  const empty = viaMe.length + toMe.length + mine.length === 0;

  const act = async (id: string, fn: () => Promise<unknown>) => { setBusy(id); try { await fn(); } catch { /* toast by run */ } finally { setBusy(null); } };
  const forward = (it: IntroRequest, pass: boolean) => act(`${it.id}${pass ? 'p' : 'f'}`, () => run(() => api.intros.forward(it.id, me, pass), pass ? t('넘겼어요 · 아무에게도 알리지 않아요') : fmt(t('{name}님에게 전달했어요'), { name: name(it.toId) })));
  const respond = (it: IntroRequest, accept: boolean) => act(`${it.id}${accept ? 'a' : 'd'}`, async () => {
    const r = await run(() => api.intros.respond(it.id, me, accept), accept ? fmt(t('{name}님과 대화가 열렸어요'), { name: name(it.fromId) }) : t('알겠어요 · 상대에게 따로 알리지 않아요'));
    if (accept && r.roomId) nav(`/chats/${r.roomId}`);
  });
  const roomWith = (other: string) => rooms.find((r) => r.type === 'direct' && r.memberIds.includes(me) && r.memberIds.includes(other));

  return (
    <div className="px-4 space-y-4">
      <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={2} />}
        empty={empty && (
          <SectionEmpty emoji="🤝" title={t('아직 연결 부탁이 없어요')} description={t('2촌 카드에서 “연결해줄 수 있나요?”로 공통 연결에게 물어볼 수 있어요.')}
            action={<Button size="sm" onClick={onPeople}>{t('2촌 보기')}</Button>} />
        )}>
        {viaMe.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[14px] font-bold px-1">{t('이어줄 수 있을까요?')}</h2>
            {viaMe.map((it) => (
              <AskCard key={it.id} a={v.userById(it.fromId)} b={v.userById(it.toId)} note={it.note}
                title={fmt(t('{a}님이 {b}님과 연결되고 싶어해요'), { a: name(it.fromId), b: name(it.toId) })}
                foot={t('넘겨도 아무에게도 알리지 않아요')}
                actions={<>
                  <Button size="sm" variant="outline" loading={busy === `${it.id}p`} onClick={() => forward(it, true)}>{t('넘기기')}</Button>
                  <Button size="sm" loading={busy === `${it.id}f`} onClick={() => forward(it, false)}>{t('전달하기')}</Button>
                </>} />
            ))}
          </section>
        )}
        {toMe.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[14px] font-bold px-1">{t('나에게 온 소개')}</h2>
            {toMe.map((it) => (
              <AskCard key={it.id} a={v.userById(it.viaId)} b={v.userById(it.fromId)} note={it.note}
                title={fmt(t('{a}님이 {b}님을 이어주고 싶어해요'), { a: name(it.viaId), b: name(it.fromId) })}
                foot={t('괜찮아요를 눌러도 상대에게 따로 알리지 않아요')}
                onPerson={() => nav(`/users/${it.fromId}`)}
                actions={<>
                  <Button size="sm" variant="outline" loading={busy === `${it.id}d`} onClick={() => respond(it, false)}>{t('괜찮아요')}</Button>
                  <Button size="sm" icon={<MessageCircle size={14} />} loading={busy === `${it.id}a`} onClick={() => respond(it, true)}>{t('대화 시작')}</Button>
                </>} />
            ))}
          </section>
        )}
        {mine.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[14px] font-bold px-1">{t('내가 한 부탁')}</h2>
            {mine.map((it) => {
              const st = MY_STATUS[it.status];
              const room = it.status === 'accepted' ? roomWith(it.toId) : undefined;
              return (
                <div key={it.id} className="rounded-[20px] border border-line bg-white px-3.5 py-3 flex items-center gap-3">
                  <button onClick={() => nav(`/users/${it.toId}`)} className="shrink-0 press">{(() => { const u = v.userById(it.toId); return u ? <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} /> : null; })()}</button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate">{`${name(it.viaId)} → ${name(it.toId)}`}</div>
                    {it.note && <div className="text-[12px] text-ink-3 truncate">"{it.note}"</div>}
                  </div>
                  {room ? <Button size="sm" variant="secondary" icon={<MessageCircle size={13} />} onClick={() => nav(`/chats/${room.id}`)}>{t('대화')}</Button> : null}
                  <span className={cn('h-6 px-2.5 rounded-full text-[11px] font-bold inline-flex items-center shrink-0', st.cls)}>{st.label}</span>
                </div>
              );
            })}
          </section>
        )}
      </Section>
    </div>
  );
}

const MY_STATUS: Record<IntroRequest['status'], { label: string; cls: string }> = {
  pending: { label: t('전달 대기'), cls: 'bg-surface-2 text-ink-2' },
  forwarded: { label: t('전달됨'), cls: 'bg-accent-soft text-primary' },
  accepted: { label: t('이어짐'), cls: 'bg-primary text-white' },
  passed: { label: t('이번엔 어려웠어요'), cls: 'bg-surface-2 text-ink-3 font-semibold' },
  declined: { label: t('이번엔 어려웠어요'), cls: 'bg-surface-2 text-ink-3 font-semibold' },
};

/** 부탁 카드 — 두 사람(아바타) · 한 문장 · 한 줄 메모 · 행동 */
function AskCard({ a, b, title, note, foot, actions, onPerson }: { a?: User; b?: User; title: string; note?: string; foot: string; actions: React.ReactNode; onPerson?: () => void }) {
  return (
    <article className="rounded-[24px] border border-line bg-white p-3.5">
      <div className="flex items-start gap-3">
        <button onClick={onPerson} disabled={!onPerson} className="relative shrink-0 h-11 w-14">
          {a && <Avatar emoji={a.avatar.emoji} hue={a.avatar.hue} url={a.avatar.url} size={36} className="absolute left-0 top-0" />}
          {b && <Avatar emoji={b.avatar.emoji} hue={b.avatar.hue} url={b.avatar.url} size={36} className="absolute right-0 bottom-0 ring-2 ring-white rounded-full" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-ink leading-snug">{title}</div>
          {note && <div className="mt-1.5 rounded-2xl bg-[#F4F9FF] px-3 py-2 text-[13px] text-ink-2 flex gap-1.5"><Quote size={12} className="text-primary shrink-0 mt-0.5" /><span>{note}</span></div>}
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <span className="flex-1 text-[11px] text-ink-3">{foot}</span>
        {actions}
      </div>
    </article>
  );
}
