import { useMemo } from 'react';
import { View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, C } from '@/ui';
import { OrgCard } from '@/components/c_SearchCards';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton } from '@/v2/SectionState';
import { SubTitle } from '@/v2/Network';
import { Row } from '@/v2/Forms';
import { myGroupLists } from '@/v2/myGroups';

/** 내 그룹 (웹 MyGroupsPage) — 멤버·운영진인 그룹 | 팔로우 중인 그룹. 프로필의 "그룹" 수는 이 두 목록의 합과 같다 */
export default function MyGroupsScreen() {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const sec = useSectionState('my-groups');
  const { mine, following } = useMemo(() => myGroupLists(orgs, v.me.id), [orgs, v.me.id]);

  return (
    <Screen title={t('내 그룹')}>
      <View style={tw`py-3`}>
        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={3} />}
          empty={mine.length === 0 && following.length === 0 && (
            <SectionEmpty emoji="🎪" title={t('가입한 그룹이 없어요')} description={t('동아리·연구실·학생회를 둘러보고 함께해보세요.')} action={<Button size="sm" onPress={() => nav('/meet?tab=groups')}>{t('그룹 둘러보기')}</Button>} />
          )}>
          {mine.length > 0 ? <View><SubTitle>{`${t('멤버')} · ${mine.length}`}</SubTitle>{mine.map((o) => <OrgCard key={o.id} org={o} />)}</View> : null}
          {following.length > 0 ? <View style={tw`mt-2`}><SubTitle>{`${t('팔로잉')} · ${following.length}`}</SubTitle>{following.map((o) => <OrgCard key={o.id} org={o} />)}</View> : null}
          <Row style={tw`mt-1`}>
            <Button full variant="secondary" onPress={() => nav('/meet?tab=groups')}>{t('그룹 둘러보기')}</Button>
            <View style={tw`w-2`} />
            <Button variant="outline" icon={<Plus size={15} color={C.ink2} />} onPress={() => nav('/groups/new')}>{t('그룹 만들기')}</Button>
          </Row>
        </Section>
      </View>
    </Screen>
  );
}
