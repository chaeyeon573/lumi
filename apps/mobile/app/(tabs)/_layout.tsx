import { Tabs } from 'expo-router';
import { Home, Users, CalendarDays, MessageSquareText, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, lang } from '@core/i18n';
import { C } from '@/ui';


/**
 * PRD 4절: Home | People | Meet | Feed | Profile (웹 BottomNav 와 같은 키). 가운데 + 버튼 없음 —
 * 만들기는 Meet › + 만들기, Feed › 컴포저. DM 은 헤더 오른쪽 메시지 아이콘.
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.ink3,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { height: 58 + insets.bottom, paddingTop: 6, borderTopColor: C.line, backgroundColor: C.bg },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: lang === 'en' ? 'Home' : t('홈'), tabBarIcon: ({ color, focused }) => <Home size={24} color={color} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="people" options={{ title: lang === 'en' ? 'People' : t('사람'), tabBarIcon: ({ color, focused }) => <Users size={24} color={color} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="meet" options={{ title: lang === 'en' ? 'Meet' : t('모임'), tabBarIcon: ({ color, focused }) => <CalendarDays size={24} color={color} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="feed" options={{ title: lang === 'en' ? 'Feed' : t('피드'), tabBarIcon: ({ color, focused }) => <MessageSquareText size={24} color={color} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="me" options={{ title: lang === 'en' ? 'Profile' : t('프로필'), tabBarIcon: ({ color, focused }) => <User size={24} color={color} strokeWidth={focused ? 2.4 : 1.8} /> }} />
    </Tabs>
  );
}
