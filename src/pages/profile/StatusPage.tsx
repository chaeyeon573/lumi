import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Check, BookOpen, RotateCcw, Pencil } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { isAlumniStage, isGradStage, stageOf, stageLabel, gradYearOf, cityOf, contextLine, shouldSuggestStatusUpdate } from '@core/lib/network';
import type { Stage } from '@core/types';

/**
 * 프로필 › 상태 변경 — "졸업하셨나요?" (화면 29).
 * 새 계정 없음. 연결·그룹·글·학교 인증·활동 기록은 모두 유지. 졸업 → /profile/status/career, 대학원 진학은 여기서 바로.
 */
export function StatusPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const [busy, setBusy] = useState<Stage | 'back' | null>(null);
  const alumni = isAlumniStage(me);
  const grad = isGradStage(me);
  const suggest = shouldSuggestStatusUpdate(me);

  const setStage = async (stage: Stage, msg: string) => {
    setBusy(stage);
    try { await run(() => api.users.setStage(me.id, stage), msg); nav('/profile', { replace: true }); } catch { setBusy(null); }
  };

  const keeps = [t('기존 연결·그룹·활동 기록 유지'), t('프로필을 졸업생으로 업데이트'), t('새로운 사람들과의 연결')];

  if (alumni) {
    return (
      <div className="min-h-full pb-10">
        <TopBar back title={t('현재 상태')} />
        <div className="px-4 py-4 space-y-4">
          <section className="card p-5 text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary-soft grid place-items-center text-primary"><GraduationCap size={38} /></div>
            <h1 className="mt-4 font-display text-[22px] font-bold text-ink">{t('졸업생으로 활동 중이에요')}</h1>
            <p className="mt-1 text-[13px] text-ink-2">{contextLine(me, lang) || stageLabel(stageOf(me), lang)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left">
              {[{ l: t('상태'), v: stageLabel(stageOf(me), lang) }, { l: t('졸업연도'), v: gradYearOf(me) ? String(gradYearOf(me)) : '—' }, { l: t('거주 도시'), v: cityOf(me) || '—' }, { l: t('직무'), v: me.career?.role || '—' }].map((x) => (
                <div key={x.l} className="rounded-2xl bg-surface-2 px-3.5 py-2.5"><div className="text-[11px] text-ink-3">{x.l}</div><div className="text-[14px] font-semibold text-ink truncate">{x.v}</div></div>
              ))}
            </div>
            <Button full variant="secondary" className="mt-4" icon={<Pencil size={15} />} onClick={() => nav('/profile/edit')}>{t('도시·하는 일 수정')}</Button>
          </section>
          <section className="card p-4">
            <div className="text-[11px] font-bold text-ink-3 mb-1">{t('데모 도구')}</div>
            <p className="text-[12px] text-ink-3 mb-3">{t('재학생 화면(시간표·캠퍼스 추천)으로 되돌려 볼 수 있어요. 연결과 기록은 그대로예요.')}</p>
            <Button full variant="outline" loading={busy === 'undergrad'} icon={<RotateCcw size={15} />} onClick={() => setStage('undergrad', t('재학생으로 되돌렸어요.'))}>{t('재학생으로 되돌리기 (데모)')}</Button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-10">
      <TopBar back title={t('현재 상태')} />
      <div className="px-4 py-4 space-y-4">
        <section className="card p-6 text-center">
          {/* 졸업모자 일러스트 */}
          <div className="relative mx-auto h-28 w-28">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--tint),var(--tint))]" />
            <div className="absolute inset-0 grid place-items-center text-primary"><GraduationCap size={56} strokeWidth={1.6} /></div>
            <span className="absolute -top-1 right-1 text-lg">✨</span>
          </div>
          <h1 className="mt-5 font-display text-[24px] font-bold text-ink">{t('졸업하셨나요?')}</h1>
          <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">{suggest ? t('졸업 예정연도가 지났어요. 새 계정은 필요 없어요 — 지금 프로필 그대로 이어져요.') : t('새 계정은 필요 없어요. 지금 프로필 그대로 이어져요.')}</p>
          <ul className="mt-5 space-y-2.5 text-left">
            {keeps.map((k) => (
              <li key={k} className="flex items-center gap-3 text-[14px] font-semibold text-ink"><span className="h-7 w-7 rounded-full bg-mint-soft text-mint grid place-items-center shrink-0"><Check size={15} strokeWidth={3} /></span>{k}</li>
            ))}
          </ul>
          <div className="mt-6 space-y-2">
            <Button full size="lg" icon={<GraduationCap size={17} />} onClick={() => nav('/profile/status/career')}>{t('졸업으로 변경하기')}</Button>
            <Button full size="lg" variant="ghost" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/profile'))}>{t('아직 아니에요')}</Button>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2"><BookOpen size={17} className="text-primary" /><h2 className="font-display text-[17px] font-bold text-ink">{t('대학원에 진학했어요')}</h2></div>
          <p className="mt-1 text-[12px] text-ink-3">{grad ? `${t('현재')}: ${stageLabel(stageOf(me), lang)} · ${t('시간표와 캠퍼스 추천은 그대로예요')}` : t('시간표·캠퍼스 추천은 그대로, 프로필 표시만 바뀌어요.')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['masters', 'phd'] as Stage[]).map((s) => (
              <Button key={s} variant={stageOf(me) === s ? 'primary' : 'outline'} loading={busy === s} disabled={stageOf(me) === s} onClick={() => setStage(s, s === 'masters' ? t('석사 과정으로 바꿨어요.') : t('박사 과정으로 바꿨어요.'))}>{stageLabel(s, lang)}</Button>
            ))}
          </div>
          {grad && <Button full variant="ghost" size="sm" className="mt-2" loading={busy === 'undergrad'} onClick={() => setStage('undergrad', t('학부생으로 바꿨어요.'))}>{t('학부생으로 되돌리기')}</Button>}
        </section>
      </div>
    </div>
  );
}
