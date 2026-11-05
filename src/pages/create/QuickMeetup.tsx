import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import type { Place } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { BackHeader, PageTitle, BottomCTA, Btn, Chip, ChipRow, FormField, TextInput, TextCard, InfoNote } from '@/components/ha';
import { QUICK_WHAT, quickEnd, quickPickOk, quickWhen, type QuickWhatKey, type QuickWhenKey } from '@core/lib/quickmeet';
import { nowMin, toHHMM, toMin } from '@core/lib/timetable';
import { addDaysISO, formatTime, todayISO } from '@core/lib/format';

const en = lang === 'en';
const CAPACITY = 4;

/**
 * 즉석 만남 — 무엇 · 언제 · 어디, 끝 (긴 활동 양식은 '활동 만들기'에 그대로). 기본값은 지금 근처, 지난 시각·밤늦은 시각은 없다
 * (@core/lib/quickmeet). 같은 학교 학생에게 보이고 최대 4명, 바로 참가 — 그룹 채팅이 열린다.
 */
export function QuickMeetup({ presets, inviteId }: { presets: Place[]; inviteId?: string | null }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const now = nowMin();
  const when0 = useMemo(() => quickWhen(now), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [what, setWhat] = useState<QuickWhatKey>(() => (now >= 10 * 60 + 30 && now <= 14 * 60 ? 'lunch' : 'coffee'));
  const [custom, setCustom] = useState('');
  const [when, setWhen] = useState<QuickWhenKey>(when0.initial);
  const [pickDay, setPickDay] = useState<0 | 1>(when0.pick.dayOffset);
  const [pickTime, setPickTime] = useState(toHHMM(when0.pick.start));
  const suggested = (k: QuickWhatKey) => presets.find((p) => p.name === QUICK_WHAT.find((w) => w.key === k)!.place) ?? presets[0];
  const [place, setPlace] = useState<Place>(() => suggested(what));
  const [placeTouched, setPlaceTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const w = QUICK_WHAT.find((x) => x.key === what)!;
  const label = (x: { en: string; ko: string }) => (en ? x.en : x.ko);

  const start = when === 'now' ? when0.now : when === 'in30' ? when0.in30 : toMin(pickTime);
  const dayOffset = when === 'pick' ? pickDay : 0;
  const ok = start != null && (when !== 'pick' || quickPickOk(pickDay, start, nowMin()));
  const name = custom.trim() || label(w);
  const title = en ? `${name} at ${place.name}` : `${place.name}에서 ${name}`;
  const whenText = start == null ? '' : `${dayOffset ? (en ? 'Tomorrow' : '내일') : (en ? 'Today' : '오늘')} ${formatTime(toHHMM(start))}`;

  const pickWhat = (k: QuickWhatKey) => { setWhat(k); if (!placeTouched) setPlace(suggested(k)); };
  const submit = async () => {
    if (!ok || start == null) return;
    setBusy(true);
    try {
      const res = await run(() => api.activities.create(v.me.id, {
        kind: 'personal', category: w.category, title: title.slice(0, 60),
        description: en ? `${name} — anyone's welcome. Join and say hi in the chat.` : `${name} — 누구나 환영. 참여하고 채팅에서 인사해요.`,
        cover: { emoji: w.emoji, hue: 30 }, date: dayOffset ? addDaysISO(1) : todayISO(), startTime: toHHMM(start), endTime: toHHMM(quickEnd(start, w.minutes)),
        place, capacity: CAPACITY, fee: 0, joinPolicy: 'open', visibility: 'school', visibilityTargets: [], invitedIds: inviteId ? [inviteId] : [], openSlot: true,
      }), en ? 'Posted — classmates who are free see it now.' : '열었어요 — 시간 되는 학생들에게 바로 보여요.');
      nav(`/activities/${res.activity.id}`, { replace: true });
    } catch { setBusy(false); }
  };
  // 긴 양식으로 — 지금 고른 것을 들고 간다 (제목·설명·인원·공개 범위를 직접 정하고 싶을 때)
  const more = () => {
    const q = new URLSearchParams({ cat: w.category, title: title.slice(0, 60), place: place.name, ...(start != null ? { date: dayOffset ? addDaysISO(1) : todayISO(), start: toHHMM(start), end: toHHMM(quickEnd(start, w.minutes)) } : {}), ...(inviteId ? { invite: inviteId } : {}) });
    nav(`/meetups/new?${q}`, { replace: true });
  };

  const whenChips: { key: QuickWhenKey; text: string; at: number | null }[] = [
    ...(when0.now != null ? [{ key: 'now' as const, text: en ? 'Now' : '지금', at: when0.now }] : []),
    ...(when0.in30 != null ? [{ key: 'in30' as const, text: en ? 'In 30 min' : '30분 뒤', at: when0.in30 }] : []),
    { key: 'pick', text: en ? 'Pick a time' : '시간 고르기', at: null },
  ];

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Quick meetup' : '즉석 모임'} />
      <PageTitle title={en ? 'Quick meetup' : '즉석 모임'} sub={en ? 'What, when, where — that’s it.' : '무엇·언제·어디만 정해요.'} className="pb-2" />
      <div className="px-4 pb-6 space-y-5">
        <FormField label={en ? 'What' : '무엇'}>
          <ChipRow wrap>{QUICK_WHAT.map((x) => <Chip key={x.key} active={what === x.key} onClick={() => pickWhat(x.key)}>{label(x)}</Chip>)}</ChipRow>
          <TextInput className="mt-2.5" maxLength={40} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={en ? 'Or type it (optional) — e.g. Boba run' : '직접 쓰기 (선택) — 예: 버블티'} />
        </FormField>
        <FormField label={en ? 'When' : '언제'}>
          <ChipRow wrap>{whenChips.map((c) => <Chip key={c.key} active={when === c.key} onClick={() => setWhen(c.key)}>{c.text}{c.at != null ? ` · ${formatTime(toHHMM(c.at))}` : ''}</Chip>)}</ChipRow>
          {when === 'pick' && (
            <div className="mt-2.5 flex gap-2 items-center">
              {([0, 1] as const).map((d) => <Chip key={d} size="sm" active={pickDay === d} onClick={() => setPickDay(d)}>{d ? (en ? 'Tomorrow' : '내일') : (en ? 'Today' : '오늘')}</Chip>)}
              <TextInput type="time" step={300} className="flex-1" value={pickTime} onChange={(e) => setPickTime(e.target.value)} aria-label={en ? 'Start time' : '시작 시각'} />
            </div>
          )}
          {when === 'pick' && !ok && <p className="text-[12.5px] text-danger mt-1.5">{en ? 'Pick a time later today (6 AM–11 PM), or tomorrow.' : '오늘 지금 이후(오전 6시~밤 11시)나 내일로 골라주세요.'}</p>}
          {when0.now == null && when0.in30 == null && <p className="text-[12.5px] text-ink-3 mt-1.5">{en ? 'Too late for right now — pick a time.' : '지금은 늦은 시간이라 시각을 골라주세요.'}</p>}
        </FormField>
        <FormField label={en ? 'Where' : '어디'}>
          <ChipRow wrap>{presets.map((p) => <Chip key={p.name} size="sm" active={place.name === p.name} onClick={() => { setPlace(p); setPlaceTouched(true); }}>{p.name}</Chip>)}</ChipRow>
        </FormField>
        <TextCard title={title}>{[whenText, en ? `Up to ${CAPACITY} people · group chat opens` : `최대 ${CAPACITY}명 · 그룹 채팅이 열려요`].filter(Boolean).join(' · ')}</TextCard>
        <InfoNote>{en ? 'Students at your school can see it and join. Only this place is shown.' : '같은 학교 학생에게 보이고 바로 참여해요. 이 장소만 보여요.'}</InfoNote>
        <div className="text-center"><Btn variant="link" size="sm" onClick={more}>{en ? 'More options' : '자세히 정하기'}</Btn></div>
      </div>
      <BottomCTA><Btn full size="lg" disabled={!ok} loading={busy} onClick={submit}>{en ? 'Post it' : '열기'}</Btn></BottomCTA>
    </div>
  );
}
