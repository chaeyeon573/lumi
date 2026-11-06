import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, MapPin, MessageCircle, HelpCircle } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Opportunity, User } from '@core/types';
import { Avatar, BottomSheet, Button, SampleTag } from '@/components/ui';
import { affiliationText } from '@/components/cards/PersonCard';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { badgeOf } from '@core/lib/listings';
import { formatTime } from '@core/lib/format';
import { crewsFor, goingPeople, myGoCrew, visibleIntents } from '@core/lib/withpeople';
import { cn } from '@core/lib/cn';
import { usePeopleSnap } from './PeopleLine';

const en = lang === 'en';

/**
 * 같이 가기 시트 — 열리면 바로 같이 가기 모임에 들어간다 (없으면 연다). 누가 가는지, 언제 어디서 만나는지,
 * I'm in / Maybe, 그룹 채팅. 같은 일을 엔진(opportunities.goTogether / leaveTogether)이 한다.
 */
export function GoTogetherSheet({ o, open, onClose, autoJoin = true }: { o: Opportunity; open: boolean; onClose: () => void; autoJoin?: boolean }) {
  const nav = useNavigate();
  const run = useAppStore((s) => s.run);
  const { snap, me } = usePeopleSnap();
  const [busy, setBusy] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const tried = useRef(false);
  const crew = me ? myGoCrew(snap, me, o.id) : undefined;
  const anyCrew = crew ?? (me ? crewsFor(snap, me, o.id, 'go')[0] : undefined);
  const room = useAppStore((s) => s.chatRooms.find((r) => (roomId ? r.id === roomId : crew && r.type === 'activity' && r.activityId === crew.id)));

  const join = async () => {
    setBusy(true);
    try { const r = await run(() => api.opportunities.goTogether(o.id, me.id), r0(o)); setRoomId(r.roomId); } catch { /* toast */ } finally { setBusy(false); }
  };
  const maybe = async () => {
    setBusy(true);
    try { await run(() => api.opportunities.leaveTogether(o.id, me.id), en ? 'Marked as maybe — you left the meetup.' : '아마도로 바꿨어요 — 모임에서 빠졌어요.'); setRoomId(null); } catch { /* toast */ } finally { setBusy(false); }
  };

  // 한 번 누르면 들어간다 — 시트가 열릴 때 아직 모임에 없으면 (StrictMode에서 두 번 부르지 않게)
  useEffect(() => {
    if (!open) { tried.current = false; return; }
    if (tried.current || !autoJoin || !me) return;
    tried.current = true;
    if (!myGoCrew(snap, me, o.id)) void join();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const people = useMemo(() => {
    if (!me) return [] as { u: User; label: 'going' | 'maybe' }[];
    const going = goingPeople(snap, me, o.id);
    const ids = new Set(going.map((u) => u.id));
    const maybes = visibleIntents(snap, me, o.id).filter((x) => x.i.intent === 'interested' && !ids.has(x.u.id)).map((x) => x.u);
    return [...going.map((u) => ({ u, label: 'going' as const })), ...maybes.map((u) => ({ u, label: 'maybe' as const }))];
  }, [snap, me, o.id]);
  if (!me) return null;

  const meet = anyCrew ? formatTime(anyCrew.startTime) : '';
  const place = anyCrew?.place.name ?? o.place?.name ?? '';
  const free = o.tags.some((tg) => tg.toLowerCase() === 'free food');
  const goingCount = people.filter((p) => p.label === 'going').length + (crew ? 1 : 0);
  const kicker = [free ? (en ? 'Free food' : '무료 음식') : (en ? 'Event' : '행사'), o.date ? `${badgeOf(o, en).text}${o.startTime ? ` ${o.startTime}` : ''}` : '', o.place?.name ?? ''].filter(Boolean).join(' · ');

  return (
    <BottomSheet open={open} onClose={onClose} title={en ? 'Go together?' : '같이 갈래요?'}>
      <div className="-mt-1">
        <div className="text-[11px] font-bold uppercase tracking-wide text-primary truncate">{kicker}</div>
        <div className="text-[15px] font-bold mt-0.5 line-clamp-2">{o.title}</div>
        <p className="text-[13px] text-ink-2 mt-1">
          {busy && !crew ? (en ? 'Finding your group…' : '같이 갈 모임을 찾는 중…')
            : meet ? (en ? `Meet at ${place || 'the entrance'} at ${meet} — ${goingCount} ${goingCount === 1 ? 'person is' : 'people are'} going.` : `${meet}에 ${place || '입구'}에서 만나요 — ${goingCount}명이 가요.`)
              : goingCount > 0 ? (en ? `${goingCount} going, no meetup yet — tap I'm in to start one.` : `${goingCount}명이 가요. 아직 모임이 없어요 — 갈래요를 누르면 열려요.`)
                : (en ? 'Nobody has started a group yet.' : '아직 같이 가는 모임이 없어요.')}
        </p>
      </div>

      <div className="mt-3 divide-y divide-line">
        {crew && (
          <Person u={me} you label="going" />
        )}
        {people.map(({ u, label }) => <Person key={u.id} u={u} label={label} onOpen={() => { onClose(); nav(`/users/${u.id}`); }} />)}
        {!crew && people.length === 0 && !busy && <p className="py-3 text-[13px] text-ink-3">{en ? 'Tap I’m in — whoever taps Go together next joins you here.' : '갈래요를 누르면, 다음에 같이 가기를 누르는 사람이 여기로 들어와요.'}</p>}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => !crew && join()} disabled={busy} className={cn('h-9 px-3.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 border press', crew ? 'bg-sel-soft text-sel-fg border-sel-line' : 'bg-surface border-line text-ink')}><Check size={14} />{en ? "I'm in" : '갈래요'}</button>
        <button onClick={() => crew && maybe()} disabled={busy} className={cn('h-9 px-3.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 border press', !crew && !busy ? 'bg-surface-2 border-line text-ink' : 'bg-surface border-line text-ink-2')}><HelpCircle size={14} />{en ? 'Maybe' : '아마도'}</button>
        {meet && <span className="h-9 px-3.5 rounded-full bg-surface-2 text-ink text-[13px] font-semibold inline-flex items-center gap-1.5"><Clock size={14} />{en ? 'Meet' : '만남'} {meet}</span>}
        {place && <span className="h-9 px-3.5 rounded-full bg-surface-2 text-ink text-[13px] font-semibold inline-flex items-center gap-1.5 max-w-full truncate"><MapPin size={14} className="shrink-0" /><span className="truncate">{place}</span></span>}
      </div>

      <Button size="lg" full className="mt-4" disabled={busy || !room} loading={busy} icon={<MessageCircle size={18} />} onClick={() => { if (room) { onClose(); nav(`/chats/${room.id}`); } }}>
        {crew ? (en ? `Group chat · meet at ${meet}` : `그룹 채팅 · ${meet} 만남`) : (en ? 'Group chat' : '그룹 채팅')}
      </Button>
      {!crew && !busy && <Button size="md" variant="outline" full className="mt-2" onClick={join}>{en ? `Join${meet ? ` · meet at ${meet}` : ''}` : `들어가기${meet ? ` · ${meet} 만남` : ''}`}</Button>}
    </BottomSheet>
  );
}

const r0 = (o: Opportunity) => (en ? `You're going to ${o.title.length > 40 ? 'this event' : o.title} together.` : '같이 가기 모임에 들어갔어요.');

function Person({ u, label, you, onOpen }: { u: User; label: 'going' | 'maybe'; you?: boolean; onOpen?: () => void }) {
  return (
    <button onClick={onOpen} disabled={!onOpen} className="w-full flex items-center gap-3 py-2.5 text-left">
      <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} />
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold truncate">{u.sample && !you && <SampleTag />}{you ? (en ? 'You' : '나') : u.nickname}</span>
        {!you && <span className="block text-[12px] text-ink-3 truncate">{affiliationText(u)}</span>}
      </span>
      <span className={cn('text-[12px] font-semibold', label === 'going' ? 'text-mint' : 'text-ink-3')}>{label === 'going' ? (en ? 'going' : '가요') : (en ? 'maybe' : '아마도')}</span>
    </button>
  );
}

