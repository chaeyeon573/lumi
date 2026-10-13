import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, Sparkles, Users, Clock } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { ActivityCategory, TimeOption } from '@core/types';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Field, Input, Avatar, Tag } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_CATEGORIES, CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORY_LABELS } from '@core/lib/labels';
import { PLACE_PRESETS } from '@core/data/places';
import { friendsOf } from '@core/lib/relations';
import { suggestOptions, optionLabel } from '@core/lib/together';
import { addDaysISO } from '@core/lib/format';
import { cn } from '@core/lib/cn';

type Opt = Omit<TimeOption, 'id'>;
const key = (o: Opt) => `${o.date}_${o.startTime}`;

/** Plan Together 만들기: 무엇 → 누구 → 언제(공강 겹침 자동 제안 + 직접 추가) → 마감 → 보내기 */
export function CreateTogetherPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const schoolId = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const presets = PLACE_PRESETS[schoolId] ?? PLACE_PRESETS[lang === 'en' ? 's_berkeley' : 's_yonsei'];
  const friends = useMemo(() => friendsOf(v.snap, me.id).map((id) => v.userById(id)!).filter(Boolean), [v, me.id]);
  const inviteParam = params.get('invite');
  const [category, setCategory] = useState<ActivityCategory>((params.get('cat') as ActivityCategory) || 'meal');
  const [title, setTitle] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [invitees, setInvitees] = useState<string[]>((inviteParam ?? '').split(',').filter((id) => id && v.userById(id)));
  const [options, setOptions] = useState<Opt[]>([]);
  const [custom, setCustom] = useState<Opt>({ date: addDaysISO(1), startTime: '18:00', endTime: '19:30' });
  const [hours, setHours] = useState(48);
  const [busy, setBusy] = useState(false);

  const people = [me, ...invitees.map((id) => v.userById(id)!).filter(Boolean)];
  const suggestions = useMemo(() => suggestOptions(people, (u) => u.id === me.id || v.canSeeField(u, 'timetable')), [people, v, me.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const withTT = people.filter((u) => u.timetable.length && (u.id === me.id || v.canSeeField(u, 'timetable'))).length;
  const chosen = new Set(options.map(key));
  const toggleOpt = (o: Opt) => setOptions((os) => chosen.has(key(o)) ? os.filter((x) => key(x) !== key(o)) : [...os, o]);
  const valid = title.trim().length >= 2 && invitees.length > 0 && options.length >= 2;

  const submit = async () => {
    setBusy(true);
    try {
      const place = presets.find((p) => p.name === placeName);
      const res = await run(() => api.together.create(me.id, { title: title.trim(), category, place, inviteeIds: invitees, options: [...options].sort((a, b) => key(a).localeCompare(key(b))), closesAt: new Date(Date.now() + hours * 3600000).toISOString() }), t('시간 투표를 보냈어요. 친구들이 고르면 알려드릴게요.'));
      nav(`/together/${res.poll.id}`, { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28">
      <TopBar back title="Plan Together" />
      <div className="px-4 py-4 space-y-5">
        <p className="text-[13px] text-ink-2 rounded-xl bg-primary-soft px-3.5 py-2.5">{t('시간을 못 정해서 못 만나는 일이 없게. 후보 시간을 보내면 각자 되는 시간에 표를 던지고, 가장 많이 겹치는 시간으로 확정해요.')}</p>
        <Field label={lang === 'en' ? 'What' : t('무엇을')} required>
          <div className="flex flex-wrap gap-1.5 mb-2">{ALL_CATEGORIES.filter((c) => !['school_event', 'store_deal', 'seminar', 'club'].includes(c)).map((c) => <Chip key={c} size="sm" color={CATEGORY_COLORS[c]} active={category === c} onClick={() => setCategory(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</Chip>)}</div>
          <Input placeholder={t('예: 시험 끝 기념 저녁')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
        </Field>
        <Field label={t('장소 (선택)')}><div className="flex flex-wrap gap-1.5">{presets.map((p) => <Chip key={p.name} size="sm" active={placeName === p.name} onClick={() => setPlaceName(placeName === p.name ? '' : p.name)}>{p.name}</Chip>)}</div></Field>
        <Field label={lang === 'en' ? 'Who' : t('누구와')} required hint={invitees.length ? `${invitees.length}${t('명 선택')}` : t('친구를 고르면 시간표 공강이 겹치는 시간을 제안해요.')}>
          <div className="flex flex-wrap gap-1.5">{friends.map((f) => <Chip key={f.id} size="sm" active={invitees.includes(f.id)} onClick={() => setInvitees((s) => s.includes(f.id) ? s.filter((x) => x !== f.id) : [...s, f.id])}><Avatar emoji={f.avatar.emoji} hue={f.avatar.hue} url={f.avatar.url} size={18} /> {f.nickname}</Chip>)}{friends.length === 0 && <span className="text-[12px] text-ink-3">{t('친구가 없어요')}</span>}</div>
        </Field>
        <Field label={t('언제 (후보 시간)')} required hint={t('2개 이상 골라주세요. 초대받은 사람이 되는 시간에 모두 표를 던져요.')}>
          {suggestions.length > 0 && (
            <div className="mb-2">
              <div className="text-[11px] font-bold text-mint flex items-center gap-1 mb-1.5"><Sparkles size={11} />{lang === 'en' ? `Suggested from ${withTT} timetables` : `시간표 ${withTT}개의 공강이 겹치는 시간`}</div>
              <div className="space-y-1.5">{suggestions.map((o) => (
                <button key={key(o)} type="button" onClick={() => toggleOpt(o)} className={cn('w-full flex items-center gap-2 rounded-xl px-3 h-11 text-[13px] border text-left press', chosen.has(key(o)) ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
                  <Clock size={14} className="text-ink-3" /><span className="flex-1">{optionLabel(o)}</span><Tag tone="mint" className="h-5"><Users size={10} /> {t('공강 겹침')}</Tag>
                  <span className={cn('h-4 w-4 rounded border-2 grid place-items-center', chosen.has(key(o)) ? 'border-primary bg-primary' : 'border-line')} />
                </button>
              ))}</div>
            </div>
          )}
          {options.filter((o) => !suggestions.some((s) => key(s) === key(o))).map((o) => (
            <div key={key(o)} className="flex items-center gap-2 rounded-xl px-3 h-11 text-[13px] border border-primary bg-primary-soft mb-1.5"><Clock size={14} className="text-ink-3" /><span className="flex-1">{optionLabel(o)}</span><button onClick={() => toggleOpt(o)} aria-label={t('삭제')}><X size={14} /></button></div>
          ))}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1.5 items-end mt-1">
            <Input type="date" value={custom.date} onChange={(e) => setCustom({ ...custom, date: e.target.value })} className="px-2" />
            <Input type="time" value={custom.startTime} onChange={(e) => setCustom({ ...custom, startTime: e.target.value })} className="px-2 w-[92px]" />
            <Input type="time" value={custom.endTime} onChange={(e) => setCustom({ ...custom, endTime: e.target.value })} className="px-2 w-[92px]" />
            <Button variant="secondary" icon={<Plus size={15} />} disabled={custom.startTime >= custom.endTime || chosen.has(key(custom))} onClick={() => { toggleOpt({ ...custom }); }} aria-label={t('추가')} />
          </div>
        </Field>
        <Field label={t('투표 마감')}><div className="flex gap-1.5">{[24, 48, 72].map((h) => <Chip key={h} size="sm" active={hours === h} onClick={() => setHours(h)}>{h}{t('시간')}</Chip>)}</div></Field>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" disabled={!valid} loading={busy} onClick={submit}>{lang === 'en' ? `Send to ${invitees.length || '…'}` : `${invitees.length || '…'}명에게 투표 보내기`}</Button>
      </div>
    </div>
  );
}
