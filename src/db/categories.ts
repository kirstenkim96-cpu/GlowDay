import { Platform } from 'react-native';

export interface CustomCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
}

const COLORS = ['#D4537E','#EF9F27','#8B5CF6','#1D9E75','#F472B6','#06B6D4','#E8789A','#3B82F6','#F59E0B','#10B981','#6366F1','#EC4899','#14B8A6','#F97316','#8B5CF6','#64748B'];
const ICONS = ['💧','💊','✨','🧴','💆‍♀️','🧘‍♀️','💅','👁️','🦷','💪','🥤','🍵','🌿','🧖‍♀️','💎','🪷','🌙','☀️','🫧','💖','🧴','🍃','🥝','🫐','💐','🪻','🌺','🏃‍♀️','🧘','💤'];

let db: any = null;
if (Platform.OS !== 'web') {
  const SQLite = require('expo-sqlite');
  // DB will be set from init
}

export function getAvailableColors() { return COLORS; }
export function getAvailableIcons() { return ICONS; }

// Default categories (built-in, cannot delete)
export const DEFAULT_CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  skincare: { label: '스킨케어', color: '#D4537E', icon: '🫧' },
  supplement: { label: '영양제', color: '#EF9F27', icon: '💊' },
  haircare: { label: '헤어케어', color: '#8B5CF6', icon: '🪮' },
  bodycare: { label: '바디케어', color: '#1D9E75', icon: '🧴' },
  salon: { label: '살롱 예약', color: '#F472B6', icon: '💇‍♀️' },
  clinic: { label: '피부과', color: '#06B6D4', icon: '🏥' },
};

let customCategories: CustomCategory[] = [];
let dbRef: any = null;

export async function initCategoryTable(database: any) {
  dbRef = database;
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL
    );
  `);
  await loadCustomCategories();
}

async function loadCustomCategories() {
  if (!dbRef) return;
  customCategories = await dbRef.getAllAsync('SELECT * FROM custom_categories ORDER BY label');
}

export async function addCustomCategory(cat: CustomCategory): Promise<boolean> {
  if (!dbRef) return false;
  const all = await dbRef.getAllAsync('SELECT * FROM custom_categories');
  if (all.length >= 50) return false;
  await dbRef.runAsync(
    'INSERT INTO custom_categories (id, label, color, icon) VALUES (?, ?, ?, ?)',
    [cat.id, cat.label, cat.color, cat.icon]
  );
  await loadCustomCategories();
  return true;
}

export async function deleteCustomCategory(id: string) {
  if (!dbRef) return;
  await dbRef.runAsync('DELETE FROM custom_categories WHERE id = ?', [id]);
  await loadCustomCategories();
}

export function getCustomCategories(): CustomCategory[] {
  return customCategories;
}

// 전체 카테고리 맵 (기본 + 커스텀)
export function getAllCategoriesMap(): Record<string, { label: string; color: string; icon: string }> {
  const map: Record<string, { label: string; color: string; icon: string }> = { ...DEFAULT_CATEGORIES };
  customCategories.forEach(c => {
    map[c.id] = { label: c.label, color: c.color, icon: c.icon };
  });
  return map;
}
