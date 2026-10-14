import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, deepLinkPath, isDark, safePath, webUrlFor } from './links.ts';

const HOSTS = ['heetz.up.railway.app', 'lumi.example.com'];

test('our pages stay in the app, other sites open in Safari view, mail/phone go to iOS', () => {
  assert.deepEqual(classify('https://heetz.up.railway.app/rides/1', HOSTS), { kind: 'load' });
  assert.deepEqual(classify('https://lumi.example.com/p/x', HOSTS), { kind: 'load' });
  assert.deepEqual(classify('https://berkeley.edu/x', HOSTS), { kind: 'browser', url: 'https://berkeley.edu/x' });
  assert.deepEqual(classify('https://www.youtube.com/embed/x', HOSTS, false), { kind: 'load' }, 'iframes stay');
  assert.deepEqual(classify('https://heetz.up.railway.app/api/plans/p1/ics', HOSTS), { kind: 'browser', url: 'https://heetz.up.railway.app/api/plans/p1/ics' }, 'calendar file → Safari view');
  assert.deepEqual(classify('mailto:hi@lumi.app', HOSTS), { kind: 'system', url: 'mailto:hi@lumi.app' });
  assert.deepEqual(classify('tel:+15105551234', HOSTS), { kind: 'system', url: 'tel:+15105551234' });
  assert.deepEqual(classify('lumi://r/abc', HOSTS), { kind: 'navigate', path: '/r/abc' });
  assert.deepEqual(classify('about:blank', HOSTS), { kind: 'load' });
  assert.deepEqual(classify('javascript:alert(1)', HOSTS), { kind: 'block' });
  assert.deepEqual(classify('file:///etc/passwd', HOSTS), { kind: 'block' });
  assert.deepEqual(classify('https://heetz.up.railway.app.evil.com/', HOSTS).kind, 'browser');
  assert.deepEqual(classify('https://user@evil.com/', HOSTS).kind, 'browser');
});

test('deep links → in-app paths', () => {
  assert.equal(deepLinkPath('lumi://c/s_berkeley/CS61A', HOSTS), '/c/s_berkeley/CS61A');
  assert.equal(deepLinkPath('lumi:///r/abc?x=1#y', HOSTS), '/r/abc?x=1#y');
  assert.equal(deepLinkPath('lumi://', HOSTS), '/');
  assert.equal(deepLinkPath('https://heetz.up.railway.app/p/xyz', HOSTS), '/p/xyz');
  assert.equal(deepLinkPath('https://heetz.up.railway.app', HOSTS), '/');
  assert.equal(deepLinkPath('https://evil.com/p/xyz', HOSTS), null);
  assert.equal(deepLinkPath('exp+lumi://expo-development-client/?url=x', HOSTS), null);
  assert.equal(deepLinkPath(null, HOSTS), null);
});

test('paths are sanitized', () => {
  assert.equal(safePath('/chats/1'), '/chats/1');
  assert.equal(safePath('//evil.com'), null);
  assert.equal(safePath('/\\evil.com'), null);
  assert.equal(safePath('https://evil.com'), null);
  assert.equal(safePath('/a\nb'), null);
  assert.equal(webUrlFor('https://heetz.up.railway.app/', '/r/1'), 'https://heetz.up.railway.app/r/1');
  assert.equal(webUrlFor('https://heetz.up.railway.app', '//evil'), 'https://heetz.up.railway.app/');
});

test('status bar contrast', () => {
  assert.equal(isDark('#08070C'), true);
  assert.equal(isDark('#FFFFFF'), false);
});
