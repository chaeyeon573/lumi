import { socialRoute } from '@core/brand';
import { router } from 'expo-router';

/** 웹 경로 → expo-router 경로. 화면 코드는 웹과 같은 경로 문자열을 그대로 쓴다 */
export function toRoute(path: string): string {
  if (path === '/' || path.startsWith('/?')) return '/';
  if (path.startsWith('/community')) return path.replace('/community', '/campus');
  if (path === '/profile' || path.startsWith('/profile?')) return path.replace('/profile', '/me');
  return socialRoute(path);
}
export const nav = (path: string) => router.push(toRoute(path) as never);
export const replace = (path: string) => router.replace(toRoute(path) as never);
export const back = () => (router.canGoBack() ? router.back() : router.replace('/' as never));
