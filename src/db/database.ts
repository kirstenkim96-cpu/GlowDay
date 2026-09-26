// src/db/database.ts
// SQLite 데이터베이스 초기화 및 CRUD 함수
// expo-sqlite v14+ (useSQLiteContext 패턴)

import * as SQLite from 'expo-sqlite';
export { addDays } from '../utils/date';

// ─── 타입 정의 ──────────────────────────────────────────
export interface Routine {
  id: string;
  name: string;
  category: string;       // CategoryKey
  time_slot: 'AM' | 'PM'; // 아침/저녁
  icon: string;
  repeat_days: string;    // JSON: [0,1,2,3,4,5,6] (0=일)
  active: number;         // 1=활성, 0=비활성
  created_at: string;
}

export interface RoutineLog {
  id: number;
  routine_id: string;
  date: string;           // YYYY-MM-DD
  completed: number;      // 1=완료, 0=미완료
  completed_at: string | null;
}

export interface BeautyEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  remind_before: number;  // 분 단위
  memo: string;
  recurring: number;      // 0=일회성, 1=반복
}

export interface Streak {
  id: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string;
  protection_used: number;
  protection_date: string | null;
}

export interface Setting {
  key: string;
  value: string;
}

// ─── DB 인스턴스 ────────────────────────────────────────
let db: SQLite.SQLiteDatabase | null = null;

/**
 * DB 열기 (앱 시작 시 1회 호출)
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('glowday.db');
  await initTables(db);
  try { await db.execAsync('CREATE TABLE IF NOT EXISTS cycle_items (id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT DEFAULT "🌸", cycle_days INTEGER NOT NULL DEFAULT 7, last_used TEXT, category TEXT DEFAULT "skincare")'); } catch {}
  try { await db.execAsync('CREATE TABLE IF NOT EXISTS water_logs (id TEXT PRIMARY KEY, date TEXT NOT NULL, cups INTEGER NOT NULL DEFAULT 0)'); } catch {}
  try { await db.execAsync('ALTER TABLE routines ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0'); } catch {}
  console.log('✅ GlowDay DB initialized');
  return db;
}

/**
 * DB 인스턴스 가져오기
 */
export function getDB(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database not initialized. Call openDatabase() first.');
  return db;
}

// ─── 테이블 생성 ────────────────────────────────────────
async function initTables(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      time_slot TEXT NOT NULL DEFAULT 'AM',
      icon TEXT DEFAULT '🌸',
      repeat_days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS routine_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
      UNIQUE(routine_id, date)
    );

    CREATE TABLE IF NOT EXISTS beauty_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT DEFAULT '',
      remind_before INTEGER DEFAULT 60,
      memo TEXT DEFAULT '',
      recurring INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS streaks (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_completed_date TEXT DEFAULT '',
      protection_used INTEGER NOT NULL DEFAULT 0,
      protection_date TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 스트릭 초기 레코드 (없으면 삽입)
  const streak = await database.getFirstAsync<Streak>('SELECT * FROM streaks WHERE id = 1');
  if (!streak) {
    await database.runAsync(
      'INSERT INTO streaks (id, current_streak, longest_streak, last_completed_date, protection_used) VALUES (1, 0, 0, \'\', 0)'
    );
  }

  // 기본 설정값
  const defaults: Record<string, string> = {
    am_time: '07:00',
    pm_time: '21:00',
    am_notif: '1',
    pm_notif: '1',
    theme: 'light',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await database.runAsync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
}

// ─── Routines CRUD ──────────────────────────────────────
export async function getAllRoutines(): Promise<Routine[]> {
  const database = getDB();
  return await database.getAllAsync<Routine>(
    'SELECT * FROM routines WHERE active = 1 ORDER BY time_slot, sort_order, created_at'
  );
}

export async function getRoutinesForDate(dateStr: string): Promise<Routine[]> {
  const dayIndex = new Date(dateStr + 'T00:00:00').getDay();
  const all = await getAllRoutines();
  return all.filter(r => {
    const days: number[] = JSON.parse(r.repeat_days);
    return days.includes(dayIndex);
  });
}

export async function addRoutine(routine: Omit<Routine, 'created_at'>): Promise<void> {
  const database = getDB();
  await database.runAsync(
    'INSERT INTO routines (id, name, category, time_slot, icon, repeat_days, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [routine.id, routine.name, routine.category, routine.time_slot, routine.icon, routine.repeat_days, routine.active]
  );
}

export async function updateRoutine(id: string, updates: Partial<Routine>): Promise<void> {
  const database = getDB();
  const fields = Object.entries(updates)
    .filter(([key]) => key !== 'id' && key !== 'created_at')
    .map(([key]) => `${key} = ?`);
  const values = Object.entries(updates)
    .filter(([key]) => key !== 'id' && key !== 'created_at')
    .map(([_, val]) => val);

  if (fields.length === 0) return;
  await database.runAsync(
    `UPDATE routines SET ${fields.join(', ')} WHERE id = ?`,
    [...values, id]
  );
}

export async function deleteRoutine(id: string): Promise<void> {
  const database = getDB();
  // Soft delete (비활성화)
  await database.runAsync('UPDATE routines SET active = 0 WHERE id = ?', [id]);
  // 로그도 삭제할지는 선택 (여기선 유지)
}

// ─── Routine Logs ───────────────────────────────────────
export async function toggleRoutineLog(routineId: string, date: string): Promise<boolean> {
  const database = getDB();
  const existing = await database.getFirstAsync<RoutineLog>(
    'SELECT * FROM routine_logs WHERE routine_id = ? AND date = ?',
    [routineId, date]
  );

  if (existing) {
    const newCompleted = existing.completed ? 0 : 1;
    await database.runAsync(
      'UPDATE routine_logs SET completed = ?, completed_at = ? WHERE id = ?',
      [newCompleted, newCompleted ? new Date().toISOString() : null, existing.id]
    );
    return !!newCompleted;
  } else {
    await database.runAsync(
      'INSERT INTO routine_logs (routine_id, date, completed, completed_at) VALUES (?, ?, 1, ?)',
      [routineId, date, new Date().toISOString()]
    );
    return true;
  }
}

export async function getLogsForDate(date: string): Promise<Record<string, boolean>> {
  const database = getDB();
  const logs = await database.getAllAsync<RoutineLog>(
    'SELECT * FROM routine_logs WHERE date = ?',
    [date]
  );
  const result: Record<string, boolean> = {};
  logs.forEach(log => {
    result[log.routine_id] = !!log.completed;
  });
  return result;
}

export async function getLogsForDateRange(startDate: string, endDate: string): Promise<Record<string, Record<string, boolean>>> {
  const database = getDB();
  const logs = await database.getAllAsync<RoutineLog>(
    'SELECT * FROM routine_logs WHERE date >= ? AND date <= ?',
    [startDate, endDate]
  );
  const result: Record<string, Record<string, boolean>> = {};
  logs.forEach(log => {
    if (!result[log.date]) result[log.date] = {};
    result[log.date][log.routine_id] = !!log.completed;
  });
  return result;
}

// ─── Beauty Events ──────────────────────────────────────
export async function getAllEvents(): Promise<BeautyEvent[]> {
  const database = getDB();
  return await database.getAllAsync<BeautyEvent>(
    'SELECT * FROM beauty_events ORDER BY date, time'
  );
}

export async function addEvent(event: BeautyEvent): Promise<void> {
  const database = getDB();
  await database.runAsync(
    'INSERT INTO beauty_events (id, title, category, date, time, remind_before, memo, recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [event.id, event.title, event.category, event.date, event.time, event.remind_before, event.memo, event.recurring]
  );
}

export async function deleteEvent(id: string): Promise<void> {
  const database = getDB();
  await database.runAsync('DELETE FROM beauty_events WHERE id = ?', [id]);
}

// ─── Streaks ────────────────────────────────────────────
export async function getStreak(): Promise<Streak> {
  const database = getDB();
  const streak = await database.getFirstAsync<Streak>('SELECT * FROM streaks WHERE id = 1');
  return streak!;
}

export async function updateStreak(updates: Partial<Streak>): Promise<void> {
  const database = getDB();
  const fields = Object.entries(updates)
    .filter(([key]) => key !== 'id')
    .map(([key]) => `${key} = ?`);
  const values = Object.entries(updates)
    .filter(([key]) => key !== 'id')
    .map(([_, val]) => val);

  if (fields.length === 0) return;
  await database.runAsync(
    `UPDATE streaks SET ${fields.join(', ')} WHERE id = 1`,
    values
  );
}

// ─── Settings ───────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  const database = getDB();
  const row = await database.getFirstAsync<Setting>(
    'SELECT * FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = getDB();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const database = getDB();
  const rows = await database.getAllAsync<Setting>('SELECT * FROM settings');
  const result: Record<string, string> = {};
  rows.forEach(row => { result[row.key] = row.value; });
  return result;
}

// ─── 달성률 계산 ────────────────────────────────────────
export async function getCompletionRate(date: string): Promise<number | null> {
  const routines = await getRoutinesForDate(date);
  if (routines.length === 0) return null;
  const logs = await getLogsForDate(date);
  const done = routines.filter(r => logs[r.id]).length;
  return Math.round((done / routines.length) * 100);
}

// Water tracking
export async function getWaterLog(date: string): Promise<number> {
  const db = getDB();
  const row: any = await db.getFirstAsync('SELECT cups FROM water_logs WHERE date = ?', [date]);
  return row?.cups ?? 0;
}

export async function setWaterLog(date: string, cups: number): Promise<void> {
  const db = getDB();
  await db.runAsync('INSERT OR REPLACE INTO water_logs (id, date, cups) VALUES (?, ?, ?)', ['w_' + date, date, cups]);
}

// Cycle items
export async function getAllCycleItems(): Promise<any[]> {
  const db = getDB();
  const rows: any[] = await db.getAllAsync('SELECT * FROM cycle_items ORDER BY cycle_days');
  return rows;
}

export async function addCycleItem(item: { id: string; name: string; icon: string; cycle_days: number; category: string }): Promise<void> {
  const db = getDB();
  await db.runAsync('INSERT INTO cycle_items (id, name, icon, cycle_days, category) VALUES (?, ?, ?, ?, ?)', [item.id, item.name, item.icon, item.cycle_days, item.category]);
}

export async function markCycleItemUsed(id: string, date: string): Promise<void> {
  const db = getDB();
  await db.runAsync('UPDATE cycle_items SET last_used = ? WHERE id = ?', [date, id]);
}

export async function deleteCycleItem(id: string): Promise<void> {
  const db = getDB();
  await db.runAsync('DELETE FROM cycle_items WHERE id = ?', [id]);
}

export async function updateCycleItem(id: string, updates: { name?: string; icon?: string; cycle_days?: number }): Promise<void> {
  const db = getDB();
  const sets: string[] = [];
  const vals: any[] = [];
  if (updates.name) { sets.push('name = ?'); vals.push(updates.name); }
  if (updates.icon) { sets.push('icon = ?'); vals.push(updates.icon); }
  if (updates.cycle_days) { sets.push('cycle_days = ?'); vals.push(updates.cycle_days); }
  vals.push(id);
  await db.runAsync('UPDATE cycle_items SET ' + sets.join(', ') + ' WHERE id = ?', vals);
}
