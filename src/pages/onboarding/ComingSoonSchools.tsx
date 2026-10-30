import { useState } from 'react';
import { Search } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';
import { Button, Input } from '@/components/ui';

/**
 * 아직 안 연 학교 — 시작 화면 목록에만 보이고, 고르면 대기 명단(이메일)만 받는다 (2026-10-30 사장님 결정: “목록에만 넣는 거지”).
 * 수업·동아리·인증 데이터는 없다. 받은 이메일은 의견(feedback) 통로로 사장님께 간다 — 서버에 새 저장소를 만들지 않는다.
 */
export const COMING_SOON: { name: string; region: string }[] = [
  { name: 'Stanford University', region: 'Stanford, CA' }, { name: 'UCLA', region: 'Los Angeles, CA' }, { name: 'USC', region: 'Los Angeles, CA' },
  { name: 'UC San Diego', region: 'La Jolla, CA' }, { name: 'UC Irvine', region: 'Irvine, CA' }, { name: 'UC Davis', region: 'Davis, CA' },
  { name: 'UC Santa Barbara', region: 'Santa Barbara, CA' }, { name: 'UC Santa Cruz', region: 'Santa Cruz, CA' }, { name: 'UC Riverside', region: 'Riverside, CA' },
  { name: 'Caltech', region: 'Pasadena, CA' }, { name: 'San José State University', region: 'San Jose, CA' }, { name: 'San Francisco State University', region: 'San Francisco, CA' },
  { name: 'University of Washington', region: 'Seattle, WA' }, { name: 'MIT', region: 'Cambridge, MA' }, { name: 'Harvard University', region: 'Cambridge, MA' },
  { name: 'Yale University', region: 'New Haven, CT' }, { name: 'Princeton University', region: 'Princeton, NJ' }, { name: 'Columbia University', region: 'New York, NY' },
  { name: 'New York University', region: 'New York, NY' }, { name: 'Cornell University', region: 'Ithaca, NY' }, { name: 'University of Pennsylvania', region: 'Philadelphia, PA' },
  { name: 'Carnegie Mellon University', region: 'Pittsburgh, PA' }, { name: 'Brown University', region: 'Providence, RI' }, { name: 'Dartmouth College', region: 'Hanover, NH' },
  { name: 'Boston University', region: 'Boston, MA' }, { name: 'Northeastern University', region: 'Boston, MA' }, { name: 'Tufts University', region: 'Medford, MA' },
  { name: 'Johns Hopkins University', region: 'Baltimore, MD' }, { name: 'Georgetown University', region: 'Washington, DC' }, { name: 'Duke University', region: 'Durham, NC' },
  { name: 'UNC Chapel Hill', region: 'Chapel Hill, NC' }, { name: 'University of Virginia', region: 'Charlottesville, VA' }, { name: 'Georgia Tech', region: 'Atlanta, GA' },
  { name: 'Emory University', region: 'Atlanta, GA' }, { name: 'Vanderbilt University', region: 'Nashville, TN' }, { name: 'Rice University', region: 'Houston, TX' },
  { name: 'UT Austin', region: 'Austin, TX' }, { name: 'University of Chicago', region: 'Chicago, IL' }, { name: 'Northwestern University', region: 'Evanston, IL' },
  { name: 'UIUC', region: 'Urbana-Champaign, IL' }, { name: 'University of Michigan', region: 'Ann Arbor, MI' }, { name: 'UW–Madison', region: 'Madison, WI' },
  { name: 'Purdue University', region: 'West Lafayette, IN' }, { name: 'University of Notre Dame', region: 'Notre Dame, IN' }, { name: 'WashU in St. Louis', region: 'St. Louis, MO' },
];

export function ComingSoonSchools({ openNames }: { openNames: string[] }) {
  const en = lang === 'en';
  const [q, setQ] = useState('');
  const [pick, setPick] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const open = new Set(openNames.map((n) => n.toLowerCase()));
  const list = COMING_SOON.filter((s) => !open.has(s.name.toLowerCase()) && (!q.trim() || `${s.name} ${s.region}`.toLowerCase().includes(q.trim().toLowerCase())));
  const shown = q.trim() ? list : list.slice(0, 6);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const join = async () => {
    setState('busy');
    try { await api.system.feedback(`[waitlist] ${pick} · ${email.trim()}`, '/start'); setState('done'); } catch { setState('error'); }
  };
  return (
    <div className="pt-4 space-y-2.5">
      <div>
        <b className="block text-[15px]">{en ? 'Another school?' : '다른 학교예요?'}</b>
        <span className="text-[12px] text-ink-3">{en ? 'Lumi is starting at UC Berkeley. Pick your school and we’ll email you when it opens.' : 'Lumi는 UC Berkeley에서 먼저 시작해요. 학교를 고르면 열릴 때 메일로 알려 드려요.'}</span>
      </div>
      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input className="pl-9" placeholder={en ? 'Search schools' : '학교 검색'} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((s) => (
          <button key={s.name} onClick={() => { setPick(s.name); setState('idle'); }} className={cn('h-9 px-3 rounded-full border text-[13px] font-semibold press', pick === s.name ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink-2')}>{s.name}</button>
        ))}
        {!shown.length && <span className="text-[12px] text-ink-3">{en ? 'Not on the list yet — tell us in Feedback.' : '아직 목록에 없어요 — 의견 보내기로 알려 주세요.'}</span>}
      </div>
      {pick && (
        <div className="card p-3.5 space-y-2">
          <span className="block text-[13px] font-semibold">{en ? `${pick} — coming soon` : `${pick} — 곧 열려요`}</span>
          {state === 'done' ? (
            <span className="block text-[13px] text-ink-2">{en ? 'You’re on the list. We’ll email you when it opens.' : '대기 명단에 넣었어요. 열리면 메일로 알려 드릴게요.'}</span>
          ) : (
            <div className="flex gap-2">
              <Input type="email" inputMode="email" placeholder={en ? 'Your email' : '이메일'} value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button disabled={!valid || state === 'busy'} onClick={join}>{en ? 'Notify me' : '알림 받기'}</Button>
            </div>
          )}
          {state === 'error' && <span className="block text-[12px] text-danger">{en ? 'Couldn’t save — try again.' : '저장하지 못했어요. 다시 시도해 주세요.'}</span>}
        </div>
      )}
    </div>
  );
}
