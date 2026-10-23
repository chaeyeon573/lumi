import { useEffect, useMemo, useState } from 'react';
import { t, lang } from '@core/i18n';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { List, Map as MapIcon, Search, SlidersHorizontal, ChevronDown, Clock, MapPin, Users, ArrowRight, ShieldCheck } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Chip, ChipRow, BottomSheet, Button, Segmented, EmptyState, ErrorState, CardSkeleton, Cover, Tag } from '@/components/ui';
import { ActivityCard, useHostInfo } from '@/components/cards/ActivityCard';
import { JoinButton } from '@/components/cards/JoinButton';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { ALL_CATEGORIES, CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORY_LABELS } from '@core/lib/labels';
import { formatDateTime, isThisWeek, todayISO, formatFee } from '@core/lib/format';
import type { Activity, ActivityCategory } from '@core/types';
import { PLACE_PRESETS } from '@core/data/places';

/** 외부 타일을 불러올 수 없는 환경(VITE_MAP_TILES=off)에서는 캠퍼스 랜드마크 라벨로 대체 */
export const TILES_ENABLED = import.meta.env.VITE_MAP_TILES !== 'off';
export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export function LandmarkLayer({ schoolId }: { schoolId: string }) {
  if (TILES_ENABLED) return null;
  const places = PLACE_PRESETS[schoolId] ?? [];
  return <>{places.map((p) => <Marker key={p.name} position={[p.lat, p.lng]} interactive={false} icon={L.divIcon({ className: 'leaflet-div-icon', html: `<div class="au-landmark">${p.name}</div>`, iconSize: [0, 0], iconAnchor: [0, 0] })} />)}</>;
}
import { cn } from '@core/lib/cn';

type TimeRange = 'now' | 'today' | 'week';

function markerIcon(a: Activity, selected: boolean) {
  return L.divIcon({
    className: 'leaflet-div-icon',
    html: `<div class="au-marker ${selected ? 'selected' : ''}" style="background:${CATEGORY_COLORS[a.category]}"><span>${CATEGORY_EMOJI[a.category]}</span></div>`,
    iconSize: [36, 36], iconAnchor: [18, 34],
  });
}

function inRange(a: Activity, range: TimeRange) {
  const today = todayISO();
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  // 이미 끝난 활동은 어느 범위에서도 빼고(오늘 오전 10시 모임이 오후에 ‘Today 10 AM’ 으로 남지 않게), 그다음 범위
  if (a.date < today || (a.date === today && a.endTime < hhmm)) return false;
  if (range === 'today') return a.date === today;
  if (range === 'week') return isThisWeek(a.date);
  return a.date === today; // now: 오늘이면서 종료 전
}

export function MapPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const schools = useAppStore((s) => s.schools);
  const v = useViewer();
  const me = v.me;
  const mySchoolId = me.affiliation.type === 'university' ? me.affiliation.schoolId : schools[0]?.id;
  const [schoolId, setSchoolId] = useState(mySchoolId);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [range, setRange] = useState<TimeRange>('week');
  const [cats, setCats] = useState<ActivityCategory[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [listMode, setListMode] = useState(!params.get('focus'));
  const [selectedId, setSelectedId] = useState<string | null>(params.get('focus'));
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [q, setQ] = useState('');

  const school = schools.find((s) => s.id === schoolId) ?? schools[0];
  const focus = params.get('focus');
  const focused = focus ? v.visibleActivities.find((a) => a.id === focus) : undefined;
  useEffect(() => { if (focus) setSelectedId(focus); }, [focus]);

  const filtered = useMemo(() => v.visibleActivities
    .filter((a) => inRange(a, range) || a.id === focus)
    .filter((a) => cats.length === 0 || cats.includes(a.category))
    .filter((a) => !q || a.title.includes(q) || a.place.name.includes(q))
    .sort((x, y) => `${x.date} ${x.startTime}`.localeCompare(`${y.date} ${y.startTime}`)), [v.visibleActivities, range, cats, q, focus]);
  const inView = useMemo(() => (bounds && !listMode ? filtered.filter((a) => bounds.contains([a.place.lat, a.place.lng])) : filtered), [filtered, bounds, listMode]);
  const selected = filtered.find((a) => a.id === selectedId) ?? null;
  const toggleCat = (c: ActivityCategory) => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  const center: [number, number] = focused ? [focused.place.lat, focused.place.lng] : [school.center.lat, school.center.lng];

  return (
    <div className="h-full flex flex-col">
      <TopBar back
        title={<button className="flex items-center gap-1 text-[16px]" onClick={() => setSchoolOpen(true)}>📍 {school.name} {!school.name.includes(school.region) && <span className="text-ink-3 text-[13px] font-medium">{school.region}</span>} <ChevronDown size={16} className="text-ink-3" /></button>}
        messages
      />
      <div className="px-4 pt-2 pb-2 space-y-2 bg-bg">
        <div className="flex gap-2">
          <div className="flex-1 h-10 rounded-2xl bg-surface border border-line flex items-center gap-2 px-3 text-[13px]"><Search size={15} className="text-ink-3" /><input className="flex-1 bg-transparent outline-none placeholder:text-ink-3" placeholder={t('장소·활동 검색')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button onClick={() => setFilterOpen(true)} className={cn('h-10 w-10 rounded-2xl border grid place-items-center press', cats.length ? 'bg-ink text-white border-ink' : 'bg-surface border-line')} aria-label={t('필터')}><SlidersHorizontal size={17} /></button>
        </div>
        <div className="flex gap-2 items-center">
          <Segmented className="flex-1" value={range} onChange={setRange} options={[{ value: 'now', label: t('지금') }, { value: 'today', label: t('오늘') }, { value: 'week', label: t('이번 주') }]} />
          <button onClick={() => setListMode((m) => !m)} className="h-11 px-3 rounded-xl bg-surface border border-line text-[13px] font-semibold flex items-center gap-1.5 press">{listMode ? <><MapIcon size={16} />{t('지도')}</> : <><List size={16} />{t('목록')}</>}</button>
        </div>
      </div>
      <ChipRow className="mx-0 px-4 pt-0 pb-2 bg-bg">
        {ALL_CATEGORIES.map((c) => <Chip key={c} size="sm" color={CATEGORY_COLORS[c]} active={cats.includes(c)} onClick={() => toggleCat(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</Chip>)}
      </ChipRow>

      {status === 'loading' && <CardSkeleton count={2} />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="flex-1 min-h-0 relative">
          {listMode ? (
            <div className="h-full overflow-y-auto hide-scrollbar px-4 py-3 space-y-3">
              <div className="text-[12px] text-ink-3 flex items-center gap-1"><MapPin size={12} />{lang === 'en' ? `${inView.length} activities near ${school.name}` : `${school.name} 근처 활동 ${inView.length}개`} · {t('장소만 표시, 사람 위치는 비공개')}</div>
              {inView.length === 0 ? <EmptyState emoji="🗺️" title={t('이 영역에 활동이 없어요')} description={t('지도를 옮기거나 시간 범위를 넓혀보세요.')} action={<Button size="sm" onClick={() => nav('/create/activity?kind=personal')}>{t('여기서 활동 만들기')}</Button>} /> :
                inView.map((a) => <ActivityCard key={a.id} activity={a} variant="row" badge={(a.official && !a.sample) ? t('학교 공식') : undefined} />)}
            </div>
          ) : (
            <>
              <MapContainer center={center} zoom={focused ? 17 : 16} className={cn('h-full w-full z-0', !TILES_ENABLED && 'no-tiles')} zoomControl={false} attributionControl={TILES_ENABLED}>
                {TILES_ENABLED ? <TileLayer url={TILE_URL} attribution='&copy; OpenStreetMap &copy; CARTO' /> : <LandmarkLayer schoolId={schoolId} />}
                <BoundsWatcher onChange={setBounds} />
                <FlyTo center={center} zoom={focused ? 17 : 16} key={`${schoolId}-${focus}`} />
                {filtered.map((a) => (
                  <Marker key={a.id} position={[a.place.lat, a.place.lng]} icon={markerIcon(a, a.id === selectedId)} eventHandlers={{ click: () => setSelectedId(a.id) }} />
                ))}
              </MapContainer>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] rounded-full bg-white/90 backdrop-blur px-3 h-8 flex items-center gap-1.5 text-[11px] font-semibold text-ink-2 shadow"><ShieldCheck size={13} className="text-mint" />{t('사람 위치가 아닌 활동 장소만 표시돼요')}</div>
              <div className="absolute bottom-4 left-4 right-4 z-[400] flex items-center justify-between">
                <span className="rounded-full bg-ink text-white text-[12px] font-semibold px-3 h-8 flex items-center">{inView.length}{t('개 활동')}</span>
                <button onClick={() => setListMode(true)} className="h-10 px-4 rounded-full bg-white shadow-lg text-[13px] font-bold flex items-center gap-1.5 press"><List size={16} />{t('목록 보기')}</button>
              </div>
              {filtered.length === 0 && (
                <div className="absolute inset-x-6 top-1/3 z-[400] card p-4 text-center">
                  <div className="text-2xl">🗓️</div><b className="text-[14px] block mt-1">{t('이 시간대에 열린 활동이 없어요')}</b><p className="text-[12px] text-ink-3 mt-1">{t('\'이번 주\'로 바꾸거나 새 활동을 만들어보세요.')}</p>
                  <div className="flex gap-2 mt-3"><Button size="sm" variant="outline" full onClick={() => setRange('week')}>{t('이번 주 보기')}</Button><Button size="sm" full onClick={() => nav('/create/activity?kind=personal')}>{t('활동 만들기')}</Button></div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <BottomSheet open={!!selected} onClose={() => setSelectedId(null)}>
        {selected && <MarkerSummary activity={selected} onDetail={() => nav(`/activities/${selected.id}`)} count={v.approvedCount(selected.id)} />}
      </BottomSheet>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t('활동 종류')}>
        <div className="grid grid-cols-2 gap-2">
          {ALL_CATEGORIES.map((c) => <Chip key={c} className="justify-start h-11" color={CATEGORY_COLORS[c]} active={cats.includes(c)} onClick={() => toggleCat(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</Chip>)}
        </div>
        <div className="flex gap-2 mt-4"><Button variant="outline" full onClick={() => setCats([])}>{t('초기화')}</Button><Button full onClick={() => setFilterOpen(false)}>{t('적용')}</Button></div>
      </BottomSheet>

      <BottomSheet open={schoolOpen} onClose={() => setSchoolOpen(false)} title={t('학교·지역 선택')}>
        <div className="space-y-1.5">
          {schools.map((s) => <button key={s.id} onClick={() => { setSchoolId(s.id); setSchoolOpen(false); setListMode(false); nav('/map', { replace: true }); }} className={cn('w-full flex items-center justify-between rounded-xl px-3.5 h-12 border text-left', s.id === schoolId ? 'border-primary bg-primary-soft' : 'border-line')}><span className="text-[14px] font-semibold">{s.name}</span><span className="text-[12px] text-ink-3">{s.region}</span></button>)}
        </div>
      </BottomSheet>
    </div>
  );
}

function BoundsWatcher({ onChange }: { onChange: (b: L.LatLngBounds) => void }) {
  const map = useMapEvents({ moveend: () => onChange(map.getBounds()), zoomend: () => onChange(map.getBounds()) });
  useEffect(() => { onChange(map.getBounds()); }, [map, onChange]);
  return null;
}
function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [map, center[0], center[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function MarkerSummary({ activity: a, onDetail, count }: { activity: Activity; onDetail: () => void; count: number }) {
  const { name } = useHostInfo(a);
  return (
    <div>
      <div className="flex gap-3">
        <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} className="h-[72px] w-[72px] rounded-2xl shrink-0" size={30} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5"><span className="text-[11px] font-bold" style={{ color: CATEGORY_COLORS[a.category] }}>{CATEGORY_EMOJI[a.category]} {CATEGORY_LABELS[a.category]}</span>{(a.official && !a.sample) && <Tag tone="gold">{t('학교 공식')}</Tag>}</div>
          <h3 className="text-[16px] font-bold leading-snug mt-0.5">{a.title}</h3>
          <div className="text-[12px] text-ink-3 mt-1">{name}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-1 text-[13px] text-ink-2">
        <span className="flex items-center gap-1"><Clock size={13} className="text-ink-3" />{formatDateTime(a.date, a.startTime)}</span>
        <span className="flex items-center gap-1 truncate"><MapPin size={13} className="text-ink-3" />{a.place.name}</span>
        <span className="flex items-center gap-1"><Users size={13} className="text-ink-3" />{a.capacity >= 999 ? `${count}${t('명 참가')}` : `${count}/${a.capacity}${t('명')}`}</span>
        <span>{formatFee(a.fee)}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <JoinButton activity={a} className="flex-1" />
        <Button variant="outline" onClick={onDetail} icon={<ArrowRight size={16} />}>{t('상세')}</Button>
      </div>
    </div>
  );
}

