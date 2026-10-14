import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Search, MessageCircle } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { INTEREST_LABELS } from '@core/lib/labels';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Screen, Input, Segmented, Empty, IconBtn, C } from '@/ui';
import { PersonCard, ActivityRowCard, OrgCard } from '@/components/c_SearchCards';

type Tab = 'activities' | 'people' | 'orgs';

/** 검색 — 활동 · 사람 · 조직 (웹 SearchPage 와 동일, ?tab=people) */
export default function SearchScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>((params.tab as Tab) || 'activities');
  const [q, setQ] = useState('');
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const norm = q.trim().toLowerCase();
  const acts = v.visibleActivities.filter((a) => !norm || a.title.toLowerCase().includes(norm) || a.description.toLowerCase().includes(norm) || a.place.name.toLowerCase().includes(norm));
  const people = v.visibleUsers.filter((u) => !norm || u.nickname.includes(norm) || (u.affiliation.type === 'university' && !!u.affiliation.department?.includes(norm)) || (u.interests ?? []).some((i) => INTEREST_LABELS[i].includes(norm)));
  const orgList = orgs.filter((o) => !norm || o.name.toLowerCase().includes(norm) || o.description.includes(norm));
  return (
    <Screen title={t('검색')} right={<IconBtn onPress={() => nav('/chats')}><MessageCircle size={22} color={C.ink2} /></IconBtn>}>
      <View style={tw`pt-2`}>
        <View style={tw`justify-center`}>
          <Search size={16} color={C.ink3} style={[tw`absolute left-3`, { zIndex: 1 }]} />
          <Input autoFocus placeholder={t('사람, 활동, 동아리 검색')} value={q} onChangeText={setQ} style={tw`pl-9`} />
        </View>
        <View style={tw`mt-3`}><Segmented value={tab} onChange={setTab} options={[['activities', `${t('활동 ')}${acts.length}`], ['people', `${t('사람 ')}${people.length}`], ['orgs', `${t('조직 ')}${orgList.length}`]]} /></View>
      </View>
      <View style={tw`py-4`}>
        {tab === 'activities' && (acts.length ? acts.map((a) => <ActivityRowCard key={a.id} activity={a} />) : <Empty title={t('검색 결과가 없어요')} description={t('다른 키워드로 찾아보세요.')} />)}
        {tab === 'people' && (people.length ? people.map((u) => <PersonCard key={u.id} user={u} />) : <Empty title={t('검색 결과가 없어요')} />)}
        {tab === 'orgs' && (orgList.length ? orgList.map((o) => <OrgCard key={o.id} org={o} />) : <Empty title={t('검색 결과가 없어요')} />)}
      </View>
    </Screen>
  );
}
