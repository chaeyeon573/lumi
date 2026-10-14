/**
 * App Review sign-in (server/review-login.ts) and what Ask Lumi / recommendations see (moderation.aiViewFor).
 *   - off unless REVIEW_LOGIN_EMAIL + a 6-digit REVIEW_LOGIN_CODE are set; then only that exact address takes the code
 *   - the review account is created once, as a real (non-sample) UC Berkeley account with a verified school e-mail
 *   - wrong codes are rate-limited per address and in total; the code never appears in a log line
 *   - suspended people and their content are not in the data Ask Lumi and recommendations search
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Snapshot } from '@core/api/types';
import type { Activity, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createEngine } from '@core/api/engine';
import { FileStore } from './store';
import { codeMatches, createReviewLogin, reviewConfig, REVIEW_SCHOOL_ID, ReviewLoginError } from './review-login';
import { aiViewFor, moderationChanged } from './moderation';
import { searchActivities } from './ai-search';
import { starterFacts } from './ai';

const EMAIL = 'appreview@lumi.example';
const CODE = '482913';
const WRONG = 'The code expired or is wrong.';

function snapshot(): Snapshot {
  const db = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: [], reports: [], opportunities: seed.opportunities,
    opportunityIntents: [], timePolls: [], games: [], rides: [],
  }) as unknown as Snapshot;
  for (const u of db.users) u.sample = true;
  return db;
}

async function setup(env: Record<string, string> = { REVIEW_LOGIN_EMAIL: 'AppReview@Lumi.example', REVIEW_LOGIN_CODE: CODE }) {
  const db = snapshot();
  const store = new FileStore(path.join(mkdtempSync(path.join(tmpdir(), 'lumi-review-')), 'db.json')); await store.init();
  const engine = createEngine({ db, t, demo: false, push: () => {} });
  const logs: string[] = [];
  let clock = Date.now();
  let saved = 0;
  const review = createReviewLogin({
    config: reviewConfig(env, (m) => logs.push(m)), db: () => db,
    findAccount: (e) => store.findAccount(e), createAccount: (a) => store.createAccount(a),
    register: (input) => engine.register(input), saved: async () => { saved++; },
    wrongCode: WRONG, now: () => clock, log: (m) => logs.push(m),
  });
  return { db, store, review, logs, tick: (ms: number) => { clock += ms; }, saved: () => saved };
}
const fails = async (p: Promise<unknown>, status: number) => {
  await assert.rejects(p, (e) => e instanceof ReviewLoginError && e.status === status);
};

test('config: off when unset or malformed; the code compare is constant-time and exact', () => {
  const logs: string[] = [];
  assert.equal(reviewConfig({}, (m) => logs.push(m)), null);
  assert.equal(logs.length, 0, 'unset is silent');
  assert.equal(reviewConfig({ REVIEW_LOGIN_EMAIL: EMAIL }, (m) => logs.push(m)), null);
  assert.equal(reviewConfig({ REVIEW_LOGIN_EMAIL: EMAIL, REVIEW_LOGIN_CODE: '12345' }, (m) => logs.push(m)), null);
  assert.equal(reviewConfig({ REVIEW_LOGIN_EMAIL: 'not-an-email', REVIEW_LOGIN_CODE: CODE }, (m) => logs.push(m)), null);
  assert.ok(logs.every((l) => !l.includes(CODE) && !l.includes('12345')), 'config warnings never print the code');
  const cfg = reviewConfig({ REVIEW_LOGIN_EMAIL: ` ${EMAIL.toUpperCase()} `, REVIEW_LOGIN_CODE: ` ${CODE} ` })!;
  assert.deepEqual(cfg, { email: EMAIL, code: CODE });
  assert.ok(codeMatches(cfg, CODE));
  assert.ok(codeMatches(cfg, ` ${CODE}`));
  assert.ok(!codeMatches(cfg, '482914'));
  assert.ok(!codeMatches(cfg, `${CODE}0`));
  assert.ok(!codeMatches(cfg, ''));
  assert.ok(!codeMatches(cfg, undefined));
});

test('env unset: the address is ordinary — no special handling at all', async () => {
  const { review } = await setup({});
  assert.equal(review.enabled, false);
  assert.equal(review.matches(EMAIL), false);
  assert.equal(review.matches(''), false);
});

test('only that exact address (any case) matches; the code signs in to one real, verified Berkeley account', async () => {
  const { review, db, store, logs, saved } = await setup();
  assert.ok(review.matches('appreview@lumi.example'));
  assert.ok(review.matches(' APPREVIEW@LUMI.EXAMPLE '));
  assert.ok(!review.matches('appreview@lumi.example.com'));
  assert.ok(!review.matches('someone@berkeley.edu'));

  const before = db.users.length;
  const user = await review.signIn(CODE, '1.2.3.4');
  assert.equal(db.users.length, before + 1);
  assert.equal(saved(), 1, 'persisted + broadcast');
  assert.ok(!user.sample, 'not a sample/demo profile');
  assert.equal(user.affiliation.type, 'university');
  assert.equal(user.affiliation.type === 'university' && user.affiliation.schoolId, REVIEW_SCHOOL_ID);
  assert.equal(user.affiliation.type === 'university' && user.affiliation.emailVerified, true);
  assert.equal(user.settings.notifications, true);
  assert.deepEqual(await store.findAccount(EMAIL), { email: EMAIL, userId: user.id, createdAt: (await store.findAccount(EMAIL))!.createdAt });

  const again = await review.signIn(CODE, '5.6.7.8');
  assert.equal(again.id, user.id, 'the same account next time');
  assert.equal(db.users.length, before + 1);
  assert.equal(saved(), 1);
  assert.ok(logs.some((l) => l.startsWith('[review] signed in as') && l.includes('(account created)')));
  assert.ok(logs.every((l) => !l.includes(CODE)), `the code was logged: ${logs.join(' | ')}`);
});

test('deleted in Settings → a fresh review account next sign-in', async () => {
  const { review, db, store } = await setup();
  const first = await review.signIn(CODE, 'ip');
  db.users = db.users.filter((u) => u.id !== first.id);
  await store.forgetUser(first.id);
  const second = await review.signIn(CODE, 'ip');
  assert.notEqual(second.id, first.id);
});

test('wrong codes: the normal error, 10 per address per 15 min, 50 in total per hour → 429 even for the right code', async () => {
  const { review, logs, tick } = await setup();
  for (let i = 0; i < 10; i++) await assert.rejects(review.signIn('000000', '9.9.9.9'), (e) => e instanceof ReviewLoginError && e.status === 400 && e.message === WRONG);
  await fails(review.signIn(CODE, '9.9.9.9'), 429);
  assert.equal(review.verify(CODE, '1.1.1.1'), true, 'another address is not locked out');
  tick(15 * 60 * 1000 + 1);
  assert.equal((await review.signIn(CODE, '9.9.9.9')).nickname, 'Lumi Review', 'the window passed');
  // distributed guessing: 50 wrong codes in total lock everyone out for the hour
  tick(60 * 60 * 1000);
  for (let i = 0; i < 50; i++) assert.equal(review.verify('111111', `10.0.${i}.1`), false);
  await fails(review.signIn(CODE, '8.8.8.8'), 429);
  assert.throws(() => review.verify(CODE, '7.7.7.7'), (e) => e instanceof ReviewLoginError && e.status === 429);
  tick(60 * 60 * 1000 + 1);
  assert.ok(await review.signIn(CODE, '8.8.8.8'));
  assert.ok(logs.some((l) => l.includes('too many wrong codes')));
  assert.ok(logs.every((l) => !l.includes(CODE)));
});

test('Ask Lumi / recommendations data: no suspended people or their meetups, reviews or rosters', () => {
  const db = snapshot();
  const base = structuredClone(seed.users.find((u) => u.id === 'u_me')!) as User;
  const real = (id: string, nickname: string): User => ({ ...base, id, nickname, sample: undefined });
  const viewer = real('u_ai_viewer', 'Viewer'), bad = real('u_ai_bad', 'Bad Actor'), good = real('u_ai_good', 'Good');
  bad.suspended = { at: new Date().toISOString(), by: 'test', reason: 'spam' };
  db.users.push(viewer, bad, good);
  const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const meetup = (id: string, hostId: string, title: string): Activity => ({ ...structuredClone(seed.activities[0]), id, hostId, title, description: title, date: day, visibility: 'public', visibilityTargets: undefined, sample: undefined });
  db.activities.push(meetup('a_ai_bad', bad.id, 'Late night ramen run'), meetup('a_ai_good', good.id, 'Late night ramen walk'));
  db.opportunities[0].reviews.push({ id: 'rv_bad', authorId: bad.id, text: 'spam review', createdAt: new Date().toISOString() });
  moderationChanged();

  const view = aiViewFor(db, viewer);
  assert.ok(!view.users.some((u) => u.id === bad.id));
  assert.ok(!view.activities.some((a) => a.id === 'a_ai_bad'));
  assert.ok(!view.opportunities.some((o) => o.reviews.some((r) => r.id === 'rv_bad')));
  assert.ok(view.users.some((u) => u.id === good.id));
  const found = searchActivities(view, viewer, new Date().toISOString().slice(0, 10), { query: 'ramen' }).map((r) => r.card.id);
  assert.deepEqual(found, ['a_ai_good']);
  // without the filter the suspended person's meetup would have been an answer
  assert.ok(searchActivities(db, viewer, new Date().toISOString().slice(0, 10), { query: 'ramen' }).some((r) => r.card.id === 'a_ai_bad'));
  // sign-up suggestions (no viewer) — same rule
  assert.ok(!aiViewFor(db).activities.some((a) => a.id === 'a_ai_bad'));
  // sample people stay hidden from real accounts as before
  assert.ok(!view.users.some((u) => u.sample));
  // conversation starters only mention people the viewer can still see
  assert.ok(!JSON.stringify(starterFacts(view, viewer, good)).includes('Bad Actor'));
});
