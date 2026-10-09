// ส่งข้อมูลทั้งรอบผ่าน URL (ส่วน # ไม่ถูกส่งไปเซิร์ฟเวอร์) — ใช้เมื่อหน้า Facebook คุยกับหน้าต่างเว็บแอปโดยตรงไม่ได้
// รูปแบบ: "z" + base64url(deflate-raw(JSON)) หรือ "j" + base64url(JSON) ถ้าเบราว์เซอร์บีบอัดไม่ได้

/** เบราว์เซอร์รองรับ URL ยาวได้ราว 2MB — เผื่อไว้ */
export const MAX_URL_PAYLOAD = 1_800_000;

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes]).stream().pipeThrough(stream as unknown as TransformStream<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodePayload(data: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(data));
  if (typeof CompressionStream === 'function') {
    try {
      return `z${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
    } catch {
      /* ใช้แบบไม่บีบอัด */
    }
  }
  return `j${toBase64Url(json)}`;
}

export async function decodePayload(s: string): Promise<unknown> {
  const kind = s[0];
  const bytes = fromBase64Url(s.slice(1));
  const json =
    kind === 'z'
      ? new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')))
      : kind === 'j'
        ? new TextDecoder().decode(bytes)
        : '';
  return JSON.parse(json);
}
