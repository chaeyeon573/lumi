import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ClipboardList, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { cn } from '@core/lib/cn';
import { BottomSheet } from '@/components/ui';
import { affiliationText } from '@/components/cards/PersonCard';
import { BackHeader, PageTitle, InfoNote, PersonCard, Btn, EmptyState } from '@/components/ha';

const en = lang === 'en';

/**
 * Membership requests (PDF S091) — the group's organizers approve or decline join requests (orgs.respondApplication).
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
  const title = en ? 'Membership requests' : '가입 요청';

  if (!org || !org.adminIds.includes(v.me.id)) return (
    <div className="min-h-full bg-bg">
      <BackHeader title={title} />
      <PageTitle title={title} sub={org?.name} />
      <EmptyState icon={<ClipboardList size={30} />} tone="rose" title={en ? 'Only organizers see requests' : '운영진만 볼 수 있어요'} sub={en ? 'Ask the group’s organizers if you’re waiting on yours.' : '내 요청이 궁금하면 운영진에게 물어보세요.'}
        action={org ? { label: en ? 'Back to the group' : '단체로 돌아가기', onClick: () => nav(`/orgs/${org.id}`, { replace: true }) } : undefined} />
    </div>
  );

  const people = org.applicantIds.map((uid) => ({ uid, u: v.userById(uid) }));
  const sel = people.find((p) => p.uid === selected);
  const answer = async (uid: string, accept: boolean) => {
    setBusy(uid);
    const name = v.userById(uid)?.nickname ?? (en ? 'They' : '그 학생');
    try {
      await run(() => api.orgs.respondApplication(org.id, uid, accept), accept ? (en ? `${name} is in — they’ve been told.` : `${name}님을 승인했어요.`) : (en ? 'Request declined.' : '요청을 거절했어요.'));
      if (selected === uid) setSelected(null);
    } catch { /* toast */ } finally { setBusy(null); }
  };

  return (
    <div className="min-h-full bg-bg pb-10">
      <BackHeader title={title} />
      <PageTitle title={title} sub={org.name} />
      <div className="px-4 space-y-3">
        <InfoNote>{en ? 'Only authorized group admins can approve membership.' : '권한이 있는 운영진만 가입을 승인할 수 있어요.'}</InfoNote>
        {people.length === 0 ? (
          <EmptyState icon={<Users size={30} />} tone="mint" title={en ? 'No requests right now' : '지금은 요청이 없어요'} sub={en ? 'New requests show up here and in your notifications.' : '새 요청은 여기와 알림에 와요.'} />
        ) : people.map(({ uid, u }) => (
          // the name button inside the card selects it (keyboard too); a tap anywhere else on the card does the same
          <div key={uid} onClick={() => setSelected(selected === uid ? null : uid)} data-selected={selected === uid || undefined}
            className={cn('rounded-[20px] transition', selected === uid && 'ring-2 ring-sel-line')}>
            <PersonCard avatar={u?.avatar ?? { emoji: '', hue: 250 }} name={u?.nickname ?? (en ? 'Student' : '학생')} meta={u ? affiliationText(u) : undefined} bio={u?.bio || undefined}
              onClick={() => setSelected(selected === uid ? null : uid)}
              action={
                <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {u && <Btn size="sm" variant="link" onClick={() => nav(`/users/${uid}`)}>{en ? 'Review' : '프로필'}</Btn>}
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
      <BottomSheet open={confirm && !!sel} onClose={() => setConfirm(false)} title={en ? `Decline ${sel?.u?.nickname ?? 'this request'}?` : `${sel?.u?.nickname ?? '이 요청'}을 거절할까요?`}>
        <p className="text-[14px] text-ink-2 -mt-1 mb-4">{en ? 'They won’t get a notification. They can ask again later.' : '알림은 가지 않아요. 나중에 다시 요청할 수 있어요.'}</p>
        <div className="grid grid-cols-2 gap-2.5">
          <Btn variant="outline" onClick={() => setConfirm(false)}>{en ? 'Keep it' : '그대로 두기'}</Btn>
          <Btn variant="danger" onClick={async () => { setConfirm(false); if (sel) await answer(sel.uid, false); }}>{en ? 'Decline' : '거절'}</Btn>
        </div>
      </BottomSheet>
    </div>
  );
}
