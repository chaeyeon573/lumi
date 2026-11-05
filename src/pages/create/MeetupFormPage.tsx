import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Zap, Trash2 } from 'lucide-react';
import { lang } from '@core/i18n';
import type { ActivityInput } from '@core/api';
import type { Activity, Place, UniversityRole } from '@core/types';
import { api } from '@core/api';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { BottomSheet, Dialog } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import {
  BackHeader, PageTitle, BottomCTA, Btn, Chip, ChipRow, FormField, TextInput, TextArea, InfoNote, RowCard, Switch, EmptyState,
} from '@/components/ha';
import { PLACE_PRESETS } from '@core/data/places';
import { CATEGORY_EMOJI } from '@core/lib/labels';
import { friendsOf } from '@core/lib/relations';
import { addDaysISO, todayISO } from '@core/lib/format';
import { nowMin, toHHMM, toMin } from '@core/lib/timetable';
import { AUDIENCE_ROLES, NO_LIMIT, approvedOf, myGroups, reachInput, reachOf, reachReady, type MeetupReach } from '@core/lib/meetups';
import { KINDS, kindByKey, kindOf, type MeetupKind } from '@/components/social/meetupKinds';

const en = lang === 'en';

const REACH: { key: MeetupReach; label: string }[] = [
  { key: 'campus', label: en ? 'Campus-wide' : '캠퍼스 전체' },
  { key: 'groups', label: en ? 'My verified groups' : '내 인증 그룹' },
  { key: 'class', label: en ? 'Class' : '수업' },
  { key: 'invite', label: en ? 'Invite only' : '초대만' },
];
const AUDIENCE_LABEL: Record<UniversityRole, string> = en
  ? { undergraduate: 'Undergraduate', graduate: 'Graduate', alumni: 'Alumni' }
  : { undergraduate: '학부생', graduate: '대학원생', alumni: '졸업생' };
const TITLE_HINT: Record<MeetupKind['key'], string> = en
  ? { coffee: 'Coffee after class', study: 'A little study company', workout: 'Morning run', lunch: 'Lunch between classes', hangout: 'Board games tonight' }
  : { coffee: '수업 끝나고 커피', study: '같이 공부해요', workout: '아침 달리기', lunch: '공강에 점심', hangout: '저녁에 보드게임' };

/**
 * 모임·활동 만들기와 수정 (PDF S045 Create a Meetup · S050 Create an activity · S047 Edit meetup).
 * Title · Date · Starts/Ends · Location · 공개 범위(캠퍼스 전체 / 내 인증 그룹 / 수업 / 초대만) · Capacity(선택) · 학적.
 * 지어내는 값 없이 — 정원을 비우면 '제한 없음', 설명을 비우면 빈 칸. 지난 시각으로는 열 수 없다.
 */
export function MeetupFormPage({ mode }: { mode: 'meetup' | 'activity' }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const orgs = useAppStore((s) => s.organizations);
  const schools = useAppStore((s) => s.schools);
  const parts = useAppStore((s) => s.participations);
  const editing = id ? v.visibleActivities.find((a) => a.id === id) : undefined;
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const presets = PLACE_PRESETS[schoolId] ?? [];
  const center = schools.find((s) => s.id === schoolId)?.center ?? presets[0] ?? { lat: 0, lng: 0 };
  const groups = useMemo(() => myGroups(orgs, v.me.id), [orgs, v.me.id]);
  const courses = useMemo(() => [...new Set(v.me.timetable.map((c) => c.name))], [v.me.timetable]);
  const friends = useMemo(() => friendsOf(v.snap, v.me.id).map((f) => v.userById(f)).filter((u): u is NonNullable<typeof u> => !!u), [v]);

  const [form, setForm] = useState(() => initialForm(editing, params, mode, presets, center));
  const [reach, setReach] = useState<MeetupReach | 'other'>(() => editing ? reachOf(editing) : (['groups', 'class'].includes(params.get('reach') ?? '') ? params.get('reach') as MeetupReach : 'campus'));
  const [groupIds, setGroupIds] = useState<string[]>(() => (editing?.visibilityTargets ?? []).filter((x) => x.startsWith('org:')).map((x) => x.slice(4)).concat(!editing && params.get('reach') === 'groups' && groups.length === 1 ? [groups[0].id] : []));
  const [course, setCourse] = useState(() => (editing?.visibilityTargets ?? []).find((x) => x.startsWith('course:'))?.slice(7) ?? (!editing && params.get('reach') === 'class' ? courses[0] ?? '' : ''));
  const [capText, setCapText] = useState(() => editing ? (editing.capacity >= NO_LIMIT ? '' : String(editing.capacity)) : params.get('cap') ?? '');
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const patch = (p: Partial<ActivityInput>) => setForm((f) => ({ ...f, ...p }));
  const k = kindOf(form);

  if (id && !editing) return <Blocked title={en ? 'Edit meetup' : '모임 수정'} text={en ? 'This meetup isn’t available anymore.' : '더 이상 볼 수 없는 모임이에요.'} />;
  if (editing && editing.hostId !== v.me.id) return <Blocked title={en ? 'Edit meetup' : '모임 수정'} text={en ? 'Only the host can edit this meetup.' : '주최자만 수정할 수 있어요.'} />;

  const pickReach = (r: MeetupReach) => {
    if (r === 'groups' && !groups.length) { showToast(en ? 'Join a group first — then you can plan just for it.' : '먼저 그룹에 가입해야 그룹 전용 모임을 열 수 있어요.'); return; }
    if (r === 'class' && !courses.length) { showToast(en ? 'Add your classes first.' : '먼저 수업을 추가해 주세요.'); return; }
    if (r === 'groups' && !groupIds.length && groups.length === 1) setGroupIds([groups[0].id]);
    if (r === 'class' && !course) setCourse(courses[0]);
    setReach(r);
  };
  const reachPatch = reach === 'other' ? { visibility: form.visibility, visibilityTargets: form.visibilityTargets ?? [], joinPolicy: form.joinPolicy }
    : reachInput(reach, { orgIds: groupIds, course, joinPolicy: form.joinPolicy });
  const cap = capText.trim() ? Math.max(1, Math.floor(Number(capText))) : NO_LIMIT;
  const approvedNow = editing ? approvedOf(parts, editing.id).length : 0;
  const past = !editing && (form.date < todayISO() || (form.date === todayISO() && toMin(form.startTime) < nowMin()));
  const problem = form.title.trim().length < 2 ? (en ? 'Add a title.' : '제목을 적어 주세요.')
    : !form.place.name.trim() ? (en ? 'Add a place — a general area is fine.' : '장소를 적어 주세요 — 대략적인 곳이면 돼요.')
    : form.startTime >= form.endTime ? (en ? 'End after it starts.' : '끝나는 시각이 시작보다 뒤여야 해요.')
    : past ? (en ? 'That time has passed — pick a later time.' : '이미 지난 시각이에요.')
    : capText.trim() && !(Number(capText) >= 1) ? (en ? 'Capacity is a number of people.' : '인원은 숫자로 적어 주세요.')
    : editing && cap < approvedNow ? (en ? `${approvedNow} people have joined — capacity can’t be lower.` : `이미 ${approvedNow}명이 참가했어요.`)
    : reach !== 'other' && !reachReady(reach, reachPatch) ? (reach === 'groups' ? (en ? 'Pick at least one group.' : '그룹을 골라 주세요.') : (en ? 'Pick a class.' : '수업을 골라 주세요.'))
    : '';

  const submit = async () => {
    if (problem) { showToast(problem, 'error'); return; }
    setBusy(true);
    const input: ActivityInput = { ...form, ...reachPatch, title: form.title.trim(), description: form.description.trim(), capacity: cap, place: { ...form.place, name: form.place.name.trim() },
      invitedIds: reachPatch.joinPolicy === 'invite' || (form.invitedIds ?? []).length ? form.invitedIds : [] };
    try {
      if (editing) {
        await run(() => api.activities.update(editing.id, input), en ? 'Changes saved.' : '수정했어요.');
        nav(`/activities/${editing.id}`, { replace: true });
      } else {
        const res = await run(() => api.activities.create(v.me.id, input), mode === 'meetup' ? (en ? 'Meetup created.' : '모임을 만들었어요.') : (en ? 'Activity published.' : '활동을 올렸어요.'));
        nav(`/activities/${res.activity.id}`, { replace: true });
      }
    } catch { setBusy(false); }
  };
  const remove = async () => {
    if (!editing) return;
    setConfirm(false);
    try { await run(() => api.activities.remove(editing.id), en ? 'Meetup deleted.' : '모임을 삭제했어요.'); nav('/social/meetups', { replace: true }); } catch { /* toast */ }
  };

  const title = editing ? (en ? 'Edit meetup' : '모임 수정') : mode === 'meetup' ? (en ? 'Create a Meetup' : '모임 만들기') : (en ? 'Create an activity' : '활동 만들기');
  const invitee = !editing && params.get('invite') ? v.userById(params.get('invite')!) : undefined;
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={title} onMore={editing ? () => setMenu(true) : undefined} />
      <PageTitle title={title} className="pb-2" />
      <div className="px-4 pb-6 space-y-5">
        {!editing && mode === 'meetup' && (
          <RowCard tone="sel" icon={<Zap size={20} />} title={en ? 'In the next hour?' : '지금 바로?'} sub={en ? 'Quick meetup — what, when, where' : '즉석 모임 — 무엇·언제·어디만'} onClick={() => nav('/meetups/new?quick=1', { replace: true })} />
        )}
        <ChipRow>{KINDS.map((x) => <Chip key={x.key} active={k.key === x.key} icon={<x.Icon size={15} />} onClick={() => patch({ category: x.cat, cover: { ...form.cover, emoji: CATEGORY_EMOJI[x.cat] } })}>{x.label}</Chip>)}</ChipRow>
        <FormField label={en ? 'Title' : '제목'}><TextInput value={form.title} maxLength={60} placeholder={TITLE_HINT[k.key]} onChange={(e) => patch({ title: e.target.value })} /></FormField>
        <FormField label={en ? 'Date' : '날짜'}><TextInput type="date" icon={<CalendarDays size={18} />} min={editing ? undefined : todayISO()} value={form.date} onChange={(e) => patch({ date: e.target.value })} aria-label={en ? 'Choose a day' : '날짜'} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={en ? 'Starts' : '시작'}><TextInput type="time" icon={<Clock size={18} />} value={form.startTime} onChange={(e) => patch({ startTime: e.target.value })} /></FormField>
          <FormField label={en ? 'Ends' : '끝'}><TextInput type="time" icon={<Clock size={18} />} value={form.endTime} onChange={(e) => patch({ endTime: e.target.value })} /></FormField>
        </div>
        <FormField label={en ? 'Location' : '장소'} hint={en ? 'Only this place is shown — never anyone’s live location.' : '이 장소만 보여요 — 누구의 실시간 위치도 아니에요.'}>
          <TextInput icon={<MapPin size={18} />} value={form.place.name} maxLength={60} placeholder={en ? 'Café, library, online…' : '카페, 도서관, 온라인…'}
            onChange={(e) => { const name = e.target.value; const hit = presets.find((p) => p.name.toLowerCase() === name.trim().toLowerCase()); patch({ place: hit ?? { name, lat: center.lat, lng: center.lng, area: en ? 'Campus area' : '캠퍼스 근처' } }); }} />
          {presets.length > 0 && <ChipRow className="mt-2.5">{presets.map((p) => <Chip key={p.name} size="sm" active={form.place.name === p.name} onClick={() => patch({ place: p })}>{p.name}</Chip>)}</ChipRow>}
        </FormField>

        <div>
          <ChipRow wrap>{REACH.map((r) => <Chip key={r.key} size="sm" active={reach === r.key} onClick={() => pickReach(r.key)}>{r.label}</Chip>)}</ChipRow>
          {reach === 'groups' && <ChipRow wrap className="mt-2.5">{groups.map((o) => <Chip key={o.id} size="sm" active={groupIds.includes(o.id)} onClick={() => setGroupIds(groupIds.includes(o.id) ? groupIds.filter((x) => x !== o.id) : [...groupIds, o.id])}>{o.name}</Chip>)}</ChipRow>}
          {reach === 'class' && <ChipRow wrap className="mt-2.5">{courses.map((c) => <Chip key={c} size="sm" active={course === c} onClick={() => setCourse(c)}>{c}</Chip>)}</ChipRow>}
          {reach === 'invite' && (friends.length
            ? <ChipRow wrap className="mt-2.5">{friends.map((f) => <Chip key={f.id} size="sm" active={(form.invitedIds ?? []).includes(f.id)} onClick={() => patch({ invitedIds: (form.invitedIds ?? []).includes(f.id) ? (form.invitedIds ?? []).filter((x) => x !== f.id) : [...(form.invitedIds ?? []), f.id] })}>{f.nickname}</Chip>)}</ChipRow>
            : <p className="text-[12.5px] text-ink-3 mt-2">{en ? 'No friends here yet — share the meetup link after you create it.' : '아직 친구가 없어요 — 만든 뒤 링크를 보내 주세요.'}</p>)}
          {reach === 'other' && <p className="text-[12.5px] text-ink-3 mt-2">{en ? 'Kept as it was set up. Pick one above to change who sees it.' : '처음 정한 공개 범위 그대로예요. 바꾸려면 위에서 고르세요.'}</p>}
        </div>

        <FormField label={en ? 'Capacity' : '인원'}><TextInput type="number" inputMode="numeric" min={1} value={capText} placeholder={en ? 'Optional' : '선택'} onChange={(e) => setCapText(e.target.value)} /></FormField>
        <ChipRow wrap>
          <Chip size="sm" active={!form.audience} onClick={() => patch({ audience: undefined })}>{en ? 'All statuses' : '모든 학적'}</Chip>
          {AUDIENCE_ROLES.map((r) => <Chip key={r} size="sm" active={form.audience === r} onClick={() => patch({ audience: r })}>{AUDIENCE_LABEL[r]}</Chip>)}
        </ChipRow>
        {reachPatch.joinPolicy !== 'invite' && (
          <div className="flex items-center gap-3">
            <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold">{en ? 'Approve who joins' : '참가 승인'}</span><span className="block text-[12.5px] text-ink-3">{en ? 'People send a request; you say yes.' : '참가 요청을 받고 직접 승인해요.'}</span></span>
            <Switch checked={form.joinPolicy === 'approval'} onChange={(on) => patch({ joinPolicy: on ? 'approval' : 'open' })} label={en ? 'Approve who joins' : '참가 승인'} />
          </div>
        )}
        <FormField label={en ? 'Details (optional)' : '설명 (선택)'}><TextArea value={form.description} maxLength={500} placeholder={en ? 'Bring yourself and a good conversation.' : '편하게 와요.'} onChange={(e) => patch({ description: e.target.value })} className="min-h-[80px]" /></FormField>
        {invitee && <InfoNote>{en ? `${invitee.nickname} joins right away.` : `${invitee.nickname}님이 바로 참가해요.`}</InfoNote>}
        <InfoNote>{en ? 'Private groups require verified membership. Approval and waitlists remain separate.' : '그룹 전용은 회원만 봐요. 승인과 대기 명단은 따로예요.'}</InfoNote>
      </div>
      <BottomCTA>
        <Btn full size="lg" loading={busy} onClick={submit} className={problem ? 'opacity-60' : undefined}>
          {editing ? (en ? 'Save Changes' : '저장') : mode === 'meetup' ? (en ? 'Create Meetup' : '모임 만들기') : (en ? 'Publish Activity' : '활동 올리기')}
        </Btn>
      </BottomCTA>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={en ? 'Meetup' : '모임'}>
        <SheetItem icon={<Trash2 size={18} />} label={en ? 'Delete meetup' : '모임 삭제'} danger onClick={() => { setMenu(false); setConfirm(true); }} />
      </BottomSheet>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={en ? 'Delete this meetup?' : '모임을 삭제할까요?'} description={en ? 'People who joined and the group chat go too. This can’t be undone.' : '참가자와 그룹 채팅도 함께 사라져요. 되돌릴 수 없어요.'}>
        <Btn variant="outline" full onClick={() => setConfirm(false)}>{en ? 'Cancel' : '취소'}</Btn>
        <Btn variant="danger" full onClick={remove}>{en ? 'Delete' : '삭제'}</Btn>
      </Dialog>
    </div>
  );
}

function Blocked({ title, text }: { title: string; text: string }) {
  return <div className="min-h-full bg-bg"><BackHeader title={title} /><EmptyState icon={<CalendarDays size={30} />} title={text} /></div>;
}

/** 처음 값 — 수정이면 그 모임, 아니면 주소의 kind · cat · date · start · end · invite · title (다른 화면이 미리 채워 보낸다) */
function initialForm(a: Activity | undefined, q: URLSearchParams, mode: 'meetup' | 'activity', presets: Place[], center: { lat: number; lng: number }): ActivityInput {
  if (a) return { ...a, description: a.description ?? '' };
  const kind = kindByKey(q.get('kind')) ?? KINDS.find((x) => x.cats.includes(q.get('cat') as never)) ?? KINDS[0];
  const cat = (q.get('cat') && kind.cats.includes(q.get('cat') as never) ? q.get('cat') : kind.cat) as ActivityInput['category'];
  // 오늘 저녁이 이미 지났으면 내일 — 지난 시각이 기본으로 들어가지 않게
  const start = q.get('start') ?? '18:00';
  const date = q.get('date') ?? (nowMin() < 17 * 60 + 30 ? todayISO() : addDaysISO(1));
  const end = q.get('end') ?? toHHMM(Math.min(toMin(start) + 60, 23 * 60 + 30));
  const invite = q.get('invite');
  return {
    kind: mode === 'meetup' ? 'personal' : 'group', category: cat, title: (q.get('title') ?? '').slice(0, 60), description: '', cover: { emoji: CATEGORY_EMOJI[cat], hue: 30 },
    date, startTime: start, endTime: end, place: presets.find((x) => x.name === q.get('place')) ?? { name: '', lat: (presets[0] ?? center).lat, lng: (presets[0] ?? center).lng }, capacity: NO_LIMIT, fee: 0,
    joinPolicy: 'open', visibility: 'school', visibilityTargets: [], invitedIds: invite ? [invite] : [],
  };
}
