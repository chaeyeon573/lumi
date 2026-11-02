// Long-lived browser session for ONE simulated-user run. Started (detached) by `ux-sim start`; step commands reach it over
// HTTP on 127.0.0.1. Every step is appended to ux-sim/runs/<run-id>/run.json. The session ends on `finish`, when the
// persona's patience runs out (enforced here, not left to the model), or after IDLE_MS without commands.
//
// Ideas adapted (no code copied) — see tools/ux-sim/THIRD_PARTY_NOTICES.md:
//   - autouser (MIT): expected outcome + confidence before an action, mismatch after; frustration from objective events
//     (failed 1.0 · no effect 1.0 · repeated 0.75 · backtrack 0.5 · mismatch 0.5) against a patience threshold; a
//     simulated reading-time budget; the scenario's fixed check decides success and a disagreeing claim is `false_success`.
//   - browser-use (MIT): numbered elements, `*` for new ones, page fingerprints + a 20-action window for loops.
//   - human-experience (MIT): 44px tap targets on phones, horizontal overflow, load timing.
//   - user-testing-agent (no licence — ideas only): patience enforced outside the model, nudges near the end.
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { CHROMIUM, REPO_ROOT, rel } from './paths.mjs';
import { collect, assignIds, drawMarks, clearMarks, scrollState, hitPoint } from './dom.mjs';
import { readJson, writeJsonAtomic, sha1, sleep, FEELINGS, FRICTION_TYPES, OUTCOMES, normalizeRoute, environmentConfig } from './util.mjs';
import { traceSuccess, evalRecord, baselineOf, recordCollections, dataReader, campusToday } from './success.mjs';
import { profileFor, registerFresh, seedPeers, BROWSER_KEYS } from './account.mjs';
import { down as stackDown } from './stack.mjs';

const runDir = path.resolve(process.argv[2]);
const cfg = readJson(path.join(runDir, 'session-config.json'));
const shotsDir = path.join(runDir, 'shots');
mkdirSync(shotsDir, { recursive: true });
const IDLE_MS = Number(process.env.UX_SIM_IDLE_MINUTES ?? 30) * 60_000;
const WEIGHTS = { failed: 1.0, no_effect: 1.0, repeated: 0.75, backtrack: 0.5, mismatch: 0.5 };
const WINDOW = 20;
const { persona, scenario, target } = cfg;
const P = persona.patience;
const phone = persona.device.type === 'phone';
const env = environmentConfig()[target.mode] ?? environmentConfig().custom;
const base = new URL(target.baseUrl);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const authMode = cfg.auth ?? scenario.setup?.auth ?? 'fresh';
const catalog = target.stack?.catalog ?? null;
const catalogBuiltin = target.mode === 'local' && catalog?.kind !== 'cached';
// the persona's own data on the local stack — success checks read it server-side (lib/success.mjs)
const dataFileAbs = target.mode === 'local' && target.stack?.dataFile ? path.resolve(REPO_ROOT, target.stack.dataFile) : null;
const readData = dataReader(dataFileAbs);
let baseline = null; // { collections } when the persona starts
const vars = { me: undefined, peers: [], peerActivities: [], peerRides: [], today: campusToday() };

// ─── run record ───────────────────────────────────────────────────────────────
const run = {
  schemaVersion: 1,
  runId: cfg.runId,
  status: 'running',
  createdAt: new Date().toISOString(),
  finishedAt: null,
  disclaimer: 'AI simulation — hypotheses, not measured user behaviour.',
  persona, scenario: { id: scenario.id, title: scenario.title, goal: scenario.goal, startUrl: scenario.startUrl, setup: scenario.setup, success: scenario.success },
  target: { mode: target.mode, baseUrl: target.baseUrl, stack: target.stack ?? null, liveGuard: target.mode === 'live' ? { enabled: true, rule: 'POST/PUT/PATCH/DELETE to /api/* blocked (403) except /api/auth/demo and read-only calls; /api/events (SSE) aborted', allowed: [] } : { enabled: false } },
  auth: { mode: authMode },
  harness: cfg.harness ?? null,
  environment: { summary: env.summary, knownLimits: knownLimits(), viewport: persona.device.viewport, locale: persona.device.locale, timezone: 'America/Los_Angeles', userAgent: null, browserVersion: null },
  limits: { maxSteps: P.maxSteps, frustrationThreshold: P.frustrationThreshold, confusionTolerance: P.confusionTolerance, timeBudgetSec: P.timeBudgetSec, weights: WEIGHTS },
  counters: { actions: 0, frustration: 0, confusionNotes: 0, simTimeSec: 0 },
  steps: [],
  frictionEvents: [],
  autoChecks: [],
  outcome: null, reportedOutcome: null, outcomeReason: null, endedBy: null,
  goalAchieved: false, goalFirstMetAtStep: null, stepsToGoal: null, goalEvidence: null, falseSuccess: false, unnoticedSuccess: false,
  successCheck: { evaluatedFrom: 'first persona action (never the start screen)', recordChecks: recordCollections(scenario.success).length ? (target.mode === 'local' ? 'local data file' : 'undecidable on this target') : 'none' },
  patienceExhaustedAtStep: null, actionsAfterPatienceExhausted: 0, overrodePatience: false,
  abandonPoint: null,
  dropoffRisk: null,
};
if (target.mode === 'live') run.target.liveGuard.allowed = ['/api/auth/demo', '/api/auth/me', '/api/bootstrap', '/api/schools/search', '/api/schools/highlights', '/api/catalog/*', '/api/academic/dates', '/api/seats/mine', '/api/rides/teaser', '/api/classes/room', 'GET *'];
const runFile = path.join(runDir, 'run.json');
function knownLimits() {
  const k = [...(env.knownLimits ?? [])];
  if (target.mode !== 'local') return k;
  const i = k.findIndex((x) => /^Course catalog/.test(x));
  const line = catalogBuiltin
    ? `Course catalog is the built-in sample list (~210 courses, e.g. MATH 1A; ${catalog?.why ?? 'no cached real catalog'}). Live has the imported current-term Berkeley schedule (e.g. MATH 51) — course-name findings on timetable/class screens are marked environment-limited.`
    : `Course catalog is the real Berkeley Class Schedule (${catalog.courses} courses, ${(catalog.terms ?? []).join(' + ')}), fetched ${String(catalog.fetchedAt).slice(0, 10)} with the worker's adapter. Seat counts and very recent changes may differ from live.`;
  if (i >= 0) k[i] = line; else k.push(line);
  if (authMode === 'fresh') k.push('Signed in as a brand-new real (non-sample, e-mail-verified) account made for this run. Other students exist only if the scenario seeds peers (local fixtures); sample profiles are hidden from real accounts, as on live.');
  return k;
}
const save = () => writeJsonAtomic(runFile, run);

// ─── browser ──────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-default-browser-check', '--disable-features=Translate,OptimizationHints,MediaRouter'] });
const ua = phone
  ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const ctx = await browser.newContext({
  viewport: persona.device.viewport, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone,
  locale: persona.device.locale ?? 'en-US', timezoneId: 'America/Los_Angeles', userAgent: ua,
});
run.environment.userAgent = ua;
run.environment.browserVersion = browser.version();

// per-step buffers
let buf = { console: [], failed: [], blocked: [], envHits: [] };
const harnessAborted = new Set();
const inflight = new Set();

const API_READONLY = [/^\/api\/auth\/(demo|me)$/, /^\/api\/bootstrap$/, /^\/api\/schools\/(search|highlights)$/, /^\/api\/catalog\//, /^\/api\/academic\/dates$/, /^\/api\/seats\/mine$/, /^\/api\/rides\/teaser$/, /^\/api\/classes\/room$/];
const isWrite = (method, p) => p.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(method) && !API_READONLY.some((r) => r.test(p));

await ctx.route('**/*', async (route) => {
  const r = route.request();
  let u;
  try { u = new URL(r.url()); } catch { return route.continue(); }
  if (!/^https?:$/.test(u.protocol)) return route.continue();
  const sameOrigin = u.origin === base.origin;
  if (sameOrigin && u.pathname.startsWith('/api/events') && target.mode === 'live') { harnessAborted.add(r.url()); return route.abort(); }
  if (target.mode === 'live' && sameOrigin && (isWrite(r.method(), u.pathname) || u.pathname.startsWith('/api/ai/'))) {
    buf.blocked.push({ method: r.method(), url: u.pathname });
    return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Blocked by ux-sim (live mode): nothing is written to the real site.' }) });
  }
  if (LOCAL_HOSTS.has(u.hostname)) return route.continue();
  // Chromium cannot reach external HTTPS through the sandbox proxy — Node fetch does (docs/pm-agent/shoot.mjs)
  try {
    const res = await fetch(r.url(), { method: r.method(), headers: { ...r.headers(), 'user-agent': ua }, body: ['GET', 'HEAD'].includes(r.method()) ? undefined : r.postDataBuffer(), signal: AbortSignal.timeout(20_000), redirect: 'manual' });
    const h = Object.fromEntries([...res.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
    await route.fulfill({ status: res.status, headers: h, body: Buffer.from(await res.arrayBuffer()) });
  } catch { harnessAborted.add(r.url()); await route.abort().catch(() => {}); }
});

const page = await ctx.newPage();
const isSse = (url) => url.includes('/api/events');
page.on('console', (m) => { if (m.type() !== 'error') return; const t = m.text(); if (/net::ERR_(FAILED|ABORTED)/.test(t) && harnessAborted.size) return; buf.console.push(t.slice(0, 300)); });
page.on('pageerror', (e) => buf.console.push(`PAGE ERROR ${String(e.message).slice(0, 300)}`));
page.on('request', (r) => { if (!isSse(r.url())) inflight.add(r); });
page.on('requestfinished', (r) => inflight.delete(r));
page.on('requestfailed', (r) => {
  inflight.delete(r);
  if (harnessAborted.has(r.url()) || isSse(r.url())) return;
  envHit(r.url());
  buf.failed.push({ method: r.method(), url: r.url().slice(0, 200), status: 0, error: r.failure()?.errorText });
});
page.on('response', (res) => {
  if (res.status() < 400) return;
  envHit(res.url());
  if (!buf.blocked.some((b) => res.url().endsWith(b.url))) buf.failed.push({ method: res.request().method(), url: res.url().slice(0, 200), status: res.status() });
});

/** a request to a known environment-limited endpoint failed → findings on this step are environment-limited */
function envHit(url) { let p = url; try { p = new URL(url).pathname; } catch { /* */ } for (const e of env.requests ?? []) if (p.includes(e.match)) buf.envHits.push({ url: p, reason: e.reason }); }

async function settle(maxMs = 7000) {
  const t0 = Date.now();
  let quiet = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (inflight.size === 0) { if (Date.now() - quiet >= 450) break; } else quiet = Date.now();
    await sleep(100);
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
  await sleep(300); // transitions
}

// ─── observation ──────────────────────────────────────────────────────────────
const idByKey = new Map();
let nextId = 0;
let lastIds = new Set();
let last = null; // last observation (internal)
const seenText = new Set(); // for goto: addresses the user has actually seen on screen

const pad = (n) => String(n).padStart(3, '0');

function lineFor(d, isNew) {
  const implicit = { a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', input: 'textbox', summary: 'button', label: 'label' }[d.tag];
  let tag = d.tag;
  if (d.role === 'clickable') tag += ' clickable';
  else if (d.role !== implicit && !(d.tag === 'input' && ['checkbox', 'radio', 'button', 'slider', 'searchbox'].includes(d.role))) tag += ` role=${d.role}`;
  if (d.type && d.type !== 'text') tag += ` type=${d.type}`;
  const flags = [d.disabled && 'disabled', d.checked === true && 'checked', d.checked === false && 'unchecked', d.selected && 'selected', d.expanded === true && 'expanded', d.expanded === false && 'collapsed'].filter(Boolean);
  const label = d.name ? d.name : `(no label${d.icon ? `, icon: ${d.icon}` : ''})`;
  const val = d.value !== undefined ? ` value="${String(d.value).slice(0, 40)}"` : '';
  const where = d.inViewport ? '' : d.below ? '  ↓ below' : d.above ? '  ↑ above' : '  (off screen)';
  return `${isNew ? '*' : ''}[${d.id}]<${tag}${flags.length ? ' ' + flags.join(' ') : ''}> ${label}${val}${where}`;
}

async function observe(stepIndex, kind) {
  await page.evaluate(clearMarks).catch(() => {});
  let raw;
  for (let i = 0; i < 3; i++) {
    try { raw = await page.evaluate(collect, { tapMin: 44, phone }); break; } catch (e) { if (i === 2) throw e; await sleep(500); }
  }
  const counts = new Map();
  const map = {};
  for (const d of raw.elements) {
    const k0 = `${d.tag}|${d.role}|${d.name}|${d.href ?? ''}|${d.icon}`;
    const n = (counts.get(k0) ?? 0) + 1; counts.set(k0, n);
    const key = `${k0}#${n}`;
    if (!idByKey.has(key)) idByKey.set(key, ++nextId);
    d.id = idByKey.get(key); d.key = key;
    map[d.tmp] = d.id;
  }
  await page.evaluate(assignIds, map).catch(() => {});
  const shot = path.join(shotsDir, `${pad(stepIndex)}-${kind}.jpg`);
  const som = path.join(shotsDir, `${pad(stepIndex)}-${kind}-som.jpg`);
  await page.screenshot({ path: shot, type: 'jpeg', quality: 60, scale: 'css' });
  const vis = raw.elements.filter((d) => d.inViewport);
  await page.evaluate(drawMarks, vis.map((d) => ({ id: d.id, box: d.box }))).catch(() => {});
  await page.screenshot({ path: som, type: 'jpeg', quality: 60, scale: 'css' });
  await page.evaluate(clearMarks).catch(() => {});

  const ids = new Set(raw.elements.map((d) => d.id));
  const newIds = [...ids].filter((id) => !lastIds.has(id));
  const isNew = (id) => last !== null && !lastIds.has(id);
  lastIds = ids;
  const off = raw.elements.filter((d) => !d.inViewport).sort((a, b) => Math.abs(a.box.y) - Math.abs(b.box.y));
  const shownOff = off.slice(0, 40);
  const lines = [...vis, ...shownOff].map((d) => lineFor(d, isNew(d.id)));
  const seenCount = new Map();
  for (const t of raw.texts) seenCount.set(t, (seenCount.get(t) ?? 0) + 1);
  const shownCount = new Map();
  const text = raw.texts.filter((t) => { const n = (shownCount.get(t) ?? 0) + 1; shownCount.set(t, n); return n <= 2 || t.length <= 2; })
    .map((t, i, arr) => (seenCount.get(t) > 2 && t.length > 2 && arr.indexOf(t) === i ? `${t} (×${seenCount.get(t)} on screen)` : t)).join(' | ');
  for (const m of text.matchAll(/(?:https?:\/\/[^\s|]+|(?:^|\s)\/[a-z0-9][\w\-/?=&.]*)/gi)) seenText.add(m[0].trim());
  const fingerprint = sha1(JSON.stringify([raw.url, raw.elements.length, text, raw.elements.map((d) => `${d.value ?? ''}${d.state ?? ''}`).join('\u0001'), raw.scroll.top]));
  const pixels = sha1(readFileSync(shot));
  // simulated reading time: only text that is new on screen, at the persona's reading speed and depth
  const prevTexts = new Set(last?.texts ?? []);
  const newChars = raw.texts.filter((t) => !prevTexts.has(t)).join(' ').length;
  const readSec = (newChars / (persona.readingCharsPerSec ?? 25)) * (persona.readingDepth ?? 0.6);
  const goal = await goalTrace(raw.url, raw.fullText);
  const goalMet = goal.met;
  const small = raw.checks.smallTapTargets.map((tmp) => raw.elements.find((d) => d.tmp === tmp)).filter(Boolean);
  const obs = {
    url: raw.url, route: normalizeRoute(raw.url), title: raw.title, elements: raw.elements, lines, texts: raw.texts, text,
    offscreenOmitted: off.length - shownOff.length, scroll: raw.scroll, fingerprint, goalMet, goal, readSec,
    checks: { smallTapTargets: small.map((d) => ({ id: d.id, name: d.name || d.icon, w: d.box.w, h: d.box.h })), horizontalOverflowPx: raw.checks.horizontalOverflowPx, brokenImages: raw.checks.brokenImages, navLoadMs: raw.checks.navLoadMs },
    screenshot: rel(shot), annotated: rel(som), newIds, pixels,
  };
  last = obs;
  return obs;
}

/** $me for sign-up scenarios is whoever the browser is signed in as now */
async function goalTrace(url, text) {
  if (authMode === 'none' && target.mode === 'local') {
    const id = await page.evaluate((k) => { try { return localStorage.getItem(k); } catch { return null; } }, BROWSER_KEYS.user).catch(() => null);
    vars.me = id || undefined;
  }
  const snapshot = recordCollections(scenario.success).length ? readData() : null;
  return traceSuccess(scenario.success, { url, text, record: (leaf) => (baseline ? evalRecord(leaf, { snapshot, baseline, vars }) : null) });
}

function scrollLabel(s) {
  if (s.max <= 0) return 'whole screen visible (nothing to scroll)';
  const pct = Math.round((s.top / s.max) * 100);
  return `${pct}% scrolled · ${s.top < s.max - 4 ? 'more below' : 'at the bottom'}${s.top > 4 ? ' · more above' : ''}`;
}

function patienceLine() {
  const c = run.counters;
  return `actions ${c.actions}/${P.maxSteps} · frustration ${c.frustration.toFixed(2)}/${P.frustrationThreshold} · confused-notes ${c.confusionNotes}/${P.confusionTolerance} · sim-time ${Math.round(c.simTimeSec)}/${P.timeBudgetSec}s`;
}

function nudge() {
  const c = run.counters;
  const frac = Math.max(c.actions / P.maxSteps, c.frustration / P.frustrationThreshold, c.simTimeSec / P.timeBudgetSec);
  const out = [];
  if (frac >= 0.85) out.push(`You are almost out of patience (${Math.round(frac * 100)}%). ${persona.name} would give up very soon — decide now whether this is worth it.`);
  else if (frac >= 0.7) out.push(`Patience is wearing thin (${Math.round(frac * 100)}%). Is ${persona.name} still motivated to keep going?`);
  return out.length ? out.join(' ') : undefined;
}

/** shown on every response once the persona's confusion tolerance is used up (PERSONA_RUN.md §3.6) */
function exhaustedLine() {
  if (run.patienceExhaustedAtStep === null) return undefined;
  const left = Math.max(0, 1 - run.actionsAfterPatienceExhausted);
  return `PATIENCE EXHAUSTED (step ${run.patienceExhaustedAtStep}: ${run.counters.confusionNotes} confused/frustrated moments, ${persona.name}'s limit is ${P.confusionTolerance}). Finish now with --outcome abandoned — unless you are in the middle of the action that completes the goal and it needs at most one more action (${left} left; continuing is recorded as overrodePatience). A further action ends the run as abandoned.`;
}

let pendingIntent = null; // { step, expect, confidence }

function view(obs, extra = {}) {
  const c = obs.checks;
  const checkBits = [];
  if (c.smallTapTargets.length) checkBits.push(`${c.smallTapTargets.length} tap target(s) under 44px: ${c.smallTapTargets.slice(0, 6).map((t) => `[${t.id}] ${t.w}x${t.h}`).join(', ')}`);
  if (c.horizontalOverflowPx > 0) checkBits.push(`page scrolls sideways by ${c.horizontalOverflowPx}px`);
  if (c.brokenImages) checkBits.push(`${c.brokenImages} broken image(s)`);
  return {
    step: extra.step,
    ...extra.action,
    url: obs.url.replace(base.origin, '') || '/',
    title: obs.title,
    patience: patienceLine(),
    patienceExhausted: exhaustedLine(),
    nudge: exhaustedLine() ? undefined : nudge(),
    reflect: pendingIntent ? `Before step ${pendingIntent.step} you expected: "${pendingIntent.expect}" (confidence ${pendingIntent.confidence ?? '?'}). Does this screen match? Record it: note --mismatch yes|no --actual "<what happened>" --feeling … --thought "…"` : undefined,
    signals: extra.signals?.length ? extra.signals : undefined,
    notices: extra.notices?.length ? extra.notices : undefined,
    elements: obs.lines,
    offscreenOmitted: obs.offscreenOmitted || undefined,
    text: obs.text.length > 1500 ? obs.text.slice(0, 1500) + ' …' : obs.text,
    scroll: scrollLabel(obs.scroll),
    autoChecks: checkBits.length ? checkBits.join('; ') : 'ok',
    screenshot: obs.screenshot,
    annotated: obs.annotated,
  };
}

function stepBase(kind, command, args) {
  return { index: run.steps.length, at: new Date().toISOString(), kind, command, args };
}

function recordObservation(step, obs) {
  step.urlAfter = obs.url;
  step.route = obs.route;
  step.screenshot = obs.screenshot;
  step.annotatedScreenshot = obs.annotated;
  step.observation = { title: obs.title, elementCount: obs.elements.length, newElementIds: obs.newIds, elements: obs.lines, text: obs.text.slice(0, 1500), scroll: obs.scroll, fingerprint: obs.fingerprint, simReadSec: Math.round(obs.readSec * 10) / 10 };
  step.checks = obs.checks;
  run.counters.simTimeSec += obs.readSec;
  // never on the start screen: what is there before the persona acts is seed state, not their achievement
  if (obs.goalMet && step.kind !== 'start' && run.counters.actions > 0 && run.goalFirstMetAtStep === null) {
    run.goalFirstMetAtStep = step.index; run.goalAchieved = true; run.stepsToGoal = run.counters.actions;
    run.goalEvidence = { step: step.index, url: obs.url.replace(base.origin, '') || '/', matched: obs.goal.matched, screenshot: obs.screenshot };
  }
  if (obs.checks.smallTapTargets.length || obs.checks.horizontalOverflowPx > 0 || obs.checks.brokenImages) {
    run.autoChecks.push({ step: step.index, route: obs.route, smallTapTargets: obs.checks.smallTapTargets.length, smallTapTargetExamples: obs.checks.smallTapTargets.slice(0, 5), horizontalOverflowPx: obs.checks.horizontalOverflowPx, brokenImages: obs.checks.brokenImages, screenshot: obs.screenshot });
  }
}

function drain(step) {
  step.consoleErrors = buf.console.slice(0, 20);
  step.failedRequests = buf.failed.filter((f) => !isSse(f.url)).slice(0, 20);
  step.blockedRequests = buf.blocked.slice(0, 20);
  step.environmentHits = buf.envHits.slice(0, 10);
  buf = { console: [], failed: [], blocked: [], envHits: [] };
}

// ─── setup: auth + start URL ─────────────────────────────────────────────────
const apiBase = new URL(target.apiUrl ?? target.baseUrl);
async function setup() {
  const s = stepBase('start', 'start', { persona: persona.id, scenario: scenario.id, auth: authMode });
  const notes = [];
  const school = scenario.setup?.school ?? 'berkeley';
  if (authMode === 'demo') {
    await page.goto(new URL(`/welcome?demo=${school}`, base).href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForURL((u) => !u.pathname.startsWith('/welcome'), { timeout: 30_000 }).catch(() => notes.push('demo login did not leave /welcome'));
    await settle();
    vars.me = await page.evaluate((k) => localStorage.getItem(k), BROWSER_KEYS.user).catch(() => null) || undefined;
    Object.assign(run.auth, { userId: vars.me ?? null, sample: true, note: `shared ${school} demo account (sample profile with someone else's data)` });
    notes.push(`signed in as the ${school} demo account (sample data)`);
  } else if (authMode === 'fresh') {
    if (target.mode === 'live') throw new Error('auth "fresh" registers a real account — never on live (use --auth demo or none)');
    const tag = cfg.runId.slice(-4) + Date.now().toString(36).slice(-4);
    const dataFile = dataFileAbs;
    const acc = await registerFresh(apiBase.href, profileFor(persona, { schoolId: scenario.setup?.schoolId ?? 's_berkeley' }), { tag, dataFile });
    vars.me = acc.user.id;
    if (scenario.setup?.peers?.length) {
      const peers = await seedPeers(apiBase.href, scenario.setup.peers, { tag, dataFile });
      vars.peers = peers.map((x) => x.userId); vars.peerActivities = peers.map((x) => x.activityId).filter(Boolean); vars.peerRides = peers.map((x) => x.rideId).filter(Boolean);
      run.auth.peers = peers;
      notes.push(`seeded ${peers.length} peer account(s) (real, non-sample local fixtures): ${peers.map((x) => x.nickname).join(', ')}`);
    }
    // sign the browser in the way the app does after sign-up: token + user id in localStorage
    await page.goto(new URL('/api/health', base).href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.evaluate(({ k, token, user, lang, appLang }) => { localStorage.setItem(k.token, token); localStorage.setItem(k.user, user); if (appLang) localStorage.setItem(lang, appLang); }, { k: BROWSER_KEYS, token: acc.token, user: acc.user.id, lang: BROWSER_KEYS.lang, appLang: acc.profile.appLanguage });
    const { avatar: _a, ...profile } = acc.profile;
    Object.assign(run.auth, { userId: acc.user.id, email: acc.email, sample: !!acc.user.sample, emailVerified: !!acc.user.affiliation?.emailVerified, profile, createdVia: 'POST /api/schools/send-code → /api/schools/verify-code → /api/auth/register' });
    notes.push(`signed in as a brand-new verified account ${acc.email} (${acc.profile.nickname}, ${acc.profile.department || 'no major'}, born ${acc.profile.birthYear})`);
  } else {
    Object.assign(run.auth, { userId: null, note: 'signed out — the persona signs up (or not) in the app' });
  }
  if (target.mode === 'local') baseline = baselineOf(readData(), recordCollections(scenario.success));
  const t0 = Date.now();
  await page.goto(new URL(scenario.startUrl, base).href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await settle(10_000);
  s.latencyMs = Date.now() - t0;
  s.urlBefore = null;
  s.setupNotes = notes;
  drain(s);
  const obs = await observe(s.index, 'start');
  recordObservation(s, obs);
  run.steps.push(s);
  save();
  return view(obs, { step: s.index, notices: harnessNotices(s) });
}

function harnessNotices(step) {
  const n = [];
  if (step.blockedRequests?.length) n.push(`ux-sim live guard blocked ${step.blockedRequests.length} write(s) (${step.blockedRequests.map((b) => b.url).slice(0, 3).join(', ')}). Any error or missing result right after this is environment-limited — note it with --environment-limited, do not report it as a product bug.`);
  const envr = (env.routes ?? []).find((r) => new RegExp(r.match).test(new URL(step.urlAfter ?? base.href).pathname));
  if (envr) n.push(`Environment limit on this screen: ${envr.reason} Do not log missing data here as a UX bug.`);
  if (step.environmentHits?.length) n.push(`Environment limit: ${step.environmentHits[0].reason}`);
  return n;
}

// ─── actions ─────────────────────────────────────────────────────────────────
const recent = []; // last WINDOW action hashes
const urlTrail = []; // url after each action

class Stale extends Error {}

async function locate(id) {
  let loc = page.locator(`[data-uxsim-id="${id}"]`);
  if ((await loc.count()) === 0) {
    // DOM re-rendered since the last look — re-tag with the same stable ids (no screenshot)
    const raw = await page.evaluate(collect, { tapMin: 44, phone });
    const counts = new Map(); const map = {};
    for (const d of raw.elements) { const k0 = `${d.tag}|${d.role}|${d.name}|${d.href ?? ''}|${d.icon}`; const n = (counts.get(k0) ?? 0) + 1; counts.set(k0, n); const sid = idByKey.get(`${k0}#${n}`); if (sid !== undefined) map[d.tmp] = sid; }
    await page.evaluate(assignIds, map);
    loc = page.locator(`[data-uxsim-id="${id}"]`);
    if ((await loc.count()) === 0) throw new Stale(`element [${id}] is not on the screen any more — run observe and use the new numbers`);
  }
  return loc.first();
}

function descriptor(id) {
  const d = last?.elements.find((e) => e.id === Number(id));
  return d ? { id: d.id, tag: d.tag, role: d.role, name: d.name, icon: d.icon || undefined, href: d.href, box: d.box, inViewport: d.inViewport, disabled: d.disabled } : { id: Number(id) };
}

/** Tap a point where the element itself is on top (not its centre, which a sticky bar may cover) — see dom.hitPoint. */
let lastTap = null;
async function tapVisible(loc) {
  await loc.scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => {});
  let pt = await loc.evaluate(hitPoint).catch(() => null);
  if (!pt || pt.x === null) {
    await loc.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' })).catch(() => {});
    await sleep(250);
    pt = await loc.evaluate(hitPoint).catch(() => null);
  }
  if (!pt) throw new Stale('element has no position on screen any more — observe again');
  if (pt.x === null) throw new Stale(`that element is covered${pt.coveredBy ? ` by “${pt.coveredBy}”` : ''} everywhere — a tap would hit what is on top. Scroll or close it, then observe again.`);
  lastTap = pt;
  await page.mouse.click(pt.x, pt.y);
}

const ACTIONS = {
  async click({ id }) { await tapVisible(await locate(id)); },
  async tap({ x, y }) {
    const vp = persona.device.viewport;
    if (!(x >= 0 && y >= 0 && x <= vp.width && y <= vp.height)) throw new Refused(`tap x y must be inside the ${vp.width}x${vp.height} screen (screenshot pixels)`);
    await page.mouse.click(x, y);
  },
  async type({ id, text, submit }) {
    const loc = await locate(id);
    await tapVisible(loc);
    // only type where the tap put the cursor — never into whatever else has focus, and never after the page changed
    const focused = await loc.evaluate((el) => el === document.activeElement || el.contains(document.activeElement)).catch(() => false);
    if (!focused) throw new Error('tapping the field did not put the cursor in it (the screen changed or something else took the tap) — nothing was typed');
    try { await loc.fill(String(text), { timeout: 3000 }); } catch { await page.keyboard.type(String(text), { delay: 20 }); }
    if (submit) await page.keyboard.press('Enter');
  },
  async select({ id, option }) { const loc = await locate(id); await loc.selectOption({ label: String(option) }, { timeout: 3000 }).catch(async () => loc.selectOption(String(option), { timeout: 3000 })); },
  async scroll({ direction }) {
    const vp = persona.device.viewport;
    await page.mouse.move(vp.width / 2, vp.height / 2);
    await page.mouse.wheel(0, (direction === 'up' ? -1 : 1) * Math.round(vp.height * 0.7));
    await sleep(500);
  },
  async swipe({ direction }) {
    const vp = persona.device.viewport;
    const y = vp.height * 0.45; const x0 = vp.width / 2;
    const dx = direction === 'left' ? -vp.width * 0.45 : direction === 'right' ? vp.width * 0.45 : 0;
    const dy = direction === 'up' ? -vp.height * 0.35 : direction === 'down' ? vp.height * 0.35 : 0;
    await page.mouse.move(x0, y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(x0 + (dx * i) / 8, y + (dy * i) / 8); await sleep(16); }
    await page.mouse.up();
  },
  async back() { const r = await page.goBack({ waitUntil: 'commit', timeout: 6000 }).catch(() => null); if (!r && !(await page.evaluate(() => history.length > 1))) throw new Error('there is no previous page'); },
  async goto({ url }) {
    const u = new URL(url, base);
    if (u.origin !== base.origin) throw new Error('can only open addresses of the app under test');
    const want = u.pathname + u.search;
    const start = new URL(scenario.startUrl, base);
    const allowed = [...new Set([start.pathname + start.search, '/', ...(scenario.typeableUrls ?? [])])];
    const seen = [...seenText].some((s) => s.includes(u.pathname) && u.pathname.length > 1);
    if (!allowed.includes(want) && !allowed.includes(u.pathname) && !seen) throw new Refused(`refused: a real user could not know the address ${want}. Only the start URL (${allowed.join(', ')}) or an address shown on screen can be typed. Navigate with what is on screen.`);
    await page.goto(u.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  },
  async wait({ ms }) { await sleep(Math.min(Math.max(Number(ms) || 1000, 100), 10_000)); },
};
class Refused extends Error {}

async function act(kind, args) {
  if (run.status !== 'running') throw new Error('this run is finished');
  const step = stepBase('action', kind, args);
  step.urlBefore = page.url();
  if (args.id !== undefined) step.target = descriptor(args.id);
  if (kind === 'tap') { const hit = last?.elements.find((d) => d.inViewport && args.x >= d.box.x && args.x <= d.box.x + d.box.w && args.y >= d.box.y && args.y <= d.box.y + d.box.h); step.target = hit ? { ...descriptor(hit.id), at: { x: args.x, y: args.y } } : { at: { x: args.x, y: args.y }, name: null }; }
  if (args.expect) { step.intent = { expectedOutcome: String(args.expect), confidence: args.confidence !== undefined ? Number(args.confidence) : null }; }
  const fpBefore = last?.fingerprint;
  const pixelsBefore = last?.pixels;
  const scrollBefore = kind === 'scroll' ? await page.evaluate(scrollState).catch(() => null) : null;
  buf = { console: [], failed: [], blocked: [], envHits: [] };
  // patience: after the harness said it is exhausted, ONE more action is allowed (to finish a goal that is one tap away)
  if (run.patienceExhaustedAtStep !== null && kind !== 'wait') {
    if (run.actionsAfterPatienceExhausted >= 1) {
      const ended = await finish({ outcome: 'abandoned', reason: `[harness] ${persona.name}'s patience was exhausted at step ${run.patienceExhaustedAtStep}; one more action was allowed to finish the goal, and the persona tried a second.` }, 'harness:patience');
      return { ok: false, counted: false, sessionEnded: ended, error: 'patience exhausted — the run was ended as abandoned' };
    }
  }
  const afterExhaustion = run.patienceExhaustedAtStep !== null && kind !== 'wait';
  lastTap = null;
  const t0 = Date.now();
  let error = null;
  try { await ACTIONS[kind](args); } catch (e) {
    if (e instanceof Stale || e instanceof Refused) { return { ok: false, counted: false, error: e.message, patience: patienceLine() }; }
    error = String(e.message ?? e).split('\n')[0].slice(0, 300);
  }
  await settle();
  step.latencyMs = Date.now() - t0;
  if (lastTap) step.tapPoint = lastTap;
  run.counters.actions++;
  if (afterExhaustion) { run.actionsAfterPatienceExhausted++; run.overrodePatience = true; step.afterPatienceExhausted = true; }
  step.actionNumber = run.counters.actions;
  step.result = error ? 'error' : 'ok';
  if (error) step.error = error;
  drain(step);
  const obs = await observe(step.index, kind);
  recordObservation(step, obs);
  run.counters.simTimeSec += step.latencyMs / 1000;

  // objective frustration signals (counted against patience by the harness, not by the model)
  const signals = [];
  const add = (type, detail) => { signals.push({ type, weight: WEIGHTS[type], detail }); run.counters.frustration += WEIGHTS[type]; };
  if (error) add('failed', error);
  if (!error && kind !== 'wait') {
    if (kind === 'scroll') { const after = await page.evaluate(scrollState).catch(() => null); if (scrollBefore !== null && after === scrollBefore) add('no_effect', `scroll ${args.direction} did not move the page`); }
    else if (fpBefore && obs.fingerprint === fpBefore && obs.pixels === pixelsBefore) add('no_effect', `nothing visible changed after ${kind}${args.id !== undefined ? ` [${args.id}]` : ''}`);
  }
  const h = sha1(JSON.stringify([kind, step.target?.name ?? step.target?.id ?? '', args.text ?? '', args.direction ?? '', args.url ?? '', fpBefore ?? normalizeRoute(step.urlBefore)])); // same action on the same screen state
  const reps = recent.filter((x) => x === h).length;
  if (reps >= 1 && !(kind === 'scroll' && !signals.some((s) => s.type === 'no_effect')) && kind !== 'wait') add('repeated', `same ${kind} as ${reps} time(s) in the last ${WINDOW} actions`);
  recent.push(h); if (recent.length > WINDOW) recent.shift();
  if (kind === 'back' || (urlTrail.length >= 2 && obs.url === urlTrail[urlTrail.length - 2] && obs.url !== step.urlBefore)) add('backtrack', `went back to ${normalizeRoute(obs.url)}`);
  urlTrail.push(obs.url);
  step.signals = signals;
  step.frustrationAfter = Math.round(run.counters.frustration * 100) / 100;
  if (step.intent) pendingIntent = { step: step.index, expect: step.intent.expectedOutcome, confidence: step.intent.confidence };
  run.steps.push(step);

  const notices = harnessNotices(step);
  let ended = null;
  if (run.counters.frustration >= P.frustrationThreshold) ended = await finish({ outcome: 'abandoned', reason: `[harness] ${persona.name}'s patience ran out: objective frustration ${run.counters.frustration.toFixed(2)} reached ${P.frustrationThreshold} (failed actions, no-effect taps, repeats, backtracking, mismatches).` }, 'harness:frustration');
  else if (run.counters.actions >= P.maxSteps) ended = await finish({ outcome: 'timeout', reason: `[harness] ${persona.name} used all ${P.maxSteps} actions they were willing to spend.` }, 'harness:max_steps');
  else if (run.counters.simTimeSec >= P.timeBudgetSec) ended = await finish({ outcome: 'timeout', reason: `[harness] ${persona.name}'s time budget (${P.timeBudgetSec}s simulated reading + waiting) ran out.` }, 'harness:time_budget');
  save();
  const out = view(obs, { step: step.index, action: { action: `${kind}${args.id !== undefined ? ` [${args.id}]` : ''}${kind === 'tap' ? ` ${args.x},${args.y}` : ''}${args.direction ? ` ${args.direction}` : ''}`, result: step.result, error: step.error, latencyMs: step.latencyMs }, signals: signals.map((s) => `${s.type}: ${s.detail}`), notices });
  if (ended) { out.sessionEnded = ended; out.nudge = undefined; }
  return out;
}

// ─── notes ───────────────────────────────────────────────────────────────────
function note(a) {
  if (run.status !== 'running') throw new Error('this run is finished');
  if (!FEELINGS.includes(a.feeling)) throw new Error(`--feeling must be one of ${FEELINGS.join('|')}`);
  if (!a.thought || a.thought === true) throw new Error('--thought "<in persona voice>" is required');
  if (a.friction !== undefined && !FRICTION_TYPES.includes(a.friction)) throw new Error(`--friction must be one of ${FRICTION_TYPES.join('|')}`);
  const sev = a.severity !== undefined ? Number(a.severity) : undefined;
  if (a.friction && !(sev >= 1 && sev <= 4)) throw new Error('--severity 1-4 is required with --friction (1 minor · 2 slowed me · 3 nearly gave up · 4 blocker)');
  const about = [...run.steps].reverse().find((s) => s.kind !== 'note') ?? run.steps[0];
  const step = stepBase('note', 'note', a);
  step.about = about.index;
  step.feeling = a.feeling;
  step.thought = String(a.thought);
  step.urlAfter = about.urlAfter;
  step.route = about.route;
  if (['confused', 'frustrated'].includes(a.feeling)) run.counters.confusionNotes++;
  const res = { ok: true, step: step.index, about: about.index };
  if (run.patienceExhaustedAtStep === null && run.counters.confusionNotes >= P.confusionTolerance) run.patienceExhaustedAtStep = step.index;
  if (a.mismatch !== undefined) {
    const mm = ['yes', 'true', '1', true].includes(a.mismatch);
    const target = pendingIntent ? run.steps[pendingIntent.step] : about;
    target.reflection = { mismatch: mm, actualOutcome: a.actual && a.actual !== true ? String(a.actual) : null, feeling: a.feeling, note: step.thought };
    if (mm) { run.counters.frustration += WEIGHTS.mismatch; (target.signals ??= []).push({ type: 'mismatch', weight: WEIGHTS.mismatch, detail: 'screen did not match what the persona expected' }); }
    pendingIntent = null;
    res.reflection = target.index;
  }
  if (a.friction) {
    const elId = a.element !== undefined ? Number(a.element) : undefined;
    const el = elId !== undefined ? descriptor(elId) : null; // only an element the persona points at — the tapped thing is often not the problem
    const route = about.route ?? normalizeRoute(about.urlAfter ?? '/');
    let envLimited = a['environment-limited'] !== undefined && a['environment-limited'] !== 'no';
    let envReason = envLimited ? (typeof a['env-reason'] === 'string' ? a['env-reason'] : 'marked by the persona agent') : null;
    const path0 = new URL(about.urlAfter ?? base.href).pathname;
    const r = (env.routes ?? []).find((x) => new RegExp(x.match).test(path0));
    if (!envLimited && r) { envLimited = true; envReason = r.reason; }
    if (!envLimited && about.blockedRequests?.length) { envLimited = true; envReason = 'a write was blocked by the ux-sim live guard on this step'; }
    if (!envLimited && about.environmentHits?.length) { envLimited = true; envReason = about.environmentHits[0].reason; }
    const cat = env.catalogBuiltin;
    if (!envLimited && catalogBuiltin && cat && new RegExp(cat.route).test(path0) && cat.types.includes(a.friction)) { envLimited = true; envReason = cat.reason; }
    const caveat = (env.contentCaveats ?? []).find((c) => c.types.includes(a.friction) && new RegExp(c.route).test(path0) && (c.when !== 'catalogBuiltin' || catalogBuiltin));
    const ev = {
      id: `f${run.frictionEvents.length + 1}`, step: about.index, noteStep: step.index, type: a.friction, severity: sev, feeling: a.feeling,
      quote: step.thought, url: (about.urlAfter ?? '').replace(base.origin, ''), route,
      element: el ? { id: el.id, role: el.role, name: el.name, icon: el.icon } : null,
      key: typeof a.key === 'string' ? a.key : null,
      wish: typeof a.wish === 'string' ? a.wish : null,
      evidence: [about.screenshot, about.annotatedScreenshot].filter(Boolean),
      environmentLimited: envLimited, environmentLimitedReason: envReason, environmentCaveat: caveat?.reason ?? null,
    };
    run.frictionEvents.push(ev);
    step.frictionId = ev.id;
    res.friction = ev.id; res.environmentLimited = envLimited || undefined; res.environmentLimitedReason = envReason ?? undefined;
  }
  run.steps.push(step);
  save();
  res.patience = patienceLine();
  res.nudge = nudge();
  res.patienceExhausted = exhaustedLine();
  return res;
}

// ─── finish ──────────────────────────────────────────────────────────────────
let finishing = null;
async function finish(a, endedBy = 'persona') {
  if (finishing) return finishing;
  if (!OUTCOMES.includes(a.outcome)) throw new Error(`--outcome must be one of ${OUTCOMES.join('|')}`);
  if (!a.reason || a.reason === true) throw new Error('--reason "<in persona voice>" is required');
  finishing = (async () => {
    // one last look so the success check sees the final screen
    if (endedBy === 'persona') {
      const s = stepBase('finish', 'finish', a); s.urlBefore = page.url(); drain(s);
      try { const obs = await observe(s.index, 'finish'); recordObservation(s, obs); } catch { /* page gone */ }
      run.steps.push(s);
    }
    run.reportedOutcome = a.outcome;
    run.outcomeReason = String(a.reason);
    run.endedBy = endedBy;
    run.outcome = a.outcome;
    if (a.outcome === 'success' && !run.goalAchieved) { run.outcome = 'false_success'; run.falseSuccess = true; }
    if (a.outcome !== 'success' && run.goalAchieved) run.unnoticedSuccess = true;
    const lastAction = [...run.steps].reverse().find((s) => s.kind === 'action') ?? run.steps[run.steps.length - 1];
    const lastShot = [...run.steps].reverse().find((s) => s.screenshot);
    if (run.outcome !== 'success') run.abandonPoint = { step: lastAction.index, url: (lastShot?.urlAfter ?? '').replace(base.origin, ''), route: lastShot?.route ?? null, screenshot: lastShot?.screenshot ?? null, annotatedScreenshot: lastShot?.annotatedScreenshot ?? null };
    run.dropoffRisk = dropoff(a);
    run.status = 'finished';
    run.finishedAt = new Date().toISOString();
    save();
    setTimeout(shutdown, 300);
    return { outcome: run.outcome, reportedOutcome: run.reportedOutcome, goalAchieved: run.goalAchieved, falseSuccess: run.falseSuccess, endedBy, reason: run.outcomeReason, runFile: rel(runFile) };
  })();
  return finishing;
}

function dropoff(a) {
  const ux = run.frictionEvents.filter((f) => !f.environmentLimited);
  const serious = ux.filter((f) => f.severity >= 3);
  const sig = run.steps.filter((s) => (s.signals ?? []).length);
  if (a.dropoff && a.dropoff !== true) {
    if (!['low', 'medium', 'high'].includes(a.dropoff)) throw new Error('--dropoff must be low|medium|high');
    const basis = typeof a['dropoff-basis'] === 'string' ? a['dropoff-basis'].split(',').map(Number).filter(Number.isFinite) : serious.map((f) => f.step);
    return { kind: 'hypothesis', level: a.dropoff, rationale: typeof a['dropoff-why'] === 'string' ? a['dropoff-why'] : 'Persona agent judgement.', basis, source: 'persona-agent' };
  }
  let level = 'low';
  const why = [];
  if (['abandoned', 'failed', 'timeout', 'false_success'].includes(run.outcome)) { level = 'high'; why.push(`run ended ${run.outcome}${run.endedBy !== 'persona' ? ` (${run.endedBy})` : ''}`); }
  if (ux.some((f) => f.severity === 4)) { level = 'high'; why.push('a severity-4 blocker was reported'); }
  if (level !== 'high' && (serious.length || run.counters.frustration >= P.frustrationThreshold / 2 || run.counters.confusionNotes >= P.confusionTolerance)) { level = 'medium'; why.push(`${serious.length} severity≥3 event(s), objective frustration ${run.counters.frustration.toFixed(2)}/${P.frustrationThreshold}, ${run.counters.confusionNotes} confused note(s)`); }
  if (!why.length) why.push('goal reached without serious friction');
  return { kind: 'hypothesis', level, rationale: `Harness heuristic, not a measurement: ${why.join('; ')}.`, basis: [...new Set([...serious.map((f) => f.step), ...sig.map((s) => s.index)])].sort((x, y) => x - y).slice(0, 12), source: 'harness-heuristic' };
}

let server;
async function shutdown() {
  try { await browser.close(); } catch { /* */ }
  if (target.stack?.port && target.stack.owned) { try { stackDown(target.stack.port); } catch { /* */ } }
  try { server?.close(); } catch { /* */ }
  setTimeout(() => process.exit(0), 200);
}

// ─── control server ──────────────────────────────────────────────────────────
let idle = setTimeout(onIdle, IDLE_MS);
async function onIdle() {
  if (run.status === 'running') await finish({ outcome: 'timeout', reason: `[harness] no command for ${IDLE_MS / 60000} minutes — session closed.` }, 'harness:idle');
}
let queue = Promise.resolve();
const handlers = {
  status: async () => ({ runId: run.runId, status: run.status, url: page.url(), patience: patienceLine(), steps: run.steps.length }),
  observe: async () => {
    if (run.status !== 'running') throw new Error('this run is finished');
    const s = stepBase('observe', 'observe', {}); s.urlBefore = page.url(); drain(s);
    const obs = await observe(s.index, 'observe'); recordObservation(s, obs); run.steps.push(s); save();
    return view(obs, { step: s.index, notices: harnessNotices(s) });
  },
  click: (a) => act('click', { id: Number(a.id), expect: a.expect, confidence: a.confidence }),
  tap: (a) => act('tap', { x: Number(a.x), y: Number(a.y), expect: a.expect, confidence: a.confidence }),
  type: (a) => act('type', { id: Number(a.id), text: a.text, submit: !!a.submit, expect: a.expect, confidence: a.confidence }),
  select: (a) => act('select', { id: Number(a.id), option: a.option, expect: a.expect, confidence: a.confidence }),
  scroll: (a) => { if (!['up', 'down'].includes(a.direction)) throw new Error('scroll up|down'); return act('scroll', { direction: a.direction, expect: a.expect, confidence: a.confidence }); },
  swipe: (a) => { if (!['left', 'right', 'up', 'down'].includes(a.direction)) throw new Error('swipe left|right|up|down'); return act('swipe', { direction: a.direction, expect: a.expect, confidence: a.confidence }); },
  back: (a) => act('back', { expect: a.expect, confidence: a.confidence }),
  goto: (a) => act('goto', { url: a.url, expect: a.expect, confidence: a.confidence }),
  wait: (a) => act('wait', { ms: a.ms }),
  note: async (a) => note(a),
  finish: async (a) => finish(a, 'persona'),
};

let initView;
try { initView = await setup(); } catch (e) {
  run.status = 'finished'; run.outcome = 'failed'; run.endedBy = 'harness:setup_error'; run.outcomeReason = `[harness] setup failed: ${e.message}`; run.finishedAt = new Date().toISOString(); save();
  console.error('setup failed', e);
  await shutdown();
}

server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    clearTimeout(idle); idle = setTimeout(onIdle, IDLE_MS);
    queue = queue.then(async () => {
      let out; let code = 200;
      try {
        const { cmd, args = {} } = JSON.parse(body || '{}');
        if (cmd === 'init') out = initView;
        else if (!handlers[cmd]) { code = 400; out = { error: `unknown command ${cmd}` }; }
        else out = await handlers[cmd](args);
      } catch (e) { code = 400; out = { error: String(e.message ?? e) }; }
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
    });
  });
});
server.listen(0, '127.0.0.1', () => {
  writeJsonAtomic(path.join(runDir, 'session.json'), { runId: run.runId, pid: process.pid, port: server.address().port, startedAt: run.createdAt });
});
process.on('SIGTERM', () => { void finish({ outcome: 'timeout', reason: '[harness] session was killed' }, 'harness:killed').catch(() => shutdown()); });
if (!existsSync(runFile)) save();
