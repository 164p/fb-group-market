// จุดเดียวที่ผูกกับโครงสร้างหน้าเว็บ Facebook
// เมื่อ Facebook เปลี่ยนหน้าตา ให้แก้ที่ไฟล์นี้เป็นหลัก
// หลักการ: อ้างอิง role / aria / data-* / รูปแบบลิงก์ ซึ่งเปลี่ยนน้อยกว่า class ที่ถูกสุ่มชื่อ

export const SEL = {
  feed: '[role="feed"]',
  main: '[role="main"]',
  article: '[role="article"]',
  /** กล่องข้อความหลักของโพสต์ */
  message: '[data-ad-preview="message"], [data-ad-comet-preview="message"]',
  /** ข้อความบางส่วนในโพสต์ (ใช้เมื่อหา message ไม่เจอ) */
  textBlock: 'div[dir="auto"], span[dir="auto"]',
  button: '[role="button"]',
  author: 'h2 a, h3 a, h4 a, strong a, h2 span, h3 span',
  groupTitle: 'h1',
} as const;

/** ข้อความปุ่มขยายเนื้อหาโพสต์ */
export const SEE_MORE = /^(ดูเพิ่มเติม|ดูเพิ่ม|เพิ่มเติม|see more|… see more|…ดูเพิ่มเติม)$/i;

/** ลิงก์ของโพสต์ในกลุ่ม: /groups/{group}/posts/{id} หรือ /groups/{group}/permalink/{id} */
export const POST_HREF = /\/groups\/([^/?#]+)\/(?:posts|permalink)\/(\d+)/;
/** ลิงก์แบบเก่า: ?story_fbid=... หรือ ?multi_permalinks=... */
export const STORY_HREF = /[?&](?:story_fbid|multi_permalinks)=(\d+)/;

/** ราคาของโพสต์ขายแบบมีฟอร์ม เช่น "฿12,900", "THB 1,500", "ฟรี" */
export const STRUCTURED_PRICE = /^(?:฿|THB)\s?\d[\d,]*(?:\.\d+)?$|^(?:ฟรี|free)$/i;

/** ข้อความที่น่าจะเป็นเวลาโพสต์ */
export const TIME_TEXT =
  /^(?:\d+\s*(?:นาที|น\.|ชม\.?|ชั่วโมง|วัน|สัปดาห์|ปี|[mhdwy]|mins?|hrs?)|เมื่อ|เมื่อวาน|วันนี้|just now|yesterday|today|\d{1,2}\s*[ก-๙]|[a-z]{3,9}\.? \d{1,2})/i;
