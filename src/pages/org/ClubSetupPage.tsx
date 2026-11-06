import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, Clock, ImagePlus, Link2, MapPin } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import type { HowToJoin, HowToJoinWho } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { WHO_CHOICES, whoLabel, type ClubSetupView, type HowToJoinInput } from '@core/lib/clubjoin';
import { shrinkPhoto } from '@/lib/photoUpload';
import { rememberReturnTo } from '@/components/classes/ClassLink';
import { BackHeader, PageTitle, FormField, TextInput, Chip, ChipRow, Btn, BottomCTA, InfoNote, TextCard, ErrorScreen, LoadingCards, cardCls } from '@/components/ha';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
const photoSrc = (url: string) => (/^(https?:|data:|\/)/.test(url) ? url : `/${url}`);

/**
 * Club setup (owner 2026-11-06) — two ways in:
 *   /club-setup/:token  the magic link sent to the club's official directory e-mail. No account needed to add how to join,
 *                       a logo and a cover; "See who asked" signs in (or up) and makes them a Lumi organizer of that club.
 *   /orgs/:id/setup     an organizer with an account edits the same things.
 * Saving publishes "How to join" on the club page and tells every student who is waiting (server/clubs.ts).
 */
export function ClubSetupPage() {
  const { token, id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const orgFromStore = useAppStore((s) => (id ? s.organizations.find((o) => o.id === id) : undefined));
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const [view, setView] = useState<ClubSetupView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<HowToJoinInput>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const admin = !!id;

  // the view: from the token (no account) or from the organizer's own club
  useEffect(() => {
    if (admin) {
      if (!orgFromStore) return;
      if (!me || !orgFromStore.adminIds.includes(me.id)) { setError(en ? 'Only this club’s organizers can edit how to join.' : '이 동아리 운영진만 고칠 수 있어요.'); return; }
      const v: ClubSetupView = { org: { id: orgFromStore.id, name: orgFromStore.name, type: orgFromStore.type, logo: orgFromStore.logo.url ? { url: orgFromStore.logo.url } : undefined, cover: orgFromStore.cover }, school: '', howToJoin: orgFromStore.howToJoin ?? null, waiting: orgFromStore.requesters?.length ?? orgFromStore.applicantIds.length, organizers: orgFromStore.adminIds.length, used: false, expiresAt: '' };
      setView(v);
      return;
    }
    api.clubs.setup(token ?? '').then(setView, (e: Error) => setError(e.message));
  }, [admin, token, orgFromStore, me]);
  // fill the form once from what is published
  const filled = useRef(false);
  useEffect(() => {
    if (!view || filled.current) return;
    filled.current = true;
    const h: HowToJoin | null = view.howToJoin;
    if (h) setForm({ signupUrl: h.signupUrl, who: h.who, whoNote: h.whoNote, next: h.next });
  }, [view]);
  useEffect(() => { if (view && params.get('step') === 'account') accountRef.current?.scrollIntoView({ block: 'start' }); }, [view, params]);

  if (error) return <div className="min-h-full bg-bg"><BackHeader title={en ? 'Club setup' : '동아리 설정'} /><ErrorScreen message={error} /></div>;
  if (!view) return <div className="min-h-full bg-bg"><BackHeader title={en ? 'Club setup' : '동아리 설정'} /><div className="px-4 pt-4"><LoadingCards count={2} /></div></div>;

  const set = (p: Partial<HowToJoinInput>) => { setSaved(false); setForm((f) => ({ ...f, ...p })); };
  const setNext = (p: Partial<NonNullable<HowToJoinInput['next']>>) => set({ next: { date: '', ...form.next, ...p } });
  const locked = !admin && view.used;
  const publish = async () => {
    setBusy('save');
    try {
      const info: HowToJoinInput = { ...form, next: form.next && (form.next.date || form.next.time || form.next.place) ? form.next : undefined };
      if (admin) { await run(() => api.clubs.saveHowToJoin(view.org.id, info)); }
      else setView(await api.clubs.saveSetup(token ?? '', info));
      setSaved(true);
      showToast(view.waiting ? (en ? `Published — we told ${view.waiting} waiting ${view.waiting === 1 ? 'student' : 'students'}.` : `올렸어요 — 기다리던 ${view.waiting}명에게 알렸어요.`) : (en ? 'Published on the club page.' : '동아리 페이지에 올렸어요.'), 'success');
    } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(null); }
  };
  const photo = async (kind: 'logo' | 'cover', file: File | null) => {
    setBusy(kind);
    try {
      const data = file ? await shrinkPhoto(file) : null;
      const r = admin ? await run(() => api.clubs.photo(view.org.id, kind, data)) : await api.clubs.setupPhoto(token ?? '', kind, data);
      setView({ ...view, org: { ...view.org, [kind]: r.url ? { url: r.url } : undefined } });
    } catch (e) { showToast((e as Error).message || (en ? 'That photo didn’t work.' : '사진을 올리지 못했어요.'), 'error'); } finally { setBusy(null); }
  };
  const claim = async () => {
    setBusy('claim');
    try { const r = await run(() => api.clubs.claim(token ?? ''), en ? `You’re an organizer of ${view.org.name}.` : `${view.org.name} 운영진이 됐어요.`); nav(`/orgs/${r.orgId}/requests`, { replace: true }); }
    catch { /* toast */ } finally { setBusy(null); }
  };
  const signIn = () => { rememberReturnTo(`/club-setup/${token}?step=account`); nav('/welcome'); };

  return (
    <div className="min-h-full bg-bg flex flex-col">
      <BackHeader title={en ? 'Club setup' : '동아리 설정'} onBack={admin ? undefined : () => nav(me ? '/' : '/welcome')} />
      <PageTitle title={view.org.name} sub={view.waiting ? (en ? `${view.waiting} ${view.waiting === 1 ? 'student is' : 'students are'} waiting to hear how to join` : `${view.waiting}명이 가입 방법을 기다려요`) : (en ? 'How students can join your club' : '학생들이 가입하는 방법')} />
      <div className="px-4 space-y-5 pb-6">
        {locked && <TextCard>{en ? 'This link already set up an organizer account. Sign in to Lumi to manage the club.' : '이 링크로 이미 운영진 계정을 만들었어요. Lumi에 로그인해서 관리하세요.'}</TextCard>}
        <fieldset disabled={locked} className="space-y-5">
          <FormField label={en ? 'Sign-up link' : '가입 링크'} hint={en ? 'Your Google Form or any https link' : '구글 폼 등 https 주소'}>
            <TextInput icon={<Link2 size={18} />} inputMode="url" placeholder="https://forms.gle/…" value={form.signupUrl ?? ''} onChange={(e) => set({ signupUrl: e.target.value })} />
          </FormField>
          <FormField label={en ? 'Who can join' : '누가 가입할 수 있나요'}>
            <ChipRow wrap>{WHO_CHOICES.map((w: HowToJoinWho) => <Chip key={w} active={form.who === w} onClick={() => set({ who: form.who === w ? undefined : w })}>{whoLabel(w)}</Chip>)}</ChipRow>
            <TextInput className="mt-2.5" placeholder={en ? 'Optional note, e.g. “Dues $20 per semester”' : '메모 (선택) 예: 학기 회비 20달러'} maxLength={140} value={form.whoNote ?? ''} onChange={(e) => set({ whoNote: e.target.value })} />
          </FormField>
          <FormField label={en ? 'Next info session or meeting (optional)' : '다음 설명회·모임 (선택)'}>
            <div className="grid grid-cols-2 gap-2.5">
              <TextInput icon={<CalendarDays size={18} />} type="date" aria-label={en ? 'Date' : '날짜'} value={form.next?.date ?? ''} onChange={(e) => setNext({ date: e.target.value })} />
              <TextInput icon={<Clock size={18} />} type="time" aria-label={en ? 'Time' : '시간'} value={form.next?.time ?? ''} onChange={(e) => setNext({ time: e.target.value })} />
            </div>
            <TextInput className="mt-2.5" icon={<MapPin size={18} />} placeholder={en ? 'Place, e.g. MLK Pauley Room' : '장소 예: MLK Pauley Room'} maxLength={120} value={form.next?.place ?? ''} onChange={(e) => setNext({ place: e.target.value })} />
          </FormField>
          <FormField label={en ? 'Logo and cover photo (optional)' : '로고와 표지 사진 (선택)'} hint={en ? 'Shown only on your club page. Without them the page is just text.' : '동아리 페이지에만 보여요. 없으면 글만 보여요.'}>
            <div className="flex gap-2.5">
              <PhotoPick label={en ? 'Logo' : '로고'} url={view.org.logo?.url} square busy={busy === 'logo'} onPick={(f) => photo('logo', f)} />
              <PhotoPick label={en ? 'Cover' : '표지'} url={view.org.cover?.url} busy={busy === 'cover'} onPick={(f) => photo('cover', f)} />
            </div>
          </FormField>
        </fieldset>
        {!admin && (
          <div ref={accountRef} className={cn(cardCls, 'p-4 scroll-mt-20')}>
            <div className="text-[15px] font-bold">{en ? 'See who asked' : '누가 요청했는지 보기'}</div>
            <p className="text-[13.5px] text-ink-2 mt-1">{en ? 'With a free organizer account you can see each student’s name, year and major, message them, accept requests, and post your events.' : '무료 운영진 계정으로 학생마다 이름·학년·전공을 보고, 메시지를 보내고, 요청을 받고, 행사를 올릴 수 있어요.'}</p>
            <div className="mt-3">
              {locked ? <Btn variant="outline" onClick={() => nav(me ? `/orgs/${view.org.id}` : '/login')}>{en ? 'Sign in' : '로그인'}</Btn>
                : me ? <Btn variant="outline" loading={busy === 'claim'} onClick={claim}>{en ? `Become an organizer as ${me.nickname}` : `${me.nickname}(으)로 운영진 되기`}</Btn>
                : <Btn variant="outline" onClick={signIn}>{en ? 'Sign in or sign up' : '로그인 또는 가입'}</Btn>}
            </div>
          </div>
        )}
        <InfoNote>{en ? 'Only your club page shows this. We never share your e-mail.' : '동아리 페이지에만 보여요. 이메일은 공개하지 않아요.'}</InfoNote>
      </div>
      {!locked && (
        <BottomCTA note={saved ? <span className="text-[12.5px] text-ok">{en ? 'Published on the club page' : '동아리 페이지에 올렸어요'}</span> : undefined}>
          <Btn full size="lg" loading={busy === 'save'} onClick={publish}>{en ? 'Publish how to join' : '가입 방법 올리기'}</Btn>
        </BottomCTA>
      )}
    </div>
  );
}

/** a real photo or an empty dashed slot with a label — never a placeholder image */
function PhotoPick({ label, url, square, busy, onPick }: { label: string; url?: string; square?: boolean; busy?: boolean; onPick: (f: File | null) => void }): ReactNode {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={cn(square ? 'w-24' : 'flex-1')}>
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        className={cn('w-full rounded-[14px] border border-dashed border-line overflow-hidden grid place-items-center text-ink-3 press', square ? 'aspect-square' : 'h-24')}>
        {url ? <img src={photoSrc(url)} alt="" className="w-full h-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-[12px] font-semibold"><ImagePlus size={20} />{busy ? '…' : label}</span>}
      </button>
      {url && <button type="button" className="mt-1 text-[12px] text-ink-3 press" onClick={() => onPick(null)}>{lang === 'en' ? 'Remove' : '지우기'}</button>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f); }} />
    </div>
  );
}
