import path from 'node:path';
import Ajv from 'ajv';
import { SCHEMA_DIR } from './paths.mjs';
import { readJson, personas, scenarios, FRICTION_TYPES } from './util.mjs';

const ajv = new Ajv({ allErrors: true, strict: false });
const validators = {
  run: ajv.compile(readJson(path.join(SCHEMA_DIR, 'run.schema.json'))),
  findings: ajv.compile(readJson(path.join(SCHEMA_DIR, 'findings.schema.json'))),
};

/** Validate one object; returns [] when valid, else readable error strings. */
export function validate(kind, data) {
  const v = validators[kind];
  if (v(data)) return [];
  return v.errors.map((e) => `${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ` (${e.params.allowedValues.join('|')})` : ''}`);
}

export function validateFiles(files) {
  return files.map((f) => {
    const data = readJson(f);
    const kind = 'findings' in data ? 'findings' : 'run';
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
    for (const k of ['maxSteps', 'frustrationThreshold', 'confusionTolerance', 'timeBudgetSec']) if (typeof p.patience?.[k] !== 'number') errs.push(`persona ${p.id}: patience.${k} must be a number`);
    if (!p.device?.viewport?.width) errs.push(`persona ${p.id}: device.viewport missing`);
  }
  for (const s of scenarios()) {
    for (const k of ['id', 'title', 'goal', 'startUrl', 'success', 'personas']) if (s[k] === undefined) errs.push(`scenario ${s.id}: missing ${k}`);
    for (const p of s.personas ?? []) if (!ids.has(p)) errs.push(`scenario ${s.id}: unknown persona ${p}`);
    const walk = (c) => { for (const k of ['urlMatches', 'textMatches', 'textAbsent']) if (c[k] !== undefined) { try { new RegExp(c[k]); } catch (e) { errs.push(`scenario ${s.id}: bad regex ${c[k]}: ${e.message}`); } } (c.all ?? []).forEach(walk); (c.any ?? []).forEach(walk); };
    walk(s.success ?? {});
  }
  return { personas: ps.length, scenarios: scenarios().length, frictionTypes: FRICTION_TYPES, ok: errs.length === 0, errors: errs };
}
