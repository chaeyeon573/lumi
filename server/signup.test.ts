/**
 * Sign-up rules (WP1 onboarding S008–S011): Lumi is 16+, the year chips map to the entry year the rest of the
 * app reads (yearMajor), and the signed-out org search (S010) only returns public names of one school's clubs.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Organization, User } from '@core/types';
import { birthYearProblem, entryYearFor, searchOrgs, MIN_AGE } from '@core/lib/signup';
import { yearMajor } from '@core/lib/sayhi';

test('birthYearProblem: 16+ by birth year, nonsense refused', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  assert.equal(MIN_AGE, 16);
  assert.equal(birthYearProblem(2010, now), null);            // turns 16 this year
  assert.equal(birthYearProblem(2011, now), 'under_16');
  assert.equal(birthYearProblem('2004', now), null);          // the screen sends a number, but be lenient
  assert.equal(birthYearProblem(undefined, now), 'invalid');
  assert.equal(birthYearProblem(NaN, now), 'invalid');
  assert.equal(birthYearProblem(2004.5, now), 'invalid');
  assert.equal(birthYearProblem(1850, now), 'invalid');
  assert.equal(birthYearProblem(2030, now), 'invalid');
});

test('entryYearFor: year chips → entry year that yearMajor reads back the same', () => {
  const nov = new Date('2026-11-05T12:00:00Z');
  const may = new Date('2026-05-05T12:00:00Z');
  assert.equal(entryYearFor(1, nov), 2026);
  assert.equal(entryYearFor(2, nov), 2025);
  assert.equal(entryYearFor(4, nov), 2023);
  assert.equal(entryYearFor(2, may), 2024);                   // spring: academic year started last August
  assert.equal(entryYearFor(undefined, nov), 2026);           // optional — unanswered = first year
  assert.equal(entryYearFor(9, nov), 2023);                   // 4th+
  const u = (year: number) => ({ affiliation: { type: 'university', role: 'undergraduate', year, department: '', showDepartment: false } }) as unknown as User;
  for (const [n, label] of [[1, 'Freshman'], [2, 'Sophomore'], [3, 'Junior'], [4, 'Senior']] as const) {
    assert.equal(yearMajor(u(entryYearFor(n, nov)), true, nov), label);
    assert.equal(yearMajor(u(entryYearFor(n, may)), true, may), label);
  }
});

const org = (id: string, name: string, extra: Partial<Organization> = {}): Organization => ({
  id, name, description: 'secret description', logo: { emoji: '', hue: 0 }, type: 'club', schoolId: 's_berkeley', verified: false,
  gallery: [], regularActivities: [], notices: [], followerIds: ['u_a', 'u_b'], memberIds: ['u_a'], adminIds: ['u_a'], applicantIds: [], ...extra,
});

test('searchOrgs: one school, name only, prefix first, offices and hidden ids left out', () => {
  const orgs = [
    org('o1', 'Berkeley Photography Club'),
    org('o2', 'Photography Society'),
    org('o3', 'Cal Climbing'),
    org('o4', 'Photo Office', { type: 'department' }),
    org('o5', 'Photography Club', { schoolId: 's_ucmerced' }),
    org('o6', 'Photography Demo', {}),
    org('o7', 'Sigma Phi', { type: 'greek' }),
  ];
  const hits = searchOrgs(orgs, 's_berkeley', '  photo ', { hide: new Set(['o6']) });
  assert.deepEqual(hits.map((h) => h.id), ['o2', 'o1']);
  // public facts only — no members, followers, admins or descriptions leave the server before sign-up
  assert.deepEqual(Object.keys(hits[0]).sort(), ['id', 'name', 'type']);
  assert.deepEqual(searchOrgs(orgs, 's_berkeley', 'p'), []);   // 2+ characters
  assert.deepEqual(searchOrgs(orgs, '', 'photo'), []);
  assert.deepEqual(searchOrgs(orgs, 's_berkeley', 'sigma').map((h) => h.type), ['greek']);
  assert.equal(searchOrgs(Array.from({ length: 50 }, (_, i) => org(`x${i}`, `Club ${i}`)), 's_berkeley', 'club', { limit: 100 }).length, 20);
});
