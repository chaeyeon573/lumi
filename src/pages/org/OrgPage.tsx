import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BadgeCheck, CalendarDays, Check, ClipboardList, ExternalLink, Globe, LogOut, Megaphone, MessageCircle, Pencil, Plus, Send, Share2, ShieldCheck, Undo2, Users, Wallet } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Organization, User } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { publicLinks, recruitmentLabel } from '@core/lib/orglinks';
import { orgJoinState, type OrgJoin } from '@core/lib/orgjoin';
import { askedToast, clubShort, consentLine, consentTitle, CONSENT_VERSION, howToJoinLive, requestStatus, statusLine, whoLabel, type RequestStatus } from '@core/lib/clubjoin';
import { canGoTogether } from '@core/lib/withpeople';
import { formatDate, formatTime } from '@core/lib/format';
import { isSampleOrg } from '@core/lib/sampleorgs';
import { audienceFits, listingsOfOrg } from '@core/lib/listings';
import { daysUntil } from '@core/lib/recommend';
import { todayISO } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { BottomSheet, SampleTag } from '@/components/ui';
import { Faces } from '@/components/together/PeopleLine';
import { GoTogetherSheet } from '@/components/together/GoTogetherSheet';
import { PostCard } from '@/components/cards/PostCard';
import { affiliationText } from '@/components/cards/PersonCard';
import { OrgPostTypeSheet } from '@/components/create/OrgPostTypeSheet';
import {
  BackHeader, HeaderIcon, Badge, Btn, SegTabs, TextCard, InfoRows, InfoNote, PersonCard, RowCard, EmptyCard, EmptyState, type InfoRow,
} from '@/components/ha';
import { CLUB_TONE, ClubEventItem, ListingItem } from '@/pages/explore/ExploreItems';
import { useSaved } from '@/pages/explore/EventsList';
import { ORG_BADGE } from '@/pages/explore/exploreData';

const en = lang === 'en';
type Tab = 'about' | 'feed' | 'events' | 'members';
const TABS: Tab[] = ['about', 'feed', 'events', 'members'];
/** old links: ?tab=posts → feed, ?tab=recruit → about (recruiting now lives in About) */
const tabOf = (raw: string | null): Tab => (raw === 'posts' ? 'feed' : raw === 'recruit' ? 'about' : (TABS as string[]).includes(raw ?? '') ? raw as Tab : 'about');
const TAB_LABEL: Record<Tab, string> = { about: en ? 'About' : '소개', feed: en ? 'Feed' : '피드', events: en ? 'Events' : '행사', members: en ? 'Members' : '멤버' };
// 링크 이름은 데이터에 영어로 저장돼 있다 — 한국어 화면에서 일반 단어만 바꾼다
const LINK_LABEL_KO: Record<string, string> = { Website: '웹사이트', Directory: '동아리 명부', 'Lab website': '연구실 웹사이트' };
/** a real photo only — media paths are relative to the app (api/media/<id>) */
const photoSrc = (url: string) => (/^(https?:|data:|\/)/.test(url) ? url : `/${url}`);

/**
 * Community (PDF S022 About · S023 Feed · S024 Events · S025 Members) — tabs in ?tab=.
 * Header (owner 2026-11-06): no placeholder block — a real cover as a banner and a real logo next to the name only when they
 * exist; otherwise the page starts with the name. Then category + one meta line, the action row (Ask to join primary, Follow
 * outline), the people line ("7 students asked to join · 2 friends follow" with faces), then the tabs.
 * Asking follows @core/lib/clubjoin: one consent line first; the wording only says "sent" when the club really has it.
 */
export function OrgPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = tabOf(params.get('tab'));
  const setTab = (k: string) => setParams(k === 'about' ? {} : { tab: k }, { replace: true });
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const orgs = useAppStore((s) => s.organizations);
  const rooms = useAppStore((s) => s.chatRooms);
  const [menu, setMenu] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const org = orgs.find((o) => o.id === id);
  if (!org) return (
    <div className="min-h-full bg-bg">
      <BackHeader title={en ? 'Community' : '커뮤니티'} />
      <EmptyState icon={<Users size={30} />} tone="mint" title={en ? 'This group isn’t here' : '단체를 찾을 수 없어요'} sub={en ? 'It may be at another school or no longer listed.' : '다른 학교 단체이거나 목록에서 내려갔을 수 있어요.'}
        action={{ label: en ? 'Explore clubs' : '동아리 둘러보기', onClick: () => nav('/explore/clubs') }} />
    </div>
  );
  const sample = isSampleOrg(org.id);
  const following = v.isFollowing(org.id);
  const isAdmin = org.adminIds.includes(v.me.id);
  const join = orgJoinState(org, v.me.id);
  const status = requestStatus(org, v.me.id);
  const room = rooms.find((r) => r.orgId === org.id && r.memberIds.includes(v.me.id));
  const inGroup = join.kind === 'admin' || join.kind === 'member';
  // 마지막 운영진은 나갈 수 없다 (서버 orgs.leave 와 같은 규칙) — 메뉴에 이유를 그대로 적는다
  const lastOrganizer = isAdmin && !org.adminIds.some((a) => a !== v.me.id);
  const leave = () => { setLeaving(false); run(() => api.orgs.leave(org.id, v.me.id), en ? `You left ${org.name}.` : `${org.name}에서 나왔어요.`).catch(() => {}); };
  const follow = () => run(() => api.relationships.toggleFollow(v.me.id, org.id, 'org'), following ? undefined : (en ? 'Following — you’ll hear about new events.' : '팔로우했어요. 새 행사 소식을 받아요.')).catch(() => {});
  const withdraw = () => run(() => api.orgs.withdraw(org.id, v.me.id), en ? 'Request withdrawn.' : '요청을 거뒀어요.').catch(() => {});
  const ask = async () => {
    setBusy(true);
    try {
      if (join.kind === 'join') await run(() => api.orgs.apply(org.id, v.me.id), en ? `You joined ${org.name}.` : `${org.name}에 가입했어요.`);
      else { const r = await run(() => api.clubs.ask(org.id, CONSENT_VERSION)); setConsent(false); showToast(askedToast(r.status, org.name), 'success'); }
    } catch { /* toast */ } finally { setBusy(false); }
  };
  const followers = org.followerCount ?? org.followerIds.length;
  const meta = [org.parent || '', followers ? (en ? `${followers} ${followers === 1 ? 'student follows' : 'students follow'}` : `${followers}명 팔로우`) : ''].filter(Boolean).join(' · ');

  return (
    <div className="min-h-full bg-bg pb-10">
      <BackHeader title={`${en ? 'Community' : '커뮤니티'} — ${TAB_LABEL[tab]}`} onMore={() => setMenu(true)}
        right={room ? <HeaderIcon label={en ? 'Group chat' : '단체 채팅'} onClick={() => nav(`/chats/${room.id}`)}><MessageCircle size={22} /></HeaderIcon> : undefined} />
      <div className="px-4 pt-1">
        {org.cover?.url && <img src={photoSrc(org.cover.url)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full aspect-[5/2] object-cover rounded-[20px] border border-line mb-4" />}
        <div className="flex items-center gap-3">
          {org.logo.url && <img src={photoSrc(org.logo.url)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="size-14 rounded-[14px] object-cover border border-line shrink-0" />}
          <h1 className="ha-title leading-[1.12] min-w-0">{sample && <SampleTag className="align-middle" />}{org.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Badge tone={CLUB_TONE[org.type]}>{ORG_BADGE[org.type]}</Badge>
          {org.verified && !sample && <Badge tone="neutral"><BadgeCheck size={13} className="mr-1" />{en ? 'Verified' : '인증'}</Badge>}
          {org.createdBy && <Badge tone="neutral">{en ? 'Started on Lumi' : 'Lumi에서 시작'}</Badge>}
        </div>
        {meta && <p className="text-[13px] text-ink-3 mt-2">{meta}</p>}
        {sample && <p className="text-[12.5px] text-ink-3 mt-2">{en ? 'Sample club — made up to show how Lumi works.' : '예시 동아리 — Lumi 사용법을 보여 주려고 만든 거예요.'}</p>}
        <ActionRow org={org} join={join} status={status} following={following} busy={busy} onAsk={() => (join.kind === 'join' ? ask() : setConsent(true))} onFollow={follow} />
        <PeopleRow org={org} />
      </div>
      <SegTabs className="mx-4 mt-4" tabs={TABS.map((k) => ({ key: k, label: TAB_LABEL[k] }))} value={tab} onChange={setTab} />
      <div className="px-4 pt-4">
        {tab === 'about' && <About org={org} join={join} status={status} sample={sample} />}
        {tab === 'feed' && <Feed org={org} isAdmin={isAdmin} />}
        {tab === 'events' && <Events org={org} isAdmin={isAdmin} following={following} />}
        {tab === 'members' && <Members org={org} />}
      </div>
      <BottomSheet open={consent} onClose={() => setConsent(false)} title={consentTitle(org.name)}>
        <p className="text-[14px] text-ink-2 pb-4">{consentLine(org.name)}</p>
        <div className="space-y-2 pb-1">
          <Btn full loading={busy} onClick={ask}>{en ? 'Ask to join' : '가입 요청'}</Btn>
          <Btn full variant="outline" onClick={() => setConsent(false)}>{en ? 'Cancel' : '취소'}</Btn>
        </div>
      </BottomSheet>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={org.name}>
        <div className="space-y-1 pb-1">
          <MenuItem icon={<Share2 size={18} />} label={en ? 'Copy link' : '링크 복사'} onClick={() => { setMenu(false); void navigator.clipboard?.writeText(window.location.href.split('?')[0]).catch(() => {}); showToast(en ? 'Link copied' : '링크를 복사했어요'); }} />
          {isAdmin && <MenuItem icon={<ClipboardList size={18} />} label={en ? 'Who asked to join' : '가입 요청'} onClick={() => { setMenu(false); nav(`/orgs/${org.id}/requests`); }} />}
          {status !== 'none' && <MenuItem icon={<Undo2 size={18} />} label={en ? 'Withdraw my request' : '가입 요청 거두기'} sub={en ? `${clubShort(org.name)} can’t message you after this.` : `거두면 ${clubShort(org.name)}에서 메시지를 보낼 수 없어요.`} onClick={() => { setMenu(false); void withdraw(); }} />}
          {!isAdmin && following && <MenuItem icon={<Users size={18} />} label={en ? 'Unfollow' : '팔로우 취소'} onClick={() => { setMenu(false); void follow(); }} />}
          {inGroup && <MenuItem icon={<LogOut size={18} />} label={en ? 'Leave group' : '그룹 나가기'} disabled={lastOrganizer}
            sub={lastOrganizer ? (en ? 'You’re the only organizer. A group needs at least one, so you can’t leave yet.' : '이 그룹의 운영진은 나 혼자예요. 그룹에는 운영진이 한 명은 있어야 해서 지금은 나갈 수 없어요.') : undefined}
            onClick={() => { setMenu(false); setLeaving(true); }} />}
        </div>
      </BottomSheet>
      <BottomSheet open={leaving} onClose={() => setLeaving(false)} title={en ? `Leave ${org.name}?` : `${org.name}에서 나갈까요?`}>
        <p className="text-[14px] text-ink-2 pb-4">{following
          ? (en ? 'You’ll still follow it and hear about new events.' : '팔로우는 그대로라 새 행사 소식은 계속 받아요.')
          : (en ? 'You can ask to join again later.' : '나중에 다시 가입할 수 있어요.')}</p>
        <div className="space-y-2 pb-1">
          <Btn full variant="danger" onClick={leave}>{en ? 'Leave group' : '그룹 나가기'}</Btn>
          <Btn full variant="outline" onClick={() => setLeaving(false)}>{en ? 'Cancel' : '취소'}</Btn>
        </div>
      </BottomSheet>
    </div>
  );
}

function MenuItem({ icon, label, sub, disabled, onClick }: { icon: ReactNode; label: string; sub?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} className={cn('w-full min-h-12 px-2 py-2 flex items-center gap-3 rounded-xl text-left text-[15px] font-medium text-ink press', disabled && 'text-ink-3')}>
      {icon}
      <span className="min-w-0">{label}{sub && <span className="block text-[12.5px] font-normal text-ink-3 mt-0.5">{sub}</span>}</span>
    </button>
  );
}

/**
 * Ask to join (primary) + Follow (outline), both above the fold. After asking, the student's own status takes the primary's
 * place ("You asked · waiting for CHAOS" / "Sent to CHAOS") — withdraw is in the ··· menu. Organizers get "See who asked".
 */
function ActionRow({ org, join, status, following, busy, onAsk, onFollow }: { org: Organization; join: OrgJoin; status: RequestStatus; following: boolean; busy: boolean; onAsk: () => void; onFollow: () => void }) {
  const nav = useNavigate();
  const followBtn = <Btn variant="outline" onClick={onFollow} className={cn('shrink-0', following && 'text-sel-fg border-sel-line')}>{following ? (en ? 'Following' : '팔로잉') : (en ? 'Follow' : '팔로우')}</Btn>;
  if (join.kind === 'admin') {
    const n = org.requesters?.length ?? org.applicantIds.length;
    return <div className="flex gap-2.5 mt-4"><Btn className="flex-1" icon={<ClipboardList size={17} />} onClick={() => nav(`/orgs/${org.id}/requests`)}>{n ? (en ? `See who asked (${n})` : `요청한 학생 (${n})`) : (en ? 'See who asked' : '요청한 학생')}</Btn></div>;
  }
  if (join.kind === 'member') return <div className="flex gap-2.5 mt-4"><Btn variant="outline" disabled className="flex-1"><Check size={16} className="mr-1" />{en ? 'You’re a member' : '회원이에요'}</Btn>{followBtn}</div>;
  if (join.kind === 'follow') return <div className="flex gap-2.5 mt-4"><Btn className="flex-1" onClick={onFollow}>{following ? (en ? 'Following' : '팔로잉') : (en ? 'Follow' : '팔로우')}</Btn></div>;
  if (join.kind === 'applied') return (
    <div className="flex gap-2.5 mt-4 items-stretch">
      <div className="flex-1 min-h-11 px-4 rounded-full border border-sel-line bg-sel-soft text-sel-fg text-[13.5px] font-semibold flex items-center gap-2 min-w-0">
        <Check size={16} className="shrink-0" /><span className="truncate">{statusLine(status, org.name)}</span>
      </div>
      {followBtn}
    </div>
  );
  return (
    <div className="flex gap-2.5 mt-4">
      <Btn className="flex-1" loading={busy} onClick={onAsk}>{join.kind === 'join' ? (en ? 'Join group' : '가입하기') : (en ? 'Ask to join' : '가입 요청')}</Btn>
      {followBtn}
    </div>
  );
}

/** "7 students asked to join · 2 friends follow" with faces — real people only, each as their privacy allows (server/view.ts) */
function PeopleRow({ org }: { org: Organization }) {
  const v = useViewer();
  const asked = org.requestCount ?? org.applicantIds.length;
  const friends = org.followerIds.filter((id) => id !== v.me.id && v.isFriend(id) && !v.isBlocked(id));
  const faceIds = [...new Set([...friends, ...(org.requestFaces ?? [])])];
  const faces = faceIds.map((id) => v.userById(id)).filter((u): u is User => !!u && !v.isBlocked(u.id));
  const parts = [
    asked ? (en ? `${asked} ${asked === 1 ? 'student' : 'students'} asked to join` : `${asked}명이 가입을 요청했어요`) : '',
    friends.length ? (en ? `${friends.length} ${friends.length === 1 ? 'friend follows' : 'friends follow'}` : `친구 ${friends.length}명 팔로우`) : '',
  ].filter(Boolean);
  if (!parts.length) return null; // no "be the first" line (PRODUCT_TASTE)
  return (
    <div className="flex items-center gap-2.5 mt-3.5 min-w-0">
      <Faces people={faces} size={26} />
      <span className="text-[13px] text-ink-2 min-w-0 truncate">{parts.join(' · ')}</span>
    </div>
  );
}

/** what the Membership row says — who has the requests and where they stand (no "following never grants…" copy) */
function membershipRow(org: Organization, join: OrgJoin): InfoRow | null {
  const asked = org.requestCount ?? org.applicantIds.length;
  const organizers = org.adminIds.length;
  const value = join.kind === 'admin' ? (en ? 'You organize this group' : '내가 운영하는 단체')
    : join.kind === 'member' ? (en ? 'You’re a member' : '회원이에요')
    : join.kind === 'join' ? (en ? 'Open — anyone at school can join' : '열림 — 누구나 가입')
    : join.kind === 'follow' ? null
    : join.kind === 'applied' ? (organizers ? (en ? 'Organizers on Lumi have your request' : 'Lumi의 운영진이 요청을 받았어요') : (en ? 'Organizers aren’t on Lumi yet — your request is saved' : '운영진이 아직 Lumi에 없어요 — 요청은 저장돼 있어요'))
    : asked ? (en ? `${asked} ${asked === 1 ? 'student' : 'students'} asked to join` : `${asked}명이 가입을 요청했어요`)
    : organizers ? (en ? 'Organizers on Lumi answer requests' : 'Lumi의 운영진이 요청에 답해요')
    : (en ? 'Organizers aren’t on Lumi yet' : '운영진이 아직 Lumi에 없어요');
  if (!value) return null;
  const caption = join.kind === 'ask'
    ? (organizers ? (en ? `${organizers === 1 ? 'The organizer sees' : `${organizers} organizers see`} requests here` : `운영진 ${organizers}명이 여기서 요청을 봐요`)
      : (en ? 'Requests are saved and passed on when the club joins Lumi' : '요청은 저장했다가 동아리가 Lumi에 오면 전해요'))
    : undefined;
  const recruit = recruitmentLabel(org.recruitment);
  return { tone: 'mint', icon: org.joinPolicy === 'open' ? <Users size={19} /> : <ShieldCheck size={19} />, label: en ? 'Membership' : '회원', value, caption: [recruit && !org.joinPolicy ? recruit.text : '', caption ?? ''].filter(Boolean).join(' · ') || undefined };
}

/** "How to join" the club posted (/club-setup) — its sign-up link, who can join, the next info session */
function howToJoinRows(org: Organization, today: string): InfoRow[] {
  const h = org.howToJoin;
  if (!howToJoinLive(h, today)) return [];
  const rows: InfoRow[] = [];
  if (h.signupUrl) rows.push({ tone: 'lav', icon: <ClipboardList size={19} />, label: en ? 'How to join' : '가입 방법', value: en ? 'Sign-up form' : '가입 신청서', caption: hostOf(h.signupUrl), onClick: () => window.open(h.signupUrl, '_blank', 'noopener'), right: <ExternalLink size={17} className="text-ink-3 shrink-0" /> });
  if (h.who || h.whoNote) rows.push({ tone: 'mint', icon: <Users size={19} />, label: en ? 'Who can join' : '가입 조건', value: h.who ? whoLabel(h.who) : h.whoNote!, caption: h.who ? h.whoNote : undefined });
  if (h.next && h.next.date >= today) rows.push({ tone: 'ice', icon: <CalendarDays size={19} />, label: en ? 'Next info session' : '다음 설명회', value: [formatDate(h.next.date), h.next.time ? formatTime(h.next.time) : ''].filter(Boolean).join(' · '), caption: h.next.place });
  return rows;
}

/** S022 — how to join first (the club's own process, never invented), your request, public page, membership, quiet organizer line */
function About({ org, join, status, sample }: { org: Organization; join: OrgJoin; status: RequestStatus; sample: boolean }) {
  const nav = useNavigate();
  const v = useViewer();
  const today = todayISO();
  const [manage, setManage] = useState(false);
  // 예시 동아리의 링크는 남의 실제 페이지로 간다 — 예시엔 바깥 링크를 달지 않는다. 학교 로그인 뒤 페이지는 빼고
  const links = sample ? [] : publicLinks(org.links);
  const how = howToJoinRows(org, today);
  const rows: InfoRow[] = [];
  if (org.joinProcess) rows.push({ tone: 'lav', icon: <ClipboardList size={19} />, label: how.length ? (en ? 'From the directory' : '학교 명부') : (en ? 'How to join' : '가입 절차'), value: org.joinProcess });
  if (org.dues) rows.push({ tone: 'peach', icon: <Wallet size={19} />, label: en ? 'Dues' : '회비', value: org.dues });
  links.slice(0, 3).forEach((l, i) => rows.push({
    tone: 'ice', icon: <Globe size={19} />, label: i === 0 ? (en ? 'Public page' : '공개 페이지') : (en ? 'Also on' : '다른 곳'),
    value: i === 0 && l.label === 'Website' ? (en ? 'Visit organization website' : '단체 웹사이트') : (en ? l.label : (LINK_LABEL_KO[l.label] ?? l.label)),
    caption: hostOf(l.url), onClick: () => window.open(l.url, '_blank', 'noopener'), right: <ExternalLink size={17} className="text-ink-3 shrink-0" />,
  }));
  const m = membershipRow(org, join);
  if (m) rows.push(m);
  if (org.regularActivities.length) rows.push({ tone: 'ice', icon: <CalendarDays size={19} />, label: en ? 'Regular activities' : '정기 활동', value: org.regularActivities[0], caption: org.regularActivities.slice(1, 3).join(' · ') || undefined });
  const directoryClub = !org.createdBy && !sample && org.type !== 'department';
  return (
    <div className="space-y-3">
      {status !== 'none' && <RequestCard org={org} status={status} />}
      {how.length > 0 && <InfoRows rows={how} />}
      {status !== 'none' && <NextEventNudge org={org} />}
      {org.description && <TextCard>{org.description}</TextCard>}
      <InfoRows rows={rows} />
      {org.policyNote && <InfoNote>{org.policyNote}</InfoNote>}
      {join.kind === 'admin' && <Btn variant="outline" icon={<Pencil size={16} />} onClick={() => nav(`/orgs/${org.id}/setup`)}>{en ? 'Edit how to join' : '가입 방법 고치기'}</Btn>}
      {directoryClub && join.kind !== 'admin' && v.me && (
        <button onClick={() => setManage(true)} className="block w-full text-center text-[13px] text-ink-3 pt-2 pb-1 press">
          {en ? 'Are you an organizer? ' : '운영진인가요? '}<span className="text-sel-fg font-semibold">{en ? 'Manage this page' : '이 페이지 관리하기'}</span>
        </button>
      )}
      <ManageSheet org={org} open={manage} onClose={() => setManage(false)} />
    </div>
  );
}

/** the student's own request — only what really happened (@core/lib/clubjoin): saved / sent / told, and how many asked */
function RequestCard({ org, status }: { org: Organization; status: RequestStatus }) {
  const club = clubShort(org.name);
  const asked = org.requestCount ?? 0;
  const others = Math.max(0, asked - 1);
  const title = status === 'saved' ? (en ? `Saved — we’ll pass it on to ${club}` : `저장했어요 — ${club}에 전해 드릴게요`)
    : status === 'told' ? (en ? `We told ${club} you want to join` : `${club}에 가입하고 싶다고 전했어요`)
    : (en ? `Sent to ${club} organizers` : `${club} 운영진에게 보냈어요`);
  const sub = status === 'told' ? (en ? 'You’ll hear here when they reply.' : '답이 오면 여기서 알려 드려요.')
    : status === 'saved' ? (asked > 1 ? (en ? `${asked} students asked so far` : `지금까지 ${asked}명이 요청했어요`) : (en ? 'You’ll hear here when they see it.' : '전해지면 여기서 알려 드려요.'))
    : others ? (en ? `${others} other ${others === 1 ? 'student' : 'students'} asked too` : `다른 학생 ${others}명도 요청했어요`) : undefined;
  return <RowCard tone="rose" icon={<Send size={20} />} title={title} sub={sub} />;
}

/** "Go together" to the club's next dated event, when there is one (Explore listings or an event the club posted) */
function NextEventNudge({ org }: { org: Organization }) {
  const nav = useNavigate();
  const v = useViewer();
  const opps = useAppStore((s) => s.opportunities);
  const [sheet, setSheet] = useState(false);
  const today = todayISO();
  const listing = useMemo(() => listingsOfOrg(org, opps).filter((o) => o.type === 'event' && o.date && daysUntil(o.date) >= 0 && audienceFits(v.me, o))
    .sort((a, b) => `${a.date} ${a.startTime ?? ''}`.localeCompare(`${b.date} ${b.startTime ?? ''}`))[0], [org, opps, v.me]);
  const act = useMemo(() => v.visibleActivities.filter((a) => a.orgId === org.id && a.date >= today).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0], [v, org.id, today]);
  const next = listing && (!act || `${listing.date}` <= act.date) ? { title: listing.title, date: listing.date!, time: listing.startTime, go: canGoTogether(listing), open: () => (canGoTogether(listing) ? setSheet(true) : nav(`/opportunities/${listing.id}?with=1`)) }
    : act ? { title: act.title, date: act.date, time: act.startTime, go: true, open: () => nav(`/activities/${act.id}`) } : null;
  if (!next) return null;
  return (
    <>
      <RowCard tone="ice" icon={<CalendarDays size={20} />} title={next.title} sub={[en ? 'Next event' : '다음 행사', formatDate(next.date), next.time && next.time !== '00:00' ? formatTime(next.time) : ''].filter(Boolean).join(' · ')}
        right={<Btn size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); next.open(); }}>{en ? 'Go together' : '같이 가기'}</Btn>} />
      {listing && canGoTogether(listing) && <GoTogetherSheet o={listing} open={sheet} onClose={() => setSheet(false)} />}
    </>
  );
}

/** "Are you an organizer? Manage this page" — the link goes to the club's address in the campus directory, never one typed here */
function ManageSheet({ org, open, onClose }: { org: Organization; open: boolean; onClose: () => void }) {
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { const r = await api.clubs.manageLink(org.id); showToast(r.message, r.sent ? 'success' : 'info'); onClose(); }
    catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={en ? `Manage ${org.name}` : `${org.name} 관리하기`}>
      <p className="text-[14px] text-ink-2 pb-4">{org.hasContact
        ? (en ? 'We’ll e-mail a sign-in link to the club’s address in the campus directory.' : '학교 동아리 명부에 있는 동아리 이메일로 링크를 보내요.')
        : (en ? 'This club has no e-mail in the campus directory, so we can’t check who runs it yet.' : '학교 명부에 이 동아리 이메일이 없어서 아직 운영진을 확인할 수 없어요.')}</p>
      <div className="space-y-2 pb-1">
        {org.hasContact && <Btn full loading={busy} onClick={send}>{en ? 'Send link to the club' : '동아리로 링크 보내기'}</Btn>}
        <Btn full variant="outline" onClick={onClose}>{en ? 'Cancel' : '취소'}</Btn>
      </div>
    </BottomSheet>
  );
}
const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return undefined; } };

/** S023 — the group's posts (the server only sends what you may see) */
function Feed({ org, isAdmin }: { org: Organization; isAdmin: boolean }) {
  const v = useViewer();
  const [post, setPost] = useState(false);
  const posts = useMemo(() => v.visiblePosts.filter((p) => p.orgId === org.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [v, org.id]);
  return (
    <div className="space-y-3">
      {isAdmin && <Btn variant="outline" icon={<Megaphone size={16} />} onClick={() => setPost(true)}>{en ? 'Post an update' : '소식 올리기'}</Btn>}
      {posts.length === 0
        ? <EmptyCard title={en ? 'No posts yet' : '아직 게시물이 없어요'} sub={isAdmin ? (en ? 'Updates you post stay on this page.' : '올린 소식은 이 페이지에 보여요.') : undefined} />
        : posts.map((p) => <PostCard key={p.id} post={p} />)}
      <InfoNote>{en ? 'Only posts you are allowed to view appear here.' : '볼 수 있는 글만 보여요.'}</InfoNote>
      <OrgPostTypeSheet open={post} onClose={() => setPost(false)} org={org} />
    </div>
  );
}

/**
 * S024 — dated events from the school's listings (ListingCard) and events the group posted on Lumi (MeetupCard),
 * each with its date. With none, it says so — the club's own "Weekend hikes" has no date and is not shown as an event
 * (ux-sim 2026-11-06: "No actual hike dates") — and points to the club's own public page when there is one.
 */
function Events({ org, isAdmin, following }: { org: Organization; isAdmin: boolean; following: boolean }) {
  const nav = useNavigate();
  const v = useViewer();
  const opps = useAppStore((s) => s.opportunities);
  const saved = useSaved();
  const today = todayISO();
  const acts = useMemo(() => v.visibleActivities.filter((a) => a.orgId === org.id && a.date >= today).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)), [v, org.id, today]);
  const hosted = useMemo(() => listingsOfOrg(org, opps).filter((o) => audienceFits(v.me, o)), [org, opps, v.me]);
  const listed = hosted.filter((o) => o.type === 'event' && o.date && daysUntil(o.date) >= 0).sort((a, b) => `${a.date} ${a.startTime ?? ''}`.localeCompare(`${b.date} ${b.startTime ?? ''}`));
  const others = hosted.filter((o) => o.type !== 'event' && (o.deadline ? daysUntil(o.deadline) >= 0 : true));
  const create = () => nav(`/create/activity?kind=org_event&event=1&org=${org.id}`);
  const empty = !acts.length && !listed.length && !others.length;
  // the club's own public page (never a login-only one; sample clubs have none — same rule as About)
  const page = isSampleOrg(org.id) ? undefined : publicLinks(org.links)[0];
  return (
    <div className="space-y-3">
      {isAdmin && <Btn variant="outline" icon={<Plus size={16} />} onClick={create}>{en ? 'Create Event' : '행사 올리기'}</Btn>}
      {listed.map((o) => <ListingItem key={o.id} o={o} saved={saved.ids.has(o.id)} onSave={() => saved.toggle(o)} onOpen={() => nav(`/opportunities/${o.id}`)} />)}
      {acts.map((a) => <ClubEventItem key={a.id} a={a} />)}
      {others.map((o) => <ListingItem key={o.id} o={o} saved={saved.ids.has(o.id)} onSave={() => saved.toggle(o)} onOpen={() => nav(`/opportunities/${o.id}`)} />)}
      {empty && (
        // 날짜 없는 정기 활동은 행사처럼 보이지 않게 한 줄로만 — 날짜는 지어내지 않고, 단체 공개 페이지가 있으면 거기로
        <EmptyCard title={en ? 'No dated events yet' : '날짜가 정해진 행사가 아직 없어요'}
          sub={org.regularActivities.length ? (en ? `They list: ${org.regularActivities.join(' · ')}` : `단체가 적어 둔 활동: ${org.regularActivities.join(' · ')}`)
            : isAdmin ? (en ? 'Events you post appear in Explore too.' : '올린 행사는 Explore 에도 보여요.') : following ? undefined : (en ? 'Follow to hear when they post one.' : '팔로우하면 행사가 올라올 때 알려 드려요.')}
          secondary={page ? { label: en ? 'Their page ↗' : '단체 페이지 ↗', onClick: () => window.open(page.url, '_blank', 'noopener') } : undefined} />
      )}
    </div>
  );
}

/** S025 — organizers first; each person as their privacy allows (the server sends only what you may see) */
function Members({ org }: { org: Organization }) {
  const nav = useNavigate();
  const v = useViewer();
  const ids = [...org.adminIds, ...org.memberIds.filter((m) => !org.adminIds.includes(m))];
  const people = ids.map((id) => v.userById(id)).filter((u): u is NonNullable<typeof u> => !!u && !v.isBlocked(u.id));
  return (
    <div className="space-y-3">
      {people.length === 0
        ? <EmptyCard title={en ? 'No members on Lumi yet' : 'Lumi에 회원이 아직 없어요'} sub={org.followerIds.length ? (en ? `${org.followerIds.length} following on Lumi.` : `Lumi에서 ${org.followerIds.length}명이 팔로우해요.`) : undefined} />
        : people.map((u) => (
          <PersonCard key={u.id} avatar={u.avatar} name={u.nickname}
            meta={[u.sample ? (en ? 'Sample' : '예시') : '', org.adminIds.includes(u.id) ? (en ? 'Organizer' : '운영진') : '', affiliationText(u)].filter(Boolean).join(' · ')}
            bio={u.bio || undefined} onClick={() => nav(`/users/${u.id}`)}
            action={u.id === v.me.id ? undefined : <Btn size="sm" variant="outline" onClick={() => nav(`/users/${u.id}`)}>{en ? 'View' : '보기'}</Btn>} />
        ))}
      {people.length > 0 && org.followerIds.length > 0 && <p className="text-[12.5px] text-ink-3">{en ? `${org.followerIds.length} following on Lumi` : `Lumi에서 ${org.followerIds.length}명 팔로우`}</p>}
      <InfoNote>{en ? 'Member visibility follows each person’s privacy settings.' : '멤버는 각자의 공개 설정대로 보여요.'}</InfoNote>
    </div>
  );
}
