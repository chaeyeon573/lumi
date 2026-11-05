import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Lock, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import type { OrgInput } from '@core/api/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { cn } from '@core/lib/cn';
import { BottomSheet } from '@/components/ui';
import { BackHeader, PageTitle, FormField, TextInput, TextArea, SelectField, InfoNote, BottomCTA, Btn, EmptyState } from '@/components/ha';
import { schoolLabel } from '@/pages/home/HomeDashboard';

const en = lang === 'en';
type Option<T> = { value: T; label: string; sub: string };
const TYPES: Option<OrgInput['type']>[] = [
  { value: 'club', label: en ? 'Student club' : '동아리', sub: en ? 'Interests, hobbies, culture, sports' : '관심사·취미·문화·운동' },
  { value: 'lab', label: en ? 'Research group' : '연구 모임', sub: en ? 'A lab, reading group or project team' : '연구실·리딩 그룹·프로젝트 팀' },
  { value: 'council', label: en ? 'Student association' : '학생 단체', sub: en ? 'A major, year or community association' : '전공·학년·커뮤니티 모임' },
  { value: 'coop', label: en ? 'Co-op house' : '코업 하우스', sub: en ? 'A housing co-op' : '주거 협동조합' },
];
const POLICIES: Option<OrgInput['joinPolicy']>[] = [
  { value: 'approval', label: en ? 'Approval required' : '승인 필요', sub: en ? 'You approve each request' : '요청마다 운영진이 승인' },
  { value: 'open', label: en ? 'Open to everyone' : '누구나 가입', sub: en ? 'Students at your school join right away' : '우리 학교 학생은 바로 가입' },
];

/**
 * Create a group (PDF S026) — name, about, type, join policy → orgs.create. The creator becomes its organizer,
 * the group is "Started on Lumi" (never shown as a verified school organization) and lives in the creator's school.
 */
export function CreateGroupPage() {
  const nav = useNavigate();
  const me = useViewer().me;
  const run = useAppStore((s) => s.run);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [type, setType] = useState<OrgInput['type'] | null>(null);
  const [policy, setPolicy] = useState<OrgInput['joinPolicy']>('approval');
  const [sheet, setSheet] = useState<'type' | 'policy' | null>(null);
  const [busy, setBusy] = useState(false);
  const school = schoolLabel(me);
  const ok = name.trim().length >= 3 && !!type;

  if (me.affiliation.type !== 'university') return (
    <div className="min-h-full bg-bg">
      <BackHeader title={en ? 'Create a group' : '그룹 만들기'} />
      <EmptyState icon={<Users size={30} />} tone="mint" title={en ? 'Groups belong to a school' : '그룹은 학교에 속해요'} sub={en ? 'Verify your school email first, then start a group there.' : '학교 이메일을 먼저 인증하면 그 학교에 그룹을 만들 수 있어요.'} />
    </div>
  );

  const create = async () => {
    if (!ok || !type) return;
    setBusy(true);
    try {
      const r = await run(() => api.orgs.create(me.id, { name: name.trim(), description: about.trim(), type, joinPolicy: policy }), en ? 'Group created — you’re its organizer.' : '그룹을 만들었어요 — 내가 운영진이에요.');
      nav(`/orgs/${r.org.id}`, { replace: true });
    } catch { /* toast */ } finally { setBusy(false); }
  };

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Create a group' : '그룹 만들기'} />
      <PageTitle title={en ? 'Create a group' : '그룹 만들기'} sub={school ? (en ? `At ${school}` : `${school}에서`) : undefined} />
      <div className="px-4 space-y-5 flex-1 pb-6">
        <FormField label={en ? 'Group name' : '그룹 이름'}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={en ? 'Name your community' : '커뮤니티 이름'} autoFocus />
        </FormField>
        <FormField label={en ? 'About' : '소개'} hint={about.length > 400 ? `${about.length}/500` : undefined}>
          <TextArea value={about} onChange={(e) => setAbout(e.target.value)} maxLength={500} placeholder={en ? 'A little about your group' : '그룹을 짧게 소개해 주세요'} />
        </FormField>
        <FormField label={en ? 'Group type' : '그룹 종류'}>
          <SelectField icon={<Users size={19} />} value={TYPES.find((t) => t.value === type)?.label} placeholder={en ? 'Choose a type' : '종류 고르기'} onClick={() => setSheet('type')} />
        </FormField>
        <FormField label={en ? 'Join policy' : '가입 방식'}>
          <SelectField icon={<Lock size={18} />} value={POLICIES.find((p) => p.value === policy)?.label} placeholder="" onClick={() => setSheet('policy')} />
        </FormField>
        <InfoNote>{en ? 'Groups you start show as “Started on Lumi”, not as a verified school organization.' : '직접 만든 그룹은 학교 인증 단체가 아니라 ‘Lumi에서 시작’으로 보여요.'}</InfoNote>
      </div>
      <BottomCTA><Btn full size="lg" disabled={!ok} loading={busy} onClick={create}>{en ? 'Create Group' : '그룹 만들기'}</Btn></BottomCTA>

      <BottomSheet open={sheet === 'type'} onClose={() => setSheet(null)} title={en ? 'Group type' : '그룹 종류'}>
        <Options options={TYPES} value={type} onPick={(v) => { setType(v); setSheet(null); }} />
      </BottomSheet>
      <BottomSheet open={sheet === 'policy'} onClose={() => setSheet(null)} title={en ? 'Join policy' : '가입 방식'}>
        <Options options={POLICIES} value={policy} onPick={(v) => { setPolicy(v); setSheet(null); }} />
      </BottomSheet>
    </div>
  );
}

function Options<T extends string>({ options, value, onPick }: { options: Option<T>[]; value: T | null; onPick: (v: T) => void }) {
  return (
    <div className="space-y-2 pb-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onPick(o.value)} className={cn('w-full p-4 rounded-2xl border flex items-center gap-3 text-left press', on ? 'border-sel-line bg-sel-soft' : 'border-line bg-surface')}>
            <span className="flex-1 min-w-0"><span className={cn('block text-[15px] font-bold', on && 'text-sel-fg')}>{o.label}</span><span className="block text-[13px] text-ink-3 mt-0.5">{o.sub}</span></span>
            {on && <Check size={19} className="text-sel-fg shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
