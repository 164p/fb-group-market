// ชุดทดสอบแยก (holdout) — เขียนขึ้นหลังปรับ parser กับ fixtures.ts แล้ว และไม่ได้ปรับ parser ตามชุดนี้
// ใช้วัดความแม่นจริงกับรูปแบบที่ parser ไม่เคยเห็น เกณฑ์ผ่าน ≥ 90% (ไม่บังคับถูกทุกข้อ)
// ผลครั้งแรก (9 ต.ค. 2026): ราคา 18/20, ชื่อ 18/20 — หลังจากนั้นปรับ parser ตามข้อที่พลาดแล้ว
// ชุดนี้จึง "ใช้ไปแล้ว" ถ้าจะวัดใหม่ให้เพิ่มชุดใหม่ที่ไม่เคยใช้ปรับ (ดีที่สุดคือโพสต์จริงจากกลุ่ม)
import type { Fixture } from './fixtures';

export const HOLDOUT: Fixture[] = [
  { name: 'h1', text: 'ปล่อยต่อ Xiaomi Robot Vacuum S10\nใช้ไป 4 เดือน\nเหลือ 4,290 บาทค่ะ', price: 4290, type: 'fixed', title: 'Xiaomi Robot Vacuum S10' },
  { name: 'h2', text: 'กระเป๋า Coach แท้ 💯\nขนาด 25 ซม.\nราคา 2,900 รวมส่ง', price: 2900, type: 'fixed', title: 'กระเป๋า Coach แท้' },
  { name: 'h3', text: 'ขายรถเข็นเด็ก Aprica พับได้\n1,500 บาท\nโทร 089-765-4321 (ปุ้ย)', price: 1500, type: 'fixed', title: 'รถเข็นเด็ก Aprica พับได้' },
  { name: 'h4', text: 'คีย์บอร์ด Keychron K2 V2 Brown switch ราคาเพียง 1,990.-', price: 1990, type: 'fixed', title: 'คีย์บอร์ด Keychron K2 V2 Brown switch' },
  { name: 'h5', text: 'จอ Dell 27 นิ้ว 4K U2720Q\nปล่อย 9.5k\nนัดรับอโศก', price: 9500, type: 'fixed', title: 'จอ Dell 27 นิ้ว 4K U2720Q' },
  { name: 'h6', text: 'หนังสือเตรียมสอบ TCAS ชุด 5 เล่ม\nเหมา 600', price: 600, type: 'fixed', title: 'หนังสือเตรียมสอบ TCAS ชุด 5 เล่ม' },
  { name: 'h7', text: 'Garmin Forerunner 255 สภาพนางฟ้า\nราคา 6,500 บาท (ต่อได้นิดหน่อย)', price: 6500, type: 'negotiable', title: 'Garmin Forerunner 255 สภาพนางฟ้า' },
  { name: 'h8', text: 'ตู้ปลา 36 นิ้ว พร้อมขาตั้งและไฟ LED\nสนใจทักมาคุยราคาได้ค่ะ', price: null, type: 'negotiable', title: 'ตู้ปลา 36 นิ้ว พร้อมขาตั้งและไฟ LED' },
  { name: 'h9', text: 'Logitech MX Master 3S\n฿ 2,450\nประกันเหลือ 1 ปี', price: 2450, type: 'fixed', title: 'Logitech MX Master 3S' },
  { name: 'h10', text: 'ไอโฟน 15 โปร 256 สีไทเทเนียม ราคา 31900 ครบกล่อง ไม่มีรอย', price: 31900, type: 'fixed', title: 'ไอโฟน 15 โปร 256 สีไทเทเนียม' },
  { name: 'h11', text: 'เตาแม่เหล็กไฟฟ้า Sharp 2000W\nขายถูก 590 บ.', price: 590, type: 'fixed', title: 'เตาแม่เหล็กไฟฟ้า Sharp 2000W' },
  { name: 'h12', text: 'เลโก้ Technic 42115 Lamborghini ประกอบแล้ว 1 ครั้ง กล่องครบ\nราคา 9,900-10,500 แล้วแต่สภาพกล่อง', price: 10200, range: [9900, 10500], type: 'range', title: 'เลโก้ Technic 42115 Lamborghini ประกอบแล้ว 1 ครั้ง กล่องครบ' },
  { name: 'h13', text: 'ขายแล้วค่ะ\nเครื่องกรองน้ำ Coway 3,200', price: 3200, type: 'fixed', title: 'เครื่องกรองน้ำ Coway', status: 'sold' },
  { name: 'h14', text: 'สเก็ตบอร์ด Surf skate Yow ใช้ 3 ครั้ง\nซื้อมา 8,900\nขาย 5,500', price: 5500, type: 'fixed', title: 'สเก็ตบอร์ด Surf skate Yow ใช้ 3 ครั้ง' },
  { name: 'h15', text: 'Canon EF 70-200 f/4L IS USM\nเลนส์สวย ไม่มีฝ้ารา\n15,000 บ. ไม่ต่อ', price: 15000, type: 'fixed', title: 'Canon EF 70-200 f/4L IS USM' },
  { name: 'h16', text: 'ชุดนักเรียน ม.ปลาย หญิง ไซส์ 40 3 ชุด\nชุดละ 150', price: 150, type: 'fixed', title: 'ชุดนักเรียน ม.ปลาย หญิง ไซส์ 40 3 ชุด' },
  { name: 'h17', text: 'Steam Deck OLED 512GB\n17,500\n#ขาย #steamdeck', price: 17500, type: 'fixed', title: 'Steam Deck OLED 512GB' },
  { name: 'h18', text: 'แอร์ Daikin 12000 BTU ถอดจากบ้าน ใช้งาน 3 ปี\nราคา 7,000 รวมถอด', price: 7000, type: 'fixed', title: 'แอร์ Daikin 12000 BTU ถอดจากบ้าน ใช้งาน 3 ปี' },
  { name: 'h19', text: 'ให้ฟรี ไม้แขวนเสื้อ 50 อัน มารับเองค่ะ', price: 0, type: 'fixed', title: 'ให้ฟรี ไม้แขวนเสื้อ 50 อัน มารับเองค่ะ' },
  { name: 'h20', text: 'Herman Miller Aeron size B มือสอง\nปล่อย 25,000 จากราคาศูนย์ 52,000', price: 25000, type: 'fixed', title: 'Herman Miller Aeron size B มือสอง' },
];
