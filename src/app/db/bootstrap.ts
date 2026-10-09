import { PARSER_VERSION } from '../../shared/config';
import { reparsePost } from '../../shared/parser';
import { db, store } from './index';
import { isSampleGroupId, seedOnFirstRun } from './sample';

let started: Promise<void> | null = null;

/**
 * เรียกครั้งเดียวตอนเปิดแอป (กันการรันซ้ำจาก React StrictMode)
 * - ขอให้เบราว์เซอร์เก็บข้อมูลแบบถาวร ลดโอกาสถูกลบเมื่อพื้นที่เต็ม
 * - ใส่ข้อมูลตัวอย่างเมื่อเปิดครั้งแรก
 */
export function bootstrapData(): Promise<void> {
  started ??= (async () => {
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* บางเบราว์เซอร์ไม่รองรับ ไม่เป็นไร */
    }
    try {
      // เปิดครั้งแรกด้วยหน้ารับข้อมูล (ผู้ใช้กดปุ่มดึงสินค้าเลย) → ไม่ต้องใส่ข้อมูลตัวอย่างปนกับข้อมูลจริง
      if (location.hash.startsWith('#/receive')) {
        if ((await store.settings.getMeta('sampleSeededAt')) === null) await store.settings.setMeta('sampleSeededAt', Date.now());
      } else {
        await seedOnFirstRun(store);
      }
    } catch (e) {
      console.error('seed failed', e);
    }
    // ข้อมูลที่แยกด้วย parser เวอร์ชันเก่า → แยกใหม่อัตโนมัติ (คงดาว/การซ่อนไว้)
    try {
      const stale = await db.listings.filter((l) => l.parserVersion < PARSER_VERSION && !isSampleGroupId(l.groupId)).count();
      if (stale > 0) await store.listings.reparseAll(reparsePost, isSampleGroupId);
    } catch (e) {
      console.error('reparse failed', e);
    }
  })();
  return started;
}
