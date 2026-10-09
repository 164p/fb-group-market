# ตลาดกลุ่ม (fb-group-market)

รวมรายการสินค้าจากกลุ่ม Facebook ที่คุณเลือก ค้นหา กรอง และกดไปยังโพสต์ต้นทาง

- เว็บแอป: https://164p.github.io/fb-group-market/
- ข้อมูลอยู่ในเบราว์เซอร์ของผู้ใช้ (IndexedDB) ไม่มีเซิร์ฟเวอร์กลาง
- ดึงโพสต์ด้วย bookmarklet ที่ผู้ใช้กดบนหน้ากลุ่ม Facebook ขณะล็อกอินอยู่
- เครื่องมือส่วนตัว ไม่เกี่ยวข้องกับ Meta

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
| 6 | Bookmarklet | เสร็จ (รอทดสอบกับกลุ่มจริง) |
| 7 | ช่องทางส่งข้อมูล + หน้า Receive | เสร็จ |
| 8 | Guide, Settings, ทดสอบรวม | |
