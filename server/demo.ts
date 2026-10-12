/**
 * 데모 계정·예시 프로필 정리 — 친구들에게 링크를 돌릴 때 학교별로 둘러볼 수 있게 한다.
 * - 시드 사용자는 전부 sample=true (화면에 '예시 프로필'로 표시)
 * - 앱에서 내린 학교(Stanford·SF State)에 있던 예시 사용자는 UC Merced 로 옮긴다
 * - UC Merced 데모 계정(u_me_ucmerced)을 기본 데모 계정에서 복제해 만든다
 * 이미 적용된 것은 건드리지 않으므로 서버가 켜질 때마다 돌려도 된다.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID, User } from '@core/types';
import { users as seedUsers, DEMO_USER_ID } from '@core/data/seed.en';

export { DEMO_USER_ID };
const SEED_IDS = new Set(seedUsers.map((u) => u.id));

const MERCED = { schoolId: 's_ucmerced', schoolName: 'UC Merced', emailDomain: 'ucmerced.edu' };
/** 예시 사용자 → UC Merced 로 옮길 때의 학과·생활권 (원래 학교 지명이 들어간 문장도 바꾼다) */
const MOVE_TO_MERCED: Record<ID, { department: string; zone: string; freeTime?: string }> = {
  u_minjun: { department: 'Economics', zone: 'Merced', freeTime: 'Bike rides around Lake Yosemite' },
  u_hana: { department: 'Global Arts Studies', zone: 'Merced', freeTime: 'Wandering downtown Merced' },
};

export const demoUserIdFor = (schoolId?: string) => (schoolId === MERCED.schoolId ? `${DEMO_USER_ID}_ucmerced` : DEMO_USER_ID);

function mercedDemo(base: User): User {
  const u: User = structuredClone(base);
  u.id = demoUserIdFor(MERCED.schoolId);
  u.sample = true;
  if (u.affiliation.type === 'university') u.affiliation = { ...u.affiliation, schoolId: MERCED.schoolId, schoolName: MERCED.schoolName, department: 'Computer Science and Engineering' };
  u.bio = 'CS student at UC Merced. Building side projects and always down for coffee with new people.';
  u.freeTime = 'Coding at the library or walking around Lake Yosemite';
  u.nowWant = 'Coffee near campus tonight?';
  u.prompts = u.prompts.map((p, i) => ({ ...p, answer: ['Coffee and talk side projects', 'Kolligian Library by the windows', 'React, best cafés downtown, hiking picks'][i] ?? p.answer }));
  u.timetable = [];
  if (u.living) u.living = { ...u.living, zone: 'Merced' };
  u.interestedOrgIds = [];
  return u;
}

/** 이 학교 목록(schools.csv)에 없고 사용자도 없는 학교는 앱 목록에서 뺀다 — 워커와 같은 규칙 */
function activeSchoolIds(): Set<string> {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const rows = readFileSync(path.join(here, 'data/schools.csv'), 'utf8').trim().split('\n').slice(1);
    return new Set(rows.map((r) => r.split(',')[0]).filter(Boolean));
  } catch { return new Set(); }
}

export function migrateDemo(db: Snapshot): Patch | null {
  const changed = new Map<ID, User>();
  for (const u of db.users) {
    if (!SEED_IDS.has(u.id)) continue;
    let next = u;
    if (!u.sample) next = { ...next, sample: true };
    const move = MOVE_TO_MERCED[u.id];
    if (move && next.affiliation.type === 'university' && next.affiliation.schoolId !== MERCED.schoolId) {
      next = { ...next, affiliation: { ...next.affiliation, schoolId: MERCED.schoolId, schoolName: MERCED.schoolName, department: move.department }, living: next.living ? { ...next.living, zone: move.zone } : next.living, freeTime: move.freeTime ?? next.freeTime };
    }
    if (next !== u) changed.set(u.id, next);
  }
  const base = changed.get(DEMO_USER_ID) ?? db.users.find((u) => u.id === DEMO_USER_ID);
  const added: User[] = [];
  if (base && !db.users.some((u) => u.id === demoUserIdFor(MERCED.schoolId))) added.push(mercedDemo(base));

  const users = [...db.users.map((u) => changed.get(u.id) ?? u), ...added];
  const active = activeSchoolIds();
  const withUsers = new Set(users.map((u) => (u.affiliation.type === 'university' ? u.affiliation.schoolId : '')));
  const hideSchools = active.size ? db.schools.filter((s) => !active.has(s.id) && !withUsers.has(s.id)).map((s) => s.id) : [];

  if (!changed.size && !added.length && !hideSchools.length) return null;
  db.users = users;
  if (hideSchools.length) db.schools = db.schools.filter((s) => !hideSchools.includes(s.id));
  return { users: [...changed.values(), ...added], ...(hideSchools.length ? { removed: { schools: hideSchools } } : {}) };
}
