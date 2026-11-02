/**
 * 동아리 이름·소개의 HTML 글자 코드 — 예전 명단 가져오기(fetch-orgs)가 “Entrepreneurship &amp; Technology”, “&#8212;” 를 그대로 넣었다.
 * 버클리 명단(CalLink)은 이제 로그인 뒤라 다시 가져오지 못하므로, 서버가 켜질 때 한 번 저장된 글자를 고친다(바뀐 동아리만).
 */
import type { Patch, Snapshot } from '@core/api/types';
import type { Organization } from '@core/types';
import { decodeNumericEntities } from './sources/entities';

const NAMED: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&lt;': '<', '&gt;': '>' };
/** &amp;#8212; 처럼 두 번 감싼 것도 — &amp; 를 먼저 푼 다음 숫자 코드 */
export const decodeHtmlText = (s: string) => decodeNumericEntities(s.replace(/&(?:amp|quot|#39|apos|nbsp|lt|gt);/g, (m) => NAMED[m] ?? m));

export function cleanOrgEntities(db: Snapshot): Patch | null {
  const changed: Organization[] = [];
  for (const o of db.organizations) {
    const name = decodeHtmlText(o.name);
    const description = o.description ? decodeHtmlText(o.description) : o.description;
    if (name !== o.name || description !== o.description) changed.push({ ...o, name, description });
  }
  if (!changed.length) return null;
  const byId = new Map(changed.map((o) => [o.id, o]));
  db.organizations = db.organizations.map((o) => byId.get(o.id) ?? o); // 메모리의 스냅샷도 같이 (store.applyPatch 는 DB 만 고친다)
  return { organizations: changed };
}
