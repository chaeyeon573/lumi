/**
 * 브라우저 전용 mock API — 공용 엔진(`../engine`)을 localStorage 위에서 돌린다.
 * 지연·실패 시뮬레이션·세션만 여기서 처리하고 도메인 로직은 엔진에 있다.
 */
import type { AroundUApi, Patch, Snapshot } from '../types';
import { t } from '@core/i18n';
import { createEngine } from '../engine';
import { loadDB, resetDB, saveDB, getSession, setSession, type MockDB } from './db';
import { DEMO_USER_ID } from '@core/data/seed';
import { catalogCourses, searchCatalog, catalogDepartments, catalogTerms, resolveCatalogTerm } from '@core/data/catalog/courses';

let db: MockDB = loadDB();
let failNextRequest = false;
const listeners = new Set<(patch: Patch) => void>();
/** 가입 시 입력한 이메일 → 사용자 id (데모 로그인용) */
const EMAIL_KEY = 'aroundu.mock.emails.v1';
const readEmails = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(EMAIL_KEY) ?? '{}'); } catch { return {}; } };
const writeEmails = (m: Record<string, string>) => { try { localStorage.setItem(EMAIL_KEY, JSON.stringify(m)); } catch { /* */ } };

const engine = createEngine({
  get db() { return db; },
  t,
  demo: true,
  push(patch) { saveDB(db); listeners.forEach((l) => l(patch)); },
});

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms + Math.random() * 200));

async function request<T>(fn: () => T): Promise<T> {
  await delay();
  if (failNextRequest) {
    failNextRequest = false;
    throw new Error(t('네트워크 연결이 불안정해요. 잠시 후 다시 시도해주세요.'));
  }
  const result = fn();
  saveDB(db);
  return result;
}

/** 엔진 그룹의 동기 메서드를 모두 request()로 감싼다 */
function wrap<G extends Record<string, (...a: never[]) => unknown>>(group: G) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(group)) {
    const fn = group[key] as (...a: unknown[]) => unknown;
    out[key] = (...args: unknown[]) => request(() => fn(...args));
  }
  return out as { [K in keyof G]: (...a: Parameters<G[K]>) => Promise<ReturnType<G[K]>> };
}

export const mockApi: AroundUApi = {
  auth: {
    async attachEmail() { throw new Error('Not available in demo mode.'); },
    async loginDemo() {
      return request(() => { setSession(DEMO_USER_ID); return engine.find(db.users, DEMO_USER_ID); });
    },
    async loginWithCode(email, code) {
      return request(() => {
        if (code.trim() !== '123456') throw new Error(t('인증 코드가 만료되었거나 올바르지 않아요.'));
        const id = readEmails()[email.trim().toLowerCase()];
        const user = id ? db.users.find((u) => u.id === id) : undefined;
        if (!user) throw new Error(t('이 이메일로 가입된 계정이 없어요.'));
        setSession(user.id);
        return user;
      });
    },
    async register(input) {
      return request(() => {
        const user = engine.register(input);
        if (input.email) writeEmails({ ...readEmails(), [input.email.trim().toLowerCase()]: user.id });
        setSession(user.id);
        return user;
      });
    },
    async logout() { setSession(null); },
    async session() { return getSession(); },
  },

  async bootstrap(viewerId) {
    return request<Snapshot>(() => {
      engine.find(db.users, viewerId);
      engine.housekeeping();
      const { version: _v, seededOn: _s, ...snapshot } = db;
      return structuredClone(snapshot);
    });
  },

  schools: {
    async highlights() { return null; },
    async search(query) { return request(() => engine.schools.search(query)); },
    async sendVerificationCode(email, schoolId) {
      return request(() => {
        const school = schoolId ? engine.find(db.schools, schoolId) : null;
        const ok = !school || email.toLowerCase().endsWith(`@${school.emailDomain}`);
        return { ok, hint: ok ? t('데모 인증 코드: 123456') : `@${school!.emailDomain}${t(' 이메일만 사용할 수 있어요.')}` };
      });
    },
    async verifyCode(_email, code) {
      return request(() => ({ ok: code.trim() === '123456' }));
    },
  },

  catalog: {
    async courses(schoolId, query, department, term) { return request(() => searchCatalog(catalogCourses, schoolId, query, 30, department ?? '', resolveCatalogTerm(catalogCourses, schoolId, term))); },
    async departments(schoolId, term) { return request(() => catalogDepartments(catalogCourses, schoolId, resolveCatalogTerm(catalogCourses, schoolId, term))); },
    async terms(schoolId) { return request(() => ({ terms: catalogTerms(catalogCourses, schoolId), current: resolveCatalogTerm(catalogCourses, schoolId) })); },
  },

  users: wrap(engine.users),
  activities: wrap(engine.activities),
  posts: wrap(engine.posts),
  relationships: wrap(engine.relationships),
  orgs: wrap(engine.orgs),
  opportunities: wrap(engine.opportunities),
  proposals: wrap(engine.proposals),
  together: wrap(engine.together),
  games: wrap(engine.games),
  chats: {
    ...wrap(engine.chats),
    // 읽음 처리는 지연 없이
    async markRead(roomId, userId) { const p = engine.chats.markRead(roomId, userId); saveDB(db); return p; },
  },
  notifications: {
    async markRead(id) { const p = engine.notifications.markRead(id); saveDB(db); return p; },
    async markAllRead(userId) { const p = engine.notifications.markAllRead(userId); saveDB(db); return p; },
  },
  reports: wrap(engine.reports),

  system: {
    async reset() { db = resetDB(); },
    failNext() { failNextRequest = true; },
    async feedback(message, page) { console.info('[feedback]', page, message); },
  },

  // 목업 모드에는 AI 가 없다 — 화면은 AI 없이 동작한다
  ai: {
    async status() { return { enabled: false }; },
    async ask() { throw new Error('AI is not available in demo mode.'); },
    async profileDraft() { throw new Error('AI is not available in demo mode.'); },
    async starters() { throw new Error('AI is not available in demo mode.'); },
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
