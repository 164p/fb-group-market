import { describe, expect, it } from 'vitest';
import { FIXTURES } from './__tests__/fixtures';
import { HOLDOUT } from './__tests__/holdout';
import { splitItems } from './items';

// ตัวอย่างดัดแปลงจากรูปแบบโพสต์จริงที่ผู้ใช้พบ (เปลี่ยนรายละเอียด/สถานที่แล้ว)
const PRICE_ON_NEXT_LINE = `แผ่นเกมNINTENDO SWITCH มือ2
-MARIO KART DELUXE8  สภาพสะสม
970รวมส่งems
-DRAGON QUEST TREASURES 720รวมส่งems
-THE LEGEND OF ZELDA TEARS OF THE KINGDOM สภาพสะสม เปิดครั้งเดียว
970รวมส่งems
- THE LEGEND OF ZELDA BREATH OF THE WILD สภาพสะสม เปิดครั้งเดียว 970รวมส่งems`;

const SECTIONS = `ขออนุญาตขายแผ่นเกมหลายแผ่นครับบ
มือ1 ไม่แกะซีล
MarioKart World 1050
ของแถม Fire Emblem: fortune weave 270
มือ2
Cronos มือแดงus 1150
Pragmata (ยังไม่ใช้โค้ด) 1250
Zelda Botw 900
ราคารวมส่งแล้วคับบ
สนใจทักมาสอบถามได้เลยคับบ มีเครดิตการขาย ใช้คนกลางได้
ถ้านัดรับสะดวกแถวตัวเมือง`;

const brief = (r: ReturnType<typeof splitItems>) =>
  r?.items.map((i) => ({ title: i.title, price: i.price.price, note: i.note, sold: i.sold }));

describe('splitItems', () => {
  it('pairs a price-only line with the item line above it', () => {
    const r = splitItems(PRICE_ON_NEXT_LINE);
    expect(r?.postTitle).toBe('แผ่นเกมNINTENDO SWITCH มือ2');
    expect(brief(r)).toEqual([
      { title: 'MARIO KART DELUXE8 สภาพสะสม', price: 970, note: undefined, sold: false },
      { title: 'DRAGON QUEST TREASURES', price: 720, note: undefined, sold: false },
      { title: 'THE LEGEND OF ZELDA TEARS OF THE KINGDOM สภาพสะสม เปิดครั้งเดียว', price: 970, note: undefined, sold: false },
      { title: 'THE LEGEND OF ZELDA BREATH OF THE WILD สภาพสะสม เปิดครั้งเดียว', price: 970, note: undefined, sold: false },
    ]);
    expect(r!.items[0].text).toBe('-MARIO KART DELUXE8  สภาพสะสม\n970รวมส่งems');
  });

  it('keeps section labels like มือ1 / มือ2 as item notes', () => {
    const r = splitItems(SECTIONS);
    expect(r?.postTitle).toBe('แผ่นเกมหลายแผ่น');
    expect(brief(r)).toEqual([
      { title: 'MarioKart World', price: 1050, note: 'มือ1 ไม่แกะซีล', sold: false },
      { title: 'ของแถม Fire Emblem: fortune weave', price: 270, note: 'มือ1 ไม่แกะซีล', sold: false },
      { title: 'Cronos มือแดงus', price: 1150, note: 'มือ2', sold: false },
      { title: 'Pragmata (ยังไม่ใช้โค้ด)', price: 1250, note: 'มือ2', sold: false },
      { title: 'Zelda Botw', price: 900, note: 'มือ2', sold: false },
    ]);
  });

  it('marks only the sold line as sold', () => {
    const r = splitItems('ขายเสื้อมือสอง\nเสื้อยืด Uniqlo 150\nกางเกงยีนส์ Levis 501 450 ขายแล้ว\nแจ็คเก็ต 600');
    expect(brief(r)?.map((x) => [x.title, x.price, x.sold])).toEqual([
      ['เสื้อยืด Uniqlo', 150, false],
      ['กางเกงยีนส์ Levis 501', 450, true],
      ['แจ็คเก็ต', 600, false],
    ]);
  });

  it('splits several models of the same product', () => {
    const r = splitItems('iPhone 13 128GB 12,900\niPhone 13 256GB 14,500 บาท\nแบตเกิน 85% ทุกเครื่อง');
    expect(brief(r)?.map((x) => [x.title, x.price])).toEqual([
      ['iPhone 13 128GB', 12900],
      ['iPhone 13 256GB', 14500],
    ]);
  });

  it('ignores shipping-cost lines', () => {
    const r = splitItems('ตุ๊กตาหมี 200\nตุ๊กตากระต่าย 250\nค่าส่ง 50 บาท');
    expect(r?.items).toHaveLength(2);
  });

  it('does not split any single-item post from the fixture sets', () => {
    const wrongly = [...FIXTURES, ...HOLDOUT].filter((f) => splitItems(f.text) !== null).map((f) => f.name);
    expect(wrongly).toEqual([]);
  });
});
