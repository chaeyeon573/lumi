/**
 * /privacy · /terms — operator and contact come only from env; unset stays null (the page shows a placeholder).
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legalConfig, legalPageHtml } from './legal';

test('legal config: unset or blank env stays null, never a made-up value', () => {
  assert.deepEqual(legalConfig({}), { operator: null, contactEmail: null });
  assert.deepEqual(legalConfig({ LEGAL_NAME: '  ', PRIVACY_CONTACT_EMAIL: '' }), { operator: null, contactEmail: null });
});

test('legal config: trims values and rejects a malformed email', () => {
  assert.deepEqual(legalConfig({ LEGAL_NAME: ' Lumi Labs LLC ', PRIVACY_CONTACT_EMAIL: ' privacy@example.com ' }), { operator: 'Lumi Labs LLC', contactEmail: 'privacy@example.com' });
  assert.equal(legalConfig({ PRIVACY_CONTACT_EMAIL: 'not an email' }).contactEmail, null);
});

test('legal page html: own title and description, old ones removed', () => {
  const base = '<html><head><title>Lumi</title>\n<meta name="description" content="x" />\n<meta property="og:title" content="Lumi" />\n</head><body></body></html>';
  const out = legalPageHtml(base, 'privacy', 'https://example.com/privacy');
  assert.match(out, /<title>Privacy Policy · Lumi<\/title>/);
  assert.equal((out.match(/<title>/g) ?? []).length, 1);
  assert.equal((out.match(/name="description"/g) ?? []).length, 1);
  assert.match(out, /og:url" content="https:\/\/example.com\/privacy"/);
  assert.doesNotMatch(out, /noindex/);
});
