import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/ui';
import { useViewer } from '@/viewer';
import { s } from '@/lumi/Screens';
export default function CampusLifeScreen() {
  const { category } = useLocalSearchParams();
  const me = useViewer().me;
  return (
    <Screen title={category === 'dining' ? 'Dining' : 'Recreation'}>
      <View style={s.card}>
        <Text style={s.heading}>
          {me.affiliation.type === 'university'
            ? me.affiliation.schoolName
            : 'Your campus'}
        </Text>
        <Text style={[s.sub, { marginTop: 12 }]}>
          Verified{' '}
          {category === 'dining' ? 'menus and dining hours' : 'facility hours'}{' '}
          are not connected for this campus yet. Check your university's
          official website.
        </Text>
        <Text style={[s.sub, { marginTop: 12 }]}>
          Live occupancy is not available.
        </Text>
      </View>
    </Screen>
  );
}
