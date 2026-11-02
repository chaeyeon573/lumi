/**
 * 학교의 동아리 디렉터리 플랫폼 자동 탐지.
 * 미국 대학 대부분이 CampusLabs Engage 또는 CampusGroups 를 쓴다 — 짧은 이름으로 만든 후보 주소를 찔러 보고,
 * 실제 목록이 1개 이상 읽히는 쪽을 고른다 (로그인 페이지로 넘어가는 200 은 걸러진다).
 */
export interface Detected { platform: 'engage' | 'campusgroups' | 'presence' | 'pennclubs'; host: string; sample: number }

const UA = 'Mozilla/5.0 AroundU-importer';
async function get(url: string): Promise<{ ok: boolean; status: number; text: string; url: string }> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json' }, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
    return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : '', url: res.url };
  } catch { return { ok: false, status: 0, text: '', url }; }
}

export function candidates(short: string, emailDomain: string): { platform: Detected['platform']; host: string }[] {
  const list: { platform: Detected['platform']; host: string }[] = [
    { platform: 'engage', host: `https://${short}.campuslabs.com/engage` },
    { platform: 'campusgroups', host: `https://${short}.campusgroups.com` },
    { platform: 'campusgroups', host: `https://engage.${emailDomain}` },
    { platform: 'campusgroups', host: `https://community.${emailDomain}` },
    { platform: 'campusgroups', host: `https://${short}.campuslabs.com` },
    { platform: 'engage', host: `https://${emailDomain.split('.')[0]}.campuslabs.com/engage` },
    { platform: 'presence', host: `https://${short}.presence.io` },
    { platform: 'presence', host: `https://${emailDomain.split('.')[0]}.presence.io` },
  ];
  return list.filter((c, i, a) => a.findIndex((x) => x.host === c.host) === i);
}

export async function detectOrgsPlatform(short: string, emailDomain: string, override?: string): Promise<Detected | null> {
  // Penn Clubs (UPenn) — 공개 JSON 목록
  if (override && /pennclubs\.com/.test(override)) {
    const host = override.replace(/\/+$/, ''); const r = await get(`${host}/api/clubs/?format=json`);
    try { const n = r.ok ? (JSON.parse(r.text) as unknown[]).length : 0; return n > 0 ? { platform: 'pennclubs', host, sample: n } : null; } catch { return null; }
  }
  // 직접 적어 준 주소는 어느 플랫폼인지 모를 수 있다(예: callink.berkeley.edu 는 Engage) — 둘 다 시도한다
  const list: { platform: Detected['platform']; host: string }[] = override ? [{ platform: 'engage', host: override.replace(/\/+$/, '') }, { platform: 'campusgroups', host: override.replace(/\/+$/, '') }] : candidates(short, emailDomain);
  for (const c of list) {
    if (c.platform === 'presence') {
      const sub = new URL(c.host).hostname.split('.')[0];
      const r = await get(`https://api.presence.io/${sub}/v1/organizations`);
      if (!r.ok) continue;
      try { const n = (JSON.parse(r.text) as unknown[]).length; if (n > 0) return { platform: 'presence', host: c.host, sample: n }; } catch { /* not json */ }
      continue;
    }
    if (c.platform === 'engage') {
      const r = await get(`${c.host}/api/discovery/search/organizations?top=1`);
      if (!r.ok) continue;
      try { const n = (JSON.parse(r.text) as { '@odata.count'?: number })['@odata.count'] ?? 0; if (n > 0) return { platform: 'engage', host: c.host, sample: n }; } catch { /* not json */ }
    } else {
      const r = await get(`${c.host}/club_signup`);
      if (!r.ok || /login|sign_in|saml|shibboleth/i.test(r.url)) continue;
      const n = r.text.split('<li class="list-group-item"').length - 1;
      const total = Number(/clubsCount'\)\.innerHTML = '\((\d+)\)'/.exec(r.text)?.[1] ?? '') || n;
      if (n > 0) return { platform: 'campusgroups', host: c.host, sample: total };
    }
  }
  return null;
}
