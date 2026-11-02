import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, EmptyState } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ORG_TYPE_LABELS } from '@core/lib/labels';

const en = lang === 'en';

/** 내 조직 — 운영진이 행사를 올리는 입구 (2026-11-02 사장님 시안: My Organizations → Create Event) */
export function MyOrgsPage() {
  const nav = useNavigate();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const admin = orgs.filter((o) => o.adminIds.includes(v.me.id));
  const member = orgs.filter((o) => !o.adminIds.includes(v.me.id) && o.memberIds.includes(v.me.id));
  const Row = ({ o }: { o: typeof orgs[number] }) => (
    <button onClick={() => nav(`/orgs/${o.id}`)} className="w-full flex items-center gap-3 px-4 py-3 text-left press">
      <Avatar emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={44} />
      <span className="flex-1 min-w-0"><span className="block text-[15px] font-bold truncate">{o.name}</span><span className="block text-[12px] text-ink-3">{ORG_TYPE_LABELS[o.type]} · {o.memberIds.length + o.adminIds.length} {en ? 'members' : '명'}</span></span>
      <ChevronRight size={17} className="text-ink-3" />
    </button>
  );
  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title={en ? 'My Organizations' : '내 조직'} />
      <div className="px-4 pt-3">
        {admin.length === 0 && member.length === 0 && <EmptyState emoji="" title={en ? 'No organizations yet' : '아직 조직이 없어요'} description={en ? 'Officers of a club, fraternity, sorority or co-op can post events here once they’re added as admins of their organization’s page.' : '동아리·Greek 운영진은 조직 페이지의 운영진으로 등록되면 여기서 행사를 올릴 수 있어요.'} action={<Button variant="outline" onClick={() => nav('/explore/clubs')}>{en ? 'Find your organization' : '조직 찾기'}</Button>} />}
        {admin.length > 0 && <><div className="text-[13px] font-semibold text-ink-3 mb-1.5">{en ? 'You run' : '운영 중'}</div><div className="card rounded-[20px] divide-y divide-line">{admin.map((o) => <Row key={o.id} o={o} />)}</div></>}
        {member.length > 0 && <><div className="text-[13px] font-semibold text-ink-3 mt-4 mb-1.5">{en ? 'Member of' : '회원'}</div><div className="card rounded-[20px] divide-y divide-line">{member.map((o) => <Row key={o.id} o={o} />)}</div></>}
      </div>
      {admin.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-4 safe-bottom bg-bg/95 backdrop-blur">
          <Button full size="lg" icon={<Plus size={18} />} onClick={() => nav(`/create/activity?kind=org_event&event=1&org=${admin[0].id}`)}>{en ? 'Create Event' : '행사 올리기'}</Button>
        </div>
      )}
    </div>
  );
}
