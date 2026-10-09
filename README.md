# ตลาดกลุ่ม (fb-group-market)

รวมรายการสินค้าจากกลุ่ม Facebook ที่คุณเลือก ค้นหา กรอง และกดไปยังโพสต์ต้นทาง

- เว็บแอป: https://164p.github.io/fb-group-market/
- ข้อมูลอยู่ในเบราว์เซอร์ของผู้ใช้ (IndexedDB) ไม่มีเซิร์ฟเวอร์กลาง
- ดึงโพสต์ด้วย bookmarklet ที่ผู้ใช้กดบนหน้ากลุ่ม Facebook ขณะล็อกอินอยู่
- เครื่องมือส่วนตัว ไม่เกี่ยวข้องกับ Meta

## วิธีใช้ (สำหรับผู้ใช้)

1. เปิด https://164p.github.io/fb-group-market/#/setup แล้วลากปุ่ม "ดึงสินค้า" ไปไว้ที่แถบบุ๊กมาร์ก
2. เปิดกลุ่มซื้อขายบน Facebook แล้วกดบุ๊กมาร์ก เลือกเงื่อนไขหยุด กด "เริ่มดึงสินค้า"
3. เมื่อเสร็จ กด "ส่งเข้าเว็บ" — สินค้าขึ้นในหน้าเว็บ ค้นหา/กรอง/เรียงได้ทันที

คู่มือฉบับเต็มอยู่ที่หน้า "คู่มือ" ในเว็บ

## พัฒนาในเครื่อง

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm test           # unit tests (Vitest + fake-indexeddb)
npm run build      # ผลลัพธ์ใน dist/
```

## ทดสอบ bookmarklet

`e2e/` มีหน้ากลุ่ม Facebook จำลองที่เลียนแบบพฤติกรรมยากๆ ของหน้าจริง (ลิงก์โพสต์ที่ใส่ตอน hover, "ดูเพิ่มเติม",
โหลดเพิ่มเมื่อเลื่อน, ลบโพสต์เก่าออกจาก DOM, comment ซ้อน) และหน้ารับข้อมูลจำลอง
การทดสอบดักทุก request ไปที่ไฟล์เหล่านี้ จึงไม่ติดต่อ Facebook จริง

```bash
pip install playwright && python -m playwright install chromium
npm run build
python3 e2e/bookmarklet_e2e.py   # bookmarklet กับหน้ารับข้อมูลจำลอง (7 สถานการณ์)
python3 e2e/full_flow_e2e.py     # ครบวงจร: Facebook จำลอง → เว็บแอปจริงจาก dist/ → หน้าสินค้า
```

เมื่อ Facebook เปลี่ยนหน้าตา: แก้ `src/bookmarklet/dom/selectors.ts` เป็นหลัก แล้วปรับหน้าจำลองให้ตรงกับโครงสร้างใหม่

## Deploy

push ไปที่ branch `main` แล้ว GitHub Actions จะ build และ deploy ให้อัตโนมัติ

ตั้งค่าครั้งแรกใน repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**

ถ้าเปลี่ยนชื่อ repo ให้แก้ 2 จุดให้ตรงกัน:

- `REPO_BASE` ใน `vite.config.ts`
- `APP_URL` ใน `src/shared/config.ts`

## หลักการทำงาน

- Facebook ไม่มี API สำหรับอ่านโพสต์ในกลุ่มแล้ว ปุ่มจึงอ่านจากหน้ากลุ่มที่ผู้ใช้เปิดอยู่
- Facebook ตัดการเชื่อมต่อระหว่างหน้า Facebook กับหน้าต่างที่เปิดขึ้น (Cross-Origin-Opener-Policy)
  ข้อมูลจึงส่งผ่านลิงก์ของแท็บใหม่ (`#/receive?d=…` บีบอัดด้วย deflate) ส่วน `#` ไม่ถูกส่งไปเซิร์ฟเวอร์
- ตัวอ่านราคา (`src/shared/parser`) แยกโพสต์ขายหลายรายการเป็นหลายสินค้า และเมื่อเปลี่ยน `PARSER_VERSION`
  ข้อมูลเดิมในเครื่องผู้ใช้จะถูกอ่านใหม่อัตโนมัติ
- เมื่อแก้ bookmarklet แบบที่ผู้ใช้ควรลากปุ่มใหม่ ให้เพิ่ม `BOOKMARKLET_VERSION` (เว็บจะแนะนำให้อัปเดตปุ่ม)

## โครงสร้าง

```
src/
├─ shared/        # types, protocol, config, parser (ใช้ร่วมกับ bookmarklet)
├─ bookmarklet/   # ปุ่มดึงสินค้า: dom/ (อ่านหน้า Facebook), scroller, transport, panel
└─ app/
   ├─ components/ # Layout, ปุ่ม, ไอคอน ฯลฯ
   ├─ features/   # listings, groups, setup, guide, receive, settings
   ├─ hooks/
   └─ i18n/th.ts  # ข้อความ UI ภาษาไทยทั้งหมด
```

## สถานะ

| เฟส | งาน | สถานะ |
| --- | --- | --- |
| 1 | Project setup + deploy | เสร็จ |
| 2 | Data layer + ข้อมูลตัวอย่าง | เสร็จ |
| 3 | หน้ารายการสินค้า | เสร็จ |
| 4 | หน้าจัดการกลุ่ม | เสร็จ |
| 5 | Parser + unit tests | เสร็จ |
| 6 | Bookmarklet | เสร็จ (ทดสอบกับกลุ่มจริงแล้ว) |
| 7 | ช่องทางส่งข้อมูล + หน้า Receive | เสร็จ |
| 8 | Guide, Settings, ทดสอบรวม | เสร็จ |
