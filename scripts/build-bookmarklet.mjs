// สร้าง bookmarklet: รวมโค้ดใน src/bookmarklet เป็นไฟล์เดียว (Facebook บล็อกการโหลดสคริปต์จากภายนอก)
// แล้วเขียนเป็น javascript: URL ให้หน้า Setup ใช้
//   src/app/generated/bookmarklet.ts  ← import ในเว็บแอป
//   .bookmarklet/bookmarklet.js        ← โค้ดดิบ ใช้ในการทดสอบ
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [resolve(root, 'src/bookmarklet/index.ts')],
  bundle: true,
  format: 'iife',
  target: ['es2020', 'chrome90', 'firefox90', 'safari15'],
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
  write: false,
});

const code = result.outputFiles[0].text.trim();
const href = `javascript:${encodeURIComponent(code)}`;

await mkdir(resolve(root, '.bookmarklet'), { recursive: true });
await writeFile(resolve(root, '.bookmarklet/bookmarklet.js'), code);
await mkdir(resolve(root, 'src/app/generated'), { recursive: true });
await writeFile(
  resolve(root, 'src/app/generated/bookmarklet.ts'),
  `// ไฟล์นี้สร้างอัตโนมัติโดย scripts/build-bookmarklet.mjs — ห้ามแก้ด้วยมือ\n` +
    `export const BOOKMARKLET_HREF = ${JSON.stringify(href)};\n` +
    `export const BOOKMARKLET_SIZE = ${code.length};\n`,
);

console.log(`bookmarklet: ${(code.length / 1024).toFixed(1)} KB code, ${(href.length / 1024).toFixed(1)} KB URL`);
