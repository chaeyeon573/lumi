/**
 * 같은 수업 (classmates) 엔진 — 스터디 그룹 제안·답하기, 프로젝트 파트너 목록.
 * 공용 엔진(engine.ts)과 같은 방식: ctx.db 를 직접 바꾸고 바뀐 것만 Patch 로 돌려준다.
 * 같은 수업 학생 목록 자체는 저장하지 않는다 — 보는 사람마다 server/view.ts 가 lib/classmates 로 계산한다.
 */
import type { CatalogCourse, ClassRoomInfo, Patch } from './types';
import type { Activity, ChatRoom, ID, Notification, Participation, StudyGroupResponse } from '@core/types';
import type { EngineContext } from './engine';
import { uid } from '@core/lib/format';
import { DAY_LABELS, toMin } from '@core/lib/timetable';
import { termOrder } from '@core/lib/terms';
import { campusDateOf, classRoomInfo, enrollments, nowTermLabel, planStudyGroups, type ClassIndex, type PlanOptions, type Slot } from '@core/lib/classmates';

export interface ClassesDeps {
  /** 학교의 수업 목록 (서버: 동기화된 카탈로그, mock: 내장 예시) */
  catalog(schoolId: ID): CatalogCourse[];
}

/** "2pm" / "2:30pm" (en) · "14:00" (ko) */
export function clockLabel(hhmm: string, en: boolean): string {
  if (!en) return hhmm;
  const m = toMin(hhmm); const hr = Math.floor(m / 60) % 12 || 12; const mm = m % 60;
  return `${mm ? `${hr}:${String(mm).padStart(2, '0')}` : hr}${m >= 12 * 60 ? 'pm' : 'am'}`;
}

/** "Thu 4–6pm" / "목 16:00–18:00" */
export function slotLabel(s: Slot, en: boolean): string {
  if (!en) return `${DAY_LABELS[s.day]} ${s.start}–${s.end}`;
  const h = (hhmm: string) => { const m = toMin(hhmm); const hr = Math.floor(m / 60) % 12 || 12; const mm = m % 60; return { t: mm ? `${hr}:${String(mm).padStart(2, '0')}` : `${hr}`, pm: m >= 12 * 60 }; };
  const a = h(s.start), b = h(s.end);
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][s.day];
  return `${day} ${a.t}${a.pm === b.pm ? '' : a.pm ? 'pm' : 'am'}–${b.t}${b.pm ? 'pm' : 'am'}`;
}

/** "You, Lily & Daniel" */
const youAnd = (names: string[], en: boolean) => {
  if (!en) return ['나', ...names].join(', ');
  const all = ['You', ...names];
  return all.length <= 2 ? all.join(' & ') : `${all.slice(0, -1).join(', ')} & ${all[all.length - 1]}`;
};

export function createClassesEngine(ctx: EngineContext, deps: ClassesDeps) {
  const { t } = ctx;
  const db = () => ctx.db;
  const now = () => new Date().toISOString();
  const en = t('수업') !== '수업';
  const find = <T extends { id: ID }>(arr: T[], id: ID) => {
    const x = arr.find((i) => i.id === id);
    if (!x) throw new Error(t('항목을 찾을 수 없어요.'));
    return x;
  };
  function notify(userId: ID, n: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): Notification {
    const nt: Notification = { id: uid('nt'), userId, read: false, createdAt: now(), ...n };
    db().notifications.unshift(nt);
    return nt;
  }
  function groupRoom(a: Activity, memberIds: ID[]): ChatRoom {
    let room = db().chatRooms.find((r) => r.type === 'activity' && r.activityId === a.id);
    if (!room) {
      room = {
        id: uid('cr'), type: 'activity', activityId: a.id, memberIds: [], title: a.title,
        messages: [{ id: uid('m'), senderId: a.hostId, text: en ? `Study group is on — ${a.title}. Pick a spot here.` : `스터디 그룹이 열렸어요 — ${a.title}. 어디서 할지 여기서 정해요.`, createdAt: now(), system: true }],
        lastReadAt: {}, createdAt: now(),
      };
      db().chatRooms.push(room);
    }
    for (const id of memberIds) if (!room.memberIds.includes(id)) {
      room.memberIds.push(id);
      const u = db().users.find((x) => x.id === id);
      if (u && room.memberIds.length > 1) room.messages.push({ id: uid('m'), senderId: id, text: `${u.nickname}${t('님이 입장했어요.')}`, createdAt: now(), system: true });
    }
    return room;
  }
  function joinApproved(a: Activity, userId: ID): Participation {
    let p = db().participations.find((x) => x.activityId === a.id && x.userId === userId);
    if (p) p.status = 'approved';
    else { p = { id: uid('p'), activityId: a.id, userId, status: 'approved', createdAt: now() }; db().participations.push(p); }
    return p;
  }

  return {
    /** 수업 방 공개 정보 — 인원 수만 */
    room(schoolSlug: string, codeSlug: string, index?: ClassIndex): ClassRoomInfo | null {
      const sid = `s_${String(schoolSlug).toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
      return classRoomInfo(db(), deps.catalog(sid), String(schoolSlug), String(codeSlug), new Date(), index);
    },

    /** 스터디 그룹 제안에 답하기. 2명 이상 '갈게요'면 실제 모임 + 그룹 채팅방이 된다 */
    respond(activityId: ID, userId: ID, response: StudyGroupResponse, preferred?: Slot): Patch {
      const a = find(db().activities, activityId);
      const sg = a.studyGroup;
      if (!sg || !sg.invitedIds.includes(userId)) throw new Error(t('권한이 없어요.'));
      if (!['in', 'other', 'no'].includes(response)) throw new Error(t('입력값을 확인해주세요.'));
      if (sg.status === 'expired' || a.date < campusDateOf(new Date())) throw new Error(en ? 'This study group time has passed.' : '이미 지난 스터디 그룹이에요.');
      const was = sg.responses[userId];
      sg.responses[userId] = response;
      if (response === 'other' && preferred && Number.isInteger(preferred.day) && /^\d{2}:\d{2}$/.test(preferred.start) && /^\d{2}:\d{2}$/.test(preferred.end)) {
        sg.preferred = { ...(sg.preferred ?? {}), [userId]: { day: preferred.day, start: preferred.start, end: preferred.end } };
      } else if (sg.preferred?.[userId]) { const { [userId]: _x, ...rest } = sg.preferred; sg.preferred = rest; }
      const patch: Patch = { activities: [a], participations: [], chatRooms: [], notifications: [] };
      const ins = sg.invitedIds.filter((id) => sg.responses[id] === 'in');
      const me = find(db().users, userId);
      if (response === 'in') {
        if (sg.status === 'suggested' && ins.length >= 2) {
          sg.status = 'formed';
          a.hostId = ins[0];
          const room = groupRoom(a, ins);
          for (const id of ins) patch.participations!.push(joinApproved(a, id));
          patch.chatRooms!.push(room);
          for (const id of ins.filter((x) => x !== userId)) patch.notifications!.push(notify(id, { type: 'study_group', title: en ? `${sg.code} study group is on` : `${sg.code} 스터디 그룹 성사`, body: en ? `${me.nickname} is in too — ${slotLabel({ day: dayOf(a.date), start: a.startTime, end: a.endTime }, true)}. Group chat is open.` : `${me.nickname}님도 함께해요. 그룹 채팅방이 열렸어요.`, link: `/chats/${room.id}` }));
          // 아직 답하지 않은 사람에게는 한 번 더 — "2명이 함께해요"
          for (const id of sg.invitedIds.filter((x) => !sg.responses[x])) patch.notifications!.push(notify(id, { type: 'study_group', title: en ? `${ins.length} classmates said yes` : `${ins.length}명이 함께해요`, body: en ? `${sg.code} study group ${slotLabel({ day: dayOf(a.date), start: a.startTime, end: a.endTime }, true)} — join them?` : `${sg.code} 스터디 그룹 — 같이 할래요?`, link: `/study/${a.id}` }));
        } else if (sg.status === 'formed') {
          const room = groupRoom(a, [userId]);
          patch.participations!.push(joinApproved(a, userId));
          patch.chatRooms!.push(room);
        }
      } else if (was === 'in' && sg.status === 'formed') {
        const p = db().participations.find((x) => x.activityId === a.id && x.userId === userId && x.status === 'approved');
        if (p) { p.status = 'cancelled'; patch.participations!.push(p); }
        const room = db().chatRooms.find((r) => r.activityId === a.id);
        if (room) { room.memberIds = room.memberIds.filter((m) => m !== userId); patch.chatRooms!.push(room); }
      }
      return patch;
    },

    /** 파트너 찾기 목록 — 내가 듣는 수업에만 올릴 수 있다. note === null 이면 내린다 */
    setPartner(userId: ID, key: string, note: string | null): Patch {
      const u = find(db().users, userId);
      const e = enrollments(u).find((x) => x.key === key);
      const rest = (u.partnerSearch ?? []).filter((x) => x.key !== key);
      if (note === null) { u.partnerSearch = rest; return { users: [u] }; }
      if (!e) throw new Error(en ? 'Add this class to your timetable first.' : '먼저 시간표에 이 수업을 추가해주세요.');
      const clean = String(note ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
      u.partnerSearch = [...rest, { key, code: e.code, term: e.term, ...(clean ? { note: clean } : {}), since: now() }];
      return { users: [u] };
    },

    /**
     * 정기 작업 (서버가 한 시간마다): 지난 제안은 만료, 지난 학기 파트너 목록 정리, 새 스터디 그룹 제안.
     * 학교 구분은 수업 키(학교|코드|학기)에 들어 있어 다른 학교 학생이 섞이지 않는다.
     */
    runStudyGroups(at: Date = new Date(), opts: PlanOptions = {}): Patch {
      const today = campusDateOf(at);
      const patch: Patch = { activities: [], users: [], notifications: [] };
      for (const a of db().activities) if (a.studyGroup?.status === 'suggested' && a.date < today) { a.studyGroup.status = 'expired'; patch.activities!.push(a); }
      const curOrder = termOrder(nowTermLabel(at));
      for (const u of db().users) {
        if (!u.partnerSearch?.length) continue;
        const keep = u.partnerSearch.filter((p) => termOrder(p.term) >= curOrder);
        if (keep.length !== u.partnerSearch.length) { u.partnerSearch = keep; patch.users!.push(u); }
      }
      for (const plan of planStudyGroups(db(), at, { examFor: (key) => examFor(deps, key, at), ...opts })) {
        const school = db().schools.find((s) => s.id === plan.schoolId);
        const users = plan.userIds.map((id) => find(db().users, id));
        const label = slotLabel(plan.slot, en);
        const a: Activity = {
          id: uid('a'), kind: 'group', category: 'study',
          title: en ? `${plan.code} study group` : `${plan.code} 스터디 그룹`,
          description: en ? `Lumi matched ${plan.userIds.length} classmates in ${plan.code} who are all free ${label}${plan.exam ? ` — ${plan.exam.label} is coming up` : ''}. Pick a spot in the group chat.` : `${plan.code} 같은 수업 ${plan.userIds.length}명이 모두 ${label}에 비어요. 장소는 그룹 채팅에서 정해요.`,
          cover: { emoji: '📚', hue: 220 }, hostId: plan.userIds[0], hostType: 'user',
          date: plan.date, startTime: plan.slot.start, endTime: plan.slot.end,
          // 장소는 지어내지 않는다 — 모인 사람들이 채팅에서 정한다
          place: { name: en ? 'Spot TBD — decide in chat' : '장소 미정 — 채팅에서 정해요', lat: school?.center.lat ?? 0, lng: school?.center.lng ?? 0 },
          capacity: plan.userIds.length, visibility: 'selected', visibilityTargets: plan.userIds, joinPolicy: 'invite', invitedIds: plan.userIds, fee: 0,
          courseName: plan.courseName, crewType: plan.exam ? 'exam' : 'review', mode: 'offline', comments: [], createdAt: now(),
          studyGroup: { key: plan.key, code: plan.code, term: plan.term, invitedIds: plan.userIds, responses: {}, alternatives: plan.alternatives, status: 'suggested', ...(plan.exam ? { exam: plan.exam } : {}) },
        };
        db().activities.unshift(a);
        patch.activities!.push(a);
        for (const u of users) {
          const others = users.filter((x) => x.id !== u.id).map((x) => x.nickname);
          patch.notifications!.push(notify(u.id, {
            type: 'study_group',
            title: en ? `📚 ${plan.code} study group?` : `📚 ${plan.code} 스터디 그룹?`,
            body: en ? `${youAnd(others, true)} are all free ${label} for ${plan.code}${plan.exam ? ` (${plan.exam.label} ${plan.exam.date.slice(5).replace('-', '/')})` : ''} — in?` : `${youAnd(others, false)} 모두 ${label}에 비어요 (${plan.code}). 같이 할래요?`,
            link: `/study/${a.id}`,
          }));
        }
      }
      return patch;
    },
  };
}

const dayOf = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

/** 수업 목록에 학교가 공개한 시험 일정이 있으면 가장 가까운 것 (없으면 undefined) */
function examFor(deps: ClassesDeps, key: string, at: Date) {
  const [schoolId, slug, term] = key.split('|');
  const today = campusDateOf(at);
  const exams = deps.catalog(schoolId).filter((c) => c.code.toLowerCase().replace(/[^a-z0-9]/g, '') === slug && (!c.term || c.term === term || !/\d{4}/.test(c.term))).flatMap((c) => c.exams ?? []);
  return exams.filter((x) => x.date.slice(0, 10) >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
}
