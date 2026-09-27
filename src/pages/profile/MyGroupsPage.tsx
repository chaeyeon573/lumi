import { useNavigate } from 'react-router-dom';
import { t } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, EmptyState } from '@/components/ui';
import { OrgCard } from '@/components/cards/OrgCard';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';

/** 내 그룹 — 멤버·운영진·팔로우 중인 조직 */
export function MyGroupsPage() {
  const nav = useNavigate();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const me = v.me;
  const mine = orgs.filter((o) => o.memberIds.includes(me.id) || o.adminIds.includes(me.id));
  const following = orgs.filter((o) => !mine.includes(o) && o.followerIds.includes(me.id));

  return (
    <div className="min-h-full pb-8 bg-bg">
      <TopBar back title={t('내 그룹')} />
      <div className="px-4 py-3 space-y-4">
        {mine.length === 0 && following.length === 0 ? (
          <EmptyState emoji="🎪" title={t('가입한 그룹이 없어요')} description={t('동아리·연구실·학생회를 둘러보고 함께해보세요.')} action={<Button onClick={() => nav('/meet?tab=groups')}>{t('그룹 둘러보기')}</Button>} />
        ) : (
          <>
            {mine.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-[13px] font-bold text-ink-3 px-1">{t('멤버')} · {mine.length}</h2>
                {mine.map((o) => <OrgCard key={o.id} org={o} />)}
              </section>
            )}
            {following.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-[13px] font-bold text-ink-3 px-1">{t('팔로잉')} · {following.length}</h2>
                {following.map((o) => <OrgCard key={o.id} org={o} />)}
              </section>
            )}
            <Button full variant="secondary" onClick={() => nav('/meet?tab=groups')}>{t('그룹 둘러보기')}</Button>
          </>
        )}
      </div>
    </div>
  );
}
