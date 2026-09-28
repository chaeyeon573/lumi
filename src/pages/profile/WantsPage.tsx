import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Sparkles } from 'lucide-react';
import { t } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Field } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import type { PeopleWant, ActivityWant, Wants } from '@core/types';
import { PEOPLE_WANT_LABELS, PEOPLE_WANT_EMOJI, ACTIVITY_WANT_LABELS, ACTIVITY_WANT_EMOJI, emptyWants, peopleWantOptions, activityWantOptions } from '@core/lib/wants';
import { stageKind } from '@core/lib/stage';
import { cn } from '@core/lib/cn';

/** 큰 칩 — 온보딩 "무엇을 찾고 있나요?" 와 같은 모양 (2열, 이모지 + 라벨) */
function WantGrid<T extends string>({ all, value, labels, emoji, onToggle }: { all: T[]; value: T[]; labels: Record<T, string>; emoji: Record<T, string>; onToggle: (k: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {all.map((k) => {
        const active = value.includes(k);
        return (
          <button key={k} type="button" onClick={() => onToggle(k)} aria-pressed={active}
            className={cn('h-[60px] rounded-[20px] border px-3.5 flex items-center gap-2.5 text-left press transition', active ? 'bg-primary text-white border-primary' : 'bg-white border-line text-ink')}>
            <span className="text-xl">{emoji[k]}</span>
            <span className="text-[14px] font-bold leading-tight">{labels[k]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 프로필 › 추천 설정 — "AroundU가 나를 이해하는 기준". 온보딩과 같은 두 질문, 각각 1개 이상 */
export function WantsPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const [wants, setWants] = useState<Wants>(() => (me.wants ? { people: [...me.wants.people], activities: [...me.wants.activities] } : emptyWants()));
  const [busy, setBusy] = useState(false);
  const togglePeople = (k: PeopleWant) => setWants((w) => ({ ...w, people: w.people.includes(k) ? w.people.filter((x) => x !== k) : [...w.people, k] }));
  const toggleActivity = (k: ActivityWant) => setWants((w) => ({ ...w, activities: w.activities.includes(k) ? w.activities.filter((x) => x !== k) : [...w.activities, k] }));
  const valid = wants.people.length > 0 && wants.activities.length > 0;

  const save = async () => {
    setBusy(true);
    try {
      await run(() => api.users.updateWants(me.id, wants), t('추천 설정을 저장했어요. 추천이 바로 바뀌어요.'));
      nav(-1);
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28">
      <TopBar back title={t('추천 설정')} />
      <div className="px-4 py-4 space-y-6">
        <div className="card p-4 bg-[linear-gradient(120deg,var(--tint),#FFFFFF)]">
          <div className="flex items-center gap-2"><Target size={16} className="text-primary" /><b className="text-[14px] text-primary">{t('AroundU가 나를 이해하는 기준')}</b></div>
          <p className="mt-1.5 text-[12px] text-ink-2 leading-relaxed">{t('추천·홈·모임 추천의 우선순위에 바로 반영돼요. 언제든 바꿀 수 있고, 다른 사람에게는 보이지 않아요.')}</p>
        </div>
        <Field label={t('어떤 사람을 만나고 싶어요?')} hint={t('1개 이상 골라주세요. 사람 추천과 홈의 "오늘의 사람"에 쓰여요.')}>
          <WantGrid all={peopleWantOptions(stageKind(me))} value={wants.people} labels={PEOPLE_WANT_LABELS} emoji={PEOPLE_WANT_EMOJI} onToggle={togglePeople} />
        </Field>
        <Field label={t('어떤 활동을 하고 싶어요?')} hint={t('1개 이상 골라주세요. 모임 추천과 프로필의 "열려 있어요"에 쓰여요.')}>
          <WantGrid all={activityWantOptions(stageKind(me))} value={wants.activities} labels={ACTIVITY_WANT_LABELS} emoji={ACTIVITY_WANT_EMOJI} onToggle={toggleActivity} />
        </Field>
        <p className="text-[12px] text-ink-3 flex items-start gap-1.5"><Sparkles size={13} className="mt-0.5 shrink-0" />{t('고른 기준은 추천 카드의 "왜 연결될 수 있나"에도 그대로 나타나요.')}</p>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" loading={busy} disabled={!valid} onClick={save}>{valid ? t('저장') : t('각각 1개 이상 골라주세요')}</Button>
      </div>
    </div>
  );
}
