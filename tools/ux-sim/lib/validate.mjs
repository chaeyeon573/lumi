import path from 'node:path';
import Ajv from 'ajv';
import { SCHEMA_DIR } from './paths.mjs';
import { readJson, personas, scenarios, FRICTION_TYPES } from './util.mjs';
import { evidenceProblems } from './success.mjs';

const ajv = new Ajv({ allErrors: true, strict: false });
const validators = {
  run: ajv.compile(readJson(path.join(SCHEMA_DIR, 'run.schema.json'))),
  findings: ajv.compile(readJson(path.join(SCHEMA_DIR, 'findings.schema.json'))),
  analysis: ajv.compile(readJson(path.join(SCHEMA_DIR, 'analysis.schema.json'))),
};
const COLLECTIONS = ['users', 'activities', 'participations', 'posts', 'proposals', 'chatRooms', 'notifications', 'opportunities', 'opportunityIntents', 'timePolls', 'games', 'rides', 'organizations', 'relationships.friendRequests', 'relationships.follows', 'relationships.likes', 'relationships.friends'];

/** Validate one object; returns [] when valid, else readable error strings. */
export function validate(kind, data) {
  const v = validators[kind];
  if (v(data)) return [];
  return v.errors.map((e) => `${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ` (${e.params.allowedValues.join('|')})` : ''}`);
}

export function validateFiles(files) {
  return files.map((f) => {
    const data = readJson(f);
    const kind = 'problems' in data ? 'analysis' : 'findings' in data ? 'findings' : 'run';
    const errors = validate(kind, data);
    return { file: f, kind, valid: errors.length === 0, errors };
  });
}

/** Personas/scenarios sanity: required fields, matrix references, regexes compile. */
export function validateConfig() {
  const errs = [];
  const ps = personas();
  const ids = new Set(ps.map((p) => p.id));
  for (const p of ps) {
    for (const k of ['id', 'name', 'age', 'purpose', 'techFamiliarity', 'language', 'device', 'patience', 'backstory', 'quitsWhen', 'voice']) if (p[k] === undefined) errs.push(`persona ${p.id}: missing ${k}`);
    if (p.account?.yearInSchool !== undefined && !(Number.isInteger(p.account.yearInSchool) && p.account.yearInSchool >= 1 && p.account.yearInSchool <= 8)) errs.push(`persona ${p.id}: account.yearInSchool must be 1-8 (5+ = graduate)`);
    if (p.age < 16) errs.push(`persona ${p.id}: Lumi is 16+ — a fresh account for age ${p.age} cannot sign up`);
    for (const k of ['maxSteps', 'frustrationThreshold', 'confusionTolerance', 'timeBudgetSec']) if (typeof p.patience?.[k] !== 'number') errs.push(`persona ${p.id}: patience.${k} must be a number`);
    if (!p.device?.viewport?.width) errs.push(`persona ${p.id}: device.viewport missing`);
  }
  for (const s of scenarios()) {
    for (const k of ['id', 'title', 'goal', 'startUrl', 'success', 'personas']) if (s[k] === undefined) errs.push(`scenario ${s.id}: missing ${k}`);
    for (const p of s.personas ?? []) if (!ids.has(p)) errs.push(`scenario ${s.id}: unknown persona ${p}`);
    const re = (x) => { try { new RegExp(x); } catch (e) { errs.push(`scenario ${s.id}: bad regex ${x}: ${e.message}`); } };
    const walkWhere = (w) => { for (const v of Object.values(w ?? {})) if (v && typeof v === 'object' && !Array.isArray(v)) { if (v.re) re(v.re); if (v.some) walkWhere(v.some); } };
    const walk = (c) => {
      for (const k of ['urlMatches', 'textMatches', 'textAbsent']) if (c[k] !== undefined) re(c[k]);
      if (c.record) {
        if (!COLLECTIONS.includes(c.record.collection)) errs.push(`scenario ${s.id}: record.collection "${c.record.collection}" is not one of ${COLLECTIONS.join(', ')}`);
        if (c.record.fresh && !['created', 'changed', 'any'].includes(c.record.fresh)) errs.push(`scenario ${s.id}: record.fresh must be created|changed|any`);
        if (!JSON.stringify(c.record.where ?? {}).includes('$me') && !JSON.stringify(c.record.where ?? {}).includes('$peer')) errs.push(`scenario ${s.id}: record leaf on ${c.record.collection} does not tie the record to the persona ($me) — any change by anyone would count`);
        walkWhere(c.record.where);
      }
      (c.all ?? []).forEach(walk); (c.any ?? []).forEach(walk);
    };
    walk(s.success ?? {});
    for (const e of evidenceProblems(s)) errs.push(`scenario ${s.id}: ${e}`);
    const auth = s.setup?.auth ?? 'fresh';
    if (!['fresh', 'demo', 'none'].includes(auth)) errs.push(`scenario ${s.id}: setup.auth must be fresh|demo|none`);
    if (s.setup?.peers && auth !== 'fresh') errs.push(`scenario ${s.id}: setup.peers needs auth fresh (peers are seeded on the local stack next to a fresh account)`);
    for (const [i, p] of (s.setup?.peers ?? []).entries()) { if (!p.nickname) errs.push(`scenario ${s.id}: peers[${i}] needs a nickname`); if (p.activity && !p.activity.title) errs.push(`scenario ${s.id}: peers[${i}].activity needs a title`); }
    if (auth === 'demo' && !s.setup?.demoReason) errs.push(`scenario ${s.id}: auth demo uses the shared sample account (someone else's data, own posts tagged Sample) — say why in setup.demoReason or use fresh`);
  }
  return { personas: ps.length, scenarios: scenarios().length, frictionTypes: FRICTION_TYPES, ok: errs.length === 0, errors: errs };
}
