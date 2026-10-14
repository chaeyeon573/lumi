/**
 * 다른 사람에게 가는 스냅샷·패치에 공개 범위 밖의 것이 없는지 (server/view.ts · @core/lib/privacy).
 * 각 경우마다 보는 사람의 스냅샷과 패치 둘 다 확인하고, 본인은 자기 것을 그대로 받는지도 본다.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Patch, Snapshot } from '@core/api/types';
import type { Post, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { createEngine } from '@core/api/engine';
import { mergePatch } from '@core/store/merge';
import { canViewField } from '@core/lib/relations';
import { snapshotFor, patchFor } from './view';
import { moderationChanged } from './moderation';

// 시드 사용자는 sample 표시가 없어서 여기서는 모두 실제 계정처럼 서로를 본다
const db = (): Snapshot => {
  const d: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [],
  });
  // 깨끗한 관계에서 시작한다
  d.relationships = { likes: [], follows: [], friendRequests: [], friends: [], blocks: [] };
  return d;
};
const engineFor = (d: Snapshot) => createEngine({ db: d, t: (s) => s, demo: false, push: () => {} });
const user = (d: Snapshot, id: string) => d.users.find((u) => u.id === id)!;
const seen = (s: Snapshot | Patch | null, id: string) => s?.users?.find((u) => u.id === id);
/** 스냅샷과 그 사람 하나를 담은 패치 — 둘 다 같은 모양이어야 한다 */
const both = (d: Snapshot, viewer: string, owner: string) => [seen(snapshotFor(d, viewer), owner), seen(patchFor({ users: [user(d, owner)] }, viewer, d), owner)];

const OWNER = 'u_jimin', VIEWER = 'u_me', OTHER = 'u_sua';

test('profile fields outside their visibility are not sent at all (snapshot and patch); the owner keeps everything', () => {
  const d = db();
  const o = user(d, OWNER);
  o.height = 168;
  o.preferredPartner = 'Someone who likes museums';
  o.fieldVisibility = { ...o.fieldVisibility, bio: 'private', likes: 'friends', height: 'friends', prompts: 'friends', living: 'private', goals: 'friends', interests: 'public', preferredPartner: 'private', availability: 'friends' };
  for (const u of both(d, VIEWER, OWNER)) {
    assert.ok(u, 'owner still visible as a person');
    for (const k of ['bio', 'likes', 'height', 'prompts', 'voicePrompt', 'poll', 'living', 'goals', 'preferredPartner', 'availability', 'dailyAnswer'] as const) assert.equal(k in u!, false, `${k} leaked`);
    assert.ok(u!.interests?.length, 'public interests still sent');
    assert.deepEqual([...u!.viewable!].sort().includes('bio'), false);
    // 화면이 같은 답을 낸다: 서버가 보낸 viewable 을 따른다
    assert.equal(canViewField(snapshotFor(d, VIEWER), user(d, VIEWER), u!, 'bio'), false);
    assert.equal(canViewField(snapshotFor(d, VIEWER), user(d, VIEWER), u!, 'interests'), true);
  }
  // 친구가 되면 friends 항목이 열린다
  d.relationships.friends.push({ a: OWNER, b: VIEWER, since: '2026-10-01' });
  for (const u of both(d, VIEWER, OWNER)) { assert.equal(u!.likes, o.likes); assert.equal(u!.height, 168); assert.ok(u!.prompts?.length); assert.equal('bio' in u!, false); }
  // 본인은 모두
  const mine = seen(snapshotFor(d, OWNER), OWNER)!;
  assert.equal(mine.bio, o.bio); assert.equal(mine.preferredPartner, o.preferredPartner); assert.deepEqual(mine.living, o.living);
  assert.equal(mine.viewable, undefined);
});

test('owner-only details never reach anyone else: gender, saved clubs, meet preferences, settings, classmate opt-outs', () => {
  const d = db();
  const o = user(d, OWNER);
  o.gender = 'female'; o.interestedOrgIds = ['o_startup']; o.meetPreference = ['same_goal']; o.showToClassmates = false; o.studyGroupOptOut = ['x']; o.settings.locationPermission = 'granted';
  for (const viewer of [VIEWER, OTHER]) for (const u of both(d, viewer, OWNER)) {
    for (const k of ['gender', 'interestedOrgIds', 'meetPreference', 'showToClassmates', 'studyGroupOptOut', 'partnerSearch'] as const) assert.equal(k in u!, false, `${k} leaked`);
    assert.deepEqual(u!.settings, { messagePolicy: o.settings.messagePolicy });
  }
  const mine = seen(snapshotFor(d, OWNER), OWNER)!;
  assert.equal(mine.gender, 'female'); assert.deepEqual(mine.interestedOrgIds, ['o_startup']); assert.equal(mine.settings.locationPermission, 'granted');
});

test('hidden school name (other schools) and hidden department (everyone) are not sent', () => {
  const d = db();
  const o = user(d, OWNER);
  if (o.affiliation.type !== 'university') throw new Error('seed');
  o.affiliation.showSchool = false; o.affiliation.showDepartment = false;
  const merced = structuredClone(user(d, OTHER));
  merced.id = 'u_merced'; merced.affiliation = { ...merced.affiliation, schoolId: 's_ucmerced', schoolName: 'UC Merced' } as User['affiliation'];
  d.users.push(merced);
  for (const u of both(d, 'u_merced', OWNER)) {
    const a = u!.affiliation; assert.equal(a.type, 'university');
    if (a.type === 'university') { assert.equal('schoolId' in a, false); assert.equal('schoolName' in a, false); assert.equal('department' in a, false); }
    assert.equal(JSON.stringify(u).includes('UC Berkeley'), false);
  }
  for (const u of both(d, VIEWER, OWNER)) {
    const a = u!.affiliation;
    if (a.type === 'university') { assert.equal(a.schoolId, 's_berkeley'); assert.equal('department' in a, false); }
  }
  const mine = seen(snapshotFor(d, OWNER), OWNER)!.affiliation;
  if (mine.type === 'university') assert.equal(mine.department, 'Business (Haas)');
});

test('timetable: course names, rooms and instructors never leave; hidden timetable sends nothing', () => {
  const d = db();
  const o = user(d, VIEWER); // 수업 이름·강의실이 있는 시간표
  o.fieldVisibility = { ...o.fieldVisibility, timetable: 'school' };
  for (const u of both(d, OWNER, VIEWER)) {
    assert.ok(u!.timetable?.length);
    assert.ok(u!.timetable!.every((c) => !c.name && !c.room && !c.professor && !c.code && !c.url));
    assert.equal(JSON.stringify(u).includes('Soda 306'), false);
  }
  o.fieldVisibility = { ...o.fieldVisibility, timetable: 'friends' };
  for (const u of both(d, OWNER, VIEWER)) assert.equal('timetable' in u!, false);
});

test('profile poll: others get my vote and the tally, never who voted for what', () => {
  const d = db();
  const o = user(d, OWNER); // votes: { u_sua: 0, u_taeho: 1, u_hana: 0 }
  o.fieldVisibility = { ...o.fieldVisibility, prompts: 'public' };
  for (const u of both(d, OTHER, OWNER)) { assert.deepEqual(u!.poll!.votes, { [OTHER]: 0 }); assert.deepEqual(u!.poll!.tally, [2, 1, 0]); }
  for (const u of both(d, VIEWER, OWNER)) { assert.deepEqual(u!.poll!.votes, {}); assert.deepEqual(u!.poll!.tally, [2, 1, 0]); }
  assert.deepEqual(seen(snapshotFor(d, OWNER), OWNER)!.poll!.votes, o.poll!.votes);
});

test('relationships: only the ones I am part of; likes I received only when mutual; blocks only my own', () => {
  const d = db();
  const r = d.relationships;
  r.likes.push({ fromId: OWNER, toId: VIEWER, createdAt: 'x' }, { fromId: OTHER, toId: 'u_taeho', createdAt: 'x' });
  r.follows.push({ fromId: OTHER, toId: OWNER, targetType: 'user' }, { fromId: OWNER, toId: VIEWER, targetType: 'user' });
  r.friends.push({ a: OTHER, b: 'u_taeho', since: 'x' }, { a: VIEWER, b: 'u_taeho', since: 'x' });
  r.friendRequests.push({ id: 'fr1', fromId: OTHER, toId: OWNER, status: 'pending', createdAt: 'x' });
  r.blocks.push({ fromId: 'u_hana', toId: VIEWER }, { fromId: VIEWER, toId: 'u_woojin' }, { fromId: OTHER, toId: 'u_taeho' });
  const check = (rel: Snapshot['relationships']) => {
    assert.deepEqual(rel.likes, []); // OWNER→me 는 내가 관심을 표시하지 않았으니 모른다
    assert.deepEqual(rel.follows, [{ fromId: OWNER, toId: VIEWER, targetType: 'user' }]);
    assert.deepEqual(rel.friends, [{ a: VIEWER, b: 'u_taeho', since: 'x' }]);
    assert.deepEqual(rel.friendRequests, []);
    assert.deepEqual(rel.blocks, [{ fromId: VIEWER, toId: 'u_woojin' }]);
  };
  check(snapshotFor(d, VIEWER).relationships);
  check(patchFor({ relationships: r }, VIEWER, d)!.relationships!);
  // 서로 관심이 되면 상대 ♥ 도 보인다
  r.likes.push({ fromId: VIEWER, toId: OWNER, createdAt: 'y' });
  assert.equal(snapshotFor(d, VIEWER).relationships.likes.length, 2);
  // 나를 차단한 사람은 아예 없다 (차단당했다는 기록도 없다)
  const s = snapshotFor(d, VIEWER);
  assert.equal(seen(s, 'u_hana'), undefined);
  assert.equal(JSON.stringify(s.relationships).includes('u_hana'), false);
  assert.equal(seen(patchFor({ users: [user(d, 'u_hana')] }, VIEWER, d), 'u_hana'), undefined);
  // 내가 차단한 사람은 이름·사진만 (차단 해제 화면용) — 공개 항목은 하나도 없다
  const blocked = seen(s, 'u_woojin')!;
  assert.deepEqual(blocked.viewable, []);
  assert.equal('bio' in blocked, false);
});

test('mutual friends: only a count, computed on the server', () => {
  const d = db();
  d.relationships.friends.push({ a: VIEWER, b: 'u_taeho', since: 'x' }, { a: OWNER, b: 'u_taeho', since: 'x' }, { a: OWNER, b: 'u_hana', since: 'x' });
  for (const u of both(d, VIEWER, OWNER)) assert.equal(u!.mutualFriendCount, 1);
  assert.equal(seen(snapshotFor(d, VIEWER), OTHER)!.mutualFriendCount, undefined);
  // 다른 사람의 친구 목록은 오지 않는다
  assert.equal(snapshotFor(d, VIEWER).relationships.friends.some((f) => f.a === OWNER || f.b === OWNER), false);
});

const anonPost = (authorId: string): Post => ({
  id: 'po_anon', authorId, authorType: 'user', media: [], text: 'secret worry', tags: [], visibility: 'school', anonymous: true,
  likeIds: [authorId, OTHER], savedIds: [authorId], createdAt: '2026-10-12T00:00:00Z',
  comments: [{ id: 'c1', authorId: OTHER, text: 'same', createdAt: 'x' }, { id: 'c2', authorId, text: 'thanks', createdAt: 'y' }],
});

test('anonymous posts: no author id, comment authors or likes that point at the author — except for the author', () => {
  const d = db();
  d.posts.push(anonPost(OWNER));
  const forViewer = [snapshotFor(d, VIEWER).posts.find((p) => p.id === 'po_anon')!, patchFor({ posts: [anonPost(OWNER)] }, VIEWER, d)!.posts![0]];
  for (const p of forViewer) {
    assert.ok(p);
    assert.equal(JSON.stringify(p).includes(OWNER), false, 'author id leaked');
    assert.equal('authorId' in p, false);
    assert.equal(p.anonSchool, 'UC Berkeley');
    assert.deepEqual(p.likeIds, []); assert.equal(p.likeCount, 2); assert.deepEqual(p.savedIds, []);
    assert.equal(p.comments[1].byAuthor, true); assert.equal('authorId' in p.comments[1], false);
    assert.equal('authorId' in p.comments[0], false);
  }
  // 댓글 단 사람은 자기 댓글만 알아본다
  const forCommenter = snapshotFor(d, OTHER).posts.find((p) => p.id === 'po_anon')!;
  assert.equal(forCommenter.comments[0].authorId, OTHER); assert.deepEqual(forCommenter.likeIds, [OTHER]);
  assert.equal(JSON.stringify(forCommenter).includes(OWNER), false);
  // 글쓴이는 자기 글임을 안다
  const forAuthor = snapshotFor(d, OWNER).posts.find((p) => p.id === 'po_anon')!;
  assert.equal(forAuthor.authorId, OWNER); assert.equal(forAuthor.comments[1].byAuthor, true);
  // 서버 데이터에는 글쓴이가 그대로 남아 신고를 처리할 수 있다
  assert.equal(d.posts.find((p) => p.id === 'po_anon')!.authorId, OWNER);
  // 글쓴이가 정지되면 익명 글도 다른 사람에게서 사라진다 (공개 범위로 글쓴이를 지우기 전에 운영 조치를 먼저 건다)
  user(d, OWNER).suspended = { at: 'x', by: 'admin', reason: 'test' }; moderationChanged();
  assert.equal(snapshotFor(d, VIEWER).posts.some((p) => p.id === 'po_anon'), false);
  assert.deepEqual(patchFor({ posts: [anonPost(OWNER)] }, VIEWER, d)?.removed?.posts, ['po_anon']);
  user(d, OWNER).suspended = undefined; moderationChanged();
});

test('posts and activities outside their visibility are not sent; pending requests and their messages stay with the host', () => {
  const d = db();
  const post: Post = { ...anonPost(OWNER), id: 'po_friends', anonymous: false, visibility: 'friends', comments: [] };
  d.posts.push(post);
  const act = { ...structuredClone(d.activities[0]), id: 'a_friends', hostId: OWNER, visibility: 'friends' as const, studyGroup: undefined, sample: undefined };
  d.activities.push(act);
  d.participations.push({ id: 'pp1', activityId: d.activities[0].id, userId: OTHER, status: 'pending', message: 'please let me in', createdAt: 'x' });
  assert.equal(snapshotFor(d, VIEWER).posts.some((p) => p.id === 'po_friends'), false);
  assert.equal(patchFor({ posts: [post] }, VIEWER, d), null);
  assert.equal(snapshotFor(d, VIEWER).activities.some((a) => a.id === 'a_friends'), false);
  d.relationships.friends.push({ a: OWNER, b: VIEWER, since: 'x' });
  assert.equal(snapshotFor(d, VIEWER).posts.some((p) => p.id === 'po_friends'), true);
  assert.equal(snapshotFor(d, VIEWER).activities.some((a) => a.id === 'a_friends'), true);
  // 다른 사람의 대기 중 신청은 연 사람만
  const host = d.activities[0].hostId;
  const viewer = [VIEWER, OWNER, 'u_taeho'].find((id) => id !== host && id !== OTHER)!;
  assert.equal(snapshotFor(d, viewer).participations.some((p) => p.id === 'pp1'), false);
  assert.equal(patchFor({ participations: [d.participations.at(-1)!] }, viewer, d), null);
  assert.equal(snapshotFor(d, host).participations.find((p) => p.id === 'pp1')?.message, 'please let me in');
  assert.equal(snapshotFor(d, OTHER).participations.find((p) => p.id === 'pp1')?.message, 'please let me in');
  // 승인된 참가는 보이지만 신청 메시지는 빠진다
  const approved = d.participations.find((p) => p.status === 'approved' && p.message && p.userId !== viewer && d.activities.find((a) => a.id === p.activityId)?.hostId !== viewer);
  if (approved) { const got = snapshotFor(d, viewer).participations.find((p) => p.id === approved.id); if (got) assert.equal('message' in got, false); }
});

test('club applicants, other people\'s saved listings and other people\'s time polls stay private', () => {
  const d = db();
  // 시드 동아리는 예시라 실제 계정에게 안 간다 — 실제 동아리를 하나 만든다
  const org = { ...structuredClone(d.organizations[0]), id: 'o_real', schoolId: 's_berkeley', applicantIds: [OTHER, VIEWER], adminIds: [OWNER], memberIds: [OWNER] };
  d.organizations.push(org);
  assert.deepEqual(snapshotFor(d, VIEWER).organizations.find((o) => o.id === org.id)!.applicantIds, [VIEWER]);
  assert.deepEqual(patchFor({ organizations: [org] }, 'u_taeho', d)?.organizations?.[0]?.applicantIds ?? [], []);
  assert.deepEqual(snapshotFor(d, OWNER).organizations.find((o) => o.id === org.id)!.applicantIds, [OTHER, VIEWER]);

  const opp = { ...structuredClone(d.opportunities[0]), id: 'op_real' };
  d.opportunities.push(opp);
  d.opportunityIntents.push({ id: 'oi_saved', opportunityId: opp.id, userId: OTHER, intent: 'interested', saved: true, createdAt: 'x' },
    { id: 'oi_going', opportunityId: opp.id, userId: OTHER, intent: 'going', saved: true, createdAt: 'x' });
  const intents = snapshotFor(d, VIEWER).opportunityIntents;
  assert.equal(intents.some((i) => i.id === 'oi_saved'), false);
  assert.equal('saved' in intents.find((i) => i.id === 'oi_going')!, false);
  assert.equal(snapshotFor(d, OTHER).opportunityIntents.find((i) => i.id === 'oi_saved')!.saved, true);

  d.timePolls.push({ id: 'tp_x', hostId: OWNER, title: 'Secret dinner', category: 'meal', inviteeIds: [OTHER], options: [], votes: {}, status: 'open', closesAt: 'x', createdAt: 'x' });
  assert.equal(snapshotFor(d, VIEWER).timePolls.some((p) => p.id === 'tp_x'), false);
  assert.equal(snapshotFor(d, OTHER).timePolls.some((p) => p.id === 'tp_x'), true);
  assert.equal(patchFor({ timePolls: [d.timePolls.at(-1)!] }, VIEWER, d), null);
});

test('relationship changes through the engine: newly visible fields arrive, hidden ones go, a block removes the blocker', () => {
  const d = db();
  const e = engineFor(d);
  const o = user(d, OWNER);
  o.fieldVisibility = { ...o.fieldVisibility, likes: 'friends' };
  d.posts.push({ ...anonPost(OWNER), id: 'po_f', anonymous: false, visibility: 'friends', comments: [] });
  let screen = snapshotFor(d, VIEWER);
  assert.equal('likes' in seen(screen, OWNER)!, false);
  // 친구 요청 수락 → 내 화면에 친구 공개 항목과 친구 공개 글이 들어온다
  const sent = e.relationships.sendFriendRequest(VIEWER, OWNER);
  screen = mergePatch(screen, patchFor(sent, VIEWER, d) ?? {});
  const reqId = d.relationships.friendRequests.at(-1)!.id;
  screen = mergePatch(screen, patchFor(e.relationships.respondFriendRequest(reqId, true), VIEWER, d)!);
  assert.equal(seen(screen, OWNER)!.likes, o.likes);
  assert.ok(screen.posts.some((p) => p.id === 'po_f'));
  // 친구를 끊으면 다시 닫힌다
  screen = mergePatch(screen, patchFor(e.relationships.unfriend(VIEWER, OWNER), VIEWER, d)!);
  assert.equal('likes' in seen(screen, OWNER)!, false);
  assert.equal(screen.posts.some((p) => p.id === 'po_f'), false);
  // 상대가 나를 차단하면 그 사람이 화면에서 사라지고, 차단 기록은 오지 않는다
  const blockPatch = e.relationships.block(OWNER, VIEWER);
  const mine = patchFor(blockPatch, VIEWER, d)!;
  assert.deepEqual(mine.removed?.users, [OWNER]);
  assert.equal(seen(mine, OWNER), undefined);
  assert.deepEqual(mine.relationships!.blocks, []);
  screen = mergePatch(screen, mine);
  assert.equal(seen(screen, OWNER), undefined);
  // 차단한 사람은 상대를 그대로(공개 항목 없이) 본다 — 차단 해제 화면용
  const theirs = patchFor(blockPatch, OWNER, d)!;
  assert.deepEqual(seen(theirs, VIEWER)!.viewable, []);
  assert.deepEqual(theirs.relationships!.blocks, [{ fromId: OWNER, toId: VIEWER }]);
});
