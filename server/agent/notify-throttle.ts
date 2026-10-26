/**
 * 에이전트 알림 메일 거르기 — 같은 실패를 매 바퀴 메일로 보내 받은편지함을 덮던 것(2026-10-26)을 막는다.
 *   - 같은 작업·같은 상태는 하루에 한 번만 알린다 (고쳐질 때까지 매일 한 통)
 *   - 메일은 전체로 한 시간에 한 통까지 — 그 사이 생긴 새 실패는 다음 메일에 묶인다
 * 보낸 기록은 DB 문서로 남겨, 워커가 다시 시작해도(재배포·충돌 재시작) 처음부터 다시 보내지 않는다.
 */
import type { AgentRun } from '../store';

export const MAIL_LOG = 'agentMailLog';
export const SAME_FAILURE_HOURS = 24;
export const MIN_GAP_HOURS = 1;
const GLOBAL = '__last_mail';

export interface MailLogDoc { id: string; sentAt: string }

export const signatureOf = (r: Pick<AgentRun, 'task' | 'status'>) => `${r.task}|${r.status}`;
const hoursBetween = (a: string | undefined, now: Date) => (a ? (now.getTime() - Date.parse(a)) / 3_600_000 : Infinity);

/** 지금 메일로 보낼 실패만 고른다. 보낼 게 없거나 직전 메일이 한 시간 안이면 빈 배열 */
export function pickToMail<T extends Pick<AgentRun, 'task' | 'status'>>(bad: T[], log: MailLogDoc[], now = new Date()): T[] {
  const sent = new Map(log.map((d) => [d.id, d.sentAt]));
  if (hoursBetween(sent.get(GLOBAL), now) < MIN_GAP_HOURS) return [];
  return bad.filter((r) => hoursBetween(sent.get(signatureOf(r)), now) >= SAME_FAILURE_HOURS);
}

/** 보낸 뒤 남길 기록 */
export function logEntries(sentRuns: Pick<AgentRun, 'task' | 'status'>[], now = new Date()): MailLogDoc[] {
  const at = now.toISOString();
  return [{ id: GLOBAL, sentAt: at }, ...[...new Set(sentRuns.map(signatureOf))].map((id) => ({ id, sentAt: at }))];
}
