import type { Affiliation, User } from '@core/types';

/**
 * users.update 를 사용자가 RPC로 직접 부를 때 바꿀 수 없는 값을 걸러낸다.
 * 예시 표시·정지·생성 시각은 서버만 바꾼다. 학교 이메일 인증·본인 인증은 서버의 인증 흐름만 켠다 —
 * 그대로 두면 누구나 자기를 '인증됨'으로 바꿔 수업 명단·라이드 같은 인증 전용 기능을 열 수 있었다.
 * 데모(예시) 계정은 데모용 '즉시 인증' 토글을 쓸 수 있게 인증 값만 허용한다.
 */
const SERVER_ONLY = ['id', 'createdAt', 'sample', 'suspended', 'viewable', 'mutualFriendCount'] as const;

const sameOrg = (a: Affiliation, b: Affiliation) =>
  a.type === b.type && (a.type === 'university' ? a.schoolId === (b as typeof a).schoolId : a.companyName.trim().toLowerCase() === (b as typeof a).companyName.trim().toLowerCase());

export function sanitizeSelfUpdate(current: User, patch: Partial<User> | undefined): Partial<User> {
  const out: Partial<User> & Record<string, unknown> = { ...(patch ?? {}) };
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
