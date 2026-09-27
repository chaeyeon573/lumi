/**
 * 공개 범위 · 연결 상태 — 사람을 보여줄 때 "무엇을 어디까지" 보여줄지 한 곳에서 정한다.
 * 원칙: 전화번호·개인 이메일·정확한 위치·실시간 위치는 어떤 설정에서도 공개하지 않는다(데이터 모델에 없다).
 * scope: everyone(전체 AroundU) / school_2nd(같은 학교 + 2촌) / connections(연결된 사람만)
 */
import type { Snapshot } from '@core/api/types';
import type { Audience, ConnectionStatus, ID, PrivacySettings, User } from '@core/types';
import { t } from '@core/i18n';
import { degreeOf } from './graph';
import { sameSchool } from './network';
import { isBlocked, isFollowing, isFriend, pendingRequestFrom, hasBlocked } from './relations';

type Rel = Pick<Snapshot, 'relationships' | 'participations' | 'proposals' | 'users'>;

/** 기본값은 제한적 공개: 같은 학교 + 2촌, 회사·도시·졸업연도·그룹은 보이되 방문 예정은 연결된 사람에게만 */
export const DEFAULT_PRIVACY: PrivacySettings = { scope: 'school_2nd', showCompany: true, showCity: true, showGradYear: true, showGroups: true, showInPaths: true, showTrips: true };
export const privacyOf = (u: Pick<User, 'privacy'>): PrivacySettings => ({ ...DEFAULT_PRIVACY, ...(u.privacy ?? {}) });

export const AUDIENCE_LABELS: Record<Audience, string> = { everyone: t('전체 AroundU'), school_2nd: t('같은 학교 + 2촌'), connections: t('연결된 사람만') };
export const AUDIENCE_DESC: Record<Audience, string> = {
  everyone: t('인증된 AroundU 사용자 누구나 추천·검색에서 볼 수 있어요'),
  school_2nd: t('같은 학교 사람과 연결의 연결(2촌)에게만 자세히 보여요'),
  connections: t('연결된 사람에게만 자세히 보여요. 다른 사람에게는 이름·학교만'),
};

/** viewer 가 owner 의 audience 안에 있는가 */
export function inAudience(s: Rel, viewer: User, owner: User, audience: Audience): boolean {
  if (viewer.id === owner.id) return true;
  if (audience === 'everyone') return true;
  if (isFriend(s, viewer.id, owner.id)) return true;
  if (audience === 'connections') return false;
  const d = degreeOf(s, viewer.id, owner.id, 2);
  return sameSchool(viewer, owner) || d === 2;
}

export interface ProfileView {
  /** 자세한 프로필을 볼 수 있는가 (false 면 이름·학교·관심사 정도만) */
  full: boolean;
  company: boolean; city: boolean; gradYear: boolean; groups: boolean; trips: boolean;
  /** 제한된 이유 (표시용) */
  reason?: string;
}

/** 공개 범위를 적용한 보기 권한 — 카드·상세·검색 결과가 모두 이 결과만 쓴다 */
export function profileView(s: Rel, viewer: User, owner: User): ProfileView {
  if (viewer.id === owner.id) return { full: true, company: true, city: true, gradYear: true, groups: true, trips: true };
  if (isBlocked(s, viewer.id, owner.id)) return { full: false, company: false, city: false, gradYear: false, groups: false, trips: false, reason: t('차단된 사용자예요') };
  const p = privacyOf(owner);
  const full = inAudience(s, viewer, owner, p.scope);
  const friend = isFriend(s, viewer.id, owner.id);
  return {
    full,
    company: full && p.showCompany,
    city: full && p.showCity,
    gradYear: full && p.showGradYear,
    groups: full && p.showGroups,
    trips: p.showTrips && (friend || (full && p.scope !== 'connections')),
    reason: full ? undefined : p.scope === 'connections' ? t('연결된 사람에게만 자세히 보여요') : t('같은 학교·2촌에게만 자세히 보여요'),
  };
}

/** 2촌 경로에 이 사람을 "공통 연결"로 보여도 되는가 */
export const canShowInPath = (u: User) => privacyOf(u).showInPaths;

/** 연결 상태 — 팔로우 가능 / 연결 요청 가능 / 요청 보냄 / 연결됨 / 차단됨 / 비공개 */
export function connectionStatus(s: Rel, me: User, other: User): ConnectionStatus {
  if (hasBlocked(s, me.id, other.id) || isBlocked(s, me.id, other.id)) return 'blocked';
  if (isFriend(s, me.id, other.id)) return 'connected';
  if (pendingRequestFrom(s, me.id, other.id)) return 'requested';
  const view = profileView(s, me, other);
  if (!view.full) return other.settings.messagePolicy === 'none' ? 'private' : 'can_follow';
  return 'can_request';
}

export const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  can_follow: t('팔로우 가능'), can_request: t('연결 요청 가능'), requested: t('요청 보냄'), connected: t('연결됨'), blocked: t('차단됨'), private: t('비공개'),
};

/** 텍스트에 연락처(전화번호·이메일·메신저 ID)가 들어 있는지 — 요청·응답에 직접 적지 못하게 한다 */
export function containsContact(text: string): boolean {
  return /\b[\w.+-]+@[\w-]+\.[\w.]+\b/.test(text)
    || /(\+?\d[\d\s-]{8,}\d)/.test(text)
    || /(카톡|카카오톡|kakao|open\.kakao|오픈채팅|텔레그램|telegram|whatsapp|wechat|instagram\.com|@\w{3,})/i.test(text);
}

export const isFollowingUser = (s: Rel, me: ID, other: ID) => isFollowing(s, me, other);
