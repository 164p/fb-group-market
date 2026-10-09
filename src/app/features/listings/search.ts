import Fuse from 'fuse.js';
import type { Listing } from '../../../shared/types';

/** ทำให้ข้อความเทียบกันได้: ตัวพิมพ์เล็ก ยุบช่องว่าง ตัดจุลภาคในตัวเลข */
export function normalize(s: string): string {
  return s
    .toLocaleLowerCase('th')
    .replace(/(\d),(?=\d{3})/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SearchIndex {
  /** คืน Map ของ id → คะแนน (0 = ตรงที่สุด) */
  search(q: string): Map<string, number>;
}

/**
 * ค้นหา 2 ชั้น
 * 1. ตรงตัว: ทุกคำในคำค้น (แยกด้วยช่องว่าง) ต้องอยู่ในชื่อหรือเนื้อหา — คะแนน 0 (ชื่อ) / 0.1 (เนื้อหา)
 * 2. คลาดเคลื่อนได้ (เมื่อชั้นแรกไม่เจอ): Fuse.js สำหรับพิมพ์ผิดเล็กน้อย เช่น "ipohne" → "iPhone"
 * ภาษาไทยไม่มีช่องว่างระหว่างคำ การค้นแบบ "อยู่ในข้อความ" จึงทำงานได้โดยไม่ต้องตัดคำ
 */
export function buildSearchIndex(listings: Listing[]): SearchIndex {
  const docs = listings.map((l) => ({ id: l.id, title: normalize(l.title), text: normalize(l.rawText) }));
  const fuse = new Fuse(docs, {
    keys: [
      { name: 'title', weight: 2 },
      { name: 'text', weight: 1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  });

  return {
    search(raw: string) {
      const q = normalize(raw);
      const hits = new Map<string, number>();
      if (!q) return hits;
      const terms = q.split(' ');

      for (const d of docs) {
        if (terms.every((t) => d.title.includes(t))) hits.set(d.id, 0);
        else if (terms.every((t) => d.title.includes(t) || d.text.includes(t))) hits.set(d.id, 0.1);
      }
      // ใช้แบบคลาดเคลื่อนเฉพาะเมื่อแบบตรงตัวไม่เจอเลย (มักเป็นพิมพ์ผิด) และคำค้นยาวพอ กันผลลัพธ์มั่ว
      if (hits.size === 0 && q.length >= 3) {
        for (const r of fuse.search(q)) {
          const score = 0.2 + (r.score ?? 1);
          if (!hits.has(r.item.id)) hits.set(r.item.id, score);
        }
      }
      return hits;
    },
  };
}
