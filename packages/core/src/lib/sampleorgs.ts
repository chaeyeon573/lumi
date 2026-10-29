import { organizations as seedKo, notifications as seedNotesKo } from '@core/data/seed';
import { organizations as seedEn, notifications as seedNotesEn } from '@core/data/seed.en';
import { catalogOrganizations } from '@core/data/catalog/orgs';

/**
 * 예시 데이터로 지어낸 동아리 id — 라이브 서버에도 그대로 들어가 있다.
 * 시드 목록에는 학교 목록에서 가져온 진짜 동아리(oc_·og_)도 섞여 있으니 그건 뺀다 (server/samples.ts 와 같은 규칙).
 */
const catalogIds = new Set(catalogOrganizations.map((o) => o.id));
export const SAMPLE_ORG_IDS: ReadonlySet<string> = new Set([...seedKo, ...seedEn].filter((o) => !catalogIds.has(o.id)).map((o) => o.id));

/** 지어낸 동아리인가 — “Officially verified” 배지를 달면 진짜처럼 보인다 */
export const isSampleOrg = (orgId: string) => SAMPLE_ORG_IDS.has(orgId);

/** 시드 알림(nt1…) — 전부 예시 사람·모임 이야기다. 진짜 알림 id 는 uid('nt') 라 ‘nt_’ 로 시작해 겹치지 않는다 */
const SAMPLE_NOTE_IDS: ReadonlySet<string> = new Set([...seedNotesKo, ...seedNotesEn].map((n) => n.id));
export const isSampleNotification = (id: string) => SAMPLE_NOTE_IDS.has(id);
