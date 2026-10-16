/**
 * 수업 방 본문 (그 수업을 듣는 사람에게만) — 같은 수업 학생 · 수업 끝나고 비는 사람 · 스터디 그룹 · 프로젝트 파트너.
 * 목록은 서버가 보낸 classRosters 만 쓴다 (다른 사람의 시간표에는 수업 이름이 없다).
 * '수업 끝나고 비는 사람'은 원래 시간표(공강)를 나에게 공개한 사람만 계산한다 — 새로 드러나는 정보가 없게.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Coffee, Handshake, Plus, Lock, ChevronRight, EyeOff } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Activity, ClassRoster, User } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { Avatar, Button, Input, SampleTag, Toggle } from '@/components/ui';
import { JoinButton } from '@/components/cards/JoinButton';
import { codeFromName, campusDateOf, type Enrollment } from '@core/lib/classmates';
import { freeBlocks, toMin } from '@core/lib/timetable';
import { slotLabel } from '@core/api/classes';
import { formatDate, formatTime } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { SchoolEmailCard } from '@/components/settings/SchoolEmailCard';
import { CopyClassLink, QrLinkButton } from './ClassLink';

const en = lang === 'en';
const DAYS = en ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['월', '화', '수', '목', '금', '토', '일'];
// 앱의 다른 시각과 같은 꼴 ('11 AM' · '오전 11시') — 같은 화면 위쪽(수업 시간)이 이미 그렇다
const hm = (hhmm: string) => formatTime(hhmm);

/** 겹쳐 쌓은 아바타 */
export function AvatarStack({ users, size = 30, max = 5 }: { users: User[]; size?: number; max?: number }) {
  return (
    <span className="flex -space-x-2">
      {users.slice(0, max).map((u) => <Avatar key={u.id} emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={size} className="ring-2 ring-bg" />)}
    </span>
  );
}

function Section({ icon, title, right, children, id }: { icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-16">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[15px] font-bold text-ink flex items-center gap-2">{icon}{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function ClassRoom({ enrollment, roster, onGo }: { enrollment: Enrollment; roster: ClassRoster | undefined; onGo?: (path: string) => void }) {
  const navigate = useNavigate();
  const go = (p: string) => (onGo ? onGo(p) : navigate(p));
  const v = useViewer();
  const me = v.me;
  const run = useAppStore((s) => s.run);
  const activities = useAppStore((s) => s.activities);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const code = enrollment.code;

  const members = useMemo(() => (roster?.members ?? []).map((m) => ({ m, u: v.userById(m.userId) })).filter((x): x is { m: typeof x.m; u: User } => !!x.u), [roster, v]);
  // 수업이 끝난 뒤 1시간 이상 비는 사람 — 시간표(공강) 공개 범위 안의 사람만
  const freeAfter = useMemo(() => {
    const meetings = enrollment.meetings;
    return members.flatMap(({ u }) => {
      if (!u.timetable?.length || !v.canSeeField(u, 'timetable')) return [];
      const days = [...new Set(meetings.filter((c) => freeBlocks(u.timetable ?? [], c.day).some((b) => b.start <= toMin(c.end) && b.end - toMin(c.end) >= 60)).map((c) => c.day))];
      return days.length ? [{ u, days }] : [];
    });
  }, [members, enrollment, v]);
  const endLabel = enrollment.meetings[0] ? hm(enrollment.meetings[0].end) : '';
  const afterDays = [...new Set(freeAfter.flatMap((x) => x.days))].sort().map((d) => DAYS[d]).join('/');

  const today = campusDateOf(new Date());
  const suggested = activities.filter((a) => a.studyGroup?.key === enrollment.key && a.studyGroup.invitedIds.includes(me.id) && a.studyGroup.status !== 'expired' && a.date >= today);
  const crews = v.visibleActivities.filter((a) => !a.studyGroup && a.category === 'study' && a.courseName && (a.courseName === enrollment.name || codeFromName(a.courseName) === code) && a.date >= today);
  const mySearch = me.partnerSearch?.find((p) => p.key === enrollment.key);
  /** 같은 수업에 (보이는) 다른 학생이 아직 없다 */
  const alone = members.length === 0;
  const partners = (roster?.partners ?? []).map((p) => ({ p, u: v.userById(p.userId), section: roster?.members.find((m) => m.userId === p.userId)?.section })).filter((x) => !!x.u) as { p: ClassRoster['partners'][number]; u: User; section?: string }[];
  const optedOut = (me.studyGroupOptOut ?? []).includes(enrollment.key);
  const ask = (u: User, msg: string) => go(`/users/${u.id}?propose=1&cat=study&msg=${encodeURIComponent(msg)}`);

  const setPartner = async (n: string | null) => {
    setBusy(true);
    try { await run(() => api.classes.setPartner(me.id, enrollment.key, n), n === null ? (en ? 'Removed you from the list' : '목록에서 내렸어요') : (en ? `You're on the ${code} partner list` : '파트너 찾기 목록에 올렸어요')); setAdding(false); setNote(''); } catch { /* toast */ } finally { setBusy(false); }
  };

  if (roster?.unverified) return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-2 border border-line p-4">
        <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Lock size={16} />{en ? `Verify your school email to see who's in ${code}` : `학교 이메일을 인증하면 ${code} 학생이 보여요`}</div>
        <p className="text-[13px] text-ink-2 mt-1">{en ? 'Class lists are only for verified students, so nobody can add a class just to look at who takes it.' : '수업 명단은 인증한 학생에게만 보여요. 아무나 수업을 추가해 명단을 보지 못하게요.'}</p>
      </div>
      <SchoolEmailCard />
      <div className="flex gap-2"><CopyClassLink compact schoolId={enrollment.schoolId} code={code} /><QrLinkButton schoolId={enrollment.schoolId} code={code} /></div>
    </div>
  );

  if (roster?.hidden) return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-2 border border-line p-4">
        <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><EyeOff size={16} />{en ? "You're hidden from classmates" : '같은 수업 학생에게 숨겨져 있어요'}</div>
        <p className="text-[13px] text-ink-2 mt-1">{en ? 'Turn this on to see who else is in your classes. They only see that you take the same class — nothing else from your timetable.' : '켜면 같은 수업 학생을 볼 수 있어요. 상대에게는 같은 수업을 듣는다는 것만 보여요.'}</p>
        <Button className="mt-3" size="sm" onClick={() => run(() => api.users.update(me.id, { showToClassmates: true }))}>{en ? 'Show me to classmates' : '같은 수업 학생에게 보이기'}</Button>
      </div>
      <div className="flex gap-2"><CopyClassLink compact schoolId={enrollment.schoolId} code={code} /><QrLinkButton schoolId={enrollment.schoolId} code={code} /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 몇 명 · 누구 (보이기를 켠 사람만) */}
      <div className="rounded-2xl bg-surface-2 border border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[22px] font-extrabold text-ink leading-none">{roster?.count ?? 1} <span className="text-[14px] font-semibold text-ink-2">{en ? 'here on Lumi' : '명이 Lumi에'}</span></div>
            <div className="mt-1.5 text-[12.5px] text-ink-3 flex items-center gap-1"><Lock size={12} />{en ? `Only ${code} students see you're in it` : `${code} 학생에게만 보여요`}</div>
          </div>
          <AvatarStack users={members.map((x) => x.u)} />
        </div>
      </div>

      {/* 아직 나 혼자면 빈 칸으로 이어지는 바로가기·사람 줄을 두지 않는다 (PRODUCT_TASTE — 사람이 있을 때만 사람 줄) */}
      {/* 수업 직후 비는 사람이 없으면 그 칸·바로가기를 두지 않는다 (빈자리 문구 대신) */}
      {alone ? null : <div className={cn('grid gap-2', freeAfter.length ? 'grid-cols-3' : 'grid-cols-2')}>
        {[
          ...(freeAfter.length ? [{ id: 'free', icon: <Coffee size={17} />, label: en ? 'Free after class' : '수업 후 공강' }] : []),
          { id: 'study', icon: <BookOpen size={17} />, label: en ? 'Study groups' : '스터디 그룹' },
          { id: 'partners', icon: <Handshake size={17} />, label: en ? 'Project partner' : '프로젝트 파트너' },
        ].map((x) => (
          <button key={x.id} onClick={() => document.getElementById(`cr-${x.id}`)?.scrollIntoView({ behavior: 'smooth' })} className="rounded-2xl bg-surface border border-line px-2 py-3 flex flex-col items-center gap-1.5 text-[12px] font-semibold text-ink press">
            <span className="text-primary">{x.icon}</span>{x.label}
          </button>
        ))}
      </div>}

      {!alone && freeAfter.length > 0 && <Section id="cr-free" icon={<Coffee size={16} className="text-primary" />} title={en ? `Free after ${code}` : `${code} 끝나고 비는 사람`}>
        <div className="space-y-2">
          <p className="text-[13px] text-ink-2">{en ? `${freeAfter.length} free right after it, ${afterDays} ${endLabel}` : `${freeAfter.length}명이 수업 끝나고 비어요 (${afterDays} ${endLabel})`}</p>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
            {freeAfter.slice(0, 8).map(({ u, days }) => (
              <button key={u.id} onClick={() => ask(u, en ? `Grab coffee after ${code} on ${DAYS[days[0]]}?` : `${code} 끝나고 커피 할래요?`)} className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
                <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={56} />
                <span className="text-[12px] text-ink truncate max-w-full">{u.nickname}</span>
                {u.sample && <SampleTag className="mr-0" />}
                <span className="text-[10.5px] text-ink-3">{days.map((d) => DAYS[d]).join('/')}</span>
              </button>
            ))}
          </div>
        </div>
      </Section>}

      <Section id="cr-study" icon={<BookOpen size={16} className="text-primary" />} title={en ? 'Study groups' : '스터디 그룹'}
        right={<button onClick={() => go(`/create/activity?crew=${encodeURIComponent(enrollment.name)}`)} className="text-[13px] font-semibold text-primary flex items-center gap-1"><Plus size={14} />{en ? 'Start one' : '만들기'}</button>}>
        <div className="space-y-2">
          {suggested.map((a) => <SuggestedCard key={a.id} a={a} meId={me.id} onOpen={() => go(`/study/${a.id}`)} />)}
          {crews.map((a) => {
            const left = a.capacity - v.approvedCount(a.id);
            return (
              <div key={a.id} className="rounded-2xl bg-surface-2 px-4 py-3 flex items-center gap-3">
                <button onClick={() => go(`/activities/${a.id}`)} className="flex-1 min-w-0 text-left">
                  <span className="block text-[14.5px] font-semibold text-ink truncate">{a.sample && <SampleTag />}{a.title}</span>
                  <span className="block text-[12.5px] text-ink-3 mt-0.5">{formatDate(a.date)} {hm(a.startTime)} · {left} {en ? `spot${left === 1 ? '' : 's'} left` : '자리'}</span>
                </button>
                <JoinButton activity={a} size="sm" />
              </div>
            );
          })}
          {!suggested.length && !crews.length && <p className="text-[13px] text-ink-3">{en ? `Lumi suggests a group when 3–4 of you are free at the same time.` : '3~4명이 같은 시간에 비면 Lumi가 제안해요.'}</p>}
          <Toggle checked={!optedOut} onChange={(on) => run(() => api.users.update(me.id, { studyGroupOptOut: on ? (me.studyGroupOptOut ?? []).filter((k) => k !== enrollment.key) : [...(me.studyGroupOptOut ?? []), enrollment.key] }))}
            label={en ? `Lumi can suggest ${code} study groups` : `${code} 스터디 그룹 제안 받기`} description={en ? 'At most one a week for this class. Only the people in the group see it.' : '이 수업은 일주일에 한 번까지. 그룹 사람에게만 보여요.'} />
        </div>
      </Section>

      <Section id="cr-partners" icon={<Handshake size={16} className="text-primary" />} title={en ? 'Need a partner?' : '프로젝트 파트너'}>
        <div className="space-y-2">
          {partners.map(({ p, u, section }) => (
            <div key={u.id} className="rounded-2xl bg-surface-2 border border-line px-4 py-3 flex items-center gap-3">
              <button onClick={() => go(`/users/${u.id}`)} className="shrink-0"><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={44} /></button>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-ink truncate">{u.sample && <SampleTag />}{u.nickname}</div>
                <div className="text-[12.5px] text-ink-3">{[section, p.overlap.length ? `${en ? 'both free' : '같이 비는 시간'} ${p.overlap.map((o) => slotLabel(o, en)).slice(0, 2).join(', ')}` : ''].filter(Boolean).join(' · ')}</div>
                {(section && section === roster?.mySection) || p.note ? <div className="text-[12.5px] font-semibold text-primary mt-0.5">{[section && section === roster?.mySection ? (en ? 'Same discussion' : '같은 분반') : '', p.note].filter(Boolean).join(' · ')}</div> : null}
              </div>
              <Button size="sm" variant="secondary" onClick={() => ask(u, en ? `Want to partner up for the ${code} project?` : `${code} 프로젝트 같이 할래요?`)}>{en ? 'Ask' : '물어보기'}</Button>
            </div>
          ))}
          {mySearch ? (
            <div className="rounded-2xl border border-line px-4 py-3">
              <div className="text-[14px] font-semibold text-ink">{en ? "You're on the list" : '목록에 올라가 있어요'}{mySearch.note ? ` · ${mySearch.note}` : ''}</div>
              <div className="text-[12.5px] text-ink-3 mt-0.5">{en ? `Only ${code} students see it · removed after you pair up or the term ends` : '같은 수업 학생에게만 보여요 · 짝을 찾거나 학기가 끝나면 빠져요'}</div>
              <Button className="mt-2" size="sm" variant="outline" loading={busy} onClick={() => setPartner(null)}>{en ? 'I paired up — remove me' : '짝을 찾았어요 — 내리기'}</Button>
            </div>
          ) : adding ? (
            <div className="rounded-2xl border border-line px-4 py-3 space-y-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder={en ? 'One line, optional — "works early", "pair programming in person"' : '한 줄 (선택) — "아침형", "대면 페어 프로그래밍"'} />
              <div className="flex gap-2"><Button size="sm" loading={busy} onClick={() => setPartner(note)}>{en ? 'Add me' : '올리기'}</Button><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>{en ? 'Cancel' : '취소'}</Button></div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="w-full rounded-2xl bg-primary-soft border border-line px-4 py-3 text-left flex items-center gap-3 press">
              <span className="text-[20px]">🙋</span>
              <span><span className="block text-[14.5px] font-bold text-ink">{en ? 'Add me to the list' : '나도 찾고 있어요'}</span>
                <span className="block text-[12.5px] text-ink-2">{en ? `Only ${code} students see it · removed after you pair up` : `${code} 학생에게만 보여요 · 짝을 찾으면 빠져요`}</span></span>
            </button>
          )}
        </div>
      </Section>

      {!alone && <Section icon={<span className="text-primary">👋</span>} title={en ? 'Classmates' : '같은 수업 학생'} right={<span className="text-[12.5px] text-ink-3">{members.length}</span>}>
        {(
          <div className="divide-y divide-line">
            {members.slice(0, 30).map(({ m, u }) => (
              <button key={u.id} onClick={() => go(`/users/${u.id}`)} className="w-full flex items-center gap-3 py-2.5 text-left">
                <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={38} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold text-ink truncate">{u.sample && <SampleTag />}{u.nickname}</span>
                  {m.section && <span className={cn('block text-[12px]', m.section === roster?.mySection ? 'text-primary font-semibold' : 'text-ink-3')}>{m.section === roster?.mySection ? (en ? `Same discussion ${m.section.replace(/^\D+/, '')}` : `같은 분반 ${m.section}`) : m.section}</span>}
                </span>
                <ChevronRight size={16} className="text-ink-3" />
              </button>
            ))}
            {members.length > 30 && <div className="py-2 text-[12.5px] text-ink-3">{en ? `and ${members.length - 30} more` : `외 ${members.length - 30}명`}</div>}
          </div>
        )}
      </Section>}

      <div className="space-y-2">
        <CopyClassLink schoolId={enrollment.schoolId} code={code} />
        <div className="flex gap-2"><QrLinkButton schoolId={enrollment.schoolId} code={code} /></div>
        <Toggle checked={me.showToClassmates !== false} onChange={(on) => run(() => api.users.update(me.id, { showToClassmates: on }))}
          label={en ? 'Show me to classmates' : '같은 수업 학생에게 보이기'}
          description={en ? 'People in the same class see that you take it — nothing else from your timetable. Off = you won’t see them either.' : '같은 수업 학생에게 이 수업을 듣는다는 것만 보여요. 끄면 나도 목록을 못 봐요.'} />
      </div>
    </div>
  );
}

/** Lumi 가 제안한 스터디 그룹 카드 */
export function SuggestedCard({ a, meId, onOpen }: { a: Activity; meId: string; onOpen: () => void }) {
  const sg = a.studyGroup!;
  const mine = sg.responses[meId];
  const yes = sg.invitedIds.filter((id) => sg.responses[id] === 'in').length;
  const status = sg.status === 'formed' ? (mine === 'in' ? (en ? `You're in · ${yes} going` : `참여 · ${yes}명`) : (en ? `${yes} going — join them?` : `${yes}명 참여 중`)) : mine ? (en ? (mine === 'in' ? 'You said yes · waiting for one more' : mine === 'other' ? 'You asked for another time' : 'You passed') : '답했어요') : (en ? `${yes} said yes · waiting on you` : `${yes}명 수락 · 내 답을 기다려요`);
  return (
    <button onClick={onOpen} className="w-full rounded-2xl bg-primary-soft border border-line px-4 py-3 text-left flex items-center gap-3 press">
      <span className="text-[20px]">📚</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-bold text-ink">{en ? 'Lumi found a time' : 'Lumi가 찾은 시간'} · {slotLabel({ day: (new Date(`${a.date}T12:00:00Z`).getUTCDay() + 6) % 7, start: a.startTime, end: a.endTime }, en)}</span>
        <span className="block text-[12.5px] text-ink-2">{status}</span>
      </span>
      <ChevronRight size={16} className="text-ink-3" />
    </button>
  );
}
