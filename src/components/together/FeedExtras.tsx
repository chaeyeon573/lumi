import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { shareOrCopy } from '@/lib/native';

const en = lang === 'en';

/** 같은 층·같은 수업 사람에게 Lumi 링크 보내기 (공유 시트, 없으면 복사) — 피드·사람 탭이 비었을 때 */
export function useInvite() {
  const v = useViewer();
  const showToast = useAppStore((s) => s.showToast);
  const cls = v.me.timetable[0]?.name;
  return async (who: 'floor' | 'class') => {
    const url = `${window.location.origin}/welcome`;
    // 사실만 — "우리 수업 사람들이 Lumi에 있어요" 는 내가 있다는 것만으로는 틀린 말. 과목 코드만 ("CS 186 Databases" → "CS 186")
    const code = cls?.split(' ').slice(0, 2).join(' ');
    const text = en ? (who === 'class' && code ? `I'm on Lumi — it shows who in ${code} is free between classes. Join so we can find each other: ${url}` : `I'm on Lumi — see who's free between classes and where the free food is on campus. Join me: ${url}`)
      : (who === 'class' && code ? `나 Lumi 써 — ${code} 듣는 사람 중 공강 겹치는 사람이 보여. 같이 들어와서 서로 찾자: ${url}` : `나 Lumi 써 — 공강 겹치는 친구랑 캠퍼스 무료 음식이 보여. 같이 하자: ${url}`);
    // 공유 시트 (iPhone 앱·휴대폰 브라우저), 없으면 복사 — src/lib/native.ts
    if (await shareOrCopy({ text, copy: text }) === 'copied') showToast(en ? 'Invite copied — paste it in your group chat.' : '초대 문구를 복사했어요.', 'success');
  };
}
