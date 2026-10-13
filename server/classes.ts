/**
 * 같은 수업 (classmates) — 서버 쪽 연결.
 *
 *   GET  /c/:school/:code            수업 방 공유 링크. index.html 에 Open Graph 태그를 넣어 돌려준다 (Discord·GroupMe·iMessage 미리보기)
 *   GET  /c/:school/:code/qr         인쇄·슬라이드용 QR 카드 (같은 태그)
 *   POST /api/classes/room           { school, code } → 수업 정보 + 인원 수 (로그인 없이 — 사람 정보는 없다)
 *   RPC  classes.respond / classes.setPartner   (index.ts 의 RULES — 본인으로만)
 *
 * 스터디 그룹 제안은 한 시간마다 (STUDY_GROUP_MINUTES, 0 이면 끔). 캠퍼스 시간 9~20시에만 알림을 만든다.
 */
import type { Express, Request, Response } from 'express';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { ClassRoomInfo, Patch } from '@core/api/types';
import type { createClassesEngine } from '@core/api/classes';
import type { Rule } from './together-rules';

export const CLASSES_RULES = {
  // 답하기·파트너 목록은 본인으로만 (초대받았는지, 듣는 수업인지는 엔진이 확인한다)
  classes: { respond: 1, setPartner: 0 },
} satisfies Record<string, Record<string, Rule>>;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 미리보기 문구 — 인원 수만 (이름·사진은 절대 넣지 않는다) */
export function classMeta(info: ClassRoomInfo | null, qr = false): { title: string; description: string } {
  if (!info) return { title: 'Find your classmates on Lumi', description: 'Find a study group, a project partner, or who’s free after lecture — without posting anything.' };
  const people = info.count === 1 ? '1 classmate' : `${info.count} classmates`;
  return {
    title: info.count > 0 ? `${info.code} on Lumi — ${people}` : `${info.code} on Lumi`,
    description: qr
      ? `Scan to get matched with ${info.code} classmates who are free when you are. Groups of 3–4.`
      : 'Find a study group, a project partner, or who’s free after lecture.',
  };
}

/** index.html 의 제목·설명·OG 태그를 바꿔 끼운다 */
export function withMeta(html: string, meta: { title: string; description: string; url: string; image: string }): string {
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
    `<meta property="og:image:alt" content="${esc(meta.title)}" />`,
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

interface Deps {
  classes: ReturnType<typeof createClassesEngine>;
  dist: string;
  /** 엔진이 만든 변경을 저장하고 접속자에게 보낸다 */
  push(patch: Patch): void;
}

export function registerClassRoutes(app: Express, deps: Deps) {
  const indexFile = path.join(deps.dist, 'index.html');
  let cached: string | null = null;
  const template = () => (cached ??= existsSync(indexFile) ? readFileSync(indexFile, 'utf8') : null);

  app.post('/api/classes/room', (req: Request, res: Response) => {
    const info = deps.classes.room(String(req.body?.school ?? ''), String(req.body?.code ?? ''));
    // 로그인 전에도 보이는 정보 — 사람은 없고 인원 수만. 수업 목록 원본은 시간표에 추가할 때 쓴다
    res.json(info);
  });

  const page = (qr: boolean) => (req: Request, res: Response) => {
    const html = template();
    if (!html) { res.status(404).end(); return; }
    const school = String(req.params.school ?? ''), code = String(req.params.code ?? '');
    const info = deps.classes.room(school, code);
    const origin = `${req.protocol}://${req.get('host')}`;
    const m = classMeta(info, qr);
    res.set('cache-control', 'public, max-age=300');
    res.type('html').send(withMeta(html, { ...m, url: `${origin}/c/${encodeURIComponent(school)}/${encodeURIComponent(code)}${qr ? '/qr' : ''}`, image: `${origin}/og-class.png` }));
  };
  app.get('/c/:school/:code', page(false));
  app.get('/c/:school/:code/qr', page(true));
}

/** 한 시간마다 스터디 그룹 제안 — 캠퍼스(태평양) 시간 9~20시에만 */
export function startStudyGroupJob(deps: Deps) {
  const minutes = Number(process.env.STUDY_GROUP_MINUTES ?? 60);
  if (!minutes) { console.log('[study-groups] off'); return; }
  const tick = () => {
    try {
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
      if (hour < 9 || hour >= 20) return;
      const patch = deps.classes.runStudyGroups(new Date());
      if (patch.activities?.length || patch.users?.length) { deps.push(patch); console.log(`[study-groups] ${patch.activities?.length ?? 0} groups changed, ${patch.notifications?.length ?? 0} notifications, ${patch.users?.length ?? 0} partner lists pruned`); }
    } catch (e) { console.error('[study-groups] failed', e); }
  };
  setTimeout(tick, 60_000);
  setInterval(tick, minutes * 60_000);
}
