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
npm run build      # ผลลัพธ์ใน dist/
```

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
├─ bookmarklet/   # (เฟส 6)
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
| 2 | Data layer + ข้อมูลตัวอย่าง | |
| 3 | หน้ารายการสินค้า | |
| 4 | หน้าจัดการกลุ่ม | |
| 5 | Parser + unit tests | |
| 6 | Bookmarklet | |
| 7 | ช่องทางส่งข้อมูล + หน้า Receive | |
| 8 | Guide, Settings, ทดสอบรวม | |
