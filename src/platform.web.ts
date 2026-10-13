import { setPlatform } from '@core/platform';

/** 웹 플랫폼: localStorage, 새로고침, public/ 자산 URL */
setPlatform({
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* quota */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* */ } },
  reload: () => window.location.reload(),
  locale: () => navigator.language,
  // 바깥 주소(동아리 로고 등)는 그대로 — 앞에 BASE_URL 을 붙이면 "/https://…" 가 되어 깨진다
  asset: (path) => (/^(https?:|data:|blob:)/.test(path) ? path : `${import.meta.env.BASE_URL}${path}`),
});
