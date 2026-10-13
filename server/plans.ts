/**
 * 링크로 묻는 약속 (/p/<id>) — 서버 쪽 연결. 도메인 규칙은 @core/api/plans · @core/lib/plans.
 *
 *   GET  /p/:id                     index.html 에 Open Graph 태그를 넣어 돌려준다 (iMessage·카톡·디스코드 미리보기 — 숫자만, 이름 없음)
 *   POST /api/plans/:id/view        { token? } → { plan }   로그인 없이. 로그인했으면 Authorization 으로 나(주최자·내 답)를 알아본다
 *   POST /api/plans/:id/respond     { answer: { name, rsvp | optionIds, placeIds }, token? } → { token, plan }   계정 없는 사람의 답
 *   GET  /api/plans/:id/ics         정해진 시간이 있으면 캘린더 파일
 *   POST /api/rpc/plans/:method     Lumi 사용자 — create / respond(본인) / lock·edit·close·removeResponse(주최자만)
 *
 * 남용 제한 (계정 없는 답): IP 마다 10분에 60번, 같은 약속에 IP 마다 새 이름 25개/시간, 토큰마다 10분에 10번,
 * 약속마다 답 150개. 이름은 첫 단어 20자, HTML 은 지운다. 손님 토큰은 sha256 해시만 저장한다.
 * 정해진 시간 1시간 전 알림은 5분마다 확인한다 (PLAN_REMINDER_MINUTES, 0 이면 끔).
 */
import type { Express, NextFunction, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID } from '@core/types';
import { t } from '@core/i18n';
import { createPlansEngine, type PlansEngine } from '@core/api/plans';
import { isPlanId, planIcs, planMeta, publicPlan } from '@core/lib/plans';

/** 숫자면 그 위치의 인자가 본인 id 여야 한다 (index.ts 의 RULES 와 같은 모양) */
type Rule = number | ((me: ID, args: unknown[]) => boolean);

export const hashToken = (token: string) => createHash('sha256').update(`lumi-plan:${token}`).digest('hex');

type Req = Request & { userId?: ID };
export interface PlanDeps {
  db(): Snapshot;
  /** Authorization: Bearer → req.userId (index.ts 의 auth) */
  auth(req: Req, res: Response, next: NextFunction): void | Promise<void>;
  /** 엔진이 만든 변경을 저장하고 접속자에게 보낸다 */
  push(patch: Patch): void;
  /** 호출한 사람 관점으로 거른 패치 (server/view.ts) */
  patchFor(patch: Patch, viewerId: ID): Patch | null;
  /** 빌드된 프론트엔드 (index.html) */
  dist: string;
  /** 시작 전 알림 작업 (테스트에서는 끈다) */
  reminders?: boolean;
}

class PlanError extends Error { constructor(public status: number, message: string) { super(message); } }

// ─── 남용 제한 (메모리) ─────────────────────────────────────────────────────
const hits = new Map<string, number[]>();
function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((x) => now - x < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  return false;
}
/** 테스트용 */
export const resetPlanLimits = () => hits.clear();
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((x) => now - x < 3600_000)) hits.delete(k); }, 10 * 60_000).unref?.();

// 캠퍼스 와이파이는 한 IP 뒤에 많은 학생이 있다 — 단톡방 하나(수십 명)가 한꺼번에 답해도 막히지 않을 만큼
export const PLAN_RATE = { ipPer10Min: 60, newPerIpPerPlanHour: 25, tokenPer10Min: 10, viewsPerIpMin: 120 } as const;

/** 권한 — 만들기·답하기는 본인으로만, 나머지는 주최자만 (첫 인자 = 약속 id) */
export function planRules(db: () => Snapshot): Record<string, Rule> {
  const host = (me: ID, args: unknown[]) => db().timePolls.some((p) => p.id === args[0] && !!p.link && p.hostId === me);
  return { create: 0, respond: 1, lock: host, edit: host, close: host, removeResponse: host };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** index.html 의 제목·설명·OG 태그를 바꿔 끼운다 */
export function planPageHtml(html: string, meta: { title: string; description: string; url: string; image: string }): string {
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
    '<meta name="robots" content="noindex" />',
  ].join('\n    ');
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, '');
  return stripped.replace(/<\/head>/i, `    ${tags}\n  </head>`);
}

export function registerPlanRoutes(app: Express, deps: PlanDeps): PlansEngine {
  const plans = createPlansEngine({ get db() { return deps.db(); }, t, demo: false, push: deps.push }, { hash: hashToken });
  const rules = planRules(deps.db);
  const indexFile = path.join(deps.dist, 'index.html');
  let cached: string | null = null;
  const template = () => (cached ??= existsSync(indexFile) ? readFileSync(indexFile, 'utf8') : null);
  const origin = (req: Request) => `${req.protocol}://${req.get('host')}`;

  const wrap = (fn: (req: Req, res: Response) => unknown) => async (req: Req, res: Response) => {
    try {
      const out = await fn(req, res);
      if (!res.headersSent) res.json(out ?? {});
    } catch (e) {
      const status = e instanceof PlanError ? e.status : 400;
      if (!(e instanceof Error)) console.error('[plans]', e);
      res.status(status).json({ error: e instanceof Error ? e.message : 'error' });
    }
  };
  const idOf = (req: Request) => {
    const id = String(req.params.id ?? '');
    if (!isPlanId(id)) throw new PlanError(404, 'This plan doesn’t exist anymore.');
    return id;
  };
  const tokenOf = (v: unknown) => (typeof v === 'string' && v.length >= 16 && v.length <= 128 ? v : undefined);

  // ─── 앱 (로그인한 사용자) ──────────────────────────────────────────────────
  app.post('/api/rpc/plans/:method', deps.auth, wrap(async (req) => {
    if (!req.userId) throw new PlanError(401, t('로그인이 필요해요.'));
    const me = req.userId;
    const method = String(req.params.method);
    const args: unknown[] = Array.isArray(req.body?.args) ? req.body.args : [];
    const rule = Object.prototype.hasOwnProperty.call(rules, method) ? rules[method] : undefined;
    if (rule === undefined) throw new PlanError(404, 'Unknown method');
    const ok = typeof rule === 'number' ? args[rule] === me : rule(me, args);
    if (!ok) throw new PlanError(403, t('권한이 없어요.'));
    const fn = (plans as unknown as Record<string, (...a: unknown[]) => unknown>)[method];
    const result = fn(...args) as Patch | { patch: Patch };
    const patch: Patch = result && 'patch' in result ? result.patch : result;
    deps.push(patch);
    const mine = deps.patchFor(patch, me) ?? {};
    return result && 'patch' in result ? { ...result, patch: mine } : mine;
  }));

  // ─── 공개 (로그인 없이) ────────────────────────────────────────────────────
  app.post('/api/plans/:id/view', deps.auth, wrap(async (req) => {
    if (limited(`view:${req.ip}`, PLAN_RATE.viewsPerIpMin, 60_000)) throw new PlanError(429, 'Slow down a little — try again in a minute.');
    const plan = plans.view(idOf(req), { userId: req.userId, token: tokenOf(req.body?.token) });
    if (!plan) throw new PlanError(404, 'This plan doesn’t exist anymore.');
    return { plan };
  }));

  app.post('/api/plans/:id/respond', wrap(async (req) => {
    const id = idOf(req);
    if (!deps.db().timePolls.some((p) => p.id === id && p.link)) throw new PlanError(404, 'This plan doesn’t exist anymore.');
    const token = tokenOf(req.body?.token);
    const known = token ? plans.knows(id, token) : false;
    if (limited(`ip:${req.ip}`, PLAN_RATE.ipPer10Min, 10 * 60_000)) throw new PlanError(429, 'Too many answers from this network — try again in a few minutes.');
    if (known && limited(`tok:${token}`, PLAN_RATE.tokenPer10Min, 10 * 60_000)) throw new PlanError(429, 'You’ve changed your answer a lot — try again in a few minutes.');
    if (!known && limited(`new:${id}:${req.ip}`, PLAN_RATE.newPerIpPerPlanHour, 3600_000)) throw new PlanError(429, 'Too many new names from this network for this plan.');
    const answer = req.body?.answer ?? {};
    const r = plans.guestRespond(id, { name: answer.name, rsvp: answer.rsvp, optionIds: answer.optionIds, placeIds: answer.placeIds }, known ? token : undefined);
    deps.push(r.patch);
    return { token: r.token, plan: plans.view(id, { token: r.token }) };
  }));

  app.get('/api/plans/:id/ics', (req, res) => {
    const id = String(req.params.id ?? '');
    const poll = isPlanId(id) ? deps.db().timePolls.find((p) => p.id === id && p.link) : undefined;
    const ics = poll ? planIcs(publicPlan(poll, deps.db().users), `${origin(req)}/p/${id}`) : null;
    if (!ics) { res.status(404).json({ error: 'No set time yet.' }); return; }
    const slug = poll!.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'plan';
    res.set('cache-control', 'no-store');
    res.set('content-disposition', `attachment; filename="${slug}.ics"`);
    res.type('text/calendar; charset=utf-8').send(ics);
  });

  app.get('/p/:id', (req, res, next) => {
    const html = template();
    if (!html) { next(); return; }
    const id = String(req.params.id ?? '');
    const poll = isPlanId(id) ? deps.db().timePolls.find((p) => p.id === id && p.link) : undefined;
    const m = planMeta(poll, deps.db().users);
    res.set('cache-control', 'public, max-age=60');
    res.type('html').send(planPageHtml(html, { ...m, url: `${origin(req)}/p/${encodeURIComponent(id)}`, image: `${origin(req)}/og-plan.png` }));
  });

  if (deps.reminders !== false) startPlanReminders(plans, deps.push);
  return plans;
}

/** 정해진 시간 1시간 전 알림 — 5분마다 */
function startPlanReminders(plans: PlansEngine, push: (p: Patch) => void) {
  const minutes = Number(process.env.PLAN_REMINDER_MINUTES ?? 5);
  if (!minutes) return;
  const tick = () => {
    try {
      const patch = plans.reminders(new Date());
      if (patch.timePolls?.length) { push(patch); console.log(`[plans] ${patch.notifications?.length ?? 0} reminders for ${patch.timePolls.length} plans`); }
    } catch (e) { console.error('[plans] reminders failed', e); }
  };
  setInterval(tick, minutes * 60_000).unref?.();
}
