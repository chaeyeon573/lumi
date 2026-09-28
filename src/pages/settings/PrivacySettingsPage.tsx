import { useEffect, useState } from 'react';
import { Lock, MapPin } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { t, lang } from '@core/i18n';
import { Avatar, Button, PrivacyNote, Section, SectionSkeleton, VisibilityPicker, Toggle } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useSectionState } from '@/hooks/useSectionState';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { AUDIENCE_DESC, AUDIENCE_LABELS, DEFAULT_PRIVACY, privacyOf } from '@core/lib/privacy';
import { cityOf, isAlumniStage } from '@core/lib/network';
import { cn } from '@core/lib/cn';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { maskedPersonLine } from '@/components/people_view';
import type { Audience, PrivacySettings, ProfileField, Visibility } from '@core/types';

const AUDIENCES: Audience[] = ['everyone', 'school_2nd', 'connections'];
const ITEMS: { key: keyof Omit<PrivacySettings, 'scope'>; label: string; desc?: string }[] = [
  { key: 'showCompany', label: t('회사') },
  { key: 'showCity', label: t('도시'), desc: t('도시 단위만 — 정확한 주소는 받지 않아요') },
  { key: 'showGradYear', label: t('졸업연도') },
  { key: 'showGroups', label: t('그룹') },
  { key: 'showTrips', label: t('방문 예정'), desc: t('도시와 기간만 보여요') },
  { key: 'showInPaths', label: t('2촌 경로에 내 이름 표시'), desc: t('끄면 "서로 아는 사람 1명"처럼 숫자로만 보여요') },
];

const FIELDS: { key: ProfileField; label: string; desc?: string }[] = [
  { key: 'bio', label: t('자기소개') },
  { key: 'prompts', label: t('질문 답변 (텍스트·음성·투표)'), desc: t('홈 카드에도 첫 번째 답변이 보여요') },
  { key: 'interests', label: t('관심사'), desc: t('추천에 사용되므로 전체 공개를 권장해요') },
  { key: 'likes', label: t('좋아하는 것') },
  { key: 'freeTime', label: t('하고 싶은 활동') },
  { key: 'availability', label: t('활동 가능한 시간'), desc: t('시간표가 없을 때 쓰는 수동 설정') },
  { key: 'goals', label: t('이번 학기 목표') },
  { key: 'living', label: t('생활권'), desc: t('기숙사·자취·통학과 대략적인 구역만') },
  { key: 'timetable', label: t('시간표 공강 여부'), desc: t('전체 시간표와 강의실은 공개되지 않고 공강 시간만 보여요') },
  { key: 'purposes', label: t('이용 목적') },
  { key: 'height', label: t('키') },
  { key: 'preferredPartner', label: t('관심 있는 사람의 조건') },
  { key: 'posts', label: t('사진과 게시물 그리드') },
];

export function PrivacySettingsPage() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const aff = me.affiliation.type === 'university' ? me.affiliation : null;
  const set = (k: ProfileField, vis: Visibility) => run(() => api.users.update(me.id, { fieldVisibility: { ...me.fieldVisibility, [k]: vis } }));
  const saved = privacyOf(me);
  const [draft, setDraft] = useState<PrivacySettings>(saved);
  const [busy, setBusy] = useState(false);
  const sec = useSectionState('privacy');
  useEffect(() => { setDraft(privacyOf(me)); }, [me.privacy]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const save = async () => {
    setBusy(true);
    try { await run(() => api.users.setPrivacy(me.id, draft), t('공개 범위를 저장했어요')); }
    catch { /* 오류 토스트는 run 이 띄운다 */ } finally { setBusy(false); }
  };
  // 학교가 다른 사람이 보는 모습 — 'everyone' 이면 다 보이고, 그 외(2촌이 아닐 때)는 이름·학교·관심사만
  const outsider = draft.scope === 'everyone';
  const pv = { full: outsider, company: outsider && draft.showCompany, city: outsider && draft.showCity, gradYear: outsider && draft.showGradYear, groups: outsider && draft.showGroups, trips: false };
  return (
    <div className="min-h-full pb-28">
      <TopBar back title={t('공개 범위 설정')} />
      <div className="px-4 py-3 space-y-3">
        {!me.privacy && <p className="rounded-2xl bg-accent-soft/60 px-3.5 py-2.5 text-[12px] text-primary">{t('아직 따로 정하지 않아 기본값(같은 학교 + 2촌)이 적용돼 있어요.')}</p>}

        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={2} />}>
          {/* ── 전체 공개 범위 ── */}
          <div className="card p-4">
            <div className="text-[14px] font-bold">{t('전체 공개 범위')}</div>
            <div className="mt-2.5 space-y-2" role="radiogroup">
              {AUDIENCES.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={draft.scope === a} onClick={() => setDraft((d) => ({ ...d, scope: a }))}
                  className={cn('w-full text-left rounded-2xl border px-3.5 py-3 flex items-start gap-3 press', draft.scope === a ? 'border-primary bg-primary-soft/50' : 'border-line')}>
                  <span className={cn('mt-0.5 h-5 w-5 rounded-full border-2 grid place-items-center shrink-0', draft.scope === a ? 'border-primary' : 'border-line')}>{draft.scope === a && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                  <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold">{AUDIENCE_LABELS[a]}{a === DEFAULT_PRIVACY.scope && <span className="ml-1.5 text-[11px] font-bold text-verify">{t('기본')}</span>}</span><span className="block text-[12px] text-ink-3 mt-0.5">{AUDIENCE_DESC[a]}</span></span>
                </button>
              ))}
            </div>
          </div>

          {/* ── 항목별 ── */}
          <div className="card px-4 divide-y divide-line mt-3">
            {ITEMS.map((it) => <Toggle key={it.key} label={it.label} description={it.desc} checked={draft[it.key]} onChange={(val) => setDraft((d) => ({ ...d, [it.key]: val }))} />)}
            <div className="py-3 flex items-start gap-3">
              <Lock size={16} className="text-ink-3 mt-0.5 shrink-0" />
              <div className="flex-1"><div className="text-[14px] font-medium">{t('전화번호 · 개인 이메일 · 정확한 위치 · 실시간 위치')}</div><div className="text-[12px] text-ink-3">{t('항상 비공개 (변경 불가)')}</div></div>
            </div>
          </div>

          {/* ── 미리보기 ── */}
          <div className="card p-4 mt-3">
            <div className="text-[11px] font-bold text-ink-3">{t('학교가 다른 사람에게는 이렇게 보여요')}</div>
            <div className="mt-2.5 rounded-[20px] border border-line p-3 flex items-start gap-3">
              <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={48} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold truncate">{me.nickname}</div>
                <SchoolBadge user={me} withYear={pv.gradYear} size="sm" />
                <div className="text-[12px] text-ink-2 truncate">{maskedPersonLine(me, pv, lang)}</div>
                {pv.city && cityOf(me) && <div className="text-[12px] text-ink-3 flex items-center gap-1"><MapPin size={11} />{cityOf(me)}</div>}
                {isAlumniStage(me) && !pv.company && me.career?.company && <PrivacyNote text={t('회사는 가려져요')} className="mt-1" />}
                {!pv.full && <PrivacyNote text={draft.scope === 'connections' ? t('연결된 사람에게만 자세히 보여요') : t('같은 학교·2촌에게만 자세히 보여요')} className="mt-1" />}
              </div>
            </div>
          </div>
        </Section>

        <div className="pt-2 px-1 text-[12px] font-bold text-ink-3">{t('프로필 항목별')}</div>
        <p className="text-[12px] text-ink-3">{t('멀티프로필 대신 항목별로 공개 범위를 정해요. 정확한 위치는 어떤 설정에서도 공개되지 않아요.')}</p>
        <div className="card divide-y divide-line">
          {FIELDS.filter((f) => !isAlumniStage(me) || !['timetable', 'goals', 'living'].includes(f.key)).map((f) => (
            <div key={f.key} className="flex items-center gap-3 px-4 py-3"><span className="flex-1"><span className="block text-[14px] font-medium">{f.label}</span>{f.desc && <span className="block text-[11px] text-ink-3">{f.desc}</span>}</span><VisibilityPicker compact value={me.fieldVisibility[f.key]} onChange={(vis) => set(f.key, vis)} label={`${f.label}${t(' 공개 범위')}`} /></div>
          ))}
        </div>
        {aff && (
          <div className="card px-4 divide-y divide-line">
            <Toggle label={t('학교명 공개')} checked={aff.showSchool} onChange={(val) => run(() => api.users.update(me.id, { affiliation: { ...aff, showSchool: val } }))} />
            <Toggle label={t('학과 공개')} checked={aff.showDepartment} onChange={(val) => run(() => api.users.update(me.id, { affiliation: { ...aff, showDepartment: val } }))} />
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button size="lg" full loading={busy} disabled={!dirty || sec.loading} onClick={save}>{dirty ? t('저장') : t('저장됨')}</Button>
      </div>
    </div>
  );
}
