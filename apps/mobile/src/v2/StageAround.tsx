/**
 * 단계별 "내 주변" (웹 components/home_StageAround 의 모바일판) — 같은 홈이지만 안의 내용이 인생 단계에 따라 바뀐다.
 * 졸업생: 내 도시의 우리 학교 동문 · 같은 분야 동문 · 서로 아는 사람이 있는 동문 + 동문에게 물어보기
 * 대학원생: 같은 연구 분야 대학원생 · 다른 학교 연구실 · 먼저 가 본 선배
 */
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight, MapPin, Briefcase, Link2, FlaskConical, School, GraduationCap, Sparkles, ArrowRight } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import type { AlumniAround, GradAround, NetworkUpdate } from '@core/lib/stage-around';
import { shortSchool } from '@core/lib/network';
import { relativeTime } from '@core/lib/format';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { Avatar, C } from '@/ui';
import { aiUrl } from './AiParts';
import { CardList } from './HomeParts';

type RowDef = { key: string; Icon: typeof MapPin; label: string; people: User[]; to: string };

function CountCard({ title, rows, footer }: { title: string; rows: RowDef[]; footer?: ReactNode }) {
  const shown = rows.filter((r) => r.people.length > 0);
  if (!shown.length && !footer) return null;
  return (
    <View accessibilityLabel={title} style={tw`mt-3 card p-3.5`}>
      <Text style={tw`px-0.5 text-[12px] font-bold text-ink-3`}>{title}</Text>
      <View style={tw`mt-1`}>
        {shown.map((r, i) => (
          <Pressable key={r.key} onPress={() => nav(r.to)} style={tw`flex-row items-center py-2.5 ${i ? 'border-t border-line' : ''}`}>
            <View style={tw`h-8 w-8 rounded-full bg-accent-soft items-center justify-center`}><r.Icon size={15} color={C.primary} /></View>
            <Text numberOfLines={2} style={tw`flex-1 ml-3 text-[14px] text-ink`}>{r.label} <Text style={tw`font-bold text-ink`}>{r.people.length}{t('명')}</Text></Text>
            <View style={tw`flex-row mx-1`}>{r.people.slice(0, 3).map((p, j) => <Avatar key={p.id} emoji={p.avatar.emoji} hue={p.avatar.hue} url={p.avatar.url} size={24} style={[{ borderWidth: 2, borderColor: C.surface }, j ? { marginLeft: -8 } : null]} />)}</View>
            <ChevronRight size={15} color={C.ink3} />
          </Pressable>
        ))}
      </View>
      {footer}
    </View>
  );
}

const schoolOf = (me: User) => (me.affiliation.type === 'university' ? shortSchool(me.affiliation.schoolName) : '');

/** 졸업생 — 내 주변 동문 + 동문에게 물어보기 */
export function AlumniAroundCard({ me, d }: { me: User; d: AlumniAround }) {
  const school = schoolOf(me);
  const en = lang === 'en';
  const rows: RowDef[] = [
    { key: 'city', Icon: MapPin, people: d.inCity, label: en ? `${school} alumni in ${d.city}` : `${d.city}에 있는 ${school} 동문`, to: aiUrl(en ? `${school} alumni in ${d.city}` : `${d.city}에 사는 ${school} 동문`) },
    { key: 'field', Icon: Briefcase, people: d.sameField, label: en ? `${school} alumni in ${d.field}` : `${d.field} 분야 ${school} 동문`, to: aiUrl(en ? `${school} alumni in ${d.field}` : `${d.field} ${school} 동문`) },
    { key: 'mutual', Icon: Link2, people: d.withMutuals, label: t('서로 아는 사람이 있는 동문'), to: '/people/second' },
  ];
  return (
    <CountCard title={d.city ? `${t('내 주변 동문')} · ${d.city}` : t('내 주변 동문')} rows={rows}
      footer={(
        <Pressable onPress={() => nav(aiUrl(t('AI 스타트업을 시작하려고 하는데 어떤 사람들을 만나보는 게 좋을까?')))} style={tw`mt-2 rounded-2xl bg-primary-soft px-3 py-2.5 flex-row items-center`}>
          <Sparkles size={15} color={C.primary} />
          <View style={tw`flex-1 min-w-0 mx-2`}>
            <Text style={tw`text-[13px] font-bold text-ink`}>{t('동문에게 물어보기')}</Text>
            <Text numberOfLines={1} style={tw`text-[11px] text-ink-2`}>{t('예: 도쿄에서 집 구해 본 동문 있나요?')}</Text>
          </View>
          <ArrowRight size={15} color={C.primary} />
        </Pressable>
      )} />
  );
}

/** 대학원생 — 내 분야 사람: 같은 연구 분야 대학원생 · 다른 학교 연구실 · 먼저 가 본 선배 */
export function GradAroundCard({ d }: { d: GradAround }) {
  if (!d.field) return null;
  const en = lang === 'en';
  const rows: RowDef[] = [
    { key: 'field', Icon: FlaskConical, people: d.sameField, label: en ? `Grad students in ${d.field}` : `${d.field} 연구하는 대학원생`, to: aiUrl(en ? `grad students researching ${d.field}` : `${d.field} 연구하는 대학원생`) },
    { key: 'other', Icon: School, people: d.otherSchool, label: t('그중 다른 학교 연구실'), to: aiUrl(en ? `${d.field} researchers at other schools` : `다른 학교에서 ${d.field} 연구하는 사람`) },
    { key: 'ahead', Icon: GraduationCap, people: d.ahead, label: t('먼저 가 본 선배 (박사·동문)'), to: '/people?tab=search' },
  ];
  return <CountCard title={`${t('내 분야 사람')} · ${d.field}`} rows={rows} />;
}

/** 받침 있는 말 뒤에는 '으로' (ㄹ 받침은 '로') */
const ro = (w: string) => { const c = w.charCodeAt(w.length - 1); if (c < 0xac00 || c > 0xd7a3) return `${w}로`; const jong = (c - 0xac00) % 28; return jong === 0 || jong === 8 ? `${w}로` : `${w}으로`; };
export const updateText = (u: NetworkUpdate) => {
  const n = u.user.nickname; const v = u.update.value;
  if (lang === 'en') return u.update.kind === 'moved' ? `${n} moved to ${v}` : u.update.kind === 'joined' ? `${n} joined ${v}` : `${n} started ${v}`;
  return u.update.kind === 'moved' ? `${n}님이 ${ro(v)} 이사했어요` : u.update.kind === 'joined' ? `${n}님이 ${v}에 합류했어요` : `${n}님이 ${v}을 시작했어요`;
};

/** 새 소식 — 이사·입사 */
export function UpdatesList({ items }: { items: NetworkUpdate[] }) {
  return (
    <CardList>
      {items.map((x, i) => (
        <Pressable key={`${x.user.id}-${x.update.at}`} onPress={() => nav(`/users/${x.user.id}`)} style={tw`flex-row items-center px-3.5 py-3 ${i === items.length - 1 ? '' : 'border-b border-line'}`}>
          <Avatar emoji={x.user.avatar.emoji} hue={x.user.avatar.hue} url={x.user.avatar.url} size={36} />
          <View style={tw`flex-1 min-w-0 mx-3`}>
            <Text numberOfLines={1} style={tw`text-[14px] font-semibold text-ink`}>{updateText(x)}</Text>
            <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{relativeTime(x.update.at)} · {x.update.kind === 'moved' ? t('반갑다고 인사해 보세요') : t('축하 한마디 남겨 보세요')}</Text>
          </View>
          <ChevronRight size={15} color={C.ink3} />
        </Pressable>
      ))}
    </CardList>
  );
}
