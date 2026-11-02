import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarPlus, Coffee } from 'lucide-react';
import type { ActivityCategory, Visibility } from '@core/types';
import { BottomSheet, Button, Chip, Avatar, VisibilityList, Tag } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { t, lang } from '@core/i18n';
import { DAY_LABELS, toHHMM, todayIdx } from '@core/lib/timetable';
import { slotSuggestions } from '@core/lib/social';
import { PLACE_PRESETS } from '@core/data/places';
import { addDaysISO } from '@core/lib/format';
import { CATEGORY_EMOJI } from '@core/lib/labels';

const OPTIONS: { key: ActivityCategory | 'unknown'; label: string; emoji: string }[] = [
  { key: 'meal', label: t('점심'), emoji: '🍱' }, { key: 'coffee', label: t('커피'), emoji: '☕' }, { key: 'study', label: t('공부'), emoji: '📚' },
  { key: 'etc', label: t('산책'), emoji: '🚶' }, { key: 'exercise', label: t('운동'), emoji: '🏃' }, { key: 'unknown', label: t('아직 모르겠어요'), emoji: '🤷' },
];

/** 공강 = 활동 생성 버튼. 공강을 누르면 무엇을 할지 고르고 바로 사람을 찾는다 */
export function OpenSlotSheet({ open, onClose, day, block }: { open: boolean; onClose: () => void; day: number; block: { start: number; end: number } | null }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const [cat, setCat] = useState<ActivityCategory | 'unknown' | null>(null);
  const [vis, setVis] = useState<Visibility>('friends');
  const [busy, setBusy] = useState(false);
  if (!block) return null;
  const snap = { ...v.snap, organizations: orgs };
  const sug = slotSuggestions(snap, v.me, v.visibleActivities, block, day, (u) => v.canSeeField(u, 'timetable'));
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const place = (PLACE_PRESETS[schoolId] ?? PLACE_PRESETS[lang === 'en' ? 's_berkeley' : 's_yonsei'])[0];
  const dayLabel = lang === 'en' ? DAY_LABELS[day] : `${DAY_LABELS[day]}요일`;
  const range = `${toHHMM(block.start)}–${toHHMM(Math.min(block.end, block.start + 120))}`;
  const dateISO = addDaysISO((day - todayIdx() + 7) % 7);

  const create = async () => {
    if (!cat || cat === 'unknown') return;
    setBusy(true);
    const label = OPTIONS.find((o) => o.key === cat)!.label;
    try {
      const res = await run(() => api.activities.create(v.me.id, {
        kind: 'personal', category: cat, title: lang === 'en' ? `${label} together, ${dayLabel} ${range}?` : `${dayLabel} ${range} 공강 · ${label} 같이 할 사람?`,
        description: lang === 'en' ? `I'm free ${range}. Anyone up for ${label.toLowerCase()}?` : `${range} 공강이에요. ${label} 같이 하실 분!`,
        cover: { emoji: CATEGORY_EMOJI[cat], hue: 30 }, date: dateISO, startTime: toHHMM(block.start), endTime: toHHMM(Math.min(block.end, block.start + 120)),
        place, capacity: 4, fee: 0, joinPolicy: 'open', visibility: vis, openSlot: true,
      }), t('공강을 열었어요. 시간이 맞는 사람에게 보여요.'));
      onClose(); nav(`/activities/${res.activity.id}`);
    } catch { /* toast */ } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`${dayLabel} ${toHHMM(block.start)}–${toHHMM(block.end)} ${t('공강')}`} tall>
      <p className="text-[14px] font-bold">{t('이 시간에 무엇을 하고 싶어요?')}</p>
      <div className="flex flex-wrap gap-2 mt-2">{OPTIONS.map((o) => <Chip key={o.key} active={cat === o.key} onClick={() => setCat(o.key)}>{o.emoji} {o.label}</Chip>)}</div>

      {(sug.people.length > 0 || sug.acts.length > 0) && (
        <div className="mt-4 rounded-2xl bg-surface-2 p-3.5">
          <b className="text-[13px] flex items-center gap-1.5"><Users size={14} className="text-primary" />{t('이 시간에 시간이 맞는 사람')}</b>
          <div className="mt-2 space-y-1.5">
            {sug.people.slice(0, 4).map((p) => (
              <button key={p.u.id} onClick={() => nav(`/users/${p.u.id}?propose=1`)} className="w-full flex items-center gap-2.5 text-left press">
                <Avatar emoji={p.u.avatar.emoji} hue={p.u.avatar.hue} url={p.u.avatar.url} size={30} />
                <span className="flex-1 min-w-0 text-[12px]"><b>{p.u.nickname}</b> · {p.status}{p.want && <span className="text-ink-3"> · {p.want}</span>}</span>
                <Tag className="h-5">{p.why}</Tag>
              </button>
            ))}
            {sug.acts.slice(0, 3).map((a) => (
              <button key={a.id} onClick={() => { onClose(); nav(`/activities/${a.id}`); }} className="w-full flex items-center gap-2.5 text-left press">
                <span className="h-[30px] w-[30px] rounded-lg bg-primary-soft grid place-items-center text-[15px]">{a.cover.emoji}</span>
                <span className="flex-1 min-w-0 text-[12px] truncate"><b>{a.title}</b> · {a.startTime} {a.place.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {cat && cat !== 'unknown' && (
        <div className="mt-4">
          <p className="text-[14px] font-bold mb-2">{t('같이 할 사람을 찾아볼까요? 누구에게 보일지 골라주세요.')}</p>
          <VisibilityList value={vis} options={['friends', 'department', 'school', 'public']} onChange={setVis} />
        </div>
      )}
      {cat === 'unknown' && <p className="mt-4 text-[13px] text-ink-2 rounded-xl bg-primary-soft px-3 py-2.5">{t('괜찮아요. 위 사람들에게 커피 한 잔 제안해보거나, 나중에 다시 열어보세요.')}</p>}
      <div className="flex gap-2 mt-4">
        <Button variant="outline" icon={<Coffee size={16} />} onClick={() => { onClose(); nav('/meet/more'); }}>{t("Who's free?")}</Button>
        <Button full icon={<CalendarPlus size={16} />} disabled={!cat || cat === 'unknown'} loading={busy} onClick={create}>{t('공강 열기')}</Button>
      </div>
    </BottomSheet>
  );
}
