import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarCheck } from 'lucide-react';
import { lang } from '@core/i18n';
import { Avatar } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ORG_TYPE_LABELS, ROLE_LABELS } from '@core/lib/labels';
import { friendsOf } from '@core/lib/relations';
import { todayISO, formatDateTime } from '@core/lib/format';
import { questionById } from '@core/data/prompts';
import { shareOrCopy } from '@/lib/native';
import { BrandHeader, Screen, Btn, ChoiceChips, RowCard, SectionHeader, ErrorScreen, LoadingCards, InfoNote, cardCls } from '@/components/ha';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
type PlanTab = 'upcoming' | 'past' | 'created';

/**
 * Profile 탭 (PDF S071) — 머리 Lumi + 설정·메시지, 얼굴·이름·학교, 소개, Edit / Share, 그룹·친구 수,
 * Get to know me, My Communities, My Events & Meetups (Upcoming · Past · Created), 아래 Saved · My Posts · Settings.
 * 예전 Me 탭의 시간표·좌석 알림·내 라이드는 여기서 뺐다 (시간표는 Schedule 탭, 좌석·라이드는 Harness A 에 없음).
 */
export function ProfilePage() {
  const nav = useNavigate();
  const v = useViewer();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const activities = useAppStore((s) => s.activities);
  const participations = useAppStore((s) => s.participations);
  const orgs = useAppStore((s) => s.organizations);
  const showToast = useAppStore((s) => s.showToast);
  const [tab, setTab] = useState<PlanTab>('upcoming');
  const me = v.me;
  const header = <BrandHeader actions={['settings', 'messages']} />;
  if (status === 'loading') return <Screen>{header}<LoadingCards className="px-4 pt-4" /></Screen>;
  if (status === 'error') return <Screen>{header}<ErrorScreen message={error ?? undefined} onRetry={init} /></Screen>;

  const friends = friendsOf(v.snap, me.id).length;
  const myOrgs = orgs.filter((o) => o.memberIds.includes(me.id) || o.adminIds.includes(me.id) || o.followerIds.includes(me.id));
  const today = todayISO();
  const mine = activities.filter((a) => a.hostId === me.id || participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'approved'));
  const plans = (tab === 'created' ? activities.filter((a) => a.hostId === me.id) : mine.filter((a) => (tab === 'upcoming' ? a.date >= today : a.date < today)))
    .sort((a, b) => (tab === 'past' ? -1 : 1) * (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const aff = me.affiliation.type === 'university' ? me.affiliation : null;
  const prompt = me.prompts[0];
  const share = async () => {
    const url = `${window.location.origin}/users/${me.id}`;
    const r = await shareOrCopy({ title: me.nickname, text: en ? `${me.nickname} on Lumi` : `Lumi 의 ${me.nickname}`, url, copy: url });
    if (r === 'copied') showToast(en ? 'Profile link copied' : '프로필 링크를 복사했어요');
  };

  return (
    <Screen>
      {header}
      <div className="px-4">
        <div className="flex items-center gap-4 mt-3">
          <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={76} />
          <div className="min-w-0">
            <h1 className="ha-title truncate">{me.nickname}</h1>
            {aff?.schoolName && <div className="text-[13px] text-ink-2 truncate mt-1">{aff.schoolName}</div>}
            {aff && <div className="text-[13px] text-ink-3 truncate">{[aff.department, ROLE_LABELS[aff.role]].filter(Boolean).join(' · ')}</div>}
          </div>
        </div>
        {me.bio && <p className="text-[14.5px] text-ink mt-4 leading-snug">{me.bio}</p>}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Btn variant="outline" onClick={() => nav('/profile/edit')}>{en ? 'Edit Profile' : '프로필 편집'}</Btn>
          <Btn variant="outline" onClick={share}>{en ? 'Share Profile' : '프로필 공유'}</Btn>
        </div>
        <div className="flex gap-6 mt-4 text-[14px] text-ink-2">
          <button onClick={() => nav('/profile/communities')} className="press"><b className="text-ink">{myOrgs.length}</b> {en ? 'Groups' : '그룹'}</button>
          <button onClick={() => nav('/profile/friends')} className="press"><b className="text-ink">{friends}</b> {en ? 'Friends' : '친구'}</button>
        </div>

        <section className="mt-7">
          <SectionHeader title={en ? 'Get to know me' : '나를 소개해요'} action={en ? 'Edit' : '편집'} onAction={() => nav('/profile/prompts')} />
          {prompt?.answer ? (
            <button onClick={() => nav('/profile/prompts')} className={cn(cardCls, 'w-full p-4 text-left press')}>
              <span className="block text-[12px] text-ink-3">{questionById(prompt.questionId)?.text}</span>
              <span className="block text-[17px] font-bold leading-snug mt-1">{prompt.answer}</span>
            </button>
          ) : (
            <RowCard tone="lav" icon={<Users size={21} />} title={en ? 'Add a few short answers' : '짧은 답 몇 개 더하기'} sub={en ? 'Optional — helps people know what to ask you to.' : '선택 — 무엇을 같이 할지 알기 쉬워져요.'} onClick={() => nav('/profile/prompts')} />
          )}
        </section>

        <section className="mt-7">
          <SectionHeader title={en ? 'My Communities' : '내 커뮤니티'} action={myOrgs.length > 2 ? (en ? 'See all' : '모두 보기') : undefined} onAction={() => nav('/profile/communities')} />
          <div className="space-y-3">
            {myOrgs.length === 0
              ? <RowCard tone="rose" icon={<Users size={21} />} title={en ? 'Find your communities' : '내 커뮤니티 찾기'} sub={en ? 'Follow interests. Verify membership separately.' : '관심사를 팔로우하세요. 회원 인증은 따로 해요.'} onClick={() => nav('/explore/clubs')} />
              : myOrgs.slice(0, 2).map((o) => <RowCard key={o.id} tone="rose" icon={<Users size={21} />} title={o.name} sub={[o.memberIds.includes(me.id) ? (en ? 'Member' : '회원') : (en ? 'Followed' : '팔로우'), ORG_TYPE_LABELS[o.type]].join(' · ')} onClick={() => nav(`/orgs/${o.id}`)} />)}
          </div>
        </section>

        <section className="mt-7">
          <SectionHeader title={en ? 'My Events & Meetups' : '내 행사·모임'} />
          <ChoiceChips value={tab} onChange={setTab} options={[{ value: 'upcoming', label: en ? 'Upcoming' : '다가오는' }, { value: 'past', label: en ? 'Past' : '지난' }, { value: 'created', label: en ? 'Created' : '만든' }]} />
          <div className="space-y-3 mt-3">
            {plans.slice(0, 3).map((a) => <RowCard key={a.id} tone="ice" icon={<CalendarCheck size={21} />} title={a.title} sub={formatDateTime(a.date, a.startTime)} onClick={() => nav(`/activities/${a.id}`)} />)}
          </div>
          {plans.length === 0 && <InfoNote className="mt-3">{en ? 'Visible, confirmed plans only.' : '확정된 약속만 보여요.'}</InfoNote>}
        </section>

        <nav className="mt-8 border-t border-line pt-4 grid grid-cols-3 text-[14px] text-ink-2">
          <button onClick={() => nav('/profile/saved')} className="text-left press">{en ? 'Saved' : '저장'}</button>
          <button onClick={() => nav('/profile/posts')} className="text-center press">{en ? 'My Posts' : '내 글'}</button>
          <button onClick={() => nav('/settings')} className="text-right press">{en ? 'Settings' : '설정'}</button>
        </nav>
      </div>
    </Screen>
  );
}
