import { badgeOf, fieldOf, locationOf, orgOfListing } from '@core/lib/listings';
import { useEffect, useRef, useState } from 'react';
import { t, lang } from '@core/i18n';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Clock, MapPin, ExternalLink, Users, Heart, ArrowUpRight, Share2, Flag, MoreHorizontal, BadgeCheck, AlarmClock, CalendarPlus, MessageCircle, CheckCircle2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, Tag, BottomSheet, Input, Segmented, EmptyState, Select } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { ActivityCard } from '@/components/cards/ActivityCard';
import { useOppState } from '@/components/cards/OpportunityCard';
import { affiliationText } from '@/components/cards/PersonCard';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { OPP_TYPE_COLORS, OPP_TYPE_EMOJI, OPP_TYPE_LABELS, PERSON_ROLE_LABELS, RSVP_LABELS, RSVP_EMOJI } from '@core/lib/labels';
import type { OpportunityIntent } from '@core/types';
import { formatDate, formatDateTime, relativeTime } from '@core/lib/format';
import { dday, daysUntil, matchReasons, isTogetherType } from '@core/lib/recommend';
import { cn } from '@core/lib/cn';
import { WithPeopleSection } from '@/components/together/WithPeople';

export function OpportunityDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'info') as 'info' | 'people' | 'qna';
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const opps = useAppStore((s) => s.opportunities);
  const orgs = useAppStore((s) => s.organizations);
  const o = opps.find((x) => x.id === id);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  // 공식 사이트로 나갔다가 돌아오면 "지원했나요?"를 묻는다 — 지원 여부는 우리가 알 수 없으니 본인이 표시한다
  const [askApplied, setAskApplied] = useState(false);
  const opened = useRef(false);
  const markOpened = () => { opened.current = true; };
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible' && opened.current) { opened.current = false; setAskApplied(true); } };
    document.addEventListener('visibilitychange', back);
    window.addEventListener('focus', back);
    return () => { document.removeEventListener('visibilitychange', back); window.removeEventListener('focus', back); };
  }, []);
  const [text, setText] = useState('');
  const [review, setReview] = useState('');
  const [result, setResult] = useState<'accepted' | 'rejected' | 'attended' | ''>('');
  const state = useOppState(o ?? ({ id: '', rolesNeeded: undefined } as never));
  if (!o) return <div className="min-h-full"><TopBar back title={t('기회')} /><EmptyState emoji="🔭" title={t('기회를 찾을 수 없어요')} /></div>;
  const { mine, others } = state;
  const color = OPP_TYPE_COLORS[o.type];
  const teamActs = v.visibleActivities.filter((a) => a.opportunityId === o.id);
  const people = others.map((i) => ({ i, u: v.userById(i.userId)! })).filter((x) => x.u && !v.isBlocked(x.u.id))
    .map((x) => ({ ...x, reasons: matchReasons(v.me, x.u, v.snap, v.canSeeField(x.u, 'timetable')) })).sort((a, b) => (Number(b.i.intent === 'solo' || b.i.intent === 'company') - Number(a.i.intent === 'solo' || a.i.intent === 'company')) || b.reasons.length - a.reasons.length);
  // 학교 행사 목록에서 온 동아리 모임은 orgId가 없다 — 같은 학교의 같은 이름 단체로 잇는다
  const org = orgOfListing(o, orgs);
  const together = isTogetherType(o.type);
  const interestedCount = others.filter((i) => i.saved || i.intent === 'interested').length + (mine?.saved ? 1 : 0);
  const appliedCount = others.filter((i) => i.intent === 'applied').length + (mine?.intent === 'applied' ? 1 : 0);
  const setIntent = (intent: OpportunityIntent | null, msg?: string) => run(() => api.opportunities.setIntent(o.id, v.me.id, intent), msg);

  return (
    <div className="min-h-full pb-28">
      <TopBar back title="" transparent className="absolute left-0 right-0" right={<button onClick={() => setMenu(true)} className="h-10 w-10 grid place-items-center rounded-full bg-white/80 backdrop-blur" aria-label={t('더보기')}><MoreHorizontal size={20} /></button>} />
      <div className="h-[150px] grid place-items-center text-[64px]" style={{ background: `linear-gradient(135deg, ${color}33, ${color}0D)` }}>{OPP_TYPE_EMOJI[o.type]}</div>
      <div className="px-4 -mt-6 relative space-y-3">
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg px-2 h-6 inline-flex items-center text-[11px] font-bold text-white" style={{ background: color }}>{OPP_TYPE_EMOJI[o.type]} {OPP_TYPE_LABELS[o.type]}</span>
            {o.official && <Tag tone="gold"><BadgeCheck size={11} /> {t('공식')}</Tag>}
            {o.deadline && <Tag tone={daysUntil(o.deadline) <= 7 ? 'danger' : 'neutral'} className="ml-auto"><AlarmClock size={11} /> {dday(o.deadline)} · {formatDate(o.deadline)} {t('마감')}</Tag>}
          </div>
          <h1 className="text-[20px] font-extrabold leading-snug mt-2">{o.title}</h1>
          <button onClick={() => org && nav(`/orgs/${org.id}`)} className="text-[13px] text-ink-2 mt-0.5 flex items-center gap-1">{o.host}{org && <span className="text-primary text-[12px]">{t('조직 페이지')}</span>}</button>
          {!together && (
            <button onClick={() => setParams({ tab: 'people' })} className="mt-3 w-full rounded-xl bg-surface-2 px-3 py-2.5 flex items-center gap-3 text-left press">
              <span className="flex items-center gap-1 text-[13px]"><Heart size={14} className="text-danger" fill="currentColor" /><b>{interestedCount}</b> {lang === 'en' ? 'interested' : '명 관심'}</span>
              <span className="flex items-center gap-1 text-[13px]"><CheckCircle2 size={14} className="text-mint" /><b>{appliedCount}</b> {lang === 'en' ? 'applied' : '명 지원'}</span>
              <span className="ml-auto text-[12px] font-semibold text-primary">{lang === 'en' ? 'See who' : '누군지 보기'}</span>
            </button>
          )}
          {together && <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface-2 py-2"><div className="text-[16px] font-extrabold">{others.length}</div><div className="text-[10px] text-ink-3">{t('관심 있는 학생')}</div></div>
            <div className="rounded-xl bg-surface-2 py-2"><div className="text-[16px] font-extrabold">{others.filter((i) => ['going', 'solo', 'company', 'team', 'applied'].includes(i.intent)).length}</div><div className="text-[10px] text-ink-3">{t('참가 예정')}</div></div>
            <button onClick={() => setParams({ tab: 'people' })} className="rounded-xl bg-primary-soft py-2 press"><div className="text-[16px] font-extrabold text-primary">{others.filter((i) => i.intent === 'solo' || i.intent === 'company' || i.intent === 'team').length}</div><div className="text-[10px] text-primary">{t('같이 갈 사람 찾는 중')}</div></button>
          </div>}
        </div>

        {/* 정보는 이유, 사람이 핵심 — 누가 같이 가는지·준비하는지·팀을 찾는지 */}
        <WithPeopleSection o={o} />

        <Segmented value={tab} onChange={(tb) => setParams({ tab: tb })} options={together ? [{ value: 'info', label: t('상세') }, { value: 'people', label: `${t('함께할 사람 ')}${people.length}` }, { value: 'qna', label: `${t('Q&A·후기 ')}${o.qna.length + o.reviews.length}` }] : [{ value: 'info', label: t('상세') }, { value: 'people', label: `${lang === 'en' ? 'People ' : '사람 '}${people.length}` }, { value: 'qna', label: `${t('Q&A·후기 ')}${o.qna.length + o.reviews.length}` }]} />

        {!together && mine?.intent === 'applied' && (
          <div className="card p-4 border border-mint/40 bg-[linear-gradient(120deg,#E1F7F0,#FFFFFF)]">
            <b className="text-[14px] flex items-center gap-1.5"><CheckCircle2 size={16} className="text-mint" />{lang === 'en' ? `You applied · ${formatDate(mine.createdAt)}` : `지원 완료 · ${formatDate(mine.createdAt)}`}</b>
            <p className="text-[12px] text-ink-2 mt-1">{lang === 'en' ? 'It’s saved under Notices › Saved, and classmates can see you applied. When you hear back, leave a quick tip in Q&A — it helps the next person.' : '공고 › 저장에 모아 뒀고, 같은 학교 학생들에게 지원했다고 보여요. 결과가 나오면 Q&A에 짧은 후기를 남겨주세요.'}</p>
            <div className="flex gap-2 mt-2.5">
              <Button size="sm" variant="outline" onClick={() => setParams({ tab: 'qna' })}>{lang === 'en' ? 'Leave a tip' : '후기 남기기'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setIntent('interested', lang === 'en' ? 'Marked as not applied.' : '지원 표시를 지웠어요.')}>{lang === 'en' ? 'Undo' : '취소'}</Button>
            </div>
          </div>
        )}

        {tab === 'info' && (
          <>
            {!(o.type === 'internship' && o.location) && o.description && <div className="card p-4"><p className="text-[14px] text-ink-2 leading-relaxed whitespace-pre-wrap">{o.description}</p></div>}
            <div className="card divide-y divide-line">
              {o.date && <Row icon={<Clock size={16} />} label={t('일시')} value={formatDateTime(o.date, o.startTime ?? '00:00')} />}
              {o.place && <Row icon={<MapPin size={16} />} label={t('장소')} value={o.place.name} action={<button onClick={() => nav('/map')} className="text-[12px] text-primary font-semibold">{t('지도')}</button>} />}
              {!o.place && o.type === 'internship' && locationOf(o) && <Row icon={<MapPin size={16} />} label={lang === 'en' ? 'Location' : '근무지'} value={`${locationOf(o)}${o.remote ? ' · Remote OK' : ''}`} />}
              {o.type === 'internship' && <Row icon={<span>🧭</span>} label={lang === 'en' ? 'Field' : '분야'} value={o.field ?? fieldOf(o.title)} />}
              {o.type === 'internship' && !o.deadline && <Row icon={<AlarmClock size={16} />} label={lang === 'en' ? 'Deadline' : '마감'} value={lang === 'en' ? `Not posted — companies usually close once roles fill. ${badgeOf(o, true).text}.` : `회사가 마감일을 공개하지 않았어요 — 자리가 차면 닫혀요. ${badgeOf(o, false).text}.`} />}
              <Row icon={<span>👤</span>} label={t('누구에게 맞는지')} value={o.eligibility} />
              {o.benefit && <Row icon={<span>🎁</span>} label={t('혜택·상금·장학금')} value={o.benefit} />}
              {o.rolesNeeded && <Row icon={<Users size={16} />} label={t('필요한 역할')} value={o.rolesNeeded.map((r) => PERSON_ROLE_LABELS[r]).join(', ') + (o.teamSize ? `${t(' · 팀 ')}${o.teamSize}` : '')} />}
              {o.sourceUrl && <a href={o.sourceUrl} target="_blank" rel="noreferrer" onClick={() => markOpened()} className="block press"><Row icon={<ExternalLink size={16} />} label={t('공식 출처')} value={o.sourceLabel} sub={`${t('마지막 확인 ')}${formatDate(o.lastVerified)}`} action={<span className="h-8 px-3 rounded-full bg-primary-soft text-primary text-[12px] font-bold inline-flex items-center gap-1">{lang === 'en' ? 'View posting' : '공고 보기'}<ArrowUpRight size={13} /></span>} /></a>}
            </div>
            <div className="flex flex-wrap gap-1">{o.tags.map((t) => <Tag key={t}>#{t}</Tag>)}</div>
            {together && <div>
              <div className="flex items-center justify-between mb-2"><h2 className="text-[15px] font-bold">{t('같이 준비하는 모임 · 팀원 모집')}</h2><button onClick={() => nav(`/create/activity?kind=group&opportunity=${o.id}`)} className="text-[12px] font-semibold text-primary flex items-center gap-1"><CalendarPlus size={13} />{t('만들기')}</button></div>
              {teamActs.length ? <div className="space-y-2">{teamActs.map((a) => <ActivityCard key={a.id} activity={a} variant="row" />)}</div> : <div className="card p-4 text-[13px] text-ink-3">{t('아직 없어요. 준비방이나 팀원 모집을 먼저 열어보세요.')}</div>}
            </div>}
          </>
        )}

        {tab === 'people' && (
          <div className="space-y-2">
            {people.length === 0 && <EmptyState emoji="🙋" title={t('아직 관심 있는 사람이 없어요')} description={t('관심을 표시하면 다른 사람에게 내가 보여요.')} />}
            {people.map(({ u, i, reasons }) => (
              <div key={u.id} className="card p-3.5">
                <button onClick={() => nav(`/users/${u.id}`)} className="flex items-center gap-3 text-left w-full">
                  <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={44} />
                  <div className="flex-1 min-w-0"><b className="text-[14px]">{u.nickname}</b><span className="text-[12px] text-ink-3"> · {affiliationText(u)}</span><div className="text-[12px] mt-0.5"><Tag tone={i.intent === 'solo' || i.intent === 'company' ? 'accent' : i.intent === 'interested' ? 'neutral' : 'mint'} className="h-5">{RSVP_EMOJI[i.intent]} {RSVP_LABELS[i.intent]}</Tag>{u.canOffer.length > 0 && <span className="text-ink-2 ml-1.5">{t('제공:')} {u.canOffer.slice(0, 3).map((r) => PERSON_ROLE_LABELS[r]).join('·')}</span>}</div></div>
                </button>
                {reasons.length > 0 && <ul className="mt-2 space-y-0.5">{reasons.slice(0, 3).map((r) => <li key={r.text} className="text-[12px] text-ink-2 flex items-center gap-1"><CheckCircle2 size={12} className="text-primary shrink-0" />{r.text}</li>)}</ul>}
                <div className="flex gap-2 mt-3">
                  {(i.intent === 'solo' || i.intent === 'company') ? <Button size="sm" full icon={<Users size={14} />} onClick={() => nav(`/users/${u.id}?propose=1&cat=networking&opp=${o.id}`)}>{t('같이 가기 제안')}</Button>
                    : <Button size="sm" full onClick={() => nav(`/create/activity?kind=group&opportunity=${o.id}&invite=${u.id}`)}>{o.rolesNeeded ? t('팀 제안하기') : t('같이 준비해요')}</Button>}
                  <Button size="sm" variant="outline" onClick={() => nav(`/users/${u.id}?propose=1`)} icon={<MessageCircle size={14} />}>{t('커피 한 잔')}</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'qna' && (
          <>
            <div className="card p-4">
              <b className="text-[14px]">{t('질문과 답변')} {o.qna.length}</b>
              <div className="mt-3 space-y-3">
                {o.qna.map((c) => { const u = v.userById(c.authorId); return <div key={c.id} className="flex gap-2.5"><Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={30} /><div className="flex-1"><div className="text-[12px]"><b>{u?.nickname}</b><span className="text-ink-3 ml-1.5">{relativeTime(c.createdAt)}</span></div><p className="text-[13px] text-ink-2 mt-0.5">{c.text}</p></div></div>; })}
                {o.qna.length === 0 && <p className="text-[12px] text-ink-3">{t('궁금한 점을 물어보면 지원 경험자나 주최 측이 답해줘요.')}</p>}
              </div>
              <form className="flex gap-2 mt-3" onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; await run(() => api.opportunities.ask(o.id, v.me.id, text.trim())); setText(''); }}><Input className="h-10" placeholder={t('질문 남기기')} value={text} onChange={(e) => setText(e.target.value)} /><Button size="sm" className="h-10" type="submit" disabled={!text.trim()}>{t('등록')}</Button></form>
            </div>
            <div className="card p-4">
              <b className="text-[14px]">{t('지원·참가 후기')} {o.reviews.length}</b>
              <div className="mt-3 space-y-3">
                {o.reviews.map((r) => { const u = v.userById(r.authorId); return <div key={r.id} className="flex gap-2.5"><Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={30} /><div className="flex-1"><div className="text-[12px] flex items-center gap-1.5"><b>{u?.nickname}</b>{r.result && <Tag tone={r.result === 'accepted' ? 'mint' : r.result === 'rejected' ? 'neutral' : 'primary'} className="h-5">{{ accepted: t('합격·수혜'), rejected: t('불합격'), attended: t('참가') }[r.result]}</Tag>}<span className="text-ink-3">{relativeTime(r.createdAt)}</span></div><p className="text-[13px] text-ink-2 mt-0.5">{r.text}</p></div></div>; })}
                {o.reviews.length === 0 && <p className="text-[12px] text-ink-3">{t('첫 후기를 남겨보세요. 결과 공개는 선택이에요.')}</p>}
              </div>
              <div className="mt-3 space-y-2">
                <Select value={result} onChange={(e) => setResult(e.target.value as never)}><option value="">{t('결과 비공개')}</option><option value="accepted">{t('합격·수혜')}</option><option value="rejected">{t('불합격')}</option><option value="attended">{t('참가')}</option></Select>
                <div className="flex gap-2"><Input className="h-10" placeholder={t('후기·팁 남기기')} value={review} onChange={(e) => setReview(e.target.value)} /><Button size="sm" className="h-10" disabled={!review.trim()} onClick={async () => { await run(() => api.opportunities.review(o.id, v.me.id, review.trim(), result || undefined), t('후기를 남겼어요.')); setReview(''); setResult(''); }}>{t('등록')}</Button></div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <div className="flex gap-2">
          <button onClick={() => run(() => api.opportunities.toggleSave(o.id, v.me.id), mine?.saved ? undefined : (lang === 'en' ? 'Added to your interested list — it’s at the top of Notices.' : '관심 목록에 넣었어요 — 공고 맨 위에 보여요.'))} className={cn('h-[52px] w-[52px] rounded-2xl grid place-items-center press', mine?.saved ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-ink-2')} aria-label={lang === 'en' ? 'Interested' : '관심'}><Heart size={22} fill={mine?.saved ? 'currentColor' : 'none'} /></button>
          {together ? (<>
            <Button size="lg" variant={mine ? 'secondary' : 'primary'} className="flex-1" onClick={() => setRsvpOpen(true)}>{mine ? `${RSVP_EMOJI[mine.intent]} ${RSVP_LABELS[mine.intent]}` : t('같이 갈래요')}</Button>
            {mine && (mine.intent === 'solo' || mine.intent === 'company') && <Button size="lg" variant="outline" onClick={() => setParams({ tab: 'people' })} icon={<Users size={18} />}>{t('사람 찾기')}</Button>}
          </>) : (
            o.sourceUrl ? (
              <Button size="lg" variant={mine?.intent === 'applied' ? 'secondary' : 'primary'} className="flex-1" icon={mine?.intent === 'applied' ? <CheckCircle2 size={18} /> : undefined} onClick={() => { markOpened(); window.open(o.sourceUrl, '_blank', 'noopener'); }}>
                {mine?.intent === 'applied' ? (lang === 'en' ? 'Applied · view posting' : '지원 완료 · 공고 보기') : (lang === 'en' ? `Apply on ${o.host.length > 18 ? 'site' : o.host}` : `${o.host.length > 12 ? '공식 사이트' : o.host}에서 지원`)}<ArrowUpRight size={18} className="ml-1" />
              </Button>
            ) : mine?.intent === 'applied' ? <Button size="lg" variant="secondary" className="flex-1" icon={<CheckCircle2 size={18} />} onClick={() => setIntent('interested')}>{t('지원 완료')}</Button>
            : <Button size="lg" className="flex-1" onClick={() => setIntent('applied', t('지원 완료로 표시했어요. 후기를 남겨주면 다음 사람에게 도움이 돼요.'))}>{t('지원했어요')}</Button>
          )}
        </div>
      </div>

      <BottomSheet open={askApplied} onClose={() => setAskApplied(false)} title={lang === 'en' ? `Did you apply to ${o.host}?` : `${o.host}에 지원했나요?`}>
        <p className="text-[13px] text-ink-2 -mt-1 mb-3">{lang === 'en' ? 'We’ll keep it in your list and show classmates who else applied. Only you can change this.' : '내 목록에 남겨 두고, 같이 지원한 학생들을 보여드려요.'}</p>
        <div className="flex gap-2">
          <Button full variant="outline" onClick={() => setAskApplied(false)}>{lang === 'en' ? 'Not yet' : '아직이요'}</Button>
          <Button full icon={<CheckCircle2 size={16} />} onClick={async () => { setAskApplied(false); await setIntent('applied', lang === 'en' ? 'Marked as applied ✓ — see the status card at the top.' : '지원 완료로 표시했어요 ✓'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{lang === 'en' ? 'Yes, I applied' : '네, 지원했어요'}</Button>
        </div>
      </BottomSheet>
      <BottomSheet open={rsvpOpen} onClose={() => setRsvpOpen(false)} title={t('이 행사, 어떻게 할래요?')}>
        <div className="space-y-1.5">
          {(['interested', 'going', 'solo', 'company', 'team', 'applied', 'done'] as OpportunityIntent[]).filter((k) => k !== 'team' || o.rolesNeeded).map((k) => (
            <button key={k} onClick={async () => { await setIntent(k, k === 'company' || k === 'solo' ? t('같이 갈 사람을 보여드릴게요.') : undefined); setRsvpOpen(false); if (k === 'company' || k === 'solo') setParams({ tab: 'people' }); }}
              className={cn('w-full text-left rounded-xl px-3.5 h-12 text-[14px] font-medium border flex items-center gap-2.5', mine?.intent === k ? 'border-primary bg-primary-soft' : 'border-line')}>
              <span className="text-lg">{RSVP_EMOJI[k]}</span>{RSVP_LABELS[k]}
              {(k === 'solo' || k === 'company') && <span className="ml-auto text-[11px] text-ink-3">{others.filter((i) => i.intent === 'solo' || i.intent === 'company').length}{t('명')}</span>}
            </button>
          ))}
          {mine && <button onClick={async () => { await setIntent(null); setRsvpOpen(false); }} className="w-full h-10 text-[13px] text-ink-3">{t('상태 지우기')}</button>}
        </div>
      </BottomSheet>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={t('기회')}>
        <div className="space-y-1">
          <SheetItem icon={<Share2 size={18} />} label={t('친구에게 보내기')} onClick={() => { setMenu(false); showToast(t('링크를 복사했어요.')); }} />
          {o.sourceUrl && <SheetItem icon={<ExternalLink size={18} />} label={t('공식 출처 열기')} onClick={() => { setMenu(false); window.open(o.sourceUrl, '_blank'); }} />}
          <SheetItem icon={<Flag size={18} />} label={t('잘못된 정보·부적절한 내용 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />
        </div>
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="activity" targetId={o.id} />
    </div>
  );
}

function Row({ icon, label, value, sub, action }: { icon: React.ReactNode; label: string; value: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="h-8 w-8 rounded-lg bg-surface-2 text-ink-2 grid place-items-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0"><div className="text-[11px] text-ink-3">{label}</div><div className="text-[14px] font-semibold">{value}</div>{sub && <div className="text-[12px] text-ink-3">{sub}</div>}</div>
      {action}
    </div>
  );
}
