import { describe, expect, it } from 'vitest';
import { decodePayload, encodePayload } from './transfer';

describe('URL transfer encoding', () => {
  const payload = {
    v: 1,
    type: 'EXPORT',
    group: { id: 'g', url: 'https://www.facebook.com/groups/g', name: 'ตลาดมือสอง' },
    posts: Array.from({ length: 300 }, (_, i) => ({
      postId: String(1000 + i),
      postUrl: `https://www.facebook.com/groups/g/posts/${1000 + i}/`,
      text: `แผ่นเกม Nintendo Switch มือ2 ชิ้นที่ ${i}\nราคา ${i * 10 + 500} รวมส่ง EMS สภาพสะสม เปิดครั้งเดียว`,
      timeText: `${i} ชม.`,
    })),
  };

  it('round-trips Thai text and compresses well', async () => {
    const s = await encodePayload(payload);
    expect(s[0]).toBe('z');
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/); // ปลอดภัยใน URL
    expect(await decodePayload(s)).toEqual(payload);
    const raw = new TextEncoder().encode(JSON.stringify(payload)).length;
    expect(s.length).toBeLessThan(raw / 3);
  });

  it('rejects garbage', async () => {
    await expect(decodePayload('xabc')).rejects.toThrow();
  });
});
