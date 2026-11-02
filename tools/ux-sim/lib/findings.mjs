// Cluster friction events from many runs into findings by fingerprint = normalized screen + friction type + key element.
import { sha1 } from './util.mjs';

export const DISCLAIMER = 'AI simulation — hypotheses, not measured user behaviour.';
export const HYPOTHESIS_NOTE = 'Found by AI personas driving a real browser. Treat it as a hypothesis to confirm with real students, not as measured behaviour; counts are numbers of simulated personas, not user rates.';

export const TYPE_LABEL = {
  bug: 'Bug', ux_confusion: 'Confusing UI', onboarding: 'Onboarding friction', discoverability: 'Hard to find', motivation: 'No reason to stay',
  content_gap: 'Missing / empty content', performance: 'Slow', trust_privacy: 'Trust / privacy worry', copy: 'Unclear wording',
};

/** "5 open · Costco Richmond…" → "open costco richmond" — stable across counts, emoji and punctuation. */
export function normalizeKey(s) {
  if (!s) return '';
  return String(s).toLowerCase().normalize('NFKC').replace(/['’]/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/\d+/g, ' ').replace(/[^\p{L}\s]/gu, ' ').replace(/\b(sample)\b/g, ' ')
    .replace(/\s+/g, ' ').trim().split(' ').slice(0, 5).join(' ');
}

export function keyElementOf(ev) {
  if (ev.key) return normalizeKey(ev.key);
  if (ev.element?.name) return normalizeKey(ev.element.name);
  if (ev.element?.icon) return `icon ${ev.element.icon}`;
  return '';
}

export const fingerprintOf = (ev) => sha1(JSON.stringify([ev.route ?? '/', ev.type, keyElementOf(ev)])).slice(0, 12);

const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** 1–4 or null. Severity arrives as a number or a CLI string ("3"); anything else is not a severity. */
export function toSeverity(v) { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 4 ? n : null; }
/** max of valid severities, null when there are none (never -Infinity/NaN, which JSON writes as null silently) */
export function maxSeverity(xs) { const v = xs.map(toSeverity).filter((x) => x !== null); return v.length ? Math.max(...v) : null; }
export function medianSeverity(xs) { return median(xs.map(toSeverity).filter((x) => x !== null)); }
/** counts per severity level, e.g. { "1": 3, "2": 10, "3": 4, "4": 1 } */
export function severityHistogram(xs) { const h = { 1: 0, 2: 0, 3: 0, 4: 0 }; for (const x of xs.map(toSeverity)) if (x !== null) h[x]++; return h; }

const SUGGEST = {
  bug: (scr, el) => `Reproduce from the evidence steps on ${scr}${el ? ` (around “${el}”)` : ''} and fix it; add a regression check for that screen.`,
  ux_confusion: (scr, el) => `Make it obvious what ${el ? `“${el}”` : 'the main control'} on ${scr} does before people tap it — plain-word label, visible result, or a one-line hint.`,
  onboarding: (scr) => `Shorten or explain this sign-up step (${scr}); ask only what is needed now and let the rest wait until it is useful.`,
  discoverability: (scr, el) => `Surface the path personas were looking for${el ? ` (“${el}”)` : ''} where they looked (${scr}); label icon-only controls.`,
  motivation: (scr) => `Give a reason to stay on ${scr}: show real people or things happening now (or a clear next step) instead of empty or generic content.`,
  content_gap: (scr) => `Check whether the data on ${scr} is really missing (or only missing in the test environment); avoid showing empty sections.`,
  performance: (scr) => `Measure load/action latency on ${scr} and show progress feedback while waiting.`,
  trust_privacy: (scr, el) => `Explain who will see what${el ? ` when tapping “${el}”` : ''} on ${scr} before asking for it.`,
  copy: (scr, el) => `Rewrite ${el ? `“${el}”` : 'the wording'} on ${scr} in plain language (and check the Korean UI).`,
};

/**
 * runs: run.json objects (finished). Returns { findings, environmentLimited } — environment-limited events are kept
 * out of findings so testers do not file them as UX bugs.
 */
export function cluster(runs) {
  const groups = new Map();
  const envLimited = [];
  for (const r of runs) {
    for (const ev of r.frictionEvents ?? []) {
      if (ev.environmentLimited) { envLimited.push({ runId: r.runId, persona: r.persona.id, scenario: r.scenario.id, step: ev.step, type: ev.type, severity: ev.severity, quote: ev.quote, route: ev.route, reason: ev.environmentLimitedReason ?? 'environment-limited' }); continue; }
      const fp = fingerprintOf(ev);
      if (!groups.has(fp)) groups.set(fp, { fp, route: ev.route ?? '/', type: ev.type, keyElement: keyElementOf(ev) || null, elementName: ev.element?.name || ev.key || null, events: [] });
      groups.get(fp).events.push({ runId: r.runId, persona: r.persona.id, scenario: r.scenario.id, step: ev.step, severity: toSeverity(ev.severity), quote: ev.quote, evidence: ev.evidence ?? [], url: ev.url ?? '', wish: ev.wish ?? null, caveat: ev.environmentCaveat ?? null });
    }
  }
  const findings = [...groups.values()].map((g) => {
    const sev = g.events.map((e) => e.severity);
    const personas = [...new Set(g.events.map((e) => e.persona))];
    const scenarios = [...new Set(g.events.map((e) => e.scenario))];
    const el = g.elementName ? String(g.elementName).slice(0, 40) : null;
    const wishes = [...new Set(g.events.map((e) => e.wish).filter(Boolean))];
    const caveats = [...new Set(g.events.map((e) => e.caveat).filter(Boolean))];
    let text = SUGGEST[g.type](g.route, el);
    if (wishes.length) text += ` Personas said they wanted: ${wishes.map((w) => `“${w}”`).join('; ')}.`;
    return {
      fingerprint: g.fp,
      title: `${TYPE_LABEL[g.type]} on ${g.route}${el ? ` — “${el}”` : ''}`,
      screen: g.route, frictionType: g.type, keyElement: g.keyElement, keyElementLabel: el,
      personas, personaCount: personas.length, scenarios, scenarioCount: scenarios.length,
      runs: [...new Set(g.events.map((e) => e.runId))], occurrences: g.events.length,
      severityMax: maxSeverity(sev), maxSeverity: maxSeverity(sev), severityMedian: medianSeverity(sev),
      events: g.events.map(({ caveat: _c, ...e }) => e), wishes, environmentCaveats: caveats,
      suggestedImprovement: { kind: 'hypothesis', text },
      hypothesisNote: HYPOTHESIS_NOTE,
    };
  }).sort((a, b) => b.personaCount - a.personaCount || b.severityMax - a.severityMax || b.occurrences - a.occurrences);
  return { findings, environmentLimited: envLimited };
}
