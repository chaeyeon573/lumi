/**
 * 같이 가기·팀원 찾기·오늘의 질문 RPC 권한 — 전부 "본인으로만" 할 수 있다.
 * index.ts 의 RULES 표에 합쳐지고, 테스트(together.test.ts)가 같은 표를 확인한다.
 * (모임 공개 범위·차단·다른 학교 행사 같은 세부 확인은 엔진이 한 번 더 한다)
 */
import type { ID } from '@core/types';

/** 숫자면 그 위치의 인자가 본인 id 여야 한다 */
export type Rule = number | ((me: ID, args: unknown[]) => boolean);
export const ruleAllows = (rule: Rule, me: ID, args: unknown[]) => (typeof rule === 'number' ? args[rule] === me : rule(me, args));

export const TOGETHER_RULES = {
  opportunities: { goTogether: 1, leaveTogether: 1, lookForTeam: 1 },
  users: { dailyResults: 0 },
} satisfies Record<string, Record<string, Rule>>;
