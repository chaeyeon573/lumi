import { getPlatform } from '@core/platform';

/** 정적 자산 경로 → 플랫폼별 소스 (웹: URL, RN: require 결과) */
export const assetUrl = (path: string) => getPlatform().asset(path);
export const photo = (name: string) => `photos/${name}.jpg`;

/** 사장님 기준(2026-11-06): 사진은 사람이 직접 올린 것만 보여준다 — 업로드(api/media), 올리기 직전 미리보기(blob:/data:).
 *  출처에서 긁어 온 이미지·예시 사진(photos/…)·색 그라데이션은 카드·상세 화면에 그리지 않는다. 프로필 사진(아바타)은 해당 없음. */
export const isUploadedPhoto = (url?: string | null): url is string => !!url && (/^\/?api\/media\//.test(url) || url.startsWith('blob:') || url.startsWith('data:'));
