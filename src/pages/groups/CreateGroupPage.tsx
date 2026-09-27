import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@core/i18n';
import type { GroupInput } from '@core/api';
import type { GroupScope, Interest } from '@core/types';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Field, Input, Textarea, Segmented } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { GROUP_SCOPE_LABELS, GROUP_SCOPE_EMOJI } from '@core/lib/meet';
import { INTEREST_LABELS, INTEREST_EMOJI, ONBOARDING_INTERESTS } from '@core/lib/labels';
import { localeContext } from '@core/lib/locale-context';
import { cityOf } from '@core/lib/network';
import { cn } from '@core/lib/cn';

const LOGO_EMOJIS = ['🌱', '☕', '🏃', '📚', '🎸', '🎨', '💻', '🚀', '🤝', '🎬', '🍜', '🌏'];
const LOGO_HUES = [30, 220, 135, 285, 15, 175, 355, 100, 50, 235];
const MAX_INTERESTS = 3;
const SCOPES = Object.keys(GROUP_SCOPE_LABELS) as GroupScope[];

/** /groups/new — 그룹은 누구나 자유롭게. 성격(학교·지역·관심사·직업)은 만든 사람이 고르고 AroundU는 규정하지 않는다 */
export function CreateGroupPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : undefined;
  const schoolName = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolName : schools.find((s) => s.id === schoolId)?.name;
  const cities = localeContext().cities;
  const myCity = cityOf(v.me);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<GroupScope>(schoolId ? 'school' : 'interest');
  const [city, setCity] = useState(myCity && cities.includes(myCity) ? myCity : cities[0]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [joinPolicy, setJoinPolicy] = useState<GroupInput['joinPolicy']>('open');
  const [logo, setLogo] = useState<GroupInput['logo']>({ emoji: LOGO_EMOJIS[0], hue: LOGO_HUES[1] });
  const [busy, setBusy] = useState(false);

  const toggleInterest = (i: Interest) => setInterests((cur) => cur.includes(i) ? cur.filter((x) => x !== i) : cur.length >= MAX_INTERESTS ? cur : [...cur, i]);
  const valid = name.trim().length >= 2 && description.trim().length > 0 && (scope !== 'school' || !!schoolId);

  const submit = async () => {
    setBusy(true);
    try {
      const input: GroupInput = { name: name.trim(), description: description.trim(), scope, city: scope === 'city' ? city : undefined, schoolId: scope === 'school' ? schoolId : undefined, joinPolicy, logo, interests };
      const res = await run(() => api.orgs.create(v.me.id, input), t('그룹을 만들었어요.'));
      nav(`/orgs/${res.org.id}`, { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title={t('그룹 만들기')} />
      <div className="px-4 py-4 space-y-5">
        <Field label={t('이름')} required><Input placeholder={t('예: 아침 러닝 크루')} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></Field>
        <Field label={t('설명')} required><Textarea placeholder={t('어떤 사람들이 모이는 그룹인지 한두 줄로 적어주세요.')} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} /></Field>
        <Field label={t('성격')} required hint={t('그룹의 성격은 만든 사람이 정해요. 나중에 바꿀 수 있어요.')}>
          <div className="flex flex-wrap gap-1.5">{SCOPES.map((s) => <Chip key={s} active={scope === s} onClick={() => setScope(s)}>{GROUP_SCOPE_EMOJI[s]} {GROUP_SCOPE_LABELS[s]}</Chip>)}</div>
          {scope === 'city' && <div className="flex flex-wrap gap-1.5 mt-2">{cities.map((c) => <Chip key={c} size="sm" active={city === c} onClick={() => setCity(c)}>{c}</Chip>)}</div>}
          {scope === 'school' && (
            schoolId
              ? <div className="mt-2 h-11 rounded-2xl bg-surface-2 px-3.5 flex items-center text-[14px] text-ink-2">🏫 {schoolName}</div>
              : <p className="mt-2 text-[12px] text-danger">{t('학교 인증 후 학교 기반 그룹을 만들 수 있어요.')}</p>
          )}
        </Field>
        <Field label={`${t('관심사 (선택)')} ${interests.length}/${MAX_INTERESTS}`}>
          <div className="flex flex-wrap gap-1.5">{ONBOARDING_INTERESTS.map((i) => <Chip key={i} size="sm" active={interests.includes(i)} onClick={() => toggleInterest(i)}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Chip>)}</div>
        </Field>
        <Field label={t('가입 방식')} required>
          <Segmented value={joinPolicy} onChange={setJoinPolicy} options={[{ value: 'open', label: t('공개 (바로 가입)') }, { value: 'approval', label: t('승인') }]} />
        </Field>
        <Field label={t('로고')}>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl grid place-items-center text-3xl shrink-0" style={{ background: `linear-gradient(135deg, hsl(${logo.hue} 80% 92%), hsl(${(logo.hue + 50) % 360} 70% 68%))` }}>{logo.emoji}</div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap gap-1.5">{LOGO_EMOJIS.map((e) => <button key={e} type="button" onClick={() => setLogo({ ...logo, emoji: e })} className={cn('h-8 w-8 rounded-lg text-lg', logo.emoji === e ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2')}>{e}</button>)}</div>
              <div className="flex flex-wrap gap-1.5">{LOGO_HUES.map((h) => <button key={h} type="button" onClick={() => setLogo({ ...logo, hue: h })} className={cn('h-7 w-7 rounded-full', logo.hue === h && 'ring-2 ring-offset-2 ring-ink')} style={{ background: `hsl(${h} 75% 70%)` }} aria-label={`${t('색상 ')}${h}`} />)}</div>
            </div>
          </div>
        </Field>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" disabled={!valid} loading={busy} onClick={submit}>{t('그룹 만들기')}</Button>
      </div>
    </div>
  );
}
