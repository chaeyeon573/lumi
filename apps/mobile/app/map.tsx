import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from '@/tw';
import { Screen, Empty, C } from '@/ui';

/** 지도 — 모바일에서는 아직 장소 이름·주소만 보여준다 */
export default function MapScreen() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const a = useAppStore((s) => s.activities.find((x) => x.id === focus));
  return (
    <Screen title={t('지도')}>
      {a ? (
        <View style={tw`rounded-[20px] border border-line p-5 items-center`}>
          <MapPin size={28} color={C.primary} />
          <Text style={tw`mt-2 text-[17px] font-bold text-ink text-center`}>{a.place.name}</Text>
          {a.place.address ? <Text style={tw`mt-1 text-[13px] text-ink-3 text-center`}>{a.place.address}</Text> : null}
        </View>
      ) : <Empty title={t('장소 정보가 없어요')} />}
    </Screen>
  );
}
