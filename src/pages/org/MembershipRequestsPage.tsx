import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ClipboardList, Megaphone, MessageCircle, Users } from 'lucide-react';
import { ORG_MESSAGE_MAX, orgSenderLabel } from '@core/lib/clubjoin';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { cn } from '@core/lib/cn';
import { BottomSheet } from '@/components/ui';
import { affiliationText } from '@/components/cards/PersonCard';
import { BackHeader, PageTitle, InfoNote, PersonCard, Btn, EmptyState, TextArea } from '@/components/ha';

const en = lang === 'en';

/**
 * Membership requests (PDF S091) — "who asked": each student's name · year · major (they agreed to share it when asking),
 * approve or decline (orgs.respondApplication), and message one or everyone waiting as the club (server/clubs.ts).
 * Approve tells the person they're in; decline is quiet. Tap a card to select it for "Decline Selected Request".
 * Only organizers see this list — the server sends applicant ids to admins only (server/view.ts orgFor).
 */
export function MembershipRequestsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const org = useAppStore((s) => s.organizations.find((o) => o.id === id));
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [writeTo, setWriteTo] = useState<string[] | null>(null);
  const [text, setText] = useState('');
  const showToast = useAppStore((s) => s.showToast);
  const title = en ? 'Membership requests' : '가입 요청';

  if (!org || !org.adminIds.includes(v.me.id)) return (
    <div className="min-h-full bg-bg">
      <BackHeader title={title} />
      <PageTitle title={title} sub={org?.name} />
      <EmptyState icon={<ClipboardList size={30} />} tone="rose" title={en ? 'Only organizers see requests' : '운영진만 볼 수 있어요'} sub={en ? 'Ask the group’s organizers if you’re waiting on yours.' : '내 요청이 궁금하면 운영진에게 물어보세요.'}
        action={org ? { label: en ? 'Back to the group' : '단체로 돌아가기', onClick: () => nav(`/orgs/${org.id}`, { replace: true }) } : undefined} />
    </div>
  );

  // students who asked with the consent line ("organizers will see your name, year and major and can message you") come with
  // those three from the server (server/view.ts, blocks excluded); requests from before that line keep the old profile card
  const details = new Map((org.requesters ?? []).map((r) => [r.userId, r]));
  const legacy = org.applicantIds.filter((uid) => !details.has(uid) && !(org.joinRequests ?? []).some((r) => r.userId === uid) && !v.isBlocked(uid));
  const people = [...(org.requesters ?? []).map((r) => r.userId), ...legacy].map((uid) => ({ uid, u: v.userById(uid), d: details.get(uid) }));
  const sel = people.find((p) => p.uid === selected);
  const nameOf = (uid: string) => details.get(uid)?.name ?? v.userById(uid)?.nickname ?? (en ? 'Student' : '학생');
  const answer = async (uid: string, accept: boolean) => {
    setBusy(uid);
    const name = nameOf(uid);
    try {
      await run(() => api.orgs.respondApplication(org.id, uid, accept), accept ? (en ? `${name} is in — they’ve been told.` : `${name}님을 승인했어요.`) : (en ? 'Request declined.' : '요청을 거절했어요.'));
      if (selected === uid) setSelected(null);
    } catch { /* toast */ } finally { setBusy(null); }
  };
  const send = async () => {
    if (!writeTo) return;
    setBusy('msg');
    try {
      const r = await run(() => api.clubs.message(org.id, writeTo, text));
      showToast(writeTo.length > 1 ? (en ? `Sent to ${r.sent} ${r.sent === 1 ? 'student' : 'students'} as ${org.name}.` : `${org.name} 이름으로 ${r.sent}명에게 보냈어요.`) : (en ? `Sent as ${org.name}.` : `${org.name} 이름으로 보냈어요.`), 'success');
      setWriteTo(null); setText('');
    } catch { /* toast */ } finally { setBusy(null); }
  };
  const messageable = (org.requesters ?? []).map((r) => r.userId);

  return (
    <div className="min-h-full bg-bg pb-10">
      <BackHeader title={title} />
      <PageTitle title={title} sub={org.name} />
      <div className="px-4 space-y-3">
        {messageable.length > 1 && <Btn full icon={<Megaphone size={17} />} onClick={() => { setWriteTo(messageable); setText(''); }}>{en ? `Message all ${messageable.length} waiting` : `기다리는 ${messageable.length}명에게 메시지`}</Btn>}
        <InfoNote>{en ? 'Students agreed to share their name, year and major with organizers. Messages go as the club.' : '학생들은 운영진에게 이름·학년·전공을 보여 주는 데 동의했어요. 메시지는 동아리 이름으로 가요.'}</InfoNote>
        {people.length === 0 ? (
          <EmptyState icon={<Users size={30} />} tone="mint" title={en ? 'No requests right now' : '지금은 요청이 없어요'} sub={en ? 'New requests show up here and in your notifications.' : '새 요청은 여기와 알림에 와요.'} />
        ) : people.map(({ uid, u, d }) => (
          // the name button inside the card selects it (keyboard too); a tap anywhere else on the card does the same
          <div key={uid} onClick={() => setSelected(selected === uid ? null : uid)} data-selected={selected === uid || undefined}
            className={cn('rounded-[20px] transition', selected === uid && 'ring-2 ring-sel-line')}>
            <PersonCard avatar={u?.avatar ?? { emoji: '', hue: 250 }} name={d?.name ?? u?.nickname ?? (en ? 'Student' : '학생')} meta={d ? [d.year, d.major].filter(Boolean).join(' · ') : u ? affiliationText(u) : undefined} bio={d ? undefined : u?.bio || undefined}
              onClick={() => setSelected(selected === uid ? null : uid)}
              action={
                <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {d && <Btn size="sm" variant="link" icon={<MessageCircle size={15} />} onClick={() => { setWriteTo([uid]); setText(''); }}>{en ? 'Message' : '메시지'}</Btn>}
                  <Btn size="sm" variant="outline" loading={busy === uid} icon={<Check size={15} />} onClick={() => answer(uid, true)}>{en ? 'Approve' : '승인'}</Btn>
                </span>
              } />
          </div>
        ))}
        {people.length > 0 && (
          <Btn variant="outline" disabled={!sel || !!busy} onClick={() => setConfirm(true)}>{en ? 'Decline Selected Request' : '선택한 요청 거절'}</Btn>
        )}
        {people.length > 0 && !sel && <p className="text-[12.5px] text-ink-3">{en ? 'Tap a request to select it.' : '요청을 눌러 고르세요.'}</p>}
      </div>
      <BottomSheet open={confirm && !!sel} onClose={() => setConfirm(false)} title={en ? `Decline ${sel ? nameOf(sel.uid) : 'this request'}?` : `${sel ? nameOf(sel.uid) : '이 요청'}을 거절할까요?`}>
        <p className="text-[14px] text-ink-2 -mt-1 mb-4">{en ? 'They won’t get a notification. They can ask again later.' : '알림은 가지 않아요. 나중에 다시 요청할 수 있어요.'}</p>
        <div className="grid grid-cols-2 gap-2.5">
          <Btn variant="outline" onClick={() => setConfirm(false)}>{en ? 'Keep it' : '그대로 두기'}</Btn>
          <Btn variant="danger" onClick={async () => { setConfirm(false); if (sel) await answer(sel.uid, false); }}>{en ? 'Decline' : '거절'}</Btn>
        </div>
      </BottomSheet>
      <BottomSheet open={!!writeTo} onClose={() => setWriteTo(null)} title={writeTo && writeTo.length > 1 ? (en ? `Message ${writeTo.length} students` : `${writeTo.length}명에게 메시지`) : (en ? `Message ${writeTo ? nameOf(writeTo[0]) : ''}` : `${writeTo ? nameOf(writeTo[0]) : ''}에게 메시지`)}>
        <p className="text-[13px] text-ink-3 -mt-1 mb-3">{en ? `Sent as ${orgSenderLabel(org.name)} into each student’s direct messages.` : `${orgSenderLabel(org.name)} 이름으로 각자의 1:1 대화에 보내요.`}</p>
        <TextArea rows={4} maxLength={ORG_MESSAGE_MAX} placeholder={en ? 'e.g. Info session Thursday 7pm at MLK' : '예: 목요일 저녁 7시 MLK 설명회'} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <Btn variant="outline" onClick={() => setWriteTo(null)}>{en ? 'Cancel' : '취소'}</Btn>
          <Btn loading={busy === 'msg'} disabled={!text.trim()} onClick={send}>{en ? 'Send' : '보내기'}</Btn>
        </div>
      </BottomSheet>
    </div>
  );
}
