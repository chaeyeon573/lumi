// Scenario success checks. A check is a tree of leaves under `all` / `any`:
//
//   { "urlMatches": "<regex>" }      path + query of the current page
//   { "textMatches": "<regex>" }     the page's innerText            { "textAbsent": "<regex>" }
//   { "record": { … } }              the run's OWN data on the local stack (server-side; see below)
//
// Evidence rule (validate-config enforces it): every way of satisfying a check must contain at least one leaf that only
// the persona's own action can make true — a `record` leaf, or a `urlMatches` the start URL does not match. Text alone
// is never enough: seed content (another person's "Joined", a sample "Going") satisfied lunch-today in the pilot.
// The harness also never evaluates the check on the start screen.
//
// record leaf:
//   { "collection": "participations" | "activities" | "rides" | "users" | "chatRooms" | "relationships.friendRequests" | …,
//     "where": { "<field>": <value> | { "re": "<regex>" } | { "in": [..] | "$peerActivities" } | { "has": <value> } | { "some": { <where> } } },
//     "fresh": "created" (default: the item's id was not in the store when the persona started)
//            | "changed" (the item differs from how it was when the persona started) | "any",
//     "min": 1 }
//   Values may be variables: "$me" (the persona's user id: the fresh/demo account, or for sign-up scenarios the account
//   the browser is signed in to now), "$peers" (ids of seeded peers), "$peerActivities", "$peerRides", "$today" (campus date).
import { readFileSync, existsSync, statSync } from 'node:fs';

const campusToday = (tz = 'America/Los_Angeles') => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** path+query of a URL (or a path) */
export function pathOf(url) { try { const u = new URL(url); return u.pathname + u.search; } catch { return String(url ?? ''); } }

/** get a collection from a FileStore snapshot by dotted path */
export function collectionOf(snapshot, name) {
  let cur = snapshot;
  for (const k of String(name).split('.')) cur = cur?.[k];
  return Array.isArray(cur) ? cur : [];
}

function resolve(v, vars) {
  if (typeof v === 'string' && v.startsWith('$')) return vars[v.slice(1)];
  return v;
}

/** does `item` satisfy a `where` object */
export function matchWhere(item, where = {}, vars = {}) {
  for (const [field, cond0] of Object.entries(where)) {
    const val = field.split('.').reduce((o, k) => o?.[k], item);
    const cond = resolve(cond0, vars);
    if (cond === undefined) return false; // an unresolved variable never matches
    if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('re' in cond) { if (val === undefined || val === null || !new RegExp(cond.re, cond.flags ?? 'i').test(typeof val === 'string' ? val : JSON.stringify(val))) return false; continue; }
      if ('in' in cond) { const list = resolve(cond.in, vars) ?? []; if (!list.includes(val)) return false; continue; }
      if ('has' in cond) { const want = resolve(cond.has, vars); if (!Array.isArray(val) || want === undefined || !val.includes(want)) return false; continue; }
      if ('some' in cond) { if (!Array.isArray(val) || !val.some((x) => matchWhere(x, cond.some, vars))) return false; continue; }
      if ('exists' in cond) { if ((val !== undefined && val !== null) !== !!cond.exists) return false; continue; }
      throw new Error(`unknown where operator in ${JSON.stringify(cond0)}`);
    }
    if (val !== cond) return false;
  }
  return true;
}

/** Snapshot of ids + item JSON per collection, taken when the persona starts. */
export function baselineOf(snapshot, collections) {
  const out = {};
  for (const c of collections) out[c] = new Map(collectionOf(snapshot, c).map((x) => [x.id ?? JSON.stringify(x), JSON.stringify(x)]));
  return out;
}

/** every record leaf's collection in a success tree */
export function recordCollections(success) {
  const out = new Set();
  const walk = (c) => { if (!c) return; if (c.record) out.add(c.record.collection); (c.all ?? []).forEach(walk); (c.any ?? []).forEach(walk); };
  walk(success);
  return [...out];
}

/** true / false — or null when it cannot be decided (no data file: live or custom target) */
export function evalRecord(leaf, { snapshot, baseline, vars }) {
  if (!snapshot) return null;
  const list = collectionOf(snapshot, leaf.collection);
  const base = baseline?.[leaf.collection] ?? new Map();
  const fresh = leaf.fresh ?? 'created';
  const n = list.filter((x) => {
    if (!matchWhere(x, leaf.where, vars)) return false;
    const key = x.id ?? JSON.stringify(x);
    if (fresh === 'created') return !base.has(key);
    if (fresh === 'changed') return !base.has(key) || base.get(key) !== JSON.stringify(x);
    return true;
  }).length;
  return n >= (leaf.min ?? 1);
}

/**
 * Evaluate a success tree. ctx: { url, text, record(leaf) → bool|null }.
 * Returns { met, matched: [leaf descriptions that were true], undecidable: bool }.
 */
export function traceSuccess(success, ctx) {
  if (!success) return { met: false, matched: [], undecidable: false };
  const p = pathOf(ctx.url);
  const matched = [];
  let undecidable = false;
  const leaf = (c) => {
    let ok = false;
    if (c.urlMatches !== undefined) ok = new RegExp(c.urlMatches, 'i').test(p);
    else if (c.textMatches !== undefined) ok = new RegExp(c.textMatches, 'i').test(ctx.text ?? '');
    else if (c.textAbsent !== undefined) ok = !new RegExp(c.textAbsent, 'i').test(ctx.text ?? '');
    else if (c.record !== undefined) { const r = ctx.record ? ctx.record(c.record) : null; if (r === null) undecidable = true; ok = r === true; }
    else if (c.all) return c.all.length > 0 && c.all.map(leaf).every(Boolean);
    else if (c.any) return c.any.map(leaf).some(Boolean);
    if (ok) matched.push(c.record ? { record: c.record.collection, where: c.record.where, description: c.record.description } : c);
    return ok;
  };
  const all = success.all ?? [];
  const any = success.any ?? [];
  const okAll = all.map(leaf).every(Boolean);
  const okAny = any.length === 0 || any.map(leaf).some(Boolean);
  return { met: okAll && okAny && all.length + any.length > 0, matched, undecidable };
}

/** Disjunctive normal form: every way the check can be satisfied, as a list of leaf lists. */
export function branches(success) {
  const dnf = (c) => {
    if (c.all) return c.all.map(dnf).reduce((acc, b) => acc.flatMap((x) => b.map((y) => [...x, ...y])), [[]]);
    if (c.any) return c.any.flatMap(dnf);
    return [[c]];
  };
  const top = [];
  if (success?.all?.length) top.push({ all: success.all });
  if (success?.any?.length) top.push({ any: success.any });
  return top.length ? dnf({ all: top }) : [];
}

/** Problems with a scenario's check: branches that seed content alone could satisfy. */
export function evidenceProblems(scenario) {
  const start = pathOf(new URL(scenario.startUrl ?? '/', 'http://x').href);
  const errs = [];
  const bs = branches(scenario.success);
  if (!bs.length) errs.push('success check is empty');
  for (const [i, b] of bs.entries()) {
    const evidence = b.some((l) => l.record !== undefined || (l.urlMatches !== undefined && !new RegExp(l.urlMatches, 'i').test(start)));
    if (!evidence) errs.push(`branch ${i + 1} (${b.map((l) => Object.keys(l)[0]).join(' + ')}) has no run-produced evidence: add a record leaf or a urlMatches the start URL (${start}) does not match`);
  }
  return errs;
}

/** Reads the stack's FileStore data file (cached by mtime). */
export function dataReader(file) {
  let cache = { mtime: 0, size: -1, snapshot: null };
  return () => {
    if (!file || !existsSync(file)) return null;
    try {
      const st = statSync(file);
      if (st.mtimeMs !== cache.mtime || st.size !== cache.size) cache = { mtime: st.mtimeMs, size: st.size, snapshot: JSON.parse(readFileSync(file, 'utf8')).snapshot };
    } catch { /* mid-write — keep the last good read */ }
    return cache.snapshot;
  };
}

export { campusToday };
