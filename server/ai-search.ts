/**
 * AI 도우미가 쓰는 검색 — 우리 데이터(공고·행사·동아리·수업·활동)에서만 찾는다.
 * 결과의 id 만 화면 카드로 붙일 수 있게 해서, 모델이 지어낸 공고·마감일이 카드로 나가지 않게 한다.
 */
import type { Snapshot, CatalogCourse, AiCard } from '@core/api/types';
import type { Opportunity, Organization, OpportunityType, User } from '@core/types';
import { searchCatalog, resolveCatalogTerm, catalogTerms, courseTerm } from '@core/data/catalog/courses';
import { canViewActivity, placeLabel } from '@core/lib/relations';
import { forYou, type RecType, type Topic } from '@core/lib/foryou';
import { campusDate, inCategory, isOfType, locationOf, regionsOf, type Region } from '@core/lib/listings';

/** 모델에게는 캠퍼스 날짜(YYYY-MM-DD)로 준다 — UTC 시각(…T07:59Z)을 주면 앞 10자리를 읽어 하루 늦게 말한다 */
const day = (iso?: string) => (iso ? campusDate(iso) : undefined);

export type Card = AiCard;

const STOP = new Set('a an the and or of for to in on at near by with about any some me my i is are was be this that what which who when where how there do does can find show list give get want looking campus today tonight tomorrow week weekend this next free'.split(' '));
const words = (q: string) => q.toLowerCase().replace(/[^a-z0-9#+&\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
const clip = (s: string, n: number) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** 단어가 필드에 몇 번 걸리는지 — 제목은 가중치를 높게 */
function score(q: string[], fields: [string | undefined, number][]) {
  if (!q.length) return 1;
  let s = 0;
  for (const w of q) for (const [f, weight] of fields) if (f && f.toLowerCase().includes(w)) s += weight;
  return s;
}

export const schoolOf = (u: User) => (u.affiliation.type === 'university' ? u.affiliation.schoolId ?? '' : '');

/** 공고·행사 (장학금·인턴·연구·해커톤·교환·행사). 지난 것은 뺀다 */
export function searchListings(db: Snapshot, viewer: User, today: string, input: { query?: string; types?: OpportunityType[]; free_food?: boolean; from?: string; to?: string; region?: Region; limit?: number }) {
  const school = schoolOf(viewer);
  const q = words(input.query ?? '');
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 15);
  const when = (o: Opportunity) => o.date ?? o.deadline ?? '';
  const rows = db.opportunities
    .filter((o) => !o.schoolId || o.schoolId === school)
    // 분류는 categoriesOf 기준 — 연구 장학금은 lab 검색에도, 연구비 지원은 scholarship 검색에도 나온다 (캠퍼스 › 찾기 칩과 같은 분류)
    .filter((o) => !input.types?.length || input.types.some((t) => isOfType(o, t)))
    .filter((o) => !input.free_food || inCategory(o, 'free_food'))
    // 날짜는 캠퍼스 날짜(YYYY-MM-DD)로 비교한다 — 시각이 붙은 ISO('2026-10-15T22:00Z')를 그대로 'to: 2026-10-15'와 견주면 그날 행사가 다 빠졌다 ('오늘 공짜 음식' → 없음)
    .filter((o) => { const d = day(o.deadline ?? when(o)); return !d || d >= today; }) // 시작한 해커톤도 제출 마감 전이면
    .filter((o) => { const d = day(o.date ?? o.deadline); if (!d) return !input.from && !input.to; return (!input.from || d >= input.from) && (!input.to || d <= input.to); })
    .filter((o) => !input.region || regionsOf(o).includes(input.region) || (!!o.schoolId && input.region === 'Bay Area'))
    .map((o) => ({ o, s: score(q, [[o.title, 5], [o.host, 3], [o.tags.join(' '), 3], [o.field, 3], [locationOf(o), 2], [o.eligibility, 1], [o.description, 1], [o.benefit, 2]]) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || when(a.o).localeCompare(when(b.o)) || a.o.title.localeCompare(b.o.title))
    .slice(0, limit);
  return rows.map(({ o }) => ({
    card: { kind: 'listing', id: o.id, type: o.type, title: o.title, host: o.host, date: o.date, startTime: o.startTime, deadline: o.deadline, place: o.place?.name, benefit: o.benefit, url: o.sourceUrl } satisfies Card,
    forModel: { id: o.id, type: o.type, title: o.title, host: o.host, date: day(o.date), start_time: o.startTime, deadline: day(o.deadline), place: o.place?.name, location: locationOf(o) || undefined, field: o.field, benefit: o.benefit, tags: o.tags.slice(0, 6), eligibility: clip(o.eligibility, 120), about: clip(o.description, 260), link: o.sourceUrl },
  }));
}

/** 내 학교 동아리·Greek·연구실·학생회 */
export function searchClubs(db: Snapshot, viewer: User, input: { query?: string; types?: Organization['type'][]; recruiting_only?: boolean; limit?: number }) {
  const school = schoolOf(viewer);
  const q = words(input.query ?? '');
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 15);
  const rows = db.organizations
    .filter((o) => o.schoolId === school)
    .filter((o) => !input.types?.length || input.types.includes(o.type))
    .filter((o) => !input.recruiting_only || o.recruitment?.open)
    .map((o) => ({ o, s: score(q, [[o.name, 6], [o.parent, 2], [o.description, 2], [o.regularActivities.join(' '), 1]]) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || Number(!!b.o.recruitment?.open) - Number(!!a.o.recruitment?.open) || a.o.name.localeCompare(b.o.name))
    .slice(0, limit);
  return rows.map(({ o }) => {
    const url = o.links?.[0]?.url;
    return {
      card: { kind: 'club', id: o.id, name: o.name, type: o.type, recruiting: !!o.recruitment?.open, summary: clip(o.description, 140), url } satisfies Card,
      forModel: { id: o.id, name: o.name, type: o.type, recruiting: !!o.recruitment?.open, about: clip(o.description, 260), dues: o.dues, join: o.joinProcess && clip(o.joinProcess, 160), policy: o.policyNote && clip(o.policyNote, 160), link: url },
    };
  });
}

const meetingText = (c: CatalogCourse) => c.meetings.length ? c.meetings.map((m) => `${DAYS[m.day] ?? '?'} ${m.start}-${m.end}`).join(', ') : 'Time TBA';

/**
 * 이번 학기 수업 (시간·강의실·교수·과목 링크). term 을 안 주면 지금 학기 — 어느 학기를 찾았는지(term)와
 * 그 학교에 있는 학기들(terms)을 같이 돌려줘 Lumi 가 "Fall 2026 기준"이라고 말할 수 있게 한다.
 */
export function searchCourses(catalog: CatalogCourse[], viewer: User, input: { query: string; limit?: number; term?: string }, now: Date = new Date()) {
  const limit = Math.min(Math.max(input.limit ?? 6, 1), 12);
  const school = schoolOf(viewer);
  const terms = catalogTerms(catalog, school);
  // 모르는 학기를 달라고 하면 (아직 안 올라온 학기 등) 지금 학기로 찾는다 — terms 를 보고 Lumi 가 설명한다
  const asked = input.term && terms.includes(input.term) ? input.term : '';
  const term = resolveCatalogTerm(catalog, school, asked, now);
  const rows = searchCatalog(catalog, school, input.query, limit, '', term).map((c) => ({
    card: { kind: 'course', id: c.id, code: c.code, title: c.title, instructor: c.instructor, location: c.location, when: meetingText(c), term: courseTerm(c), url: c.url, syllabusUrl: c.syllabusUrl } satisfies Card,
    forModel: { id: c.id, code: c.code, title: c.title, instructor: c.instructor, location: c.location, meets: meetingText(c), term: courseTerm(c), units: c.units, link: c.url, syllabus: c.syllabusUrl },
  }));
  return { term, terms, requestedTermMissing: !!input.term && !asked, rows };
}

/** 학생들이 만든 활동 (스터디 크루·밥·커피 모임) — 볼 권한이 있는 것만, 장소는 공개 범위대로 */
export function searchActivities(db: Snapshot, viewer: User, today: string, input: { query?: string; limit?: number }) {
  const q = words(input.query ?? '');
  const limit = Math.min(Math.max(input.limit ?? 6, 1), 12);
  const rows = db.activities
    .filter((a) => a.date >= today && canViewActivity(db, viewer, a))
    .map((a) => ({ a, s: score(q, [[a.title, 5], [a.description, 2], [a.category, 2], [(a.visibilityTargets ?? []).join(' '), 3]]) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || x.a.date.localeCompare(y.a.date))
    .slice(0, limit);
  return rows.map(({ a }) => {
    const place = placeLabel(a, viewer, false).name;
    return {
      card: { kind: 'activity', id: a.id, title: a.title, date: a.date, startTime: a.startTime, place, category: a.category, ...(a.sample ? { sample: true } : {}) } satisfies Card,
      // 예시 활동이면 모델에게도 알려 실제 모임처럼 말하지 않게 한다
      forModel: { id: a.id, title: a.title, category: a.category, date: a.date, start_time: a.startTime, place, about: clip(a.description, 200), ...(a.sample ? { sample_listing: true } : {}) },
    };
  });
}

/** 이 학생에게 맞는 추천 — 화면의 For you 순서와 같은 엔진(lib/foryou). 이유도 엔진이 낸 것만 쓴다 */
export function recommendFor(db: Snapshot, viewer: User, input: { types?: RecType[]; topic?: Topic; interest?: string; region?: Region; limit?: number }) {
  const limit = Math.min(Math.max(input.limit ?? 6, 1), 10);
  // 종류를 안 정했으면 종류마다 2개씩 — 한 종류(동아리·세미나)가 자리를 다 차지해서 REU 같은 답을 놓치지 않게
  const KINDS: RecType[] = ['lab', 'internship', 'hackathon', 'scholarship', 'club', 'event'];
  const recs = input.types?.length
    ? forYou(db, viewer, { types: input.types, topic: input.topic, query: input.interest, region: input.region, limit })
    : KINDS.flatMap((k) => forYou(db, viewer, { types: [k], topic: input.topic, query: input.interest, region: input.region, limit: 2 }))
      .filter((r, i, xs) => xs.findIndex((x) => x.id === r.id) === i); // 한 공고가 두 종류에 들 수 있다 (연구 장학금 = 연구 + 장학금)
  return recs.map((r) => {
    const why = r.reasons.slice(0, 3).map((x) => x.text);
    if (r.kind === 'club') {
      const o = r.item; const url = o.links?.[0]?.url;
      return {
        card: { kind: 'club', id: o.id, name: o.name, type: o.type, recruiting: !!o.recruitment?.open, summary: clip(o.description, 140), url } satisfies Card,
        forModel: { id: o.id, kind: 'club', name: o.name, type: o.type, recruiting: !!o.recruitment?.open, about: clip(o.description, 200), why_it_fits: why, link: url },
      };
    }
    const o = r.item;
    return {
      card: { kind: 'listing', id: o.id, type: o.type, title: o.title, host: o.host, date: o.date, startTime: o.startTime, deadline: o.deadline, place: o.place?.name, benefit: o.benefit, url: o.sourceUrl } satisfies Card,
      forModel: { id: o.id, kind: 'listing', type: o.type, title: o.title, host: o.host, date: day(o.date), deadline: day(o.deadline), location: o.location, benefit: o.benefit, why_it_fits: why, link: o.sourceUrl },
    };
  });
}
