import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workAuthOf, plainText } from './sources/workauth';

test('workAuth: only what the posting says', () => {
  assert.equal(workAuthOf('Must be a U.S. citizen and able to obtain a security clearance.'), 'citizens');
  assert.equal(workAuthOf('This position requires an active Secret security clearance.'), 'citizens');
  assert.equal(workAuthOf('Applicants must be U.S. persons as defined by ITAR.'), 'citizens');
  // 실제 공고 문장 (AlixPartners, ServiceNow, Jump Trading)
  assert.equal(workAuthOf('MUST BE CURRENTLY AUTHORIZED TO WORK IN THE UNITED STATES. NO VISA OR IMMIGRATION SPONSORSHIP FOR THIS ROLE, NOW OR IN THE FUTURE. (e.g., H-1B, STEM OPT, TN, etc.)'), 'no_sponsor');
  assert.equal(workAuthOf('Export Control Regulations For positions requiring access to controlled technology subject to export control regulations, ServiceNow may require the candidate to be a U.S. person.'), undefined);
  assert.equal(workAuthOf('INTERNATIONAL STUDENTS are encouraged to apply. We accept students eligible for CPT/OPT and we sponsor work visas.'), 'intl_ok');
  assert.equal(workAuthOf('We welcome students on F-1 visas with CPT authorization.'), 'intl_ok');
  assert.equal(workAuthOf('International students are eligible to apply.'), 'intl_ok');
  assert.equal(workAuthOf('We are unable to sponsor visas for this role.'), 'no_sponsor');
  assert.equal(workAuthOf('Candidates must be authorized to work in the US without the need for current or future sponsorship.'), 'no_sponsor');
  assert.equal(workAuthOf('CPT/OPT is accepted; we do not sponsor H-1B visas.'), 'intl_ok');
  assert.equal(workAuthOf('Join our team to build great software in San Francisco.'), undefined);
  assert.equal(workAuthOf('Optimize the OPTICS pipeline'), undefined); // 단어 일부 OPT 는 아니다
});

test('plainText: Greenhouse sends escaped HTML', () => {
  assert.equal(plainText('&lt;p&gt;Must be a &lt;b&gt;U.S. citizen&lt;/b&gt;&amp;nbsp;&lt;/p&gt;').trim(), 'Must be a U.S. citizen');
});
