import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Bookmark, CalendarDays, CheckCircle2, Clock, Compass, ExternalLink, Flag, Gift, Globe2, MapPin, Share2, User as UserIcon, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Opportunity, OpportunityIntent } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { campusDate, listingField, locationOf, orgOfListing, workAuthLabel } from '@core/lib/listings';
import { dday, daysUntil } from '@core/lib/recommend';
import { formatDate, formatTime, relativeTime } from '@core/lib/format';
import { canGoTogether, socialSummary } from '@core/lib/withpeople';
import { cn } from '@core/lib/cn';
import { Avatar, BottomSheet, SampleTag } from '@/components/ui';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { affiliationText } from '@/components/cards/PersonCard';
import { useOppState } from '@/components/cards/OpportunityCard';
import { Faces, usePeopleSnap } from '@/components/together/PeopleLine';
import { GoTogetherSheet } from '@/components/together/GoTogetherSheet';
import {
  BackHeader, PageTitle, Badge, Btn, BottomCTA, RoundIconBtn, SegTabs, TextCard, InfoRows, InfoNote, FormField, TextArea, PersonCard, RowCard, EmptyState, ChoiceChips, cardCls, type InfoRow,
} from '@/components/ha';
import { badgeLabel, badgeTone } from '@/pages/explore/exploreData';

const en = lang === 'en';

/**
 * Campus event (PDF S020) · Opportunity details (S021) · Opportunity Q&A (S090) — one screen, ?tab=qna for Q&A.
 * Details: type + "Source verified" badges, the date / deadline pill with View source, big title, host; SegTabs;
 * description, Who it's for / Benefits / Original source, "Register at Source"; the people who are actually going
 * or applied (Go together · Prep together). BottomCTA: bookmark + Going (events) / I applied (everything else).
 */
export function OpportunityDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'qna' ? 'qna' : 'details';
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const opps = useAppStore((s) => s.opportunities);
  const orgs = useAppStore((s) => s.organizations);
  const o = opps.find((x) => x.id === id);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [goingSheet, setGoingSheet] = useState(false);
  const [question, setQuestion] = useState('');
  const [posting, setPosting] = useState(false);
  // 공식 사이트로 나갔다가 돌아오면 "지원했나요?" — 지원 여부는 우리가 알 수 없으니 본인이 표시한다
  const [askApplied, setAskApplied] = useState(false);
  const opened = useRef(false);
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible' && opened.current) { opened.current = false; setAskApplied(true); } };
    document.addEventListener('visibilitychange', back);
    window.addEventListener('focus', back);
    return () => { document.removeEventListener('visibilitychange', back); window.removeEventListener('focus', back); };
  }, []);
  const state = useOppState(o ?? ({ id: '', rolesNeeded: undefined } as never));

  if (!o) return (
    <div className="min-h-full bg-bg">
      <BackHeader />
      <EmptyState icon={<Compass size={30} />} title={en ? 'This listing isn’t here anymore' : '이 공고를 찾을 수 없어요'} sub={en ? 'It may have closed or been taken down by the source.' : '마감됐거나 원문에서 내려갔을 수 있어요.'}
        action={{ label: en ? 'Back to Explore' : 'Explore 로', onClick: () => nav('/explore/opportunities') }} />
    </div>
  );

  const { mine } = state;
  const isEvent = o.type === 'event';
  const saved = !!mine?.saved || (!!mine && mine.intent !== 'interested');
  const org = orgOfListing(o, orgs);
  const setIntent = (intent: OpportunityIntent | null, msg?: string) => run(() => api.opportunities.setIntent(o.id, v.me.id, intent), msg);
  const toggleSave = () => run(() => api.opportunities.toggleSave(o.id, v.me.id), saved ? undefined : (en ? 'Saved — it’s under Explore › Opportunities › Saved.' : '저장했어요 — Explore › 기회 › 저장에 있어요.'));
  const openSource = () => { if (!o.sourceUrl) return; opened.current = !isEvent; window.open(o.sourceUrl, '_blank', 'noopener'); };
  const going = !!mine && ['going', 'solo', 'company', 'team'].includes(mine.intent);
  const applied = mine?.intent === 'applied';
  const qnaCount = o.qna.length + o.reviews.length;
  const tabs = [{ key: 'details', label: en ? 'Details' : '상세' }, { key: 'qna', label: 'Q&A', count: qnaCount }];
  const setTab = (k: string) => { const p = new URLSearchParams(params); if (k === 'qna') p.set('tab', 'qna'); else p.delete('tab'); p.delete('with'); setParams(p, { replace: true }); };

  // 날짜 알약 — 행사는 일시, 지원형은 마감 (마감이 없으면 날짜 없이)
  const when = isEvent && o.date ? [formatDate(campusDate(o.date)), o.startTime && o.startTime !== '00:00' ? formatTime(o.startTime) : ''].filter(Boolean).join(' · ')
    : o.deadline ? (en ? `Due ${formatDate(campusDate(o.deadline))} · ${dday(o.deadline)}` : `${formatDate(campusDate(o.deadline))} 마감 · ${dday(o.deadline)}`) : '';
  const where = o.place?.name || (o.type === 'internship' ? locationOf(o) : '');

  const post = async () => {
    const text = question.trim(); if (!text) return;
    setPosting(true);
    try { await run(() => api.opportunities.ask(o.id, v.me.id, text), en ? 'Question posted' : '질문을 올렸어요'); setQuestion(''); } finally { setPosting(false); }
  };

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={tab === 'qna' ? (en ? 'Opportunity Q&A' : '공고 Q&A') : undefined} onMore={() => setMenu(true)} />
      {tab === 'qna' ? (
        <PageTitle title={en ? 'Opportunity Q&A' : '공고 Q&A'} sub={o.title} className="pb-2" />
      ) : (
        <div className="px-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={badgeTone(o)} className="h-7 px-3 text-[13px]">{badgeLabel(o)}</Badge>
            {o.official && <Badge tone="peach" className="h-7 px-3 text-[13px]">{en ? 'Source verified' : '출처 확인됨'}</Badge>}
          </div>
          {(when || o.sourceUrl) && (
            <div className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-xl bg-surface-2 px-3 h-9 text-[13px] text-ink-2">
              <CalendarDays size={15} className="text-ink-3 shrink-0" />
              {when && <span className={cn('truncate', o.deadline && daysUntil(o.deadline) <= 3 && 'text-danger font-semibold')}>{when}</span>}
              {when && o.sourceUrl && <span className="text-ink-3">·</span>}
              {o.sourceUrl && <button onClick={openSource} className="font-semibold text-sel-fg whitespace-nowrap press">{en ? 'View source' : '원문 보기'}</button>}
            </div>
          )}
          <h1 className="ha-title mt-4 leading-[1.12]">{o.title}</h1>
          <p className="text-[15px] text-ink-2 mt-2 leading-snug">
            {org ? <button onClick={() => nav(`/orgs/${org.id}`)} className="text-sel-fg font-semibold press">{o.host}</button> : o.host}
            {where ? ` · ${where}` : ''}
          </p>
        </div>
      )}

      <SegTabs className="mx-4 mt-4" tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'details' ? (
        <div className="px-4 pt-4 pb-6 space-y-3 flex-1">
          {applied && (
            <div className={cn(cardCls, 'p-4 flex items-start gap-3')}>
              <CheckCircle2 size={20} className="text-ok shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold">{en ? `You applied · ${formatDate(mine!.createdAt.slice(0, 10))}` : `지원 완료 · ${formatDate(mine!.createdAt.slice(0, 10))}`}</div>
                <p className="text-[13px] text-ink-3 mt-0.5">{en ? 'When you hear back, a short tip in Q&A helps the next person.' : '결과가 나오면 Q&A에 짧은 후기를 남겨주세요.'}</p>
              </div>
            </div>
          )}
          {o.description && !(o.type === 'internship' && o.location) && <TextCard><span className="whitespace-pre-wrap">{o.description}</span></TextCard>}
          <InfoRows rows={detailRows(o, openSource)} />
          {o.sourceUrl && (
            <Btn full variant="outline" size="lg" icon={<ExternalLink size={17} />} onClick={openSource}>{isEvent ? (en ? 'Register at Source' : '원문에서 신청') : (en ? 'Apply at Source' : '원문에서 지원')}</Btn>
          )}
          <WithPeople o={o} />
        </div>
      ) : (
        <div className="px-4 pt-4 pb-6 space-y-4 flex-1">
          <TextCard title={en ? 'Questions & answers' : '질문과 답변'}>{en ? 'Ask about eligibility, timing or the application process.' : '자격·일정·지원 과정을 물어보세요.'}</TextCard>
          {(o.qna.length > 0 || o.reviews.length > 0) && (
            <div className={cn(cardCls, 'divide-y divide-line')}>
              {[...o.qna.map((c) => ({ id: c.id, authorId: c.authorId, text: c.text, at: c.createdAt, tag: '' })),
                ...o.reviews.map((r) => ({ id: r.id, authorId: r.authorId as string | undefined, text: r.text, at: r.createdAt, tag: r.result ? ({ accepted: en ? 'Accepted' : '합격', rejected: en ? 'Not selected' : '불합격', attended: en ? 'Attended' : '참가' }[r.result]) : (en ? 'Tip' : '후기') }))]
                .sort((a, b) => a.at.localeCompare(b.at)).map((c) => {
                  const u = c.authorId ? v.userById(c.authorId) : undefined;
                  return (
                    <div key={c.id} className="p-4 flex gap-3">
                      <Avatar emoji={u?.avatar.emoji ?? ''} hue={u?.avatar.hue ?? 250} url={u?.avatar.url} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] text-ink-3">{u?.sample && <SampleTag />}<b className="text-ink font-semibold">{u?.nickname ?? (en ? 'Student' : '학생')}</b>{c.tag && <> · {c.tag}</>} · {relativeTime(c.at)}</div>
                        <p className="text-[14px] text-ink-2 mt-0.5 leading-snug whitespace-pre-wrap">{c.text}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          <FormField label={en ? 'Your question' : '내 질문'}>
            <TextArea value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} placeholder={en ? 'What would you like to know?' : '무엇이 궁금한가요?'} />
          </FormField>
          <InfoNote>{en ? 'Answers and reviews belong to their authors. Check the official source for current requirements.' : '답변과 후기는 쓴 사람의 것이에요. 최신 조건은 공식 출처에서 확인하세요.'}</InfoNote>
          <ReviewLink o={o} />
        </div>
      )}

      {tab === 'qna' ? (
        <BottomCTA><Btn full size="lg" disabled={!question.trim()} loading={posting} onClick={post}>{en ? 'Post Question' : '질문 올리기'}</Btn></BottomCTA>
      ) : (
        <BottomCTA leading={<RoundIconBtn label={saved ? (en ? 'Unsave' : '저장 취소') : (en ? 'Save' : '저장')} active={saved} onClick={toggleSave}><Bookmark size={21} fill={saved ? 'currentColor' : 'none'} /></RoundIconBtn>}>
          {isEvent
            ? going
              ? <Btn full size="lg" variant="outline" icon={<CheckCircle2 size={18} className="text-ok" />} onClick={() => setGoingSheet(true)}>{en ? 'Going' : '갈 예정'}</Btn>
              : <Btn full size="lg" onClick={() => setIntent('going', en ? 'Marked as going.' : '갈 예정으로 표시했어요.')}>{en ? 'Going' : '갈래요'}</Btn>
            : applied
              ? <Btn full size="lg" variant="outline" icon={<CheckCircle2 size={18} className="text-ok" />} onClick={() => setIntent('interested', en ? 'Marked as not applied.' : '지원 표시를 지웠어요.')}>{en ? 'Applied' : '지원 완료'}</Btn>
              : <Btn full size="lg" onClick={() => setIntent('applied', en ? 'Marked as applied.' : '지원 완료로 표시했어요.')}>{en ? 'I applied' : '지원했어요'}</Btn>}
        </BottomCTA>
      )}

      <BottomSheet open={goingSheet} onClose={() => setGoingSheet(false)} title={en ? 'Your plan for this event' : '이 행사 계획'}>
        <div className="space-y-2 pb-1">
          {([['going', en ? 'Going' : '갈 예정'], ['interested', en ? 'Maybe — keep it saved' : '아마도 — 저장만']] as [OpportunityIntent, string][]).map(([k, label]) => {
            const on = k === 'going' ? going : mine?.intent === k;
            return (
              <button key={k} onClick={async () => { setGoingSheet(false); if (!on) await setIntent(k); }}
                className={cn('w-full h-12 px-4 rounded-2xl border text-left text-[15px] font-semibold press', on ? 'border-sel-line bg-sel-soft text-sel-fg' : 'border-line bg-surface')}>{label}</button>
            );
          })}
          <button onClick={async () => { setGoingSheet(false); await setIntent(null); }} className="w-full h-11 text-[14px] text-ink-3 press">{en ? 'Not going' : '안 가요'}</button>
        </div>
      </BottomSheet>
      <BottomSheet open={askApplied} onClose={() => setAskApplied(false)} title={en ? `Did you apply to ${o.host}?` : `${o.host}에 지원했나요?`}>
        <p className="text-[14px] text-ink-2 -mt-1 mb-4">{en ? 'Only you can mark this. Classmates see who applied, so you can prep together.' : '본인만 표시할 수 있어요. 같이 지원한 학생과 준비할 수 있어요.'}</p>
        <div className="grid grid-cols-2 gap-2.5">
          <Btn variant="outline" onClick={() => setAskApplied(false)}>{en ? 'Not yet' : '아직이요'}</Btn>
          <Btn onClick={async () => { setAskApplied(false); await setIntent('applied', en ? 'Marked as applied.' : '지원 완료로 표시했어요.'); }}>{en ? 'Yes, I applied' : '네, 지원했어요'}</Btn>
        </div>
      </BottomSheet>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={o.title}>
        <div className="space-y-1 pb-1">
          <MenuItem icon={<Share2 size={18} />} label={en ? 'Copy link' : '링크 복사'} onClick={() => { setMenu(false); void navigator.clipboard?.writeText(window.location.href.split('?')[0]).catch(() => {}); showToast(en ? 'Link copied' : '링크를 복사했어요'); }} />
          {o.sourceUrl && <MenuItem icon={<ExternalLink size={18} />} label={en ? 'Open the original listing' : '원문 열기'} onClick={() => { setMenu(false); openSource(); }} />}
          <MenuItem icon={<Flag size={18} />} danger label={en ? 'Report wrong or harmful info' : '잘못된 정보·부적절한 내용 신고'} onClick={() => { setMenu(false); setReport(true); }} />
        </div>
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="activity" targetId={o.id} />
    </div>
  );
}

/** Who it's for · Benefits · when / where · field · int'l students · Original source — only rows the listing has */
function detailRows(o: Opportunity, openSource: () => void): InfoRow[] {
  const rows: InfoRow[] = [];
  if (o.type === 'event' && o.date) rows.push({ tone: 'ice', icon: <Clock size={19} />, label: en ? 'When' : '일시', value: [formatDate(campusDate(o.date)), o.startTime && o.startTime !== '00:00' ? formatTime(o.startTime) : ''].filter(Boolean).join(' · ') });
  if (o.place?.name) rows.push({ tone: 'ice', icon: <MapPin size={19} />, label: en ? 'Where' : '장소', value: o.place.name, caption: o.place.address });
  if (!o.place && o.type === 'internship' && locationOf(o)) rows.push({ tone: 'ice', icon: <MapPin size={19} />, label: en ? 'Location' : '근무지', value: `${locationOf(o)}${o.remote ? ' · Remote OK' : ''}` });
  if (o.type === 'internship') rows.push({ tone: 'lav', icon: <Compass size={19} />, label: en ? 'Field' : '분야', value: listingField(o) });
  if (o.type === 'internship') {
    const w = workAuthLabel(o, en);
    rows.push({ tone: 'lav', icon: <Globe2 size={19} />, label: en ? 'International students' : '유학생', value: w?.text ?? (en ? 'Not stated in the posting' : '공고에 적혀 있지 않아요'), caption: w ? undefined : (en ? 'Check before applying' : '지원 전에 확인하세요') });
  }
  if (o.eligibility) rows.push({ tone: 'ice', icon: <UserIcon size={19} />, label: en ? 'Who it’s for' : '누구에게 맞는지', value: o.eligibility, caption: en ? 'As the source states it' : '원문에 적힌 대로' });
  if (o.benefit) rows.push({ tone: 'peach', icon: <Gift size={19} />, label: en ? 'Benefits / award' : '혜택·상금', value: o.benefit });
  if (o.sourceUrl) rows.push({ tone: 'sel', icon: <ArrowUpRight size={19} />, label: en ? 'Original source' : '공식 출처', value: o.sourceLabel || o.host, caption: o.lastVerified ? (en ? `Last checked ${formatDate(o.lastVerified)}` : `마지막 확인 ${formatDate(o.lastVerified)}`) : undefined, onClick: openSource });
  return rows;
}

function MenuItem({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={cn('w-full h-12 px-2 flex items-center gap-3 rounded-xl text-[15px] font-medium press', danger ? 'text-danger' : 'text-ink')}>{icon}{label}</button>;
}

const INTENT: Record<OpportunityIntent, string> = en
  ? { interested: 'Interested', going: 'Going', solo: 'Going', company: 'Wants company', team: 'Looking for a team', applied: 'Applied', done: 'Did it before' }
  : { interested: '관심', going: '갈 예정', solo: '갈 예정', company: '같이 갈 사람 찾음', team: '팀 찾는 중', applied: '지원함', done: '해 봤어요' };

/**
 * The people part — real people only. Events: who's going + Go together. Applications: who applied / saved + Prep together.
 * Hackathons: who's looking for a team. "Nobody yet" is one quiet row to start it, never a line per card.
 */
function WithPeople({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  const v = useViewer();
  const [params] = useSearchParams();
  const { snap, me } = usePeopleSnap();
  const { others } = useOppState(o);
  const [sheet, setSheet] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (params.get('with') || params.get('tab') === 'people') setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200); }, [params]);
  const s = useMemo(() => (me ? socialSummary(snap, me, o) : null), [snap, me, o]);
  const people = useMemo(() => others.map((i) => ({ i, u: v.userById(i.userId) })).filter((x): x is { i: typeof x.i; u: NonNullable<typeof x.u> } => !!x.u && !v.isBlocked(x.u.id))
    .sort((a, b) => Number(b.i.intent !== 'interested') - Number(a.i.intent !== 'interested')).slice(0, 5), [others, v]);
  if (!s || !me) return null;
  const go = s.kind === 'go' && canGoTogether(o);
  // events without a set time can't open Go together — then there is nothing to start here
  const canStart = s.kind !== 'go' || go;
  const title = s.kind === 'team' ? (en ? 'Looking for a team' : '팀을 찾는 사람') : s.kind === 'go' ? (en ? 'Go with people' : '같이 갈 사람') : (en ? 'Do it with people' : '같이 하는 사람');
  const start = () => (go ? setSheet(true) : nav(`/create/activity?kind=group&opportunity=${o.id}`));
  const startSub = s.kind === 'go' ? (en ? 'Meet a few minutes before and walk in together.' : '시작 전에 만나서 같이 들어가요.')
    : s.kind === 'team' ? (en ? 'Open a team and say which roles you need.' : '팀을 열고 필요한 역할을 적어요.') : (en ? 'Open a small prep group for this one.' : '같이 준비할 작은 모임을 열어요.');
  if (s.first && !canStart) return null;
  return (
    <section ref={ref} className="scroll-mt-16 pt-4">
      <h2 className="ha-h2 mb-3">{title}</h2>
      {s.first ? (
        <RowCard tone="rose" icon={<Users size={22} />} title={s.cta} sub={startSub} onClick={start} />
      ) : (
        <div className="space-y-3">
          <div className={cn(cardCls, 'p-4 flex items-center gap-3')}>
            <Faces people={s.faces} size={28} />
            <span className="flex-1 min-w-0 text-[14px] text-ink-2 leading-snug">{s.sample && <SampleTag />}{s.text}</span>
            {canStart && <Btn size="sm" variant="outline" onClick={start}>{s.cta}</Btn>}
          </div>
          {people.map(({ u, i }) => (
            <PersonCard key={u.id} avatar={u.avatar} name={u.nickname} meta={[u.sample ? (en ? 'Sample' : '예시') : '', affiliationText(u), INTENT[i.intent]].filter(Boolean).join(' · ')}
              onClick={() => nav(`/users/${u.id}`)} action={<Btn size="sm" variant="outline" onClick={() => nav(`/users/${u.id}`)}>{en ? 'View' : '보기'}</Btn>} />
          ))}
        </div>
      )}
      {go && <GoTogetherSheet o={o} open={sheet} onClose={() => setSheet(false)} />}
    </section>
  );
}

/** S090 extra: a short tip after you hear back (reviews) — one link, a sheet */
function ReviewLink({ o }: { o: Opportunity }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState<'' | 'accepted' | 'rejected' | 'attended'>('');
  return (
    <>
      <Btn variant="link" size="sm" onClick={() => setOpen(true)}>{en ? 'Share how it went' : '후기 남기기'}</Btn>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={en ? 'How did it go?' : '어땠나요?'}>
        <div className="space-y-4 pb-1">
          <ChoiceChips value={result} onChange={setResult} options={[{ value: '', label: en ? 'Keep private' : '결과 비공개' }, { value: 'accepted', label: en ? 'Accepted' : '합격' }, { value: 'rejected', label: en ? 'Not selected' : '불합격' }, { value: 'attended', label: en ? 'Attended' : '참가' }]} />
          <TextArea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={en ? 'A tip for the next person' : '다음 사람을 위한 팁'} />
          <Btn full disabled={!text.trim()} onClick={async () => { await run(() => api.opportunities.review(o.id, v.me.id, text.trim(), result || undefined), en ? 'Thanks — your tip is up.' : '후기를 남겼어요.'); setText(''); setResult(''); setOpen(false); }}>{en ? 'Post tip' : '후기 올리기'}</Btn>
        </div>
      </BottomSheet>
    </>
  );
}
