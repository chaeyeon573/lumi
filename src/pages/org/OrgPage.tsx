import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { t, lang } from '@core/i18n';
import { BadgeCheck, Users, Megaphone, CalendarDays, Bell, MessageCircle, ExternalLink, ShieldCheck, PenSquare, Crown } from 'lucide-react';
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

type Tab = 'about' | 'posts' | 'events' | 'recruit' | 'members';

/** 조직 페이지: 소개 | 게시물 | 행사 | 모집 | 멤버 */
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
  const links = sample ? [] : org.links ?? [];
  const following = v.isFollowing(org.id);
  const isMember = org.memberIds.includes(v.me.id);
  const isAdmin = org.adminIds.includes(v.me.id);
  const isApplicant = org.applicantIds.includes(v.me.id);
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
            {org.recruitment?.open && <Tag tone="accent">{t('모집 중')}</Tag>}
          </div>
          <div className="flex gap-2 mt-4">
            <Button full variant={following ? 'secondary' : 'outline'} icon={<Bell size={16} />} onClick={() => run(() => api.relationships.toggleFollow(v.me.id, org.id, 'org'), following ? undefined : t('팔로우했어요. 새 행사 알림을 받아요.'))}>{following ? t('팔로잉') : t('팔로우')}</Button>
            {isMember ? <Button full variant="secondary" disabled>{isAdmin ? t('운영진') : t('회원')}</Button> : isApplicant ? <Button full variant="outline" disabled>{t('지원 완료')}</Button> :
              <Button full onClick={() => run(() => api.orgs.apply(org.id, v.me.id), t('지원서를 보냈어요.'))}>{org.recruitment?.open ? t('가입 지원') : t('가입 문의')}</Button>}
            {room && <Button variant="outline" icon={<MessageCircle size={16} />} onClick={() => nav(`/chats/${room.id}`)} />}
          </div>
        </div>

        <ChipRow className="py-0 mt-3">{tabs.map((tb) => <Chip key={tb.key} size="sm" active={tab === tb.key} onClick={() => setTab(tb.key)}>{tb.label}{tb.n ? <span className="opacity-70 ml-0.5">{tb.n}</span> : null}</Chip>)}</ChipRow>

        {tab === 'about' && (
          <div className="mt-3 space-y-3">
            <div className="card p-4"><p className="text-[14px] text-ink-2 leading-relaxed">{org.description}</p>
              {(links.length || org.dues || org.joinProcess || org.policyNote) ? (
                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  {links.length > 0 && <div className="flex flex-wrap gap-1.5">{links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-surface-2 text-[12px] font-semibold text-ink-2"><ExternalLink size={12} />{l.label}</a>)}</div>}
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
        {tab === 'events' && <div className="mt-3 space-y-2">{listedEvents.map((o) => <OpportunityCard key={o.id} o={o} variant="row" />)}{events.length === 0 && listedEvents.length > 0 ? null : events.length === 0 ? <EmptyState emoji="🎪" title={t('예정된 행사가 없어요')} description={t('행사를 올리면 발견 › 활동에도 보여요.')} action={isAdmin ? <Button size="sm" onClick={() => nav(`/create/activity?kind=org_event&org=${org.id}&cat=performance`)}>{t('행사 만들기')}</Button> : undefined} /> : events.map((a) => <ActivityCard key={a.id} activity={a} variant="row" />)}</div>}
        {tab === 'recruit' && (
          <div className="mt-3 space-y-3">
            {org.recruitment && (
              <div className="card p-4 bg-[linear-gradient(120deg,#FFF4DE,#FFFFFF)]">
                <div className="flex items-center gap-2"><Megaphone size={16} className="text-[#B57A0E]" /><b className="text-[14px]">{org.recruitment.title}</b>{org.recruitment.open && <Tag tone="accent">{t('모집 중')}</Tag>}</div>
                <div className="text-[12px] text-ink-2 mt-1">{t('모집 기간 ·')} {org.recruitment.period}</div>
                {!isMember && !isApplicant && org.recruitment.open && <Button size="sm" className="mt-3" onClick={() => run(() => api.orgs.apply(org.id, v.me.id), t('지원서를 보냈어요.'))}>{t('가입 지원')}</Button>}
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
