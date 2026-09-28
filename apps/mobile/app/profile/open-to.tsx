import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { Audience, StatusKind, StatusWhen, UserStatus } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { ALL_STATUS_KINDS, OPEN_TO_WHENS, STATUS_EMOJI, STATUS_LABELS, WHEN_LABELS, makeStatus } from '@core/lib/status';
import { AUDIENCE_LABELS, AUDIENCE_DESC } from '@core/lib/privacy';
import { tw } from '@/tw';
import { back } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Button, Segmented, C } from '@/ui';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { SchoolBadge } from '@/v2/SchoolBadge';
import { StatusChip } from '@/v2/StatusPill';
import { Wrap, WChip } from '@/v2/Forms';

interface Row { on: boolean; when: StatusWhen; audience: Audience; expired?: UserStatus }
const AUDIENCES: Audience[] = ['everyone', 'school_2nd', 'connections'];
/** 비어 있을 때 한 번에 켤 수 있는 제안 */
const SUGGESTIONS: { kind: StatusKind; when: StatusWhen }[] = [{ kind: 'coffee', when: 'week' }, { kind: 'running', when: 'weekend' }];

function initialRows(statuses: UserStatus[], now = Date.now()): Record<StatusKind, Row> {
  const out = {} as Record<StatusKind, Row>;
  for (const k of ALL_STATUS_KINDS) {
    const s = statuses.find((x) => x.kind === k);
    const live = !!s && new Date(s.until).getTime() > now;
    out[k] = { on: live, when: s?.when ?? 'week', audience: s?.audience ?? 'school_2nd', expired: s && !live ? s : undefined };
  }
  return out;
}

/** Open To 설정 (웹 OpenToPage) — 항목마다 켜기 · 기간(오늘·이번 주·계속) · 공개 대상. 기간이 지나면 자동으로 꺼진다 */
export default function OpenToScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const source = useMemo(() => [...(me.openStatuses ?? []), ...(me.status && !(me.openStatuses ?? []).some((x) => x.kind === me.status!.kind) ? [me.status] : [])], [me.openStatuses, me.status]);
  const [rows, setRows] = useState(() => initialRows(source));
  const [busy, setBusy] = useState(false);
  const sec = useSectionState('open-to');
  useEffect(() => { setRows(initialRows(source)); }, [source]);

  const patch = (k: StatusKind, p: Partial<Row>) => setRows((r) => ({ ...r, [k]: { ...r[k], ...p } }));
  const onKinds = ALL_STATUS_KINDS.filter((k) => rows[k].on);
  const preview = onKinds.map((k) => ({ kind: k, when: rows[k].when }));
  const initial = initialRows(source);
  const dirty = ALL_STATUS_KINDS.some((k) => rows[k].on !== initial[k].on || (rows[k].on && (rows[k].when !== initial[k].when || rows[k].audience !== initial[k].audience)));

  const save = async () => {
    setBusy(true);
    const next: UserStatus[] = ALL_STATUS_KINDS.flatMap((k) => {
      const r = rows[k];
      if (r.on) {
        const prev = source.find((x) => x.kind === k && new Date(x.until).getTime() > Date.now());
        return [prev && prev.when === r.when ? { ...prev, audience: r.audience } : makeStatus(k, r.when, r.audience)];
      }
      return r.expired ? [r.expired] : []; // 지난 것은 흐리게 남겨 "다시 켜기"를 보여준다
    });
    try { await run(() => api.users.setOpenStatuses(me.id, next), t('Open To를 저장했어요')); } catch { /* toast by run */ } finally { setBusy(false); }
  };
  const whenOptions = (w: StatusWhen): [StatusWhen, string][] => (OPEN_TO_WHENS.includes(w) ? OPEN_TO_WHENS : [...OPEN_TO_WHENS, w]).map((x) => [x, WHEN_LABELS[x]]);

  const footer = (
    <View style={tw`flex-row`}>
      <Button size="lg" variant="outline" onPress={back}>{t('취소')}</Button>
      <View style={tw`w-2`} />
      <Button size="lg" full loading={busy} disabled={!dirty || sec.loading} onPress={save}>{t('저장')}</Button>
    </View>
  );

  return (
    <Screen title="Open To" footer={footer}>
      <View style={tw`py-3`}>
        <Text style={tw`px-1 mb-3 text-[12px] text-ink-3`}>{t('지금 가볍게 열려 있는 것만 켜 두세요. 기간이 지나면 자동으로 꺼져요.')}</Text>

        {/* 1. 미리보기 */}
        <View style={tw`card p-4`}>
          <Text style={tw`text-[11px] font-bold text-ink-3`}>{t('다른 사람에게 이렇게 보여요')}</Text>
          <View style={tw`mt-2 flex-row items-center`}>
            <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={44} />
            <View style={tw`flex-1 min-w-0 ml-3`}><Text numberOfLines={1} style={tw`text-[15px] font-bold text-ink`}>{me.nickname}</Text><SchoolBadge user={me} size="sm" /></View>
          </View>
          {preview.length
            ? <View style={tw`mt-2.5 flex-row flex-wrap`}>{preview.map((s) => <View key={s.kind} style={tw`mr-1.5 mb-1.5`}><StatusChip status={s} /></View>)}</View>
            : <Text style={tw`mt-2.5 text-[12px] text-ink-3`}>{t('켜진 항목이 없어요. 프로필에는 아무것도 표시되지 않아요.')}</Text>}
        </View>

        {/* 2. 항목 */}
        <View style={tw`mt-4`}>
          <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={3} />}>
            {onKinds.length === 0 ? (
              <View style={tw`mb-3 rounded-[20px] border border-line bg-white px-4 py-4`}>
                <Text style={tw`text-[14px] font-semibold text-ink mb-2`}>{t('이런 걸로 시작해보세요')}</Text>
                <Wrap>{SUGGESTIONS.map((s) => <WChip key={s.kind} onPress={() => patch(s.kind, { on: true, when: s.when })}>{STATUS_EMOJI[s.kind]} {lang === 'en' ? `${STATUS_LABELS[s.kind]} · ${WHEN_LABELS[s.when].toLowerCase()}` : `${WHEN_LABELS[s.when]} ${STATUS_LABELS[s.kind]}`}</WChip>)}</Wrap>
              </View>
            ) : null}
            <View style={tw`card`}>
              {ALL_STATUS_KINDS.map((k, i) => {
                const r = rows[k];
                return (
                  <View key={k} style={tw`px-4 py-3 ${i ? 'border-t border-line' : ''} ${!r.on && r.expired ? 'opacity-70' : ''}`}>
                    <Pressable onPress={() => patch(k, { on: !r.on })} accessibilityRole="switch" accessibilityState={{ checked: r.on }} style={tw`flex-row items-center`}>
                      <View style={tw`h-10 w-10 rounded-full bg-accent-soft items-center justify-center`}><Text style={tw`text-[18px]`}>{STATUS_EMOJI[k]}</Text></View>
                      <View style={tw`flex-1 min-w-0 mx-3`}>
                        <Text style={tw`text-[14px] font-semibold text-ink`}>{STATUS_LABELS[k]}</Text>
                        {!r.on && r.expired ? <Text style={tw`text-[11px] text-ink-3`}>{t('기간이 지나 꺼졌어요')}</Text> : null}
                      </View>
                      <View style={tw`h-7 w-12 rounded-full p-0.5 ${r.on ? 'bg-primary' : 'bg-line'}`}><View style={[tw`h-6 w-6 rounded-full bg-white`, { marginLeft: r.on ? 20 : 0 }]} /></View>
                    </Pressable>
                    {!r.on && r.expired ? (
                      <Pressable onPress={() => patch(k, { on: true, when: r.expired!.when })} style={tw`mt-2 ml-[52px] h-7 px-3 self-start rounded-full bg-surface-2 flex-row items-center`}><RotateCcw size={12} color={C.primary} /><Text style={tw`ml-1 text-[12px] font-semibold text-primary`}>{t('다시 켜기')}</Text></Pressable>
                    ) : null}
                    {r.on ? (
                      <View style={tw`mt-3 ml-[52px]`}>
                        <Segmented<StatusWhen> value={r.when} onChange={(w) => patch(k, { when: w })} options={whenOptions(r.when)} />
                        <Text style={tw`mt-2.5 mb-1 text-[11px] font-semibold text-ink-3`}>{t('누구에게 보일까요')}</Text>
                        <Wrap>{AUDIENCES.map((a) => <WChip key={a} active={r.audience === a} onPress={() => patch(k, { audience: a })}>{AUDIENCE_LABELS[a]}</WChip>)}</Wrap>
                        <Text style={tw`text-[11px] text-ink-3`}>{AUDIENCE_DESC[r.audience]}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Section>
        </View>
        <View style={tw`mt-3`}><PrivacyNote text={t('연락처·정확한 위치는 어디에도 보이지 않아요')} /></View>
      </View>
    </Screen>
  );
}
