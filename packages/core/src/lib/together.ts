import type { TimePoll, TimeOption, User, ID } from '@core/types';
import { t, lang } from '@core/i18n';
import { freeBlocks, overlapBlocks, todayIdx, toHHMM, toMin, jsDayToIdx, type Block } from './timetable';
import { addDaysISO, formatDate, formatTime } from './format';

/** 주최자 + 초대자의 공강이 겹치는 시간을 후보로 제안 (시간표 없는 사람은 제약 없음) */
export function suggestOptions(people: User[], canSee: (u: User) => boolean, days = 5, max = 5): Omit<TimeOption, 'id'>[] {
  const withTT = people.filter((u) => !!u.timetable?.length && canSee(u));
  const out: (Omit<TimeOption, 'id'> & { score: number })[] = [];
  const today = todayIdx();
  for (let d = 1; d <= days; d++) {
    const day = (today + d) % 7;
    if (day >= 5) continue; // 주말은 수업이 없어 제안 의미가 적다 — 직접 추가로
    let blocks: Block[] = [{ start: 9 * 60, end: 21 * 60 }];
    for (const u of withTT) blocks = overlapBlocks(blocks, freeBlocks(u.timetable ?? [], day), 60);
    for (const b of blocks) {
      // 저녁(17시 이후) 우선, 점심(12시대) 다음
      const start = b.start >= 17 * 60 ? b.start : b.start <= 12 * 60 && b.end >= 13 * 60 + 30 ? 12 * 60 : b.start;
      const end = Math.min(b.end, start + 90);
      if (end - start < 60) continue;
      const score = (start >= 17 * 60 ? 3 : start === 12 * 60 ? 2 : 1) - d * 0.1;
      out.push({ date: addDaysISO(d), startTime: toHHMM(start), endTime: toHHMM(end), suggested: true, score });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, max).map(({ score: _s, ...o }) => o);
}

export interface OptionTally { option: TimeOption; voterIds: ID[]; count: number; everyone: boolean }

/** 옵션별 표 수 — 주최자 포함 */
export function tally(poll: TimePoll): { rows: OptionTally[]; best?: OptionTally; voted: number; total: number } {
  const total = poll.inviteeIds.length + 1;
  const rows = poll.options.map((option) => {
    const voterIds = Object.entries(poll.votes).filter(([, ids]) => ids.includes(option.id)).map(([u]) => u);
    return { option, voterIds, count: voterIds.length, everyone: voterIds.length >= total };
  });
  const best = [...rows].sort((a, b) => b.count - a.count || (a.option.date + a.option.startTime).localeCompare(b.option.date + b.option.startTime))[0];
  return { rows, best: best && best.count > 0 ? best : undefined, voted: Object.values(poll.votes).filter((ids) => ids.length > 0).length, total };
}

/** 내 시간표 기준 이 시간이 공강인지 */
export function myStatusFor(me: User, o: TimeOption): 'free' | 'class' | 'unknown' {
  if (!me.timetable?.length) return 'unknown';
  const day = jsDayToIdx(new Date(`${o.date}T12:00:00`).getDay());
  return freeBlocks(me.timetable ?? [], day).some((b) => b.start <= toMin(o.startTime) && b.end >= toMin(o.endTime)) ? 'free' : 'class';
}

export const optionLabel = (o: Omit<TimeOption, 'id'>) => `${formatDate(o.date)} ${formatTime(o.startTime)}–${formatTime(o.endTime)}`;

export function closesIn(iso: string) {
  const h = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3600000));
  return lang === 'en' ? (h < 1 ? 'closing soon' : `closes in ${h}h`) : (h < 1 ? t('곧 마감') : `${h}${t('시간 후 마감')}`);
}
