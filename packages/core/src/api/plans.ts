/**
 * 링크로 묻는 약속 엔진 — Plan Together(TimePoll)를 그대로 쓰고 `poll.link` 만 더한다.
 * 공용 엔진(engine.ts)과 같은 방식: ctx.db 를 직접 바꾸고 바뀐 것만 Patch 로 돌려준다.
 *
 *   create          주최자가 만든다 (fixed: 시간 1개 / vote: 후보 2~6개 + 장소 후보 0~4개)
 *   respond         Lumi 사용자가 답한다 (RPC — 본인으로만)
 *   guestRespond    계정 없는 사람이 이름(첫 단어)으로 답한다 (공개 REST — 남용 제한은 server/plans.ts)
 *   lock            주최자가 시간(과 장소)을 확정 → 답한 Lumi 사용자에게 알림
 *   edit / close / removeResponse   주최자만
 *   view            공개 화면 모양 (@core/lib/plans 의 publicPlan)
 *   reminders       정해진 시간 1시간 전에 답한 Lumi 사용자에게 한 번 알림
 */
import type { Patch } from './types';
import type { ID, Notification, Place, PlanMode, PlanResponse, PlanRsvp, TimeOption, TimePoll } from '@core/types';
import type { EngineContext } from './engine';
import { uid } from '@core/lib/format';
import { lang } from '@core/i18n';
import {
  PLAN_LIMITS, acceptsResponses, cleanText, finalOption, findResponse, firstName, newGuestToken, newPlanId, planStatus, publicPlan,
  validOption, whenLabel, zonedToUtc, finalPlace, type PublicPlan,
} from '@core/lib/plans';

/** 만들기 입력 */
export interface PlanInput {
  title: string;
  emoji?: string;
  note?: string;
  mode: PlanMode;
  /** 장소 하나 (fixed, 또는 vote 에서 장소가 정해져 있을 때) */
  place?: Place;
  /** vote 모드의 장소 후보 이름들 (선택, 최대 4개) */
  placeOptions?: string[];
  /** fixed: 1개, vote: 2~6개 */
  options: Omit<TimeOption, 'id'>[];
}

/** 답 — fixed 는 rsvp, vote 는 optionIds(+ placeIds) */
export interface PlanAnswer { rsvp?: PlanRsvp; optionIds?: ID[]; placeIds?: ID[] }
export interface GuestAnswer extends PlanAnswer { name: string }

/** 주최자가 고칠 수 있는 것. options 의 id 가 있으면 그대로 두고, 없으면 새 후보 */
export interface PlanEdit { title?: string; emoji?: string; note?: string; options?: (Omit<TimeOption, 'id'> & { id?: ID })[]; placeOptions?: { id?: ID; name: string }[] }

/** 앱(AroundUApi)에서 쓰는 모양 */
export interface PlansApi {
  create(hostId: ID, input: PlanInput): Promise<{ poll: TimePoll; patch: Patch }>;
  respond(pollId: ID, userId: ID, answer: PlanAnswer): Promise<Patch>;
  lock(pollId: ID, optionId: ID, placeId?: ID): Promise<Patch>;
  edit(pollId: ID, changes: PlanEdit): Promise<Patch>;
  close(pollId: ID, closed: boolean): Promise<Patch>;
  removeResponse(pollId: ID, responseId: ID): Promise<Patch>;
  /** 공개 — 로그인 없이. guestToken 이 있으면 이 기기의 답을 me 로 */
  view(pollId: ID, guestToken?: string): Promise<PublicPlan | null>;
  /** 공개 — 계정 없이 답하기. 처음이면 새 토큰을 돌려준다 (이 기기에 저장) */
  guestRespond(pollId: ID, answer: GuestAnswer, guestToken?: string): Promise<{ token: string; plan: PublicPlan }>;
}

export interface PlansDeps {
  /** 손님 토큰 → 저장할 해시 (서버: sha256, 목업: 그대로) */
  hash(token: string): string;
}

const EMOJI_MAX = 8;

export function createPlansEngine(ctx: EngineContext, deps: PlansDeps) {
  const db = () => ctx.db;
  const now = () => new Date().toISOString();
  const en = lang === 'en';
  const err = (eng: string, ko: string) => new Error(en ? eng : ko);

  function notify(userId: ID, n: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): Notification {
    const nt: Notification = { id: uid('nt'), userId, read: false, createdAt: now(), ...n };
    db().notifications.unshift(nt);
    return nt;
  }
  /** 링크 약속만 */
  function plan(pollId: ID): TimePoll & { link: NonNullable<TimePoll['link']> } {
    const p = db().timePolls.find((x) => x.id === pollId);
    if (!p?.link) throw err('This plan doesn’t exist anymore.', '약속을 찾을 수 없어요.');
    return p as TimePoll & { link: NonNullable<TimePoll['link']> };
  }
  const users = () => db().users;

  function cleanOptions(mode: PlanMode, raw: unknown): Omit<TimeOption, 'id'>[] {
    const list = (Array.isArray(raw) ? raw : []).filter(validOption).map((o) => ({ date: o.date, startTime: o.startTime, endTime: o.endTime }));
    const uniq = [...new Map(list.map((o) => [`${o.date}_${o.startTime}_${o.endTime}`, o])).values()].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    if (mode === 'fixed' && uniq.length !== 1) throw err('Pick one time.', '시간을 하나 골라주세요.');
    if (mode === 'vote' && uniq.length < PLAN_LIMITS.minVoteOptions) throw err('Add at least 2 times to pick from.', '후보 시간을 2개 이상 넣어주세요.');
    if (uniq.length > PLAN_LIMITS.maxOptions) throw err(`Up to ${PLAN_LIMITS.maxOptions} times.`, `후보 시간은 ${PLAN_LIMITS.maxOptions}개까지예요.`);
    return uniq;
  }
  const cleanPlaces = (raw: unknown) => [...new Set((Array.isArray(raw) ? raw : []).map((s) => cleanText(typeof s === 'string' ? s : (s as { name?: string })?.name, PLAN_LIMITS.placeMax)).filter(Boolean))].slice(0, PLAN_LIMITS.maxPlaces);

  /** 답을 검사해 정리 — 이 약속에 없는 후보는 버린다 */
  function cleanAnswer(p: TimePoll & { link: NonNullable<TimePoll['link']> }, a: PlanAnswer): Pick<PlanResponse, 'rsvp' | 'optionIds' | 'placeIds'> {
    if (p.link.mode === 'fixed') {
      if (a?.rsvp !== 'going' && a?.rsvp !== 'maybe' && a?.rsvp !== 'no') throw err('Pick Going, Maybe or Can’t.', '갈게요 / 아마도 / 못 가요 중에 골라주세요.');
      return { rsvp: a.rsvp };
    }
    const optionIds = [...new Set((Array.isArray(a?.optionIds) ? a.optionIds : []).filter((id) => p.options.some((o) => o.id === id)))];
    const placeIds = [...new Set((Array.isArray(a?.placeIds) ? a.placeIds : []).filter((id) => p.link.placeOptions?.some((o) => o.id === id)))];
    return { optionIds, placeIds };
  }
  function ensureOpen(p: TimePoll) {
    const s = planStatus(p);
    if (s === 'open') return;
    throw s === 'locked' ? err('The time is already set.', '이미 시간이 정해졌어요.')
      : s === 'past' ? err('This plan already happened.', '이미 지난 약속이에요.')
        : s === 'cancelled' ? err('This plan was cancelled.', '취소된 약속이에요.')
          : err('The host closed responses.', '주최자가 답 받기를 닫았어요.');
  }

  return {
    create(hostId: ID, input: PlanInput): { poll: TimePoll; patch: Patch } {
      if (!users().some((u) => u.id === hostId)) throw err('Sign in first.', '로그인이 필요해요.');
      const mode: PlanMode = input?.mode === 'fixed' ? 'fixed' : 'vote';
      const title = cleanText(input?.title, PLAN_LIMITS.titleMax);
      if (title.length < 2) throw err('Give the plan a name.', '약속 이름을 적어주세요.');
      const options = cleanOptions(mode, input?.options).map((o) => ({ ...o, id: uid('to') }));
      const placeName = cleanText(input?.place?.name, PLAN_LIMITS.placeMax);
      const place: Place | undefined = placeName ? { name: placeName, lat: Number(input.place?.lat) || 0, lng: Number(input.place?.lng) || 0 } : undefined;
      const placeOptions = mode === 'vote' && !place ? cleanPlaces(input?.placeOptions).map((name) => ({ id: uid('pl'), name })) : [];
      const createdAt = now();
      const last = options[options.length - 1];
      const poll: TimePoll = {
        id: newPlanId(), hostId, title, category: 'etc', place, inviteeIds: [], options, votes: {},
        status: 'open', closesAt: zonedToUtc(last.date, last.endTime).toISOString(), createdAt,
        link: {
          mode, emoji: cleanText(input?.emoji, EMOJI_MAX) || (mode === 'fixed' ? '📍' : '🗓️'), note: cleanText(input?.note, PLAN_LIMITS.noteMax, true) || undefined,
          placeOptions: placeOptions.length ? placeOptions : undefined,
          // 주최자도 답한 사람 — fixed 는 '갈게요', vote 는 모든 후보가 된다고 시작 (나중에 바꿀 수 있다)
          responses: [{ id: uid('pr'), name: '', userId: hostId, ...(mode === 'fixed' ? { rsvp: 'going' as const } : { optionIds: options.map((o) => o.id), placeIds: [] }), createdAt, updatedAt: createdAt }],
        },
      };
      db().timePolls.unshift(poll);
      return { poll, patch: { timePolls: [poll] } };
    },

    respond(pollId: ID, userId: ID, answer: PlanAnswer): Patch {
      const p = plan(pollId);
      if (!users().some((u) => u.id === userId)) throw err('Sign in first.', '로그인이 필요해요.');
      ensureOpen(p);
      const clean = cleanAnswer(p, answer);
      const mine = p.link.responses.find((r) => r.userId === userId);
      if (mine) Object.assign(mine, clean, { updatedAt: now() });
      else {
        if (p.link.responses.length >= PLAN_LIMITS.maxResponses) throw err('This plan has all the answers it can take.', '답을 더 받을 수 없어요.');
        p.link.responses.push({ id: uid('pr'), name: '', userId, ...clean, createdAt: now(), updatedAt: now() });
      }
      return { timePolls: [p] };
    },

    /** 계정 없이 답하기. 토큰이 이 약속의 답과 맞으면 그 답을 고치고, 아니면 새 답 + 새 토큰 */
    guestRespond(pollId: ID, answer: GuestAnswer, token?: string): { token: string; poll: TimePoll; responseId: ID; created: boolean; patch: Patch } {
      const p = plan(pollId);
      ensureOpen(p);
      const name = firstName(answer?.name);
      if (!name) throw err('Type your first name.', '이름을 적어주세요.');
      const clean = cleanAnswer(p, answer);
      const known = typeof token === 'string' && token.length >= 16 && token.length <= 128 ? p.link.responses.find((r) => !r.userId && r.tokenHash === deps.hash(token)) : undefined;
      if (known) {
        Object.assign(known, clean, { name, updatedAt: now() });
        return { token: token!, poll: p, responseId: known.id, created: false, patch: { timePolls: [p] } };
      }
      if (p.link.responses.length >= PLAN_LIMITS.maxResponses) throw err('This plan has all the answers it can take.', '답을 더 받을 수 없어요.');
      const fresh = newGuestToken();
      const r: PlanResponse = { id: uid('pr'), name, tokenHash: deps.hash(fresh), ...clean, createdAt: now(), updatedAt: now() };
      p.link.responses.push(r);
      return { token: fresh, poll: p, responseId: r.id, created: true, patch: { timePolls: [p] } };
    },

    lock(pollId: ID, optionId: ID, placeId?: ID): Patch {
      const p = plan(pollId);
      if (p.link.mode !== 'vote') throw err('This plan already has a set time.', '이미 시간이 정해진 약속이에요.');
      const s = planStatus(p);
      if (s === 'cancelled' || s === 'past') throw err('This plan is over.', '끝난 약속이에요.');
      const opt = p.options.find((o) => o.id === optionId);
      if (!opt) throw err('Pick one of the times.', '후보 시간 중에 골라주세요.');
      if (placeId && !p.link.placeOptions?.some((x) => x.id === placeId)) throw err('Pick one of the places.', '장소 후보 중에 골라주세요.');
      const relock = p.status === 'decided';
      p.status = 'decided'; p.decidedOptionId = optionId; p.link.decidedPlaceId = placeId ?? p.link.decidedPlaceId; p.link.lockedAt = now();
      delete p.link.remindedAt; // 시간이 바뀌면 다시 알린다
      const host = users().find((u) => u.id === p.hostId);
      const place = finalPlace(p);
      const when = whenLabel(opt, en);
      const nts = p.link.responses.filter((r) => r.userId && r.userId !== p.hostId).map((r) => notify(r.userId!, {
        type: 'plan_decided',
        title: en ? `${relock ? 'Time changed' : 'It’s set'}: ${p.title}` : `${relock ? '시간이 바뀌었어요' : '시간이 정해졌어요'}: ${p.title}`,
        body: `${when}${place ? ` · ${place}` : ''}${host ? (en ? ` — from ${firstName(host.nickname)}` : ` — ${firstName(host.nickname)}`) : ''}`,
        link: `/p/${p.id}`,
      }));
      return { timePolls: [p], notifications: nts };
    },

    edit(pollId: ID, changes: PlanEdit): Patch {
      const p = plan(pollId);
      const s = planStatus(p);
      if (s === 'cancelled' || s === 'past') throw err('This plan is over.', '끝난 약속이에요.');
      if (changes?.title !== undefined) { const title = cleanText(changes.title, PLAN_LIMITS.titleMax); if (title.length < 2) throw err('Give the plan a name.', '약속 이름을 적어주세요.'); p.title = title; }
      if (changes?.emoji !== undefined) p.link.emoji = cleanText(changes.emoji, EMOJI_MAX) || p.link.emoji;
      if (changes?.note !== undefined) p.link.note = cleanText(changes.note, PLAN_LIMITS.noteMax, true) || undefined;
      if (changes?.options) {
        if (s === 'locked') throw err('Unlock isn’t possible — the time is already set.', '이미 시간이 정해져 후보를 바꿀 수 없어요.');
        const kept = cleanOptions(p.link.mode, changes.options);
        const raw = changes.options;
        const next: TimeOption[] = kept.map((o) => {
          const asked = raw.find((x) => x.date === o.date && x.startTime === o.startTime && x.endTime === o.endTime);
          const old = asked?.id ? p.options.find((x) => x.id === asked.id) : undefined;
          // 같은 후보(id)의 시간이 바뀌면 새 후보로 — 예전 시간에 낸 표가 새 시간 표로 둔갑하지 않게
          const same = old && old.date === o.date && old.startTime === o.startTime && old.endTime === o.endTime;
          return same ? old : { ...o, id: uid('to') };
        });
        const ids = new Set(next.map((o) => o.id));
        if (p.link.mode === 'fixed' && p.options[0]?.id !== next[0].id) {
          // 시간이 바뀌었다 — 답은 남기되 다시 알릴 수 있게
          delete p.link.remindedAt;
        }
        p.options = next;
        for (const r of p.link.responses) if (r.optionIds) r.optionIds = r.optionIds.filter((id) => ids.has(id));
        const last = next[next.length - 1];
        p.closesAt = zonedToUtc(last.date, last.endTime).toISOString();
      }
      if (changes?.placeOptions && p.link.mode === 'vote' && !p.place) {
        if (s === 'locked') throw err('The plan is already set.', '이미 정해진 약속이에요.');
        const names = cleanPlaces(changes.placeOptions);
        const next = names.map((name) => ({ id: changes.placeOptions!.find((x) => cleanText(x.name, PLAN_LIMITS.placeMax) === name)?.id ?? uid('pl'), name }))
          .map((x) => (p.link.placeOptions?.some((o) => o.id === x.id) ? x : { ...x, id: uid('pl') }));
        const ids = new Set(next.map((x) => x.id));
        p.link.placeOptions = next.length ? next : undefined;
        for (const r of p.link.responses) if (r.placeIds) r.placeIds = r.placeIds.filter((id) => ids.has(id));
      }
      return { timePolls: [p] };
    },

    close(pollId: ID, closed: boolean): Patch {
      const p = plan(pollId);
      p.link.closed = !!closed || undefined;
      return { timePolls: [p] };
    },

    removeResponse(pollId: ID, responseId: ID): Patch {
      const p = plan(pollId);
      const r = p.link.responses.find((x) => x.id === responseId);
      if (!r) throw err('That answer is already gone.', '이미 지워진 답이에요.');
      if (r.userId === p.hostId) throw err('You can change your own answer instead.', '내 답은 지우는 대신 바꿀 수 있어요.');
      p.link.responses = p.link.responses.filter((x) => x.id !== responseId);
      return { timePolls: [p] };
    },

    view(pollId: ID, viewer: { userId?: ID; token?: string } = {}): PublicPlan | null {
      const p = db().timePolls.find((x) => x.id === pollId);
      if (!p?.link) return null;
      const tokenHash = viewer.token && viewer.token.length <= 128 ? deps.hash(viewer.token) : undefined;
      return publicPlan(p, users(), { userId: viewer.userId, tokenHash });
    },

    /** 이 손님 토큰이 이 약속의 답과 맞는지 */
    knows(pollId: ID, token: string): boolean {
      const p = db().timePolls.find((x) => x.id === pollId);
      return !!p?.link && !!findResponse(p, { tokenHash: deps.hash(token) });
    },

    /** 정해진 시간 1시간(withinMs) 전 — 답한 Lumi 사용자(못 간다고 한 사람 빼고)와 주최자에게 한 번 */
    reminders(at = new Date(), withinMs = 60 * 60 * 1000): Patch {
      const polls: TimePoll[] = []; const nts: Notification[] = [];
      for (const p of db().timePolls) {
        if (!p.link || p.link.remindedAt || p.status === 'cancelled') continue;
        const f = finalOption(p); if (!f) continue;
        const start = zonedToUtc(f.date, f.startTime).getTime();
        if (start <= at.getTime() || start - at.getTime() > withinMs) continue;
        p.link.remindedAt = at.toISOString();
        polls.push(p);
        const place = finalPlace(p);
        const who = p.link.responses.filter((r) => r.userId && r.rsvp !== 'no');
        for (const r of who) nts.push(notify(r.userId!, {
          type: 'activity_reminder',
          title: en ? `Soon: ${p.title}` : `곧 시작: ${p.title}`,
          body: `${whenLabel(f, en)}${place ? ` · ${place}` : ''}`,
          link: `/p/${p.id}`,
        }));
      }
      return polls.length ? { timePolls: polls, notifications: nts } : {};
    },

    /** acceptsResponses 를 밖에서도 */
    accepts(pollId: ID): boolean { const p = db().timePolls.find((x) => x.id === pollId); return !!p?.link && acceptsResponses(p); },
  };
}

export type PlansEngine = ReturnType<typeof createPlansEngine>;
