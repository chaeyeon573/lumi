import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Star, Utensils } from 'lucide-react';
import { lang } from '@core/i18n';
import { CampusHead, CampusSource } from './CampusSource';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { fmtClock, fmtRange } from '@core/lib/campusclock';
import { ALLERGEN_LABELS, DIET_FILTERS, MEAL_LABELS, currentMeal, dishKey, dishMatches, hoursOf, isMainStation, openState, sortLocations, type DietFilter, type DiningLocation, type Dish, type MealKey } from '@core/lib/dining';
import { campusLive, type DiningResponse, type Favorite } from '@/lib/campusLive';
import { Badge, Chip, ChipRow, ChoiceChips, EmptyState, ErrorScreen, InfoNote, LoadingCards, SegTabs, IconTile, cardCls, type Tone } from '@/components/ha';

const en = lang === 'en';
const FILTER_KEY = 'lumi.dining.filters';
const readFilters = (): DietFilter[] => { try { const v = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => DIET_FILTERS.some((f) => f.key === x)) : []; } catch { return []; } };
const saveFilters = (f: DietFilter[]) => { try { localStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch { /* */ } };
const DIET_SHORT: Record<string, { label: string; tone: Tone }> = {
  vegan: { label: 'Vegan', tone: 'mint' },
  vegetarian: { label: 'Veg', tone: 'mint' },
  halal: { label: 'Halal', tone: 'lav' },
  kosher: { label: 'Kosher', tone: 'lav' },
};

/**
 * Dining (PDF S016) — Cal Dining menus (owner 2026-11-05: "학식 정보는 꼭 넣어야 해").
 * Today / Tomorrow · halls first with an open dot · open / closed and hours · meal tabs · stations · diet filters ·
 * ★ favorites ("tell me the day it's back"). The official-source card stays; its "no live menus" note only when
 * the menus could not be read.
 */
export function DiningPage() {
  const [params, setParams] = useSearchParams();
  const showToast = useAppStore((s) => s.showToast);
  const [data, setData] = useState<DiningResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [filters, setFilters] = useState<DietFilter[]>(readFilters);
  const [busy, setBusy] = useState<string | null>(null);
  const date = params.get('date') ?? undefined;
  const chipsRef = useRef<HTMLDivElement>(null);

  const load = (d?: string) => { setError(null); campusLive.dining(d).then((r) => { setData(r); setFavorites(r.favorites); }).catch((e) => setError((e as Error).message)); };
  useEffect(() => { load(date); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const day = data?.day ?? null;
  const isToday = !!data && (data.date ?? data.today) === data.today;
  const nowMin = isToday ? (data?.nowMin ?? 0) : -1;
  const locations = useMemo(() => (day ? sortLocations(day.locations) : []), [day]);
  const favKeys = useMemo(() => new Set(favorites.map((f) => f.key)), [favorites]);
  // 기본 장소: 주소의 loc → 지금 연 식당 → 첫 식당
  const locId = params.get('loc') ?? (locations.find((l) => l.kind === 'hall' && isToday && openState(l, nowMin).open) ?? locations[0])?.id;
  const loc = locations.find((l) => l.id === locId) ?? locations[0];
  const mealKey = (params.get('meal') as MealKey | null) ?? (loc ? (isToday ? currentMeal(loc, nowMin) : loc.meals[0])?.key : undefined);
  const meal = loc?.meals.find((m) => m.key === mealKey) ?? loc?.meals[0];

  // 고른 장소 칩이 보이게
  useEffect(() => { const row = chipsRef.current; const el = row?.querySelector<HTMLElement>('[aria-pressed="true"]'); if (row && el) row.scrollTo({ left: el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' }); }, [loc?.id]);
  const set = (patch: Record<string, string | null>) => { const p = new URLSearchParams(params); for (const [k, v] of Object.entries(patch)) { if (v == null) p.delete(k); else p.set(k, v); } setParams(p, { replace: true }); };
  const toggleFilter = (f: DietFilter) => { const next = filters.includes(f) ? filters.filter((x) => x !== f) : [...filters, f]; setFilters(next); saveFilters(next); };
  const toggleFav = async (dish: Dish) => {
    const on = !favKeys.has(dishKey(dish.name)); setBusy(dish.name);
    try { const r = await campusLive.favorite(dish.name, on); setFavorites(r.favorites); showToast(on ? (en ? `We’ll tell you when ${dish.name} is on the menu` : `${dish.name}이 메뉴에 나오면 알려 드릴게요`) : (en ? 'Removed from favorites' : '즐겨찾기에서 뺐어요'), on ? 'success' : 'info'); } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(null); }
  };

  // 오늘 메뉴에 나온 즐겨찾기
  const favToday = useMemo(() => {
    if (!day || !favorites.length) return [];
    const out: { dish: string; loc: DiningLocation; meal: MealKey }[] = [];
    for (const l of sortLocations(day.locations)) for (const m of l.meals) for (const s of m.stations) for (const d of s.dishes) if (favKeys.has(dishKey(d.name)) && !out.some((x) => x.dish === d.name && x.loc.id === l.id && x.meal === m.key)) out.push({ dish: d.name, loc: l, meal: m.key });
    return out;
  }, [day, favorites, favKeys]);

  const title = en ? 'Dining' : '학식';
  if (error) return <div className="min-h-full bg-bg"><CampusHead title={title} /><ErrorScreen message={error} onRetry={() => load(date)} /></div>;
  if (!data) return <div className="min-h-full bg-bg"><CampusHead title={title} /><LoadingCards count={2} className="px-4" /></div>;
  if (!data.supported) return (
    <div className="min-h-full bg-bg"><CampusHead title={title} />
      <EmptyState icon={<Utensils size={30} />} tone="peach" title={en ? 'Dining menus aren’t here for your school yet' : '우리 학교 학식은 아직 없어요'} sub={en ? 'Lumi shows UC Berkeley dining hall menus for now.' : '지금은 UC Berkeley 식당 메뉴만 보여요.'} />
    </div>
  );

  const tomorrow = data.dates?.find((d) => d > data.today);
  const state = loc && isToday ? openState(loc, nowMin) : null;
  const hours = loc ? hoursOf(loc) : null;
  // 메인 코너 먼저 (샐러드 바·디저트 같은 상시 코너는 뒤로), 같은 종류 안에서는 원본 순서
  const stations = [...(meal?.stations ?? [])].sort((x, y) => Number(!isMainStation(x.name)) - Number(!isMainStation(y.name))).map((s) => ({ name: s.name, dishes: s.dishes.filter((d) => dishMatches(d, filters)) })).filter((s) => s.dishes.length);
  const status = !state ? null : state.open === true ? { tone: 'mint' as Tone, text: en ? `Open · until ${fmtClock(state.closesAt!)}` : `운영 중 · ${fmtClock(state.closesAt!)}까지` }
    : state.open === false ? { tone: 'neutral' as Tone, text: state.opensAt ? (en ? `Opens ${fmtClock(state.opensAt)}` : `${fmtClock(state.opensAt)} 오픈`) : (en ? 'Closed for today' : '오늘 영업 끝') }
    : { tone: 'neutral' as Tone, text: en ? 'Hours not listed' : '시간 정보 없음' };

  return (
    <div className="min-h-full pb-10 bg-bg">
      <CampusHead title={title} />
      <div className="px-4">
        {(tomorrow || !isToday) && (
          <ChoiceChips className="mb-3" value={isToday ? 'today' : 'tomorrow'} onChange={(k) => set({ date: k === 'today' ? null : (tomorrow ?? date ?? null), loc: null, meal: null })}
            options={[{ value: 'today', label: en ? 'Today' : '오늘' }, { value: 'tomorrow', label: en ? 'Tomorrow' : '내일' }]} />
        )}

        {!day ? (
          <CampusSource url={data.source?.url} label={data.source?.label} text={en ? 'Verified menus and dining hours appear here when the campus source can be read.' : '캠퍼스 원본을 읽을 수 있을 때 메뉴와 영업 시간이 여기에 보여요.'}
            unavailableNote={en ? 'No live menus are shown without a verified feed.' : '확인된 피드가 없으면 메뉴를 보여주지 않아요.'} />
        ) : (
          <>
            {favToday.length > 0 && (
              <div className={cn(cardCls, 'p-4 mb-3')}>
                <div className="text-[13px] font-bold text-ink-2 flex items-center gap-1.5 mb-2"><Star size={14} className="fill-current text-gold" />{en ? `Your favorites ${isToday ? 'today' : 'tomorrow'}` : `${isToday ? '오늘' : '내일'} 나오는 즐겨찾기`}</div>
                <div className="flex flex-wrap gap-1.5">{favToday.slice(0, 8).map((f) => (
                  <button key={`${f.dish}_${f.loc.id}_${f.meal}`} onClick={() => set({ loc: f.loc.id, meal: f.meal })} className="text-left text-[12.5px] rounded-xl bg-surface-2 px-2.5 py-1.5 press"><b className="font-semibold">{f.dish}</b> <span className="text-ink-3">· {f.loc.name}, {MEAL_LABELS[f.meal].toLowerCase()}</span></button>
                ))}</div>
              </div>
            )}

            {/* 장소 칩 — 지금 연 곳은 초록 점 */}
            <div ref={chipsRef} className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1" aria-label={en ? 'Dining locations' : '식당'}>
              {locations.map((l) => {
                const s = isToday ? openState(l, nowMin) : null;
                return (
                  <Chip key={l.id} active={l.id === loc?.id} onClick={() => set({ loc: l.id, meal: null })}
                    icon={s ? <span className={cn('h-1.5 w-1.5 rounded-full', s.open ? 'bg-ok' : 'bg-ink-3')} aria-hidden /> : undefined}>{l.name}</Chip>
                );
              })}
            </div>

            {loc && (
              <section className="mt-3">
                <div className={cn(cardCls, 'p-4')}>
                  <div className="flex items-start gap-3">
                    <IconTile tone="peach" size={40}><Utensils size={19} /></IconTile>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[18px] font-bold leading-tight">{loc.name}</h2>
                      <p className="text-[12.5px] text-ink-3 mt-0.5">{loc.kind === 'hall' ? (en ? 'Dining hall' : '식당') : loc.kind === 'market' ? (en ? 'Market' : '마켓') : (en ? 'Café' : '카페')}</p>
                    </div>
                    {status && <Badge tone={status.tone}>{status.text}</Badge>}
                  </div>
                  <p className="text-[13px] text-ink-2 mt-3 flex items-center gap-1.5"><Clock size={14} className="text-ink-3 shrink-0" />{hours ? (hours.length ? hours.map(fmtRange).join(' · ') : (en ? 'Closed' : '휴무')) : (en ? 'Hours not listed' : '시간 정보 없음')}</p>
                  {loc.about && <p className="text-[13px] text-ink-2 mt-2">{loc.about}</p>}
                </div>

                {/* 식사 탭 */}
                {loc.meals.length > 1 && (
                  <SegTabs className="mt-3" tabs={loc.meals.map((m) => ({ key: m.key, label: m.label }))} value={meal?.key} onChange={(k) => set({ meal: k })} />
                )}
                {meal?.start && meal.end && meal.stations.length > 0 && <p className="text-[12.5px] text-ink-3 mt-2.5">{meal.label} · {fmtRange({ start: meal.start, end: meal.end })}</p>}

                {/* 식단 필터 */}
                {loc.meals.some((m) => m.stations.length) && (
                  <ChipRow className="mt-3">
                    {DIET_FILTERS.map((f) => <Chip key={f.key} size="sm" active={filters.includes(f.key)} onClick={() => toggleFilter(f.key)}>{f.label}</Chip>)}
                  </ChipRow>
                )}

                <div className="mt-3 space-y-3">
                  {meal && meal.stations.length > 0 && stations.length === 0 && <div className={cn(cardCls, 'p-4 text-[13.5px] text-ink-3')}>{en ? `Nothing at ${loc.name} matches these filters for ${meal.label.toLowerCase()}.` : `${loc.name} ${meal.label}에는 이 필터에 맞는 메뉴가 없어요.`}</div>}
                  {!loc.about && !loc.meals.some((m) => m.stations.length) && <div className={cn(cardCls, 'p-4 text-[13.5px] text-ink-3')}>{en ? 'No menu posted for this day.' : '이날 메뉴가 올라오지 않았어요.'}</div>}
                  {stations.map((s) => (
                    <div key={s.name} className={cn(cardCls, 'overflow-hidden')}>
                      <h3 className="px-4 pt-3.5 pb-1 text-[12px] font-bold uppercase tracking-wide text-ink-3">{s.name.replace(/_/g, ' ')}</h3>
                      <ul className="divide-y divide-line">
                        {s.dishes.map((d) => {
                          const fav = favKeys.has(dishKey(d.name));
                          return (
                            <li key={d.name} className="flex items-center gap-2 pl-4 pr-1.5 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-[14.5px] font-medium leading-snug">{d.name}</p>
                                {(d.diets.length > 0 || d.allergens.length > 0) && (
                                  <p className="mt-1 flex flex-wrap items-center gap-1">
                                    {d.diets.map((x) => <Badge key={x} tone={DIET_SHORT[x].tone} className="h-5 px-1.5 text-[10.5px]">{DIET_SHORT[x].label}</Badge>)}
                                    {d.allergens.length > 0 && <span className="text-[11.5px] text-ink-3">{en ? 'Contains' : '포함'} {d.allergens.map((a) => ALLERGEN_LABELS[a].toLowerCase()).join(', ')}</span>}
                                  </p>
                                )}
                              </div>
                              <button onClick={() => toggleFav(d)} disabled={busy === d.name} aria-pressed={fav} aria-label={fav ? `Remove ${d.name} from favorites` : `Favorite ${d.name}`} className="h-10 w-10 grid place-items-center rounded-full press shrink-0">
                                <Star size={18} className={cn(fav ? 'fill-current text-gold' : 'text-ink-3')} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-5 space-y-2">
              <InfoNote>{en ? 'Star a dish and Lumi tells you the day it’s back on a menu.' : '메뉴에 별을 누르면 다시 나오는 날 알려 드려요.'}</InfoNote>
              <InfoNote>{en ? 'Diet and allergen tags come from Cal Dining’s labels — if you have an allergy, check with staff.' : '식단·알레르기 표시는 Cal Dining 표기예요 — 알레르기가 있으면 직원에게 확인하세요.'}</InfoNote>
              <CampusSource url={data.source?.url} label={data.source?.label} text={data.source?.attribution ?? (en ? 'Menus and hours come from the official dining page.' : '메뉴와 시간은 공식 학식 페이지에서 와요.')} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
