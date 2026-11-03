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

test('classify: an internship with a start year is not a new-grad job', () => {
  assert.deepEqual(classify('Product Design Intern (2027 Start)'), { kind: 'internship', audience: [] });
  assert.deepEqual(classify('New Grad Intern Conversion - Software'), { kind: 'internship', audience: ['newgrad'] });
});

test('Workday postings: grouped "N Locations" dropped (country unknown), US ones kept and classified', async () => {
  const { parseWorkday } = await import('./sources/jobboards');
  const raw = parseWorkday({ jobPostings: [
    { title: 'DFT Engineer - New College Grad', externalPath: '/job/US-CA-Santa-Clara/DFT-Engineer_JR1', locationsText: 'US, CA, Santa Clara', bulletFields: ['JR1'] },
    { title: 'Software Engineer, University Graduate', externalPath: '/job/x_JR2', locationsText: '4 Locations', bulletFields: ['JR2'] },
    { title: 'Graduate Data Scientist (Pfizer Ringaskiddy)', externalPath: '/job/IE/x_JR3', locationsText: 'Ireland - Ringaskiddy', bulletFields: ['JR3'] },
  ] }, 'nvidia.wd5.myworkdayjobs.com', 'NVIDIAExternalCareerSite');
  const out = toStudentJobs(raw, { platform: 'workday', token: 'nvidia.wd5.myworkdayjobs.com~nvidia~NVIDIAExternalCareerSite', company: 'NVIDIA' });
  assert.deepEqual(out.map((j) => [j.title, j.audience.join('+'), j.url]), [['DFT Engineer - New College Grad', 'newgrad', 'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/US-CA-Santa-Clara/DFT-Engineer_JR1']]);
});

test('amazon.jobs search.json: US student roles kept with their posting link', async () => {
  const { parseAmazon } = await import('./sources/jobboards');
  const raw = parseAmazon({ jobs: [
    { id_icims: '1', title: 'Software Dev Engineer Intern, 2027', normalized_location: 'Seattle, Washington, USA', job_path: '/en/jobs/1/sde-intern' },
    { id_icims: '2', title: 'Area Manager, CXO', normalized_location: 'Lynnwood, Washington, USA', job_path: '/en/jobs/2/area-manager' },
    { id_icims: '3', title: 'Applied Scientist Intern - PhD', normalized_location: 'Toronto, Ontario, CAN', job_path: '/en/jobs/3/as' },
  ] });
  const out = toStudentJobs(raw, { platform: 'amazon', token: 'amazon', company: 'Amazon' });
  assert.deepEqual(out.map((j) => [j.title, j.kind, j.url]), [['Software Dev Engineer Intern, 2027', 'internship', 'https://www.amazon.jobs/en/jobs/1/sde-intern']]);
});
