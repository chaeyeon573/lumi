import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanOrgEntities, decodeHtmlText } from './orgtext';
import type { Snapshot } from '@core/api/types';

test('decodeHtmlText: named, numeric and double-wrapped codes', () => {
  assert.equal(decodeHtmlText('Management, Entrepreneurship &amp; Technology Student Board'), 'Management, Entrepreneurship & Technology Student Board');
  assert.equal(decodeHtmlText('Build &#8212; ship &#43; learn &amp;#8212; done'), 'Build — ship + learn — done');
  assert.equal(decodeHtmlText('AT&T & friends'), 'AT&T & friends');
});

test('cleanOrgEntities: only orgs whose text changes', () => {
  const org = (id: string, name: string, description: string) => ({ id, name, description }) as never;
  const db = { organizations: [org('a', 'Food, Equity, Entrepreneurship, &amp; Development', 'ok'), org('b', 'Blueprint', 'Tech &#8212; for good'), org('c', 'CHAOS', 'Hiking')] } as unknown as Snapshot;
  const p = cleanOrgEntities(db)!;
  assert.deepEqual(p.organizations!.map((o) => [o.id, o.name, o.description]), [['a', 'Food, Equity, Entrepreneurship, & Development', 'ok'], ['b', 'Blueprint', 'Tech — for good']]);
  assert.equal(db.organizations[0].name, 'Food, Equity, Entrepreneurship, & Development');
  assert.equal(cleanOrgEntities({ organizations: [org('c', 'CHAOS', 'Hiking')] } as unknown as Snapshot), null);
});
