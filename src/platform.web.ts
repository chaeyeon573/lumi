import { setPlatform } from '@core/platform';

/** 웹 플랫폼: localStorage, 새로고침, public/ 자산 URL */
setPlatform({
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* quota */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* */ } },
  reload: () => window.location.reload(),
  locale: () => 'en-US',
  asset: (path) => `${import.meta.env.BASE_URL}${path}`,
  env: (key) => (key === 'API_MODE' ? import.meta.env.VITE_API_MODE : import.meta.env.VITE_API_URL) as string | undefined,
});
