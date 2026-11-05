import { useState } from 'react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';
import { Btn, Chip, ChipRow, InfoNote, SearchField, TextInput, cardCls } from '@/components/ha';

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
    <div className="pt-6 space-y-3">
      <div>
        <h2 className="ha-h2">{en ? 'Another school?' : '다른 학교예요?'}</h2>
        <p className="text-[13.5px] text-ink-2 mt-1 leading-snug">{en ? 'Lumi is starting at UC Berkeley. Pick your school and we’ll email you when it opens.' : 'Lumi는 UC Berkeley에서 먼저 시작해요. 학교를 고르면 열릴 때 메일로 알려 드려요.'}</p>
      </div>
      <SearchField placeholder={en ? 'Search schools' : '학교 검색'} value={q} onChange={setQ} />
      <ChipRow wrap>
        {shown.map((s) => <Chip key={s.name} active={pick === s.name} onClick={() => { setPick(s.name); setState('idle'); }}>{s.name}</Chip>)}
      </ChipRow>
      {!shown.length && <InfoNote>{en ? 'Not on the list yet. Tell us in Feedback.' : '아직 목록에 없어요. 의견 보내기로 알려 주세요.'}</InfoNote>}
      {pick && (
        <div className={cn(cardCls, 'p-4 space-y-3')}>
          <b className="block text-[15px]">{en ? `${pick} is coming soon` : `${pick} — 곧 열려요`}</b>
          {state === 'done' ? (
            <p className="text-[13.5px] text-ink-2">{en ? 'You’re on the list. We’ll email you when it opens.' : '대기 명단에 넣었어요. 열리면 메일로 알려 드릴게요.'}</p>
          ) : (
            <div className="flex gap-2">
              <TextInput className="flex-1" type="email" inputMode="email" autoComplete="email" placeholder={en ? 'Your email' : '이메일'} value={email} onChange={(e) => setEmail(e.target.value)} />
              <Btn variant="outline" size="lg" className="!h-12 px-4" loading={state === 'busy'} disabled={!valid} onClick={join}>{en ? 'Notify me' : '알림 받기'}</Btn>
            </div>
          )}
          {state === 'error' && <p className="text-[12.5px] text-danger">{en ? 'Couldn’t save. Try again.' : '저장하지 못했어요. 다시 시도해 주세요.'}</p>}
        </div>
      )}
    </div>
  );
}
