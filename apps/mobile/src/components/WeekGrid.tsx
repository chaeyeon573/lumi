import { Text, View } from 'react-native';
import type { Course } from '@core/types';
import { DAY_LABELS, toMin, todayIdx } from '@core/lib/timetable';
import { tw } from '@/tw';
import { C } from '@/theme';

/** 작은 주간 시간표 — 나 탭 카드와 친구 프로필에서 같이 쓴다 (강의실은 표시하지 않음) */
export function WeekGrid({ courses, h0 = 9, h1 = 18, px = 26, showRoom = false }: { courses: Course[]; h0?: number; h1?: number; px?: number; showRoom?: boolean }) {
  const days = courses.some((c) => c.day >= 5) ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  const today = todayIdx();
  const end = Math.max(h1, ...courses.map((c) => Math.ceil(toMin(c.end) / 60)));
  return (
    <View>
      <View style={tw`flex-row`}><View style={{ width: 20 }} />{days.map((d) => <Text key={d} style={tw`flex-1 text-center text-[11px] font-semibold ${d === today ? 'text-primary' : 'text-ink-3'}`}>{DAY_LABELS[d]}</Text>)}</View>
      <View style={[tw`flex-row mt-1`, { height: (end - h0) * px }]}>
        <View style={{ width: 20 }}>{Array.from({ length: end - h0 }, (_, i) => <Text key={i} style={[tw`absolute text-[9px] text-ink-3`, { top: i * px }]}>{h0 + i}</Text>)}</View>
        {days.map((d) => (
          <View key={d} style={[tw`flex-1 border-l border-line`, d === today ? { backgroundColor: C.tint } : null]}>
            {courses.filter((c) => c.day === d).map((c) => (
              <View key={c.id} style={[tw`absolute left-0.5 right-0.5 rounded-lg px-1 overflow-hidden`, { top: Math.max(0, (toMin(c.start) - h0 * 60) / 60 * px), height: Math.max(14, (toMin(c.end) - toMin(c.start)) / 60 * px - 2), backgroundColor: `hsl(${c.hue}, 80%, 90%)` }]}>
                <Text numberOfLines={2} style={[tw`text-[9px] font-bold leading-[11px]`, { color: `hsl(${c.hue}, 60%, 30%)` }]}>{c.name}</Text>
                {showRoom && c.room ? <Text numberOfLines={1} style={tw`text-[8px] text-ink-3`}>{c.room}</Text> : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
