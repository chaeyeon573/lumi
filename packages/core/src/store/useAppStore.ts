import { create } from 'zustand';
import { t } from '@core/i18n';
import { api, type Patch, type Snapshot } from '@core/api';
import type { ID, User } from '@core/types';

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface AppState extends Snapshot {
  status: Status;
  error: string | null;
  currentUserId: ID | null;
  toast: { id: number; text: string; tone: 'info' | 'success' | 'error' } | null;

  init(): Promise<void>;
  setCurrentUser(user: User): Promise<void>;
  logout(): Promise<void>;
  applyPatch(patch: Patch): void;
  /** API 호출 → 패치 병합 → 토스트. 실패 시 오류 토스트를 띄우고 throw */
  run<T extends Patch | { patch: Patch }>(fn: () => Promise<T>, successMsg?: string): Promise<T>;
  showToast(text: string, tone?: 'info' | 'success' | 'error'): void;
}

const empty: Snapshot = {
  users: [], schools: [], organizations: [], activities: [], participations: [], posts: [],
  relationships: { likes: [], follows: [], friendRequests: [], friends: [], blocks: [] },
  proposals: [], chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [], timePolls: [], savedSearches: [], networkRequests: [], introRequests: [],
};

function upsert<T extends { id: ID }>(list: T[], items?: T[], removed?: ID[]) {
  if (!items && !removed) return list;
  const byId = new Map(list.map((i) => [i.id, i]));
  items?.forEach((i) => byId.set(i.id, i));
  removed?.forEach((id) => byId.delete(id));
  return [...byId.values()];
}

let unsubscribe: (() => void) | null = null;
let toastSeq = 0;

export const useAppStore = create<AppState>((set, get) => ({
  ...empty,
  status: 'idle',
  error: null,
  currentUserId: null,
  toast: null,

  async init() {
    set({ status: 'loading', error: null });
    try {
      const sessionId = await api.auth.session();
      if (!sessionId) { set({ status: 'ready', currentUserId: null }); return; }
      const snapshot = await api.bootstrap(sessionId);
      set({ ...snapshot, currentUserId: sessionId, status: 'ready' });
      unsubscribe?.();
      unsubscribe = api.subscribe((patch) => get().applyPatch(patch));
    } catch (e) {
      set({ status: 'error', error: (e as Error).message });
    }
  },

  async setCurrentUser(user) {
    set({ status: 'loading' });
    const snapshot = await api.bootstrap(user.id);
    set({ ...snapshot, currentUserId: user.id, status: 'ready' });
    unsubscribe?.();
    unsubscribe = api.subscribe((patch) => get().applyPatch(patch));
  },

  async logout() {
    await api.auth.logout();
    unsubscribe?.();
    unsubscribe = null;
    set({ ...empty, currentUserId: null, status: 'ready' });
  },

  applyPatch(patch) {
    const s = get();
    set({
      users: upsert(s.users, patch.users),
      schools: upsert(s.schools, patch.schools),
      organizations: upsert(s.organizations, patch.organizations, patch.removed?.organizations),
      activities: upsert(s.activities, patch.activities, patch.removed?.activities),
      participations: upsert(s.participations, patch.participations, patch.removed?.participations),
      posts: upsert(s.posts, patch.posts, patch.removed?.posts),
      proposals: upsert(s.proposals, patch.proposals, patch.removed?.proposals),
      chatRooms: upsert(s.chatRooms, patch.chatRooms, patch.removed?.chatRooms),
      notifications: upsert(s.notifications, patch.notifications),
      reports: upsert(s.reports, patch.reports),
      opportunities: upsert(s.opportunities, patch.opportunities, patch.removed?.opportunities),
      opportunityIntents: upsert(s.opportunityIntents, patch.opportunityIntents, patch.removed?.opportunityIntents),
      timePolls: upsert(s.timePolls, patch.timePolls, patch.removed?.timePolls),
      savedSearches: upsert(s.savedSearches, patch.savedSearches, patch.removed?.savedSearches),
      networkRequests: upsert(s.networkRequests, patch.networkRequests, patch.removed?.networkRequests),
      introRequests: upsert(s.introRequests, patch.introRequests, patch.removed?.introRequests),
      relationships: patch.relationships ? structuredClone(patch.relationships) : s.relationships,
    });
  },

  async run(fn, successMsg) {
    try {
      const result = await fn();
      const patch: Patch = 'patch' in result ? result.patch : result;
      get().applyPatch(patch);
      if (successMsg) get().showToast(successMsg, 'success');
      return result;
    } catch (e) {
      get().showToast((e as Error).message || t('문제가 발생했어요.'), 'error');
      throw e;
    }
  },

  showToast(text, tone = 'info') {
    const id = ++toastSeq;
    set({ toast: { id, text, tone } });
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }); }, 2600);
  },
}));

/** 현재 로그인 사용자 (없으면 null) */
export const useCurrentUser = () => useAppStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
