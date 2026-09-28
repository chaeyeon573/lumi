import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Lock, MapPin } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { AUDIENCE_DESC, AUDIENCE_LABELS, DEFAULT_PRIVACY, privacyOf } from '@core/lib/privacy';
import { cityOf, isAlumniStage } from '@core/lib/network';
import type { Audience, PrivacySettings, ProfileField, Visibility } from '@core/types';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Button, Toggle, C } from '@/ui';
import { VisibilityPicker } from '@/components/b_VisibilityPicker';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { SchoolBadge } from '@/v2/SchoolBadge';
import { maskedPersonLine } from '@/v2/personView';
import { MoreRow } from '@/v2/Network';
import { RadioRow, Row } from '@/v2/Forms';

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

/**
 * 공개 범위 설정 (웹 PrivacySettingsPage) — 전체 공개 범위 3단계 · 항목별 토글 · 항상 비공개 항목 · 학교가 다른 사람에게 보이는 모습.
 * 더 보기: 프로필 항목별 공개 범위 · 학교명/학과 공개 (모바일에 있던 설정 그대로).
 */
export default function PrivacySettingsScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const aff = me.affiliation.type === 'university' ? me.affiliation : null;
  const setField = (k: ProfileField, vis: Visibility) => { run(() => api.users.update(me.id, { fieldVisibility: { ...me.fieldVisibility, [k]: vis } })).catch(() => undefined); };
  const saved = privacyOf(me);
  const [draft, setDraft] = useState<PrivacySettings>(saved);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const sec = useSectionState('privacy');
  useEffect(() => { setDraft(privacyOf(me)); }, [me.privacy]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const save = async () => {
    setBusy(true);
    try { await run(() => api.users.setPrivacy(me.id, draft), t('공개 범위를 저장했어요')); } catch { /* 오류 토스트는 run 이 띄운다 */ } finally { setBusy(false); }
  };
  // 학교가 다른 사람이 보는 모습 — 'everyone' 이면 다 보이고, 그 외(2촌이 아닐 때)는 이름·학교·관심사만
  const outsider = draft.scope === 'everyone';
  const pv = { full: outsider, company: outsider && draft.showCompany, city: outsider && draft.showCity, gradYear: outsider && draft.showGradYear, groups: outsider && draft.showGroups, trips: false };

  return (
    <Screen title={t('공개 범위 설정')} footer={<Row><Button size="lg" full loading={busy} disabled={!dirty || sec.loading} onPress={save}>{dirty ? t('저장') : t('저장됨')}</Button></Row>}>
      <View style={tw`py-3`}>
        {!me.privacy ? <Text style={tw`mb-3 rounded-2xl bg-accent-soft px-3.5 py-2.5 text-[12px] text-primary`}>{t('아직 따로 정하지 않아 기본값(같은 학교 + 2촌)이 적용돼 있어요.')}</Text> : null}

        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={2} />}>
          {/* 1. 전체 공개 범위 */}
          <View style={tw`card p-4`}>
            <Text style={tw`mb-2.5 text-[14px] font-bold text-ink`}>{t('전체 공개 범위')}</Text>
            {AUDIENCES.map((a) => <RadioRow key={a} on={draft.scope === a} title={AUDIENCE_LABELS[a]} desc={AUDIENCE_DESC[a]} badge={a === DEFAULT_PRIVACY.scope ? t('기본') : undefined} onPress={() => setDraft((d) => ({ ...d, scope: a }))} />)}
          </View>

          {/* 2. 항목별 */}
          <View style={tw`mt-3 card px-4`}>
            {ITEMS.map((it, i) => <View key={it.key} style={i ? tw`border-t border-line` : undefined}><Toggle label={it.label} description={it.desc} checked={draft[it.key]} onChange={(val) => setDraft((d) => ({ ...d, [it.key]: val }))} /></View>)}
            <View style={tw`py-3 flex-row items-start border-t border-line`}>
              <Lock size={16} color={C.ink3} style={tw`mt-0.5`} />
              <View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-medium text-ink`}>{t('전화번호 · 개인 이메일 · 정확한 위치 · 실시간 위치')}</Text><Text style={tw`text-[12px] text-ink-3`}>{t('항상 비공개 (변경 불가)')}</Text></View>
            </View>
          </View>

          {/* 3. 미리보기 */}
          <View style={tw`mt-3 card p-4`}>
            <Text style={tw`text-[11px] font-bold text-ink-3`}>{t('학교가 다른 사람에게는 이렇게 보여요')}</Text>
            <View style={tw`mt-2.5 rounded-[20px] border border-line p-3 flex-row items-start`}>
              <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={48} />
              <View style={tw`flex-1 min-w-0 ml-3`}>
                <Text numberOfLines={1} style={tw`text-[15px] font-bold text-ink`}>{me.nickname}</Text>
                <SchoolBadge user={me} withYear={pv.gradYear} size="sm" />
                <Text numberOfLines={1} style={tw`text-[12px] text-ink-2`}>{maskedPersonLine(me, pv, lang)}</Text>
                {pv.city && cityOf(me) ? <View style={tw`flex-row items-center`}><MapPin size={11} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-3`}>{cityOf(me)}</Text></View> : null}
                {isAlumniStage(me) && !pv.company && me.career?.company ? <PrivacyNote text={t('회사는 가려져요')} /> : null}
                {!pv.full ? <PrivacyNote text={draft.scope === 'connections' ? t('연결된 사람에게만 자세히 보여요') : t('같은 학교·2촌에게만 자세히 보여요')} /> : null}
              </View>
            </View>
          </View>
        </Section>

        {/* 더 보기 — 프로필 항목별 · 학교 표시 */}
        <MoreRow open={more} onToggle={() => setMore((x) => !x)} label={t('프로필 항목별')} />
        {more ? (
          <View>
            <Text style={tw`text-[12px] text-ink-3`}>{t('멀티프로필 대신 항목별로 공개 범위를 정해요. 정확한 위치는 어떤 설정에서도 공개되지 않아요.')}</Text>
            <View style={tw`card mt-3`}>
              {/* 졸업생에게는 시간표·이번 학기 목표·생활권 행을 보여주지 않는다 */}
              {FIELDS.filter((f) => !isAlumniStage(me) || !['timetable', 'goals', 'living'].includes(f.key)).map((f, i) => (
                <View key={f.key} style={tw`flex-row items-center px-4 py-3 ${i === 0 ? '' : 'border-t border-line'}`}>
                  <View style={tw`flex-1 mr-3`}><Text style={tw`text-[14px] font-medium text-ink`}>{f.label}</Text>{f.desc ? <Text style={tw`text-[11px] text-ink-3`}>{f.desc}</Text> : null}</View>
                  <VisibilityPicker compact value={me.fieldVisibility[f.key]} onChange={(vis) => setField(f.key, vis)} label={`${f.label}${t(' 공개 범위')}`} />
                </View>
              ))}
            </View>
            {aff ? (
              <View style={tw`card px-4 mt-3`}>
                <Toggle label={t('학교명 공개')} checked={aff.showSchool} onChange={(val) => { run(() => api.users.update(me.id, { affiliation: { ...aff, showSchool: val } })).catch(() => undefined); }} />
                <View style={tw`h-px bg-line`} />
                <Toggle label={t('학과 공개')} checked={aff.showDepartment} onChange={(val) => { run(() => api.users.update(me.id, { affiliation: { ...aff, showDepartment: val } })).catch(() => undefined); }} />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
