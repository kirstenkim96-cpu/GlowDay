// App.tsx에서 DB 열고 나서 호출
import { initCategoryTable } from './categories';

export async function setupCategories(database: any) {
  await initCategoryTable(database);
}
