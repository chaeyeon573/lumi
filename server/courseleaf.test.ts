import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBlock } from './sources/catalog';

test('CourseLeaf block with "detail-coursecode" (NC State catalog.ncsu.edu) gives code and title', () => {
  const block = '<div class="cols noindent"><span class="text detail-coursecode text--semibold"><strong>CSC&#160;110</strong></span>&#160;&#160;<span class="text detail-title margin--tiny text--semibold"><strong>Computer Science Principles - The Beauty and Joy of Computing</strong></span>&#160;&#160;<span class="text detail-hours_html">(3 credit hours)</span>&#160;&#160;</div><div class="noindent"><p class="courseblockextra">This course explores the principles of computer science.</p></div>';
  const c = parseBlock('s_ncsu', block, 'https://catalog.ncsu.edu');
  assert.equal(c?.code, 'CSC 110');
  assert.equal(c?.title, 'Computer Science Principles - The Beauty and Joy of Computing');
});

test('CourseLeaf cross-listed code "NR 421/ NR 521" keeps the first code; shared-department "ACM/EE 106A" stays', () => {
  const mk = (code: string, title: string) => `<span class="detail-coursecode"><strong>${code}</strong></span><span class="detail-title"><strong>${title}</strong></span>`;
  assert.equal(parseBlock('s_ncsu', mk('NR&#160;421/ NR&#160;521', 'Wetland Science and Management'), 'https://catalog.ncsu.edu')?.code, 'NR 421');
  assert.equal(parseBlock('s_ncsu', mk('TE&#160;507/ TT&#160;507 / NW&#160;507', 'Nonwoven Characterization Methods'), 'https://catalog.ncsu.edu')?.code, 'TE 507');
  assert.equal(parseBlock('s_x', mk('ACM/EE&#160;106A', 'Introductory Methods'), 'https://x.edu')?.code, 'ACM/EE 106A');
});

test('CourseLeaf block cut inside a tag (Penn State) gives a clean title without "</d" or credits', () => {
  // 400 자 경계가 태그 한가운데 오도록 앞을 채운다 — 실제 bulletins.psu.edu 의 두 모양
  const body = (title: string) => `<div class="course_codetitle">AA&#160;1: ${title}</div><div class="course_credits">3 Credits</div><div class="courseblockdesc">Long description text here.</div>`;
  const cutAt = (title: string, marker: string) => { const b = body(title); const pos = b.indexOf(marker) + 3; return `<p data-x="${'a'.repeat(400 - pos - 13)}"></p>${b}`; };
  assert.equal(parseBlock('s_psu', cutAt('First Year Seminar', '</div><div class="courseblockdesc"'), 'https://bulletins.psu.edu')?.title, 'First Year Seminar');
  assert.equal(parseBlock('s_psu', cutAt('Introduction to Anti-Black racism in the United States', '<div class="course_credits"'), 'https://bulletins.psu.edu')?.title, 'Introduction to Anti-Black racism in the United States');
});
