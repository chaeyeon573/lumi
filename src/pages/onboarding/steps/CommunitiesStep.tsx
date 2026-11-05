import { useEffect, useRef, useState } from 'react';
import { Check, FlaskConical, Landmark, Plus, Users } from 'lucide-react';
import { api } from '@core/api';
import type { Organization } from '@core/types';
import type { OrgHit } from '@core/lib/signup';
import { cn } from '@core/lib/cn';
import { Chip, ChipRow, IconTile, InfoNote, SearchField, cardCls } from '@/components/ha';
import { StepFrame, en, toggle, type Saves, type StepProps } from './shared';

/**
 * S010 Your communities (optional, Skip) — community kinds as chips (saved as goals · interests) and a real search of the
 * school's organizations (`api.schools.searchOrgs`, works signed out). Picked organizations are followed once the account
 * exists — following is not membership, which is verified separately (PDF footnote).
 * The PDF's hero shows three faces labelled "Illustrative profiles"; we draw community icons instead (no fake people).
 */
export const COMMUNITIES: ({ key: string; label: string } & Saves)[] = [
  { key: 'clubs', label: en ? 'Student Clubs' : '동아리', goals: ['join_club'], interests: ['club'] },
  { key: 'greek', label: en ? 'Greek Life' : '그릭 라이프', goals: ['join_club'], interests: ['club'] },
  { key: 'lab', label: en ? 'Research Labs' : '연구실', goals: ['lab'], interests: ['research'] },
  { key: 'dept', label: en ? 'Major / Department' : '전공 / 학과', goals: [], interests: ['networking'] },
  { key: 'sports', label: en ? 'Sports' : '스포츠', goals: [], interests: ['exercise'] },
  { key: 'cultural', label: en ? 'Cultural Groups' : '문화 모임', goals: ['join_club'], interests: ['club'] },
  { key: 'dorm', label: en ? 'Residence' : '기숙사', goals: [], interests: ['meal'] },
  { key: 'coop', label: en ? 'Co-op' : '코업', goals: [], interests: ['club'] },
];

const TYPE_LABEL: Record<Organization['type'], string> = en
  ? { club: 'Student club', greek: 'Greek life', lab: 'Research lab', coop: 'Co-op', council: 'Student council', department: 'Campus office' }
  : { club: '동아리', greek: '그릭 라이프', lab: '연구실', coop: '코업', council: '학생회', department: '학교 기관' };

export function CommunitiesStep({ d, patch, next, schoolName }: StepProps & { schoolName?: string }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<OrgHit[]>([]);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const searchRef = useRef<HTMLDivElement>(null);
  const query = q.trim();

  useEffect(() => {
    if (query.length < 2) { setHits([]); setState('idle'); return; }
    let live = true;
    setState('busy');
    const id = setTimeout(() => {
      api.schools.searchOrgs(d.schoolId, query)
        .then((r) => { if (live) { setHits(r); setState('idle'); } })
        .catch(() => { if (live) setState('error'); });
    }, 250);
    return () => { live = false; clearTimeout(id); };
  }, [query, d.schoolId]);

  const picked = (id: string) => d.orgs.some((o) => o.id === id);
  const flip = (o: OrgHit) => patch({ orgs: picked(o.id) ? d.orgs.filter((x) => x.id !== o.id) : [...d.orgs, o].slice(0, 20) });
  const focusSearch = () => { const el = searchRef.current?.querySelector('input'); el?.focus(); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); };

  return (
    <StepFrame title={en ? 'Your communities' : '나의 커뮤니티'} sub={en ? 'Pick your communities for relevant events, opportunities, and people.' : '커뮤니티를 고르면 맞는 행사·기회·사람을 보여 드려요.'}
      cta={{ label: en ? 'Next' : '다음', onClick: next }}>
      <div className="rounded-[20px] bg-t-ice px-5 py-6 flex flex-col items-center text-center">
        <div className="flex" aria-hidden>
          <IconTile tone="mint" size={46} className="!rounded-full ring-4 ring-t-ice"><Users size={21} /></IconTile>
          <IconTile tone="rose" size={46} className="!rounded-full ring-4 ring-t-ice -ml-2.5"><Landmark size={21} /></IconTile>
          <IconTile tone="peach" size={46} className="!rounded-full ring-4 ring-t-ice -ml-2.5"><FlaskConical size={21} /></IconTile>
        </div>
        <p className="mt-3.5 text-[17px] font-extrabold leading-snug tracking-[-0.01em] max-w-[240px]">{en ? 'Connect through shared communities' : '같은 커뮤니티로 연결돼요'}</p>
        <p className="mt-1 text-[12.5px] text-ink-2">{en ? 'Clubs, labs, houses and teams you belong to or follow.' : '속해 있거나 팔로우하는 동아리·연구실·하우스·팀.'}</p>
      </div>

      <ChipRow wrap className="mt-5">
        {COMMUNITIES.map((c) => <Chip key={c.key} active={d.communities.includes(c.key)} onClick={() => patch({ communities: toggle(d.communities, c.key) })}>{c.label}</Chip>)}
        <Chip onClick={focusSearch} icon={<Plus size={15} />}>{en ? 'Add your own' : '직접 찾기'}</Chip>
      </ChipRow>

      {d.orgs.length > 0 && (
        <ChipRow wrap className="mt-4">
          {d.orgs.map((o) => <Chip key={o.id} active onClick={() => flip(o)} icon={<Check size={14} />}>{o.name}</Chip>)}
        </ChipRow>
      )}

      <div ref={searchRef} className="mt-4">
        <SearchField placeholder={en ? 'Search organizations' : '단체 검색'} value={q} onChange={setQ} />
      </div>
      {query.length >= 2 && (
        <div className="mt-2.5 space-y-2" aria-live="polite">
          {hits.map((o) => {
            const on = picked(o.id);
            return (
              <button key={o.id} type="button" aria-pressed={on} onClick={() => flip(o)} className={cn(cardCls, 'w-full p-3.5 flex items-center gap-3 text-left press', on && 'bg-sel-soft border-sel-line')}>
                <IconTile tone={o.type === 'greek' ? 'rose' : o.type === 'lab' ? 'peach' : 'mint'} size={40}><Users size={19} /></IconTile>
                <span className="flex-1 min-w-0"><b className="block text-[14.5px] font-bold truncate">{o.name}</b><span className="block text-[12.5px] text-ink-3">{TYPE_LABEL[o.type]}</span></span>
                <span className={cn('h-8 px-3 rounded-full border text-[12.5px] font-semibold flex items-center gap-1 shrink-0', on ? 'border-sel-line text-sel-fg' : 'border-line text-ink')}>
                  {on ? <><Check size={14} />{en ? 'Following' : '팔로우'}</> : (en ? 'Follow' : '팔로우')}
                </span>
              </button>
            );
          })}
          {state === 'idle' && !hits.length && <InfoNote>{en ? `No organization at ${schoolName ?? 'your school'} matches “${query}” yet.` : `${schoolName ?? '학교'}에 “${query}”와 맞는 단체가 아직 없어요.`}</InfoNote>}
          {state === 'error' && <InfoNote>{en ? 'Couldn’t search right now. You can follow organizations later in Explore.' : '지금은 검색할 수 없어요. 나중에 탐색에서 팔로우할 수 있어요.'}</InfoNote>}
        </div>
      )}

      <InfoNote className="mt-4">{en ? 'Membership is verified separately. Add or change communities later.' : '회원 인증은 따로 해요. 커뮤니티는 나중에 바꿀 수 있어요.'}</InfoNote>
    </StepFrame>
  );
}
