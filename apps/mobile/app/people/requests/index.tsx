import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, ChevronRight } from 'lucide-react-native';
import { t } from '@core/i18n';
import { requestsForMe, myRequests, requestContextLine } from '@core/lib/requests';
import type { NetworkRequest } from '@core/types';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Segmented, Tag, C } from '@/ui';
import { useSnapshot } from '@/v2/useSnapshot';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton } from '@/v2/SectionState';
import { IncomingRequestCard } from '@/v2/IncomingRequestCard';
import { isRequestExpired } from '@/v2/RequestParts';
import { Row } from '@/v2/Forms';

type Tab = 'inbox' | 'mine';

/** 사람 찾아보기 — 나에게 온 것 | 내가 찾는 것 (웹 RequestsPage) */
export default function RequestsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: Tab = params.tab === 'mine' ? 'mine' : 'inbox';
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const inbox = useMemo(() => requestsForMe(snap, me), [snap, me]);
  const mine = useMemo(() => myRequests(snap, me), [snap, me]);
  const sec = useSectionState(`requests-${tab}`);

  return (
    <Screen title={t('사람 찾아보기')} sub={<View style={tw`px-4 pb-3`}><Segmented<Tab> value={tab} onChange={(x) => router.setParams({ tab: x === 'inbox' ? '' : x } as never)} options={[['inbox', `${t('나에게 온 것')}${inbox.length ? ` ${inbox.length}` : ''}`], ['mine', `${t('내가 찾는 것')}${mine.length ? ` ${mine.length}` : ''}`]]} /></View>}>
      {tab === 'inbox' ? (
        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={3} />}
          empty={inbox.length === 0 && <SectionEmpty emoji="🍃" title={t('아직 온 게 없어요')} description={t('연결이 늘수록 건너건너 물어보는 게 와요.')} action={<Button size="sm" variant="outline" onPress={() => nav('/people/ask')}>{t('새로 찾아보기')}</Button>} />}>
          <Text style={tw`px-1 pb-2 text-[11px] text-ink-3`}>{t('답하지 않아도 괜찮아요 · 읽음 표시도, 불이익도 없어요')}</Text>
          {inbox.map((it) => <View key={it.req.id} style={tw`mb-3`}><IncomingRequestCard item={it} /></View>)}
        </Section>
      ) : (
        <View>
          <Row style={tw`mb-3`}><Button full variant="outline" icon={<Plus size={16} color={C.ink2} />} onPress={() => nav('/people/ask')}>{t('새로 찾아보기')}</Button></Row>
          <Section loading={sec.loading} error={sec.error} onRetry={sec.retry}
            empty={mine.length === 0 && <SectionEmpty emoji="🔎" title={t('아직 찾아본 사람이 없어요')} description={t('한 줄로 적으면 가까운 네트워크에서 먼저 찾고, 건너건너 물어볼 수 있어요.')} />}>
            <View style={tw`rounded-[24px] border border-line bg-white overflow-hidden`}>
              {mine.map((r, i) => <MyRequestRow key={r.id} r={r} first={i === 0} />)}
            </View>
          </Section>
        </View>
      )}
    </Screen>
  );
}

function MyRequestRow({ r, first }: { r: NetworkRequest; first: boolean }) {
  const ctx = requestContextLine(r);
  const raised = r.responses.filter((x) => x.status !== 'declined').length;
  const asking = r.referrals.filter((x) => x.status === 'pending').length;
  return (
    <Pressable onPress={() => nav(`/people/requests/${r.id}`)} style={tw`px-4 py-3 flex-row items-center ${first ? '' : 'border-t border-line'}`}>
      <View style={tw`flex-1 min-w-0`}>
        <Text numberOfLines={2} style={tw`text-[14px] font-bold text-ink`}>{r.text}</Text>
        {ctx ? <Text numberOfLines={1} style={tw`text-[11px] text-ink-3 mt-0.5`}>{ctx}</Text> : null}
        <View style={tw`mt-1.5 flex-row items-center flex-wrap`}>
          {r.status !== 'open' ? <Tag>{t('그만 찾음')}</Tag> : isRequestExpired(r) ? <Tag>{t('마감')}</Tag> : <Tag tone="primary">{t('찾는 중')}</Tag>}
          <Text style={tw`ml-1.5 text-[11px] text-ink-3`}>{t('손 든 사람')} {raised}{asking ? ` · ${t('물어보는 중')} ${asking}` : ''}</Text>
        </View>
      </View>
      <ChevronRight size={16} color={C.ink3} />
    </Pressable>
  );
}
