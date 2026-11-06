/**
 * /admin/reports — a single static page. It holds no data: the admin types ADMIN_KEY (kept in sessionStorage for this
 * tab only, sent as x-admin-key) and the page calls /api/admin/*. Every piece of user content is put on the page with
 * textContent (never innerHTML), so a reported post can't run script here.
 */
export function adminPageHtml(threshold: number): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Reports · Lumi admin</title>
<style>
  :root { color-scheme: light dark; --bg: #f6f6f4; --card: #fff; --ink: #1b1b1b; --ink2: #666; --line: #e3e3e0; --accent: #3557d6; --danger: #c0352b; --warn: #a96b00; --ok: #2e7d4f; }
  @media (prefers-color-scheme: dark) { :root { --bg: #151515; --card: #1f1f1f; --ink: #eee; --ink2: #aaa; --line: #333; --accent: #8ea4ff; --danger: #ff7b6e; --warn: #ffbf4d; --ok: #6fd39a; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.45 system-ui, -apple-system, sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 20px; margin: 4px 0 12px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
  input, textarea, select { font: inherit; color: inherit; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; }
  button { font: inherit; border: 1px solid var(--line); background: var(--card); color: var(--ink); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  button.danger { color: var(--danger); border-color: var(--danger); }
  button:disabled { opacity: .5; cursor: default; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; margin: 10px 0; }
  .card.focus { outline: 2px solid var(--accent); }
  .meta { color: var(--ink2); font-size: 12px; }
  .pill { display: inline-block; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 99px; border: 1px solid currentColor; margin-right: 4px; }
  .open { color: var(--warn); } .dismissed { color: var(--ink2); } .actioned { color: var(--ok); } .hidden { color: var(--danger); }
  blockquote { margin: 8px 0; padding: 6px 10px; border-left: 3px solid var(--line); white-space: pre-wrap; word-break: break-word; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }
  .msgs { margin: 6px 0; max-height: 260px; overflow: auto; border: 1px solid var(--line); border-radius: 8px; }
  .msg { display: flex; gap: 8px; align-items: flex-start; padding: 4px 8px; border-bottom: 1px solid var(--line); }
  .msg span { flex: 1; word-break: break-word; }
  .log { margin: 6px 0 0; padding-left: 18px; color: var(--ink2); font-size: 12px; }
  #err { color: var(--danger); white-space: pre-wrap; }
  .empty { color: var(--ink2); padding: 24px 0; text-align: center; }
</style>
</head>
<body>
<main>
  <h1>Reports</h1>
  <div class="bar" id="login">
    <input id="key" type="password" placeholder="Admin key" autocomplete="off" />
    <input id="name" placeholder="Your name (audit log)" maxlength="40" />
    <button class="primary" id="go">Open</button>
  </div>
  <div class="bar">
    <select id="status"><option value="open">Open</option><option value="all">All</option></select>
    <button id="reload">Reload</button>
    <button id="forget">Forget key</button>
    <span class="meta">Posts, comments, course reviews and exam info reported by ${threshold} distinct real accounts are hidden from everyone but the author until you act. Review every report within 24 hours.</span>
  </div>
  <div id="err"></div>
  <div id="suspended"></div>
  <div id="list"></div>
</main>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const store = { get(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k) || ''; } catch { return ''; } }, set(k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch {} }, del(k, s) { try { (s ? sessionStorage : localStorage).removeItem(k); } catch {} } };
  $('key').value = store.get('lumiAdminKey', true);
  $('name').value = store.get('lumiAdminName');
  const el = (tag, attrs, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); } for (const c of kids) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c))); return n; };
  const when = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };
  const headers = () => ({ 'content-type': 'application/json', 'x-admin-key': $('key').value, 'x-admin-name': $('name').value.trim() });
  async function api(path, body) {
    const res = await fetch(path, body ? { method: 'POST', headers: headers(), body: JSON.stringify(body) } : { headers: headers() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  const who = (u) => u ? (u.nickname || '(deleted)') + ' · ' + u.id + (u.sample ? ' · sample/demo' : '') + (u.suspended ? ' · SUSPENDED' : '') : '—';
  async function act(path, body, confirmText) {
    if (confirmText && !confirm(confirmText)) return;
    $('err').textContent = '';
    try { await api(path, body); await load(); } catch (e) { $('err').textContent = e.message; }
  }
  function card(r) {
    const open = r.status === 'open';
    const note = el('input', { placeholder: 'Note for the log (optional)', style: 'flex:1;min-width:180px' });
    const noteVal = () => note.value.trim() || undefined;
    const kind = r.target.kind || r.targetType;
    const removable = r.target.exists && kind !== 'user' && kind !== 'room';
    const owner = r.owner;
    const c = el('div', { class: 'card', id: r.id },
      el('div', {}, el('span', { class: 'pill ' + r.status }, r.status), r.target.state ? el('span', { class: 'pill ' + (r.target.state === 'visible' ? 'dismissed' : 'hidden') }, r.target.state.replace('_', '-')) : r.autoHidden ? el('span', { class: 'pill hidden' }, 'auto-hidden') : null,
        el('b', {}, kind + ' '), el('code', {}, r.targetId)),
      el('div', { class: 'meta' }, when(r.createdAt) + ' · ' + r.id + ' · open reports on this ' + kind + ': ' + r.openOnTarget + ' (' + r.realOnTarget + ' real)'),
      el('div', {}, el('b', {}, 'Reason: '), r.reason),
      el('div', { class: 'meta' }, 'Reporter: ' + who(r.reporter) + ' · Owner: ' + who(owner)),
      el('blockquote', {}, r.target.exists ? r.target.excerpt || '(empty)' : 'Content is gone. At report time: ' + (r.excerpt || '—')),
    );
    if (r.target.exists && r.excerpt && r.excerpt !== r.target.excerpt) c.append(el('div', { class: 'meta' }, 'At report time: ' + r.excerpt));
    if (r.messages && r.messages.length) {
      const box = el('div', { class: 'msgs' });
      for (const m of r.messages) box.append(el('div', { class: 'msg' }, el('span', {}, el('b', {}, m.sender + ': '), m.text, el('span', { class: 'meta' }, '  ' + when(m.createdAt))),
        el('button', { class: 'danger', onclick: () => act('/api/admin/reports/' + r.id + '/remove', { messageId: m.id, note: noteVal() }, 'Delete this message for everyone?') }, 'Remove'),
        el('button', { class: 'danger', onclick: () => act('/api/admin/reports/' + r.id + '/suspend', { userId: m.senderId, note: noteVal() }, 'Suspend ' + m.sender + '? They are signed out and hidden from everyone until unsuspended.') }, 'Suspend sender')));
      c.append(box);
    }
    const row = el('div', { class: 'row' }, note,
      el('button', { onclick: () => act('/api/admin/reports/' + r.id + '/dismiss', { note: noteVal() }) }, open ? 'Dismiss' : 'Dismiss again'));
    // course reviews / exam info (server/coursereviews.ts): Hide keeps it for the author only; Dismiss shows it again
    if (r.target.exists && (kind === 'review' || kind === 'exam') && r.target.state !== 'hidden') row.append(el('button', { class: 'danger', onclick: () => act('/api/admin/reports/' + r.id + '/hide', { note: noteVal() }, 'Hide this ' + kind + ' from everyone but its author?') }, 'Hide ' + kind));
    if (removable) row.append(el('button', { class: 'danger', onclick: () => act('/api/admin/reports/' + r.id + '/remove', { note: noteVal() }, 'Delete this ' + kind + ' for everyone? This cannot be undone.') }, 'Remove ' + kind));
    if (owner && !owner.suspended) row.append(el('button', { class: 'danger', onclick: () => act('/api/admin/reports/' + r.id + '/suspend', { note: noteVal() }, 'Suspend ' + (owner.nickname || owner.id) + '? They are signed out and hidden from everyone until unsuspended.') }, 'Suspend owner'));
    if (owner && owner.suspended) row.append(el('button', { onclick: () => act('/api/admin/users/' + encodeURIComponent(owner.id) + '/unsuspend', { note: noteVal() }, 'Unsuspend ' + (owner.nickname || owner.id) + '?') }, 'Unsuspend owner'));
    c.append(row);
    if (r.log && r.log.length) c.append(el('ul', { class: 'log' }, ...r.log.map((l) => el('li', {}, when(l.at) + ' · ' + l.by + ' · ' + l.action + (l.note ? ' — ' + l.note : '')))));
    return c;
  }
  async function load() {
    $('err').textContent = '';
    if (!$('key').value) { $('list').replaceChildren(el('div', { class: 'empty' }, 'Enter the admin key.')); return; }
    try {
      const data = await api('/api/admin/reports?status=' + $('status').value);
      $('suspended').replaceChildren(...(data.suspended.length ? [el('div', { class: 'card' }, el('b', {}, 'Suspended accounts'),
        ...data.suspended.map((s) => el('div', { class: 'row' }, el('span', { style: 'flex:1' }, s.nickname + ' · ' + s.id + ' · since ' + when(s.at) + ' by ' + s.by + ' — ' + s.reason),
          el('button', { onclick: () => act('/api/admin/users/' + encodeURIComponent(s.id) + '/unsuspend', {}, 'Unsuspend ' + s.nickname + '?') }, 'Unsuspend'))))] : []));
      $('list').replaceChildren(...(data.reports.length ? data.reports.map(card) : [el('div', { class: 'empty' }, 'No ' + ($('status').value === 'open' ? 'open ' : '') + 'reports.')]));
      const focus = location.hash.slice(1) && document.getElementById(location.hash.slice(1));
      if (focus) { focus.classList.add('focus'); focus.scrollIntoView({ block: 'center' }); }
    } catch (e) { $('err').textContent = e.message; }
  }
  $('go').onclick = () => { store.set('lumiAdminKey', $('key').value, true); store.set('lumiAdminName', $('name').value.trim()); load(); };
  $('reload').onclick = load;
  $('status').onchange = load;
  $('forget').onclick = () => { store.del('lumiAdminKey', true); $('key').value = ''; load(); };
  load();
})();
</script>
</body>
</html>`;
}
