import { apiMode } from '@core/api';

/** 데모 전용 UI(데모 계정 로그인 · 데모 도구) — mock 모드이거나 EXPO_PUBLIC_SHOW_DEMO=1 로 빌드한 경우만. 스토어 빌드(remote)에는 숨긴다 */
export const SHOW_DEMO = apiMode === 'mock' || process.env.EXPO_PUBLIC_SHOW_DEMO === '1';
