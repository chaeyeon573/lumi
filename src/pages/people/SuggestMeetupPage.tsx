import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { User as UserIcon, CalendarDays, Clock, UserX } from 'lucide-react';
import { lang } from '@core/i18n';
import type { ActivityCategory } from '@core/types';
import { api } from '@core/api';
import { BackHeader, PageTitle, BottomCTA, Btn, Chip, ChipRow, FormField, TextInput, InfoNote, EmptyState } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { formatDate, formatTime, todayISO } from '@core/lib/format';
import { CHIP_KINDS, KINDS, type MeetupKind } from '@/components/social/meetupKinds';

const en = lang === 'en';
const DEFAULT_MSG: Record<MeetupKind['key'], string> = en
  ? { coffee: 'A coffee after class?', study: 'Study together this week?', workout: 'Want to work out together?', lunch: 'Lunch between classes?', hangout: 'Want to hang out?' }
  : { coffee: '수업 끝나고 커피 어때요?', study: '이번 주에 같이 공부할래요?', workout: '같이 운동할래요?', lunch: '공강에 점심 어때요?', hangout: '같이 놀래요?' };

/**
 * 모임 제안 (PDF S055) — 받는 사람, 종류, 한 줄, 날짜(선택 시각). 상대가 수락하면 1:1 채팅이 열린다 (api.proposals).
 * 차단 관계면 서버가 거절한다. 같은 사람에게 기다리는 제안이 있으면 다시 보내지 않는다.
 */
export function SuggestMeetupPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const proposals = useAppStore((s) => s.proposals);
  const opps = useAppStore((s) => s.opportunities);
  const user = v.userById(id!);
  const opp = params.get('opp') ? opps.find((o) => o.id === params.get('opp')) : undefined;
  const initial = KINDS.find((k) => k.cats.includes(params.get('cat') as ActivityCategory)) ?? KINDS[0];
  const [kind, setKind] = useState<MeetupKind>(initial);
  const [msg, setMsg] = useState(() => (params.get('msg') ?? (opp ? (en ? `Want to go to ${opp.title} together?` : `${opp.title} 같이 갈래요?`) : DEFAULT_MSG[initial.key])).slice(0, 200));
  const [touched, setTouched] = useState(!!params.get('msg') || !!opp);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user || v.isBlocked(user.id)) return <div className="min-h-full bg-bg"><BackHeader title={en ? 'Suggest a meetup' : '모임 제안'} /><EmptyState icon={<UserX size={30} />} title={en ? 'You can’t suggest a meetup to this person' : '이 사람에게는 제안할 수 없어요'} /></div>;
  const pending = proposals.find((p) => p.fromId === v.me.id && p.toId === user.id && p.status === 'pending' && p.expiresAt > new Date().toISOString());
  const kinds = CHIP_KINDS.some((k) => k.key === kind.key) ? CHIP_KINDS : [...CHIP_KINDS, kind];
  const when = date ? `${formatDate(date)}${time ? ` ${formatTime(time)}` : ''}` : '';
  const send = async () => {
    setBusy(true);
    try {
      await run(() => api.proposals.create(v.me.id, user.id, { category: kind.cat, message: msg.trim(), when: when || (en ? 'This week' : '이번 주') }),
        en ? `Sent — if ${user.nickname} says yes, a chat opens.` : `보냈어요 — ${user.nickname}님이 수락하면 채팅이 열려요.`);
      nav(-1);
    } catch { setBusy(false); }
  };
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Suggest a meetup' : '모임 제안'} />
      <PageTitle title={en ? 'Suggest a meetup' : '모임 제안'} className="pb-3" />
      <div className="px-4 pb-6 space-y-5">
        <FormField label={en ? 'To' : '받는 사람'}><TextInput icon={<UserIcon size={18} />} value={user.nickname} readOnly aria-readonly /></FormField>
        <ChipRow wrap>{kinds.map((k) => <Chip key={k.key} active={kind.key === k.key} onClick={() => { setKind(k); if (!touched) setMsg(DEFAULT_MSG[k.key]); }}>{k.label}</Chip>)}</ChipRow>
        <FormField label={en ? 'Your message' : '한마디'}><TextInput value={msg} maxLength={200} onChange={(e) => { setMsg(e.target.value); setTouched(true); }} /></FormField>
        <FormField label={en ? 'When' : '언제'} hint={en ? 'Optional — or settle it in the chat.' : '선택 — 채팅에서 정해도 돼요.'}>
          <div className="grid grid-cols-2 gap-3">
            <TextInput type="date" icon={<CalendarDays size={18} />} min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} aria-label={en ? 'Suggest a day' : '날짜'} />
            <TextInput type="time" icon={<Clock size={18} />} value={time} onChange={(e) => setTime(e.target.value)} aria-label={en ? 'Time' : '시각'} disabled={!date} />
          </div>
        </FormField>
        {pending && <InfoNote>{en ? `You already suggested something — it’s waiting for ${user.nickname}.` : `이미 보낸 제안이 ${user.nickname}님의 답을 기다리고 있어요.`}</InfoNote>}
        <InfoNote>{en ? 'Messaging follows friendship and privacy permissions.' : '메시지는 친구 관계와 공개 설정을 따라요.'}</InfoNote>
      </div>
      <BottomCTA><Btn full size="lg" loading={busy} disabled={!msg.trim() || !!pending} onClick={send}>{en ? 'Send Suggestion' : '제안 보내기'}</Btn></BottomCTA>
    </div>
  );
}
