import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Briefcase, MapPin } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Field, Input } from '@/components/ui';
import { ChipsWithText } from '@/components/profile_CareerFields';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { localeContext } from '@core/lib/locale-context';
import { schoolBadge } from '@core/lib/network';
import type { Career } from '@core/types';

/**
 * 졸업 후 정보 (화면 30) — 거주 도시 · 활동 지역 · 하는 일. 전부 선택.
 * 저장하면 stage=alumni, 홈과 추천이 졸업생 기준으로 바뀐다. 연결·글·그룹·인증은 그대로.
 */
export function StatusCareerPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const ctx = localeContext();
  const [homeCity, setHomeCity] = useState(me.homeCity ?? me.career?.city ?? me.region ?? '');
  const [activityCity, setActivityCity] = useState(me.activityCity ?? '');
  const [career, setCareer] = useState<Career>(() => ({ ...me.career }));
  const [busy, setBusy] = useState(false);
  const setC = (k: keyof Career, val: string) => setCareer((c) => ({ ...c, [k]: val.trim() ? val : undefined }));
  const alumniBadge = schoolBadge({ ...me, stage: 'alumni' }, lang);

  const finish = async () => {
    setBusy(true);
    try {
      const c: Career = { ...career, city: homeCity.trim() || career.city };
      await run(() => api.users.setStage(me.id, 'alumni', c, homeCity.trim() || undefined, activityCity), t('홈과 추천이 졸업생 기준으로 바뀌었어요'));
      nav('/', { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28">
      <TopBar back title={t('졸업 후 정보')} />
      <div className="px-4 py-4 space-y-6">
        <div className="card p-4 bg-[linear-gradient(120deg,#D2E4FF,#FFFFFF)] flex items-center gap-3">
          <span className="h-11 w-11 rounded-full bg-white grid place-items-center text-primary shrink-0"><GraduationCap size={22} /></span>
          <div className="min-w-0"><b className="block text-[14px] text-primary truncate">{alumniBadge} ✓</b><p className="text-[12px] text-ink-2">{t('모두 선택 사항이에요. 적을수록 같은 도시·분야의 동문과 더 정확하게 연결돼요.')}</p></div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1"><MapPin size={15} className="text-primary" /><b className="text-[14px] text-primary">{t('어디에 있나요?')}</b></div>
          <ChipsWithText label={t('현재 거주 도시')} hint={ctx.cityHint} options={ctx.cities} value={homeCity} placeholder={t('도시 이름')} onChange={setHomeCity} />
          <ChipsWithText label={t('활동 지역 (선택)')} hint={t('거주지와 다를 수 있어요 — 예: 거주 성남 · 활동 서울')} options={ctx.cities} value={activityCity} placeholder={t('주로 활동하는 도시')} onChange={setActivityCity} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1"><Briefcase size={15} className="text-primary" /><b className="text-[14px] text-primary">{t('하는 일')}</b></div>
          <Field label={t('회사 (선택)')}><Input placeholder={t('예: 토스')} value={career.company ?? ''} onChange={(e) => setC('company', e.target.value)} /></Field>
          <ChipsWithText label={t('업종')} options={ctx.industries} value={career.industry ?? ''} placeholder={t('예: 핀테크')} onChange={(val) => setC('industry', val)} />
          <ChipsWithText label={t('직무')} options={ctx.roles} value={career.role ?? ''} placeholder={t('예: PM')} onChange={(val) => setC('role', val)} />
          <p className="text-[12px] text-ink-3">{t('직함이 아니라 "같은 분야 사람"을 찾는 기준으로만 쓰여요.')}</p>
        </section>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" loading={busy} icon={<GraduationCap size={17} />} onClick={finish}>{t('졸업생으로 시작하기')}</Button>
      </div>
    </div>
  );
}
