import { db } from './schema';
import { repos } from './repositories';

export { db, createDB, DB_NAME } from './schema';
export * from './repositories';

/** repositories ที่ผูกกับฐานข้อมูลจริงของแอป */
export const store = repos(db);
