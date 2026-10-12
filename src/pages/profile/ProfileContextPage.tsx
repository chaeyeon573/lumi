import { useState } from 'react';
import { t } from '@core/i18n';
import { useNavigate } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Field, Input, Segmented, VisibilityPicker } from '@/components/ui';
import { CompletionMeter } from '@/components/prompts/PromptComponents';
import { profileCompletion } from '@core/data/prompts';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_GOALS, GOAL_EMOJI, GOAL_LABELS, LOOKING_FOR_ROLES, PERSON_ROLE_LABELS, RESIDENCE_LABELS, ALL_MEET_PREFS, MEET_PREF_LABELS, MEET_PREF_EMOJI } from '@core/lib/labels';
import type { Goal, Role, Residence, MeetPreference } from '@core/types';

/** 이번 학기 목표·찾는 사람·제공할 수 있는 것·생활권·관심 조직 — 추천의 핵심 입력 */
export function ProfileContextPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const me = v.me;
  const [goals, setGoals] = useState<Goal[]>(me.goals);
  const [lookingFor, setLookingFor] = useState<Role[]>(me.lookingFor);
  const canOffer = me.canOffer;
  const [residence, setResidence] = useState<Residence>(me.living?.residence ?? 'dorm');
  const [zone, setZone] = useState(me.living?.zone ?? '');
  const [orgIds, setOrgIds] = useState<string[]>(me.interestedOrgIds);
  const [pref, setPref] = useState<MeetPreference[]>(me.meetPreference);
  const [busy, setBusy] = useState(false);
  const toggle = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((i) => i !== x) : [...arr, x]);
  const preview = profileCompletion({ ...me, goals, lookingFor, canOffer, living: zone ? { residence, zone } : undefined });
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';

  const save = async () => {
    setBusy(true);
    try {
      await run(() => api.users.update(me.id, { goals, lookingFor, canOffer, living: zone.trim() ? { residence, zone: zone.trim() } : undefined, interestedOrgIds: orgIds, meetPreference: pref }), t('저장했어요. 추천이 더 정확해져요.'));
      nav(-1);
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28">
      <TopBar back title={t('목표와 역할')} />
      <div className="px-4 py-4 space-y-5">
        <div className="card p-4 bg-[linear-gradient(120deg,#E9EDFF,#FFFFFF)]">
          <div className="flex items-center gap-2 mb-2"><Gift size={16} className="text-primary" /><b className="text-[14px]">{t('채울수록 더 잘 연결돼요')}</b></div>
          <CompletionMeter {...preview} />
          <p className="text-[12px] text-ink-2 mt-2">{t('완성도가 높을수록 추천에 더 자주 노출되고(100%면 1.5배), 상대 카드에 "왜 잘 맞는지"가 구체적으로 표시돼요.')}</p>
        </div>
        <Field label={t('어떤 사람을 만나고 싶어요?')} hint={t('여러 개 골라도 돼요. 추천 순서에 바로 반영돼요.')}>
          <div className="space-y-1.5">{ALL_MEET_PREFS.map((p) => <button key={p} type="button" onClick={() => setPref(toggle(pref, p))} className={`w-full text-left rounded-xl px-3.5 h-11 text-[14px] font-medium border flex items-center gap-2 ${pref.includes(p) ? 'border-primary bg-primary-soft' : 'border-line'}`}><span>{MEET_PREF_EMOJI[p]}</span>{MEET_PREF_LABELS[p]}</button>)}</div>
        </Field>
        <Field label={t('이번 학기에 하고 싶은 것')} right={<VisibilityPicker compact value={me.fieldVisibility.goals} onChange={(vis) => run(() => api.users.update(me.id, { fieldVisibility: { ...me.fieldVisibility, goals: vis } }))} />}>
          <div className="flex flex-wrap gap-2">{ALL_GOALS.map((g) => <Chip key={g} active={goals.includes(g)} onClick={() => setGoals(toggle(goals, g))}>{GOAL_EMOJI[g]} {GOAL_LABELS[g]}</Chip>)}</div>
        </Field>
        <Field label={t('찾는 사람')}><div className="flex flex-wrap gap-2">{LOOKING_FOR_ROLES.map((r) => <Chip key={r} active={lookingFor.includes(r)} onClick={() => setLookingFor(toggle(lookingFor, r))}>{PERSON_ROLE_LABELS[r]}</Chip>)}</div></Field>
        <Field label={t('생활권')} hint={t('정확한 기숙사 방·주소·실시간 위치는 저장하지 않아요. \'같은 생활권이에요\' 정도만 보여요.')} right={<VisibilityPicker compact value={me.fieldVisibility.living} onChange={(vis) => run(() => api.users.update(me.id, { fieldVisibility: { ...me.fieldVisibility, living: vis } }))} />}>
          <Segmented value={residence} onChange={setResidence} options={(Object.keys(RESIDENCE_LABELS) as Residence[]).map((r) => ({ value: r, label: RESIDENCE_LABELS[r] }))} />
          <Input className="mt-2" placeholder={t('주로 활동하는 구역 (예: 신촌 북쪽, 공학관 근처)')} value={zone} onChange={(e) => setZone(e.target.value)} />
        </Field>
        <Field label={t('관심 있는 연구실·동아리')} hint={t('관심 조직의 모집·행사가 먼저 추천돼요.')}>
          <div className="flex flex-wrap gap-2">{orgs.filter((o) => o.schoolId === mySchool).map((o) => <Chip key={o.id} active={orgIds.includes(o.id)} onClick={() => setOrgIds(toggle(orgIds, o.id))}>{o.logo.emoji} {o.name}</Chip>)}</div>
        </Field>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20"><Button full size="lg" loading={busy} onClick={save}>{t('저장')}</Button></div>
    </div>
  );
}
