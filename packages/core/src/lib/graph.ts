/**
 * 연결 그래프 — 촌수(1촌 = 연결, 2촌 = 연결의 연결 …).
 * 친구의 친구가 멋진 사람이면 나도 연결되고 싶다: 네트워크 요청 전달 범위와 "2촌 거리" 표시에 쓴다.
 */
import type { ID, Relationships } from '@core/types';
import { pairKey } from './format';

type Rel = { relationships: Pick<Relationships, 'friends' | 'blocks'> };

export function adjacency(s: Rel): Map<ID, Set<ID>> {
  const m = new Map<ID, Set<ID>>();
  const add = (a: ID, b: ID) => { if (!m.has(a)) m.set(a, new Set()); m.get(a)!.add(b); };
  for (const f of s.relationships.friends) { add(f.a, f.b); add(f.b, f.a); }
  return m;
}

/** id 로부터 각 사람까지의 촌수 (maxDegree 까지). 본인은 0 */
export function degreesFrom(s: Rel, from: ID, maxDegree = 3): Map<ID, number> {
  const adj = adjacency(s);
  const dist = new Map<ID, number>([[from, 0]]);
  let frontier: ID[] = [from];
  for (let d = 1; d <= maxDegree && frontier.length; d++) {
    const next: ID[] = [];
    for (const u of frontier) for (const v of adj.get(u) ?? []) { if (!dist.has(v)) { dist.set(v, d); next.push(v); } }
    frontier = next;
  }
  return dist;
}

/** a → b 촌수. 닿지 않으면 undefined */
export function degreeOf(s: Rel, a: ID, b: ID, maxDegree = 3): number | undefined {
  if (a === b) return 0;
  return degreesFrom(s, a, maxDegree).get(b);
}

/** n촌 이내 사람 (본인 제외) */
export function withinDegree(s: Rel, from: ID, n: number): ID[] {
  return [...degreesFrom(s, from, n).entries()].filter(([id, d]) => d > 0 && id !== from).map(([id]) => id);
}

/** a→b 경로의 중간 사람 (2촌이면 공통 연결 1명, 3촌이면 2명). 표시용 */
export function pathBetween(s: Rel, a: ID, b: ID, maxDegree = 3): ID[] {
  const adj = adjacency(s);
  const prev = new Map<ID, ID | null>([[a, null]]);
  let frontier: ID[] = [a];
  for (let d = 0; d < maxDegree && frontier.length; d++) {
    const next: ID[] = [];
    for (const u of frontier) for (const v of adj.get(u) ?? []) { if (!prev.has(v)) { prev.set(v, u); next.push(v); if (v === b) { const out: ID[] = []; let cur: ID | null = prev.get(b) ?? null; while (cur && cur !== a) { out.unshift(cur); cur = prev.get(cur) ?? null; } return out; } } }
    frontier = next;
  }
  return [];
}

export const isBlockedPair = (s: Rel, a: ID, b: ID) => s.relationships.blocks.some((x) => pairKey(x.fromId, x.toId) === pairKey(a, b));

import type { User } from '@core/types';
/** 2촌 — 친구의 친구. via = 공통 연결(경로에 보여도 되는 사람만 이름 공개, 나머지는 숫자로) */
export interface SecondDegree { user: User; via: User[]; hiddenVia: number }
export function secondDegree(s: Rel & { users: User[] }, meId: ID, canShowInPath: (u: User) => boolean): SecondDegree[] {
  const adj = adjacency(s);
  const mine = adj.get(meId) ?? new Set<ID>();
  const out = new Map<ID, SecondDegree>();
  for (const f of mine) {
    for (const x of adj.get(f) ?? []) {
      if (x === meId || mine.has(x) || isBlockedPair(s, meId, x)) continue;
      const user = s.users.find((u) => u.id === x); const via = s.users.find((u) => u.id === f);
      if (!user || !via) continue;
      const cur = out.get(x) ?? { user, via: [], hiddenVia: 0 };
      if (canShowInPath(via)) cur.via.push(via); else cur.hiddenVia += 1;
      out.set(x, cur);
    }
  }
  return [...out.values()].sort((a, b) => (b.via.length + b.hiddenVia) - (a.via.length + a.hiddenVia));
}
