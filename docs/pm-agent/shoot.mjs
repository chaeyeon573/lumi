// Lumi PM agent — 화면 찍기.
//   node docs/pm-agent/shoot.mjs <out-dir> [design=v2|classic] [paths=/,/discover,...] [base=http://localhost:5173]
// 로컬 vite(base)에서 화면을 띄우고 /api 는 라이브 서버(LIVE)로 보낸다 — 로컬 코드 + 실제 데이터.
// base 를 라이브 주소로 주면 라이브 화면 그대로 찍는다.
// 컨테이너의 프록시 때문에 Chromium 이 외부 HTTPS 를 직접 못 받으므로 모든 요청을 Node fetch 로 대신 받는다.
// 필요: PW=/tmp/pw/node_modules/playwright-core/index.mjs (npm i playwright-core@1.64 --prefix /tmp/pw)
const { chromium } = await import(process.env.PW ?? '/tmp/pw/node_modules/playwright-core/index.mjs');
const [out, design = 'v2', pathsArg, base = 'http://localhost:5173'] = process.argv.slice(2);
const LIVE = 'https://heetz.up.railway.app';
const paths = (pathsArg ?? '/,/discover,/discover?tab=activities,/community,/community?tab=clubs,/timetable,/ask').split(',');
const local = !base.startsWith(LIVE);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route('**/*', async (route) => {
  const r = route.request(); const u = new URL(r.url());
  if (u.pathname.startsWith('/api/events')) return route.abort(); // SSE — 'load' 가 안 끝난다
  if (local && u.origin === base && !u.pathname.startsWith('/api')) return route.continue();
  const target = local && u.origin === base ? LIVE + u.pathname + u.search : r.url();
  try {
    const res = await fetch(target, { method: r.method(), headers: { ...r.headers(), 'user-agent': 'Mozilla/5.0 Chrome/120' }, body: ['GET', 'HEAD'].includes(r.method()) ? undefined : r.postDataBuffer() });
    const h = Object.fromEntries([...res.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
    await route.fulfill({ status: res.status, headers: h, body: Buffer.from(await res.arrayBuffer()) });
  } catch { await route.abort(); }
});
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await p.goto(`${base}/welcome?demo=berkeley&design=${design}`, { waitUntil: 'load' });
await p.waitForTimeout(5000);
for (const [i, path] of paths.entries()) {
  await p.goto(base + path, { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  const name = `${out}/${design}-${i}-${path.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}`;
  await p.screenshot({ path: `${name}.png` });
  await p.screenshot({ path: `${name}-full.png`, fullPage: true });
  // 아직 안 불러온 lazy 이미지(complete=false)는 깨진 것으로 세지 않는다
  const imgs = await p.evaluate(() => [...document.images].map((im) => !im.complete || im.naturalWidth > 0));
  console.log(`\n## ${path}  (images ${imgs.length}, broken ${imgs.filter((x) => !x).length})\n` + (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 1500));
}
await b.close();
