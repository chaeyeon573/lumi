import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BadgeCheck, CalendarDays, ClipboardList, ExternalLink, Globe, LogOut, Megaphone, MessageCircle, Plus, Share2, ShieldCheck, Users, Wallet } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Organization } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { publicLinks, recruitmentLabel } from '@core/lib/orglinks';
import { orgJoinState, type OrgJoin } from '@core/lib/orgjoin';
import { isSampleOrg } from '@core/lib/sampleorgs';
import { audienceFits, listingsOfOrg } from '@core/lib/listings';
import { daysUntil } from '@core/lib/recommend';
import { todayISO } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { Avatar, BottomSheet, SampleTag } from '@/components/ui';
import { PostCard } from '@/components/cards/PostCard';
import { affiliationText } from '@/components/cards/PersonCard';
import { OrgPostTypeSheet } from '@/components/create/OrgPostTypeSheet';
import {
  BackHeader, HeaderIcon, HeroBanner, Badge, Btn, SegTabs, TextCard, InfoRows, InfoNote, PersonCard, RowCard, EmptyCard, EmptyState, type InfoRow,
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

/**
 * Community (PDF S022 About · S023 Feed · S024 Events · S025 Members) — tabs in ?tab=.
 * HeroBanner (the club's real logo when there is one), big name, type badge + Follow, SegTabs.
 * Joining follows lib/orgjoin: Request Membership only when organizers on Lumi would receive it; groups started on
 * Lumi use their join policy (approval → S091 requests, open → join now).
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
  const room = rooms.find((r) => r.orgId === org.id && r.memberIds.includes(v.me.id));
  const inGroup = join.kind === 'admin' || join.kind === 'member';
  // 마지막 운영진은 나갈 수 없다 (서버 orgs.leave 와 같은 규칙) — 메뉴에 이유를 그대로 적는다
  const lastOrganizer = isAdmin && !org.adminIds.some((a) => a !== v.me.id);
  const leave = () => { setLeaving(false); run(() => api.orgs.leave(org.id, v.me.id), en ? `You left ${org.name}.` : `${org.name}에서 나왔어요.`).catch(() => {}); };
  const follow = () => run(() => api.relationships.toggleFollow(v.me.id, org.id, 'org'), following ? undefined : (en ? 'Following — you’ll hear about new events.' : '팔로우했어요. 새 행사 소식을 받아요.')).catch(() => {});

  return (
    <div className="min-h-full bg-bg pb-10">
      <BackHeader title={`${en ? 'Community' : '커뮤니티'} — ${TAB_LABEL[tab]}`} onMore={() => setMenu(true)}
        right={room ? <HeaderIcon label={en ? 'Group chat' : '단체 채팅'} onClick={() => nav(`/chats/${room.id}`)}><MessageCircle size={22} /></HeaderIcon> : undefined} />
      <div className="px-4 pt-2">
        <HeroBanner tone={CLUB_TONE[org.type]} icon={org.logo.url ? <Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={64} /> : <Users size={40} strokeWidth={1.8} />} />
        <h1 className="ha-title mt-5 leading-[1.12]">{sample && <SampleTag className="align-middle" />}{org.name}</h1>
        <div className="flex items-center gap-2 mt-3">
          <Badge tone={CLUB_TONE[org.type]}>{ORG_BADGE[org.type]}</Badge>
          {org.verified && !sample && <Badge tone="neutral"><BadgeCheck size={13} className="mr-1" />{en ? 'Verified' : '인증'}</Badge>}
          {org.createdBy && <Badge tone="neutral">{en ? 'Started on Lumi' : 'Lumi에서 시작'}</Badge>}
          <span className="flex-1" />
          {!isAdmin && <Btn size="sm" variant="outline" onClick={follow} className={cn(following && 'text-sel-fg border-sel-line')}>{following ? (en ? 'Following' : '팔로잉') : (en ? 'Follow' : '팔로우')}</Btn>}
        </div>
        {sample && <p className="text-[12.5px] text-ink-3 mt-2">{en ? 'Sample club — made up to show how Lumi works.' : '예시 동아리 — Lumi 사용법을 보여 주려고 만든 거예요.'}</p>}
      </div>
      <SegTabs className="mx-4 mt-3" tabs={TABS.map((k) => ({ key: k, label: TAB_LABEL[k] }))} value={tab} onChange={setTab} />
      <div className="px-4 pt-4">
        {tab === 'about' && <About org={org} join={join} following={following} sample={sample} />}
        {tab === 'feed' && <Feed org={org} isAdmin={isAdmin} />}
        {tab === 'events' && <Events org={org} isAdmin={isAdmin} following={following} />}
        {tab === 'members' && <Members org={org} />}
      </div>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={org.name}>
        <div className="space-y-1 pb-1">
          <MenuItem icon={<Share2 size={18} />} label={en ? 'Copy link' : '링크 복사'} onClick={() => { setMenu(false); void navigator.clipboard?.writeText(window.location.href.split('?')[0]).catch(() => {}); showToast(en ? 'Link copied' : '링크를 복사했어요'); }} />
          {isAdmin && <MenuItem icon={<ClipboardList size={18} />} label={en ? 'Membership requests' : '가입 요청'} onClick={() => { setMenu(false); nav(`/orgs/${org.id}/requests`); }} />}
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

/** what the Membership row says — who decides, and that following is not membership */
function membershipRow(org: Organization, join: OrgJoin): InfoRow {
  const caption = en ? 'Following never grants private access' : '팔로우는 회원 권한이 아니에요';
  const value = join.kind === 'admin' ? (en ? 'You organize this group' : '내가 운영하는 단체')
    : join.kind === 'member' ? (en ? 'You’re a member' : '회원이에요')
    : join.kind === 'applied' ? (en ? 'Request sent — organizers decide' : '요청 보냄 — 운영진이 정해요')
    : join.kind === 'join' ? (en ? 'Open — anyone at school can join' : '열림 — 누구나 가입')
    : join.kind === 'apply' ? (en ? 'Approval required' : '승인 필요')
    : join.why === 'not_recruiting' ? (en ? 'Not taking requests on Lumi' : 'Lumi에서 가입 요청을 받지 않아요')
    : (en ? 'Organizers aren’t on Lumi yet' : '운영진이 아직 Lumi에 없어요');
  const recruit = recruitmentLabel(org.recruitment);
  return { tone: 'mint', icon: org.joinPolicy === 'open' ? <Users size={19} /> : <ShieldCheck size={19} />, label: en ? 'Membership' : '회원', value, caption: recruit && !org.joinPolicy ? `${recruit.text} · ${caption}` : caption };
}

/** S022 — About card, public page, membership, how to join; one outline action (Request Membership / Join) */
function About({ org, join, following, sample }: { org: Organization; join: OrgJoin; following: boolean; sample: boolean }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  // 예시 동아리의 링크는 남의 실제 페이지로 간다 — 예시엔 바깥 링크를 달지 않는다. 학교 로그인 뒤 페이지는 빼고
  const links = sample ? [] : publicLinks(org.links);
  const rows: InfoRow[] = [];
  links.slice(0, 3).forEach((l, i) => rows.push({
    tone: 'ice', icon: <Globe size={19} />, label: i === 0 ? (en ? 'Public page' : '공개 페이지') : (en ? 'Also on' : '다른 곳'),
    value: i === 0 && l.label === 'Website' ? (en ? 'Visit organization website' : '단체 웹사이트') : (en ? l.label : (LINK_LABEL_KO[l.label] ?? l.label)),
    caption: hostOf(l.url), onClick: () => window.open(l.url, '_blank', 'noopener'), right: <ExternalLink size={17} className="text-ink-3 shrink-0" />,
  }));
  rows.push(membershipRow(org, join));
  if (org.joinProcess) rows.push({ tone: 'lav', icon: <ClipboardList size={19} />, label: en ? 'How to join' : '가입 절차', value: org.joinProcess });
  if (org.dues) rows.push({ tone: 'peach', icon: <Wallet size={19} />, label: en ? 'Dues' : '회비', value: org.dues });
  if (org.regularActivities.length) rows.push({ tone: 'ice', icon: <CalendarDays size={19} />, label: en ? 'Regular activities' : '정기 활동', value: org.regularActivities[0], caption: org.regularActivities.slice(1, 3).join(' · ') || undefined });
  const ask = async () => {
    setBusy(true);
    try { await run(() => api.orgs.apply(org.id, v.me.id), join.kind === 'join' ? (en ? `You joined ${org.name}.` : `${org.name}에 가입했어요.`) : (en ? 'Request sent to the organizers.' : '운영진에게 가입 요청을 보냈어요.')); } catch { /* toast */ } finally { setBusy(false); }
  };
  const requests = org.applicantIds.length;
  return (
    <div className="space-y-3">
      {org.description && <TextCard>{org.description}</TextCard>}
      <InfoRows rows={rows} />
      {org.policyNote && <InfoNote>{org.policyNote}</InfoNote>}
      {join.kind === 'admin' && (
        <RowCard tone="rose" icon={<ClipboardList size={22} />} title={en ? 'Membership requests' : '가입 요청'}
          sub={requests ? (en ? `${requests} waiting for you` : `${requests}명이 기다려요`) : (en ? 'New requests show up here' : '새 요청이 여기에 와요')} onClick={() => nav(`/orgs/${org.id}/requests`)}
          right={requests ? <Badge tone="sel">{requests}</Badge> : undefined} />
      )}
      {(join.kind === 'apply' || join.kind === 'join') && (
        <div>
          <Btn variant="outline" loading={busy} onClick={ask}>{join.kind === 'join' ? (en ? 'Join Group' : '가입하기') : (en ? 'Request Membership' : '가입 요청')}</Btn>
          <InfoNote className="mt-2.5">{join.kind === 'join'
            ? (en ? 'You join right away; the organizers see you in Members.' : '바로 가입돼요. 운영진은 멤버에서 볼 수 있어요.')
            : (en ? `Sends your Lumi profile to ${join.organizers === 1 ? 'the organizer' : `${join.organizers} organizers`}. They decide.` : `운영진 ${join.organizers}명에게 내 Lumi 프로필이 가요. 운영진이 정해요.`)}</InfoNote>
        </div>
      )}
      {join.kind === 'applied' && <Btn variant="outline" disabled>{en ? 'Request sent' : '요청 보냄'}</Btn>}
      {join.kind === 'follow' && !following && <InfoNote>{en ? 'Follow to hear about their new events.' : '팔로우하면 새 행사 소식을 받아요.'}</InfoNote>}
    </div>
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
        ? <EmptyCard title={en ? 'No posts yet' : '아직 게시물이 없어요'} sub={isAdmin ? (en ? 'Updates you post here also show in Feed.' : '여기 올린 소식은 Feed 에도 보여요.') : undefined} />
        : posts.map((p) => <PostCard key={p.id} post={p} />)}
      <InfoNote>{en ? 'Only posts you are allowed to view appear here.' : '볼 수 있는 글만 보여요.'}</InfoNote>
      <OrgPostTypeSheet open={post} onClose={() => setPost(false)} org={org} />
    </div>
  );
}

/** S024 — dated events from the school's listings (ListingCard) and events the group posted on Lumi (MeetupCard) */
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
  return (
    <div className="space-y-3">
      {isAdmin && <Btn variant="outline" icon={<Plus size={16} />} onClick={create}>{en ? 'Create Event' : '행사 올리기'}</Btn>}
      {listed.map((o) => <ListingItem key={o.id} o={o} saved={saved.ids.has(o.id)} onSave={() => saved.toggle(o)} onOpen={() => nav(`/opportunities/${o.id}`)} />)}
      {acts.map((a) => <ClubEventItem key={a.id} a={a} />)}
      {others.map((o) => <ListingItem key={o.id} o={o} saved={saved.ids.has(o.id)} onSave={() => saved.toggle(o)} onOpen={() => nav(`/opportunities/${o.id}`)} />)}
      {empty && (org.regularActivities.length
        // 날짜가 정해진 행사가 없어도 정기 활동은 보인다 — '행사 없음'과 '주 2회 모임'이 엇갈려 보이지 않게
        ? <TextCard title={en ? 'Regular activities' : '정기 활동'}>{org.regularActivities.join(' · ')}<div className="text-[12.5px] text-ink-3 mt-1.5">{en ? 'As the group lists them — no dated events on Lumi yet.' : '단체가 적어 둔 일정이에요 — 날짜가 정해진 행사는 아직 없어요.'}</div></TextCard>
        : <EmptyCard title={en ? 'No upcoming events' : '예정된 행사가 없어요'} sub={isAdmin ? (en ? 'Events you post appear in Explore too.' : '올린 행사는 Explore 에도 보여요.') : following ? undefined : (en ? 'Follow to hear when they post one.' : '팔로우하면 행사가 올라올 때 알려 드려요.')} />)}
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
