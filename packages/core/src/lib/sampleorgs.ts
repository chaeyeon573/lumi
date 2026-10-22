import { organizations as seedKo } from '@core/data/seed';
import { organizations as seedEn } from '@core/data/seed.en';

/** 예시 데이터로 만든 동아리 id — 라이브 서버에도 그대로 들어가 있다 (학교 목록에서 가져온 진짜 동아리는 oc_·og_) */
export const SAMPLE_ORG_IDS: ReadonlySet<string> = new Set([...seedKo, ...seedEn].map((o) => o.id));

/** 지어낸 동아리인가 — “Officially verified” 배지를 달면 진짜처럼 보인다 */
export const isSampleOrg = (orgId: string) => SAMPLE_ORG_IDS.has(orgId);
