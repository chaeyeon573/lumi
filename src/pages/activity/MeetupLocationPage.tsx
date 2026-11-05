import { useNavigate, useParams } from 'react-router-dom';
import { Lock, MapPin } from 'lucide-react';
import { lang } from '@core/i18n';
import { BackHeader, PageTitle, RowCard, InfoNote, EmptyState, cardCls } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { PLACE_PRESETS } from '@core/data/places';
import { placeLabel } from '@core/lib/relations';
import { kindOf } from '@/components/social/meetupKinds';
import { myPart } from './ActivityDetailPage';

const en = lang === 'en';
const W = 358; const H = 400;
/** 지도 한 칸이 몇 도인지 — 캠퍼스 하나가 화면에 들어오게 (~1.2 km) */
const SPAN_LAT = 0.014;

/**
 * 모임 장소 (PDF S053) — 타일 지도 대신 그린 지도: 모임 장소 핀과 근처 캠퍼스 건물 이름(학교 장소 목록)만.
 * 승인제 모임은 들어가기 전까지 대략적인 곳 (placeLabel). 사람의 위치는 어디에도 없다.
 */
export function MeetupLocationPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const parts = useAppStore((s) => s.participations);
  const rooms = useAppStore((s) => s.chatRooms);
  const a = v.visibleActivities.find((x) => x.id === id);
  if (!a) return <div className="min-h-full bg-bg"><BackHeader title={en ? 'Meetup location' : '모임 장소'} /><EmptyState icon={<Lock size={30} />} title={en ? 'This meetup isn’t available' : '볼 수 없는 모임이에요'} /></div>;
  const isHost = a.hostId === v.me.id;
  const inIt = isHost || myPart(parts, a.id, v.me.id)?.status === 'approved';
  const where = placeLabel(a, v.me, inIt);
  const room = rooms.find((r) => r.activityId === a.id);
  const k = kindOf(a);
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const has = !!a.place.lat && !!a.place.lng && !/online|zoom/i.test(a.place.name);
  // 승인 전(대략적인 곳)에는 정확한 좌표가 화면 가운데에 오지 않게 모임마다 정해진 만큼 비켜서 그린다 (핀 없이 둥근 영역만)
  const h = [...a.id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const c = where.approximate ? { lat: a.place.lat + ((h % 100) / 100 - 0.5) * 0.0016, lng: a.place.lng + (((h >> 7) % 100) / 100 - 0.5) * 0.0016 } : { lat: a.place.lat, lng: a.place.lng };
  const cos = Math.cos((c.lat * Math.PI) / 180);
  const toXY = (p: { lat: number; lng: number }) => ({ x: W / 2 + ((p.lng - c.lng) * cos / SPAN_LAT) * W, y: H / 2 - ((p.lat - c.lat) / SPAN_LAT) * W });
  // 근처 캠퍼스 건물 이름 — 서로 겹치지 않게, 가운데(모임 자리)와도 떨어진 것만 몇 개
  const marks: { name: string; x: number; y: number }[] = [];
  if (has) for (const p of PLACE_PRESETS[schoolId] ?? []) {
    if (p.name === a.place.name) continue;
    const { x, y } = toXY(p);
    if (x < 50 || x > W - 50 || y < 30 || y > H - 30 || Math.hypot(x - W / 2, y - H / 2) < 70) continue;
    if (marks.some((m) => Math.abs(m.x - x) < 110 && Math.abs(m.y - y) < 34)) continue;
    marks.push({ name: p.name, x, y });
    if (marks.length >= 4) break;
  }
  const name = where.approximate ? (a.place.area ?? (en ? 'Near campus' : '캠퍼스 근처')) : where.name;

  return (
    <div className="min-h-full bg-bg pb-8">
      <BackHeader title={en ? 'Meetup location' : '모임 장소'} />
      <PageTitle title={en ? 'Meetup location' : '모임 장소'} className="pb-3" />
      <div className="px-4 space-y-3">
        <div className={`${cardCls} overflow-hidden`}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={en ? `Map around ${name}` : `${name} 주변 지도`}>
            <rect width={W} height={H} className="fill-surface-2" />
            {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={i * 45} y1={0} x2={i * 45} y2={H} className="stroke-line" strokeWidth={1} />)}
            {Array.from({ length: 10 }).map((_, i) => <line key={`h${i}`} x1={0} y1={i * 45} x2={W} y2={i * 45} className="stroke-line" strokeWidth={1} />)}
            <path d={`M ${W * 0.62} -10 L ${W * 0.42} ${H + 10}`} className="stroke-surface" strokeWidth={26} strokeLinecap="round" />
            <path d={`M -10 ${H * 0.18} L ${W + 10} ${H * 0.72}`} className="stroke-surface" strokeWidth={22} strokeLinecap="round" />
            {has && <circle cx={W / 2} cy={H / 2} r={where.approximate ? 70 : 30} className="fill-sel-soft stroke-sel-line" strokeWidth={1.5} />}
            {marks.map((m) => <g key={m.name}><circle cx={m.x} cy={m.y} r={3} className="fill-ink-3" /><text x={m.x} y={m.y + 16} textAnchor="middle" className="fill-ink-3" fontSize={11}>{m.name}</text></g>)}
            {has && !where.approximate && <g transform={`translate(${W / 2 - 20} ${H / 2 - 20})`}><circle cx={20} cy={20} r={20} className="fill-sel" /><g transform="translate(10 10)" className="text-on-primary"><MapPin size={20} color="currentColor" /></g></g>}
          </svg>
        </div>
        <RowCard tone={k.tone} icon={<k.Icon size={20} />} title={where.approximate ? (en ? `General area · ${name}` : `대략적인 곳 · ${name}`) : name}
          sub={where.approximate ? (en ? 'Exact venue once you’re in · agreed by the group' : '참가하면 정확한 곳 · 모임에서 정해요') : (en ? 'Venue agreed by the group' : '모임에서 정한 곳')}
          onClick={inIt && room ? () => nav(`/chats/${room.id}`) : undefined} />
        <InfoNote>{en ? 'People’s precise locations are never displayed.' : '사람의 정확한 위치는 어디에도 표시되지 않아요.'}</InfoNote>
      </div>
    </div>
  );
}
