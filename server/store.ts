/**
 * 영속 계층.
 * - `DATABASE_URL` 이 있으면 Postgres (Railway Postgres 플러그인 그대로 연결)
 * - 없으면 `server/.data/db.json` 파일 (로컬 개발용)
 *
 * 메모리의 스냅샷이 진실이고, 엔진이 돌려준 Patch 만 뒤에서 순서대로 기록한다.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import type { Patch, Snapshot, CatalogCourse } from '@core/api/types';
import type { ID } from '@core/types';

export type Collection = Exclude<keyof Snapshot, 'relationships'>;
export const COLLECTIONS: Collection[] = ['users', 'schools', 'organizations', 'activities', 'participations', 'posts', 'proposals', 'chatRooms', 'notifications', 'reports', 'opportunities', 'opportunityIntents', 'timePolls', 'savedSearches', 'networkRequests', 'introRequests'];

export interface Account { email: string; userId: ID; createdAt: string }
export interface Session { token: string; userId: ID; createdAt: string }
export interface EmailCode { email: string; code: string; expiresAt: string }

export interface Store {
  init(): Promise<void>;
  /** 저장된 스냅샷. 비어 있으면 null (→ 시드) */
  loadSnapshot(): Promise<Snapshot | null>;
  /** 전체 스냅샷을 통째로 기록 (시드·리셋) */
  replaceAll(snapshot: Snapshot): Promise<void>;
  applyPatch(patch: Patch): Promise<void>;

  loadCatalog(): Promise<CatalogCourse[]>;
  upsertCatalog(courses: CatalogCourse[]): Promise<void>;
  /** 한 학교의 수업 목록을 통째로 바꾼다 — 실제 학기 데이터를 넣을 때 내장 예시·지난 학기 행을 남기지 않는다 */
  replaceCatalog(schoolId: ID, courses: CatalogCourse[]): Promise<void>;

  findAccount(email: string): Promise<Account | null>;
  createAccount(a: Account): Promise<void>;
  createSession(s: Session): Promise<void>;
  findSession(token: string): Promise<Session | null>;
  deleteSession(token: string): Promise<void>;
  /** 계정 삭제 — 로그인 이메일·세션을 모두 지운다 */
  deleteLogin(userId: ID): Promise<void>;
  setCode(c: EmailCode): Promise<void>;
  takeCode(email: string): Promise<EmailCode | null>;
}

// ─── Postgres ────────────────────────────────────────────────────────────
export class PgStore implements Store {
  private pool: pg.Pool;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(url: string) {
    const ssl = /localhost|127\.0\.0\.1|railway\.internal/.test(url) ? undefined : { rejectUnauthorized: false };
    this.pool = new pg.Pool({ connectionString: url, ssl, max: 5 });
  }

  /** 쓰기는 순서를 지켜 직렬화 */
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch((e) => { console.error('[store] write failed', e); });
    return next;
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS docs (collection text NOT NULL, id text NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (collection, id));
      CREATE TABLE IF NOT EXISTS catalog_courses (id text PRIMARY KEY, school_id text NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS catalog_courses_school ON catalog_courses (school_id);
      CREATE TABLE IF NOT EXISTS accounts (email text PRIMARY KEY, user_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS sessions (token text PRIMARY KEY, user_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS email_codes (email text PRIMARY KEY, code text NOT NULL, expires_at timestamptz NOT NULL);
    `);
  }

  async loadSnapshot(): Promise<Snapshot | null> {
    const { rows } = await this.pool.query<{ collection: string; id: string; data: unknown }>('SELECT collection, id, data FROM docs');
    if (rows.length === 0) return null;
    const snap = emptySnapshot();
    for (const r of rows) {
      if (r.collection === 'relationships') snap.relationships = r.data as Snapshot['relationships'];
      else if ((COLLECTIONS as string[]).includes(r.collection)) (snap[r.collection as Collection] as unknown[]).push(r.data);
    }
    return snap;
  }

  async replaceAll(snapshot: Snapshot) {
    await this.serial(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM docs');
        for (const c of COLLECTIONS) for (const item of snapshot[c] as { id: ID }[]) await client.query('INSERT INTO docs (collection, id, data) VALUES ($1, $2, $3)', [c, item.id, JSON.stringify(item)]);
        await client.query('INSERT INTO docs (collection, id, data) VALUES ($1, $2, $3)', ['relationships', 'singleton', JSON.stringify(snapshot.relationships)]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    });
  }

  async applyPatch(patch: Patch) {
    await this.serial(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        for (const c of COLLECTIONS) {
          for (const item of (patch[c] ?? []) as { id: ID }[]) {
            await client.query('INSERT INTO docs (collection, id, data) VALUES ($1, $2, $3) ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()', [c, item.id, JSON.stringify(item)]);
          }
          const removed = patch.removed?.[c as keyof NonNullable<Patch['removed']>] ?? [];
          if (removed.length) await client.query('DELETE FROM docs WHERE collection = $1 AND id = ANY($2)', [c, removed]);
        }
        if (patch.relationships) await client.query('INSERT INTO docs (collection, id, data) VALUES ($1, $2, $3) ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()', ['relationships', 'singleton', JSON.stringify(patch.relationships)]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    });
  }

  async loadCatalog() {
    const { rows } = await this.pool.query<{ data: CatalogCourse }>('SELECT data FROM catalog_courses ORDER BY id');
    return rows.map((r) => r.data);
  }
  async replaceCatalog(schoolId: ID, courses: CatalogCourse[]) {
    await this.serial(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM catalog_courses WHERE school_id = $1 AND NOT (id = ANY($2))', [schoolId, courses.map((c) => c.id)]);
        for (const c of courses) await client.query('INSERT INTO catalog_courses (id, school_id, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, school_id = EXCLUDED.school_id, updated_at = now()', [c.id, c.schoolId, JSON.stringify(c)]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    });
  }
  async upsertCatalog(courses: CatalogCourse[]) {
    await this.serial(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        for (const c of courses) await client.query('INSERT INTO catalog_courses (id, school_id, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, school_id = EXCLUDED.school_id, updated_at = now()', [c.id, c.schoolId, JSON.stringify(c)]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    });
  }

  async findAccount(email: string) {
    const { rows } = await this.pool.query<{ email: string; user_id: string; created_at: Date }>('SELECT * FROM accounts WHERE email = $1', [email]);
    return rows[0] ? { email: rows[0].email, userId: rows[0].user_id, createdAt: rows[0].created_at.toISOString() } : null;
  }
  async createAccount(a: Account) { await this.pool.query('INSERT INTO accounts (email, user_id) VALUES ($1, $2)', [a.email, a.userId]); }
  async createSession(s: Session) { await this.pool.query('INSERT INTO sessions (token, user_id) VALUES ($1, $2)', [s.token, s.userId]); }
  async findSession(token: string) {
    const { rows } = await this.pool.query<{ token: string; user_id: string; created_at: Date }>('SELECT * FROM sessions WHERE token = $1', [token]);
    return rows[0] ? { token: rows[0].token, userId: rows[0].user_id, createdAt: rows[0].created_at.toISOString() } : null;
  }
  async deleteSession(token: string) { await this.pool.query('DELETE FROM sessions WHERE token = $1', [token]); }
  async deleteLogin(userId: ID) { await this.pool.query('DELETE FROM accounts WHERE user_id = $1', [userId]); await this.pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]); }
  async setCode(c: EmailCode) { await this.pool.query('INSERT INTO email_codes (email, code, expires_at) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at', [c.email, c.code, c.expiresAt]); }
  async takeCode(email: string) {
    const { rows } = await this.pool.query<{ email: string; code: string; expires_at: Date }>('DELETE FROM email_codes WHERE email = $1 RETURNING *', [email]);
    return rows[0] ? { email: rows[0].email, code: rows[0].code, expiresAt: rows[0].expires_at.toISOString() } : null;
  }
}

// ─── 로컬 파일 ───────────────────────────────────────────────────────────
interface FileData { snapshot: Snapshot | null; catalog: CatalogCourse[]; accounts: Account[]; sessions: Session[]; codes: EmailCode[] }

export class FileStore implements Store {
  private file: string;
  private data: FileData = { snapshot: null, catalog: [], accounts: [], sessions: [], codes: [] };
  private queue: Promise<unknown> = Promise.resolve();

  constructor(file?: string) {
    this.file = file ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '.data', 'db.json');
  }
  private flush() {
    const next = this.queue.then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(this.data));
    });
    this.queue = next.catch((e) => console.error('[store] write failed', e));
    return next;
  }
  async init() {
    try { this.data = JSON.parse(await fs.readFile(this.file, 'utf8')); } catch { /* fresh */ }
  }
  async loadSnapshot() { return this.data.snapshot; }
  async replaceAll(snapshot: Snapshot) { this.data.snapshot = structuredClone(snapshot); await this.flush(); }
  async applyPatch(patch: Patch) {
    const snap = this.data.snapshot ?? emptySnapshot();
    for (const c of COLLECTIONS) {
      const list = snap[c] as { id: ID }[];
      const byId = new Map(list.map((i) => [i.id, i]));
      for (const item of (patch[c] ?? []) as { id: ID }[]) byId.set(item.id, structuredClone(item));
      for (const id of patch.removed?.[c as keyof NonNullable<Patch['removed']>] ?? []) byId.delete(id);
      (snap[c] as unknown[]) = [...byId.values()];
    }
    if (patch.relationships) snap.relationships = structuredClone(patch.relationships);
    this.data.snapshot = snap;
    await this.flush();
  }
  async loadCatalog() { return this.data.catalog; }
  async replaceCatalog(schoolId: ID, courses: CatalogCourse[]) {
    const keep = new Set(courses.map((c) => c.id));
    this.data.catalog = [...this.data.catalog.filter((c) => c.schoolId !== schoolId || keep.has(c.id)), ...courses.filter((c) => !this.data.catalog.some((x) => x.id === c.id))].map((c) => courses.find((n) => n.id === c.id) ?? c);
    await this.flush();
  }
  async upsertCatalog(courses: CatalogCourse[]) {
    const byId = new Map(this.data.catalog.map((c) => [c.id, c]));
    courses.forEach((c) => byId.set(c.id, c));
    this.data.catalog = [...byId.values()];
    await this.flush();
  }
  async findAccount(email: string) { return this.data.accounts.find((a) => a.email === email) ?? null; }
  async createAccount(a: Account) { this.data.accounts.push(a); await this.flush(); }
  async createSession(s: Session) { this.data.sessions.push(s); await this.flush(); }
  async findSession(token: string) { return this.data.sessions.find((s) => s.token === token) ?? null; }
  async deleteSession(token: string) { this.data.sessions = this.data.sessions.filter((s) => s.token !== token); await this.flush(); }
  async deleteLogin(userId: ID) { this.data.accounts = this.data.accounts.filter((a) => a.userId !== userId); this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId); await this.flush(); }
  async setCode(c: EmailCode) { this.data.codes = [...this.data.codes.filter((x) => x.email !== c.email), c]; await this.flush(); }
  async takeCode(email: string) {
    const c = this.data.codes.find((x) => x.email === email) ?? null;
    this.data.codes = this.data.codes.filter((x) => x.email !== email);
    await this.flush();
    return c;
  }
}

export function emptySnapshot(): Snapshot {
  return {
    users: [], schools: [], organizations: [], activities: [], participations: [], posts: [],
    relationships: { likes: [], follows: [], friendRequests: [], friends: [], blocks: [] },
    proposals: [], chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [], timePolls: [], savedSearches: [], networkRequests: [], introRequests: [],
  };
}

export function createStore(): Store {
  const url = process.env.DATABASE_URL;
  if (url) { console.log('[store] postgres'); return new PgStore(url); }
  console.log('[store] local file (set DATABASE_URL for Postgres)');
  return new FileStore(process.env.DATA_FILE);
}
