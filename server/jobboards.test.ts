import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, isUS, parseGreenhouse, parseLever, parseAshby, toStudentJobs } from './sources/jobboards';

test('isUS: US cities/states/codes yes, foreign-only or bare Remote no, lowercase "us" no', () => {
  for (const l of ['San Francisco, CA', 'New York, NY; London, UK', 'Remote - US', 'Seattle, Washington', 'United States', 'Austin, TX']) assert.equal(isUS(l), true, l);
  for (const l of ['London, UK', 'Toronto, Canada', 'Remote', 'Bengaluru, India', 'Work with us anywhere', '']) assert.equal(isUS(l), false, l);
});

test('classify: student and new-grad roles only, with who they are for', () => {
  assert.deepEqual(classify('Research Scientist Intern, PhD (Summer 2027)'), { kind: 'internship', audience: ['phd'] });
  assert.deepEqual(classify('Software Engineer, New Grad 2027'), { kind: 'job', audience: ['newgrad'] });
  assert.deepEqual(classify('Machine Learning Intern - MS/PhD'), { kind: 'internship', audience: ['phd', 'masters'] });
  assert.deepEqual(classify('Postdoctoral Researcher, Protein Design'), { kind: 'fellowship', audience: ['postdoc'] });
  assert.deepEqual(classify('Software Engineering Intern'), { kind: 'internship', audience: [] });
  assert.equal(classify('Senior Software Engineer'), null);
  assert.equal(classify('Staff Engineer, University Recruiting'), null);
  assert.equal(classify('Account Executive'), null);
  assert.equal(classify('Systems Engineer (Linux, ms-sql)'), null);
});

test('board parsers + toStudentJobs keep US student roles from each vendor format', () => {
  const gh = parseGreenhouse({ jobs: [{ id: 1, title: 'PhD Intern, Research', location: { name: 'San Francisco, CA' }, absolute_url: 'https://job-boards.greenhouse.io/x/jobs/1' }, { id: 2, title: 'PhD Intern, Research', location: { name: 'London, UK' }, absolute_url: 'u2' }, { id: 3, title: 'Senior Engineer', location: { name: 'New York, NY' }, absolute_url: 'u3' }] });
  const lv = parseLever([{ id: 'a', text: 'Quant Research Intern', categories: { location: 'Chicago, IL' }, hostedUrl: 'https://jobs.lever.co/x/a' }]);
  const ab = parseAshby({ jobs: [{ id: 'z', title: 'New Grad Software Engineer', location: 'New York', jobUrl: 'https://jobs.ashbyhq.com/x/z', isListed: true }, { id: 'h', title: 'Intern', location: 'Boston', jobUrl: 'u', isListed: false }] });
  const out = [...toStudentJobs(gh, { platform: 'greenhouse', token: 'x', company: 'X' }), ...toStudentJobs(lv, { platform: 'lever', token: 'x', company: 'X' }), ...toStudentJobs(ab, { platform: 'ashby', token: 'x', company: 'X' })];
  assert.deepEqual(out.map((j) => [j.title, j.kind, j.audience.join('+')]), [['PhD Intern, Research', 'internship', 'phd'], ['Quant Research Intern', 'internship', ''], ['New Grad Software Engineer', 'job', 'newgrad']]);
});

test('classify: entry-level roles undergrads can get after graduating count as new grad', () => {
  for (const t of ['Software Engineer I', 'Data Analyst 1', 'Junior Data Analyst', 'Associate Product Manager', 'Associate Consultant', 'Investment Banking Analyst Program 2027', 'Rotational Program - Finance', 'Leadership Development Program Associate', 'Class of 2027 Software Engineer'])
    assert.deepEqual(classify(t), { kind: 'job', audience: ['newgrad'] }, t);
  for (const t of ['Software Engineer II', 'Software Engineer III', 'Product Manager', 'Senior Associate', 'Associate Director, Research', 'Data Analyst', 'Engineer 10x team']) assert.equal(classify(t), null, t);
});
