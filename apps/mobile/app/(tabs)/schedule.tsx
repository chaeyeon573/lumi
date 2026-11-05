import { View } from 'react-native';
import { AppHeader } from '@/ui';
import TimetableScreen from '../timetable';
export default function ScheduleScreen() {
  return (
    <View style={{ flex: 1 }}>
      <TimetableScreen tabHeader={<AppHeader />} />
    </View>
  );
}
