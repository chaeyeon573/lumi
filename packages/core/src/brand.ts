/** Display branding only. Do not use this for bundle IDs, storage keys or service URLs. */
export const BRAND = {
  name: 'Lumi',
  tagline: 'Your college life, all in one place.',
} as const;
export const SOCIAL_TABS = ['For You', 'Meetups', 'People', 'Feed'] as const;
export type SocialTab = 'for-you' | 'meetups' | 'people' | 'feed';
export const SOCIAL_KEYS: SocialTab[] = [
  'for-you',
  'meetups',
  'people',
  'feed',
];
export function socialRoute(path: string): string {
  const [pathname, query] = path.split('?');
  const tab = (
    { '/people': 'people', '/meet': 'meetups', '/feed': 'feed' } as Record<
      string,
      string
    >
  )[pathname];
  if (tab) return `/social?section=${tab}${query ? '&' + query : ''}`;
  if (pathname === '/timetable') return `/schedule${query ? '?' + query : ''}`;
  return path;
}
