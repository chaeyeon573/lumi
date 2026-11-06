/**
 * /admin/reviews — 수업 리뷰가 실제로 모이는지 보는 작은 표 (owner 2026-11-06 "몇 명이 쓰는지 재 봐"). 데이터 없는 정적 페이지:
 * 관리자가 ADMIN_KEY 를 넣으면(이 탭의 sessionStorage) /api/admin/reviews/metrics 를 부른다. 수만 — 글쓴이 정보는 없다.
 * 모든 값은 textContent 로 넣는다.
 */
export function reviewsAdminPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Course reviews · Lumi admin</title>
<style>
  :root { color-scheme: light dark; --bg: #f6f6f4; --card: #fff; --ink: #1b1b1b; --ink2: #666; --line: #e3e3e0; --accent: #3557d6; --danger: #c0352b; }
  @media (prefers-color-scheme: dark) { :root { --bg: #151515; --card: #1f1f1f; --ink: #eee; --ink2: #aaa; --line: #333; --accent: #8ea4ff; --danger: #ff7b6e; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.45 system-ui, -apple-system, sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 20px; margin: 4px 0 12px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
  input { font: inherit; color: inherit; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; }
  button { font: inherit; border: 1px solid var(--line); background: var(--card); color: var(--ink); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; margin: 10px 0; }
  .meta { color: var(--ink2); font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
  .k { color: var(--ink2); font-size: 12px; } .v { font-size: 20px; font-weight: 700; }
  #err { color: var(--danger); white-space: pre-wrap; }
  .empty { color: var(--ink2); padding: 24px 0; text-align: center; }
</style>
</head>
<body>
<main>
  <h1>Course reviews</h1>
  <div class="bar">
    <input id="key" type="password" placeholder="Admin key" autocomplete="off" />
    <button class="primary" id="go">Open</button>
    <button id="forget">Forget key</button>
  </div>
  <p class="meta">Counts only — no authors. "Wrote" = prompted students who wrote at least one review within <span id="days">14</span> days of the end-of-term notification.</p>
  <div id="err"></div>
  <div id="total"></div>
  <div id="list"></div>
</main>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const ss = { get() { try { return sessionStorage.getItem('lumiAdminKey') || ''; } catch { return ''; } }, set(v) { try { sessionStorage.setItem('lumiAdminKey', v); } catch {} }, del() { try { sessionStorage.removeItem('lumiAdminKey'); } catch {} } };
  $('key').value = ss.get();
  const el = (tag, cls, ...kids) => { const n = document.createElement(tag); if (cls) n.className = cls; for (const c of kids) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c))); return n; };
  const pct = (v) => (v === null || v === undefined ? '—' : v + '%');
  const stat = (k, v) => el('div', '', el('div', 'k', k), el('div', 'v', v));
  async function load() {
    $('err').textContent = '';
    if (!$('key').value) { $('list').replaceChildren(el('div', 'empty', 'Enter the admin key.')); return; }
    try {
      const res = await fetch('/api/admin/reviews/metrics', { headers: { 'x-admin-key': $('key').value } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
      $('days').textContent = data.windowDays;
      const t = data.total;
      $('total').replaceChildren(el('div', 'card', el('b', '', 'All terms'), el('div', 'grid', stat('Reviews', t.reviews), stat('With text', pct(t.withTextPct)), stat('Courses with 3+ reviews', t.coursesWith3Plus), stat('Exam info', t.examInfos))));
      $('list').replaceChildren(...(data.terms.length ? data.terms.map((r) => el('div', 'card', el('b', '', r.term),
        el('div', 'grid',
          stat('Students prompted', r.prompted),
          stat('Wrote within ' + data.windowDays + ' days', r.wroteWithin14Days + ' · ' + pct(r.wrotePct)),
          stat('Reviews', r.reviews),
          stat('With text', pct(r.withTextPct)),
          stat('Courses with 3+ reviews', r.coursesWith3Plus)))) : [el('div', 'empty', 'No reviews or prompts yet.')]));
    } catch (e) { $('err').textContent = e.message; }
  }
  $('go').onclick = () => { ss.set($('key').value); load(); };
  $('forget').onclick = () => { ss.del(); $('key').value = ''; load(); };
  load();
})();
</script>
</body>
</html>`;
}
