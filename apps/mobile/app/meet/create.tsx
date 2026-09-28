import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * 모임 만들기 (웹 /meet/create → CreateMeetPage). 모바일은 아직 기존 활동 만들기 폼을 쓴다 —
 * ?category= 는 폼의 cat 으로, ?title= 은 그대로 넘긴다 (phase 2 에서 CreateMeet 폼으로 교체).
 */
export default function MeetCreateRedirect() {
  const p = useLocalSearchParams<{ category?: string; title?: string }>();
  const q = [['kind', 'group'], ['cat', p.category], ['title', p.title]].filter((x): x is [string, string] => !!x[1]).map(([k, val]) => `${k}=${encodeURIComponent(val)}`).join('&');
  return <Redirect href={`/create/activity?${q}` as never} />;
}
