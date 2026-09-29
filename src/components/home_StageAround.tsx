import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Briefcase, Link2, FlaskConical, School, GraduationCap, Sparkles, ArrowRight } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import type { AlumniAround, GradAround, NetworkUpdate } from '@core/lib/stage-around';
import { shortSchool } from '@core/lib/network';
import { relativeTime } from '@core/lib/format';
import { Avatar } from '@/components/ui';

type RowDef = { key: string; Icon: typeof MapPin; label: string; people: User[]; to: string };

function CountCard({ title, rows, footer }: { title: string; rows: RowDef[]; footer?: React.ReactNode }) {
  const nav = useNavigate();
  const shown = rows.filter((r) => r.people.length > 0);
  if (!shown.length && !footer) return null;
  return (
    <section className="mx-4 mt-3 rounded-[24px] bg-white border border-line p-3.5" aria-label={title}>
      <div className="px-0.5 text-[12px] font-bold text-ink-3">{title}</div>
      <ul className="mt-1.5 divide-y divide-line">
        {shown.map((r) => (
          <li key={r.key}>
            <button onClick={() => nav(r.to)} className="w-full flex items-center gap-3 py-2.5 text-left press">
              <span className="h-8 w-8 rounded-full bg-accent-soft text-primary grid place-items-center shrink-0"><r.Icon size={15} /></span>
              <span className="flex-1 min-w-0 text-[14px] text-ink leading-snug"><span>{r.label}</span> <b className="text-ink whitespace-nowrap">{r.people.length}{t('명')}</b></span>
              <span className="flex -space-x-2 shrink-0 pl-2">{r.people.slice(0, 3).map((p) => <Avatar key={p.id} emoji={p.avatar.emoji} hue={p.avatar.hue} url={p.avatar.url} size={24} className="ring-2 ring-white" />)}</span>
              <ChevronRight size={15} className="text-ink-3 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
      {footer}
    </section>
  );
}

const ai = (q: string) => `/ai?q=${encodeURIComponent(q)}`;
const schoolOf = (me: User) => (me.affiliation.type === 'university' ? shortSchool(me.affiliation.schoolName) : '');

/** 졸업생 — 내 주변 동문: 내 도시의 우리 학교 동문 · 같은 분야 동문 · 서로 아는 사람이 있는 동문 + 동문에게 물어보기 */
export function AlumniAroundCard({ me, d }: { me: User; d: AlumniAround }) {
  const nav = useNavigate();
  const school = schoolOf(me);
  const en = lang === 'en';
  const rows: RowDef[] = [
    { key: 'city', Icon: MapPin, people: d.inCity, label: en ? `${school} alumni in ${d.city}` : `${d.city}에 있는 ${school} 동문`, to: ai(en ? `${school} alumni in ${d.city}` : `${d.city}에 사는 ${school} 동문`) },
    { key: 'field', Icon: Briefcase, people: d.sameField, label: en ? `${school} alumni in ${d.field}` : `${d.field} 분야 ${school} 동문`, to: ai(en ? `${school} alumni in ${d.field}` : `${d.field} ${school} 동문`) },
    { key: 'mutual', Icon: Link2, people: d.withMutuals, label: t('서로 아는 사람이 있는 동문'), to: '/people/second' },
  ];
  return (
    <CountCard title={d.city ? `${t('내 주변 동문')} · ${d.city}` : t('내 주변 동문')} rows={rows}
      footer={(
        <button onClick={() => nav(ai(t('AI 스타트업을 시작하려고 하는데 어떤 사람들을 만나보는 게 좋을까?')))} className="mt-2 w-full rounded-2xl bg-primary-soft/70 px-3 py-2.5 flex items-center gap-2 text-left press">
          <Sparkles size={15} className="text-primary shrink-0" />
          <span className="flex-1 min-w-0"><span className="block text-[13px] font-bold text-ink">{t('동문에게 물어보기')}</span><span className="block text-[11px] text-ink-2 truncate">{t('예: 도쿄에서 집 구해 본 동문 있나요?')}</span></span>
          <ArrowRight size={15} className="text-primary shrink-0" />
        </button>
      )} />
  );
}

/** 대학원생 — 내 분야 사람: 같은 연구 분야 대학원생 · 다른 학교 연구실 · 먼저 가 본 선배 */
export function GradAroundCard({ d }: { d: GradAround }) {
  if (!d.field) return null;
  const en = lang === 'en';
  const rows: RowDef[] = [
    { key: 'field', Icon: FlaskConical, people: d.sameField, label: en ? `Grad students in ${d.field}` : `${d.field} 연구하는 대학원생`, to: ai(en ? `grad students researching ${d.field}` : `${d.field} 연구하는 대학원생`) },
    { key: 'other', Icon: School, people: d.otherSchool, label: t('그중 다른 학교 연구실'), to: ai(en ? `${d.field} researchers at other schools` : `다른 학교에서 ${d.field} 연구하는 사람`) },
    { key: 'ahead', Icon: GraduationCap, people: d.ahead, label: t('먼저 가 본 선배 (박사·동문)'), to: '/people?tab=search' },
  ];
  return <CountCard title={`${t('내 분야 사람')} · ${d.field}`} rows={rows} />;
}

/** 받침 있는 말 뒤에는 '으로' */
const ro = (w: string) => { const c = w.charCodeAt(w.length - 1); if (c < 0xac00 || c > 0xd7a3) return `${w}로`; const jong = (c - 0xac00) % 28; return jong === 0 || jong === 8 ? `${w}로` : `${w}으로`; };
export const updateText = (u: NetworkUpdate) => {
  const n = u.user.nickname; const v = u.update.value;
  if (lang === 'en') return u.update.kind === 'moved' ? `${n} moved to ${v}` : u.update.kind === 'joined' ? `${n} joined ${v}` : `${n} started ${v}`;
  return u.update.kind === 'moved' ? `${n}님이 ${ro(v)} 이사했어요` : u.update.kind === 'joined' ? `${n}님이 ${v}에 합류했어요` : `${n}님이 ${v}을 시작했어요`;
};

/** 새 소식 — 이사·입사 */
export function UpdatesList({ items }: { items: NetworkUpdate[] }) {
  const nav = useNavigate();
  return (
    <div className="card divide-y divide-line">
      {items.map((x) => (
        <button key={`${x.user.id}-${x.update.at}`} onClick={() => nav(`/users/${x.user.id}`)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left press">
          <Avatar emoji={x.user.avatar.emoji} hue={x.user.avatar.hue} url={x.user.avatar.url} size={36} />
          <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-ink truncate">{updateText(x)}</span><span className="block text-[12px] text-ink-3">{relativeTime(x.update.at)} · {x.update.kind === 'moved' ? t('반갑다고 인사해 보세요') : t('축하 한마디 남겨 보세요')}</span></span>
          <ChevronRight size={15} className="text-ink-3 shrink-0" />
        </button>
      ))}
    </div>
  );
}

