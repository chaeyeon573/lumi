import { useEffect, useState } from 'react';
import { t, lang } from '@core/i18n';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { User, Users, Compass, CalendarPlus, Image, Lightbulb, Zap, BookOpen, Vote, Link2, Home, CalendarDays } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { BottomSheet } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';

// 2026-11-02 사장님 시안: Home · Explore · Schedule · Meet · Profile (People 은 Meet 안 · 가운데 + 대신 Meet 의 ‘Create a Meetup’ 과 위의 +)
const items = [
  { to: '/', label: lang === 'en' ? 'Home' : '홈', Icon: Home },
  { to: '/explore', label: lang === 'en' ? 'Explore' : '탐색', Icon: Compass },
  { to: '/schedule', label: lang === 'en' ? 'Schedule' : '일정', Icon: CalendarDays },
  { to: '/meet', label: lang === 'en' ? 'Meet' : '모임', Icon: Users },
  { to: '/profile', label: lang === 'en' ? 'Profile' : '프로필', Icon: User },
];

/** 만들기 시트 열기 — Meet 화면 위의 + 버튼 등 어디서나 */
export const OPEN_CREATE = 'aroundu:create';
export const openCreate = () => window.dispatchEvent(new Event(OPEN_CREATE));

/** 마지막으로 본 사람 (People 카드) — `+`에서 바로 초대할 때 사용 */
export const LAST_SEEN_KEY = 'aroundu.people.last';

export function BottomNav() {
  const [open, setOpen] = useState(false);
  const [crewPick, setCrewPick] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const params = useParams();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const opps = useAppStore((s) => s.opportunities);
  const go = (path: string) => { setOpen(false); nav(path); };
  useEffect(() => { const on = () => setOpen(true); window.addEventListener(OPEN_CREATE, on); return () => window.removeEventListener(OPEN_CREATE, on); }, []);

  // 상황 인식: 현재 화면에 따라 기본값을 채운다
  const path = loc.pathname;
  const orgHere = path.startsWith('/orgs/') ? orgs.find((o) => o.id === path.split('/')[2]) : undefined;
  const oppHere = path.startsWith('/opportunities/') ? opps.find((o) => o.id === path.split('/')[2]) : undefined;
  const classHere = path.startsWith('/classes/') ? decodeURIComponent(path.split('/')[2] ?? '') : '';
  const userHere = path.startsWith('/users/') ? params.id ?? path.split('/')[2] : '';
  let lastSeen = ''; try { lastSeen = path === '/people' ? localStorage.getItem(LAST_SEEN_KEY) ?? '' : ''; } catch { /* */ }
  const inviteId = userHere || lastSeen;
  const invitee = inviteId ? v.userById(inviteId) : undefined;
  const adminOrgs = orgs.filter((o) => o.adminIds.includes(v.me.id));
  const courses = [...new Set(v.me.timetable.map((c) => c.name))];

  const options = [
    { key: 'now', label: t('즉석 만남'), desc: invitee ? `${invitee.nickname}${t('님을 바로 초대해요')}` : t('30분 뒤 밥·커피·산책 — 시간 맞는 사람에게 바로 보여요'), Icon: Zap, path: `/create/activity?kind=personal&now=1${invitee ? `&invite=${invitee.id}` : ''}`, color: 'bg-accent-soft text-accent' },
    { key: 'activity', label: t('활동·약속 만들기'), desc: t('점심·운동·전시·모임 — 날짜와 장소를 정해서'), Icon: CalendarPlus, path: `/create/activity?kind=${invitee ? 'personal' : 'group'}${invitee ? `&invite=${invitee.id}` : ''}`, color: 'bg-primary-soft text-primary' },
    { key: 'plan', label: lang === 'en' ? 'Ask friends with a link' : '링크로 친구에게 묻기', desc: lang === 'en' ? 'Set a time or let them pick — friends answer without the app' : '시간을 정하거나 같이 고르기 — 친구는 앱 없이 답해요', Icon: Link2, path: '/plans/new', color: 'bg-primary-soft text-primary' },
    { key: 'together', label: t('같이 시간 정하기 (Plan Together)'), desc: invitee ? `${invitee.nickname}${t('님과 후보 시간 투표로 약속 잡기')}` : t('친구들에게 후보 시간을 보내고 겹치는 시간으로 확정'), Icon: Vote, path: `/together/new${invitee ? `?invite=${invitee.id}` : ''}`, color: 'bg-heart-soft text-heart' },
    { key: 'crew', label: t('Study Crew 만들기'), desc: classHere ? `${classHere} · ${t('같은 수업 학생에게만 보여요')}` : t('시험·과제·팀플 — 같은 수업 학생에게만 보여요'), Icon: BookOpen, path: classHere ? `/create/activity?crew=${encodeURIComponent(classHere)}` : '', color: 'bg-mint-soft text-mint' },
    { key: 'team', label: t('팀원 모집하기'), desc: oppHere ? `${oppHere.title} · ${t('필요한 역할을 미리 채워요')}` : t('해커톤·창업·프로젝트에 필요한 역할 모집'), Icon: Lightbulb, path: `/create/activity?kind=group&team=1${oppHere ? `&opportunity=${oppHere.id}` : ''}`, color: 'bg-gold-soft text-[#B57A0E]' },
    { key: 'post', label: t('게시물 작성'), desc: orgHere ? `${orgHere.name} ${t('페이지에 소식 올리기')}` : t('사진·일상·질문, 익명은 글만'), Icon: Image, path: `/create/post${orgHere && adminOrgs.includes(orgHere) ? `?org=${orgHere.id}&type=news` : ''}`, color: 'bg-heart-soft text-heart' },
  ];
  const pick = (o: typeof options[number]) => {
    if (o.key === 'crew' && !o.path) { setOpen(false); if (courses.length) setCrewPick(true); else nav('/timetable'); return; }
    go(o.path);
  };

  return (
    <>
      <nav className="shrink-0 bg-surface/95 backdrop-blur border-t border-line safe-bottom">
        <div className="grid grid-cols-5 h-[64px] items-center">
          {items.map((it) => <NavItem key={it.to} {...it} />)}
        </div>
      </nav>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t('무엇을 함께 시작할까요?')} tall>
        <div className="space-y-2">
          {options.map((o) => (
            <button key={o.key} onClick={() => pick(o)} className="w-full flex items-center gap-3 rounded-2xl p-3 bg-surface-2 press text-left">
              <span className={cn('h-11 w-11 rounded-xl grid place-items-center shrink-0', o.color)}><o.Icon size={20} /></span>
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-bold">{o.label}</span><span className="block text-[12px] text-ink-3 truncate">{o.desc}</span></span>
            </button>
          ))}
        </div>
      </BottomSheet>
      <BottomSheet open={crewPick} onClose={() => setCrewPick(false)} title={t('어떤 수업의 Study Crew인가요?')}>
        <div className="space-y-1.5">{courses.map((c) => <button key={c} onClick={() => { setCrewPick(false); nav(`/create/activity?crew=${encodeURIComponent(c)}`); }} className="w-full text-left rounded-xl px-3.5 h-11 text-[14px] font-medium border border-line press">{c}</button>)}</div>
      </BottomSheet>
    </>
  );
}

/** 탭이 맡는 다른 주소 — Meet 은 People 도, Schedule 은 약속·시간표도 */
const ALSO: Record<string, string[]> = { '/meet': ['/people'], '/schedule': ['/plans', '/timetable'] };
function NavItem({ to, label, Icon }: { to: string; label: string; Icon: typeof Users }) {
  const loc = useLocation();
  const also = (ALSO[to] ?? []).some((p) => loc.pathname === p || loc.pathname.startsWith(`${p}/`));
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => cn('flex flex-col items-center justify-center gap-1 v2:gap-0.5 h-full text-[11px] font-semibold', isActive || also ? 'text-[var(--color-primary)] v2:text-primary' : 'text-ink-3')}>
      {({ isActive }) => (<><Icon size={24} strokeWidth={isActive || also ? 2.4 : 1.8} />{label}{(isActive || also) && <span className="hidden v2:block h-1 w-1 rounded-full bg-lime-400" />}</>)}
    </NavLink>
  );
}
