// src/store/useAppStore.ts
// Zustand 전역 상태 관리 - SQLite와 연동

import { create } from 'zustand';
import {
  Routine, Streak,
  getAllRoutines, getRoutinesForDate, addRoutine, updateRoutine, deleteRoutine,
  toggleRoutineLog, getLogsForDate,
  getStreak, updateStreak,
  getAllEvents, addEvent as dbAddEvent, deleteEvent as dbDeleteEvent,
  BeautyEvent,
} from '../db/database';
import { today } from '../utils/date';

interface AppState {
  // ─── 데이터 ───────────────────
  routines: Routine[];
  todayLogs: Record<string, boolean>;  // { routineId: completed }
  streak: Streak | null;
  events: BeautyEvent[];
  isLoading: boolean;

  // ─── 액션 ─────────────────────
  loadAll: () => Promise<void>;
  loadTodayLogs: () => Promise<void>;

  // Routines
  addNewRoutine: (routine: Omit<Routine, 'created_at'>) => Promise<void>;
  editRoutine: (id: string, updates: Partial<Routine>) => Promise<void>;
  removeRoutine: (id: string) => Promise<void>;

  // Logs
  toggleLog: (routineId: string) => Promise<boolean>;

  // Streak
  refreshStreak: () => Promise<void>;

  // Events
  addNewEvent: (event: BeautyEvent) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  routines: [],
  todayLogs: {},
  streak: null,
  events: [],
  isLoading: true,

  // ─── 전체 데이터 로드 ─────────
  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [routines, todayLogs, streak, events] = await Promise.all([
        getAllRoutines(),
        getLogsForDate(today()),
        getStreak(),
        getAllEvents(),
      ]);
      set({ routines, todayLogs, streak, events, isLoading: false });
    } catch (error) {
      console.error('Failed to load data:', error);
      set({ isLoading: false });
    }
  },

  loadTodayLogs: async () => {
    const todayLogs = await getLogsForDate(today());
    set({ todayLogs });
  },

  // ─── 루틴 CRUD ────────────────
  addNewRoutine: async (routine) => {
    await addRoutine(routine);
    const routines = await getAllRoutines();
    set({ routines });
  },

  editRoutine: async (id, updates) => {
    await updateRoutine(id, updates);
    const routines = await getAllRoutines();
    set({ routines });
  },

  removeRoutine: async (id) => {
    await deleteRoutine(id);
    const routines = await getAllRoutines();
    set({ routines });
  },

  // ─── 루틴 체크 토글 ───────────
  toggleLog: async (routineId) => {
    const completed = await toggleRoutineLog(routineId, today());
    const todayLogs = await getLogsForDate(today());
    set({ todayLogs });
    return completed;
  },

  // ─── 스트릭 갱신 ──────────────
  refreshStreak: async () => {
    const streak = await getStreak();
    set({ streak });
  },

  // ─── 이벤트 ───────────────────
  addNewEvent: async (event) => {
    await dbAddEvent(event);
    const events = await getAllEvents();
    set({ events });
  },

  removeEvent: async (id) => {
    await dbDeleteEvent(id);
    const events = await getAllEvents();
    set({ events });
  },
}));
