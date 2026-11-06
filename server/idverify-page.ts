/**
 * /admin/verifications — student ID review (server/idverify.ts). Like /admin/reports it holds no data: the admin types
 * ADMIN_KEY (sessionStorage for this tab only, sent as x-admin-key) and the page calls /api/admin/verifications.
 * Photos are fetched with the key and shown from a blob: URL (never a public address); text goes in with textContent.
 */
export function verificationPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Student IDs · Lumi admin</title>
<style>
  :root { color-scheme: light dark; --bg: #f6f6f4; --card: #fff; --ink: #1b1b1b; --ink2: #666; --line: #e3e3e0; --accent: #3557d6; --danger: #c0352b; --warn: #a96b00; --ok: #2e7d4f; }
  @media (prefers-color-scheme: dark) { :root { --bg: #151515; --card: #1f1f1f; --ink: #eee; --ink2: #aaa; --line: #333; --accent: #8ea4ff; --danger: #ff7b6e; --warn: #ffbf4d; --ok: #6fd39a; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.45 system-ui, -apple-system, sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 20px; margin: 4px 0 4px; }
  .sub { color: var(--ink2); margin: 0 0 12px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
  input { font: inherit; color: inherit; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; }
  button { font: inherit; border: 1px solid var(--line); background: var(--card); color: var(--ink); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  button.danger { color: var(--danger); border-color: var(--danger); }
  button:disabled { opacity: .5; cursor: default; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; margin: 10px 0; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 640px) { .grid { grid-template-columns: 320px 1fr; } }
  .photo { width: 100%; min-height: 160px; border-radius: 8px; background: var(--bg); border: 1px solid var(--line); display: grid; place-items: center; overflow: hidden; }
  .photo img { width: 100%; height: auto; display: block; }
  .name { font-size: 16px; font-weight: 700; }
  .meta { color: var(--ink2); font-size: 12px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 8px 0; }
  dt { color: var(--ink2); } dd { margin: 0; }
  .warn { color: var(--warn); font-weight: 600; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; align-items: center; }
  .row input { flex: 1; min-width: 180px; }
  #err { color: var(--danger); white-space: pre-wrap; }
  .empty { color: var(--ink2); padding: 24px 0; text-align: center; }
  .done { color: var(--ok); font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>Student ID review</h1>
  <p class="meta"><a href="/admin/reports">Reports</a> · Student IDs</p>
  <p class="sub">Compare the card with the name, school and birth year. The photo is deleted as soon as you approve or reject.</p>
  <div class="bar">
    <input id="key" type="password" placeholder="Admin key" autocomplete="off" />
    <input id="who" placeholder="Your name (for the log)" maxlength="40" />
    <button id="load" class="primary">Load</button>
    <span id="count" class="meta"></span>
  </div>
  <div id="err"></div>
  <div id="list"></div>
</main>
<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  // same storage as /admin/reports — one key per tab (sessionStorage), the name remembered (localStorage)
  try { $('key').value = sessionStorage.getItem('lumiAdminKey') || ''; $('who').value = localStorage.getItem('lumiAdminName') || ''; } catch (e) {}
  var urls = [];
  function headers() { return { 'x-admin-key': $('key').value, 'x-admin-name': $('who').value || 'admin', 'content-type': 'application/json' }; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function when(iso) { try { return new Date(iso).toLocaleString(); } catch (e) { return iso; } }
  function api(path, opts) {
    return fetch(path, Object.assign({ headers: headers() }, opts || {})).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (b) { throw new Error(b.error || ('HTTP ' + r.status)); });
      return r;
    });
  }
  function load() {
    $('err').textContent = '';
    try { sessionStorage.setItem('lumiAdminKey', $('key').value); localStorage.setItem('lumiAdminName', $('who').value); } catch (e) {}
    urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = [];
    api('/api/admin/verifications').then(function (r) { return r.json(); }).then(render).catch(function (e) { $('err').textContent = e.message; });
  }
  function render(data) {
    var list = $('list'); list.textContent = '';
    var reqs = data.requests || [];
    $('count').textContent = reqs.length + ' waiting';
    if (!reqs.length) { list.appendChild(el('div', 'empty', 'Nothing waiting.')); return; }
    reqs.forEach(function (q) {
      var card = el('div', 'card'); card.id = q.id;
      var grid = el('div', 'grid');
      var ph = el('div', 'photo', 'Loading photo…');
      api('/api/admin/verifications/' + encodeURIComponent(q.id) + '/photo').then(function (r) { return r.blob(); }).then(function (b) {
        var u = URL.createObjectURL(b); urls.push(u); ph.textContent = '';
        var img = document.createElement('img'); img.alt = 'Student ID photo'; img.src = u; ph.appendChild(img);
      }).catch(function (e) { ph.textContent = e.message; });
      grid.appendChild(ph);
      var info = el('div');
      var u = q.user || {};
      info.appendChild(el('div', 'name', u.nickname || '(account deleted)'));
      var dl = el('dl');
      function row(k, v) { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, v)); }
      row('School', q.school.name + (q.school.emailDomain ? ' (@' + q.school.emailDomain + ')' : ''));
      row('Status', u.role || '—');
      row('Birth year', u.birthYear || '—');
      row('Sent', when(q.submittedAt));
      row('Photo', q.width + '×' + q.height + ' · ' + Math.round(q.bytes / 1024) + ' KB');
      if (u.previousReason) row('Last rejected', u.previousReason);
      info.appendChild(dl);
      if (q.schoolChanged) info.appendChild(el('div', 'warn', 'They changed school after sending this — reject and ask for a new photo.'));
      var actions = el('div', 'row');
      var why;
      var approve = el('button', 'primary', 'Approve'); approve.disabled = q.schoolChanged;
      var reason = el('input'); reason.placeholder = 'Reason the student will see (to reject)'; reason.maxLength = 200;
      var reject = el('button', 'danger', 'Reject');
      function decide(path, payload, label) {
        approve.disabled = reject.disabled = true;
        api('/api/admin/verifications/' + encodeURIComponent(q.id) + '/' + path, { method: 'POST', body: JSON.stringify(payload) })
          .then(function () { actions.textContent = ''; why.remove(); actions.appendChild(el('span', 'done', label + ' — photo deleted.')); ph.textContent = 'Deleted'; })
          .catch(function (e) { $('err').textContent = e.message; approve.disabled = q.schoolChanged; reject.disabled = false; });
      }
      approve.onclick = function () { decide('approve', {}, 'Approved'); };
      reject.onclick = function () { if (!reason.value.trim()) { reason.focus(); $('err').textContent = 'Write a short reason first — the student sees it.'; return; } decide('reject', { reason: reason.value }, 'Rejected'); };
      why = el('div', 'row'); why.appendChild(reason);
      actions.appendChild(approve); actions.appendChild(reject);
      info.appendChild(why); info.appendChild(actions);
      grid.appendChild(info);
      card.appendChild(grid);
      list.appendChild(card);
    });
  }
  $('load').onclick = load;
  $('key').addEventListener('keydown', function (e) { if (e.key === 'Enter') load(); });
  if ($('key').value) load();
})();
</script>
</body>
</html>`;
}
