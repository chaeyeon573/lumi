import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Coffee, MapPin, Plus, Users, Video, X } from 'lucide-react';
import { lang } from '@core/i18n';
import { PLACE_PRESETS } from '@core/data/places';
import { POLL_MAX_PLACES } from '@core/lib/pollgrid';
import { useViewer } from '@/hooks/useViewer';
import { BackHeader, PageTitle, BottomCTA, Btn, Chip, ChipRow, InfoNote, IconTile, SectionHeader, TONE, cardCls, type Tone } from '@/components/ha';
import { loadDraft, saveDraft } from './meetingDraft';
import { cn } from '@core/lib/cn';

const en = lang === 'en';

/** PDF 의 2×2 빠른 아이디어 — 장소 종류만 (정확한 곳은 그룹이 나중에 정한다) */
const QUICK: { name: string; tone: Tone; icon: ReactNode; note: string }[] = [
  { name: en ? 'Café' : '카페', tone: 'peach', icon: <Coffee size={22} />, note: en ? 'General place suggestion' : '장소 종류' },
  { name: en ? 'Library' : '도서관', tone: 'ice', icon: <BookOpen size={22} />, note: en ? 'General place suggestion' : '장소 종류' },
  { name: en ? 'Study room' : '스터디룸', tone: 'mint', icon: <Users size={22} />, note: en ? 'Choose the exact place together' : '정확한 곳은 같이 정해요' },
  { name: en ? 'Online' : '온라인', tone: 'lav', icon: <Video size={22} />, note: en ? 'Share a meeting link in the group chat' : '그룹 채팅에 링크를 올려요' },
];
const looksLikeLink = (s: string) => /^(https?:\/\/|www\.|zoom\.us|meet\.google)/i.test(s);

/**
 * Location Ideas (PDF S033, /schedule/meeting/new/places) — 장소 칸(장소 이름이나 회의 링크), 빠른 아이디어 2×2,
 * 우리 학교 장소(캠퍼스 프리셋), 내가 고른 것 목록(×) → Save Ideas 로 Create a meeting(S032) 초안에 넣는다. 최대 6개.
 */
export function LocationIdeasPage() {
  const nav = useNavigate();
  const v = useViewer();
  const draft = loadDraft();
  const [places, setPlaces] = useState<string[]>(draft?.places ?? []);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId ?? '' : '';
  const campus = PLACE_PRESETS[schoolId] ?? [];
  const full = places.length >= POLL_MAX_PLACES;
  const add = (name: string) => {
    const s = name.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!s || full || places.some((p) => p.toLowerCase() === s.toLowerCase())) return;
    setPlaces([...places, s]);
  };
  const save = () => {
    saveDraft({ ...(draft ?? { title: '', category: 'study', inviteeIds: [], weekStart: '', minutes: 60 }), places });
    nav('/schedule/meeting/new', { replace: true });
  };
  const quick = (name: string) => QUICK.find((q) => q.name === name);
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Location Ideas' : '장소 아이디어'} />
      <PageTitle title={en ? 'Location Ideas' : '장소 아이디어'} sub={en ? 'Where would you like to meet?' : '어디서 만날까요?'} />
      <div className="px-4 pb-6 space-y-6 flex-1">
        <form onSubmit={(e) => { e.preventDefault(); add(text); setText(''); }}>
          <label className={cn(cardCls, 'h-12 px-4 flex items-center gap-2.5 rounded-2xl focus-within:border-sel-line')}>
            <MapPin size={18} className="text-ink-3 shrink-0" />
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={60} disabled={full} enterKeyHint="done"
              placeholder={full ? (en ? 'Up to 6 ideas' : '6개까지') : (en ? 'Enter a place or meeting link' : '장소나 회의 링크')} className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-ink-3" />
            {text.trim() && <button type="submit" className="text-[13px] font-semibold text-sel-fg press">{en ? 'Add' : '추가'}</button>}
          </label>
        </form>

        <section>
          <SectionHeader title={en ? 'Quick ideas' : '빠른 아이디어'} />
          <div className="grid grid-cols-2 gap-3">
            {QUICK.map((q) => {
              const on = places.includes(q.name);
              return (
                <button key={q.name} onClick={() => (on ? setPlaces(places.filter((p) => p !== q.name)) : add(q.name))} aria-pressed={on}
                  className={cn('h-[96px] rounded-[20px] flex flex-col items-center justify-center gap-2 press border-2', TONE[q.tone], on ? 'border-sel' : 'border-transparent')}>
                  {q.icon}<span className="text-[14.5px] font-bold text-ink">{q.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {campus.length > 0 && (
          <section>
            <SectionHeader title={en ? 'On campus' : '캠퍼스'} />
            <ChipRow wrap>{campus.map((p) => <Chip key={p.name} size="sm" active={places.includes(p.name)} onClick={() => (places.includes(p.name) ? setPlaces(places.filter((x) => x !== p.name)) : add(p.name))}>{p.name}</Chip>)}</ChipRow>
          </section>
        )}

        {places.length > 0 && (
          <section>
            <SectionHeader title={en ? 'Your suggestions' : '고른 장소'} />
            <div className="space-y-2.5">
              {places.map((p) => {
                const q = quick(p);
                return (
                  <div key={p} className={cn(cardCls, 'p-3.5 flex items-center gap-3.5')}>
                    <IconTile tone={q?.tone ?? 'ice'} size={40}>{q?.icon ?? (looksLikeLink(p) ? <Video size={20} /> : <MapPin size={20} />)}</IconTile>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-bold truncate">{p}</span>
                      <span className="block text-[12.5px] text-ink-3 truncate">{q?.note ?? (looksLikeLink(p) ? (en ? 'Meeting link' : '회의 링크') : campus.some((c) => c.name === p) ? (en ? 'On campus' : '캠퍼스') : (en ? 'Your idea' : '내 아이디어'))}</span>
                    </span>
                    <button onClick={() => setPlaces(places.filter((x) => x !== p))} aria-label={en ? `Remove ${p}` : `${p} 빼기`} className="h-9 w-9 grid place-items-center rounded-full text-ink-3 press"><X size={16} /></button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {!full && <Btn variant="outline" size="sm" icon={<Plus size={16} />} onClick={() => input.current?.focus()}>{en ? 'Add Another Place' : '장소 더 넣기'}</Btn>}
        <InfoNote>{en ? 'Your group can choose the exact place later.' : '정확한 장소는 그룹이 나중에 정할 수 있어요.'}</InfoNote>
      </div>
      <BottomCTA><Btn full size="lg" onClick={save}>{en ? 'Save Ideas' : '저장'}</Btn></BottomCTA>
    </div>
  );
}
