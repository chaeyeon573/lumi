import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '@core/api/types';
import * as seed from '@core/data/seed.en';
import { createEngine } from '@core/api/engine';
import { snapshotFor } from './view';
import { eraseUser } from '@core/lib/account';
import { t } from '@core/i18n';

test('Interested: toggles, not a participant, and each viewer only sees their own mark', () => {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [], rides: [],
  });
  const engine = createEngine({ db, t, demo: false, push: () => {} });
  const a = db.activities.find((x) => x.visibility === 'public' || x.visibility === 'school')!;
  const [u1, u2] = db.users.filter((u) => u.id !== a.hostId && u.affiliation.type === 'university').slice(0, 2);
  engine.activities.toggleInterest(a.id, u1.id);
  engine.activities.toggleInterest(a.id, u2.id);
  assert.deepEqual(db.activities.find((x) => x.id === a.id)!.interestedIds, [u1.id, u2.id]);
  assert.equal(db.participations.some((p) => p.activityId === a.id && (p.userId === u1.id || p.userId === u2.id)), false);
  const seen = snapshotFor(db, u1.id).activities.find((x) => x.id === a.id);
  if (seen) assert.deepEqual(seen.interestedIds, [u1.id]);
  engine.activities.toggleInterest(a.id, u1.id);
  assert.deepEqual(db.activities.find((x) => x.id === a.id)!.interestedIds, [u2.id]);
  eraseUser(db, u2.id);
  assert.deepEqual(db.activities.find((x) => x.id === a.id)?.interestedIds ?? [], []);
});
