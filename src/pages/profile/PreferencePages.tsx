import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Briefcase, CalendarDays, Check, Eye, GraduationCap } from 'lucide-react';
import { addDaysISO, todayISO } from '@core/lib/format';
import type { Goal, Interest, OpenTo, OpenToKind, Purpose, Role, UniversityRole, Visibility } from '@core/types';
import { BottomSheet } from '@/components/ui';
import { Btn, Chip, ChipRow, FormField, InfoNote, RowCard, SelectField, TextArea, TextInput, cardCls } from '@/components/ha';
import { cn } from '@core/lib/cn';
import { extraVisibilityOf } from '@core/lib/privacy';
import { SaveButton, STATUS_LABEL, SubScreen, VIS_LABEL, en, toggle, useSaveSelf } from './shared';

/** 칩 하나가 저장하는 값 — 기존 필드(purposes·goals·interests·lookingFor)에만 쓴다. 다른 칩과 같은 값을 나누지 않게 골랐다 */
type Opt<T> = { key: T; label: string };
const h2 = 'ha-h2 mb-3';

/* ───────────── S078 Recommendation preferences ───────────── */

const GOAL_CHIPS: Opt<Purpose>[] = [
  { key: 'networking', label: en ? 'Events' : '행사' }, { key: 'study', label: en ? 'Classes' : '수업' },
  { key: 'club', label: en ? 'Communities' : '커뮤니티' }, { key: 'friend', label: en ? 'People' : '사람' },
];
const DISCOVER_GOALS: Opt<Goal>[] = [
  { key: 'internship', label: en ? 'Internships' : '인턴' }, { key: 'lab', label: en ? 'Research' : '연구' },
  { key: 'hackathon', label: en ? 'Hackathons' : '해커톤' }, { key: 'scholarship', label: en ? 'Scholarships' : '장학금' },
];
/** 행사 추천은 관심사 networking 을 본다 (가입 화면의 Campus Events 와 같은 값) */
const CAMPUS_EVENTS: Interest = 'networking';

/**
 * Recommendation preferences (PDF S078): Your goals · What you'd like to discover · Interests → Save Preferences.
 * Recreation·Dining 칩은 뺐다 — 홈의 Campus today 에 늘 있고, 저장할 곳이 운동·점심 관심사뿐이라 S079 의 Work out·Lunch 와 같은 값이 된다.
 */
export function PreferencesPage() {
  const { me, busy, save } = useSaveSelf();
  const [purposes, setPurposes] = useState<Purpose[]>(me.purposes);
  const [goals, setGoals] = useState<Goal[]>(me.goals);
  const [events, setEvents] = useState(me.interests.includes(CAMPUS_EVENTS));
  const [likes, setLikes] = useState(me.likes ?? '');
  const submit = () => save({
    purposes, goals,
    interests: events ? [...new Set([...me.interests, CAMPUS_EVENTS])] : me.interests.filter((i) => i !== CAMPUS_EVENTS),
    likes: likes.trim(),
  }, en ? 'Preferences saved' : '저장했어요');
  return (
    <SubScreen title={en ? 'Recommendation preferences' : '추천 설정'} cta={<SaveButton label={en ? 'Save Preferences' : '저장'} busy={busy} onClick={submit} />}>
      <h2 className={h2}>{en ? 'Your goals' : '내 목표'}</h2>
      <ChipRow wrap>{GOAL_CHIPS.map((c) => <Chip key={c.key} active={purposes.includes(c.key)} onClick={() => setPurposes(toggle(purposes, c.key))}>{c.label}</Chip>)}</ChipRow>
      <h2 className={cn(h2, 'mt-7')}>{en ? 'What you’d like to discover' : '알고 싶은 것'}</h2>
      <ChipRow wrap>
        {DISCOVER_GOALS.map((c) => <Chip key={c.key} active={goals.includes(c.key)} onClick={() => setGoals(toggle(goals, c.key))}>{c.label}</Chip>)}
        <Chip active={events} onClick={() => setEvents(!events)}>{en ? 'Campus events' : '캠퍼스 행사'}</Chip>
      </ChipRow>
      <FormField className="mt-6" label={en ? 'Interests' : '관심사'}><TextInput value={likes} maxLength={120} onChange={(e) => setLikes(e.target.value)} placeholder={en ? 'Coffee, design, photography' : '커피, 디자인, 사진'} /></FormField>
      <InfoNote className="mt-4">{en ? 'Preferences help even when your social network is empty.' : '아는 사람이 없어도 추천이 맞춰져요.'}</InfoNote>
    </SubScreen>
  );
}

/* ───────────── S079 What you're looking for ───────────── */

const PEOPLE: Opt<Role>[] = [
  { key: 'friend', label: en ? 'Friends' : '친구' }, { key: 'study_partner', label: en ? 'Study buddies' : '스터디 친구' },
  { key: 'teammate', label: en ? 'Teammates' : '팀원' }, { key: 'mentor', label: en ? 'Mentors' : '멘토' },
];
const THINGS: Opt<Interest>[] = [
  { key: 'coffee', label: en ? 'Coffee' : '커피' }, { key: 'meal', label: en ? 'Lunch' : '점심' }, { key: 'study', label: en ? 'Study' : '공부' },
  { key: 'exercise', label: en ? 'Work out' : '운동' }, { key: 'walk', label: en ? 'Explore' : '둘러보기' },
];

/** What you're looking for (PDF S079): People you'd like to meet · Things you'd like to do · A little more context */
export function LookingForPage() {
  const { me, busy, save } = useSaveSelf();
  const [roles, setRoles] = useState<Role[]>(me.lookingFor);
  const [things, setThings] = useState<Interest[]>(me.interests);
  const [context, setContext] = useState(me.freeTime ?? '');
  return (
    <SubScreen title={en ? 'What you’re looking for' : '찾고 있는 것'}
      cta={<SaveButton label={en ? 'Save Preferences' : '저장'} busy={busy} onClick={() => save({ lookingFor: roles, interests: things, freeTime: context.trim() }, en ? 'Saved' : '저장했어요')} />}>
      <h2 className={h2}>{en ? 'People you’d like to meet' : '만나고 싶은 사람'}</h2>
      <ChipRow wrap>{PEOPLE.map((c) => <Chip key={c.key} active={roles.includes(c.key)} onClick={() => setRoles(toggle(roles, c.key))}>{c.label}</Chip>)}</ChipRow>
      <h2 className={cn(h2, 'mt-7')}>{en ? 'Things you’d like to do' : '하고 싶은 것'}</h2>
      <ChipRow wrap>{THINGS.map((c) => <Chip key={c.key} active={things.includes(c.key)} onClick={() => setThings(toggle(things, c.key))}>{c.label}</Chip>)}</ChipRow>
      <FormField className="mt-6" label={en ? 'A little more context' : '조금 더'}><TextArea value={context} maxLength={160} onChange={(e) => setContext(e.target.value)} placeholder={en ? 'Optional' : '선택'} /></FormField>
    </SubScreen>
  );
}

/* ───────────── S080 Open to ───────────── */

const OPEN_KINDS: Opt<OpenToKind>[] = [
  { key: 'coffee', label: en ? 'Coffee' : '커피' }, { key: 'study', label: en ? 'Study' : '공부' }, { key: 'advice', label: en ? 'Advice' : '조언' },
  { key: 'walk', label: en ? 'A walk' : '산책' }, { key: 'lunch', label: en ? 'Lunch' : '점심' },
];
export const OPEN_KIND_LABEL = Object.fromEntries(OPEN_KINDS.map((k) => [k.key, k.label])) as Record<OpenToKind, string>;
const WHEN: Opt<OpenTo['when']>[] = [{ key: 'today', label: en ? 'Today' : '오늘' }, { key: 'this_week', label: en ? 'This week' : '이번 주' }, { key: 'next_week', label: en ? 'Next week' : '다음 주' }];
export const WHEN_LABEL = Object.fromEntries(WHEN.map((k) => [k.key, k.label])) as Record<OpenTo['when'], string>;
const AUDIENCE: Opt<Visibility>[] = [{ key: 'friends', label: en ? 'Friends' : '친구' }, { key: 'school', label: en ? 'My school' : '우리 학교' }, { key: 'public', label: en ? 'Everyone' : '모두' }];

/** 이번 주 = 이번 일요일까지, 다음 주 = 그다음 일요일까지 */
function untilFor(when: OpenTo['when']) {
  if (when === 'today') return todayISO();
  const toSunday = (7 - new Date().getDay()) % 7;
  return addDaysISO(toSunday + (when === 'next_week' ? 7 : 0));
}
/** 끝나지 않은 Open to (본인 것은 서버가 그대로 보낸다 — 날짜는 화면이 본다) */
export const activeOpenTo = (o?: OpenTo) => (o && o.until >= todayISO() ? o : undefined);

/** Open to (PDF S080): 무엇 · 언제 · 누구에게 — 잠깐 켜 두는 선택 상태. 서버는 고른 사람에게만, 끝나는 날까지만 보낸다 */
export function OpenToPage() {
  const { me, busy, save } = useSaveSelf();
  const cur = activeOpenTo(me.openTo);
  const [kinds, setKinds] = useState<OpenToKind[]>(cur?.kinds ?? []);
  const [when, setWhen] = useState<OpenTo['when']>(cur?.when ?? 'this_week');
  const [vis, setVis] = useState<Visibility>(cur?.visibility ?? 'friends');
  const [sheet, setSheet] = useState<'when' | 'vis' | null>(null);
  const audience = AUDIENCE.find((a) => a.key === vis)?.label ?? AUDIENCE[0].label;
  const pick = <T extends string>(opts: Opt<T>[], value: T, set: (v: T) => void) => (
    <div className="space-y-2 pb-2">{opts.map((o) => (
      <button key={o.key} onClick={() => { set(o.key); setSheet(null); }} className={cn(cardCls, 'w-full h-12 px-4 flex items-center justify-between text-left text-[15px] press', value === o.key && 'border-sel-line text-sel-fg')}>{o.label}{value === o.key && <Check size={18} />}</button>
    ))}</div>
  );
  return (
    <SubScreen title={en ? 'Open to' : '이런 거 좋아요'} sub={en ? 'Let your people know what you’re up for.' : '지금 무엇을 같이 하고 싶은지 알려요.'}
      cta={<SaveButton label={en ? 'Save' : '저장'} busy={busy} disabled={kinds.length === 0} onClick={() => save({ openTo: { kinds, when, until: untilFor(when), visibility: vis } }, en ? 'Status on' : '켰어요')} />}>
      <ChipRow wrap>{OPEN_KINDS.map((c) => <Chip key={c.key} active={kinds.includes(c.key)} onClick={() => setKinds(toggle(kinds, c.key))}>{c.label}</Chip>)}</ChipRow>
      <FormField className="mt-6" label={en ? 'When' : '언제'}><SelectField icon={<CalendarDays size={19} />} value={WHEN_LABEL[when]} placeholder="" onClick={() => setSheet('when')} /></FormField>
      <FormField className="mt-5" label={en ? 'Visible to' : '보이는 사람'}><SelectField icon={<Eye size={19} />} value={audience} placeholder="" onClick={() => setSheet('vis')} /></FormField>
      <InfoNote className="mt-4">{en ? 'This is a temporary, optional status. Your precise location stays private.' : '잠깐 켜 두는 선택 상태예요. 정확한 위치는 공개되지 않아요.'}</InfoNote>
      {cur && <Btn variant="link" className="mt-3" disabled={busy} onClick={() => save({ openTo: null as unknown as undefined }, en ? 'Status off' : '껐어요')}>{en ? 'Turn off' : '끄기'}</Btn>}
      <BottomSheet open={sheet === 'when'} onClose={() => setSheet(null)} title={en ? 'When' : '언제'}>{pick(WHEN, when, setWhen)}</BottomSheet>
      <BottomSheet open={sheet === 'vis'} onClose={() => setSheet(null)} title={en ? 'Visible to' : '보이는 사람'}>{pick(AUDIENCE, vis, setVis)}</BottomSheet>
    </SubScreen>
  );
}

/* ───────────── S081 Your student status ───────────── */

const STATUSES: { key: UniversityRole; tone: 'ice' | 'lav' | 'peach'; Icon: typeof GraduationCap; sub: string }[] = [
  { key: 'undergraduate', tone: 'ice', Icon: GraduationCap, sub: en ? 'Year and major are editable' : '학년과 전공은 바꿀 수 있어요' },
  { key: 'graduate', tone: 'lav', Icon: BookOpen, sub: en ? 'Master’s or PhD' : '석사·박사' },
  { key: 'alumni', tone: 'peach', Icon: Briefcase, sub: en ? 'Keep your people and campus history' : '사람들과 학교 기록은 그대로' },
];

/** Your student status (PDF S081): Undergraduate / Graduate / Alumni → Update Status. Alumni 로 바꾸면 Your next chapter 로 */
export function StudentStatusPage() {
  const nav = useNavigate();
  const { me, busy, save } = useSaveSelf();
  const aff = me.affiliation.type === 'university' ? me.affiliation : null;
  const [role, setRole] = useState<UniversityRole>(aff?.role ?? 'undergraduate');
  const submit = async () => {
    if (!aff) return;
    if (role === aff.role) { nav(-1); return; }
    await save({ affiliation: { ...aff, role } }, en ? 'Status updated' : '상태를 바꿨어요', false);
    nav(role === 'alumni' ? '/profile/next-chapter' : '/profile', { replace: true });
  };
  return (
    <SubScreen title={en ? 'Your student status' : '학생 상태'} sub={en ? 'Your next chapter stays connected.' : '다음 걸음도 이어져요.'}
      cta={<SaveButton label={en ? 'Update Status' : '상태 바꾸기'} busy={busy} disabled={!aff} onClick={submit} />}>
      <div className="space-y-3">
        {STATUSES.map((s) => (
          <RowCard key={s.key} tone={s.tone} icon={<s.Icon size={21} />} title={STATUS_LABEL[s.key]} sub={s.sub} onClick={() => setRole(s.key)}
            className={cn(role === s.key && 'border-sel-line')} right={role === s.key ? <Check size={18} className="text-sel-fg shrink-0" /> : undefined} />
        ))}
      </div>
      <InfoNote className="mt-4">{en ? 'Updating status keeps your friends, groups, posts and messages.' : '상태를 바꿔도 친구·그룹·글·메시지는 그대로예요.'}</InfoNote>
    </SubScreen>
  );
}

/* ───────────── S082 Your next chapter ───────────── */

/** Your next chapter (PDF S082): Graduation year · City · Company · Role · Industry — 모두 선택, 우리 학교 사람에게만 (Discovery & privacy) */
export function NextChapterPage() {
  const { me, busy, save } = useSaveSelf();
  const n = me.nextChapter ?? {};
  const [f, setF] = useState({ gradYear: n.gradYear ? String(n.gradYear) : '', city: n.city ?? '', company: n.company ?? '', role: n.role ?? '', industry: n.industry ?? '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: k === 'gradYear' ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value }));
  const yearOk = !f.gradYear || (Number(f.gradYear) >= 1950 && Number(f.gradYear) <= 2100);
  const opt = en ? 'Optional' : '선택';
  return (
    <SubScreen title={en ? 'Your next chapter' : '다음 걸음'}
      cta={<SaveButton label={en ? 'Save' : '저장'} busy={busy} disabled={!yearOk} onClick={() => save({ nextChapter: { gradYear: f.gradYear ? Number(f.gradYear) : undefined, city: f.city, company: f.company, role: f.role, industry: f.industry } }, en ? 'Saved' : '저장했어요')} />}>
      <div className="space-y-5">
        <FormField label={en ? 'Graduation year' : '졸업 연도'}><TextInput inputMode="numeric" value={f.gradYear} onChange={set('gradYear')} placeholder={opt} /></FormField>
        <FormField label={en ? 'City' : '도시'}><TextInput value={f.city} maxLength={60} onChange={set('city')} placeholder={en ? 'Your city' : '사는 도시'} /></FormField>
        <FormField label={en ? 'Company' : '회사'}><TextInput value={f.company} maxLength={80} onChange={set('company')} placeholder={opt} /></FormField>
        <FormField label={en ? 'Role' : '하는 일'}><TextInput value={f.role} maxLength={80} onChange={set('role')} placeholder={opt} /></FormField>
        <FormField label={en ? 'Industry' : '분야'}><TextInput value={f.industry} maxLength={60} onChange={set('industry')} placeholder={opt} /></FormField>
        <InfoNote>{en ? `Your friends, groups and activity history stay with you. Visible to: ${VIS_LABEL[extraVisibilityOf(me, 'nextChapter')] ?? 'My school'} (Discovery & privacy).` : `친구·그룹·활동 기록은 그대로예요. 보이는 사람: ${VIS_LABEL[extraVisibilityOf(me, 'nextChapter')] ?? '우리 학교'}`}</InfoNote>
      </div>
    </SubScreen>
  );
}
