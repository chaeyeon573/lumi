import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { t } from '@core/i18n';
import type { ActivityInput } from '@core/api';
import type { ActivityCategory, Visibility } from '@core/types';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Field, Input, Textarea, Select, Segmented, Toggle } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { stageKind } from '@core/lib/stage';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_CATEGORIES, CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORY_LABELS } from '@core/lib/labels';
import { myGroups } from '@core/lib/meet';
import { localeContext } from '@core/lib/locale-context';
import { cityOf } from '@core/lib/network';
import { todayISO } from '@core/lib/format';
import { MeetExtraRows } from './MeetExtras';

/** 모임이 다루는 공개 범위 4종 — 전체 / 내 학교 / 그룹 멤버 / 연결된 사람 */
type MeetVis = Extract<Visibility, 'public' | 'school' | 'group' | 'friends'>;
const CATS = ALL_CATEGORIES.filter((c) => c !== 'store_deal' && c !== 'school_event');
const HUE_OF: Record<ActivityCategory, number> = { coffee: 30, meal: 15, study: 220, exercise: 135, club: 285, performance: 320, school_event: 355, seminar: 175, networking: 235, store_deal: 50, etc: 200 };

/** /meet/create — 한 화면 폼. 모임은 시간 · 장소 · 참여자 · 최대 인원 · 공개 범위만 다룬다 (활동 종류는 선택) */
export function CreateMeetPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const schools = useAppStore((s) => s.schools);
  const groups = myGroups(orgs, v.me);
  const orgParam = params.get('org');
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const center = schools.find((s) => s.id === schoolId)?.center ?? { lat: 0, lng: 0 };
  const cities = localeContext().cities;
  const myCity = cityOf(v.me);

  const [title, setTitle] = useState(params.get('title') ?? '');
  const [orgId, setOrgId] = useState<string>(orgParam && groups.some((o) => o.id === orgParam) ? orgParam : '');
  const [date, setDate] = useState(params.get('date') ?? todayISO());
  const [startTime, setStart] = useState(params.get('start') ?? '18:00');
  const [endTime, setEnd] = useState(params.get('end') ?? '19:30');
  const [city, setCity] = useState(myCity && cities.includes(myCity) ? myCity : cities[0]);
  const [placeName, setPlaceName] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [vis, setVis] = useState<MeetVis>(orgId ? 'group' : 'school');
  const [approval, setApproval] = useState(false);
  const [category, setCategory] = useState<ActivityCategory>((params.get('category') as ActivityCategory | null) ?? 'etc');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const visOptions: { value: MeetVis; label: string }[] = [
    { value: 'public', label: t('전체') }, { value: 'school', label: t('내 학교') },
    ...(orgId ? [{ value: 'group' as MeetVis, label: t('그룹 멤버') }] : []),
    { value: 'friends', label: t('연결된 사람') },
  ];
  const pickGroup = (id: string) => { setOrgId(id); if (!id && vis === 'group') setVis('school'); if (id && vis === 'school') setVis('group'); };
  const valid = title.trim().length >= 2 && placeName.trim().length > 0 && capacity > 0 && !!date && startTime < endTime;

  const submit = async () => {
    setBusy(true);
    try {
      const input: ActivityInput = {
        kind: orgId ? 'group' : 'personal', category, title: title.trim(), description: description.trim(),
        cover: { emoji: CATEGORY_EMOJI[category], hue: HUE_OF[category] },
        date, startTime, endTime, place: { name: placeName.trim(), area: city, lat: center.lat, lng: center.lng },
        capacity, fee: 0, joinPolicy: approval ? 'approval' : 'open', visibility: vis, visibilityTargets: [], invitedIds: [],
        orgId: orgId || undefined,
      };
      const res = await run(() => api.activities.create(v.me.id, input), t('모임을 만들었어요.'));
      nav(`/activities/${res.activity.id}`, { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title={t('모임 만들기')} />
      <div className="px-4 py-4 space-y-5">
        <Field label={t('제목')} required><Input placeholder={t('예: 목요일 저녁 러닝 같이 해요')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} /></Field>
        <Field label={t('그룹')} hint={groups.length === 0 ? t('그룹 없이도 모임을 만들 수 있어요.') : undefined}>
          <Select value={orgId} onChange={(e) => pickGroup(e.target.value)}><option value="">{t('없음')}</option>{groups.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label={t('날짜')} required><Input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t('시작')} required><Input type="time" value={startTime} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label={t('종료')} required><Input type="time" value={endTime} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label={t('장소')} required hint={localeContext().cityHint}>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <Select value={city} onChange={(e) => setCity(e.target.value)}>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            <Input placeholder={t('장소 이름 (예: 학생회관 카페)')} value={placeName} onChange={(e) => setPlaceName(e.target.value)} maxLength={60} />
          </div>
        </Field>
        <Field label={t('최대 인원')} required><Input type="number" min={1} max={999} value={capacity} onChange={(e) => setCapacity(Math.max(1, Number(e.target.value)))} /></Field>
        <Field label={t('공개 범위')} required>
          <Segmented value={vis} onChange={setVis} options={visOptions} />
        </Field>
        <div className="card px-4"><Toggle label={t('참가 승인')} description={t('켜면 신청을 확인한 뒤 참가가 확정돼요.')} checked={approval} onChange={setApproval} /></div>
        <Field label={t('종류 (선택)')}>
          <div className="flex flex-wrap gap-1.5">{CATS.map((c) => <Chip key={c} size="sm" color={CATEGORY_COLORS[c]} active={category === c} onClick={() => setCategory(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</Chip>)}</div>
        </Field>
        <Field label={t('설명 (선택)')}><Textarea placeholder={t('어떤 사람과 무엇을 하고 싶은지 한두 줄이면 충분해요.')} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></Field>
        {stageKind(v.me) !== 'alumni' && (
          <section className="pt-2">
            <p className="text-[13px] font-semibold text-ink-3 mb-2.5">{t('다른 방법으로 모으기')}</p>
            <MeetExtraRows />
          </section>
        )}
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" disabled={!valid} loading={busy} onClick={submit}>{t('모임 만들기')}</Button>
      </div>
    </div>
  );
}
