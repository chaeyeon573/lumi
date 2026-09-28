import { useState } from 'react';
import { Text, View } from 'react-native';
import { GraduationCap, Check, BookOpen, RotateCcw, Pencil } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { isAlumniStage, isGradStage, stageOf, stageLabel, gradYearOf, cityOf, contextLine, shouldSuggestStatusUpdate } from '@core/lib/network';
import type { Stage } from '@core/types';
import { tw } from '@/tw';
import { nav, replace, back } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Card, C } from '@/ui';
import { MoreRow } from '@/v2/Network';
import { Row } from '@/v2/Forms';

/**
 * 프로필 › 상태 변경 (웹 StatusPage) — "졸업하셨나요?".
 * 새 계정 없음. 연결·그룹·글·학교 인증·활동 기록은 모두 유지. 졸업 → /profile/status/career, 대학원 진학은 여기서 바로.
 */
export default function StatusScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const [busy, setBusy] = useState<Stage | null>(null);
  const [more, setMore] = useState(false);
  const alumni = isAlumniStage(me);
  const grad = isGradStage(me);
  const suggest = shouldSuggestStatusUpdate(me);
  const setStage = async (stage: Stage, msg: string) => {
    setBusy(stage);
    try { await run(() => api.users.setStage(me.id, stage), msg); replace('/profile'); } catch { setBusy(null); }
  };
  const keeps = [t('기존 연결·그룹·활동 기록 유지'), t('프로필을 졸업생으로 업데이트'), t('새로운 사람들과의 연결')];

  if (alumni) {
    const facts = [{ l: t('상태'), v: stageLabel(stageOf(me), lang) }, { l: t('졸업연도'), v: gradYearOf(me) ? String(gradYearOf(me)) : '—' }, { l: t('거주 도시'), v: cityOf(me) || '—' }, { l: t('직무'), v: me.career?.role || '—' }];
    return (
      <Screen title={t('현재 상태')}>
        <View style={tw`py-4`}>
          <Card style={tw`items-center`}>
            <View style={tw`h-20 w-20 rounded-full bg-primary-soft items-center justify-center`}><GraduationCap size={38} color={C.primary} /></View>
            <Text style={tw`mt-4 text-[22px] font-bold text-ink text-center`}>{t('졸업생으로 활동 중이에요')}</Text>
            <Text style={tw`mt-1 text-[13px] text-ink-2 text-center`}>{contextLine(me, lang) || stageLabel(stageOf(me), lang)}</Text>
            <View style={tw`mt-4 flex-row flex-wrap -mx-1 self-stretch`}>
              {facts.map((x) => <View key={x.l} style={tw`w-1/2 p-1`}><View style={tw`rounded-2xl bg-surface-2 px-3.5 py-2.5`}><Text style={tw`text-[11px] text-ink-3`}>{x.l}</Text><Text numberOfLines={1} style={tw`text-[14px] font-semibold text-ink`}>{x.v}</Text></View></View>)}
            </View>
            <Row style={tw`mt-4 self-stretch`}><Button full variant="secondary" icon={<Pencil size={15} color={C.primary} />} onPress={() => nav('/profile/edit')}>{t('도시·하는 일 수정')}</Button></Row>
          </Card>
          <MoreRow open={more} onToggle={() => setMore((x) => !x)} label={t('데모 도구')} />
          {more ? (
            <Card>
              <Text style={tw`text-[12px] text-ink-3 mb-3`}>{t('재학생 화면(시간표·캠퍼스 추천)으로 되돌려 볼 수 있어요. 연결과 기록은 그대로예요.')}</Text>
              <Row><Button full variant="outline" loading={busy === 'undergrad'} icon={<RotateCcw size={15} color={C.ink2} />} onPress={() => setStage('undergrad', t('재학생으로 되돌렸어요.'))}>{t('재학생으로 되돌리기 (데모)')}</Button></Row>
            </Card>
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t('현재 상태')}>
      <View style={tw`py-4`}>
        <Card style={tw`items-center p-6`}>
          <View style={tw`h-28 w-28 rounded-full bg-primary-soft items-center justify-center`}><GraduationCap size={56} color={C.primary} strokeWidth={1.6} /><Text style={tw`absolute -top-1 right-1 text-[18px]`}>✨</Text></View>
          <Text style={tw`mt-5 text-[24px] font-bold text-ink text-center`}>{t('졸업하셨나요?')}</Text>
          <Text style={tw`mt-1.5 text-[13px] text-ink-2 text-center`}>{suggest ? t('졸업 예정연도가 지났어요. 새 계정은 필요 없어요 — 지금 프로필 그대로 이어져요.') : t('새 계정은 필요 없어요. 지금 프로필 그대로 이어져요.')}</Text>
          <View style={tw`mt-5 self-stretch`}>
            {keeps.map((k) => <View key={k} style={tw`mb-2.5 flex-row items-center`}><View style={tw`h-7 w-7 rounded-full bg-mint-soft items-center justify-center`}><Check size={15} color={C.mint} strokeWidth={3} /></View><Text style={tw`ml-3 flex-1 text-[14px] font-semibold text-ink`}>{k}</Text></View>)}
          </View>
          <Row style={tw`mt-4 self-stretch`}><Button full size="lg" icon={<GraduationCap size={17} color={C.onPrimary} />} onPress={() => nav('/profile/status/career')}>{t('졸업으로 변경하기')}</Button></Row>
          <Row style={tw`mt-2 self-stretch`}><Button full size="lg" variant="outline" onPress={back}>{t('아직 아니에요')}</Button></Row>
        </Card>

        <Card style={tw`mt-4`}>
          <View style={tw`flex-row items-center`}><BookOpen size={17} color={C.primary} /><Text style={tw`ml-2 text-[17px] font-bold text-ink`}>{t('대학원에 진학했어요')}</Text></View>
          <Text style={tw`mt-1 text-[12px] text-ink-3`}>{grad ? `${t('현재')}: ${stageLabel(stageOf(me), lang)} · ${t('시간표와 캠퍼스 추천은 그대로예요')}` : t('시간표·캠퍼스 추천은 그대로, 프로필 표시만 바뀌어요.')}</Text>
          <Row style={tw`mt-3`}>
            {(['masters', 'phd'] as Stage[]).map((s, i) => (
              <View key={s} style={tw`flex-1 flex-row ${i ? 'ml-2' : ''}`}><Button full variant={stageOf(me) === s ? 'primary' : 'outline'} loading={busy === s} disabled={stageOf(me) === s} onPress={() => setStage(s, s === 'masters' ? t('석사 과정으로 바꿨어요.') : t('박사 과정으로 바꿨어요.'))}>{stageLabel(s, lang)}</Button></View>
            ))}
          </Row>
          {grad ? <Row style={tw`mt-2`}><Button full size="sm" variant="outline" loading={busy === 'undergrad'} onPress={() => setStage('undergrad', t('학부생으로 바꿨어요.'))}>{t('학부생으로 되돌리기')}</Button></Row> : null}
        </Card>
      </View>
    </Screen>
  );
}
