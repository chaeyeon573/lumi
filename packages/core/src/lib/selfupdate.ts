import type { Affiliation, ExtraField, NextChapter, OpenTo, OpenToKind, User, Visibility } from '@core/types';

/**
 * users.update 를 사용자가 RPC로 직접 부를 때 바꿀 수 없는 값을 걸러낸다.
 * 예시 표시·정지·생성 시각은 서버만 바꾼다. 학교 이메일 인증·본인 인증은 서버의 인증 흐름만 켠다 —
 * 그대로 두면 누구나 자기를 '인증됨'으로 바꿔 수업 명단·라이드 같은 인증 전용 기능을 열 수 있었다.
 * 데모(예시) 계정은 데모용 '즉시 인증' 토글을 쓸 수 있게 인증 값만 허용한다.
 */
const SERVER_ONLY = ['id', 'createdAt', 'sample', 'suspended', 'verification', 'viewable', 'mutualFriendCount'] as const;

const sameOrg = (a: Affiliation, b: Affiliation) =>
  a.type === b.type && (a.type === 'university' ? a.schoolId === (b as typeof a).schoolId : a.companyName.trim().toLowerCase() === (b as typeof a).companyName.trim().toLowerCase());

const VISIBILITIES: readonly Visibility[] = ['public', 'school', 'department', 'friends', 'followers', 'private'];
const OPEN_TO_KINDS: readonly OpenToKind[] = ['coffee', 'study', 'advice', 'walk', 'lunch'];
const EXTRA_FIELDS: readonly ExtraField[] = ['languages', 'country', 'nextChapter', 'memberships'];
const short = (x: unknown, max: number) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/**
 * 새 프로필 항목(쓰는 언어·출신 나라·졸업 뒤·공개 범위)을 정리한다 — 글자 수를 줄이고, 빈 값은 지운다(undefined),
 * 모르는 공개 범위 값은 버린다 ('selected' 는 고른 사람 명단이 없어 쓰지 않는다)
 */
export function cleanProfileExtras(patch: Partial<User>): Partial<User> {
  const out = { ...patch };
  if ('spokenLanguages' in out) {
    const list = Array.isArray(out.spokenLanguages) ? out.spokenLanguages.map((l) => short(l, 30)).filter(Boolean) : [];
    out.spokenLanguages = list.length ? [...new Set(list)].slice(0, 8) : undefined;
  }
  if ('countryOfOrigin' in out) out.countryOfOrigin = short(out.countryOfOrigin, 56) || undefined;
  if ('nextChapter' in out) {
    const n = (out.nextChapter ?? {}) as NextChapter;
    const year = Number(n.gradYear);
    const next: NextChapter = {
      ...(Number.isInteger(year) && year >= 1950 && year <= 2100 ? { gradYear: year } : {}),
      ...(short(n.city, 60) ? { city: short(n.city, 60) } : {}),
      ...(short(n.company, 80) ? { company: short(n.company, 80) } : {}),
      ...(short(n.role, 80) ? { role: short(n.role, 80) } : {}),
      ...(short(n.industry, 60) ? { industry: short(n.industry, 60) } : {}),
    };
    out.nextChapter = Object.keys(next).length ? next : undefined;
  }
  if ('openTo' in out) {
    const o = out.openTo as Partial<OpenTo> | undefined;
    const kinds = (Array.isArray(o?.kinds) ? o.kinds : []).filter((k): k is OpenToKind => OPEN_TO_KINDS.includes(k as OpenToKind));
    const ok = o && kinds.length && ['today', 'this_week', 'next_week'].includes(o.when as string) && /^\d{4}-\d{2}-\d{2}$/.test(o.until ?? '') && VISIBILITIES.includes(o.visibility as Visibility);
    out.openTo = ok ? { kinds: [...new Set(kinds)], when: o.when!, until: o.until!, visibility: o.visibility! } : undefined;
  }
  if ('extraVisibility' in out) {
    const v = (out.extraVisibility ?? {}) as Record<string, unknown>;
    out.extraVisibility = Object.fromEntries(EXTRA_FIELDS.filter((f) => VISIBILITIES.includes(v[f] as Visibility)).map((f) => [f, v[f] as Visibility]));
  }
  return out;
}

export function sanitizeSelfUpdate(current: User, patch: Partial<User> | undefined): Partial<User> {
  const out: Partial<User> & Record<string, unknown> = cleanProfileExtras({ ...(patch ?? {}) });
  for (const k of SERVER_ONLY) delete out[k];
  if (current.sample) return out;
  delete out.identityVerified;
  if (out.affiliation) {
    // 같은 학교·회사면 지금 인증 상태를 그대로, 바뀌면 다시 인증해야 한다
    const verified = sameOrg(current.affiliation, out.affiliation) ? current.affiliation.emailVerified : false;
    out.affiliation = { ...out.affiliation, emailVerified: verified } as Affiliation;
  }
  return out;
}
