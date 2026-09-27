import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { t } from '@core/i18n';
import { BadgeCheck, Users, Megaphone, CalendarDays, Bell, MessageCircle, ExternalLink, ShieldCheck, PenSquare, Crown, MoreHorizontal, Plus, LogOut } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, Cover, Tag, EmptyState, Chip, ChipRow, BottomSheet, IconButton } from '@/components/ui';
import { ActivityCard } from '@/components/cards/ActivityCard';
import { TeamCard } from '@/components/cards/TeamCard';
import { PostCard } from '@/components/cards/PostCard';
import { OpportunityCard } from '@/components/cards/OpportunityCard';
import { OrgPostTypeSheet } from '@/components/create/OrgPostTypeSheet';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import { GROUP_SCOPE_LABELS, GROUP_SCOPE_EMOJI, scopeOf } from '@core/lib/meet';
import { relativeTime, todayISO } from '@core/lib/format';
import { isTeamActivity } from '@core/lib/discover';

type Tab = 'about' | 'schedule' | 'members' | 'feed';
/** 이전 주소(?tab=posts|events|recruit) 호환 */
const LEGACY_TABS: Record<string, Tab> = { about: 'about', schedule: 'schedule', members: 'members', feed: 'feed', posts: 'feed', events: 'schedule', recruit: 'about' };

/** 그룹·조직 페이지: 소개 | 일정 | 멤버 | 피드 */
export function OrgPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = LEGACY_TABS[params.get('tab') ?? 'about'] ?? 'about';
  const setTab = (tb: Tab) => setParams(tb === 'about' ? {} : { tab: tb }, { replace: true });
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const schools = useAppStore((s) => s.schools);
  const rooms = useAppStore((s) => s.chatRooms);
  const opps = useAppStore((s) => s.opportunities);
  const [post, setPost] = useState(false);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const org = orgs.find((o) => o.id === id);
  if (!org) return <div className="min-h-full"><TopBar back title={t('그룹')} /><EmptyState emoji="🏛️" title={t('그룹을 찾을 수 없어요')} /></div>;
  const school = schools.find((s) => s.id === org.schoolId);
  const scope = scopeOf(org);
  const following = v.isFollowing(org.id);
  const isAdmin = org.adminIds.includes(v.me.id);
  const isMember = org.memberIds.includes(v.me.id) || isAdmin;
  const isApplicant = org.applicantIds.includes(v.me.id);
  const today = todayISO();
  const orgActs = v.visibleActivities.filter((a) => a.orgId === org.id);
  const meets = orgActs.filter((a) => !isTeamActivity(a));
  const upcoming = meets.filter((a) => a.date >= today).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const past = meets.filter((a) => a.date < today).sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)).slice(0, 5);
  const recruits = orgActs.filter((a) => isTeamActivity(a) && a.date >= today);
  const orgOpps = opps.filter((o) => o.orgId === org.id);
  const posts = v.visiblePosts.filter((p) => p.orgId === org.id || p.groupId === org.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const room = rooms.find((r) => r.orgId === org.id && r.memberIds.includes(v.me.id));
  const memberIds = [...org.adminIds, ...org.memberIds.filter((m) => !org.adminIds.includes(m))];
  const memberCount = memberIds.length;
  const hasRecruit = !!org.recruitment || recruits.length > 0 || orgOpps.length > 0;
  const scopeExtra = scope === 'city' ? org.city : school?.name;
  const tabs: { key: Tab; label: string; n?: number }[] = [
    { key: 'about', label: t('소개') }, { key: 'schedule', label: t('일정'), n: upcoming.length }, { key: 'members', label: t('멤버'), n: memberCount }, { key: 'feed', label: t('피드'), n: posts.length },
  ];

  const join = async () => {
    setBusy(true);
    try { await run(() => api.orgs.apply(org.id, v.me.id), org.joinPolicy === 'open' ? t('그룹에 가입했어요.') : t('가입 신청을 보냈어요.')); } catch { /* toast */ } finally { setBusy(false); }
  };
  const leave = async () => {
    setBusy(true);
    try { await run(() => api.orgs.leave(org.id, v.me.id), isApplicant ? t('가입 신청을 취소했어요.') : t('그룹에서 나왔어요.')); setMore(false); } catch { /* toast */ } finally { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-8">
      <TopBar back title={org.name} messages right={<>
        {isAdmin && <Button size="sm" variant="ghost" icon={<PenSquare size={15} />} onClick={() => setPost(true)}>{t('올리기')}</Button>}
        {(isMember || isApplicant) && <IconButton onClick={() => setMore(true)} aria-label={t('더 보기')}><MoreHorizontal size={20} /></IconButton>}
      </>} />
      <Cover emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} className="h-[140px]" size={60} />
      <div className="px-4 -mt-8 relative">
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={64} className="!rounded-2xl ring-4 ring-white -mt-10" />
            <div className="flex-1 min-w-0">
              <h1 className="text-[18px] font-extrabold flex items-center gap-1 leading-tight">{org.name}{org.verified && <BadgeCheck size={18} className="text-gold shrink-0" />}</h1>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Tag tone="primary" className="h-5 text-[11px]">{GROUP_SCOPE_EMOJI[scope]} {GROUP_SCOPE_LABELS[scope]}</Tag>
                {scopeExtra && <span className="text-[12px] text-ink-3 truncate">{scopeExtra}</span>}
                {org.type !== 'community' && <span className="text-[12px] text-ink-3">· {ORG_TYPE_LABELS[org.type]}{org.parent ? ` · ${org.parent}` : ''}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 text-[12px] text-ink-2 flex-wrap">
            <span className="flex items-center gap-1"><Users size={13} className="text-ink-3" />{t('멤버')} <b>{memberCount}</b></span>
            <span>{t('팔로워')} <b>{org.followerIds.length}</b></span>
            {org.joinPolicy === 'open' ? <Tag tone="mint" className="h-5">{t('바로 가입')}</Tag> : org.joinPolicy === 'approval' ? <Tag className="h-5">{t('승인 가입')}</Tag> : null}
            {org.verified && <Tag tone="gold" className="h-5"><BadgeCheck size={11} /> {t('공식 인증')}</Tag>}
            {org.recruitment?.open && <Tag tone="accent" className="h-5">{t('모집 중')}</Tag>}
          </div>
          <div className="flex gap-2 mt-4">
            {isMember ? <Button full variant="secondary" disabled>{isAdmin ? t('운영진') : t('가입됨')}</Button>
              : isApplicant ? <Button full variant="outline" disabled>{t('신청됨')}</Button>
              : <Button full loading={busy} onClick={join}>{t('가입하기')}</Button>}
            <Button variant={following ? 'secondary' : 'outline'} icon={<Bell size={16} />} aria-label={following ? t('팔로잉') : t('팔로우')} onClick={() => run(() => api.relationships.toggleFollow(v.me.id, org.id, 'org'), following ? undefined : t('팔로우했어요. 새 소식 알림을 받아요.'))} />
            {room && <Button variant="outline" icon={<MessageCircle size={16} />} aria-label={t('채팅')} onClick={() => nav(`/chats/${room.id}`)} />}
          </div>
        </div>

        <ChipRow className="py-0 mt-3">{tabs.map((tb) => <Chip key={tb.key} size="sm" active={tab === tb.key} onClick={() => setTab(tb.key)}>{tb.label}{tb.n ? <span className="opacity-70 ml-0.5">{tb.n}</span> : null}</Chip>)}</ChipRow>

        {tab === 'about' && (
          <div className="mt-3 space-y-3">
            <div className="card p-4"><p className="text-[14px] text-ink-2 leading-relaxed">{org.description}</p>
              {(org.links?.length || org.dues || org.joinProcess || org.policyNote) ? (
                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  {org.links && org.links.length > 0 && <div className="flex flex-wrap gap-1.5">{org.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-surface-2 text-[12px] font-semibold text-ink-2"><ExternalLink size={12} />{l.label}</a>)}</div>}
                  {org.joinProcess && <div className="text-[13px]"><span className="text-ink-3">{t('가입 절차')} · </span>{org.joinProcess}</div>}
                  {org.dues && <div className="text-[13px]"><span className="text-ink-3">{t('회비')} · </span>{org.dues}</div>}
                  {org.policyNote && <div className="rounded-xl bg-gold-soft px-3 py-2 text-[12px] text-ink-2 flex gap-2"><ShieldCheck size={14} className="text-[#B57A0E] shrink-0 mt-0.5" /><span><b>{t('학교 정책 안내')}</b> · {org.policyNote}</span></div>}
                </div>
              ) : null}
            </div>
            {hasRecruit && (
              <div className="space-y-3">
                <p className="text-[13px] font-semibold text-ink-3 px-1">{t('모집')}</p>
                {org.recruitment && (
                  <div className="card p-4 bg-[linear-gradient(120deg,#FFF4DE,#FFFFFF)]">
                    <div className="flex items-center gap-2"><Megaphone size={16} className="text-[#B57A0E]" /><b className="text-[14px]">{org.recruitment.title}</b>{org.recruitment.open && <Tag tone="accent">{t('모집 중')}</Tag>}</div>
                    <div className="text-[12px] text-ink-2 mt-1">{t('모집 기간 ·')} {org.recruitment.period}</div>
                    {!isMember && !isApplicant && org.recruitment.open && <Button size="sm" className="mt-3" loading={busy} onClick={join}>{t('가입하기')}</Button>}
                  </div>
                )}
                {recruits.map((a) => <TeamCard key={a.id} activity={a} />)}
                {orgOpps.map((o) => <OpportunityCard key={o.id} o={o} variant="row" />)}
              </div>
            )}
            {org.gallery.length > 0 && <div className="card p-4"><b className="text-[14px]">{t('사진과 영상')}</b><div className="flex gap-2 overflow-x-auto hide-scrollbar mt-3">{org.gallery.map((g, i) => <div key={i} className="shrink-0 w-[120px]"><Cover emoji={g.emoji} hue={g.hue} url={g.url} className="h-[120px] rounded-xl" size={40} /><div className="text-[11px] text-ink-3 mt-1 text-center">{g.caption}</div></div>)}</div></div>}
            {org.regularActivities.length > 0 && <div className="card p-4"><b className="text-[14px] flex items-center gap-1.5"><CalendarDays size={15} className="text-primary" />{t('정기 활동')}</b><ul className="mt-2 space-y-1.5">{org.regularActivities.map((r) => <li key={r} className="text-[13px] text-ink-2 flex gap-2"><span className="text-primary">•</span>{r}</li>)}</ul></div>}
            <div className="card p-4"><b className="text-[14px]">{t('공지사항')}</b>
              {org.notices.length === 0 && <p className="text-[13px] text-ink-3 mt-2">{t('공지가 없어요.')}</p>}
              <div className="mt-2 space-y-3">{org.notices.map((n) => <div key={n.id}><div className="text-[13px] font-semibold">{n.title}</div><div className="text-[12px] text-ink-2">{n.body}</div><div className="text-[11px] text-ink-3">{relativeTime(n.createdAt)}</div></div>)}</div></div>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="mt-3 space-y-3">
            {isMember && <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => nav(`/meet/create?org=${org.id}`)}>{t('이 그룹에서 모임 만들기')}</Button>}
            {upcoming.length === 0 && past.length === 0
              ? <EmptyState emoji="📅" title={t('예정된 모임이 없어요')} description={isMember ? t('첫 모임을 열어보세요. 그룹 멤버에게 바로 보여요.') : t('가입하면 이 그룹의 모임에 참여할 수 있어요.')} />
              : (<>
                {upcoming.map((a) => <ActivityCard key={a.id} activity={a} variant="row" />)}
                {past.length > 0 && <p className="text-[12px] font-semibold text-ink-3 px-1 pt-2">{t('지난 모임')}</p>}
                {past.map((a) => <ActivityCard key={a.id} activity={a} variant="row" className="opacity-70" />)}
              </>)}
          </div>
        )}

        {tab === 'members' && (
          <div className="mt-3 card divide-y divide-line">
            {memberIds.map((mid) => { const u = v.userById(mid); return u && (
              <button key={mid} onClick={() => nav(`/users/${mid}`)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left press">
                <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} />
                <span className="flex-1 min-w-0"><b className="text-[13px] flex items-center gap-1">{u.nickname}{org.adminIds.includes(mid) && <Crown size={12} className="text-gold" />}</b><SchoolBadge user={u} size="sm" className="text-[11px] font-medium text-ink-3" /></span>
                {org.adminIds.includes(mid) && <Tag tone="gold" className="h-5">{t('운영진')}</Tag>}
              </button>); })}
            {memberIds.length === 0 && <div className="px-3.5 py-6 text-center text-[13px] text-ink-3">{t('아직 멤버가 없어요')}</div>}
            <div className="px-3.5 py-3 text-[12px] text-ink-3">{t('팔로워')} {org.followerIds.length} · {t('회원 목록은 조직 설정에 따라 비공개일 수 있어요.')}</div>
          </div>
        )}

        {tab === 'feed' && (
          <div className="mt-3 space-y-3">
            {isMember && <Button size="sm" variant="outline" icon={<PenSquare size={14} />} onClick={() => nav(`/create/post?group=${org.id}`)}>{t('이 그룹에 글쓰기')}</Button>}
            {posts.length === 0
              ? <EmptyState emoji="📝" title={t('아직 게시물이 없어요')} description={isMember ? t('그룹 멤버에게만 보이는 글을 올릴 수 있어요.') : undefined} />
              : posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
      <OrgPostTypeSheet open={post} onClose={() => setPost(false)} org={org} />
      <BottomSheet open={more} onClose={() => setMore(false)} title={org.name}>
        <div className="space-y-2">
          {room && <button onClick={() => { setMore(false); nav(`/chats/${room.id}`); }} className="w-full flex items-center gap-3 rounded-2xl p-3 bg-surface-2 press text-left"><span className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0"><MessageCircle size={18} /></span><span className="text-[14px] font-semibold">{t('그룹 채팅')}</span></button>}
          {isMember && !isAdmin && <button onClick={leave} disabled={busy} className="w-full flex items-center gap-3 rounded-2xl p-3 bg-surface-2 press text-left"><span className="h-10 w-10 rounded-xl bg-danger-soft text-danger grid place-items-center shrink-0"><LogOut size={18} /></span><span className="text-[14px] font-semibold text-danger">{t('나가기')}</span></button>}
          {isApplicant && <button onClick={leave} disabled={busy} className="w-full flex items-center gap-3 rounded-2xl p-3 bg-surface-2 press text-left"><span className="h-10 w-10 rounded-xl bg-surface text-ink-2 grid place-items-center shrink-0"><LogOut size={18} /></span><span className="text-[14px] font-semibold">{t('신청 취소')}</span></button>}
          {isAdmin && <p className="text-[12px] text-ink-3 px-1">{t('운영진은 그룹을 넘긴 뒤 나갈 수 있어요.')}</p>}
        </div>
      </BottomSheet>
    </div>
  );
}
