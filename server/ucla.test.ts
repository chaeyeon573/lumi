import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { uclaSummaryToCourses } from './sources/courses';

test('UCLA GetCourseSummary (COM SCI 31, Winter 2027): lectures with days, times, room, instructor', () => {
  const html = readFileSync(new URL('./fixtures/ucla-comsci31.html', import.meta.url), 'utf8');
  const out = uclaSummaryToCourses(html, { subject: 'COM SCI', catalog: '0031', title: 'Introduction to Computer Science I' }, '27W', 'Winter 2027');
  assert.equal(out.length, 2);
  assert.equal(out[0].code, 'COM SCI 31');
  assert.equal(out[0].title, 'Introduction to Computer Science I (Lec 1)');
  assert.deepEqual(out[0].meetings, [{ day: 1, start: '16:00', end: '17:50' }, { day: 3, start: '16:00', end: '17:50' }]);
  assert.deepEqual(out[1].meetings, [{ day: 1, start: '18:00', end: '19:50' }, { day: 3, start: '18:00', end: '19:50' }]);
  assert.equal(out[0].location, 'Haines Hall 39');
  assert.equal(out[0].units, 4);
  assert.equal(out[0].url, 'https://sa.ucla.edu/ro/Public/SOC/Results/ClassDetail?term_cd=27W&subj_area_cd=COM%20SCI&crs_catlg_no=0031%20%20%20%20&class_id=187093200&class_no=%20001%20%20');
});

test('UCLA section that meets on two day patterns (ASL 1: MF + TWR) keeps every day', () => {
  const html = readFileSync(new URL('./fixtures/ucla-asl1.html', import.meta.url), 'utf8');
  const out = uclaSummaryToCourses(html, { subject: 'ASL', catalog: '0001', title: 'Elementary American Sign Language', path: 'ASL0001' }, '26F', 'Fall 2026');
  assert.ok(out.length >= 2);
  assert.deepEqual(out[0].meetings.map((m) => m.day).sort(), [0, 1, 2, 3, 4]);
  assert.ok(out[0].meetings.every((m) => m.start === '11:00' && m.end === '11:50'));
  assert.equal(out[0].id, 'cc_ucla_asl0001_26f');
});

test('UCLA catalog numbers: trailing letters are a prefix (0104E M -> M104E, 0242B C -> C242B)', async () => {
  const { uclaCatalog } = await import('./sources/courses');
  assert.equal(uclaCatalog('0104E M '), 'M104E');
  assert.equal(uclaCatalog('0242B C '), 'C242B');
  assert.equal(uclaCatalog('0031    '), '31');
  assert.equal(uclaCatalog('0102A   '), '102A');
});
