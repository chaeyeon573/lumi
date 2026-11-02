import test from 'node:test';
import assert from 'node:assert/strict';
import { profileFor, registerInput, resolveTimes } from '../lib/account.mjs';
import { persona, personas } from '../lib/util.mjs';

const NOW = new Date('2026-11-02T12:00:00Z');

test('profile comes from the persona: name, major, year, birth year, language', () => {
  const p = profileFor(persona('minji-freshman-17'), { now: NOW });
  assert.equal(p.nickname, 'Minji');
  assert.equal(p.birthYear, 2009);
  assert.equal(p.department, 'Undeclared');
  assert.equal(p.yearInSchool, 1); assert.equal(p.year, 2026); assert.equal(p.role, 'undergraduate');
  assert.equal(p.language, 'ko');
  const g = profileFor(persona('priya-phd-desktop'), { now: NOW });
  assert.equal(g.role, 'graduate'); assert.equal(g.year, 2026);
  const d = profileFor(persona('diego-transfer-commuter'), { now: NOW });
  assert.equal(d.year, 2024, 'junior → entered two years ago');
});

test('register input is a verified, non-sample student with default privacy', () => {
  const i = registerInput(profileFor(persona('aisha-firstgen-anxious'), { now: NOW }), 'aisha.x@berkeley.edu');
  assert.equal(i.emailVerified, true);
  assert.equal(i.email, 'aisha.x@berkeley.edu');
  assert.equal(i.fieldVisibility.timetable, 'friends');
  assert.ok(!('sample' in i));
});

test('every persona can sign up (16+) and has an account block', () => {
  for (const p of personas()) { assert.ok(p.age >= 16, p.id); assert.ok(p.account?.department, p.id); }
});

test('peer plan times stay valid (HH:MM, end after start)', () => {
  const t = resolveTimes({ dateOffsetDays: 1, startTime: '12:30', endTime: '13:15' });
  assert.equal(t.startTime, '12:30'); assert.equal(t.endTime, '13:15');
  const today = resolveTimes({ startTime: '00:00', endTime: '00:40' });
  assert.match(today.startTime, /^\d\d:\d\d$/);
  assert.ok(today.endTime > today.startTime || today.endTime === '23:59');
});
