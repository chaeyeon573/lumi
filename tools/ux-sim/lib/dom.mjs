// In-page scripts (run with page.evaluate). Plain functions — no closures over Node values.
//
// Element indexing follows the idea of browser-use (MIT, (c) 2024 Gregor Zunic): number the interactive elements
// so the actor says `click 12` instead of writing selectors, and mark elements that are new since the last look with `*`.
// The code here is our own; see tools/ux-sim/THIRD_PARTY_NOTICES.md.

/** Collect visible interactive elements + visible text + page checks. Tags each candidate with data-uxsim-tmp=i. */
export function collect({ tapMin, phone }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  for (const el of document.querySelectorAll('[data-uxsim-tmp]')) el.removeAttribute('data-uxsim-tmp');
  const NATIVE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=radio],[role=switch],[role=menuitem],[role=option],[role=combobox],[role=textbox],[role=searchbox],[role=slider],[contenteditable=""],[contenteditable=true],[tabindex]:not([tabindex="-1"])';
  const native = new Set(document.querySelectorAll(NATIVE));
  const cand = new Set(native);
  // React onClick on divs: no attribute to see, but they usually show a pointer cursor. Keep the outermost one.
  for (const el of document.body.querySelectorAll('*')) {
    if (cand.has(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.cursor !== 'pointer') continue;
    const p = el.parentElement;
    if (p && getComputedStyle(p).cursor === 'pointer') continue;
    if (el.closest(NATIVE)) continue;
    cand.add(el);
  }
  // labels wrapping a visually-hidden input are the thing people tap
  for (const l of document.querySelectorAll('label')) if (l.control || l.querySelector('input')) cand.add(l);
  const implicitRole = (el) => {
    const t = el.tagName.toLowerCase();
    if (t === 'a') return 'link';
    if (t === 'button' || t === 'summary') return 'button';
    if (t === 'select') return 'combobox';
    if (t === 'textarea') return 'textbox';
    if (t === 'label') return 'label';
    if (t === 'input') {
      const ty = (el.getAttribute('type') || 'text').toLowerCase();
      return ({ checkbox: 'checkbox', radio: 'radio', button: 'button', submit: 'button', reset: 'button', range: 'slider', search: 'searchbox', file: 'button', image: 'button' })[ty] || 'textbox';
    }
    return el.isContentEditable ? 'textbox' : 'clickable';
  };
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const nameOf = (el) => {
    const aria = el.getAttribute('aria-label'); if (clean(aria)) return clean(aria);
    const lb = el.getAttribute('aria-labelledby');
    if (lb) { const t = clean(lb.split(/\s+/).map((id) => document.getElementById(id)?.innerText || '').join(' ')); if (t) return t; }
    const t = el.tagName.toLowerCase();
    if ((t === 'input' || t === 'textarea' || t === 'select') && el.labels && el.labels.length) { const s = clean([...el.labels].map((l) => l.innerText).join(' ')); if (s) return s; }
    if (t === 'input' && ['button', 'submit', 'reset'].includes(el.type)) return clean(el.value);
    if (t === 'input' || t === 'textarea') return clean(el.placeholder || el.title || el.name || '');
    if (t === 'select') return clean(el.options[el.selectedIndex]?.text || el.name || '');
    const txt = clean(el.innerText); if (txt) return txt;
    const img = el.querySelector('img[alt]'); if (img && clean(img.alt)) return clean(img.alt);
    return clean(el.title || '');
  };
  const iconOf = (el) => {
    const svg = el.matches('svg') ? el : el.querySelector('svg');
    const c = svg?.getAttribute('class') || '';
    const m = /lucide-([a-z0-9-]+)/.exec(c);
    return m ? m[1] : (svg ? 'svg' : (el.querySelector('img') ? 'image' : ''));
  };
  const visible = (el, r) => r.width >= 2 && r.height >= 2 && (el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true);
  const covered = (el, r) => {
    const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + Math.min(8, r.width / 3), r.top + Math.min(8, r.height / 3)], [r.right - Math.min(8, r.width / 3), r.bottom - Math.min(8, r.height / 3)]];
    let hidden = 0; let tested = 0;
    for (const [x0, y0] of pts) {
      const x = Math.min(Math.max(x0, 1), vw - 1); const y = Math.min(Math.max(y0, 1), vh - 1);
      if (x0 < 0 || y0 < 0 || x0 > vw || y0 > vh) continue;
      tested++;
      const hit = document.elementFromPoint(x, y);
      if (hit && !el.contains(hit) && !hit.contains(el)) hidden++;
    }
    return tested > 0 && hidden === tested;
  };
  const out = [];
  let i = 0;
  for (const el of cand) {
    if (el.closest('#__uxsim_overlay')) continue;
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
    if (inViewport && covered(el, r)) continue;
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role') || implicitRole(el);
    const name = nameOf(el).slice(0, 90);
    const icon = name ? '' : iconOf(el);
    // nested pointer-cursor wrappers without own text add noise
    if (role === 'clickable' && !name && !icon) continue;
    const d = {
      tmp: i, tag, role, name, icon,
      type: tag === 'input' ? (el.getAttribute('type') || 'text') : undefined,
      href: tag === 'a' ? (el.getAttribute('href') || undefined) : undefined,
      disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true' || undefined,
      checked: (el.type === 'checkbox' || el.type === 'radio') ? !!el.checked : (el.getAttribute('aria-checked') === 'true' ? true : undefined),
      selected: el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-current') === 'page' || el.getAttribute('aria-pressed') === 'true' || undefined,
      expanded: el.hasAttribute('aria-expanded') ? el.getAttribute('aria-expanded') === 'true' : undefined,
      value: (tag === 'input' || tag === 'textarea') && el.type !== 'password' ? (el.value || undefined) : (el.type === 'password' && el.value ? '••••' : undefined),
      state: `${el.getAttribute('class') || ''}|${el.getAttribute('aria-pressed') || ''}|${el.getAttribute('data-state') || ''}`,
      inViewport,
      below: !inViewport && r.top >= vh ? true : undefined,
      above: !inViewport && r.bottom <= 0 ? true : undefined,
      box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    };
    el.setAttribute('data-uxsim-tmp', String(i));
    out.push(d);
    i++;
  }
  // Is p painted under another layer at (x, y)? Text often has pointer-events:none, so hit-testing p itself does not work:
  // take the topmost non-transparent element there and compare the two branches under their common ancestor
  // (higher z-index wins, else the later sibling paints on top). An approximation, good for cards, sheets and modals.
  const opaque = (e) => {
    if (/^(IMG|VIDEO|CANVAS|SVG|IFRAME|INPUT|TEXTAREA|SELECT|BUTTON)$/i.test(e.tagName)) return true;
    const cs = getComputedStyle(e);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    const m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor);
    const alpha = m ? (m[1].split(',')[3] !== undefined ? parseFloat(m[1].split(',')[3]) : 1) : 0;
    return alpha > 0.5;
  };
  const zOf = (e) => { const cs = getComputedStyle(e); const z = parseInt(cs.zIndex, 10); return cs.position !== 'static' && !Number.isNaN(z) ? z : 0; };
  const paintedOver = (p, x, y) => {
    const hit = document.elementsFromPoint(x, y).find((e) => !e.closest('#__uxsim_overlay') && (e === p || p.contains(e) || e.contains(p) || opaque(e)));
    if (!hit || hit === p || p.contains(hit) || hit.contains(p)) return false;
    const chain = []; for (let e = p; e; e = e.parentElement) chain.push(e);
    const set = new Set(chain);
    let a = hit; let childH = hit;
    while (a && !set.has(a)) { childH = a; a = a.parentElement; }
    if (!a) return false;
    const childP = chain[chain.indexOf(a) - 1];
    if (!childP || childP === childH) return false;
    if (zOf(childH) !== zOf(childP)) return zOf(childH) > zOf(childP);
    return !!(childP.compareDocumentPosition(childH) & Node.DOCUMENT_POSITION_FOLLOWING);
  };
  // visible text in the viewport, in document order
  const texts = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let last = '';
  let n;
  while ((n = tw.nextNode())) {
    const s = clean(n.nodeValue);
    if (!s) continue;
    const p = n.parentElement;
    if (!p || p.closest('#__uxsim_overlay,script,style,noscript')) continue;
    if (p.checkVisibility && !p.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
    // text under another layer (the card behind the top card, a page under a sheet) is not visible to the user
    const cx = Math.min(Math.max(r.left + Math.min(r.width / 2, 12), 1), vw - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1);
    if (paintedOver(p, cx, cy)) continue;
    if (s !== last) texts.push(s);
    last = s;
  }
  // the element that actually scrolls (the app shell scrolls an inner div, not the window)
  const scrollerAt = (x, y) => {
    let el = document.elementFromPoint(x, y);
    while (el && el !== document.body) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4) return el;
      el = el.parentElement;
    }
    return document.scrollingElement;
  };
  const sc = scrollerAt(vw / 2, vh / 2);
  const scroll = sc ? { top: Math.round(sc.scrollTop), max: Math.max(0, Math.round(sc.scrollHeight - sc.clientHeight)) } : { top: 0, max: 0 };
  // cheap automatic checks (human-experience idea, MIT): tap targets on phones, horizontal overflow, broken images
  const doc = document.documentElement;
  const overflowPx = Math.max(0, Math.max(doc.scrollWidth, document.body.scrollWidth) - vw);
  const small = phone ? out.filter((d) => d.inViewport && !d.disabled && d.role !== 'textbox' && (d.box.w < tapMin || d.box.h < tapMin)).map((d) => d.tmp) : [];
  const brokenImages = [...document.images].filter((im) => im.complete && im.naturalWidth === 0 && im.getBoundingClientRect().width > 0).length;
  let navLoadMs;
  try { const nav = performance.getEntriesByType('navigation')[0]; if (nav && nav.loadEventEnd > 0) navLoadMs = Math.round(nav.loadEventEnd - nav.startTime); } catch { /* */ }
  return {
    url: location.href, title: document.title, elements: out, texts, scroll,
    fullText: (document.body.innerText || '').slice(0, 20000),
    checks: { smallTapTargets: small, horizontalOverflowPx: overflowPx, brokenImages, navLoadMs },
  };
}

/** Replace temp indices with harness ids. */
export function assignIds(map) {
  for (const el of document.querySelectorAll('[data-uxsim-id]')) el.removeAttribute('data-uxsim-id');
  for (const el of document.querySelectorAll('[data-uxsim-tmp]')) {
    const id = map[el.getAttribute('data-uxsim-tmp')];
    if (id !== undefined) el.setAttribute('data-uxsim-id', String(id));
    el.removeAttribute('data-uxsim-tmp');
  }
}

/** Draw set-of-marks boxes (ids) over in-viewport elements. */
export function drawMarks(marks) {
  document.getElementById('__uxsim_overlay')?.remove();
  const o = document.createElement('div');
  o.id = '__uxsim_overlay';
  o.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
  const colors = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#008080', '#9a6324', '#800000', '#000075', '#f032e6'];
  for (const m of marks) {
    const c = colors[m.id % colors.length];
    const b = document.createElement('div');
    b.style.cssText = `position:fixed;left:${m.box.x}px;top:${m.box.y}px;width:${m.box.w}px;height:${m.box.h}px;outline:2px solid ${c};outline-offset:-1px;box-sizing:border-box;`;
    const l = document.createElement('div');
    l.textContent = String(m.id);
    const top = m.box.y >= 14 ? -14 : 0;
    l.style.cssText = `position:absolute;left:-1px;top:${top}px;background:${c};color:#fff;font:bold 11px/14px system-ui,sans-serif;padding:0 3px;border-radius:2px;`;
    b.appendChild(l);
    o.appendChild(b);
  }
  document.documentElement.appendChild(o);
}

export function clearMarks() { document.getElementById('__uxsim_overlay')?.remove(); }

/** Scroll position of the scroller under the viewport centre (to tell whether a scroll did anything). */
export function scrollState() {
  const vw = window.innerWidth; const vh = window.innerHeight;
  let el = document.elementFromPoint(vw / 2, vh / 2);
  while (el && el !== document.body) {
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4) return Math.round(el.scrollTop);
    el = el.parentElement;
  }
  return Math.round((document.scrollingElement || document.documentElement).scrollTop);
}

/**
 * Where a person would tap to hit `el`: a point inside its on-screen box where `el` (or something inside it) is the
 * topmost element. Tapping the geometric centre is wrong when a sticky bar or sheet covers part of the element — the
 * pilot's ride form was posted because the centre of a half-covered Note textarea was under the sticky "Post ride"
 * button. Tries the centre first, then a grid over the visible part; returns null when every point is covered.
 */
export function hitPoint(el) {
  if (!el || !el.isConnected) return null;
  const vw = window.innerWidth; const vh = window.innerHeight;
  const r = el.getBoundingClientRect();
  const x0 = Math.max(r.left, 0); const x1 = Math.min(r.right, vw);
  const y0 = Math.max(r.top, 0); const y1 = Math.min(r.bottom, vh);
  if (x1 - x0 < 1 || y1 - y0 < 1) return null;
  const ours = (h) => !!h && (h === el || el.contains(h) || (h.tagName === 'LABEL' && h.control === el));
  const pts = [[(r.left + r.right) / 2, (r.top + r.bottom) / 2]];
  const N = 5;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) pts.push([x0 + ((i + 0.5) * (x1 - x0)) / N, y0 + ((j + 0.5) * (y1 - y0)) / N]);
  let topmost = null;
  for (const [x, y] of pts) {
    if (x < x0 || x > x1 - 0.5 || y < y0 || y > y1 - 0.5) continue;
    const h = document.elementFromPoint(x, y);
    if (ours(h)) return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, centre: pts[0][0] === x && pts[0][1] === y };
    if (!topmost && h) topmost = (h.innerText || h.getAttribute('aria-label') || h.tagName).replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  return { x: null, y: null, coveredBy: topmost };
}
