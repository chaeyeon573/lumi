import { useState, type ReactNode } from 'react';
import { BookOpen, Building2, CalendarDays, GraduationCap, MessageCircle, Users } from 'lucide-react';
import { extraVisibilityOf } from '@core/lib/privacy';
import type { ProfileField, Visibility } from '@core/types';
import { ChoiceChips, IconTile, InfoNote, Switch, cardCls, type Tone } from '@/components/ha';
import { cn } from '@core/lib/cn';
import { SaveButton, SubScreen, VIS_LABEL, en, useSaveSelf } from '@/pages/profile/shared';

/** "프로필" 칩이 한꺼번에 정하는 항목 — 이름·얼굴·학교·학년은 사람을 알아보는 데 필요해 늘 보인다 */
const PROFILE_DETAILS: ProfileField[] = ['bio', 'likes', 'freeTime', 'interests', 'purposes', 'goals', 'availability', 'preferredPartner', 'posts'];
const AUDIENCES = ['friends', 'school', 'public'] as const;
type Audience = typeof AUDIENCES[number];

function Row({ tone, icon, title, sub, on, onChange }: { tone: Tone; icon: ReactNode; title: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={cn(cardCls, 'p-4 flex items-center gap-3.5')}>
      <IconTile tone={tone}>{icon}</IconTile>
      <span className="flex-1 min-w-0"><span className="block text-[15px] font-bold">{title}</span><span className="block text-[13px] text-ink-3 mt-0.5">{sub}</span></span>
      <Switch checked={on} onChange={onChange} label={title} />
    </div>
  );
}

/**
 * Visibility settings (PDF S085) — 서버가 지키는 것만 약속한다 (@core/lib/privacy · server/view.ts):
 * - Who can see your profile? → 소개·관심사·목표·가능 시간·게시물 그리드 등 프로필 항목의 공개 범위 (fieldVisibility). 이름·얼굴·학교·학년은 늘 보인다
 * - University → showSchool (끄면 다른 학교 사람에게 학교명을 보내지 않는다 — 같은 학교 사람은 안다) · Major → showDepartment
 * - Prompt answers · Housing · Class timetable → 켜면 위에서 고른 범위, 끄면 나만 (시간표는 켜도 바쁜 시간만, 강의실은 절대 안 보낸다)
 * - Group memberships → extraVisibility.memberships (동아리 멤버·팔로워 목록에서 나를 뺀다)
 * Save Privacy 를 눌러야 저장된다.
 */
export function PrivacySettingsPage() {
  const { me, busy, save } = useSaveSelf();
  const aff = me.affiliation.type === 'university' ? me.affiliation : null;
  const fv = me.fieldVisibility;
  const same = PROFILE_DETAILS.every((f) => fv[f] === fv[PROFILE_DETAILS[0]]) ? fv[PROFILE_DETAILS[0]] : null;
  const [audience, setAudience] = useState<Audience | null>(AUDIENCES.includes(same as Audience) ? same as Audience : null);
  const [school, setSchool] = useState(aff?.showSchool ?? true);
  const [major, setMajor] = useState(aff?.showDepartment ?? true);
  const [prompts, setPrompts] = useState(fv.prompts !== 'private');
  const [groups, setGroups] = useState(extraVisibilityOf(me, 'memberships') !== 'private');
  const [living, setLiving] = useState(fv.living !== 'private');
  const [timetable, setTimetable] = useState(fv.timetable !== 'private');

  const submit = () => {
    // 켜진 항목: 고른 범위가 있으면 그것, 없으면(항목마다 달랐으면) 지금 값 — 꺼져 있던 것은 우리 학교로
    const on = (cur: Visibility): Visibility => audience ?? (cur === 'private' ? 'school' : cur);
    const fieldVisibility = { ...fv };
    if (audience) for (const f of PROFILE_DETAILS) fieldVisibility[f] = audience;
    fieldVisibility.prompts = prompts ? on(fv.prompts) : 'private';
    fieldVisibility.living = living ? on(fv.living) : 'private';
    fieldVisibility.timetable = timetable ? on(fv.timetable) : 'private';
    const membership = extraVisibilityOf(me, 'memberships');
    return save({
      fieldVisibility,
      extraVisibility: { ...me.extraVisibility, memberships: groups ? on(membership) : 'private' },
      ...(aff ? { affiliation: { ...aff, showSchool: school, showDepartment: major } } : {}),
    }, en ? 'Privacy saved' : '공개 범위를 저장했어요');
  };

  return (
    <SubScreen title={en ? 'Visibility settings' : '공개 범위'} cta={<SaveButton label={en ? 'Save Privacy' : '저장'} busy={busy} onClick={submit} />}>
      <h2 className="ha-h2 mb-3">{en ? 'Who can see your profile?' : '누가 내 프로필을 볼까요?'}</h2>
      <ChoiceChips value={audience ?? ('' as Audience)} onChange={setAudience} options={AUDIENCES.map((a) => ({ value: a, label: VIS_LABEL[a]! }))} />
      <p className="text-[12.5px] text-ink-3 mt-2">{audience ? (en ? 'Bio, interests, goals and your posts grid. Your name, photo and school always show.' : '소개·관심사·목표·게시물. 이름·사진·학교는 늘 보여요.')
        : (en ? 'Your details have different settings now — pick one to use it for all.' : '지금은 항목마다 달라요 — 하나를 고르면 모두 그렇게 바뀌어요.')}</p>
      <div className="space-y-3 mt-4">
        {aff && <Row tone="ice" icon={<GraduationCap size={21} />} title={en ? 'University' : '학교'} sub={en ? 'Off: hidden from other schools' : '끄면 다른 학교 사람에게 숨겨요'} on={school} onChange={setSchool} />}
        {aff && <Row tone="ice" icon={<BookOpen size={21} />} title={en ? 'Major' : '전공'} sub={en ? 'Off: hidden from everyone' : '끄면 아무에게도 안 보여요'} on={major} onChange={setMajor} />}
        <Row tone="rose" icon={<MessageCircle size={21} />} title={en ? 'Prompt answers' : '질문 답'} sub={en ? 'Share a little about yourself' : '나를 조금 소개해요'} on={prompts} onChange={setPrompts} />
        <Row tone="lav" icon={<Users size={21} />} title={en ? 'Group memberships' : '그룹 멤버십'} sub={en ? 'Off: you’re left out of group member lists' : '끄면 그룹 멤버 목록에서 빠져요'} on={groups} onChange={setGroups} />
        <Row tone="peach" icon={<Building2 size={21} />} title={en ? 'Housing information' : '사는 곳'} sub={en ? 'Area only — never your room or address' : '구역만 — 방·주소는 저장하지 않아요'} on={living} onChange={setLiving} />
        <Row tone="ice" icon={<CalendarDays size={21} />} title={en ? 'Class timetable' : '시간표'} sub={en ? 'Busy times only — class details stay private' : '바쁜 시간만 — 수업 정보는 비공개'} on={timetable} onChange={setTimetable} />
      </div>
      <InfoNote className="mt-4">{en ? 'Classroom and exact location are never shared.' : '강의실과 정확한 위치는 어떤 설정에서도 공개되지 않아요.'}</InfoNote>
    </SubScreen>
  );
}
