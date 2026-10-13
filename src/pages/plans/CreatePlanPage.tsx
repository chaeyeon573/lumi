import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, Clock, MapPin } from 'lucide-react';
import { lang } from '@core/i18n';
import type { PlanMode, TimeOption } from '@core/types';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Field, Input, Textarea, Segmented } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { PLACE_PRESETS } from '@core/data/places';
import { PLAN_LIMITS, whenLabel } from '@core/lib/plans';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
type Opt = Omit<TimeOption, 'id'>;
const key = (o: Opt) => `${o.date}_${o.startTime}_${o.endTime}`;
const EMOJIS = ['🧋', '☕', '🍜', '🍕', '🌮', '📚', '🏃', '🎬', '🎉', '🎮', '🎤', '🏖️'];

/** 이 기기 기준 n일 뒤 날짜 (UTC 로 바꾸면 밤에 하루가 밀린다) */
function localDay(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** 시작을 바꾸면 끝을 1시간 뒤로 맞춘다 (끝이 시작보다 빠를 때만) */
function plusHour(hhmm: string) { const [h, m] = hhmm.split(':').map(Number); return `${String(Math.min(23, h + 1)).padStart(2, '0')}:${h + 1 > 23 ? '59' : String(m).padStart(2, '0')}`; }

/** 시간 하나 고르기 — 날짜 · 시작 · 끝 */
function TimeInputs({ value, onChange }: { value: Opt; onChange: (o: Opt) => void }) {
  return (
    <div className="space-y-1.5">
      <Input type="date" aria-label={en ? 'Date' : '날짜'} value={value.date} min={localDay(0)} onChange={(e) => onChange({ ...value, date: e.target.value })} />
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-1.5 items-center">
        <Input type="time" aria-label={en ? 'Starts' : '시작'} value={value.startTime} onChange={(e) => onChange({ ...value, startTime: e.target.value, endTime: value.endTime > e.target.value ? value.endTime : plusHour(e.target.value) })} className="min-w-0" />
        <span className="text-[13px] text-ink-3">{en ? 'to' : '~'}</span>
        <Input type="time" aria-label={en ? 'Ends' : '끝'} value={value.endTime} onChange={(e) => onChange({ ...value, endTime: e.target.value })} className="min-w-0" />
      </div>
    </div>
  );
}

/** 친구에게 링크로 묻는 약속 만들기 — 내가 시간을 정하거나(Going/Maybe/Can't), 후보 시간을 주고 같이 정한다 */
export function CreatePlanPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const schoolId = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const presets = (PLACE_PRESETS[schoolId] ?? PLACE_PRESETS[en ? 's_berkeley' : 's_yonsei'] ?? []).slice(0, 5);
  const [mode, setMode] = useState<PlanMode>(params.get('mode') === 'fixed' ? 'fixed' : 'vote');
  const [emoji, setEmoji] = useState('🧋');
  const [title, setTitle] = useState(params.get('title') ?? '');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [when, setWhen] = useState<Opt>({ date: localDay(1), startTime: '18:00', endTime: '19:00' });
  const [options, setOptions] = useState<Opt[]>([]);
  const [draft, setDraft] = useState<Opt>({ date: localDay(1), startTime: '18:00', endTime: '19:00' });
  const [pickPlace, setPickPlace] = useState(false);
  const [places, setPlaces] = useState<string[]>([]);
  const [placeDraft, setPlaceDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const draftOk = draft.date && draft.startTime < draft.endTime && !options.some((o) => key(o) === key(draft)) && options.length < PLAN_LIMITS.maxOptions;
  const addDraft = () => {
    if (!draftOk) return;
    setOptions((os) => [...os, draft].sort((a, b) => key(a).localeCompare(key(b))));
    // 다음 후보는 하루 뒤 같은 시간으로 미리 채운다
    const d = new Date(`${draft.date}T12:00:00`); d.setDate(d.getDate() + 1);
    setDraft({ ...draft, date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` });
  };
  const addPlace = () => { const p = placeDraft.trim(); if (p && !places.includes(p) && places.length < PLAN_LIMITS.maxPlaces) setPlaces([...places, p]); setPlaceDraft(''); };
  const usePlaceOptions = mode === 'vote' && pickPlace;
  const valid = title.trim().length >= 2 && (mode === 'fixed' ? when.startTime < when.endTime && !!when.date : options.length >= PLAN_LIMITS.minVoteOptions);

  const submit = async () => {
    setBusy(true);
    try {
      const preset = presets.find((p) => p.name === place.trim());
      const res = await run(() => api.plans.create(me.id, {
        title: title.trim(), emoji, note: note.trim() || undefined, mode,
        place: !usePlaceOptions && place.trim() ? (preset ?? { name: place.trim(), lat: 0, lng: 0 }) : undefined,
        placeOptions: usePlaceOptions ? places : undefined,
        options: mode === 'fixed' ? [when] : options,
      }));
      nav(`/p/${res.poll.id}?new=1`, { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title={en ? 'Ask friends' : '친구에게 묻기'} />
      <div className="px-4 py-4 space-y-5">
        <p className="text-[13px] text-ink-2 rounded-2xl bg-primary-soft v2:bg-surface-2 v2:text-ink-2 px-3.5 py-2.5">
          {en ? 'Make a plan, send one link. Friends answer without the app — they just type a first name.' : '약속을 만들고 링크 하나만 보내세요. 친구는 앱 없이 이름만 적고 답해요.'}
        </p>

        <Segmented<PlanMode> value={mode} onChange={setMode} options={[{ value: 'fixed', label: en ? 'I set the time' : '시간 정해서' }, { value: 'vote', label: en ? 'Decide together' : '같이 정하기' }]} />

        <Field label={en ? 'What' : '무엇을'} required>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setEmoji(e)} aria-label={e} aria-pressed={emoji === e}
                className={cn('h-10 w-10 shrink-0 rounded-xl text-[20px] grid place-items-center press border', emoji === e ? 'border-primary bg-primary-soft v2:bg-lime-900 v2:border-lime-800' : 'border-transparent bg-surface-2')}>{e}</button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="h-11 w-11 shrink-0 rounded-2xl bg-surface-2 grid place-items-center text-[22px]" aria-hidden>{emoji}</span>
            <Input placeholder={en ? 'Boba after midterms' : '예: 시험 끝나고 버블티'} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={PLAN_LIMITS.titleMax} />
          </div>
        </Field>

        {mode === 'fixed' ? (
          <Field label={en ? 'When' : '언제'} required hint={en ? 'Friends answer Going, Maybe or Can’t.' : '친구들은 갈게요 / 아마도 / 못 가요로 답해요.'}>
            <TimeInputs value={when} onChange={setWhen} />
          </Field>
        ) : (
          <Field label={en ? 'Times to pick from' : '후보 시간'} required hint={en ? `Add ${PLAN_LIMITS.minVoteOptions}–${PLAN_LIMITS.maxOptions} times. Friends tap every one that works; you lock the final time.` : `${PLAN_LIMITS.minVoteOptions}~${PLAN_LIMITS.maxOptions}개. 친구들이 되는 시간을 모두 고르면 내가 확정해요.`}>
            {options.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {options.map((o) => (
                  <div key={key(o)} className="flex items-center gap-2 rounded-2xl px-3.5 h-11 text-[14px] border border-line bg-surface">
                    <Clock size={15} className="text-ink-3" /><span className="flex-1 text-ink font-medium">{whenLabel(o)}</span>
                    <button type="button" onClick={() => setOptions((os) => os.filter((x) => key(x) !== key(o)))} aria-label={en ? 'Remove' : '삭제'} className="h-8 w-8 grid place-items-center text-ink-3"><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
            {options.length < PLAN_LIMITS.maxOptions && (
              <div className="rounded-2xl bg-surface-2 p-2.5 space-y-2">
                <TimeInputs value={draft} onChange={setDraft} />
                <Button full variant="outline" icon={<Plus size={16} />} disabled={!draftOk} onClick={addDraft}>{options.length ? (en ? 'Add another time' : '시간 더 넣기') : (en ? 'Add this time' : '이 시간 넣기')}</Button>
              </div>
            )}
          </Field>
        )}

        <Field label={en ? 'Where (optional)' : '어디서 (선택)'} right={mode === 'vote' ? <button type="button" onClick={() => setPickPlace(!pickPlace)} className="text-[12px] font-semibold text-primary">{pickPlace ? (en ? 'One place' : '장소 하나') : (en ? 'Let them pick a place' : '장소도 같이 고르기')}</button> : undefined}>
          {usePlaceOptions ? (
            <div className="space-y-1.5">
              {places.map((p) => (
                <div key={p} className="flex items-center gap-2 rounded-2xl px-3.5 h-11 text-[14px] border border-line bg-surface"><MapPin size={15} className="text-ink-3" /><span className="flex-1 text-ink">{p}</span><button type="button" onClick={() => setPlaces(places.filter((x) => x !== p))} aria-label={en ? 'Remove' : '삭제'} className="h-8 w-8 grid place-items-center text-ink-3"><X size={16} /></button></div>
              ))}
              {places.length < PLAN_LIMITS.maxPlaces && (
                <div className="flex gap-1.5"><Input placeholder={en ? 'Add a place' : '장소 추가'} value={placeDraft} maxLength={PLAN_LIMITS.placeMax} onChange={(e) => setPlaceDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPlace(); } }} /><Button variant="outline" icon={<Plus size={16} />} disabled={!placeDraft.trim()} onClick={addPlace} aria-label={en ? 'Add place' : '장소 추가'} /></div>
              )}
              <p className="text-[12px] text-ink-3">{en ? `Up to ${PLAN_LIMITS.maxPlaces} places — friends tap the ones they like.` : `${PLAN_LIMITS.maxPlaces}곳까지 — 친구들이 좋은 곳을 골라요.`}</p>
            </div>
          ) : (
            <>
              <Input placeholder={en ? 'Asha Tea House' : '예: 학생회관 카페'} value={place} maxLength={PLAN_LIMITS.placeMax} onChange={(e) => setPlace(e.target.value)} />
              {presets.length > 0 && <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 mt-2">{presets.map((p) => <Chip key={p.name} size="sm" active={place === p.name} onClick={() => setPlace(place === p.name ? '' : p.name)}>{p.name}</Chip>)}</div>}
            </>
          )}
        </Field>

        <Field label={en ? 'Note (optional)' : '메모 (선택)'}>
          <Textarea placeholder={en ? 'Celebrating the end of midterms. My treat for the first round!' : '예: 시험 끝 기념!'} value={note} maxLength={PLAN_LIMITS.noteMax} onChange={(e) => setNote(e.target.value)} className="min-h-[72px]" />
        </Field>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" disabled={!valid} loading={busy} onClick={submit}>
          {mode === 'vote' && options.length < PLAN_LIMITS.minVoteOptions ? (en ? `Add ${PLAN_LIMITS.minVoteOptions - options.length} more time${PLAN_LIMITS.minVoteOptions - options.length > 1 ? 's' : ''}` : `후보 시간 ${PLAN_LIMITS.minVoteOptions - options.length}개 더`) : (en ? 'Create link' : '링크 만들기')}
        </Button>
      </div>
    </div>
  );
}
