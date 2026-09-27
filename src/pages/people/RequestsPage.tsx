import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { t } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, EmptyState, Segmented, Tag, Section, SectionSkeleton } from '@/components/ui';
import { useSectionState } from '@/hooks/useSectionState';
import { useViewer } from '@/hooks/useViewer';
import { useSnapshot } from '@/hooks/useSnapshot';
import { requestsForMe, myRequests, requestContextLine } from '@core/lib/requests';
import { IncomingRequestCard, isRequestExpired } from '@/components/people_RequestCard';
import type { NetworkRequest } from '@core/types';

type Tab = 'inbox' | 'mine';

/** 사람 찾아보기 — 나에게 온 것 | 내가 찾는 것 */
export function RequestsPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'mine' ? 'mine' : 'inbox';
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const inbox = useMemo(() => requestsForMe(snap, me), [snap, me]);
  const mine = useMemo(() => myRequests(snap, me), [snap, me]);
  const sec = useSectionState(`requests-${tab}`);

  return (
    <div className="min-h-full pb-24 bg-bg">
      <TopBar back title={t('사람 찾아보기')} />
      <div className="px-4 pt-1 pb-3"><Segmented value={tab} onChange={(x) => setParams(x === 'inbox' ? {} : { tab: x }, { replace: true })} options={[{ value: 'inbox', label: `${t('나에게 온 것')}${inbox.length ? ` ${inbox.length}` : ''}` }, { value: 'mine', label: `${t('내가 찾는 것')}${mine.length ? ` ${mine.length}` : ''}` }]} /></div>

      {tab === 'inbox' && (
        <div className="px-4">
          <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={3} />}
            empty={inbox.length === 0 && <EmptyState emoji="🍃" title={t('아직 온 게 없어요')} description={t('연결이 늘수록 건너건너 물어보는 게 와요.')} />}>
            <p className="px-1 pb-2 text-[11px] text-ink-3">{t('답하지 않아도 괜찮아요 · 읽음 표시도, 불이익도 없어요')}</p>
            <div className="space-y-3">
              {inbox.map((it) => <IncomingRequestCard key={it.req.id} item={it} onOpen={() => nav(`/people/requests/${it.req.id}`)} />)}
            </div>
          </Section>
        </div>
      )}

      {tab === 'mine' && (
        <div className="px-4 space-y-3">
          <Button full variant="outline" icon={<Plus size={16} />} onClick={() => nav('/people/ask')}>{t('새로 찾아보기')}</Button>
          <Section loading={sec.loading} error={sec.error} onRetry={sec.retry}
            empty={mine.length === 0 && <EmptyState emoji="🔎" title={t('아직 찾아본 사람이 없어요')} description={t('한 줄로 적으면 가까운 네트워크에서 먼저 찾고, 건너건너 물어볼 수 있어요.')} />}>
            <div className="rounded-[24px] border border-line bg-white divide-y divide-line overflow-hidden">
              {mine.map((r) => <MyRequestRow key={r.id} r={r} onOpen={() => nav(`/people/requests/${r.id}`)} />)}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function MyRequestRow({ r, onOpen }: { r: NetworkRequest; onOpen: () => void }) {
  const ctx = requestContextLine(r);
  const raised = r.responses.filter((x) => x.status !== 'declined').length;
  const asking = r.referrals.filter((x) => x.status === 'pending').length;
  return (
    <button onClick={onOpen} className="w-full flex items-center gap-3 px-4 py-3 text-left press">
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-bold text-ink line-clamp-2 leading-snug">{r.text}</span>
        {ctx && <span className="block text-[11px] text-ink-3 truncate mt-0.5">{ctx}</span>}
        <span className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          {r.status !== 'open' ? <Tag tone="neutral">{t('그만 찾음')}</Tag> : isRequestExpired(r) ? <Tag tone="neutral">{t('마감')}</Tag> : <Tag tone="primary">{t('찾는 중')}</Tag>}
          <span className="text-[11px] text-ink-3">{t('손 든 사람')} {raised}{asking ? ` · ${t('물어보는 중')} ${asking}` : ''}</span>
        </span>
      </span>
      <ChevronRight size={16} className="text-ink-3 shrink-0" />
    </button>
  );
}
