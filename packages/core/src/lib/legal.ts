/** 약관·개인정보처리방침 등 공개 페이지 주소 — 서버(`server/legal.ts`)가 서빙한다. API_URL 이 없으면 같은 origin */
import { getPlatform } from '@core/platform';
import { lang } from '@core/i18n';

export type LegalPageKey = 'privacy' | 'terms' | 'support' | 'delete-account';
export function legalUrl(page: LegalPageKey): string {
  let base = '';
  try { base = (getPlatform().env('API_URL') ?? '').replace(/\/$/, ''); } catch { /* */ }
  return `${base}/${page}?lang=${lang}`;
}
