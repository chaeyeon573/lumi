import { recruitmentLabel } from '@core/lib/orglinks';
import { publicLinks } from '@core/lib/orglinks';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { t, lang } from '@core/i18n';
import { BadgeCheck, Users, Megaphone, CalendarDays, Bell, MessageCircle, ExternalLink, ShieldCheck, PenSquare, Crown, Plus } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, Cover, Tag, EmptyState, Chip, ChipRow, SampleTag } from '@/components/ui';
import { ActivityCard } from '@/components/cards/ActivityCard';
import { TeamCard } from '@/components/cards/TeamCard';
import { PostCard } from '@/components/cards/PostCard';
import { OpportunityCard } from '@/components/cards/OpportunityCard';
import { OrgPostTypeSheet } from '@/components/create/OrgPostTypeSheet';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import { relativeTime, todayISO } from '@core/lib/format';
import { isTeamActivity } from '@core/lib/discover';
import { listingsOfOrg } from '@core/lib/listings';
import { daysUntil } from '@core/lib/recommend';
import { isSampleOrg } from '@core/lib/sampleorgs';
import { orgJoinState } from '@core/lib/orgjoin';

type Tab = 'about' | 'posts' | 'events' | 'recruit' | 'members';

/** 조직 페이지: 소개 | 게시물 | 행사 | 모집 | 멤버 */
// 링크 이름은 데이터에 영어로 저장돼 있다 — 한국어 화면에서 일반 단어만 바꾼다 (Instagram 같은 서비스 이름은 그대로)
const LINK_LABEL_KO: Record<string, string> = { Website: '웹사이트', Directory: '동아리 명부', 'Lab website': '연구실 웹사이트' };

export function OrgPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'about') as Tab;
  const setTab = (tb: Tab) => setParams(tb === 'about' ? {} : { tab: tb }, { replace: true });
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const schools = useAppStore((s) => s.schools);
  const rooms = useAppStore((s) => s.chatRooms);
  const opps = useAppStore((s) => s.opportunities);
  const [post, setPost] = useState(false);
  const org = orgs.find((o) => o.id === id);
  if (!org) return <div className="min-h-full"><TopBar back title={t('조직')} /><EmptyState emoji="🏛️" title={t('조직을 찾을 수 없어요')} /></div>;
  const school = schools.find((s) => s.id === org.schoolId);
  const sample = isSampleOrg(org.id);
  // 예시 동아리의 링크(instagram.com/example 등)는 남의 실제 페이지로 간다 — 예시엔 바깥 링크를 달지 않는다
  // 학교 로그인 뒤 페이지(CalLink·CampusGroups)는 빼고 공개 링크만
  const links = sample ? [] : publicLinks(org.links);
  const following = v.isFollowing(org.id);
  const isAdmin = org.adminIds.includes(v.me.id);
  const join = orgJoinState(org, v.me.id);
  const en = lang === 'en';
  const apply = () => run(() => api.orgs.apply(org.id, v.me.id), en ? 'Join request sent to the organizers.' : '운영진에게 가입 요청을 보냈어요.');
  // 주 버튼 밑 한 줄 — 누르면 무엇이 누구에게 가는지, 못 누르면 왜인지 (lib/orgjoin)
  const joinNote = join.kind === 'apply'
    ? (en ? `Sends a join request with your Lumi profile to the club's ${join.organizers === 1 ? 'organizer' : `${join.organizers} organizers`} on Lumi. They get a notification and decide.` : `가입 지원을 누르면 Lumi에 있는 운영진 ${join.organizers}명에게 내 프로필과 함께 알림이 가요. 운영진이 정해요.`)
    : join.kind === 'applied' ? (en ? 'Request sent — the organizers decide. You\'ll see it here when you\'re in.' : '가입 요청을 보냈어요 — 운영진이 정해요.')
    : join.kind === 'follow'
      ? [join.why === 'not_recruiting'
        ? (en ? 'Not taking join requests on Lumi right now.' : '지금은 Lumi에서 가입 요청을 받지 않아요.')
        : (en ? 'The organizers aren\'t on Lumi yet, so there\'s no request to send here.' : '운영진이 아직 Lumi에 없어 여기서 보낼 가입 요청은 없어요.'),
        org.joinProcess ? (en ? 'See “How to join” below.' : '아래 ‘가입 절차’를 보세요.') : links.length ? (en ? 'Their own page says how to join.' : '가입 방법은 동아리 페이지에 있어요.') : '',
        following ? '' : (en ? 'Follow to get their new events.' : '팔로우하면 새 행사 소식을 받아요.')].filter(Boolean).join(' ')
    : '';
  const today = todayISO();
  const orgActs = v.visibleActivities.filter((a) => a.orgId === org.id && a.date >= today);
  const events = orgActs.filter((a) => !isTeamActivity(a));
  const recruits = orgActs.filter(isTeamActivity);
  // 이 단체가 올린 공고 + 학교 행사 목록에서 이 단체 이름으로 올라온 모임·행사 (General Meeting 등)
  const hosted = listingsOfOrg(org, opps);
  const listedEvents = hosted.filter((o) => o.type === 'event' && o.date && daysUntil(o.date) >= 0).sort((a, b) => `${a.date} ${a.startTime ?? ''}`.localeCompare(`${b.date} ${b.startTime ?? ''}`));
  const orgOpps = hosted.filter((o) => o.type !== 'event');
  const posts = v.visiblePosts.filter((p) => p.orgId === org.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const room = rooms.find((r) => r.orgId === org.id && r.memberIds.includes(v.me.id));
  const tabs: { key: Tab; label: string; n?: number }[] = [
    { key: 'about', label: t('소개') }, { key: 'posts', label: t('게시물'), n: posts.length }, { key: 'events', label: t('행사'), n: events.length + listedEvents.length }, { key: 'recruit', label: t('모집'), n: recruits.length + orgOpps.length + (org.recruitment?.open ? 1 : 0) }, { key: 'members', label: t('멤버'), n: org.memberIds.length || undefined },
  ];

  return (
    <div className="min-h-full pb-8">
      <TopBar back title={org.name} messages right={isAdmin ? <Button size="sm" variant="ghost" icon={<PenSquare size={15} />} onClick={() => setPost(true)}>{t('올리기')}</Button> : undefined} />
      {/* 커버는 갤러리 첫 사진 — 없으면 색 띠만. 작은 정사각 로고(학교 문장 등)를 가로로 늘리면 흐릿하게 깨진다 */}
      <Cover emoji="" hue={org.logo.hue} url={org.gallery.find((g) => g.url)?.url} className="h-[140px]" size={60} />
      <div className="px-4 -mt-8 relative">
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={64} className="!rounded-2xl ring-4 ring-white -mt-10" />
            <div className="flex-1 min-w-0">
              <h1 className="text-[18px] font-extrabold flex items-center gap-1 leading-tight">{sample && <SampleTag />}{org.name}{org.verified && !sample && <BadgeCheck size={18} className="text-gold shrink-0" />}</h1>
              <div className="text-[12px] text-ink-3 mt-0.5">{school?.name}{org.parent ? ` · ${org.parent}` : ''} · {ORG_TYPE_LABELS[org.type]}</div>
              {sample && <div className="text-[12px] text-ink-3 mt-1">{lang === 'en' ? 'Sample club — made up to show how Lumi works.' : '예시 동아리 — Lumi 사용법을 보여 주려고 만든 거예요.'}</div>}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 text-[12px] text-ink-2">
            {org.followerIds.length > 0 && <span className="flex items-center gap-1"><Users size={13} className="text-ink-3" />{t('팔로워')} <b>{org.followerIds.length}</b></span>}
            {org.memberIds.length > 0 && <span>{t('회원')} <b>{org.memberIds.length}</b></span>}
            {sample ? null : org.verified ? <Tag tone="gold"><BadgeCheck size={11} /> {t('공식 인증')}</Tag> : <Tag>{t('미인증')}</Tag>}
            {(() => { const r = recruitmentLabel(org.recruitment); return r && <Tag tone={r.open ? 'accent' : undefined}>{r.text}</Tag>; })()}
          </div>
          <div className="flex gap-2 mt-4">
            {/* 가입 요청을 받을 운영진이 없거나 모집하지 않으면 팔로우가 주 버튼이다 — '모집 안 함'과 '가입 문의'가 같이 보이지 않게 */}
            <Button full variant={following ? 'secondary' : join.kind === 'follow' ? 'primary' : 'outline'} icon={<Bell size={16} />} onClick={() => run(() => api.relationships.toggleFollow(v.me.id, org.id, 'org'), following ? undefined : t('팔로우했어요. 새 행사 알림을 받아요.'))}>{following ? t('팔로잉') : join.kind === 'follow' ? (en ? 'Get updates' : '소식 받기') : t('팔로우')}</Button>
            {join.kind === 'admin' || join.kind === 'member' ? <Button full variant="secondary" disabled>{isAdmin ? t('운영진') : t('회원')}</Button>
              : join.kind === 'applied' ? <Button full variant="outline" disabled>{en ? 'Request sent' : '요청 보냄'}</Button>
              : join.kind === 'apply' ? <Button full onClick={apply}>{t('가입 지원')}</Button> : null}
            {room && <Button variant="outline" icon={<MessageCircle size={16} />} onClick={() => nav(`/chats/${room.id}`)} />}
          </div>
          {joinNote && <p className="text-[12px] text-ink-3 mt-2 leading-snug">{joinNote}</p>}
        </div>

        <ChipRow className="py-0 mt-3">{tabs.map((tb) => <Chip key={tb.key} size="sm" active={tab === tb.key} onClick={() => setTab(tb.key)}>{tb.label}{tb.n ? <span className="opacity-70 ml-0.5">{tb.n}</span> : null}</Chip>)}</ChipRow>

        {tab === 'about' && (
          <div className="mt-3 space-y-3">
            <div className="card p-4"><p className="text-[14px] text-ink-2 leading-relaxed">{org.description}</p>
              {(links.length || org.dues || org.joinProcess || org.policyNote) ? (
                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  {links.length > 0 && <div className="flex flex-wrap gap-1.5">{links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-surface-2 text-[12px] font-semibold text-ink-2"><ExternalLink size={12} />{lang === 'en' ? l.label : (LINK_LABEL_KO[l.label] ?? l.label)}</a>)}</div>}
                  {org.joinProcess && <div className="text-[13px]"><span className="text-ink-3">{t('가입 절차')} · </span>{org.joinProcess}</div>}
                  {org.dues && <div className="text-[13px]"><span className="text-ink-3">{t('회비')} · </span>{org.dues}</div>}
                  {org.policyNote && <div className="rounded-xl bg-gold-soft px-3 py-2 text-[12px] text-ink-2 flex gap-2"><ShieldCheck size={14} className="text-[#B57A0E] shrink-0 mt-0.5" /><span><b>{t('학교 정책 안내')}</b> · {org.policyNote}</span></div>}
                </div>
              ) : null}
            </div>
            {org.gallery.length > 0 && <div className="card p-4"><b className="text-[14px]">{t('사진과 영상')}</b><div className="flex gap-2 overflow-x-auto hide-scrollbar mt-3">{org.gallery.map((g, i) => <div key={i} className="shrink-0 w-[120px]"><Cover emoji={g.emoji} hue={g.hue} url={g.url} className="h-[120px] rounded-xl" size={40} /><div className="text-[11px] text-ink-3 mt-1 text-center">{g.caption}</div></div>)}</div></div>}
            {org.regularActivities.length > 0 && <div className="card p-4"><b className="text-[14px] flex items-center gap-1.5"><CalendarDays size={15} className="text-primary" />{t('정기 활동')}</b><ul className="mt-2 space-y-1.5">{org.regularActivities.map((r) => <li key={r} className="text-[13px] text-ink-2 flex gap-2"><span className="text-primary">•</span>{r}</li>)}</ul></div>}
            {org.notices.length > 0 && <div className="card p-4"><b className="text-[14px]">{t('공지사항')}</b>
              <div className="mt-2 space-y-3">{org.notices.map((n) => <div key={n.id}><div className="text-[13px] font-semibold">{n.title}</div><div className="text-[12px] text-ink-2">{n.body}</div><div className="text-[11px] text-ink-3">{relativeTime(n.createdAt)}</div></div>)}</div></div>}
          </div>
        )}
        {tab === 'posts' && <div className="mt-3 space-y-3">{posts.length === 0 ? <EmptyState emoji="📝" title={t('아직 게시물이 없어요')} description={isAdmin ? t('소식을 올리면 Feed에도 함께 보여요.') : undefined} action={isAdmin ? <Button size="sm" onClick={() => setPost(true)}>{t('소식 올리기')}</Button> : undefined} /> : posts.map((p) => <PostCard key={p.id} post={p} />)}</div>}
        {tab === 'events' && <div className="mt-3 space-y-2">{isAdmin && <Button full icon={<Plus size={16} />} onClick={() => nav(`/create/activity?kind=org_event&event=1&org=${org.id}`)}>{lang === 'en' ? 'Create Event' : '행사 올리기'}</Button>}{listedEvents.map((o) => <OpportunityCard key={o.id} o={o} variant="row" />)}{events.length === 0 && listedEvents.length > 0 ? null : events.length === 0
          // 날짜가 정해진 행사가 없어도 소개에 적힌 정기 활동(“Group runs Tue/Thu 5pm”)은 여기서도 보인다 — '행사 없음'과 '주 2회 모임'이 엇갈려 보이지 않게
          ? org.regularActivities.length > 0
            ? <div className="card p-4"><b className="text-[14px] flex items-center gap-1.5"><CalendarDays size={15} className="text-primary" />{t('정기 활동')}</b><ul className="mt-2 space-y-1.5">{org.regularActivities.map((r) => <li key={r} className="text-[13px] text-ink-2 flex gap-2"><span className="text-primary">•</span>{r}</li>)}</ul><p className="text-[12px] text-ink-3 mt-2">{en ? 'As the club lists them — no dated events posted on Lumi yet.' : '동아리가 적어 둔 일정이에요 — Lumi에 날짜가 정해진 행사는 아직 없어요.'}</p>{isAdmin && <Button size="sm" className="mt-3" onClick={() => nav(`/create/activity?kind=org_event&org=${org.id}&cat=performance`)}>{t('행사 만들기')}</Button>}</div>
            : <EmptyState emoji="🎪" title={t('예정된 행사가 없어요')} description={isAdmin ? t('행사를 올리면 발견 › 활동에도 보여요.') : following ? undefined : (en ? 'Follow to hear when they post one.' : '팔로우하면 행사가 올라올 때 알려 드려요.')} action={isAdmin ? <Button size="sm" onClick={() => nav(`/create/activity?kind=org_event&org=${org.id}&cat=performance`)}>{t('행사 만들기')}</Button> : undefined} />
          : events.map((a) => <ActivityCard key={a.id} activity={a} variant="row" />)}</div>}
        {tab === 'recruit' && (
          <div className="mt-3 space-y-3">
            {org.recruitment && (
              <div className="card p-4 bg-[linear-gradient(120deg,#FFF4DE,#FFFFFF)]">
                <div className="flex items-center gap-2"><Megaphone size={16} className="text-[#B57A0E]" /><b className="text-[14px]">{recruitmentLabel(org.recruitment)?.text ?? org.recruitment.title}</b></div>
                {org.recruitment.period && !org.recruitment.mode && <div className="text-[12px] text-ink-2 mt-1">{t('모집 기간 ·')} {org.recruitment.period}</div>}
                {org.recruitment.source && <div className="text-[11px] text-ink-3 mt-1">{en ? 'From the club directory' : '학교 단체 목록 기준'}</div>}
                {join.kind === 'apply' && !org.recruitment.source && <Button size="sm" className="mt-3" onClick={apply}>{t('가입 지원')}</Button>}
                {org.recruitment.open && joinNote && join.kind !== 'apply' && <p className="text-[12px] text-ink-3 mt-2">{joinNote}</p>}
              </div>
            )}
            {recruits.map((a) => <TeamCard key={a.id} activity={a} />)}
            {orgOpps.map((o) => <OpportunityCard key={o.id} o={o} variant="row" />)}
            {!org.recruitment && recruits.length === 0 && orgOpps.length === 0 && <EmptyState emoji="📣" title={t('진행 중인 모집이 없어요')} action={isAdmin ? <Button size="sm" onClick={() => nav(`/create/activity?kind=org_event&org=${org.id}&team=1&cat=club`)}>{t('부원 모집 올리기')}</Button> : undefined} />}
          </div>
        )}
        {tab === 'members' && (
          <div className="mt-3 card divide-y divide-line">
            {[...org.adminIds, ...org.memberIds.filter((m) => !org.adminIds.includes(m))].map((mid) => { const u = v.userById(mid); return u && (
              <button key={mid} onClick={() => nav(`/users/${mid}`)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left press">
                <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} />
                <span className="flex-1 min-w-0"><b className="text-[13px] flex items-center gap-1">{u.sample && <SampleTag className="mr-0" />}{u.nickname}{org.adminIds.includes(mid) && <Crown size={12} className="text-gold" />}</b><span className="block text-[11px] text-ink-3 truncate">{u.affiliation.type === 'university' && u.affiliation.showDepartment ? u.affiliation.department : ''}</span></span>
                {org.adminIds.includes(mid) && <Tag tone="gold" className="h-5">{t('운영진')}</Tag>}
              </button>); })}
            <div className="px-3.5 py-3 text-[12px] text-ink-3">{t('팔로워')} {org.followerIds.length} · {t('회원 목록은 조직 설정에 따라 비공개일 수 있어요.')}</div>
          </div>
        )}
      </div>
      <OrgPostTypeSheet open={post} onClose={() => setPost(false)} org={org} />
    </div>
  );
}
