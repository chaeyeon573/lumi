import { create } from 'zustand';
import { t } from '@core/i18n';
import { api, type Patch, type Snapshot } from '@core/api';
import type { ID, User } from '@core/types';
import { mergePatch } from './merge';
import { setSchoolTz } from '@core/lib/campusclock';

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface AppState extends Snapshot {
  status: Status;
  error: string | null;
  currentUserId: ID | null;
  toast: { id: number; text: string; tone: 'info' | 'success' | 'error'; action?: ToastAction } | null;

  init(): Promise<void>;
  /** Re-fetch everything without the loading screen (pull-to-refresh in the iPhone app) */
  refresh(): Promise<void>;
  setCurrentUser(user: User): Promise<void>;
  logout(): Promise<void>;
  /** Permanently delete my account (typed confirmation), then sign out locally */
  deleteAccount(confirm: string): Promise<void>;
  applyPatch(patch: Patch): void;
  /** API 호출 → 패치 병합 → 토스트. 실패 시 오류 토스트를 띄우고 throw */
  run<T extends Patch | { patch: Patch }>(fn: () => Promise<T>, successMsg?: string): Promise<T>;
  /** action: 토스트 안의 버튼 하나 — 예) 참가 직후 "Open chat" → 그 채팅방. 버튼이 있으면 조금 더 오래 떠 있다 */
  showToast(text: string, tone?: 'info' | 'success' | 'error', action?: ToastAction): void;
}

/** 토스트 버튼 — 누르면 이 경로로 간다 (웹·앱 공통이라 함수 대신 경로) */
export interface ToastAction { label: string; to: string }

const empty: Snapshot = {
  users: [], schools: [], organizations: [], activities: [], participations: [], posts: [],
  relationships: { likes: [], follows: [], friendRequests: [], friends: [], blocks: [] },
  proposals: [], chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [], timePolls: [], games: [], classRosters: [],
};

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
      set({ ...snapshot, games: snapshot.games ?? [], classRosters: snapshot.classRosters ?? [], currentUserId: sessionId, status: 'ready' });
      unsubscribe?.();
      unsubscribe = api.subscribe((patch) => get().applyPatch(patch));
    } catch (e) {
      set({ status: 'error', error: (e as Error).message });
    }
  },

  async refresh() {
    const id = get().currentUserId;
    if (!id || get().status !== 'ready') return;
    try {
      const snapshot = await api.bootstrap(id);
      set({ ...snapshot, games: snapshot.games ?? [], classRosters: snapshot.classRosters ?? [] });
    } catch (e) {
      get().showToast((e as Error).message || t('문제가 발생했어요.'), 'error');
    }
  },

  async setCurrentUser(user) {
    set({ status: 'loading' });
    const snapshot = await api.bootstrap(user.id);
    set({ ...snapshot, games: snapshot.games ?? [], classRosters: snapshot.classRosters ?? [], currentUserId: user.id, status: 'ready' });
    unsubscribe?.();
    unsubscribe = api.subscribe((patch) => get().applyPatch(patch));
  },

  async logout() {
    await api.auth.logout();
    unsubscribe?.();
    unsubscribe = null;
    set({ ...empty, currentUserId: null, status: 'ready' });
  },

  async deleteAccount(confirm) {
    await api.auth.deleteAccount(confirm);
    unsubscribe?.();
    unsubscribe = null;
    set({ ...empty, currentUserId: null, status: 'ready' });
  },

  applyPatch(patch) {
    set(mergePatch(get(), patch));
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

  showToast(text, tone = 'info', action) {
    const id = ++toastSeq;
    set({ toast: { id, text, tone, action } });
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }); }, action ? 6000 : 2600);
  },
}));

/** 현재 로그인 사용자 (없으면 null) */
export const useCurrentUser = () => useAppStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);

// 로그인한 학생의 학교 시간대로 "오늘"·"지금"을 센다 (동부 학교). 상태가 바뀔 때마다 — 화면이 다시 그려지기 전에 맞춰진다
useAppStore.subscribe((s) => {
  const me = s.users.find((u) => u.id === s.currentUserId);
  const sid = me?.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  setSchoolTz(s.schools.find((x) => x.id === sid)?.tz);
});
