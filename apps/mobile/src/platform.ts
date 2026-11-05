/**
 * 모바일 플랫폼 어댑터 — core는 동기 저장소를 기대하므로 AsyncStorage를 메모리 캐시에 미리 올린다(hydrate).
 * 쓰기는 메모리에 즉시 반영하고 AsyncStorage에는 비동기로 흘려보낸다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform as RNPlatform } from 'react-native';
import { setPlatform } from '@core/platform';
import { PHOTOS } from './photos';

// Hermes에 structuredClone이 없는 버전을 위한 폴리필 (core mock DB가 사용)
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (v: unknown) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
}

const memory = new Map<string, string>();
const PREFIX = 'aroundu.';
let reloadHandler: () => void = () => {};

export function setReloadHandler(fn: () => void) { reloadHandler = fn; }

setPlatform({
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => { memory.set(k, v); AsyncStorage.setItem(k, v).catch(() => {}); },
  removeItem: (k) => { memory.delete(k); AsyncStorage.removeItem(k).catch(() => {}); },
  reload: () => { if (RNPlatform.OS === 'web' && typeof window !== 'undefined') window.location.href = document.baseURI; else reloadHandler(); },
  locale: () => 'en-US',
  asset: (path) => PHOTOS[path] ?? path,
  env: (key) => (key === 'API_MODE' ? process.env.EXPO_PUBLIC_API_MODE : process.env.EXPO_PUBLIC_API_URL),
});

/** 앱 시작 전에 저장된 키를 전부 메모리로 올린다. 저장소가 멈춰도 앱은 떠야 하므로 3초 안에 끝낸다 */
export async function hydrate() {
  const load = (async () => {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX) || k.startsWith('lumi.'));
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([k, v]) => { if (v != null) memory.set(k, v); });
  })();
  try { await Promise.race([load, new Promise((r) => setTimeout(r, 3000))]); } catch (e) { console.warn('[boot] hydrate failed', e); }
  console.log('[boot] hydrate done, keys:', memory.size);
}
