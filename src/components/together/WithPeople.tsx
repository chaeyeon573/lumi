import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, Plus, UserPlus, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Activity, Opportunity, OpportunityIntentRecord, Role, User } from '@core/types';
import { Avatar, BottomSheet, Button, Chip, Input, SampleTag } from '@/components/ui';
import { JoinButton } from '@/components/cards/JoinButton';
import { affiliationText } from '@/components/cards/PersonCard';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { OFFER_ROLES, PERSON_ROLE_LABELS } from '@core/lib/labels';
import { formatDate, formatTime, addDaysISO } from '@core/lib/format';
import { canGoTogether, campusToday, crewMembers, crewsFor, goingPeople, myGoCrew, socialSummary, visibleIntents, withKindOf, type SeenIntent } from '@core/lib/withpeople';
import { cn } from '@core/lib/cn';
import { Faces, usePeopleSnap } from './PeopleLine';
import { GoTogetherSheet } from './GoTogetherSheet';

const en = lang === 'en';

/**
 * 상세 페이지 "Do it with people" — 공고 종류에 따라
 *   행사: 누가 가는지 + 같이 가기 · 인턴/장학금/연구: 저장·지원한 사람 + Ask + 준비 모임 · 해커톤: 팀 찾는 사람 + Add yourself + Team up
 * 목록에서 Prep together / Find teammates 를 누르면 ?with=1 로 와서 여기로 스크롤한다.
 */
export function WithPeopleSection({ o }: { o: Opportunity }) {
  const kind = withKindOf(o);
  const [params] = useSearchParams();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (params.get('with')) setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }, [params]);
  return (
    <section ref={ref} className="scroll-mt-16">
      <h2 className="text-[17px] font-extrabold mb-2">{kind === 'team' ? (en ? 'Looking for a team' : '팀을 찾는 사람') : kind === 'go' ? (en ? 'Go with people' : '같이 갈 사람') : (en ? 'Do it with people' : '같이 하는 사람')}</h2>
      {kind === 'go' && <GoPart o={o} />}
      {kind === 'prep' && <PrepPart o={o} />}
      {kind === 'team' && <TeamPart o={o} />}
    </section>
  );
}

// ─── 행사: 같이 가기 ─────────────────────────────────────────────────────
function GoPart({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  const { snap, me } = usePeopleSnap();
  const [sheet, setSheet] = useState(false);
  const going = useMemo(() => goingPeople(snap, me, o.id), [snap, me, o.id]);
  const crew = myGoCrew(snap, me, o.id);
  const s = socialSummary(snap, me, o);
  const can = canGoTogether(o);
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2.5">
        <Faces people={going} size={28} />
        <span className="flex-1 min-w-0 text-[13px] text-ink-2">{s.sample && <SampleTag />}{s.first ? (en ? 'No one has said they’re going yet.' : '아직 간다고 한 사람이 없어요.') : s.text}</span>
      </div>
      {crew && <p className="text-[12px] text-ink-3 mt-2">{en ? `You're in · meet ${formatTime(crew.startTime)} at ${crew.place.name}` : `참여 중 · ${formatTime(crew.startTime)} ${crew.place.name}에서 만나요`}</p>}
      {can ? (
        <Button full className="mt-3" icon={<Users size={16} />} onClick={() => setSheet(true)}>{crew ? (en ? 'See who’s going' : '누가 가는지 보기') : s.cta}</Button>
      ) : (
        <p className="text-[12px] text-ink-3 mt-2">{en ? 'Go together opens once the event has a date and time.' : '날짜와 시간이 정해지면 같이 가기를 열 수 있어요.'}</p>
      )}
      {going.length > 0 && <button onClick={() => nav(`/opportunities/${o.id}?tab=people`)} className="mt-2 text-[12px] font-semibold text-primary">{en ? 'See everyone' : '모두 보기'}</button>}
      {can && <GoTogetherSheet o={o} open={sheet} onClose={() => setSheet(false)} />}
    </div>
  );
}

// ─── 인턴·장학금·연구: 같이 준비 ──────────────────────────────────────────
const PREP_PRESETS: Record<string, [string, string][]> = {
  internship: [['Interview prep', '면접 준비'], ['Resume swap', '이력서 바꿔 보기'], ['Mock interview', '모의 면접']],
  scholarship: [['Essay review', '에세이 리뷰'], ['Application sprint', '지원서 같이 쓰기']],
  lab: [['Cold email review', '연구실 메일 같이 쓰기'], ['Paper reading', '논문 같이 읽기']],
};
const intentWord = (i: OpportunityIntentRecord) => (i.intent === 'applied' ? (en ? 'applied' : '지원함') : i.intent === 'done' ? (en ? 'did it before' : '해 봤어요') : i.saved ? (en ? 'saved this' : '저장함') : (en ? 'interested' : '관심'));

function PrepPart({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  const { snap, me } = usePeopleSnap();
  const [start, setStart] = useState(false);
  // 저장·지원·해 본 사람 (내가 볼 수 있는 사람만) — 해 본 사람과 지원한 사람 먼저
  const people = useMemo(() => {
    const rank = (x: SeenIntent) => (x.i.intent === 'done' ? 0 : x.i.intent === 'applied' ? 1 : 2);
    return visibleIntents(snap, me, o.id).filter((x) => x.i.saved || x.i.intent !== 'interested').sort((a, b) => rank(a) - rank(b)).slice(0, 6);
  }, [snap, me, o.id]);
  const crews = useMemo(() => crewsFor(snap, me, o.id, 'prep').filter((a) => a.date >= campusToday()).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [snap, me, o.id]);
  return (
    <div className="space-y-2">
      {people.map(({ u, i }) => (
        <div key={u.id} className="card p-3 flex items-center gap-3">
          <button onClick={() => nav(`/users/${u.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} />
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold truncate">{u.sample && <SampleTag />}{u.nickname} <span className="font-normal text-ink-3">· {intentWord(i)}</span></span>
              <span className="block text-[12px] text-ink-3 truncate">{affiliationText(u)}</span>
            </span>
          </button>
          <Button size="sm" variant="secondary" icon={<MessageCircle size={14} />} onClick={() => nav(`/users/${u.id}?propose=1&cat=study&opp=${o.id}`)}>{en ? 'Ask' : '물어보기'}</Button>
        </div>
      ))}
      {people.length === 0 && <div className="card p-3.5 text-[13px] text-ink-3">{en ? 'Nobody has saved this yet. Save it and classmates who do will show up here.' : '아직 저장한 사람이 없어요. 저장하면 같이 준비할 사람이 여기 보여요.'}</div>}

      <div className="flex items-center justify-between pt-2"><b className="text-[14px]">{en ? 'Prep crews' : '준비 모임'}</b><button onClick={() => setStart(true)} className="text-[12px] font-semibold text-primary inline-flex items-center gap-1"><Plus size={13} />{en ? 'Start one' : '열기'}</button></div>
      {crews.map((a) => <CrewRow key={a.id} a={a} />)}
      {crews.length === 0 && (
        <button onClick={() => setStart(true)} className="card w-full p-3.5 text-left press">
          <span className="block text-[14px] font-semibold">{en ? 'Start a prep crew' : '준비 모임 열기'}</span>
          <span className="block text-[12px] text-ink-3 mt-0.5">{en ? `e.g. ${(PREP_PRESETS[o.type] ?? PREP_PRESETS.internship)[0][0]} · Thu 7pm — people who saved this can join` : `예: ${(PREP_PRESETS[o.type] ?? PREP_PRESETS.internship)[0][1]} · 목 저녁 7시 — 저장한 사람이 들어올 수 있어요`}</span>
        </button>
      )}
      <PrepCrewSheet o={o} open={start} onClose={() => setStart(false)} />
    </div>
  );
}

function CrewRow({ a }: { a: Activity }) {
  const nav = useNavigate();
  const { snap, me } = usePeopleSnap();
  const n = crewMembers(snap, a).length;
  const mine = a.hostId === me.id;
  return (
    <div className="card p-3 flex items-center gap-3">
      <button onClick={() => nav(`/activities/${a.id}`)} className="flex-1 min-w-0 text-left">
        <span className="block text-[14px] font-semibold truncate">{a.sample && <SampleTag />}{a.title}</span>
        <span className="block text-[12px] text-ink-3 truncate">{formatDate(a.date)} {formatTime(a.startTime)} · {a.place.name} · {en ? `${n} of ${a.capacity + 1}` : `${n}/${a.capacity + 1}명`}</span>
      </button>
      {mine ? <Button size="sm" variant="secondary" onClick={() => nav(`/activities/${a.id}`)}>{en ? 'Yours · open' : '내 모임 · 열기'}</Button> : <JoinButton activity={a} size="sm" label={en ? 'Join' : '참여'} />}
    </div>
  );
}

function PrepCrewSheet({ o, open, onClose }: { o: Opportunity; open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const run = useAppStore((s) => s.run);
  const { me } = usePeopleSnap();
  const presets = PREP_PRESETS[o.type] ?? PREP_PRESETS.internship;
  const [title, setTitle] = useState(presets[0][en ? 0 : 1]);
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('19:00');
  const [place, setPlace] = useState('');
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => addDaysISO(d));
  const school = me?.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const ok = title.trim() && /^\d{2}:\d{2}$/.test(time) && (online || place.trim());
  const create = async () => {
    if (!ok || !me) return;
    setBusy(true);
    const [h, m] = time.split(':').map(Number);
    const end = `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    try {
      const r = await run(() => api.activities.create(me.id, {
        kind: 'group', category: 'study', title: `${title.trim()} · ${o.host}`.slice(0, 100),
        description: en ? `Prepping for "${o.title}" together. Bring what you have — drafts, questions, nerves.` : `"${o.title}" 같이 준비해요. 초안·질문 뭐든 가져오세요.`,
        cover: { emoji: '📝', hue: 220 }, date: days[day], startTime: time, endTime: end,
        place: { name: online ? (en ? 'Online' : '온라인') : place.trim(), lat: 0, lng: 0 }, mode: online ? 'online' : 'offline',
        capacity: 5, fee: 0, joinPolicy: 'open', visibility: school ? 'school' : 'public', opportunityId: o.id, listingCrew: 'prep',
      }), en ? 'Prep crew is open — people who saved this can join.' : '준비 모임을 열었어요.');
      onClose();
      nav(`/activities/${r.activity.id}`);
    } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={en ? 'Start a prep crew' : '준비 모임 열기'}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">{presets.map(([e, k]) => { const v = en ? e : k; return <Chip key={e} size="sm" active={title === v} onClick={() => setTitle(v)}>{v}</Chip>; })}</div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={en ? 'What are you prepping?' : '무엇을 준비하나요?'} />
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-5 px-5">{days.map((d, i) => <Chip key={d} size="sm" active={day === i} onClick={() => setDay(i)}>{i === 0 ? (en ? 'Today' : '오늘') : i === 1 ? (en ? 'Tomorrow' : '내일') : formatDate(d)}</Chip>)}</div>
        <div className="flex gap-2 items-center">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-[130px]" aria-label={en ? 'Time' : '시간'} />
          <Chip size="sm" active={online} onClick={() => setOnline((x) => !x)}>{en ? 'Online' : '온라인'}</Chip>
        </div>
        {!online && <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={en ? 'Where? e.g. library 4th floor' : '어디서? 예: 도서관 4층'} />}
        <Button full size="lg" disabled={!ok} loading={busy} onClick={create}>{en ? 'Open prep crew' : '준비 모임 열기'}</Button>
        <p className="text-[12px] text-ink-3">{en ? 'Visible to students at your school. Up to 6 people, with a group chat.' : '같은 학교 학생에게 보여요. 최대 6명, 그룹 채팅이 열려요.'}</p>
      </div>
    </BottomSheet>
  );
}

// ─── 해커톤·공모전: 팀원 찾기 ─────────────────────────────────────────────
function TeamPart({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  const run = useAppStore((s) => s.run);
  const { snap, me } = usePeopleSnap();
  const [edit, setEdit] = useState(false);
  const seekers = useMemo(() => visibleIntents(snap, me, o.id).filter((x) => x.i.intent === 'team'), [snap, me, o.id]);
  const mine = snap.opportunityIntents.find((i) => i.opportunityId === o.id && i.userId === me.id);
  const onList = mine?.intent === 'team';
  const needs = (i: OpportunityIntentRecord, u: User) => (i.roles?.length ? i.roles : u.lookingFor.filter((r) => OFFER_ROLES.includes(r) || r === 'teammate' || r === 'cofounder'));
  return (
    <div className="space-y-2">
      {seekers.map(({ u, i }) => {
        const need = needs(i, u);
        return (
          <div key={u.id} className="card p-3 flex items-center gap-3">
            <button onClick={() => nav(`/users/${u.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} />
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold truncate">{u.sample && <SampleTag />}{u.nickname}</span>
                <span className="block text-[12px] text-ink-3 truncate">{u.canOffer.length ? u.canOffer.slice(0, 3).map((r) => PERSON_ROLE_LABELS[r]).join(' · ') : affiliationText(u)}</span>
                <span className="block text-[12px] font-semibold text-primary truncate">{need.length ? `${en ? 'needs' : '찾는 역할'} ${need.slice(0, 3).map((r) => PERSON_ROLE_LABELS[r].toLowerCase()).join(', ')}` : (en ? 'needs anyone!' : '누구든 환영')}</span>
              </span>
            </button>
            <Button size="sm" variant="secondary" onClick={() => nav(`/users/${u.id}?propose=1&cat=networking&opp=${o.id}`)}>{en ? 'Team up' : '팀 하자'}</Button>
          </div>
        );
      })}
      {seekers.length === 0 && <div className="card p-3.5 text-[13px] text-ink-3">{en ? 'No one is looking yet — add yourself and teammates can find you.' : '아직 팀을 찾는 사람이 없어요 — 나를 올리면 팀원이 찾아와요.'}</div>}
      {onList ? (
        <div className="card p-3.5 flex items-center gap-3 border border-primary/30">
          <span className="text-[20px]">🙋</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold">{en ? "You're on the list" : '목록에 올라 있어요'}</span>
            <span className="block text-[12px] text-ink-3 truncate">{mine?.roles?.length ? `${en ? 'needs' : '찾는 역할'} ${mine.roles.map((r) => PERSON_ROLE_LABELS[r].toLowerCase()).join(', ')}` : (en ? 'Open to anyone' : '누구든 환영')}</span>
          </span>
          <Button size="sm" variant="outline" onClick={() => setEdit(true)}>{en ? 'Edit' : '수정'}</Button>
          <Button size="sm" variant="ghost" onClick={() => run(() => api.opportunities.setIntent(o.id, me.id, 'interested'), en ? 'Removed you from the list.' : '목록에서 내렸어요.')}>{en ? 'Leave' : '내리기'}</Button>
        </div>
      ) : (
        <button onClick={() => setEdit(true)} className="card w-full p-3.5 flex items-center gap-3 text-left press bg-primary-soft">
          <UserPlus size={20} className="text-primary shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-bold">{en ? 'Add yourself' : '나도 올리기'}</span>
            <span className="block text-[12px] text-ink-2 truncate">{me.canOffer.length ? `${me.canOffer.slice(0, 2).map((r) => PERSON_ROLE_LABELS[r]).join(' · ')}${en ? ' · pick what you need' : ' · 필요한 역할 고르기'}` : (en ? 'Say what you can do and what you need' : '내가 할 수 있는 것과 필요한 역할')}</span>
          </span>
        </button>
      )}
      <TeamSheet o={o} open={edit} onClose={() => setEdit(false)} initial={mine?.intent === 'team' ? mine.roles ?? [] : []} />
    </div>
  );
}

function TeamSheet({ o, open, onClose, initial }: { o: Opportunity; open: boolean; onClose: () => void; initial: Role[] }) {
  const run = useAppStore((s) => s.run);
  const { me } = usePeopleSnap();
  const [roles, setRoles] = useState<Role[]>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setRoles(initial); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const options = [...new Set<Role>([...(o.rolesNeeded ?? []), ...OFFER_ROLES])];
  const toggle = (r: Role) => setRoles((xs) => (xs.includes(r) ? xs.filter((x) => x !== r) : xs.length >= 4 ? xs : [...xs, r]));
  const save = async () => {
    setBusy(true);
    try { await run(() => api.opportunities.lookForTeam(o.id, me.id, roles), en ? "You're on the list — people looking for a team can find you." : '팀 찾는 목록에 올렸어요.'); onClose(); } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={en ? 'Looking for a team' : '팀 찾기'}>
      <p className="text-[13px] text-ink-2 -mt-1">{en ? 'What do you need on your team? (optional, up to 4)' : '팀에 필요한 역할 (선택, 최대 4개)'}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">{options.map((r) => <Chip key={r} size="sm" active={roles.includes(r)} onClick={() => toggle(r)}>{PERSON_ROLE_LABELS[r]}</Chip>)}</div>
      {me && <p className="text-[12px] text-ink-3 mt-3">{en ? 'Others see what you can do from your profile' : '내가 할 수 있는 것은 프로필에서 보여요'}{me.canOffer.length ? `: ${me.canOffer.map((r) => PERSON_ROLE_LABELS[r]).join(', ')}` : ''}.</p>}
      <Button full size="lg" className={cn('mt-4')} loading={busy} onClick={save}>{en ? 'Add me to the list' : '목록에 올리기'}</Button>
    </BottomSheet>
  );
}
