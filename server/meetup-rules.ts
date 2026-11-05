/**
 * 모임 대기 명단 RPC 권한 (S046 Join Waitlist) — 본인으로만. index.ts 의 RULES 표에 합쳐지고 meetups.test.ts 가 확인한다.
 * (초대 전용·차단·학적·정원 확인은 엔진이 한다 — @core/lib/meetups)
 */
import type { Rule } from './together-rules';

export const MEETUP_RULES = {
  activities: { joinWaitlist: 1 },
} satisfies Record<string, Record<string, Rule>>;
