/**
 * Rides (ride share) — server wiring.
 *
 *   RPC  POST /api/rpc/rides/:method   create · join · leave · close · reopen · cancel · update   (RIDES_RULES: as yourself / as the host)
 *   POST /api/rides/teaser             { id } → destination, time, seats, host first name (works signed out — nothing private)
 *   GET  /r/:id                        share link: index.html with Open Graph tags so it unfurls in group chats
 *
 * Per-viewer filtering of the `rides` collection is in server/view.ts (@core/lib/rides ridesFor / ridesPatchFor).
 * Sample rides (labelled Sample) from the demo's sample profiles keep the screen from being empty in the demo; SAMPLE_RIDES=0 turns them off.
 */
import type { Express, NextFunction, Request, Response } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID } from '@core/types';
import { t } from '@core/i18n';
import { createRidesEngine, RideError, type RidesEngine } from '@core/api/rides';
import { addDays, campusToday, rideFor, rideTitle, type Ride } from '@core/lib/rides';
import { patchFor } from './view';

type Rule = number | ((me: ID, args: unknown[]) => boolean);

/** Who may call what. A number = that argument must be the caller's own id */
export function ridesRules(db: () => Snapshot): Record<string, Rule> {
  const host = (me: ID, args: unknown[]) => args[1] === me && (db().rides ?? []).some((r) => r.id === args[0] && r.hostId === me);
  return { create: 0, join: 1, leave: 1, close: host, reopen: host, cancel: host, update: host };
}
export const ruleAllows = (rule: Rule, me: ID, args: unknown[]) => (typeof rule === 'number' ? args[rule] === me : rule(me, args));

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Link-preview text. Destination, time and seats only — no names of riders, no pickup spot */
export function rideMeta(r: Ride | undefined, schoolName: string): { title: string; description: string } {
  if (!r || r.status === 'cancelled') return { title: 'Rides on Lumi', description: 'Share rides with students from your campus — airports, groceries, SF, Tahoe.' };
  const who = schoolName ? `${schoolName} students` : 'students';
  return {
    title: `${r.sample ? '[Sample] ' : ''}${rideTitle(r)}`,
    description: `${r.kind === 'looking' ? 'Can you help or team up?' : 'Split the ride'} with verified ${who} on Lumi. Sign in with your school email to join.`,
  };
}

export function withRideMeta(html: string, meta: { title: string; description: string; url: string; image: string }): string {
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Lumi" />',
    `<meta property="og:url" content="${esc(meta.url)}" />`,
    `<meta property="og:image" content="${esc(meta.image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${esc(meta.image)}" />`,
  ].join('\n    ');
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, '');
  return stripped.replace(/<\/head>/i, `    ${tags}\n  </head>`);
}

// ─── Sample rides (demo) ──────────────────────────────────────────────────────
interface SampleSpec { id: string; hostId: ID; ride: Omit<Ride, 'id' | 'hostId' | 'schoolId' | 'memberIds' | 'memberCount' | 'status' | 'createdAt' | 'updatedAt' | 'date'>; date: (today: string) => string; fixed?: boolean }
/** Next given weekday (0=Sun) on/after `from` */
const nextDow = (from: string, dow: number) => { const d = new Date(`${from}T12:00:00Z`).getUTCDay(); return addDays(from, (dow - d + 7) % 7); };
const SAMPLE_RIDES: SampleSpec[] = [
  { id: 'rd_sample_sfo_lily', hostId: 'u_sua', fixed: true, date: () => '2026-11-25', ride: { kind: 'splitting', from: 'unit2', to: 'sfo', start: '09:30', end: '10:00', seats: 3, estTotal: 60, note: 'Flight at 1:30pm. Big suitcase + backpack.' } },
  { id: 'rd_sample_sfo_ethan', hostId: 'u_taeho', fixed: true, date: () => '2026-11-25', ride: { kind: 'driving', from: 'northside', to: 'sfo', start: '10:30', end: '11:00', seats: 2, note: 'Driving home to the Peninsula, can drop at SFO departures.' } },
  { id: 'rd_sample_oak_maya', hostId: 'u_jimin', fixed: true, date: () => '2026-11-24', ride: { kind: 'splitting', from: 'southside', to: 'oak', start: '18:00', end: '18:30', seats: 2, estTotal: 33 } },
  { id: 'rd_sample_costco_daniel', hostId: 'u_dohyun', date: (today) => nextDow(addDays(today, 1), 6), ride: { kind: 'driving', from: 'foothill', to: 'costco', start: '11:00', end: '11:30', seats: 3, note: 'Trunk space for bulk stuff. Back by 1:30.' } },
  { id: 'rd_sample_tj_emma', hostId: 'u_yuna', date: (today) => nextDow(addDays(today, 1), 0), ride: { kind: 'looking', from: 'unit3', to: 'tj', start: '16:00', end: '17:00', seats: 1, note: 'Happy to chip in for gas.' } },
];

/** Adds missing sample rides and rolls the weekly ones forward once they pass. Returns what changed */
export function ensureSampleRides(db: Snapshot, today = campusToday()): Patch | null {
  if (process.env.SAMPLE_RIDES === '0') return null;
  const list = (db.rides ??= []);
  const changed: Ride[] = [];
  const stamp = new Date().toISOString();
  for (const s of SAMPLE_RIDES) {
    const host = db.users.find((u) => u.id === s.hostId);
    if (!host || host.affiliation.type !== 'university' || host.affiliation.schoolId !== 's_berkeley') continue;
    const existing = list.find((r) => r.id === s.id);
    if (!existing) {
      const date = s.date(today);
      if (date < today) continue;
      const r: Ride = { ...s.ride, id: s.id, hostId: s.hostId, schoolId: 's_berkeley', date, memberIds: [], memberCount: 0, status: 'open', sample: true, createdAt: stamp, updatedAt: stamp };
      list.push(r); changed.push(r);
    } else if (!s.fixed && existing.date < today && existing.status !== 'cancelled') {
      existing.date = s.date(today);
      // a new week: riders from last week's run aren't on this one
      existing.memberIds = []; existing.memberCount = 0; existing.status = 'open'; delete existing.roomId;
      existing.updatedAt = stamp; changed.push(existing);
    }
  }
  return changed.length ? { rides: changed } : null;
}

// ─── Routes ──────────────────────────────────────────────────────────────────
interface Deps {
  db: () => Snapshot;
  /** sets req.userId from the session token (index.ts auth) */
  auth: (req: Request, res: Response, next: NextFunction) => unknown;
  /** save + send to connected viewers (each gets their own filtered copy) */
  push: (patch: Patch) => void;
  dist?: string;
}

export function registerRideRoutes(app: Express, deps: Deps): RidesEngine {
  const engine = createRidesEngine({ get db() { return deps.db(); }, t, demo: false, push: deps.push });
  const rules = ridesRules(deps.db);
  const dist = deps.dist ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

  // sample rides — once now, then with the 15-minute demo roll
  const roll = () => { try { const p = ensureSampleRides(deps.db()); if (p) { deps.push(p); console.log(`[rides] ${p.rides?.length ?? 0} sample rides added/rolled`); } } catch (e) { console.error('[rides] sample roll failed', e); } };
  roll();
  setInterval(roll, 15 * 60 * 1000).unref?.();

  app.post('/api/rpc/rides/:method', deps.auth, (req: Request & { userId?: ID }, res: Response) => {
    const me = req.userId;
    if (!me) { res.status(401).json({ error: t('로그인이 필요해요.') }); return; }
    const method = String(req.params.method);
    const args: unknown[] = Array.isArray(req.body?.args) ? req.body.args : [];
    if (!Object.prototype.hasOwnProperty.call(rules, method)) { res.status(404).json({ error: 'Unknown method' }); return; }
    if (!ruleAllows(rules[method], me, args)) { res.status(403).json({ error: t('권한이 없어요.') }); return; }
    let result: Patch | { ride: Ride; patch: Patch; roomId?: ID };
    try {
      result = (engine[method as keyof RidesEngine] as (...a: unknown[]) => typeof result)(...args);
    } catch (e) {
      if (e instanceof RideError) { res.status(400).json({ error: e.message }); return; }
      console.error('[rides]', e); res.status(500).json({ error: 'Something went wrong — please try again.' }); return;
    }
    const patch: Patch = 'patch' in result ? result.patch : result;
    deps.push(patch);
    const mine = patchFor(patch, me, deps.db()) ?? {};
    res.json('patch' in result ? { ...result, ride: rideFor(result.ride, me), patch: mine } : mine);
  });

  // signed-out preview — no auth on purpose, and nothing private in it
  app.post('/api/rides/teaser', (req: Request, res: Response) => {
    res.json(engine.teaser(String(req.body?.id ?? '')));
  });

  const indexFile = path.join(dist, 'index.html');
  let cached: string | null = null;
  const template = () => (cached ??= existsSync(indexFile) ? readFileSync(indexFile, 'utf8') : null);
  app.get('/r/:id', (req: Request, res: Response, next: NextFunction) => {
    const html = template();
    if (!html) { next(); return; }
    const id = String(req.params.id ?? '');
    const r = (deps.db().rides ?? []).find((x) => x.id === id);
    const school = r ? deps.db().schools.find((s) => s.id === r.schoolId)?.name ?? '' : '';
    const origin = `${req.protocol}://${req.get('host')}`;
    res.set('cache-control', 'public, max-age=120');
    res.type('html').send(withRideMeta(html, { ...rideMeta(r, school), url: `${origin}/r/${encodeURIComponent(id)}`, image: `${origin}/og-ride.png` }));
  });

  return engine;
}
