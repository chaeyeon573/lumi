import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hcxToCourses, type HcxClass, resolveCourseSource } from './sources/courses';

test('PeopleSoft HCX (Duke): lectures with days/times, graduate courses kept, discussions left out', () => {
  const { classes } = JSON.parse(readFileSync(new URL('./fixtures/duke-hcx-compsci.json', import.meta.url), 'utf8')) as { classes: HcxClass[] };
  const out = hcxToCourses('s_duke', classes, '1980', 'Fall 2026', 'u');
  const by = (code: string) => out.find((c) => c.code === code)!;
  assert.deepEqual(by('COMPSCI 532').meetings, [{ day: 0, start: '10:05', end: '11:20' }, { day: 2, start: '10:05', end: '11:20' }]);
  assert.equal(by('COMPSCI 532').title, 'Design and Analysis of Algorithms');
  assert.deepEqual(by('COMPSCI 94').meetings, [{ day: 1, start: '13:25', end: '14:40' }, { day: 3, start: '13:25', end: '14:40' }]);
  assert.deepEqual(by('COMPSCI 201').meetings, [{ day: 0, start: '15:05', end: '16:20' }, { day: 2, start: '15:05', end: '16:20' }]);
  assert.equal(out.filter((c) => c.code === 'COMPSCI 201').length, 1); // 14 discussion sections are not lecture times
  assert.ok(resolveCourseSource('s_duke', 'hcx:https://dukehub.duke.edu/psc/CSPRD01/EMPLOYEE/SA|DUKEU'));
});
