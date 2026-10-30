import { TopBar } from '@/components/layout/TopBar';
import { t } from '@core/i18n';
import { VisibilityPicker, Toggle } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import type { ProfileField, Visibility } from '@core/types';

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
  { key: 'preferredPartner', label: t('관심 있는 사람의 조건') },
  { key: 'posts', label: t('사진과 게시물 그리드') },
];

export function PrivacySettingsPage() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const aff = me.affiliation.type === 'university' ? me.affiliation : null;
  const set = (k: ProfileField, vis: Visibility) => run(() => api.users.update(me.id, { fieldVisibility: { ...me.fieldVisibility, [k]: vis } }));
  return (
    <div className="min-h-full pb-8">
      <TopBar back title={t('공개 범위 설정')} />
      <div className="px-4 py-3 space-y-3">
        <p className="text-[12px] text-ink-3">{t('멀티프로필 대신 항목별로 공개 범위를 정해요. 정확한 위치는 어떤 설정에서도 공개되지 않아요.')}</p>
        <div className="card divide-y divide-line">
          {FIELDS.map((f) => (
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
    </div>
  );
}
