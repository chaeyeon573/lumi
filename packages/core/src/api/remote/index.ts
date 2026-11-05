/**
 * 실제 서버(`server/`)를 호출하는 AroundUApi 구현.
 *
 * - 모든 메서드는 `POST {base}/api/rpc/<group>/<method>` 에 `{ args: [...] }` 로 전달된다.
 * - 세션 토큰은 localStorage 에 두고 Authorization 헤더로 보낸다.
 * - `subscribe()` 는 SSE(`/api/events`)로 서버 푸시(Patch)를 받는다.
 */
import type { AccountExport } from '@core/lib/exportdata';
import type { AroundUApi, Patch, Snapshot } from '../types';
import type { PublicPlan } from '@core/lib/plans';
import type { PublicExplore } from '@core/lib/publicexplore';
import type { ID, User } from '@core/types';
import { t, lang } from '@core/i18n';

const TOKEN_KEY = 'aroundu.remote.token.v1';
const USER_KEY = 'aroundu.remote.user.v1';

const readToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const writeToken = (token: string | null, userId: ID | null) => {
  try {
    if (token) { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, userId ?? ''); }
    else { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
  } catch { /* ignore */ }
};

export function createRemoteApi(baseUrl: string): AroundUApi {
  const base = baseUrl.replace(/\/$/, '');
  let failNextRequest = false;
  const listeners = new Set<(patch: Patch) => void>();
  let source: EventSource | null = null;

  async function call<T>(path: string, body: unknown): Promise<T> {
    if (failNextRequest) { failNextRequest = false; throw new Error(t('네트워크 연결이 불안정해요. 잠시 후 다시 시도해주세요.')); }
    const token = readToken();
    let res: Response;
    try {
      res = await fetch(`${base}/api/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept-language': lang, ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body ?? {}),
      });
    } catch {
      throw new Error(t('네트워크 연결이 불안정해요. 잠시 후 다시 시도해주세요.'));
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) { writeToken(null, null); stopEvents(); }
      throw new Error((data as { error?: string }).error || t('문제가 발생했어요.'));
    }
    return data as T;
  }

  const rpc = <T>(group: string, method: string, ...args: unknown[]) => call<T>(`rpc/${group}/${method}`, { args });

  /** 엔진 그룹을 그대로 rpc 로 매핑 */
  function group<G extends object>(name: string, methods: (keyof G & string)[]): G {
    const out: Record<string, unknown> = {};
    for (const m of methods) out[m] = (...args: unknown[]) => rpc(name, m, ...args);
    return out as G;
  }

  function startEvents() {
    stopEvents();
    const token = readToken();
    if (!token || typeof EventSource === 'undefined') return;
    source = new EventSource(`${base}/api/events?token=${encodeURIComponent(token)}`);
    source.addEventListener('patch', (e) => {
      try { const patch = JSON.parse((e as MessageEvent).data) as Patch; listeners.forEach((l) => l(patch)); } catch { /* ignore */ }
    });
  }
  function stopEvents() { source?.close(); source = null; }

  const session = async (): Promise<ID | null> => {
    if (!readToken()) return null;
    try {
      const me = await call<{ user: User | null }>('auth/me', {});
      if (!me.user) { writeToken(null, null); return null; }
      writeToken(readToken(), me.user.id);
      return me.user.id;
    } catch { return null; }
  };

  return {
    auth: {
      async loginDemo(schoolId) {
        const r = await call<{ token: string; user: User }>('auth/demo', { schoolId });
        writeToken(r.token, r.user.id);
        return r.user;
      },
      async loginWithCode(email, code) {
        const r = await call<{ token: string; user: User }>('auth/login', { email, code });
        writeToken(r.token, r.user.id);
        return r.user;
      },
      async register(input) {
        const r = await call<{ token: string; user: User }>('auth/register', { input });
        writeToken(r.token, r.user.id);
        return r.user;
      },
      async attachEmail(email) {
        const r = await call<{ user: User }>('auth/attach-email', { email });
        return r.user;
      },
      async logout() {
        try { await call('auth/logout', {}); } catch { /* ignore */ }
        writeToken(null, null);
        stopEvents();
      },
      async deleteAccount(confirm) {
        await call('auth/delete-account', { confirm });
        // 서버가 세션을 모두 지웠다 — 이 기기의 토큰과 실시간 연결도 정리한다
        writeToken(null, null);
        stopEvents();
      },
      async exportData() { return call<AccountExport>('auth/export-data', {}); },
      session,
    },

    async bootstrap(viewerId) {
      const snap = await call<Snapshot>('bootstrap', { viewerId });
      startEvents();
      return snap;
    },

    schools: {
      search: (query) => call('schools/search', { query }),
      sendVerificationCode: (email, schoolId) => call('schools/send-code', { email, schoolId }),
      verifyCode: (email, code) => call('schools/verify-code', { email, code }),
      highlights: (schoolId) => call('schools/highlights', { schoolId }),
      searchOrgs: (schoolId, query) => call('schools/orgs', { schoolId, query }),
    },

    catalog: {
      courses: (schoolId, query, department, term) => call('catalog/courses', { schoolId, query, department, term }),
      departments: (schoolId, term) => call('catalog/departments', { schoolId, term }),
      terms: (schoolId) => call('catalog/terms', { schoolId }),
      sections: (schoolId, courseId) => call('catalog/sections', { schoolId, courseId }),
    },

    academic: { dates: (schoolId) => call('academic/dates', { schoolId }) },
    seats: {
      mine: () => call('seats/mine', {}),
      watch: (courseId) => call('seats/watch', { courseId }),
      unwatch: (id) => call('seats/unwatch', { id }),
    },

    users: group('users', ['update', 'setAvailability', 'votePoll', 'dailyResults']),
    activities: group('activities', ['create', 'update', 'remove', 'join', 'cancel', 'approve', 'reject', 'comment', 'toggleInterest', 'joinWaitlist']),
    posts: group('posts', ['create', 'remove', 'toggleLike', 'toggleSave', 'comment', 'approveTag']),
    relationships: group('relationships', ['toggleLike', 'toggleFollow', 'sendFriendRequest', 'cancelFriendRequest', 'respondFriendRequest', 'unfriend', 'block', 'unblock']),
    orgs: group('orgs', ['apply', 'create', 'respondApplication']),
    // 로그인 없이 (S089) — 토큰 없이 GET, 공개 데이터만 (server: GET /api/public/explore)
    guest: {
      async explore(schoolId) {
        let res: Response;
        try { res = await fetch(`${base}/api/public/explore?school=${encodeURIComponent(schoolId)}`, { headers: { 'accept-language': lang } }); }
        catch { throw new Error(t('네트워크 연결이 불안정해요. 잠시 후 다시 시도해주세요.')); }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || t('문제가 발생했어요.'));
        return data as PublicExplore;
      },
    },
    opportunities: group('opportunities', ['create', 'setIntent', 'toggleSave', 'ask', 'review', 'goTogether', 'leaveTogether', 'lookForTeam']),
    proposals: group('proposals', ['create', 'respond']),
    together: group('together', ['create', 'vote', 'addOption', 'decide', 'cancel', 'votePlace']),
    plans: {
      ...group<Omit<AroundUApi['plans'], 'view' | 'guestRespond'>>('plans', ['create', 'respond', 'lock', 'edit', 'close', 'removeResponse']),
      // 공개 — 로그인 없이도 (로그인했으면 Authorization 으로 나를 알아본다). 손님 토큰은 본문으로만 (주소에 넣지 않는다)
      view: async (id, token) => (await call<{ plan: PublicPlan | null }>(`plans/${encodeURIComponent(id)}/view`, { token })).plan,
      guestRespond: (id, answer, token) => call(`plans/${encodeURIComponent(id)}/respond`, { answer, token }),
    },
    games: group('games', ['send', 'answer', 'decline']),
    rides: {
      ...group<Omit<AroundUApi['rides'], 'teaser'>>('rides', ['create', 'join', 'leave', 'close', 'reopen', 'cancel', 'update']),
      teaser: (id) => call('rides/teaser', { id }),
    },
    chats: group('chats', ['send', 'markRead', 'openDirect']),
    notifications: group('notifications', ['markRead', 'markAllRead']),
    reports: group('reports', ['create']),
    classes: {
      room: (school, code) => call('classes/room', { school, code }),
      ...group<Pick<AroundUApi['classes'], 'respond' | 'setPartner'>>('classes', ['respond', 'setPartner']),
    },
    classQA: {
      list: (key) => call('classqa/list', { key }),
      ask: (key, text) => call('classqa/ask', { key, text }),
      answer: (questionId, text) => call('classqa/answer', { questionId, text }),
      remove: (questionId, answerId) => call('classqa/remove', { questionId, answerId }),
    },

    push: {
      register: (token, device) => call<{ registered: boolean }>('push/register', { token, ...device }),
      async unregister(token) { await call('push/unregister', { token }); },
      // keepalive: still delivered when the page is being hidden or closed. Not through call() — a failure here
      // must never sign the person out or show an error
      async viewing(roomId) {
        const token = readToken();
        if (!token) return;
        try { await fetch(`${base}/api/chats/viewing`, { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ roomId }) }); } catch { /* offline */ }
      },
    },

    system: {
      async reset() { await call('system/reset', {}); },
      failNext() { failNextRequest = true; },
      async feedback(message, page) { await call('feedback', { message, page }); },
      async uploadPhoto(dataUrl) { const r = await call<{ url: string }>('media', { data: dataUrl }); return { url: r.url }; },
    },

    ai: {
      async status() {
        try { const r = await fetch(`${base}/api/ai/status`); return r.ok ? await r.json() as { enabled: boolean } : { enabled: false }; } catch { return { enabled: false }; }
      },
      ask: (messages) => call('ai/ask', { messages }),
      profileDraft: (text, schoolId) => call('ai/profile-draft', { text, schoolId }),
      starters: (userId, lang) => call('ai/starters', { userId, lang }),
    },

    subscribe(listener) {
      listeners.add(listener);
      if (!source) startEvents();
      return () => { listeners.delete(listener); if (listeners.size === 0) stopEvents(); };
    },
  };
}
