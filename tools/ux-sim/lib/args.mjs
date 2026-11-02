// Tiny argv parser: positional args in `_`, `--k v`, `--k=v`, bare `--flag` = true. Repeated keys become arrays.
export function parseArgs(argv, booleans = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { out._.push(...argv.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const k = eq > 0 ? a.slice(2, eq) : a.slice(2);
      let v;
      if (eq > 0) v = a.slice(eq + 1);
      else if (!booleans.includes(k) && i + 1 < argv.length && !argv[i + 1].startsWith('--')) v = argv[++i];
      else v = true;
      out[k] = k in out ? [].concat(out[k], v) : v;
    } else out._.push(a);
  }
  return out;
}
