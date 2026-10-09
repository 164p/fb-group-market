// ข้อมูลตัวอย่าง — ใช้ให้ผู้ใช้ใหม่ลองค้นหา/กรองได้ทันที และใช้พัฒนาเฟส 3
// ทุกกลุ่มมี id ขึ้นต้นด้วย "sample-" และ isSample: true จึงลบออกได้ทั้งชุด
// ข้อความทั้งหมดแต่งขึ้น ไม่ได้มาจากโพสต์จริง
import { PARSER_VERSION } from '../../shared/config';
import type { Group, Listing, ListingStatus, PriceType } from '../../shared/types';
import type { Repos } from './repositories';
import { listingKey } from './repositories';

export const SAMPLE_PREFIX = 'sample-';
export const isSampleGroupId = (id: string) => id.startsWith(SAMPLE_PREFIX);

const SAMPLE_GROUPS: Pick<Group, 'id' | 'name'>[] = [
  { id: 'sample-phones', name: 'ตัวอย่าง · มือถือ แท็บเล็ต มือสอง' },
  { id: 'sample-camera', name: 'ตัวอย่าง · กล้องและเลนส์ ซื้อ-ขาย' },
  { id: 'sample-home', name: 'ตัวอย่าง · ของใช้ในบ้าน เฟอร์นิเจอร์' },
];

type Row = {
  g: 0 | 1 | 2;
  title: string;
  /** ข้อความราคาตามที่คนโพสต์มักเขียน */
  priceText: string | null;
  price: number | null;
  range?: [number, number];
  type: PriceType;
  status?: ListingStatus;
  body: string;
  /** โพสต์ไว้กี่ชั่วโมงก่อนเวลาที่ seed */
  hoursAgo: number;
};

// 60 รายการ: กระจายราคา 50 ถึง 58,000 บาท, มีช่วงราคา, ต่อรองได้, ไม่ระบุราคา และขายแล้ว
const ROWS: Row[] = [
  // ---------- มือถือ แท็บเล็ต (20) ----------
  { g: 0, title: 'iPhone 13 128GB สีมิดไนท์', priceText: '12,900.-', price: 12900, type: 'fixed', body: 'แบต 86% ไม่เคยซ่อม ไม่เคยแกะ มีกล่องครบ นัดรับ BTS อ่อนนุช', hoursAgo: 2 },
  { g: 0, title: 'Samsung Galaxy S23 Ultra 256GB', priceText: '฿24,500', price: 24500, type: 'fixed', body: 'ศูนย์ไทย ประกันเหลือ 4 เดือน รอยขนแมวตามขอบนิดหน่อย แถมเคส+ฟิล์ม', hoursAgo: 5 },
  { g: 0, title: 'iPad Air 5 Wi-Fi 64GB', priceText: '14,000 บาท', price: 14000, type: 'fixed', body: 'ใช้เรียนอย่างเดียว จอสวยไม่มีรอย พร้อม Apple Pencil รุ่น 2 (ขายแยกได้)', hoursAgo: 9 },
  { g: 0, title: 'Redmi Note 12 Pro 5G', priceText: '4,500', price: 4500, type: 'fixed', body: 'เครื่องสวย 95% ใช้งานปกติทุกฟังก์ชัน ส่งฟรี Kerry', hoursAgo: 14 },
  { g: 0, title: 'iPhone 11 64GB สีขาว', priceText: 'ขายแล้วครับ', price: 7500, type: 'fixed', status: 'sold', body: 'ขายแล้วครับ ขอบคุณที่สนใจ (เดิม 7,500 บาท)', hoursAgo: 20 },
  { g: 0, title: 'Apple Watch Series 8 45mm', priceText: '8,900-9,500', price: 9200, range: [8900, 9500], type: 'range', body: 'ราคาขึ้นกับสาย เลือกได้ สายสปอร์ต 8,900 สายสแตนเลส 9,500', hoursAgo: 26 },
  { g: 0, title: 'OPPO Reno 10 5G', priceText: 'ราคาคุยกันได้', price: null, type: 'negotiable', body: 'อยากปล่อยไว ทักแชทคุยราคา รับแลกเปลี่ยนได้', hoursAgo: 31 },
  { g: 0, title: 'AirPods Pro 2 USB-C', priceText: '5.5k', price: 5500, type: 'fixed', body: 'ซื้อมา 3 เดือน ใช้น้อยมาก ใบเสร็จมี', hoursAgo: 38 },
  { g: 0, title: 'Galaxy Tab S9 FE + ปากกา', priceText: '9,900 บ.', price: 9900, type: 'fixed', body: 'จอ 10.9 นิ้ว ปากกา S Pen ในกล่อง ยังไม่แกะฟิล์ม', hoursAgo: 45 },
  { g: 0, title: 'iPhone 14 Pro Max 256GB', priceText: '28,500.-', price: 28500, type: 'fixed', body: 'แบต 91% ศูนย์ TH ไม่ติดไอคลาวด์ พร้อมกล่อง', hoursAgo: 52 },
  { g: 0, title: 'สายชาร์จ USB-C 2 เมตร (ใหม่)', priceText: '120', price: 120, type: 'fixed', body: 'ของใหม่ซื้อมาเกิน 3 เส้น ปล่อยเส้นละ 120', hoursAgo: 60 },
  { g: 0, title: 'Xiaomi Pad 6 8/256', priceText: '7,800 บาท', price: 7800, type: 'fixed', body: 'ประกันศูนย์เหลือ 6 เดือน แถมเคสคีย์บอร์ด', hoursAgo: 72 },
  { g: 0, title: 'Pixel 7a สีฟ้า', priceText: null, price: null, type: 'unknown', body: 'สภาพดี ใช้งานได้ปกติ สนใจทักแชทครับ', hoursAgo: 85 },
  { g: 0, title: 'Nintendo Switch OLED', priceText: '7,200', price: 7200, type: 'fixed', body: 'ครบกล่อง จอย 2 สีขาว แถมเกม 2 แผ่น', hoursAgo: 98 },
  { g: 0, title: 'แบตสำรอง Anker 20000mAh', priceText: '650.-', price: 650, type: 'fixed', body: 'ชาร์จเร็ว 30W ใช้งานปกติ', hoursAgo: 110 },
  { g: 0, title: 'iPhone 12 mini 128GB', priceText: '6,900', price: 6900, type: 'fixed', status: 'sold', body: 'ปิดการขาย ขอบคุณครับ', hoursAgo: 130 },
  { g: 0, title: 'Huawei MatePad 11', priceText: '5,900 ต่อรองได้', price: 5900, type: 'negotiable', body: 'ราคา 5,900 ต่อรองได้นิดหน่อย นัดรับแถวบางนา', hoursAgo: 160 },
  { g: 0, title: 'Galaxy Z Flip 5', priceText: '19,900.-', price: 19900, type: 'fixed', body: 'เครื่องศูนย์ จอพับไม่มีรอยยุบ ประกัน Samsung Care+', hoursAgo: 210 },
  { g: 0, title: 'เคส iPhone 15 Pro (ใหม่ 3 ชิ้น)', priceText: '3 ชิ้น 250', price: 250, type: 'fixed', body: 'ขายเหมา 3 ชิ้น 250 บาท ส่งฟรี', hoursAgo: 300 },
  { g: 0, title: 'Kindle Paperwhite 5', priceText: '3,200 บาท', price: 3200, type: 'fixed', body: 'จอ 6.8 นิ้ว ไฟหน้าจอปรับอุ่นได้ แถมเคส', hoursAgo: 420 },

  // ---------- กล้องและเลนส์ (20) ----------
  { g: 1, title: 'Fujifilm X-T30 II + 15-45mm', priceText: '22,900.-', price: 22900, type: 'fixed', body: 'ชัตเตอร์ 3,xxx ครั้ง สภาพสวย มีกล่อง แบต 2 ก้อน', hoursAgo: 3 },
  { g: 1, title: 'Sony A7 III body', priceText: '฿34,000', price: 34000, type: 'fixed', body: 'ชัต 18k เซนเซอร์สะอาด ใช้งานปกติ ไม่เคยซ่อม', hoursAgo: 8 },
  { g: 1, title: 'Canon RF 50mm f/1.8 STM', priceText: '4,200 บ.', price: 4200, type: 'fixed', body: 'เลนส์ใส ไม่มีฝ้า รา มีฝาหน้า-หลัง', hoursAgo: 12 },
  { g: 1, title: 'Sigma 24-70 f/2.8 DG DN (Sony E)', priceText: '23,500', price: 23500, type: 'fixed', body: 'ประกันศูนย์ไทยเหลือ 1 ปี กล่องครบ', hoursAgo: 19 },
  { g: 1, title: 'Ricoh GR IIIx', priceText: '29,900 ไม่ต่อ', price: 29900, type: 'fixed', body: 'สภาพสวยมาก ของหายาก ไม่ต่อนะครับ', hoursAgo: 23 },
  { g: 1, title: 'DJI Osmo Pocket 3 Creator Combo', priceText: '16,500.-', price: 16500, type: 'fixed', status: 'sold', body: 'ขายแล้ว', hoursAgo: 33 },
  { g: 1, title: 'ขาตั้งกล้อง Manfrotto Befree', priceText: '2,800', price: 2800, type: 'fixed', body: 'อะลูมิเนียม พับเก็บง่าย พร้อมกระเป๋า', hoursAgo: 40 },
  { g: 1, title: 'Nikon Z5 + 24-50mm', priceText: '25,000-27,000', price: 26000, range: [25000, 27000], type: 'range', body: 'ราคาตามอุปกรณ์เสริม มีกริปและแบตเพิ่ม', hoursAgo: 49 },
  { g: 1, title: 'Fujifilm XF 35mm f/1.4', priceText: '12,500 บาท', price: 12500, type: 'fixed', body: 'เลนส์ในตำนาน โบเก้สวย สภาพ 95%', hoursAgo: 58 },
  { g: 1, title: 'GoPro HERO12 Black', priceText: 'ราคาคุยกัน', price: null, type: 'negotiable', body: 'มีอุปกรณ์เสริมเยอะ เมาท์หมวก ไม้เซลฟี่ ทักมาคุยได้', hoursAgo: 66 },
  { g: 1, title: 'แฟลช Godox V1 (Sony)', priceText: '6,400', price: 6400, type: 'fixed', body: 'หัวกลม แบตลิเธียม ทริกเกอร์ X2T แถม', hoursAgo: 77 },
  { g: 1, title: 'Canon EOS R6 body', priceText: '48,000.-', price: 48000, type: 'fixed', body: 'ชัต 22k ใช้งานถ่ายงานแต่งเป็นหลัก ดูแลดี', hoursAgo: 90 },
  { g: 1, title: 'ฟิลเตอร์ ND Variable 77mm', priceText: '950', price: 950, type: 'fixed', body: 'ND2-400 ใช้ไม่กี่ครั้ง', hoursAgo: 102 },
  { g: 1, title: 'Sony 85mm f/1.8', priceText: '12,900 บาท', price: 12900, type: 'fixed', status: 'sold', body: 'Sold out ขอบคุณครับ', hoursAgo: 118 },
  { g: 1, title: 'กระเป๋ากล้อง Peak Design 20L', priceText: '5,500', price: 5500, type: 'fixed', body: 'Everyday Backpack V2 สีดำ', hoursAgo: 140 },
  { g: 1, title: 'Olympus OM-D E-M10 IV', priceText: null, price: null, type: 'unknown', body: 'กล้องตัวแรกเหมาะมือใหม่ สนใจ inbox', hoursAgo: 170 },
  { g: 1, title: 'Leica Q2', priceText: '฿158,000', price: 158000, type: 'fixed', body: 'ศูนย์ไทย สภาพสะสม ครบกล่อง', hoursAgo: 230 },
  { g: 1, title: 'การ์ด SD SanDisk Extreme Pro 128GB', priceText: '2 ใบ 900', price: 900, type: 'fixed', body: 'ขายคู่ 2 ใบ 900 บาท', hoursAgo: 290 },
  { g: 1, title: 'ไฟ LED Aputure Amaran 100d', priceText: '3,900.-', price: 3900, type: 'fixed', body: 'พร้อมซอฟท์บ็อกซ์ ใช้ถ่ายรีวิว', hoursAgo: 380 },
  { g: 1, title: 'Fujifilm Instax Mini 12', priceText: '1,890', price: 1890, type: 'fixed', body: 'สีชมพู ของขวัญที่ไม่ได้ใช้', hoursAgo: 520 },

  // ---------- ของใช้ในบ้าน (20) ----------
  { g: 2, title: 'โซฟา 3 ที่นั่ง ผ้ากำมะหยี่สีเขียว', priceText: '6,500 บาท', price: 6500, type: 'fixed', body: 'ใช้มา 1 ปี ไม่มีสัตว์เลี้ยง ต้องมารับเอง', hoursAgo: 1 },
  { g: 2, title: 'โต๊ะทำงานปรับระดับไฟฟ้า 140x70', priceText: '7,900.-', price: 7900, type: 'fixed', body: 'มอเตอร์คู่ จำความสูงได้ 3 ระดับ', hoursAgo: 6 },
  { g: 2, title: 'เก้าอี้สุขภาพ Ergonomic', priceText: '3,500-4,200', price: 3850, range: [3500, 4200], type: 'range', body: 'มี 2 ตัว รุ่นมีที่วางขา 4,200 ไม่มี 3,500', hoursAgo: 11 },
  { g: 2, title: 'ตู้เย็น 2 ประตู 12 คิว', priceText: '5,900', price: 5900, type: 'fixed', body: 'ประหยัดไฟเบอร์ 5 ใช้งานปกติ ย้ายบ้าน', hoursAgo: 17 },
  { g: 2, title: 'หม้อทอดไร้น้ำมัน 5.5 ลิตร', priceText: '890.-', price: 890, type: 'fixed', body: 'ใช้ไม่กี่ครั้ง ครบกล่อง', hoursAgo: 22 },
  { g: 2, title: 'เครื่องฟอกอากาศ Xiaomi 4 Lite', priceText: '2,300 บ.', price: 2300, type: 'fixed', status: 'sold', body: 'ขายแล้วค่ะ', hoursAgo: 29 },
  { g: 2, title: 'ชั้นวางหนังสือไม้ 5 ชั้น', priceText: '1,200', price: 1200, type: 'fixed', body: 'สีโอ๊ค สูง 180 ซม. ถอดประกอบได้', hoursAgo: 36 },
  { g: 2, title: 'ที่นอนยางพารา 5 ฟุต หนา 6 นิ้ว', priceText: 'ราคาต่อรองได้', price: null, type: 'negotiable', body: 'ใช้มา 2 ปี มีผ้าคลุมกันไรฝุ่น ทักคุยราคา', hoursAgo: 44 },
  { g: 2, title: 'เครื่องดูดฝุ่นไร้สาย Dyson V8', priceText: '6,900', price: 6900, type: 'fixed', body: 'แบตใหม่เปลี่ยนเมื่อเดือนที่แล้ว หัวแปรงครบ', hoursAgo: 55 },
  { g: 2, title: 'โคมไฟตั้งพื้นสไตล์มินิมอล', priceText: '450', price: 450, type: 'fixed', body: 'หลอด LED แถม', hoursAgo: 63 },
  { g: 2, title: 'ไมโครเวฟ Sharp 20 ลิตร', priceText: '1,500.-', price: 1500, type: 'fixed', body: 'ใช้งานปกติ อุ่นอาหารร้อนเร็ว', hoursAgo: 75 },
  { g: 2, title: 'โต๊ะกินข้าว 4 ที่นั่ง + เก้าอี้', priceText: '3,800 บาท', price: 3800, type: 'fixed', body: 'ท็อปไม้ยางพารา ขาเหล็กดำ', hoursAgo: 88 },
  { g: 2, title: 'กระถางต้นไม้เซรามิก (เซ็ต 6)', priceText: '6 ใบ 300', price: 300, type: 'fixed', body: 'หลายขนาด สีขาวด้าน', hoursAgo: 100 },
  { g: 2, title: 'พัดลมตั้งพื้น Hatari 18 นิ้ว', priceText: '50', price: 50, type: 'fixed', body: 'ใช้งานได้แต่ส่ายไม่ได้ ขายถูกๆ', hoursAgo: 122 },
  { g: 2, title: 'เครื่องชงกาแฟ Breville Barista Express', priceText: '฿13,900', price: 13900, type: 'fixed', body: 'บดในตัว ล้างระบบสม่ำเสมอ พร้อมอุปกรณ์', hoursAgo: 150 },
  { g: 2, title: 'ผ้าม่านกันแสง 2 ชุด', priceText: null, price: null, type: 'unknown', body: 'กว้าง 2 ม. สูง 2.2 ม. สีเทา ทักมาถามได้', hoursAgo: 190 },
  { g: 2, title: 'ตู้เสื้อผ้า 2 บาน', priceText: '2,500', price: 2500, type: 'fixed', status: 'sold', body: 'ปิดการขายแล้วค่ะ', hoursAgo: 250 },
  { g: 2, title: 'เตียงเหล็ก 3.5 ฟุต', priceText: '1,100 บ.', price: 1100, type: 'fixed', body: 'แข็งแรง ไม่มีสนิม ถอดได้', hoursAgo: 330 },
  { g: 2, title: 'เครื่องซักผ้าฝาหน้า 8 กก.', priceText: '58,000', price: 58000, type: 'fixed', body: 'รุ่นท็อป อบแห้งในตัว ใช้ 6 เดือน (ราคาเต็มป้าย 72,000)', hoursAgo: 460 },
  { g: 2, title: 'กล่องเก็บของพลาสติก 10 ใบ', priceText: '10 ใบ 400', price: 400, type: 'fixed', body: 'มีฝาปิด ขนาด 45 ลิตร', hoursAgo: 640 },
];

export const SAMPLE_COUNT = ROWS.length;

const sampleGroupUrl = (id: string) => `https://www.facebook.com/groups/${id}`;

/** สร้างข้อมูลตัวอย่างโดยอ้างเวลาจาก now — ผลลัพธ์เหมือนเดิมทุกครั้งเมื่อ now เท่ากัน */
export function buildSampleData(now = Date.now()): { groups: Group[]; listings: Listing[] } {
  const groups: Group[] = SAMPLE_GROUPS.map((g, i) => ({
    ...g,
    url: sampleGroupUrl(g.id),
    addedAt: now - (3 - i) * 1000,
    lastSyncedAt: now,
    listingCount: ROWS.filter((r) => r.g === i).length,
    isSample: true,
  }));

  const listings: Listing[] = ROWS.map((r, i) => {
    const group = groups[r.g];
    const postId = String(900000 + i);
    const postedAt = now - r.hoursAgo * 3_600_000;
    return {
      id: listingKey(group.id, postId),
      groupId: group.id,
      postId,
      postUrl: `${group.url}/posts/${postId}`,
      title: r.title,
      rawText: `${r.title}\n${r.priceText ? `ราคา ${r.priceText}\n` : ''}${r.body}`,
      price: r.price,
      priceMin: r.range ? r.range[0] : r.price,
      priceMax: r.range ? r.range[1] : r.price,
      priceType: r.type,
      priceText: r.priceText,
      currency: 'THB',
      status: r.status ?? 'available',
      authorName: null,
      postedAt,
      postedAtText: null,
      firstSeenAt: now,
      lastSeenAt: now,
      favorite: false,
      hidden: false,
      parserVersion: PARSER_VERSION,
    };
  });

  return { groups, listings };
}

/** ใส่ข้อมูลตัวอย่าง (ทับชุดตัวอย่างเดิมถ้ามี) */
export async function seedSampleData(store: Repos, now = Date.now()) {
  await removeSampleData(store);
  const { groups, listings } = buildSampleData(now);
  for (const g of groups) await store.groups.add(g);
  await store.listings.upsertMany(listings);
  await store.settings.setMeta('sampleSeededAt', now);
  return { groups: groups.length, listings: listings.length };
}

/** ลบเฉพาะข้อมูลตัวอย่าง ข้อมูลจริงของผู้ใช้ไม่ถูกแตะ */
export async function removeSampleData(store: Repos) {
  const groups = await store.groups.list();
  for (const g of groups) if (g.isSample || isSampleGroupId(g.id)) await store.groups.remove(g.id);
}

/**
 * เปิดแอปครั้งแรก: ใส่ข้อมูลตัวอย่างให้อัตโนมัติ
 * ทำครั้งเดียวเท่านั้น — ถ้าผู้ใช้ลบทิ้งแล้วจะไม่ใส่กลับมาเอง
 */
export async function seedOnFirstRun(store: Repos): Promise<boolean> {
  if ((await store.settings.getMeta('sampleSeededAt')) !== null) return false;
  if ((await store.groups.list()).length > 0) {
    await store.settings.setMeta('sampleSeededAt', Date.now());
    return false;
  }
  await seedSampleData(store);
  return true;
}
