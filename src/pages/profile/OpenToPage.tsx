import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { Audience, StatusKind, StatusWhen, UserStatus } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { ALL_STATUS_KINDS, OPEN_TO_WHENS, STATUS_EMOJI, STATUS_LABELS, WHEN_LABELS, makeStatus } from '@core/lib/status';
import { AUDIENCE_LABELS, AUDIENCE_DESC } from '@core/lib/privacy';
import { cn } from '@core/lib/cn';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, Chip, PrivacyNote, Section, SectionSkeleton, Segmented } from '@/components/ui';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { StatusChip } from '@/components/people_StatusPill';
import { useViewer } from '@/hooks/useViewer';
import { useSectionState } from '@/hooks/useSectionState';

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

/** Open To 설정 (/profile/open-to) — 항목마다 켜기 · 기간(오늘·이번 주·계속) · 공개 대상. 기간이 지나면 자동으로 꺼진다 */
export function OpenToPage() {
  const nav = useNavigate();
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
    try { await run(() => api.users.setOpenStatuses(me.id, next), t('Open To를 저장했어요')); }
    catch { /* toast by run */ } finally { setBusy(false); }
  };

  const whenOptions = (w: StatusWhen) => (OPEN_TO_WHENS.includes(w) ? OPEN_TO_WHENS : [...OPEN_TO_WHENS, w]).map((x) => ({ value: x, label: WHEN_LABELS[x] }));

  return (
    <div className="min-h-full pb-28">
      <TopBar back title="Open To" />
      <div className="px-4 py-3 space-y-4">
        <p className="text-[12px] text-ink-3 px-1">{t('지금 가볍게 열려 있는 것만 켜 두세요. 기간이 지나면 자동으로 꺼져요.')}</p>

        {/* ── 미리보기 ── */}
        <section className="card p-4">
          <div className="text-[11px] font-bold text-ink-3">{t('다른 사람에게 이렇게 보여요')}</div>
          <div className="mt-2 flex items-center gap-3">
            <Avatar emoji={me.avatar.emoji} hue={me.avatar.hue} url={me.avatar.url} size={44} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold truncate">{me.nickname}</div>
              <SchoolBadge user={me} size="sm" />
            </div>
          </div>
          {preview.length ? <div className="mt-2.5 flex flex-wrap gap-1.5">{preview.map((s) => <StatusChip key={s.kind} status={s} />)}</div>
            : <p className="mt-2.5 text-[12px] text-ink-3">{t('켜진 항목이 없어요. 프로필에는 아무것도 표시되지 않아요.')}</p>}
        </section>

        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={3} />}>
          {onKinds.length === 0 && (
            <div className="rounded-[20px] bg-surface-2/60 px-4 py-4">
              <div className="text-[14px] font-semibold">{t('이런 걸로 시작해보세요')}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => <Chip key={s.kind} size="sm" onClick={() => patch(s.kind, { on: true, when: s.when })}>{STATUS_EMOJI[s.kind]} {lang === 'en' ? `${STATUS_LABELS[s.kind]} · ${WHEN_LABELS[s.when].toLowerCase()}` : `${WHEN_LABELS[s.when]} ${STATUS_LABELS[s.kind]}`}</Chip>)}
              </div>
            </div>
          )}
          <div className="card divide-y divide-line">
            {ALL_STATUS_KINDS.map((k) => {
              const r = rows[k];
              return (
                <div key={k} className={cn('px-4 py-3', !r.on && r.expired && 'opacity-70')}>
                  <button type="button" onClick={() => patch(k, { on: !r.on })} className="w-full flex items-center gap-3 text-left" aria-pressed={r.on}>
                    <span className="h-10 w-10 rounded-full bg-accent-soft grid place-items-center text-[18px] shrink-0">{STATUS_EMOJI[k]}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold">{STATUS_LABELS[k]}</span>
                      {!r.on && r.expired && <span className="block text-[11px] text-ink-3">{t('기간이 지나 꺼졌어요')}</span>}
                    </span>
                    <span className={cn('relative h-7 w-12 rounded-full transition shrink-0', r.on ? 'bg-primary' : 'bg-line')}><span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition', r.on ? 'left-6' : 'left-1')} /></span>
                  </button>
                  {!r.on && r.expired && (
                    <button type="button" onClick={() => patch(k, { on: true, when: r.expired!.when })} className="mt-2 ml-[52px] h-7 px-3 rounded-full bg-surface-2 text-[12px] font-semibold text-primary inline-flex items-center gap-1 press"><RotateCcw size={12} />{t('다시 켜기')}</button>
                  )}
                  {r.on && (
                    <div className="mt-3 ml-[52px] space-y-2.5">
                      <Segmented value={r.when} onChange={(w) => patch(k, { when: w })} options={whenOptions(r.when)} />
                      <div>
                        <div className="text-[11px] font-semibold text-ink-3 mb-1">{t('누구에게 보일까요')}</div>
                        <div className="flex flex-wrap gap-1.5">{AUDIENCES.map((a) => <Chip key={a} size="sm" active={r.audience === a} onClick={() => patch(k, { audience: a })}>{AUDIENCE_LABELS[a]}</Chip>)}</div>
                        <p className="mt-1 text-[11px] text-ink-3">{AUDIENCE_DESC[r.audience]}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
        <PrivacyNote text={t('연락처·정확한 위치는 어디에도 보이지 않아요')} className="px-1" />
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20 flex gap-2">
        <Button size="lg" variant="outline" onClick={() => nav(-1)}>{t('취소')}</Button>
        <Button size="lg" full loading={busy} disabled={!dirty || sec.loading} onClick={save}>{t('저장')}</Button>
      </div>
    </div>
  );
}
