/**
 * /admin/clubs — the Lumi team's outreach list (owner 2026-11-06: contact clubs by Instagram DM for now). A static page that
 * holds no data: the admin types ADMIN_KEY (sessionStorage, this tab only, sent as x-admin-key) and the page calls
 * /api/admin/clubs*. Club names and links are put on the page with textContent / validated hrefs, never innerHTML.
 *   - clubs with requests waiting and no organizers on Lumi, oldest request first
 *   - "DM text" mints a fresh setup link for that one club and shows a copy-ready message (the message is never stored)
 *   - "Mark contacted" (Instagram / e-mail / other) passes every waiting request on and tells those students
 */
export function clubsAdminPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Club outreach · Lumi admin</title>
<style>
  :root { color-scheme: light dark; --bg: #f6f6f4; --card: #fff; --ink: #1b1b1b; --ink2: #666; --line: #e3e3e0; --accent: #3557d6; --ok: #2e7d4f; }
  @media (prefers-color-scheme: dark) { :root { --bg: #151515; --card: #1f1f1f; --ink: #eee; --ink2: #aaa; --line: #333; --accent: #8ea4ff; --ok: #6fd39a; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.45 system-ui, -apple-system, sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 20px; margin: 4px 0 12px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
  input, textarea, select { font: inherit; color: inherit; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; }
  textarea { width: 100%; min-height: 92px; margin-top: 8px; }
  button { font: inherit; border: 1px solid var(--line); background: var(--card); color: var(--ink); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; margin: 10px 0; }
  .meta { color: var(--ink2); font-size: 12.5px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
  a { color: var(--accent); }
  .ok { color: var(--ok); font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>Club outreach</h1>
  <div class="bar">
    <input id="key" type="password" placeholder="ADMIN_KEY" autocomplete="off" />
    <input id="name" placeholder="Your name (stored with Mark contacted)" />
    <button class="primary" id="load">Load</button>
    <span class="meta" id="status"></span>
  </div>
  <p class="meta">Clubs with students waiting and no organizers on Lumi, oldest request first. "DM text" makes a new setup link for that club only. Marking contacted tells every waiting student "We told the club you want to join" — we store who, when and how, never the message.</p>
  <div id="list"></div>
</main>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const store = { get(k) { try { return sessionStorage.getItem(k) || ''; } catch { return ''; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch {} } };
  $('key').value = store.get('lumi.admin.key'); $('name').value = store.get('lumi.admin.name');
  const headers = () => ({ 'content-type': 'application/json', 'x-admin-key': $('key').value, 'x-admin-name': $('name').value.trim() });
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const safeHref = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null; } catch { return null; } };
  async function api(path, body) {
    const r = await fetch(path, body ? { method: 'POST', headers: headers(), body: JSON.stringify(body) } : { headers: headers() });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    return j;
  }
  function card(c) {
    const d = el('div', 'card');
    d.appendChild(el('b', '', c.name));
    d.appendChild(el('div', 'meta', c.waiting + ' waiting (' + c.saved + ' not yet passed on) · oldest ' + c.oldestDays + ' day' + (c.oldestDays === 1 ? '' : 's') + ' ago' + (c.hasContactEmail ? ' · directory e-mail on file' : '') + (c.optedOut ? ' · asked not to be e-mailed' : '')));
    const links = el('div', 'row');
    if (!c.links.length) links.appendChild(el('span', 'meta', 'No public links on file'));
    for (const l of c.links) { const h = safeHref(l.url); if (!h) continue; const a = el('a', '', l.label); a.href = h; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.appendChild(a); }
    d.appendChild(links);
    if (c.contacts.length) { const last = c.contacts[c.contacts.length - 1]; d.appendChild(el('div', 'meta', 'Contacted ' + c.contacts.length + 'x · last ' + last.at.slice(0, 10) + ' by ' + last.by + ' via ' + last.channel)); }
    const row = el('div', 'row');
    const dmBtn = el('button', '', 'DM text');
    const sel = el('select'); for (const ch of ['instagram', 'email', 'other']) { const o = el('option', '', ch === 'email' ? 'E-mail' : ch[0].toUpperCase() + ch.slice(1)); o.value = ch; sel.appendChild(o); }
    const mark = el('button', 'primary', 'Mark contacted');
    const note = el('span', 'meta');
    row.append(dmBtn, sel, mark, note);
    d.appendChild(row);
    const box = el('textarea'); box.readOnly = true; box.hidden = true; d.appendChild(box);
    dmBtn.onclick = async () => {
      dmBtn.disabled = true;
      try { const r = await api('/api/admin/clubs/' + encodeURIComponent(c.id) + '/dm', {}); box.value = r.dm; box.hidden = false; box.select(); try { await navigator.clipboard.writeText(r.dm); note.textContent = 'Copied — new link for this club'; } catch { note.textContent = 'Select and copy'; } }
      catch (e) { note.textContent = e.message; } finally { dmBtn.disabled = false; }
    };
    mark.onclick = async () => {
      if (!$('name').value.trim()) { note.textContent = 'Type your name first'; return; }
      mark.disabled = true;
      try { const r = await api('/api/admin/clubs/' + encodeURIComponent(c.id) + '/contacted', { channel: sel.value }); note.className = 'ok'; note.textContent = 'Marked · ' + r.told + ' student' + (r.told === 1 ? '' : 's') + ' told'; }
      catch (e) { note.textContent = e.message; mark.disabled = false; }
    };
    return d;
  }
  async function load() {
    store.set('lumi.admin.key', $('key').value); store.set('lumi.admin.name', $('name').value);
    $('status').textContent = 'Loading…';
    try {
      const r = await api('/api/admin/clubs');
      const list = $('list'); list.textContent = '';
      if (!r.clubs.length) list.appendChild(el('p', 'meta', 'No clubs are waiting on outreach.'));
      for (const c of r.clubs) list.appendChild(card(c));
      $('status').textContent = r.clubs.length + ' club' + (r.clubs.length === 1 ? '' : 's');
    } catch (e) { $('status').textContent = e.message; }
  }
  $('load').onclick = load;
  if ($('key').value) load();
})();
</script>
</body>
</html>`;
}
