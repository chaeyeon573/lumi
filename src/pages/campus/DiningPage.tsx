import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star, ExternalLink, Clock, Info } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Chip, CardSkeleton, EmptyState, ErrorState, Tag } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { fmtClock, fmtRange } from '@core/lib/campusclock';
import { ALLERGEN_LABELS, DIET_FILTERS, MEAL_LABELS, currentMeal, dishKey, dishMatches, hoursOf, isMainStation, openState, sortLocations, type DietFilter, type DiningLocation, type Dish, type MealKey } from '@core/lib/dining';
import { campusLive, type DiningResponse, type Favorite } from '@/lib/campusLive';

const FILTER_KEY = 'lumi.dining.filters';
const readFilters = (): DietFilter[] => { try { const v = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => DIET_FILTERS.some((f) => f.key === x)) : []; } catch { return []; } };
const saveFilters = (f: DietFilter[]) => { try { localStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch { /* */ } };
const DIET_SHORT: Record<string, { label: string; cls: string }> = {
  vegan: { label: 'Vegan', cls: 'bg-mint-soft text-mint' },
  vegetarian: { label: 'Veg', cls: 'bg-mint-soft text-mint' },
  halal: { label: 'Halal', cls: 'bg-primary-soft text-primary v2:text-pink-300' },
  kosher: { label: 'Kosher', cls: 'bg-primary-soft text-primary v2:text-pink-300' },
};

/** 오늘의 학식 — 장소 칩(식당 먼저) · 영업 여부·시간 · 식사 탭 · 코너별 메뉴 · 식단 필터 · ⭐ 즐겨찾기 */
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
  useEffect(() => { const row = chipsRef.current; const el = row?.querySelector<HTMLElement>('.chip-active'); if (row && el) row.scrollTo({ left: el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' }); }, [loc?.id]);
  const set = (patch: Record<string, string | null>) => { const p = new URLSearchParams(params); for (const [k, v] of Object.entries(patch)) { if (v == null) p.delete(k); else p.set(k, v); } setParams(p, { replace: true }); };
  const toggleFilter = (f: DietFilter) => { const next = filters.includes(f) ? filters.filter((x) => x !== f) : [...filters, f]; setFilters(next); saveFilters(next); };
  const toggleFav = async (dish: Dish) => {
    const on = !favKeys.has(dishKey(dish.name)); setBusy(dish.name);
    try { const r = await campusLive.favorite(dish.name, on); setFavorites(r.favorites); showToast(on ? `★ We'll tell you when ${dish.name} is on the menu` : 'Removed from favorites', on ? 'success' : 'info'); } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(null); }
  };

  // 오늘 메뉴에 나온 즐겨찾기
  const favToday = useMemo(() => {
    if (!day || !favorites.length) return [];
    const out: { dish: string; loc: DiningLocation; meal: MealKey }[] = [];
    for (const l of sortLocations(day.locations)) for (const m of l.meals) for (const s of m.stations) for (const d of s.dishes) if (favKeys.has(dishKey(d.name)) && !out.some((x) => x.dish === d.name && x.loc.id === l.id && x.meal === m.key)) out.push({ dish: d.name, loc: l, meal: m.key });
    return out;
  }, [day, favorites, favKeys]);

  const title = isToday || !data ? 'Dining today' : 'Dining tomorrow';
  if (error) return <div><TopBar back title="Dining today" /><ErrorState message={error} onRetry={() => load(date)} /></div>;
  if (!data) return <div><TopBar back title="Dining today" /><CardSkeleton /></div>;
  if (!data.supported) return <div><TopBar back title="Dining today" /><EmptyState emoji="🍽️" title="Dining menus aren't here for your school yet" description="Lumi shows UC Berkeley dining hall menus for now." /></div>;

  const tomorrow = data.dates?.find((d) => d > data.today);
  const state = loc && isToday ? openState(loc, nowMin) : null;
  const hours = loc ? hoursOf(loc) : null;
  // 메인 코너 먼저 (샐러드 바·디저트 같은 상시 코너는 뒤로), 같은 종류 안에서는 원본 순서
  const stations = [...(meal?.stations ?? [])].sort((x, y) => Number(!isMainStation(x.name)) - Number(!isMainStation(y.name))).map((s) => ({ name: s.name, dishes: s.dishes.filter((d) => dishMatches(d, filters)) })).filter((s) => s.dishes.length);

  return (
    <div className="min-h-full pb-10 bg-bg">
      <TopBar back title={title} />
      <div className="px-4 pt-2">
        {/* 날짜 */}
        {(tomorrow || !isToday) && (
          <div className="flex bg-surface-2 rounded-full p-1 mb-3 w-fit">
            {[['Today', null], ['Tomorrow', tomorrow ?? date ?? null]].map(([label, d]) => {
              const active = label === 'Today' ? isToday : !isToday;
              return <button key={label} onClick={() => set({ date: d, loc: null, meal: null })} className={cn('h-8 px-4 rounded-full text-[13px] font-semibold transition', active ? 'bg-surface text-primary shadow-sm' : 'text-ink-3')}>{label}</button>;
            })}
          </div>
        )}

        {!day ? (
          <div className="card p-5 text-center">
            <p className="text-[15px] font-bold">Menus aren't available right now</p>
            <p className="text-[13px] text-ink-3 mt-1">We couldn't read the dining menus. Check again soon, or see the official page.</p>
            {data.source && <a href={data.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">{data.source.label} menus <ExternalLink size={13} /></a>}
          </div>
        ) : (
          <>
            {favToday.length > 0 && (
              <div className="card px-3.5 py-3 mb-3">
                <div className="text-[12px] font-bold text-ink-2 flex items-center gap-1 mb-1.5"><Star size={13} className="fill-current text-[#B57A0E] v2:text-lime-400" />Your favorites {isToday ? 'today' : 'tomorrow'}</div>
                <div className="flex flex-wrap gap-1.5">{favToday.slice(0, 8).map((f) => (
                  <button key={`${f.dish}_${f.loc.id}_${f.meal}`} onClick={() => set({ loc: f.loc.id, meal: f.meal })} className="text-left text-[12px] rounded-lg bg-surface-2 px-2 py-1 press"><b className="font-semibold">{f.dish}</b> <span className="text-ink-3">· {f.loc.name}, {MEAL_LABELS[f.meal].toLowerCase()}</span></button>
                ))}</div>
              </div>
            )}

            {/* 장소 칩 */}
            <div ref={chipsRef} className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1" role="tablist" aria-label="Dining locations">
              {locations.map((l) => {
                const s = isToday ? openState(l, nowMin) : null;
                return (
                  <Chip key={l.id} active={l.id === loc?.id} onClick={() => set({ loc: l.id, meal: null })} className={l.id === loc?.id ? 'chip-active' : undefined}>
                    {s && <span className={cn('h-1.5 w-1.5 rounded-full', s.open ? 'bg-mint' : 'bg-ink-3/50')} aria-hidden />}{l.name}
                  </Chip>
                );
              })}
            </div>

            {loc && (
              <section className="mt-3">
                <div className="card px-4 py-3.5">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display text-[22px] font-bold leading-tight">{loc.name}</h2>
                      <p className="text-[12px] text-ink-3 mt-0.5 capitalize">{loc.kind === 'hall' ? 'Dining hall' : loc.kind === 'market' ? 'Market' : 'Café'}</p>
                    </div>
                    {state && (state.open === true ? <Tag tone="mint">Open · until {fmtClock(state.closesAt!)}</Tag> : state.open === false ? <Tag>{state.opensAt ? `Opens ${fmtClock(state.opensAt)}` : 'Closed for today'}</Tag> : <Tag>Hours not listed</Tag>)}
                  </div>
                  <p className="text-[13px] text-ink-2 mt-2 flex items-center gap-1.5"><Clock size={13} className="text-ink-3 shrink-0" />{hours ? (hours.length ? hours.map(fmtRange).join(' · ') : 'Closed') : 'Hours not listed'}</p>
                  {loc.about && <p className="text-[13px] text-ink-2 mt-2">{loc.about}</p>}
                </div>

                {/* 식사 탭 */}
                {loc.meals.length > 1 && (
                  <div className="mt-3 flex bg-surface-2 rounded-full p-1" role="tablist" aria-label="Meals">
                    {loc.meals.map((m) => <button key={m.key + m.label} role="tab" aria-selected={m.key === meal?.key} onClick={() => set({ meal: m.key })} className={cn('flex-1 h-9 rounded-full text-[13px] font-semibold transition', m.key === meal?.key ? 'bg-surface text-primary shadow-sm' : 'text-ink-3')}>{m.label}</button>)}
                  </div>
                )}
                {meal?.start && meal.end && meal.stations.length > 0 && <p className="text-[12px] text-ink-3 mt-2 px-1">{meal.label} · {fmtRange({ start: meal.start, end: meal.end })}</p>}

                {/* 식단 필터 */}
                {loc.meals.some((m) => m.stations.length) && (
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mt-3 pb-1" aria-label="Diet filters">
                    {DIET_FILTERS.map((f) => <Chip key={f.key} size="sm" active={filters.includes(f.key)} onClick={() => toggleFilter(f.key)}>{f.label}</Chip>)}
                  </div>
                )}

                <div className="mt-3 space-y-3">
                  {meal && meal.stations.length > 0 && stations.length === 0 && <div className="card px-4 py-4 text-[13px] text-ink-3">Nothing at {loc.name} matches these filters for {meal.label.toLowerCase()}.</div>}
                  {!loc.about && !loc.meals.some((m) => m.stations.length) && <div className="card px-4 py-4 text-[13px] text-ink-3">No menu posted for this {isToday ? 'day' : 'day yet'}.</div>}
                  {stations.map((s) => (
                    <div key={s.name} className="card overflow-hidden">
                      <h3 className="px-4 pt-3 pb-1 text-[12px] font-bold uppercase tracking-wide text-ink-3">{s.name}</h3>
                      <ul className="divide-y divide-line">
                        {s.dishes.map((d) => {
                          const fav = favKeys.has(dishKey(d.name));
                          return (
                            <li key={d.name} className="flex items-center gap-2 pl-4 pr-1.5 py-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-medium leading-snug">{d.name}</p>
                                {(d.diets.length > 0 || d.allergens.length > 0) && (
                                  <p className="mt-1 flex flex-wrap items-center gap-1">
                                    {d.diets.map((x) => <span key={x} className={cn('rounded-md px-1.5 h-[18px] inline-flex items-center text-[10.5px] font-bold', DIET_SHORT[x].cls)}>{DIET_SHORT[x].label}</span>)}
                                    {d.allergens.length > 0 && <span className="text-[11px] text-ink-3">Contains {d.allergens.map((a) => ALLERGEN_LABELS[a].toLowerCase()).join(', ')}</span>}
                                  </p>
                                )}
                              </div>
                              <button onClick={() => toggleFav(d)} disabled={busy === d.name} aria-pressed={fav} aria-label={fav ? `Remove ${d.name} from favorites` : `Favorite ${d.name}`} className="h-10 w-10 grid place-items-center rounded-full press shrink-0">
                                <Star size={18} className={cn(fav ? 'fill-current text-[#B57A0E] v2:text-lime-400' : 'text-ink-3')} />
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

            <div className="mt-5 px-1 space-y-1.5">
              <p className="text-[12px] text-ink-3 flex items-start gap-1.5"><Star size={12} className="mt-0.5 shrink-0" />Tap ☆ on a dish and Lumi tells you the day it's back on a menu.</p>
              <p className="text-[12px] text-ink-3 flex items-start gap-1.5"><Info size={12} className="mt-0.5 shrink-0" />Diet and allergen tags come from Cal Dining's labels — if you have an allergy, check with staff.</p>
              {data.source && <a href={data.source.url} target="_blank" rel="noreferrer" className="text-[12px] text-ink-3 underline underline-offset-2 inline-flex items-center gap-1">{data.source.attribution}<ExternalLink size={11} /></a>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
