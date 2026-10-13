/**
 * 학사 일정 · 좌석 알림을 화면 여러 곳(Me 카드, 수업 목록 버튼, 전체 목록)이 같이 쓰도록 한 번만 불러 둔다.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '@core/api';
import type { AcademicDate } from '@core/lib/academic';
import type { SeatWatchView } from '@core/lib/seats';

interface CampusState {
  dates: Record<string, AcademicDate[] | 'loading' | 'error'>;
  seats: SeatWatchView | null;
  seatsStatus: 'idle' | 'loading' | 'ready' | 'error';
  busy: string;
  loadDates(schoolId: string, force?: boolean): Promise<void>;
  loadSeats(force?: boolean): Promise<void>;
  watch(courseId: string): Promise<SeatWatchView>;
  unwatch(watchId: string): Promise<SeatWatchView>;
}

export const useCampusStore = create<CampusState>((set, get) => ({
  dates: {},
  seats: null,
  seatsStatus: 'idle',
  busy: '',
  async loadDates(schoolId, force) {
    const cur = get().dates[schoolId];
    if (!schoolId || (!force && cur && cur !== 'error')) return;
    set((s) => ({ dates: { ...s.dates, [schoolId]: 'loading' } }));
    try { const r = await api.academic.dates(schoolId); set((s) => ({ dates: { ...s.dates, [schoolId]: r.dates } })); } catch { set((s) => ({ dates: { ...s.dates, [schoolId]: 'error' } })); }
  },
  async loadSeats(force) {
    if (!force && (get().seatsStatus === 'loading' || get().seatsStatus === 'ready')) return;
    set({ seatsStatus: get().seats ? 'ready' : 'loading' });
    try { set({ seats: await api.seats.mine(), seatsStatus: 'ready' }); } catch { set({ seatsStatus: get().seats ? 'ready' : 'error' }); }
  },
  async watch(courseId) {
    set({ busy: courseId });
    try {
      const v = await api.seats.watch(courseId); set({ seats: v, seatsStatus: 'ready' });
      // 첫 확인이 아직이면 (원본 페이지가 느리다) 잠시 뒤 다시 묻는다
      if (v.watches.some((w) => !w.latest && !w.ended)) for (const ms of [15_000, 45_000]) setTimeout(() => { void get().loadSeats(true); }, ms);
      return v;
    } finally { set({ busy: '' }); }
  },
  async unwatch(id) {
    set({ busy: id });
    try { const v = await api.seats.unwatch(id); set({ seats: v, seatsStatus: 'ready' }); return v; } finally { set({ busy: '' }); }
  },
}));

export function useAcademicDates(schoolId: string): AcademicDate[] | 'loading' | 'error' {
  const v = useCampusStore((s) => s.dates[schoolId]);
  const load = useCampusStore((s) => s.loadDates);
  useEffect(() => { void load(schoolId); }, [schoolId, load]);
  return v ?? 'loading';
}

/** 좌석 알림 — 화면에 있는 동안 5분마다 새로 (워커가 15~60분마다 보니 그보다 자주 볼 필요는 없다) */
export function useSeatWatches(poll = false) {
  const seats = useCampusStore((s) => s.seats);
  const status = useCampusStore((s) => s.seatsStatus);
  const load = useCampusStore((s) => s.loadSeats);
  useEffect(() => {
    void load();
    if (!poll) return;
    const h = setInterval(() => { void load(true); }, 5 * 60_000);
    return () => clearInterval(h);
  }, [load, poll]);
  return { seats, status };
}
