import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Check, Plus, Users, X } from 'lucide-react';
import { lang } from '@core/i18n';
import type { ActivityCategory, User } from '@core/types';
import { api } from '@core/api';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { friendsOf } from '@core/lib/relations';
import { todayISO } from '@core/lib/format';
import { nowMin, toHHMM } from '@core/lib/timetable';
import { POLL_DURATIONS, addDaysTo, mondayOf, weekGridOptions } from '@core/lib/pollgrid';
import { BottomSheet, Avatar } from '@/components/ui';
import { BackHeader, PageTitle, BottomCTA, Btn, Chip, ChipRow, FormField, TextInput, SelectField, InfoNote, cardCls } from '@/components/ha';
import { rangeLabel } from '@/pages/schedule/ScheduleTab';
import { clearDraft, loadDraft, saveDraft, type MeetingDraft } from './meetingDraft';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
const durationLabel = (m: number) => (en ? (m === 30 ? '30 min' : m === 60 ? '1 hour' : `${m / 60} hours`) : m === 30 ? '30분' : `${m / 60}시간`);
const nowLocal = () => `${todayISO()}T${toHHMM(nowMin())}`;

/** 고를 수 있는 주 — 이번 주(평일이 남았을 때)부터 3주 뒤까지 */
function weekChoices(): { start: string; label: string }[] {
  const mon = mondayOf(todayISO());
  return [0, 1, 2, 3].map((i) => addDaysTo(mon, i * 7))
    .filter((w) => weekGridOptions(w, 30, nowLocal()).length > 0)
    .map((w) => ({ start: w, label: w === mon ? `${en ? 'This week' : '이번 주'} · ${rangeLabel(w)}` : w === addDaysTo(mon, 7) ? `${en ? 'Next week' : '다음 주'} · ${rangeLabel(w)}` : rangeLabel(w) }));
}

/**
 * Create a meeting (PDF S032) — 제목, 같이 할 사람(Group), 어느 주(Date range), 길이(Duration), 장소 아이디어 → Set Up Poll.
 * 후보 시간은 그 주 평일 9~18시 한 시간 칸 전부 — 누가 언제 되는지는 각자 고른 표로만 정한다 (시간표로 자동으로 고르지 않는다).
 * 장소 아이디어는 Location Ideas(S033, /schedule/meeting/new/places)에서 고르고, 초안은 sessionStorage 로 오간다.
 */
export function CreateTogetherPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const rosters = useAppStore((s) => s.classRosters);
  const me = v.me;
  const weeks = useMemo(weekChoices, []);
  // 다른 화면에서 사람·제목을 들고 왔으면(?invite= ?title=) 그것부터, 아니면 Location Ideas 에서 돌아온 초안
  const [d, setD] = useState<MeetingDraft>(() => (!params.has('invite') && !params.has('title') && loadDraft()) || {
    title: params.get('title') ?? '', category: (params.get('cat') as ActivityCategory) || 'study',
    inviteeIds: (params.get('invite') ?? '').split(',').filter((id) => id && id !== me.id && v.userById(id)),
    weekStart: weeks[0]?.start ?? '', minutes: 60, places: [],
  });
  const [who, setWho] = useState(false);
  const [when, setWhen] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = (p: Partial<MeetingDraft>) => setD((x) => { const n = { ...x, ...p }; saveDraft(n); return n; });

  // 고를 수 있는 사람: 친구 + 내 수업의 같은 수업 학생(서버가 보낸 명단 — 보이기를 켠 인증 학생만)
  const friends = useMemo(() => friendsOf(v.snap, me.id).map((id) => v.userById(id)).filter((u): u is User => !!u && !u.sample), [v, me.id]);
  const classGroups = useMemo(() => (rosters ?? []).filter((r) => !r.hidden && !r.unverified && r.members.length)
    .map((r) => ({ code: r.code, people: r.members.map((m) => v.userById(m.userId)).filter((u): u is User => !!u && !u.sample) }))
    .filter((g) => g.people.length), [rosters, v]);
  const chosen = d.inviteeIds.map((id) => v.userById(id)).filter((u): u is User => !!u);
  const whoLabel = chosen.length ? `${chosen.slice(0, 2).map((u) => u.nickname).join(', ')}${chosen.length > 2 ? ` +${chosen.length - 2}` : ''}` : '';
  const week = weeks.find((w) => w.start === d.weekStart);
  const valid = d.title.trim().length >= 2 && d.inviteeIds.length > 0 && !!week;
  const toggle = (id: string) => update({ inviteeIds: d.inviteeIds.includes(id) ? d.inviteeIds.filter((x) => x !== id) : [...d.inviteeIds, id] });

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const options = weekGridOptions(d.weekStart, d.minutes, nowLocal());
      // 그 주 금요일 저녁까지 표를 받는다 (주최자는 그 전에 언제든 확정할 수 있다)
      const closesAt = new Date(`${addDaysTo(d.weekStart, 4)}T18:00:00`).toISOString();
      const res = await run(() => api.together.create(me.id, { title: d.title.trim().slice(0, 60), category: d.category, inviteeIds: d.inviteeIds, options, closesAt, placeOptions: d.places, window: { weekStart: d.weekStart, minutes: d.minutes } }),
        en ? 'Poll sent. Mark your own times too.' : '투표를 보냈어요. 내 시간도 골라 주세요.');
      clearDraft();
      nav(`/together/${res.poll.id}`, { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Create a meeting' : '약속 만들기'} onBack={() => { clearDraft(); nav(-1); }} />
      <PageTitle title={en ? 'Create a meeting' : '약속 만들기'} />
      <div className="px-4 pb-6 space-y-5 flex-1">
        <FormField label={en ? 'Title' : '제목'}><TextInput value={d.title} onChange={(e) => update({ title: e.target.value })} placeholder={en ? 'Group project catch-up' : '예: 조별과제 회의'} maxLength={60} /></FormField>
        <FormField label={en ? 'Group' : '같이 할 사람'}><SelectField icon={<Users size={18} />} value={whoLabel} placeholder={en ? 'Choose people' : '사람 고르기'} onClick={() => setWho(true)} /></FormField>
        <FormField label={en ? 'Date range' : '언제쯤'}><SelectField icon={<CalendarDays size={18} />} value={week?.label ?? ''} placeholder={en ? 'Choose a week' : '주 고르기'} onClick={() => setWhen(true)} /></FormField>
        <div>
          <div className="text-[13px] font-semibold text-ink mb-2">{en ? 'Duration' : '길이'}</div>
          <ChipRow wrap>{POLL_DURATIONS.map((m) => <Chip key={m} size="sm" active={d.minutes === m} onClick={() => update({ minutes: m })}>{durationLabel(m)}</Chip>)}</ChipRow>
        </div>
        <div>
          <h2 className="ha-h2">{en ? 'Location ideas' : '장소 아이디어'}</h2>
          <p className="text-[13.5px] text-ink-3 mt-1">{en ? 'Suggest places for your group.' : '같이 고를 장소를 올려 두세요.'}</p>
          {d.places.length > 0 && (
            <ChipRow wrap className="mt-3">
              {d.places.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 h-8 pl-3 pr-1.5 rounded-full border bg-sel-soft border-sel-line text-sel-fg text-[12px] font-semibold">
                  {p}<button onClick={() => update({ places: d.places.filter((x) => x !== p) })} aria-label={en ? `Remove ${p}` : `${p} 빼기`} className="h-6 w-6 grid place-items-center rounded-full press"><X size={13} /></button>
                </span>
              ))}
            </ChipRow>
          )}
          <Btn variant="outline" size="sm" icon={<Plus size={16} />} className="mt-3" onClick={() => { saveDraft(d); nav('/schedule/meeting/new/places'); }}>{en ? 'Add Ideas' : '아이디어 추가'}</Btn>
        </div>
        <InfoNote>{en ? 'Everyone marks the times that work for them. You confirm the plan from their answers.' : '각자 되는 시간을 고르고, 주최자가 그 답을 보고 확정해요.'}</InfoNote>
      </div>
      <BottomCTA><Btn full size="lg" disabled={!valid} loading={busy} onClick={submit}>{en ? 'Set Up Poll' : '투표 만들기'}</Btn></BottomCTA>

      <BottomSheet open={who} onClose={() => setWho(false)} title={en ? 'Who’s in?' : '누구와?'} tall>
        <div className="space-y-5 pb-2">
          {friends.length > 0 && <PeopleList title={en ? 'Friends' : '친구'} people={friends} picked={d.inviteeIds} onToggle={toggle} />}
          {classGroups.map((g) => <PeopleList key={g.code} title={en ? `${g.code} classmates` : `${g.code} 같은 수업`} people={g.people} picked={d.inviteeIds} onToggle={toggle} />)}
          {!friends.length && !classGroups.length && <p className="text-[13.5px] text-ink-2">{en ? 'Add friends or classes first — then you can invite them here.' : '친구나 수업을 먼저 추가하면 여기서 초대할 수 있어요.'}</p>}
          <Btn full onClick={() => setWho(false)}>{en ? `Done${d.inviteeIds.length ? ` · ${d.inviteeIds.length}` : ''}` : `완료${d.inviteeIds.length ? ` · ${d.inviteeIds.length}명` : ''}`}</Btn>
        </div>
      </BottomSheet>
      <BottomSheet open={when} onClose={() => setWhen(false)} title={en ? 'Choose a week' : '주 고르기'}>
        <div className="divide-y divide-line">
          {weeks.map((w) => (
            <button key={w.start} onClick={() => { update({ weekStart: w.start }); setWhen(false); }} className="w-full flex items-center gap-3 py-3.5 text-left press">
              <span className={cn('flex-1 text-[15px]', d.weekStart === w.start ? 'text-sel-fg font-semibold' : 'text-ink')}>{w.label}</span>
              {d.weekStart === w.start && <Check size={17} className="text-sel-fg" />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

function PeopleList({ title, people, picked, onToggle }: { title: string; people: User[]; picked: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <div className="text-[12.5px] font-bold text-ink-2 mb-1.5">{title}</div>
      <div className={cn(cardCls, 'divide-y divide-line max-h-64 overflow-y-auto')}>
        {people.map((u) => {
          const on = picked.includes(u.id);
          return (
            <button key={u.id} onClick={() => onToggle(u.id)} aria-pressed={on} className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left press', on && 'bg-sel-soft')}>
              <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={32} />
              <span className={cn('flex-1 text-[14.5px] font-semibold truncate', on && 'text-sel-fg')}>{u.nickname}</span>
              <span className={cn('h-5 w-5 rounded-full border grid place-items-center', on ? 'bg-sel border-sel text-on-primary' : 'border-line')}>{on && <Check size={12} strokeWidth={3} />}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
