import type { CatalogCourse, CatalogSection } from '@core/api/types';
import type { Course } from '@core/types';
import { api } from '@core/api';
import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { COURSE_HUES, catalogCourseName, coursesFromCatalog } from '@core/lib/timetable';
import { uid } from '@core/lib/format';

const en = lang === 'en';

/**
 * 목록의 수업(+ 고른 디스커션·랩)을 내 시간표에 넣는다 — S029 목록과 S030 수업 페이지가 같이 쓴다.
 * 넣은 뒤 "Added CS 61A ✓" + Undo (넣은 줄만 다시 뺀다). 실패하면 run 이 오류 토스트를 띄우고 throw
 */
export function useAddCourse() {
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  return async (c: CatalogCourse, sections: CatalogSection[] = []): Promise<Course[]> => {
    const me = useAppStore.getState().users.find((u) => u.id === useAppStore.getState().currentUserId);
    if (!me) return [];
    const hue = COURSE_HUES[Math.floor(Math.random() * COURSE_HUES.length)];
    const lecture = coursesFromCatalog(c, hue);
    const meta = lecture[0] ? { code: lecture[0].code, term: lecture[0].term } : {};
    const extra: Course[] = sections.flatMap((s) => s.meetings.map((m) => ({ id: uid('c'), name: catalogCourseName(c), day: m.day, start: m.start, end: m.end, room: s.location, url: c.url, syllabusUrl: c.syllabusUrl, section: s.label, hue, ...meta })));
    const rows = [...lecture, ...extra];
    await run(() => api.users.update(me.id, { timetable: [...(me.timetable ?? []), ...rows] }));
    const ids = new Set(rows.map((r) => r.id));
    const label = [c.code, ...sections.map((s) => s.label)].join(' + ');
    showToast(en ? `Added ${label} ✓` : `${label} 추가했어요 ✓`, 'success', {
      label: en ? 'Undo' : '되돌리기',
      run: () => {
        const cur = useAppStore.getState().users.find((u) => u.id === me.id);
        if (cur) void run(() => api.users.update(me.id, { timetable: (cur.timetable ?? []).filter((x) => !ids.has(x.id)) }), en ? `Removed ${c.code}` : `${c.code} 뺐어요`).catch(() => {});
      },
    });
    return rows;
  };
}
