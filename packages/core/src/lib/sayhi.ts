/**
 * 사람 카드의 "Say hi" — 둘이 함께 가진 것 한 줄 + 그걸로 시작하는 첫 메시지 초안.
 * 사람 카드의 큰 버튼은 하트·연결이 아니라 이것이다 (2026-11-02 사장님: "I'm in 이 도대체 뭐냐", ux-sim: 데이팅 앱 같다).
 *
 * 순서: 같은 수업 → 오늘 겹치는 공강 → 같은 학과 → 같은 관심사 → (없으면 학교만).
 * 지어내지 않는다 — 서버가 보내 준 것(수업 명단 classRosters, 공개 범위 안의 시간표·학과·관심사)으로만 만든다.
 */
import { lang } from '@core/i18n';
import type { ActivityCategory, ClassRoster, Interest, User } from '@core/types';
import { sharedClassWith } from './classmates';
import { commonInterests } from './relations';
import { INTEREST_LABELS } from './labels';
import { fmtBlock, freeBlocks, overlapBlocks, todayIdx, nowMin } from './timetable';

export type HiKind = 'class' | 'time' | 'dept' | 'interest' | 'none';
export interface HiContext {
  kind: HiKind;
  /** 카드에 보이는 한 줄 — "Both in UGBA 105". 함께 가진 게 없으면 빈 문자열 */
  line: string;
  /** 첫 메시지 초안 (보내기 전에 고칠 수 있다) */
  message: string;
  /** 아직 대화할 수 없는 사이면 제안(proposal)으로 보낸다 — 그때의 활동 종류 */
  category: ActivityCategory;
}

const first = (u: Pick<User, 'nickname'>) => u.nickname.trim().split(/\s+/)[0] || u.nickname;
const dept = (u: User) => (u.affiliation.type === 'university' && u.affiliation.showDepartment ? u.affiliation.department ?? '' : '');

export function hiContext(me: User, other: User, opts: { rosters?: ClassRoster[]; canSeeTimetable: boolean; now?: number; day?: number }, en = lang === 'en'): HiContext {
  const name = first(other);
  const cls = sharedClassWith(opts.rosters, other.id);
  if (cls) return {
    kind: 'class', category: 'study',
    line: en ? `Both in ${cls.code}` : `둘 다 ${cls.code} 수강`,
    message: en ? `Hi ${name}! Looks like we're both in ${cls.code} — want to study together or grab a coffee after class sometime?` : `안녕하세요 ${name}님! 둘 다 ${cls.code} 듣네요 — 수업 끝나고 같이 공부하거나 커피 한잔 어때요?`,
  };
  const now = opts.now ?? nowMin();
  if (opts.canSeeTimetable && me.timetable?.length && other.timetable?.length) {
    const day = opts.day ?? todayIdx();
    const ov = overlapBlocks(freeBlocks(me.timetable, day), freeBlocks(other.timetable, day)).map((b) => ({ start: Math.max(b.start, now), end: b.end })).filter((b) => b.end - b.start >= 30);
    if (ov.length) {
      const when = fmtBlock(ov[0]);
      return {
        kind: 'time', category: 'coffee',
        line: en ? `Both free ${when} today` : `오늘 ${when} 둘 다 공강`,
        message: en ? `Hi ${name}! We're both free ${when} today — want to grab a coffee or lunch?` : `안녕하세요 ${name}님! 오늘 ${when} 둘 다 공강이네요 — 커피나 밥 같이 할래요?`,
      };
    }
  }
  const d = dept(me);
  if (d && d === dept(other)) return {
    kind: 'dept', category: 'coffee',
    line: en ? `Both in ${d}` : `같은 ${d}`,
    message: en ? `Hi ${name}! I'm in ${d} too — want to grab a coffee sometime this week?` : `안녕하세요 ${name}님! 저도 ${d}예요 — 이번 주에 커피 한잔 어때요?`,
  };
  const common = commonInterests(me, other);
  if (common.length) {
    const label = (i: Interest) => INTEREST_LABELS[i].toLowerCase();
    const both = common.slice(0, 2).map(label).join(en ? ' & ' : '·');
    const cat: ActivityCategory = (['coffee', 'meal', 'study', 'exercise'] as const).find((c) => common.includes(c)) ?? 'coffee';
    return {
      kind: 'interest', category: cat,
      line: en ? `Both into ${both}` : `둘 다 ${both} 좋아함`,
      message: en ? `Hi ${name}! Saw we're both into ${both} — want to hang out sometime this week?` : `안녕하세요 ${name}님! 둘 다 ${both} 좋아하시네요 — 이번 주에 같이 할래요?`,
    };
  }
  return {
    kind: 'none', category: 'coffee', line: '',
    message: en ? `Hi ${name}! I'm ${first(me)}. Want to grab a coffee on campus sometime this week?` : `안녕하세요 ${name}님! 저는 ${first(me)}예요. 이번 주에 캠퍼스에서 커피 한잔 어때요?`,
  };
}

/** 카드의 학년·전공 줄 — 나이 대신 ("Junior · Business (Haas)"). 학년은 가을(8월)에 바뀐다 */
export function yearMajor(u: User, en = lang === 'en', d = new Date()): string {
  if (u.affiliation.type !== 'university') return u.affiliation.companyName;
  const a = u.affiliation;
  const academic = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  const y = Math.min(4, Math.max(1, academic - a.year + 1));
  const year = a.role === 'graduate' ? (en ? 'Grad student' : '대학원생') : a.role === 'alumni' ? (en ? 'Alum' : '졸업생') : en ? ['Freshman', 'Sophomore', 'Junior', 'Senior'][y - 1] : `${y}학년`;
  return [year, a.showDepartment ? a.department : ''].filter(Boolean).join(' · ');
}
