import { useState } from 'react';
import { t, lang } from '@core/i18n';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ShieldQuestion } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Field, Input, Textarea, Toggle, VisibilityPicker, Segmented, BottomSheet } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_AVAILABILITY, ALL_INTERESTS, ALL_PURPOSES, AVAILABILITY_LABELS, INTEREST_EMOJI, INTEREST_LABELS, PURPOSE_LABELS } from '@core/lib/labels';
import type { Availability, Interest, ProfileField, Purpose, User, VerificationMethod } from '@core/types';
import { cn } from '@core/lib/cn';
import { isAlumniStage, verificationLabel } from '@core/lib/network';
import { localeContext } from '@core/lib/locale-context';
import { OpenToChips } from '@/components/profile_OpenToChips';
import { CareerFields, ChipsWithText, CityFields } from '@/components/profile_CareerFields';

const EMOJIS = ['🙂', '😎', '🧑‍💻', '👩‍🎨', '🧑‍🔬', '🏃', '🎸', '📚', '🌱', '🎨', '🚀', '🧗', '☕', '🐱', '🦊', '🎧'];

export function EditProfilePage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const me = v.me;
  const ctx = localeContext();
  const [form, setForm] = useState<User>(() => structuredClone(me));
  const [busy, setBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifying, setVerifying] = useState<VerificationMethod | null>(null);
  const patch = (p: Partial<User>) => setForm((f) => ({ ...f, ...p }));
  const toggle = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((i) => i !== x) : [...arr, x]);
  const fv = (k: ProfileField) => <VisibilityPicker compact value={form.fieldVisibility[k]} onChange={(vis) => patch({ fieldVisibility: { ...form.fieldVisibility, [k]: vis } })} />;
  const aff = form.affiliation.type === 'university' ? form.affiliation : null;
  const alumni = isAlumniStage(form);
  const domain = (aff && schools.find((s) => s.id === aff.schoolId)?.emailDomain) || (lang === 'en' ? 'berkeley.edu' : 'yonsei.ac.kr');
  const verifications = ctx.verifications(domain).filter((o) => o.for === (alumni ? 'alumni' : 'student'));
  const thisYear = new Date().getFullYear();

  const save = async () => {
    setBusy(true);
    try {
      const { id: _id, createdAt: _c, verification: _v, ...rest } = form;
      const homeCity = form.homeCity?.trim();
      // 인증 상태는 시트에서 즉시 저장되므로 폼 값으로 덮어쓰지 않는다
      const affiliation = rest.affiliation.type === 'university' && me.affiliation.type === 'university' ? { ...rest.affiliation, emailVerified: me.affiliation.emailVerified || rest.affiliation.emailVerified } : rest.affiliation;
      await run(() => api.users.update(me.id, { ...rest, affiliation, homeCity: homeCity || undefined, activityCity: form.activityCity?.trim() || undefined, region: homeCity || form.region }), t('프로필을 저장했어요.'));
      nav('/profile', { replace: true });
    } catch { setBusy(false); }
  };

  const verify = async (method: VerificationMethod) => {
    setVerifying(method);
    try {
      const p = await run(() => api.users.verify(me.id, method), t('학교 인증이 완료됐어요.'));
      const u = p.users?.find((x) => x.id === me.id);
      if (u) patch({ verification: u.verification, affiliation: u.affiliation.type === 'university' && aff ? { ...aff, emailVerified: true } : form.affiliation });
      setVerifyOpen(false);
    } catch { /* toast by run */ } finally { setVerifying(null); }
  };

  return (
    <div className="min-h-full pb-28">
      <TopBar back title={t('프로필 편집')} />
      <div className="px-4 py-4 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-3xl grid place-items-center text-4xl shrink-0" style={{ background: `linear-gradient(135deg, hsl(${form.avatar.hue} 85% 88%), hsl(${(form.avatar.hue + 40) % 360} 80% 74%))` }}>{form.avatar.emoji}</div>
          <div className="flex-1">
            <Segmented value={form.avatar.photoType} onChange={(pt) => patch({ avatar: { ...form.avatar, photoType: pt } })} options={[{ value: 'face', label: t('얼굴') }, { value: 'masked', label: t('가면') }, { value: 'back', label: t('뒷모습') }]} />
            <input type="range" min={0} max={359} value={form.avatar.hue} onChange={(e) => patch({ avatar: { ...form.avatar, hue: Number(e.target.value) } })} className="w-full mt-2 accent-primary" aria-label={t('배경 색상')} />
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1.5">{EMOJIS.map((e) => <button key={e} type="button" onClick={() => patch({ avatar: { ...form.avatar, emoji: e } })} className={cn('h-10 rounded-xl text-xl', form.avatar.emoji === e ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2')}>{e}</button>)}</div>
        <Field label={t('닉네임')} required><Input value={form.nickname} onChange={(e) => patch({ nickname: e.target.value })} maxLength={12} /></Field>

        {/* ── 학교 · 전공 · 졸업연도 ── */}
        {aff && (
          <div className="card px-4 divide-y divide-line">
            <div className="py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <b className="text-[13px] flex items-center gap-1">{aff.schoolName}{aff.emailVerified && <BadgeCheck size={14} className="text-verify" />}</b>
                  <div className="text-[12px] text-ink-3">{form.verification ? verificationLabel(form.verification.method, lang) : aff.emailVerified ? t('학교 인증 완료') : t('미인증')}</div>
                </div>
                <Button size="sm" variant={aff.emailVerified ? 'outline' : 'primary'} icon={<ShieldQuestion size={14} />} onClick={() => setVerifyOpen(true)}>{aff.emailVerified ? t('다른 방법으로 인증') : t('인증하기')}</Button>
              </div>
            </div>
            <div className="py-3 space-y-4">
              <ChipsWithText label={t('전공')} options={ctx.majors} value={aff.department} placeholder={t('학과 이름')} onChange={(d) => patch({ affiliation: { ...aff, department: d } })} />
              <Field label={alumni ? t('졸업연도') : t('졸업 예정연도')} hint={alumni ? undefined : t('프로필에 "\'25 졸업 예정"으로 표시돼요. 연도가 지나면 상태 변경을 제안해요.')}>
                <div className="flex flex-wrap gap-1.5 mb-2">{Array.from({ length: 6 }, (_, i) => (alumni ? thisYear - 5 : thisYear) + i).map((y) => <Chip key={y} size="sm" active={form.gradYear === y} onClick={() => patch({ gradYear: form.gradYear === y ? undefined : y })}>{y}</Chip>)}</div>
                <Input type="number" placeholder={String(thisYear + 1)} value={form.gradYear ?? ''} onChange={(e) => patch({ gradYear: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
            </div>
            <Toggle label={t('학교명 공개')} checked={aff.showSchool} onChange={(val) => patch({ affiliation: { ...aff, showSchool: val } })} />
            <Toggle label={t('학과 공개')} checked={aff.showDepartment} onChange={(val) => patch({ affiliation: { ...aff, showDepartment: val } })} />
          </div>
        )}

        {/* ── 현재: 거주 도시 · 활동 지역 · (졸업생) 하는 일 ── */}
        <div className="card p-4 space-y-4">
          <div><b className="text-[13px]">{t('현재')}</b><div className="text-[12px] text-ink-3">{t('도시·생활권 단위만 — GPS 위치는 설정 › 위치에서 따로 다뤄요')}</div></div>
          <CityFields homeCity={form.homeCity ?? form.region ?? ''} activityCity={form.activityCity ?? ''} onChange={({ homeCity, activityCity }) => patch({ homeCity, activityCity })} />
          {alumni && (
            <>
              <div className="pt-2 border-t border-line"><b className="text-[13px]">{t('하는 일')}</b><div className="text-[12px] text-ink-3">{t('직함이 아니라 "같은 분야 사람"을 찾는 기준으로만 쓰여요.')}</div></div>
              <CareerFields value={form.career ?? {}} onChange={(career) => patch({ career })} />
            </>
          )}
        </div>

        <Field label={t('지금 하고 싶은 활동 (한 줄)')} hint={t('홈 추천 카드에 표시돼요')}><Input placeholder={t('예: 오늘 저녁 신촌에서 커피 한 잔?')} value={form.nowWant ?? ''} onChange={(e) => patch({ nowWant: e.target.value })} /></Field>
        <Field label={t('자기소개')} right={fv('bio')}><Textarea value={form.bio} onChange={(e) => patch({ bio: e.target.value })} maxLength={200} /></Field>
        <Field label={t('좋아하는 것')} right={fv('likes')}><Input value={form.likes} onChange={(e) => patch({ likes: e.target.value })} /></Field>
        <Field label={t('자유시간에 하고 싶은 활동')} right={fv('freeTime')}><Input value={form.freeTime} onChange={(e) => patch({ freeTime: e.target.value })} /></Field>
        <Field label={t('관심사')} right={fv('interests')}><div className="flex flex-wrap gap-2">{ALL_INTERESTS.map((i) => <Chip key={i} active={form.interests.includes(i)} onClick={() => patch({ interests: toggle(form.interests, i) as Interest[] })}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Chip>)}</div></Field>
        <Field label={t('열려 있어요')} hint={t('지금 열려 있는 것 — 사람 카드와 프로필에 표시돼요')}><OpenToChips value={form.openTo ?? []} onChange={(openTo) => patch({ openTo })} /></Field>
        <Field label={t('이용 목적')} right={fv('purposes')}><div className="flex flex-wrap gap-2">{ALL_PURPOSES.map((p) => <Chip key={p} active={form.purposes.includes(p)} onClick={() => patch({ purposes: toggle(form.purposes, p) as Purpose[] })}>{PURPOSE_LABELS[p]}</Chip>)}</div></Field>
        <Field label={t('활동 가능한 시간')} right={fv('availability')}><div className="flex flex-wrap gap-2">{ALL_AVAILABILITY.map((a) => <Chip key={a} active={form.availability === a} onClick={() => patch({ availability: a as Availability })}>{AVAILABILITY_LABELS[a]}</Chip>)}</div></Field>
        <Field label={t('키 (선택)')} right={fv('height')}><Input type="number" placeholder="cm" value={form.height ?? ''} onChange={(e) => patch({ height: e.target.value ? Number(e.target.value) : undefined })} /></Field>
        <Field label={t('관심 있는 사람의 조건 (선택)')} right={fv('preferredPartner')}><Input value={form.preferredPartner ?? ''} onChange={(e) => patch({ preferredPartner: e.target.value })} /></Field>
        <div className="card px-4"><Toggle label={t('본인 인증')} description={form.identityVerified ? t('인증 완료 — 프로필에 배지가 표시돼요') : t('데모에서는 토글로 인증 상태를 바꿀 수 있어요')} checked={form.identityVerified} onChange={(val) => patch({ identityVerified: val })} /></div>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20"><Button full size="lg" loading={busy} disabled={form.nickname.trim().length < 2} onClick={save}>{t('저장')}</Button></div>

      <BottomSheet open={verifyOpen} onClose={() => setVerifyOpen(false)} title={t('학교 인증 방법')}>
        <p className="text-[12px] text-ink-3 mb-3">{t('인증은 학교 배지의 신뢰 근거예요. 데모에서는 어떤 방법이든 바로 완료돼요.')}</p>
        <div className="space-y-2">
          {verifications.map((o) => (
            <button key={o.method} onClick={() => verify(o.method)} disabled={!!verifying} className={cn('w-full text-left rounded-2xl border px-4 py-3 flex items-center gap-3 press', form.verification?.method === o.method ? 'border-primary bg-primary-soft' : 'border-line')}>
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-primary">{o.title}</span><span className="block text-[12px] text-ink-3">{o.desc}</span></span>
              {form.verification?.method === o.method ? <BadgeCheck size={18} className="text-verify shrink-0" /> : <span className="text-[11px] font-bold text-ink-3 shrink-0">{verifying === o.method ? '…' : o.demo === 'code' ? t('코드 123456') : t('즉시')}</span>}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
