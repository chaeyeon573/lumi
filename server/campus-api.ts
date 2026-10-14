/**
 * 웹 서버 쪽 학사 일정 · 좌석 알림.
 *
 *   POST /api/academic/dates   { schoolId }        → 그 학교 학사 일정 (지난 30일 ~)
 *   POST /api/seats/mine                           → 내 관심 수업 + 최근 좌석 수
 *   POST /api/seats/watch      { courseId }        → 걸기 (수업은 카탈로그에서 찾는다 — 클라이언트가 보낸 주소는 믿지 않는다)
 *   POST /api/seats/unwatch    { id }              → 풀기
 *
 * 일정·좌석 수는 워커가 쓴다 (store docs: academicDates · seatStatus). 웹 서버는 켜질 때 읽고 동기화 때마다(DATA_SYNC_SECONDS) 다시 읽는다.
 * 관심 수업(seatWatches)은 웹 서버만 쓴다. 처음 걸린 수업은 바로 한 번 읽어 와 화면에 지금 좌석 수를 보여 준다 (그 뒤로는 워커).
 * 워커가 만든 좌석 알림(n_seat_*)은 mergeWorkerNotifications 가 메모리 스냅샷에 넣고 접속 중인 사람에게 보낸다.
 */
import type { Express, Request, Response, NextFunction } from 'express';
import type { Patch, Snapshot, CatalogCourse } from '@core/api/types';
import type { ID, User } from '@core/types';
import type { AcademicDate } from '@core/lib/academic';
import { addDays, campusDate } from '@core/lib/academic';
import { seatSourceOk, type SeatWatchView } from '@core/lib/seats';
import type { Store } from './store';
import { DATES, STATUS, WATCHES, applySnapshot, fetchSeatPage, makeStatus, parseSeatPage, pollIntervalMin, seatView, statusId, watchId, type SeatStatusDoc, type SeatWatchDoc } from './seats';

type Handler = (req: Request & { userId?: ID }, res: Response) => Promise<unknown> | unknown;
export interface CampusDeps {
  auth: (req: Request, res: Response, next: NextFunction) => unknown;
  wrap: (fn: Handler) => (req: Request, res: Response, next: NextFunction) => unknown;
  requireUser: (req: Request & { userId?: ID }) => ID;
  bad: (msg: string, status?: number) => Error;
  user: (id: ID) => User | undefined;
  /** 이 학교 카탈로그 (학기 전부) */
  catalog: (schoolId: ID) => CatalogCourse[];
}

const MAX_WATCHES = 25;
const schoolOfUser = (u?: User) => (u?.affiliation.type === 'university' ? u.affiliation.schoolId ?? '' : '');

export function createCampusData(store: Store) {
  let dates: AcademicDate[] = [];
  let watches: SeatWatchDoc[] = [];
  let statuses = new Map<string, SeatStatusDoc>();
  let datesVersion = '';
  // 웹 서버가 직접 읽는 수업 페이지 — 한 번에 하나, 1.1초 간격 (워커와 별도로 아주 드물게: 처음 걸린 수업만)
  let chain: Promise<unknown> = Promise.resolve();
  let lastFetch = 0;
  const politeFetch = (url: string) => {
    const next = chain.then(async () => {
      const wait = lastFetch + 1100 - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastFetch = Date.now();
      return fetchSeatPage(url);
    });
    chain = next.catch(() => {});
    return next;
  };
  const perUser = new Map<ID, number[]>();
  const allowFetch = (userId: ID) => {
    const now = Date.now(); const xs = (perUser.get(userId) ?? []).filter((t) => now - t < 3_600_000);
    if (xs.length >= 20) return false;
    xs.push(now); perUser.set(userId, xs); return true;
  };

  const svc = {
    async load() {
      [dates, watches] = await Promise.all([store.listDocs<AcademicDate>(DATES), store.listDocs<SeatWatchDoc>(WATCHES)]);
      statuses = new Map((await store.listDocs<SeatStatusDoc>(STATUS)).map((s) => [s.id, s]));
      datesVersion = JSON.stringify(dates.map((d) => [d.id, d.start, d.end, d.title]));
      console.log(`[campus] ${dates.length} academic dates, ${watches.length} seat watches`);
    },
    /** 워커가 쓴 일정·좌석 수를 다시 읽는다 */
    async refresh() {
      const [d, s] = await Promise.all([store.listDocs<AcademicDate>(DATES), store.listDocs<SeatStatusDoc>(STATUS)]);
      const v = JSON.stringify(d.map((x) => [x.id, x.start, x.end, x.title]));
      if (v !== datesVersion) { dates = d; datesVersion = v; console.log(`[sync] academic dates ${d.length}`); }
      statuses = new Map(s.map((x) => [x.id, x]));
    },
    dates: (schoolId?: ID) => (schoolId ? dates.filter((d) => d.schoolId === schoolId) : dates),
    view(userId: ID, catalog: (s: ID) => CatalogCourse[], user?: User): SeatWatchView {
      const sid = schoolOfUser(user);
      const terms = [...new Set(catalog(sid).filter((c) => seatSourceOk(c.url)).map((c) => c.term))];
      return seatView(userId, sid, watches, statuses, dates, terms, campusDate());
    },
    async watch(user: User, course: CatalogCourse) {
      const w: SeatWatchDoc = { id: watchId(user.id, course.url!), userId: user.id, schoolId: course.schoolId, courseId: course.id, code: course.code, title: course.title, term: course.term, url: course.url!, createdAt: new Date().toISOString() };
      if (!watches.some((x) => x.id === w.id)) { watches = [...watches, w]; await store.putDocs(WATCHES, [w]); }
      // 처음 걸린 수업이면 지금 좌석 수를 한 번 읽어 온다 (실패해도 걸기는 된다 — 워커가 곧 본다).
      // 캐시에 없는 수업 페이지는 30초쯤 걸리므로 8초만 기다리고, 나머지는 뒤에서 끝낸다 (화면이 잠시 뒤 다시 묻는다)
      if (!statuses.has(statusId(w.url)) && allowFetch(user.id)) {
        const job = politeFetch(w.url).then(async (html) => {
          const parsed = parseSeatPage(html);
          if (!parsed || statuses.has(statusId(w.url))) return;
          const st = makeStatus(w); applySnapshot(st, parsed.seats);
          statuses.set(st.id, st); await store.putDocs(STATUS, [st]);
        }).catch((e) => console.warn('[seats] first check failed', w.url, (e as Error).message));
        await Promise.race([job, new Promise((r) => setTimeout(r, 8000))]);
      }
    },
    async unwatch(userId: ID, id: string) {
      const w = watches.find((x) => x.id === id && x.userId === userId);
      if (!w) return false;
      watches = watches.filter((x) => x.id !== id);
      await store.removeDocs(WATCHES, [id]);
      return true;
    },
    myWatchCount: (userId: ID) => watches.filter((w) => w.userId === userId).length,
    /** 계정 삭제 — 이 사람의 관심 수업과 좌석 알림 기록(누구에게 언제 알렸는지)을 지운다 */
    async forgetUser(userId: ID) {
      const mine = watches.filter((w) => w.userId === userId).map((w) => w.id);
      watches = watches.filter((w) => w.userId !== userId);
      await store.removeDocs(WATCHES, mine);
      // 워커가 쓴 기록도 다시 읽어서 지운다 (메모리 사본이 오래됐을 수 있다)
      const stored = await store.listDocs<SeatStatusDoc>(STATUS);
      const touched = stored.filter((st) => st.notified && userId in st.notified).map((st) => { const { [userId]: _n, ...rest } = st.notified; return { ...st, notified: rest }; });
      touched.forEach((st) => statuses.set(st.id, st));
      await store.putDocs(STATUS, touched);
      return { seatWatches: mine.length };
    },
  };
  return svc;
}
export type CampusData = ReturnType<typeof createCampusData>;

export function mountCampusRoutes(app: Express, data: CampusData, d: CampusDeps) {
  app.post('/api/academic/dates', d.wrap(async (req) => {
    const schoolId = String(req.body?.schoolId ?? '');
    const from = addDays(campusDate(), -30);
    return { dates: data.dates(schoolId).filter((x) => x.end >= from) };
  }));
  app.post('/api/seats/mine', d.auth, d.wrap(async (req) => { const me = d.requireUser(req); return data.view(me, d.catalog, d.user(me)); }));
  app.post('/api/seats/watch', d.auth, d.wrap(async (req) => {
    const me = d.requireUser(req); const user = d.user(me)!;
    const sid = schoolOfUser(user);
    const courseId = String(req.body?.courseId ?? '');
    const course = d.catalog(sid).find((c) => c.id === courseId);
    if (!course) throw d.bad('That class isn’t in your school’s class list.', 404);
    if (!seatSourceOk(course.url)) throw d.bad('Seat alerts aren’t available for this class yet.', 400);
    if (pollIntervalMin(data.dates(sid), sid, course.term, campusDate()) === null) throw d.bad(`The add deadline for ${course.term} has passed — seat alerts are closed for this term.`, 400);
    if (data.myWatchCount(me) >= MAX_WATCHES) throw d.bad(`You can watch up to ${MAX_WATCHES} classes. Unwatch one first.`, 400);
    await data.watch(user, course);
    return data.view(me, d.catalog, user);
  }));
  app.post('/api/seats/unwatch', d.auth, d.wrap(async (req) => {
    const me = d.requireUser(req);
    await data.unwatch(me, String(req.body?.id ?? ''));
    return data.view(me, d.catalog, d.user(me));
  }));
}

/** 워커가 store 에 쓴 좌석 알림을 메모리 스냅샷에 넣는다 — 새로 들어온 것만 Patch 로 */
export function mergeWorkerNotifications(db: Snapshot, stored: Snapshot['notifications']): Patch | null {
  const have = new Set(db.notifications.map((n) => n.id));
  const fresh = stored.filter((n) => n.id.startsWith('n_seat_') && !have.has(n.id));
  if (!fresh.length) return null;
  db.notifications.push(...fresh);
  return { notifications: fresh };
}
