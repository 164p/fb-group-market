import { store } from './index';
import { seedOnFirstRun } from './sample';

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
      await seedOnFirstRun(store);
    } catch (e) {
      console.error('seed failed', e);
    }
  })();
  return started;
}
