// โครงสร้างข้อมูลกลาง ใช้ร่วมกันระหว่างเว็บแอปและ bookmarklet
// อ้างอิง: เอกสาร Architecture & Scope Validation หัวข้อ 4

export interface Group {
  /** group id ตัวเลข หรือ slug จากลิงก์ (primary key) */
  id: string;
  /** https://www.facebook.com/groups/{id} */
  url: string;
  /** ชื่อที่ผู้ใช้ตั้ง หรืออ่านได้ตอนดึงครั้งแรก */
  name: string;
  addedAt: number;
  lastSyncedAt?: number;
  /** cache สำหรับหน้า Groups */
  listingCount: number;
  /** กลุ่มข้อมูลตัวอย่าง (ลบได้ทั้งชุดจากหน้าตั้งค่า) */
  isSample?: boolean;
}

export type PriceType = 'fixed' | 'range' | 'negotiable' | 'unknown';
export type ListingStatus = 'available' | 'sold';

export interface Listing {
  /** `${groupId}_${postId}` (primary key, กันซ้ำ) */
  id: string;
  groupId: string;
  postId: string;
  /** ลิงก์มาตรฐานไปยังโพสต์ */
  postUrl: string;
  title: string;
  /** ข้อความเต็ม ใช้ค้นหาและ parse ใหม่ได้ */
  rawText: string;
  /** ค่ากลางเมื่อเป็นช่วงราคา */
  price: number | null;
  priceMin: number | null;
  priceMax: number | null;
  priceType: PriceType;
  /** ข้อความราคาต้นฉบับ เช่น "1,500.-" */
  priceText: string | null;
  currency: 'THB';
  status: ListingStatus;
  /** null เมื่อปิดการเก็บชื่อผู้โพสต์ */
  authorName: string | null;
  /** เวลาโดยประมาณ (epoch ms) */
  postedAt: number | null;
  /** ข้อความเวลาต้นฉบับ เช่น "3 ชม." */
  postedAtText: string | null;
  firstSeenAt: number;
  lastSeenAt: number;
  favorite: boolean;
  hidden: boolean;
  parserVersion: number;

  /* ---- โพสต์ที่ขายหลายรายการ (แยกเป็นหลาย Listing จากโพสต์เดียว) ---- */
  /** ลำดับรายการในโพสต์ (เริ่ม 0) — ไม่มีเมื่อโพสต์ขายรายการเดียว */
  itemIndex?: number;
  /** จำนวนรายการทั้งหมดในโพสต์ */
  itemCount?: number;
  /** ข้อความเฉพาะของรายการนี้ (บรรทัดชื่อ + ราคา) ใช้ค้นหาและแสดงผล */
  itemText?: string;
  /** หมวดย่อยในโพสต์ เช่น "มือ1 ไม่แกะซีล" */
  itemNote?: string;
  /** หัวข้อของโพสต์ เช่น "แผ่นเกม Nintendo Switch มือ2" */
  postTitle?: string;
  /** ราคาจากโพสต์ขายแบบมีฟอร์ม (เก็บไว้เพื่อแยกข้อมูลใหม่ได้) */
  structuredPrice?: string;
}

export type StopReason = 'maxPosts' | 'maxAge' | 'reachedKnown' | 'noMore' | 'user' | 'error';

export interface SyncSession {
  id: string;
  groupId: string;
  startedAt: number;
  finishedAt?: number;
  stopReason?: StopReason;
  scanned: number;
  added: number;
  updated: number;
  withPrice: number;
}

export type StopMode = 'maxPosts' | 'maxAge' | 'reachedKnown';

export interface Settings {
  stopMode: StopMode;
  maxPosts: number;
  maxAgeDays: number;
  scrollDelayMs: readonly [number, number];
  storeAuthorName: boolean;
  /** เวลาที่ยอมรับข้อตกลงในหน้า Guide */
  acceptedTermsAt: number | null;
}

/** ข้อมูลดิบที่ bookmarklet อ่านได้จากโพสต์ 1 ชิ้น (ยังไม่ parse) */
export interface RawPost {
  postId: string;
  postUrl: string;
  text: string;
  /** โพสต์ขายแบบมีฟอร์ม: Facebook แสดงชื่อและราคาแยกให้ */
  structuredTitle?: string;
  structuredPrice?: string;
  authorName?: string;
  timeText?: string;
}
