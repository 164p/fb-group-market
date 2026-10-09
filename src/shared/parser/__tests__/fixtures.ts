// ชุดโพสต์ทดสอบ — ข้อความแต่งขึ้นตามรูปแบบที่พบบ่อยในกลุ่มซื้อขายไทย (ไม่ใช่โพสต์จริง)
// เบอร์โทรทั้งหมดเป็นเบอร์สมมุติ
import type { ListingStatus, PriceType } from '../../types';

export interface Fixture {
  name: string;
  text: string;
  price: number | null;
  range?: [number, number];
  type: PriceType;
  title: string;
  status?: ListingStatus;
  structuredTitle?: string;
  structuredPrice?: string;
}

export const FIXTURES: Fixture[] = [
  // ---------- รูปแบบมาตรฐาน ----------
  { name: 'ราคา + .-', text: 'iPhone 13 128GB สีมิดไนท์\nราคา 12,900.-\nแบต 86% ไม่เคยซ่อม', price: 12900, type: 'fixed', title: 'iPhone 13 128GB สีมิดไนท์' },
  { name: '฿ ข้างหน้า', text: 'Samsung Galaxy S23 Ultra 256GB\n฿24,500\nศูนย์ไทย ประกันเหลือ 4 เดือน', price: 24500, type: 'fixed', title: 'Samsung Galaxy S23 Ultra 256GB' },
  { name: 'บาท ข้างหลัง', text: 'iPad Air 5 Wi-Fi 64GB 14,000 บาท ใช้เรียนอย่างเดียว', price: 14000, type: 'fixed', title: 'iPad Air 5 Wi-Fi 64GB' },
  { name: 'บรรทัดราคาโดดๆ', text: 'Redmi Note 12 Pro 5G\n4,500\nเครื่องสวย 95% ส่งฟรี', price: 4500, type: 'fixed', title: 'Redmi Note 12 Pro 5G' },
  { name: 'บ.', text: 'Galaxy Tab S9 FE + ปากกา 9,900 บ.\nยังไม่แกะฟิล์ม', price: 9900, type: 'fixed', title: 'Galaxy Tab S9 FE + ปากกา' },
  { name: 'ไม่มีจุลภาค', text: 'ขาย Nintendo Switch OLED ราคา 7200 ครบกล่อง', price: 7200, type: 'fixed', title: 'Nintendo Switch OLED' },
  { name: 'ราคาติดตัวเลข', text: 'โต๊ะทำงานไม้สัก\nราคา1200บาท\nรับเองแถวลาดพร้าว', price: 1200, type: 'fixed', title: 'โต๊ะทำงานไม้สัก' },
  { name: 'ราคา :', text: 'เก้าอี้เกมมิ่ง\nราคา : 1,890\nสภาพ 90%', price: 1890, type: 'fixed', title: 'เก้าอี้เกมมิ่ง' },
  { name: 'THB', text: 'Sony WH-1000XM5 สีดำ\nPrice: 7,500 THB\nกล่องครบ', price: 7500, type: 'fixed', title: 'Sony WH-1000XM5 สีดำ' },
  { name: 'ท้ายบรรทัดชื่อ', text: 'iPhone 11 64GB สีขาว 7500\nใช้งานปกติ', price: 7500, type: 'fixed', title: 'iPhone 11 64GB สีขาว' },

  // ---------- ตัวคูณ ----------
  { name: 'k', text: 'AirPods Pro 2 USB-C\n5.5k\nซื้อมา 3 เดือน', price: 5500, type: 'fixed', title: 'AirPods Pro 2 USB-C' },
  { name: 'K ใหญ่', text: 'ขาย MacBook Air M2 13" 8/256 ราคา 25K ครับ', price: 25000, type: 'fixed', title: 'MacBook Air M2 13" 8/256' },
  { name: 'พัน', text: 'จักรยานพับ ใช้น้อย ขาย 3พัน', price: 3000, type: 'fixed', title: 'จักรยานพับ ใช้น้อย' },
  { name: 'หมื่น', text: 'มอเตอร์ไซค์ Wave 110i ปี 2019 เล่มครบ\nราคา 2 หมื่น 5 ต่อได้นิดหน่อย', price: 20000, type: 'negotiable', title: 'มอเตอร์ไซค์ Wave 110i ปี 2019 เล่มครบ' },
  { name: 'แสน', text: 'Honda Jazz 2015 ไมล์ 120,000 km\nขาย 2.8 แสน', price: 280000, type: 'fixed', title: 'Honda Jazz 2015 ไมล์ 120,000 km' },

  // ---------- ช่วงราคา ----------
  { name: 'ช่วง -', text: 'Apple Watch Series 8 45mm\n8,900-9,500\nราคาขึ้นกับสาย', price: 9200, range: [8900, 9500], type: 'range', title: 'Apple Watch Series 8 45mm' },
  { name: 'ช่วงมีช่องว่าง', text: 'เสื้อมือสอง แบรนด์ญี่ปุ่น ตัวละ 150 - 300 บาท', price: 225, range: [150, 300], type: 'range', title: 'เสื้อมือสอง แบรนด์ญี่ปุ่น ตัวละ' },
  { name: 'ช่วง ถึง', text: 'ต้นไม้ฟอกอากาศ\nราคา 89 ถึง 250 บาท ตามขนาดกระถาง', price: 170, range: [89, 250], type: 'range', title: 'ต้นไม้ฟอกอากาศ' },
  { name: 'ช่วง k', text: 'การ์ดจอ RTX 3060 มีหลายตัว 6-7k', price: 6500, range: [6000, 7000], type: 'range', title: 'การ์ดจอ RTX 3060 มีหลายตัว' },

  // ---------- ต่อรอง / ไม่ระบุ / ฟรี ----------
  { name: 'ต่อรองได้มีราคา', text: 'Huawei MatePad 11\nราคา 5,900 ต่อรองได้\nนัดรับบางนา', price: 5900, type: 'negotiable', title: 'Huawei MatePad 11' },
  { name: 'ราคาคุยกัน', text: 'OPPO Reno 10 5G\nราคาคุยกันได้ ทักแชท', price: null, type: 'negotiable', title: 'OPPO Reno 10 5G' },
  { name: 'สอบถามราคา inbox', text: 'ขายกล้อง Canon 600D + เลนส์คิท\nสนใจสอบถามราคาทาง inbox', price: null, type: 'negotiable', title: 'กล้อง Canon 600D + เลนส์คิท' },
  { name: 'ไม่ต่อ', text: 'Ricoh GR IIIx\n29,900 ไม่ต่อ\nของหายาก', price: 29900, type: 'fixed', title: 'Ricoh GR IIIx' },
  { name: 'ไม่ระบุราคา', text: 'Pixel 7a สีฟ้า\nสภาพดี ใช้งานได้ปกติ สนใจทักแชทครับ', price: null, type: 'unknown', title: 'Pixel 7a สีฟ้า' },
  { name: 'แจกฟรี', text: 'แจกฟรี ลูกแมว 2 ตัว อายุ 2 เดือน\nรับเองแถวรามอินทรา', price: 0, type: 'fixed', title: 'แจกฟรี ลูกแมว 2 ตัว อายุ 2 เดือน' },

  // ---------- ตัวเลขหลอก ----------
  { name: 'เบอร์โทร', text: 'ตู้เย็น 2 ประตู 12 คิว\nราคา 5,900\nโทร 081-234-5678', price: 5900, type: 'fixed', title: 'ตู้เย็น 2 ประตู 12 คิว' },
  { name: 'เบอร์โทรติดกัน', text: 'เครื่องซักผ้า 8 กก. ใช้งานปกติ 2500 บาท สนใจ 0891234567', price: 2500, type: 'fixed', title: 'เครื่องซักผ้า 8 กก. ใช้งานปกติ' },
  { name: 'GB/สเปกหลายตัว', text: 'Notebook Acer Ryzen 5 RAM 16GB SSD 512GB จอ 15.6 นิ้ว\nขาย 11,500', price: 11500, type: 'fixed', title: 'Notebook Acer Ryzen 5 RAM 16GB SSD 512GB จอ 15.6 นิ้ว' },
  { name: 'ชัตเตอร์ k', text: 'Sony A7 III body ชัต 18k\n฿34,000\nเซนเซอร์สะอาด', price: 34000, type: 'fixed', title: 'Sony A7 III body ชัต 18k' },
  { name: 'ราคาเต็ม vs ขาย', text: 'เครื่องซักผ้าฝาหน้า 8 กก.\nราคาเต็มป้าย 72,000 ขายเพียง 58,000', price: 58000, type: 'fixed', title: 'เครื่องซักผ้าฝาหน้า 8 กก.' },
  { name: 'ซื้อมา vs ปล่อย', text: 'Dyson V8 ซื้อมา 15,900 ปล่อย 6,900 แบตใหม่', price: 6900, type: 'fixed', title: 'Dyson V8' },
  { name: 'ลดเหลือ', text: 'รองเท้า Nike Air Max ไซส์ 42\nจาก 3,500 ลดเหลือ 2,200 บาท', price: 2200, type: 'fixed', title: 'รองเท้า Nike Air Max ไซส์ 42' },
  { name: 'ปี พ.ศ.', text: 'ตู้ไม้โบราณ ปี 2510 สภาพสวย\nราคา 4,800', price: 4800, type: 'fixed', title: 'ตู้ไม้โบราณ ปี 2510 สภาพสวย' },
  { name: 'ขนาด x', text: 'โต๊ะทำงานปรับระดับไฟฟ้า 140x70\n7,900.-', price: 7900, type: 'fixed', title: 'โต๊ะทำงานปรับระดับไฟฟ้า 140x70' },
  { name: 'จำนวนชิ้น', text: 'เคส iPhone 15 Pro ใหม่ 3 ชิ้น 250 บาท ส่งฟรี', price: 250, type: 'fixed', title: 'เคส iPhone 15 Pro ใหม่ 3 ชิ้น' },
  { name: 'ราคาต่อชิ้น', text: 'สายชาร์จ USB-C 2 เมตร ของใหม่\nเส้นละ 120', price: 120, type: 'fixed', title: 'สายชาร์จ USB-C 2 เมตร ของใหม่' },
  { name: 'วันที่และเวลา', text: 'บัตรคอนเสิร์ต 2 ใบ วันที่ 15/11/67 เวลา 19:00 น.\nใบละ 3,500', price: 3500, type: 'fixed', title: 'บัตรคอนเสิร์ต 2 ใบ วันที่ 15/11/67 เวลา 19:00 น.' },
  { name: 'เลนส์ f/', text: 'Canon RF 50mm f/1.8 STM\nเลนส์ใส ไม่มีฝ้า\n4,200 บ.', price: 4200, type: 'fixed', title: 'Canon RF 50mm f/1.8 STM' },
  { name: 'mAh W', text: 'แบตสำรอง Anker 20000mAh ชาร์จเร็ว 30W ราคา 650', price: 650, type: 'fixed', title: 'แบตสำรอง Anker 20000mAh ชาร์จเร็ว 30W' },

  // ---------- หัวข้อ/ตกแต่ง ----------
  { name: 'อีโมจิ + ขายด่วน', text: '🔥🔥 ขายด่วน!! 🔥🔥\nPS5 Slim Digital มือสอง\n💰 13,500.-\n📍 นัดรับ MRT พระราม 9', price: 13500, type: 'fixed', title: 'PS5 Slim Digital มือสอง' },
  { name: '[ขาย] วงเล็บ', text: '[ขาย] Kindle Paperwhite 5 ราคา 3,200 แถมเคส', price: 3200, type: 'fixed', title: 'Kindle Paperwhite 5' },
  { name: 'แฮชแท็ก', text: '#ขาย #มือสอง\nหม้อทอดไร้น้ำมัน 5.5 ลิตร\n890 บาท #ส่งฟรี', price: 890, type: 'fixed', title: 'หม้อทอดไร้น้ำมัน 5.5 ลิตร' },
  { name: 'สวัสดีขึ้นต้น', text: 'สวัสดีครับ\nขายโซฟา 3 ที่นั่ง ผ้ากำมะหยี่\nราคา 6,500 บาท รับเอง', price: 6500, type: 'fixed', title: 'โซฟา 3 ที่นั่ง ผ้ากำมะหยี่' },
  { name: 'ภาษาอังกฤษ', text: 'WTS: Fujifilm XF 35mm f1.4\nCondition 95%\n12,500 baht', price: 12500, type: 'fixed', title: 'Fujifilm XF 35mm f1.4' },

  // ---------- ขายแล้ว ----------
  { name: 'ขายแล้ว', text: 'iPhone 12 mini 128GB\n6,900\nขายแล้วครับ ขอบคุณครับ', price: 6900, type: 'fixed', title: 'iPhone 12 mini 128GB', status: 'sold' },
  { name: 'SOLD วงเล็บ', text: '[SOLD] Sony 85mm f/1.8 ราคา 12,900 บาท', price: 12900, type: 'fixed', title: 'Sony 85mm f/1.8', status: 'sold' },
  { name: 'ปิดการขาย', text: 'ตู้เสื้อผ้า 2 บาน 2,500\n**ปิดการขายแล้วค่ะ**', price: 2500, type: 'fixed', title: 'ตู้เสื้อผ้า 2 บาน', status: 'sold' },
  { name: 'ยังไม่ขาย', text: 'จักรยาน Trek FX2 ราคา 9,000 ยังไม่ขายนะคะ ทักได้', price: 9000, type: 'fixed', title: 'จักรยาน Trek FX2', status: 'available' },

  // ---------- โพสต์แบบมีฟอร์มขาย ----------
  { name: 'ฟอร์มขาย', structuredTitle: 'iPhone 14 Pro Max 256GB', structuredPrice: '฿28,500', text: 'แบต 91% ศูนย์ TH พร้อมกล่อง โทร 0812345678', price: 28500, type: 'fixed', title: 'iPhone 14 Pro Max 256GB' },
  { name: 'ฟอร์มขายฟรี', structuredTitle: 'ชั้นวางหนังสือ', structuredPrice: 'ฟรี', text: 'ย้ายบ้าน มารับเองได้เลย', price: 0, type: 'fixed', title: 'ชั้นวางหนังสือ' },
];
