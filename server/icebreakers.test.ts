/**
 * 아이스브레이커 게임 — 결과 계산과 보는 사람별 비밀 지우기.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '@core/api/types';
import type { Game, User } from '@core/types';
import { createEngine } from '@core/api/engine';
import * as seed from '@core/data/seed.en';
import { offeredGames, gameProfileError, thisOrThatResult, guessPickResult, twoTruthsResult, gameFor, stripGameSecrets } from '@core/lib/icebreakers';
import { t } from '@core/i18n';
import { snapshotFor, patchFor } from './view';

const ME = 'u_me';      // Alex
const MAYA = 'u_jimin'; // 핫테이크·두 개의 진실·이모지·맞혀봐 모두 있음
const LILY = 'u_sua';   // 게임 항목 없음

function setup() {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [],
  });
  const engine = createEngine({ db, t, demo: false, push: () => {} });
  const user = (id: string) => db.users.find((u) => u.id === id)!;
  return { db, engine, user };
}

test('pure result functions', () => {
  assert.equal(thisOrThatResult(0, 0), 'same');
  assert.equal(thisOrThatResult(1, 0), 'different');
  assert.equal(guessPickResult('asleep', 'asleep'), 'right');
  assert.equal(guessPickResult('show', 'asleep'), 'wrong');
  assert.equal(twoTruthsResult(1, 1), 'right');
  assert.equal(twoTruthsResult(0, 2), 'wrong');
});

test('this_or_that: pending → recipient answers → chat opens with a game message', () => {
  const { db, engine } = setup();
  const { game } = engine.games.send(ME, MAYA, { kind: 'this_or_that', pairId: 'tt_tacos_ramen', choice: 1 });
  assert.equal(game.status, 'pending');
  assert.equal(game.round, 1);
  assert.ok(db.notifications.some((n) => n.userId === MAYA && n.type === 'game_received'));
  assert.throws(() => engine.games.answer(game.id, ME, 0)); // 보낸 사람은 답할 수 없다
  const { game: done, patch } = engine.games.answer(game.id, MAYA, 0);
  assert.equal(done.status, 'done');
  assert.equal(done.result, 'different');
  const room = db.chatRooms.find((r) => r.id === done.roomId)!;
  assert.equal(room.type, 'direct');
  assert.deepEqual([...room.memberIds].sort(), [ME, MAYA].sort());
  const msg = room.messages.at(-1)!;
  assert.equal(msg.gameId, game.id);
  assert.equal(msg.system, true);
  assert.equal(msg.text, 'This or that · Round 1: Alex 🍜 / Maya 🌮 — Different picks');
  assert.ok(patch.notifications?.some((n) => n.userId === ME && n.type === 'game_result'));
  assert.throws(() => engine.games.answer(game.id, MAYA, 1), /already over/);
  // 다음 판은 같은 방을 재사용하고 라운드가 오른다
  const g2 = engine.games.send(MAYA, ME, { kind: 'this_or_that', pairId: 'tt_cats_dogs', choice: 0 }).game;
  assert.equal(g2.round, 2);
  const r2 = engine.games.answer(g2.id, ME, 0).game;
  assert.equal(r2.result, 'same');
  assert.equal(r2.roomId, done.roomId);
});

test('guess_pick: answer comes from the recipient profile, never from the client', () => {
  const { engine } = setup();
  const right = engine.games.send(ME, MAYA, { kind: 'guess_pick', questionId: 'gp_2am_friday', guess: 'taco_truck' }).game;
  assert.equal(right.status, 'done');
  assert.equal(right.result, 'right');
  assert.ok(right.kind === 'guess_pick' && right.answer === 'taco_truck');
  const wrong = engine.games.send(ME, MAYA, { kind: 'guess_pick', questionId: 'gp_order', guess: 'boba' }).game;
  assert.ok(wrong.kind === 'guess_pick' && wrong.result === 'wrong' && wrong.answer === 'latte');
  // 상대가 답하지 않은 질문, 없는 보기, 같은 질문 다시
  assert.throws(() => engine.games.send(ME, MAYA, { kind: 'guess_pick', questionId: 'gp_finals_fuel', guess: 'coffee' }));
  assert.throws(() => engine.games.send(ME, MAYA, { kind: 'guess_pick', questionId: 'gp_weekend', guess: 'nope' }));
  assert.throws(() => engine.games.send(ME, MAYA, { kind: 'guess_pick', questionId: 'gp_2am_friday', guess: 'show' }), /already played/);
});

test('two_truths, hot_take, emoji_week resolve immediately and notify the profile owner', () => {
  const { db, engine } = setup();
  const tt = engine.games.send(ME, MAYA, { kind: 'two_truths', guessIndex: 1 }).game;
  assert.ok(tt.kind === 'two_truths' && tt.result === 'right' && tt.lieIndex === 1);
  assert.throws(() => engine.games.send(ME, MAYA, { kind: 'two_truths', guessIndex: 0 }), /already played/);
  const ht = engine.games.send(ME, MAYA, { kind: 'hot_take', reaction: 'nope', note: '  Strada wins  ' }).game;
  assert.ok(ht.kind === 'hot_take' && ht.result === 'nope' && ht.note === 'Strada wins' && ht.statement.startsWith('Moffitt'));
  const ew = engine.games.send(ME, MAYA, { kind: 'emoji_week', guess: 'Midterm survived' }).game;
  assert.ok(ew.kind === 'emoji_week' && ew.result === 'revealed' && ew.meaning.startsWith('Way too much coffee'));
  assert.equal(db.notifications.filter((n) => n.userId === MAYA && n.type === 'game_result').length, 3);
  const room = db.chatRooms.find((r) => r.id === tt.roomId)!;
  assert.equal(room.messages.filter((m) => m.gameId).length, 3);
  // 프로필 항목이 없는 사람에게는 할 수 없다
  assert.throws(() => engine.games.send(ME, LILY, { kind: 'two_truths', guessIndex: 0 }));
  assert.throws(() => engine.games.send(ME, LILY, { kind: 'hot_take', reaction: 'agree' }));
});

test('who can receive a game: self, blocks, message policy, rate limit', () => {
  const { db, engine, user } = setup();
  assert.throws(() => engine.games.send(ME, ME, { kind: 'this_or_that', pairId: 'tt_tacos_ramen', choice: 0 }));
  db.relationships.blocks.push({ fromId: LILY, toId: ME });
  assert.throws(() => engine.games.send(ME, LILY, { kind: 'this_or_that', pairId: 'tt_tacos_ramen', choice: 0 }));
  assert.deepEqual(offeredGames(db, user(ME), user(LILY)), []);
  user(MAYA).settings.messagePolicy = 'none';
  assert.throws(() => engine.games.send(ME, MAYA, { kind: 'this_or_that', pairId: 'tt_tacos_ramen', choice: 0 }));
  user(MAYA).settings.messagePolicy = 'friends_only';
  const friend = db.relationships.friends.some((f) => (f.a === ME && f.b === MAYA) || (f.a === MAYA && f.b === ME));
  if (!friend) assert.throws(() => engine.games.send(ME, MAYA, { kind: 'this_or_that', pairId: 'tt_tacos_ramen', choice: 0 }));
  user(MAYA).settings.messagePolicy = 'connected';
  for (let i = 0; i < 3; i++) engine.games.send(ME, MAYA, { kind: 'this_or_that', pairId: 'tt_tacos_ramen', choice: 0 });
  assert.throws(() => engine.games.send(ME, MAYA, { kind: 'this_or_that', pairId: 'tt_tacos_ramen', choice: 0 }), /haven't answered/);
  assert.throws(() => engine.games.send(ME, MAYA, { kind: 'this_or_that', pairId: 'tt_nope', choice: 0 }));
});

test('offeredGames depends on profile data', () => {
  const { db, user } = setup();
  assert.deepEqual(offeredGames(db, user(ME), user(MAYA)), ['this_or_that', 'guess_pick', 'hot_take', 'two_truths', 'emoji_week']);
  assert.deepEqual(offeredGames(db, user(ME), user(LILY)), ['this_or_that']);
  user(MAYA).fieldVisibility.prompts = 'private';
  assert.deepEqual(offeredGames(db, user(ME), user(MAYA)), ['this_or_that']);
});

test('secrets are hidden per viewer in snapshot and patches', () => {
  const { db, engine } = setup();
  const pending = engine.games.send(ME, MAYA, { kind: 'this_or_that', pairId: 'tt_tacos_ramen', choice: 1 });

  // 보낸 사람(Alex)이 보는 Maya: 거짓 위치·이모지 뜻·맞혀봐 답 없음
  const alexView = snapshotFor(db, ME);
  const mayaSeenByAlex = alexView.users.find((u) => u.id === MAYA)!;
  assert.equal(mayaSeenByAlex.twoTruths?.lieIndex, undefined);
  assert.equal(mayaSeenByAlex.twoTruths?.statements.length, 3);
  assert.equal(mayaSeenByAlex.emojiWeek?.meaning, undefined);
  assert.deepEqual(mayaSeenByAlex.emojiWeek?.emojis, ['☕', '📉', '🎸']);
  assert.ok(mayaSeenByAlex.pickAnswers!.length > 0 && mayaSeenByAlex.pickAnswers!.every((a) => a.answer === undefined));
  assert.ok(!JSON.stringify(mayaSeenByAlex).includes('Way too much coffee'));
  // 원본은 그대로
  assert.equal(db.users.find((u) => u.id === MAYA)!.twoTruths?.lieIndex, 1);

  // 본인은 다 본다
  const mayaView = snapshotFor(db, MAYA);
  const self = mayaView.users.find((u) => u.id === MAYA)!;
  assert.equal(self.twoTruths?.lieIndex, 1);
  assert.ok(self.emojiWeek?.meaning);

  // 답하기 전: 받은 사람은 보낸 사람의 선택을 못 본다, 보낸 사람은 자기 선택을 본다
  const gMaya = mayaView.games.find((g) => g.id === pending.game.id) as Extract<Game, { kind: 'this_or_that' }>;
  assert.equal(gMaya.fromChoice, undefined);
  const gAlex = alexView.games.find((g) => g.id === pending.game.id) as Extract<Game, { kind: 'this_or_that' }>;
  assert.equal(gAlex.fromChoice, 1);
  // 제3자는 게임 자체가 안 보인다
  assert.equal(snapshotFor(db, LILY).games.length, 0);
  assert.equal(gameFor(pending.game, LILY), null);
  // 패치(SSE)도 같은 규칙
  const pMaya = patchFor(pending.patch, MAYA, db)!;
  assert.equal((pMaya.games![0] as Extract<Game, { kind: 'this_or_that' }>).fromChoice, undefined);
  assert.equal(patchFor({ games: pending.patch.games }, LILY, db), null);
  const leakTest = patchFor({ users: [db.users.find((u) => u.id === MAYA)!] }, ME, db)!;
  assert.equal(leakTest.users![0].twoTruths?.lieIndex, undefined);

  // 답한 뒤에는 둘 다 결과를 본다
  engine.games.answer(pending.game.id, MAYA, 0);
  const after = snapshotFor(db, MAYA).games.find((g) => g.id === pending.game.id) as Extract<Game, { kind: 'this_or_that' }>;
  assert.equal(after.fromChoice, 1);
  assert.equal(after.toChoice, 0);
});

test('stripGameSecrets leaves users without game data untouched', () => {
  const { user } = setup();
  const lily: User = user(LILY);
  assert.equal(stripGameSecrets(lily, ME), lily);
});

test('profile validation via users.update', () => {
  const { engine, user } = setup();
  assert.equal(gameProfileError({ twoTruths: { statements: ['a', 'b'], lieIndex: 0, updatedAt: '' } }), 'Write all three statements.');
  assert.throws(() => engine.users.update(LILY, { twoTruths: { statements: ['a', 'b', 'c'], lieIndex: 3, updatedAt: '' } }));
  assert.throws(() => engine.users.update(LILY, { pickAnswers: [{ questionId: 'gp_order', answer: 'whiskey' }] }));
  assert.throws(() => engine.users.update(LILY, { emojiWeek: { emojis: ['🎉'], updatedAt: '' } }));
  engine.users.update(LILY, { twoTruths: { statements: [' a ', 'b', 'c'], lieIndex: 2, updatedAt: 'x' }, hotTake: { text: ' Naps > coffee ', updatedAt: 'x' }, pickAnswers: [{ questionId: 'gp_order', answer: 'matcha' }] });
  const l = user(LILY);
  assert.deepEqual(l.twoTruths?.statements, ['a', 'b', 'c']);
  assert.equal(l.hotTake?.text, 'Naps > coffee');
  assert.notEqual(l.hotTake?.updatedAt, 'x');
});
