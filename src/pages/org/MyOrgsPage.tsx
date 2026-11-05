import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarPlus, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import { Badge, Btn, EmptyState, InfoNote, RowCard, SegTabs } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { SubScreen } from '@/pages/profile/shared';

const en = lang === 'en';
type Tab = 'followed' | 'member';

/**
 * My Communities (PDF S074) — SegTabs Followed · Member, RowCards, "Interests and follows are separate from verified membership.",
 * outline Explore Communities. 운영진이면 그 동아리 줄에 Admin 표시와 행사 올리기 (예전 My Organizations 의 입구, 2026-11-02).
 * 탭은 주소(?tab=)가 정한다 — 뒤로 오면 같은 탭.
 */
export function MyOrgsPage() {
  const nav = useNavigate();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const [params, setParams] = useSearchParams();
  const me = v.me.id;
  const member = orgs.filter((o) => o.memberIds.includes(me) || o.adminIds.includes(me));
  const followed = orgs.filter((o) => o.followerIds.includes(me) && !member.includes(o));
  const tab: Tab = params.get('tab') === 'member' || (!params.get('tab') && followed.length === 0 && member.length > 0) ? 'member' : 'followed';
  const list = tab === 'member' ? member : followed;
  const admin = member.filter((o) => o.adminIds.includes(me));

  return (
    <SubScreen title={en ? 'My Communities' : '내 커뮤니티'}>
      <SegTabs className="-mx-4 px-2 mb-4" value={tab} onChange={(k) => setParams({ tab: k }, { replace: true })}
        tabs={[{ key: 'followed', label: en ? 'Followed' : '팔로우' }, { key: 'member', label: en ? 'Member' : '회원' }]} />
      {list.length === 0
        ? <EmptyState className="pt-4" icon={<Users size={30} />} tone="rose" title={tab === 'member' ? (en ? 'No memberships yet' : '아직 회원인 곳이 없어요') : (en ? 'Follow a few communities' : '커뮤니티를 팔로우해 보세요')}
            sub={tab === 'member' ? (en ? 'Groups you’ve joined show up here.' : '가입한 그룹이 여기에 보여요.') : (en ? 'Clubs, Greek life, co-ops and labs at your school.' : '우리 학교 동아리·그릭·코업·연구실.')} />
        : <div className="space-y-3">
            {list.map((o) => (
              <RowCard key={o.id} tone="rose" icon={<Users size={21} />} title={o.name}
                sub={[ORG_TYPE_LABELS[o.type], tab === 'member' ? (en ? 'Member' : '회원') : (en ? 'Followed' : '팔로우')].join(' · ')}
                right={o.adminIds.includes(me) ? <Badge tone="sel">{en ? 'Admin' : '운영진'}</Badge> : undefined}
                onClick={() => nav(`/orgs/${o.id}`)} />
            ))}
          </div>}
      <InfoNote className="mt-4">{en ? 'Interests and follows are separate from verified membership.' : '관심·팔로우는 인증된 회원과 따로예요.'}</InfoNote>
      <div className="flex flex-wrap gap-2.5 mt-4">
        <Btn variant="outline" onClick={() => nav('/explore/clubs')}>{en ? 'Explore Communities' : '커뮤니티 둘러보기'}</Btn>
        {admin.length > 0 && <Btn variant="outline" icon={<CalendarPlus size={17} />} onClick={() => nav(`/create/activity?kind=org_event&event=1&org=${admin[0].id}`)}>{en ? 'Post an event' : '행사 올리기'}</Btn>}
      </div>
    </SubScreen>
  );
}
