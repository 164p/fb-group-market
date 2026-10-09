import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages: https://164p.github.io/fb-group-market/
// ถ้าเปลี่ยนชื่อ repo ให้แก้ REPO_BASE และ APP_URL ใน src/shared/config.ts ให้ตรงกัน
const REPO_BASE = '/fb-group-market/';

// ใช้ base เดียวกันทั้ง dev / build / preview → เปิดที่ http://localhost:5173/fb-group-market/
export default defineConfig({
  base: REPO_BASE,
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
