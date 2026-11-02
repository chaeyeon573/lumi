import test from 'node:test';
import assert from 'node:assert/strict';
import { filterLiveOpportunities } from '../lib/stack.mjs';

test('live snapshot → fixtures: own school + national, no samples / demo rows / far events, no other students\' words', () => {
  const all = [
    { id: 'ev1', type: 'event', schoolId: 's_berkeley', date: '2026-11-03T19:00:00Z', qna: [{ q: 'from a real student' }], reviews: [{ r: 1 }] },
    { id: 'ev_old', type: 'event', schoolId: 's_berkeley', date: '2026-10-01' },
    { id: 'ev_far', type: 'event', schoolId: 's_berkeley', date: '2027-01-01' },
    { id: 'm1', type: 'event', schoolId: 's_ucmerced', date: '2026-11-03' },
    { id: 'in1', type: 'internship', qna: [], reviews: [] },
    { id: 'op_lunch', type: 'event', schoolId: 's_berkeley', date: '2026-11-03' },
    { id: 'demo', type: 'event', schoolId: 's_berkeley', date: '2026-11-03', sourceUrl: 'https://example.com/x' },
    { id: 'flagged', type: 'lab', sample: true },
  ];
  const { kept, dropped } = filterLiveOpportunities(all, { schoolId: 's_berkeley', samples: new Set(['op_lunch']), from: '2026-11-01', to: '2026-11-22' });
  assert.deepEqual(kept.map((o) => o.id), ['ev1', 'in1']);
  assert.deepEqual(kept[0].qna, []); assert.deepEqual(kept[0].reviews, []);
  assert.deepEqual(dropped, { otherSchool: 1, sample: 2, demoUrl: 1, pastOrFarEvent: 2 });
});
