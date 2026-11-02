import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usaJobToOpportunity, type UsaJobItem } from './sources/usajobs';

// 응답 모양은 USAJOBS API 문서(developer.usajobs.gov, GET /api/Search)의 필드 이름 그대로 — 값은 시험용
const item = (o: Partial<UsaJobItem['MatchedObjectDescriptor']>): UsaJobItem => ({ MatchedObjectId: '123', MatchedObjectDescriptor: {
  PositionID: 'DOJ-27-001', PositionTitle: 'Legal Intern (Student Trainee)', PositionURI: 'https://www.usajobs.gov/job/123',
  PositionLocationDisplay: 'San Francisco, California', OrganizationName: 'Executive Office for U.S. Attorneys', DepartmentName: 'Department of Justice',
  PositionRemuneration: [{ MinimumRange: '39000', MaximumRange: '52000', RateIntervalCode: 'PA' }], PublicationStartDate: '2026-10-28T00:00:00', ApplicationCloseDate: '2026-11-20T23:59:59',
  UserArea: { Details: { JobSummary: 'Gain experience in federal law enforcement.' } }, ...o } });
const NOW = new Date('2026-11-02T12:00:00Z');

test('usajobs: open federal student job near Berkeley → internship with deadline, pay and field', () => {
  const o = usaJobToOpportunity(item({}), NOW)!;
  assert.equal(o.id, 'op_usajobs_doj_27_001'); assert.equal(o.type, 'internship'); assert.equal(o.field, 'Policy & Law');
  assert.equal(o.host, 'Executive Office for U.S. Attorneys'); assert.equal(o.benefit, 'Paid · $39,000–$52,000/yr');
  assert.ok(o.description.startsWith('Department of Justice · Paid')); assert.ok(o.deadline);
});

test('usajobs: drop closed jobs and places far from Berkeley; field from the agency when the title says nothing', () => {
  assert.equal(usaJobToOpportunity(item({ ApplicationCloseDate: '2026-10-30T23:59:59' }), NOW), null);
  assert.equal(usaJobToOpportunity(item({ PositionLocationDisplay: 'Omaha, Nebraska' }), NOW), null);
  assert.ok(usaJobToOpportunity(item({ PositionLocationDisplay: 'Washington, District of Columbia' }), NOW));
  assert.equal(usaJobToOpportunity(item({ PositionTitle: 'Student Trainee', DepartmentName: 'Department of Veterans Affairs', OrganizationName: 'Veterans Health Administration' }), NOW)!.field, 'Health');
  assert.equal(usaJobToOpportunity(item({ PositionTitle: 'Student Trainee (Information Technology)', PositionLocationDisplay: 'Multiple Locations' }), NOW)!.field !== 'Policy & Law', true);
});

test('usajobs: field from the job, not just “federal = policy”', () => {
  const f = (t: string, dept = 'Department of the Interior', org = 'National Park Service') => usaJobToOpportunity(item({ PositionTitle: t, DepartmentName: dept, OrganizationName: org }), NOW)!.field;
  assert.equal(f('Inpainting at the WWII Memorial'), 'Nonprofit & Education');
  assert.equal(f('STUDENT TRAINEE (CONTRACTING)', 'Department of Defense', 'Defense Acquisition University'), 'Business & Marketing');
  assert.equal(f('Student Trainee (Congressional & Public Affairs)', 'Small Business Administration', 'Small Business Administration'), 'Policy & Law');
  assert.equal(f('Student Trainee', 'Department of Defense', 'Army Corps'), 'Other');
});

test('usajobs: citizenship stated in the posting → citizens', () => {
  const o = usaJobToOpportunity(item({ UserArea: { Details: { JobSummary: 'Requirements: U.S. Citizenship; enrolled at least half-time.' } } }), NOW)!;
  assert.equal(o.workAuth, 'citizens');
  assert.equal(usaJobToOpportunity(item({ UserArea: { Details: { JobSummary: 'Gain experience.' } } }), NOW)!.workAuth, undefined);
});
